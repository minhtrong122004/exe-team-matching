namespace Auth.Services.Security;

/// <summary>Danh tính đã được Google xác nhận.</summary>
public record GoogleIdentity(string Email, bool EmailVerified, string? Name);

public interface IGoogleTokenVerifier
{
    /// <summary>Kiểm tra chữ ký, hạn và audience của ID token. Trả về null nếu token không hợp lệ.</summary>
    Task<GoogleIdentity?> VerifyAsync(string idToken, CancellationToken ct = default);
}
