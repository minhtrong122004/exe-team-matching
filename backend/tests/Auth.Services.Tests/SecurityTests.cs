using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Auth.Repository.Entities;
using Auth.Repository.Enums;
using Auth.Services.Security;
using Exe.BuildingBlocks.Auth;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Auth.Services.Tests;

public class SecurityTests
{
    [Fact]
    public void PasswordHasher_HashAndVerify_ShouldBeSecureAndConsistent()
    {
        // 3. Password hashing and verification
        var hasher = new BCryptPasswordHasher();
        var password = "SecurePassword@2026";

        var hash1 = hasher.HashPassword(password);
        var hash2 = hasher.HashPassword(password);

        Assert.NotEmpty(hash1);
        Assert.NotEmpty(hash2);
        // BCrypt uses unique random salt each time
        Assert.NotEqual(hash1, hash2);

        Assert.True(hasher.VerifyPassword(password, hash1));
        Assert.True(hasher.VerifyPassword(password, hash2));
        Assert.False(hasher.VerifyPassword("WrongPassword123!", hash1));
        Assert.False(hasher.VerifyPassword(string.Empty, hash1));
    }

    [Fact]
    public void TokenService_GenerateAccessToken_ShouldContainRequiredClaimsAndValidSignature()
    {
        // 7. JWT claims and validation
        var jwtOptions = new JwtOptions
        {
            Issuer = "test-auth-issuer",
            Audience = "test-api-audience",
            Key = "a-very-long-and-secure-secret-key-for-testing-1234567890",
            AccessTokenExpirationMinutes = 30
        };

        var tokenService = new TokenService(Options.Create(jwtOptions));

        var account = new Account
        {
            Id = Guid.NewGuid(),
            Email = "student@fpt.edu.vn",
            RegistrationFullName = "Nguyễn Văn Sinh Viên",
            Role = AccountRole.Student,
            IsActive = true
        };

        var jwt = tokenService.GenerateAccessToken(account);
        Assert.NotEmpty(jwt);

        // Validate the JWT
        var handler = new JwtSecurityTokenHandler();
        var validationParams = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtOptions.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Key)),
            ValidateLifetime = true
        };

        var principal = handler.ValidateToken(jwt, validationParams, out var validatedToken);
        Assert.NotNull(validatedToken);

        // Verify claims
        var subClaim = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? principal.FindFirst("sub")?.Value;
        Assert.Equal(account.Id.ToString(), subClaim);

        var emailClaim = principal.FindFirst(ClaimTypes.Email)?.Value
                      ?? principal.FindFirst("email")?.Value;
        Assert.Equal(account.Email, emailClaim);

        var roleClaim = principal.FindFirst(ClaimTypes.Role)?.Value
                     ?? principal.FindFirst("role")?.Value;
        Assert.Equal("Student", roleClaim);

        var nameClaim = principal.FindFirst(ClaimTypes.Name)?.Value
                     ?? principal.FindFirst("name")?.Value;
        Assert.Equal(account.RegistrationFullName, nameClaim);
    }
}
