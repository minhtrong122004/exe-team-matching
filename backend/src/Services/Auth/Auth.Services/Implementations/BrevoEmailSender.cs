using System.Net;
using System.Text;
using System.Text.Json;
using Auth.Services.DTOs;
using Auth.Services.Interfaces;
using Exe.BuildingBlocks.Exceptions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Auth.Services.Implementations;

/// <summary>
/// Triển khai dịch vụ gửi email giao dịch qua Brevo Transactional Email REST API (Gate F).
/// Endpoint: POST https://api.brevo.com/v3/smtp/email
/// Sử dụng IHttpClientFactory, xử lý an toàn bounded retry, timeout và bảo mật tuyệt đối không leak API key / OTP.
/// </summary>
public class BrevoEmailSender : IEmailSender
{
    private readonly HttpClient _httpClient;
    private readonly BrevoOptions _options;
    private readonly ILogger<BrevoEmailSender> _logger;

    public const string HttpClientName = "BrevoClient";

    public BrevoEmailSender(
        IHttpClientFactory httpClientFactory,
        IOptions<BrevoOptions> options,
        ILogger<BrevoEmailSender> logger)
    {
        _httpClient = httpClientFactory.CreateClient(HttpClientName);
        _options = options?.Value ?? new BrevoOptions();
        _logger = logger;
    }

    public async Task SendVerificationOtpAsync(string recipientEmail, string recipientName, string otp, CancellationToken ct = default)
    {
        var subject = "[EXE Team Matching] Mã xác thực đăng ký tài khoản";
        var displayName = string.IsNullOrWhiteSpace(recipientName) ? "Bạn" : recipientName.Trim();
        var htmlContent = BuildVietnameseOtpEmailTemplate(displayName, otp);

        await SendEmailInternalAsync(recipientEmail, displayName, subject, htmlContent, ct);
    }

    public async Task SendPasswordResetOtpAsync(string recipientEmail, string recipientName, string otp, CancellationToken ct = default)
    {
        var subject = "[EXE Team Matching] Mã OTP đặt lại mật khẩu";
        var displayName = string.IsNullOrWhiteSpace(recipientName) ? "Bạn" : recipientName.Trim();
        var htmlContent = BuildVietnamesePasswordResetEmailTemplate(displayName, otp);

        await SendEmailInternalAsync(recipientEmail, displayName, subject, htmlContent, ct);
    }

