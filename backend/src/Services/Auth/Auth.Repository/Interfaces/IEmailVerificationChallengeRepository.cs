using Auth.Repository.Entities;

namespace Auth.Repository.Interfaces;

/// <summary>
/// Giao diện Repository quản lý vòng đời của thách thức xác thực email bằng OTP.
/// </summary>
public interface IEmailVerificationChallengeRepository
{
    Task AddAsync(EmailVerificationChallenge challenge, CancellationToken ct = default);
    Task<EmailVerificationChallenge?> GetActiveChallengeByAccountIdAsync(Guid accountId, Auth.Repository.Enums.ChallengePurpose purpose = Auth.Repository.Enums.ChallengePurpose.EmailVerification, CancellationToken ct = default);
    Task<EmailVerificationChallenge?> GetActiveChallengeByEmailAsync(string email, Auth.Repository.Enums.ChallengePurpose purpose = Auth.Repository.Enums.ChallengePurpose.EmailVerification, CancellationToken ct = default);
    Task InvalidatePreviousChallengesAsync(Guid accountId, Auth.Repository.Enums.ChallengePurpose purpose = Auth.Repository.Enums.ChallengePurpose.EmailVerification, CancellationToken ct = default);
    Task<int> CountResendsInLastHourAsync(Guid accountId, Auth.Repository.Enums.ChallengePurpose purpose = Auth.Repository.Enums.ChallengePurpose.EmailVerification, CancellationToken ct = default);
    Task UpdateAsync(EmailVerificationChallenge challenge, CancellationToken ct = default);
}
