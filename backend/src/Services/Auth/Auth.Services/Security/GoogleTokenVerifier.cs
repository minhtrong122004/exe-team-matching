using Auth.Services.DTOs;
using Google.Apis.Auth;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Auth.Services.Security;

public class GoogleTokenVerifier(
    IOptions<GoogleAuthOptions> options,
    ILogger<GoogleTokenVerifier> logger) : IGoogleTokenVerifier
{
    public async Task<GoogleIdentity?> VerifyAsync(string idToken, CancellationToken ct = default)
    {
        var clientId = options.Value.ClientId?.Trim();

        // Không có ClientId thì thư viện sẽ bỏ qua kiểm tra audience, nên phải từ chối thay vì chấp nhận mọi token.
        if (string.IsNullOrEmpty(clientId))
        {
            logger.LogError("GoogleAuth:ClientId is not configured; rejecting Google sign-in.");
            return null;
        }

        try
        {
            var payload = await GoogleJsonWebSignature.ValidateAsync(
                idToken,
                new GoogleJsonWebSignature.ValidationSettings { Audience = [clientId] });

            return new GoogleIdentity(payload.Email, payload.EmailVerified, payload.Name);
        }
        catch (InvalidJwtException ex)
        {
            logger.LogWarning("Rejected Google ID token: {Reason}", ex.Message);
            return null;
        }
    }
}