    private async Task SendEmailInternalAsync(
        string recipientEmail,
        string recipientName,
        string subject,
        string htmlContent,
        CancellationToken ct)
    {
        var normalizedEmail = recipientEmail.Trim().ToLowerInvariant();

        // 1. Kiểm tra cấu hình: Nếu chưa cấu hình API key hoặc không bật real email, log mock an toàn (không in OTP)
        var isApiKeyConfigured = !string.IsNullOrWhiteSpace(_options.ApiKey) &&
                                 !_options.ApiKey.StartsWith("your-", StringComparison.OrdinalIgnoreCase) &&
                                 !_options.ApiKey.StartsWith("dummy", StringComparison.OrdinalIgnoreCase) &&
                                 !_options.ApiKey.StartsWith("test", StringComparison.OrdinalIgnoreCase);

        if (!_options.EnableRealEmail || !isApiKeyConfigured)
        {
            _logger.LogInformation(
                "[BrevoEmailSender] Real Brevo email delivery skipped for recipient {Email}. (EnableRealEmail: {EnableRealEmail}, ApiKeyConfigured: {ApiKeyConfigured})",
                normalizedEmail,
                _options.EnableRealEmail,
                isApiKeyConfigured);
            return;
        }

        var payload = new
        {
            sender = new
            {
                name = _options.SenderName,
                email = _options.SenderEmail
            },
            to = new[]
            {
                new
                {
                    email = normalizedEmail,
                    name = recipientName
                }
            },
            subject,
            htmlContent
        };

        var jsonBody = JsonSerializer.Serialize(payload);

        // 2. Thực hiện gửi với 1 lần retry an toàn (bounded retry) nếu gặp lỗi mạng tạm thời
        const int maxAttempts = 2;
        for (int attempt = 1; attempt <= maxAttempts; attempt++)
        {
            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.brevo.com/v3/smtp/email")
                {
                    Content = new StringContent(jsonBody, Encoding.UTF8, "application/json")
                };

                request.Headers.Add("api-key", _options.ApiKey);
                request.Headers.Add("Accept", "application/json");

                using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                cts.CancelAfter(TimeSpan.FromSeconds(_options.TimeoutSeconds > 0 ? _options.TimeoutSeconds : 10));

                var response = await _httpClient.SendAsync(request, cts.Token);

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation(
                        "Brevo transactional email sent successfully to {Email} on attempt {Attempt}",
                        normalizedEmail,
                        attempt);
                    return;
                }

                var responseBody = await response.Content.ReadAsStringAsync(ct);

                if (response.StatusCode == HttpStatusCode.Unauthorized ||
                    response.StatusCode == HttpStatusCode.Forbidden ||
                    response.StatusCode == HttpStatusCode.BadRequest)
                {
                    _logger.LogError(
                        "Brevo API rejected email sending to {Email} with StatusCode: {StatusCode}. Response: {Response}",
                        normalizedEmail,
                        response.StatusCode,
                        responseBody);

                    throw new ServiceUnavailableException(
                        "Dịch vụ gửi email xác thực tạm thời không khả dụng. Vui lòng liên hệ quản trị viên hoặc thử lại sau.",
                        "EMAIL_PROVIDER_ERROR");
                }

                if (response.StatusCode == (HttpStatusCode)429)
                {
                    _logger.LogWarning("Brevo API rate limit exceeded when sending to {Email}", normalizedEmail);
                    throw new ServiceUnavailableException(
                        "Hệ thống gửi email đang quá tải. Vui lòng thử lại sau ít phút.",
                        "EMAIL_RATE_LIMITED");
                }

                _logger.LogWarning(
                    "Brevo attempt {Attempt}/{MaxAttempts} failed with StatusCode {StatusCode}. Response: {Response}",
                    attempt,
                    maxAttempts,
                    response.StatusCode,
                    responseBody);

                if (attempt == maxAttempts)
                {
                    throw new ServiceUnavailableException(
                        "Không thể gửi mã xác thực tới email của bạn lúc này. Vui lòng thử lại sau.",
                        "EMAIL_DELIVERY_FAILED");
                }

                await Task.Delay(1000, ct);
            }
            catch (OperationCanceledException) when (!ct.IsCancellationRequested)
            {
                _logger.LogWarning("Brevo email request timed out on attempt {Attempt}/{MaxAttempts} for {Email}", attempt, maxAttempts, normalizedEmail);
                if (attempt == maxAttempts)
                {
                    throw new ServiceUnavailableException(
                        "Thời gian gửi email xác thực đã hết hạn. Vui lòng thử lại.",
                        "EMAIL_TIMEOUT");
                }
                await Task.Delay(1000, ct);
            }
            catch (ServiceUnavailableException)
            {
                throw;
            }
            catch (Exception ex) when (attempt < maxAttempts)
            {
                _logger.LogWarning(ex, "Transient exception in Brevo sender attempt {Attempt}/{MaxAttempts} for {Email}", attempt, maxAttempts, normalizedEmail);
                await Task.Delay(1000, ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected exception delivering email via Brevo to {Email}", normalizedEmail);
                throw new ServiceUnavailableException(
                    "Đã xảy ra sự cố khi kết nối tới dịch vụ email. Vui lòng thử lại sau.",
                    "EMAIL_DELIVERY_FAILED");
            }
        }
    }

    private static string BuildVietnameseOtpEmailTemplate(string recipientName, string otp)
    {
        return $@"<!DOCTYPE html>
<html lang=""vi"">
<head>
  <meta charset=""utf-8"" />
  <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"" />
  <title>Mã xác thực OTP - EXE Team Matching</title>
</head>
<body style=""margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;"">
  <table role=""presentation"" width=""100%"" cellspacing=""0"" cellpadding=""0"" style=""background-color: #f8fafc; padding: 40px 16px;"">
    <tr>
      <td align=""center"">
        <table role=""presentation"" width=""100%"" style=""max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;"">
          <tr>
            <td style=""background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 32px 32px 28px; text-align: center;"">
              <h1 style=""margin: 0; font-size: 24px; font-weight: 700; color: #f27024; letter-spacing: -0.5px;"">EXE TEAM MATCHING</h1>
              <p style=""margin: 8px 0 0; font-size: 13px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;"">Dự án Khởi nghiệp FPT Education &bull; PRN232</p>
            </td>
          </tr>
          <tr>
            <td style=""padding: 36px 32px;"">
              <h2 style=""margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #0f172a;"">Chào bạn {recipientName},</h2>
              <p style=""margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #475569;"">
                Cảm ơn bạn đã đăng ký tài khoản trên <strong>Hệ thống Ghép đội Dự án Khởi nghiệp (EXE Team Matching)</strong>. Để hoàn tất đăng ký và kích hoạt tài khoản của bạn, vui lòng sử dụng mã xác thực OTP dưới đây:
              </p>
              
              <div style=""background: #fff7ed; border: 2px dashed #f97316; border-radius: 12px; padding: 24px; text-align: center; margin: 28px 0;"">
                <span style=""font-size: 12px; font-weight: 600; color: #c2410c; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 8px;"">MÃ XÁC THỰC CỦA BẠN</span>
                <span style=""font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 700; color: #ea580c; letter-spacing: 8px; display: inline-block;"">{otp}</span>
                <p style=""margin: 12px 0 0; font-size: 13px; color: #9a3412;"">
                  &bull; Mã xác thực có hiệu lực trong vòng <strong>5 phút</strong>.
                </p>
              </div>

              <div style=""background-color: #f1f5f9; border-left: 4px solid #f27024; padding: 14px 16px; border-radius: 4px; margin-bottom: 24px;"">
                <p style=""margin: 0; font-size: 13px; line-height: 1.5; color: #334155;"">
                  <strong>Lưu ý an toàn:</strong> Tuyệt đối không chia sẻ mã xác thực này cho bất kỳ ai, kể cả quản trị viên hệ thống. Chúng tôi không bao giờ yêu cầu bạn cung cấp mã OTP.
                </p>
              </div>

              <p style=""margin: 0; font-size: 14px; line-height: 1.6; color: #64748b;"">
                Nếu bạn không thực hiện yêu cầu đăng ký tài khoản trên EXE Team Matching, vui lòng bỏ qua email này. Tài khoản sẽ không được kích hoạt nếu không nhập mã OTP.
              </p>
            </td>
          </tr>
          <tr>
            <td style=""background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center;"">
              <p style=""margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;"">
                Hệ thống Ghép đội Dự án Khởi nghiệp (PRN232) &bull; FPT University<br/>
                Email này được gửi tự động từ máy chủ xác thực, vui lòng không phản hồi trực tiếp.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>";
    }

    private static string BuildVietnamesePasswordResetEmailTemplate(string recipientName, string otp)
    {
        return $@"<!DOCTYPE html>
<html lang=""vi"">
<head>
  <meta charset=""utf-8"" />
  <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"" />
  <title>Mã OTP đặt lại mật khẩu - EXE Team Matching</title>
</head>
<body style=""margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;"">
  <table role=""presentation"" width=""100%"" cellspacing=""0"" cellpadding=""0"" style=""background-color: #f8fafc; padding: 40px 16px;"">
    <tr>
      <td align=""center"">
        <table role=""presentation"" width=""100%"" style=""max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;"">
          <tr>
            <td style=""background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 32px 32px 28px; text-align: center;"">
              <h1 style=""margin: 0; font-size: 24px; font-weight: 700; color: #f27024; letter-spacing: -0.5px;"">EXE TEAM MATCHING</h1>
              <p style=""margin: 8px 0 0; font-size: 13px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;"">Dự án Khởi nghiệp FPT Education &bull; PRN232</p>
            </td>
          </tr>
          <tr>
            <td style=""padding: 36px 32px;"">
              <h2 style=""margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #0f172a;"">Chào bạn {recipientName},</h2>
              <p style=""margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #475569;"">
                Hệ thống nhận được yêu cầu <strong>đặt lại mật khẩu</strong> cho tài khoản của bạn trên <strong>EXE Team Matching</strong>. Vui lòng sử dụng mã OTP 6 chữ số dưới đây để tiến hành thiết lập mật khẩu mới:
              </p>
              
              <div style=""background: #eff6ff; border: 2px dashed #3b82f6; border-radius: 12px; padding: 24px; text-align: center; margin: 28px 0;"">
                <span style=""font-size: 12px; font-weight: 600; color: #1d4ed8; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 8px;"">MÃ OTP ĐẶT LẠI MẬT KHẨU</span>
                <span style=""font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 700; color: #2563eb; letter-spacing: 8px; display: inline-block;"">{otp}</span>
                <p style=""margin: 12px 0 0; font-size: 13px; color: #1e40af;"">
                  &bull; Mã xác nhận có hiệu lực trong vòng <strong>5 phút</strong>.
                </p>
              </div>

              <div style=""background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 14px 16px; border-radius: 4px; margin-bottom: 24px;"">
                <p style=""margin: 0; font-size: 13px; line-height: 1.5; color: #991b1b;"">
                  <strong>Cảnh báo bảo mật:</strong> Nếu bạn KHÔNG yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này. Mật khẩu hiện tại của bạn vẫn an toàn và không bị thay đổi. Tuyệt đối không chia sẻ mã này cho bất kỳ ai.
                </p>
              </div>

              <p style=""margin: 0; font-size: 14px; line-height: 1.6; color: #64748b;"">
                Sau khi đặt lại mật khẩu thành công, toàn bộ các phiên đăng nhập cũ trên các thiết bị khác sẽ tự động đăng xuất để đảm bảo an toàn tối đa cho tài khoản của bạn.
              </p>
            </td>
          </tr>
          <tr>
            <td style=""background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center;"">
              <p style=""margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;"">
                Hệ thống Ghép đội Dự án Khởi nghiệp (PRN232) &bull; FPT University<br/>
                Email này được gửi tự động từ máy chủ xác thực, vui lòng không phản hồi trực tiếp.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>";
    }
}
