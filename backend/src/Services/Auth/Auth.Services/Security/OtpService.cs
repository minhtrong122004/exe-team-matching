using System.Security.Cryptography;
using System.Text;
using Auth.Services.Interfaces;

namespace Auth.Services.Security;

/// <summary>
/// Triển khai dịch vụ sinh và băm mã xác thực OTP mật mã học an toàn (Gate E).
/// </summary>
public class OtpService : IOtpService
{
    public string GenerateSixDigitOtp()
    {
        // Sinh số ngẫu nhiên mật mã trong khoảng [100000, 1000000)
        var otpNumber = RandomNumberGenerator.GetInt32(100000, 1000000);
        return otpNumber.ToString("D6");
    }

    public (string OtpHash, string Salt) HashOtp(string otp)
    {
        // 16 bytes cryptographic random salt -> 32 hex characters
        var saltBytes = RandomNumberGenerator.GetBytes(16);
        var saltHex = Convert.ToHexString(saltBytes).ToLowerInvariant();

        var hashHex = ComputeSha256(saltHex, otp);

        return (hashHex, saltHex);
    }

    public bool VerifyOtp(string inputOtp, string storedHash, string storedSalt)
    {
        if (string.IsNullOrWhiteSpace(inputOtp) ||
            string.IsNullOrWhiteSpace(storedHash) ||
            string.IsNullOrWhiteSpace(storedSalt))
        {
            return false;
        }

        var inputHash = ComputeSha256(storedSalt, inputOtp.Trim());

        var inputHashBytes = Encoding.UTF8.GetBytes(inputHash);
        var storedHashBytes = Encoding.UTF8.GetBytes(storedHash.ToLowerInvariant());

        return CryptographicOperations.FixedTimeEquals(inputHashBytes, storedHashBytes);
    }

    private static string ComputeSha256(string saltHex, string otp)
    {
        var combined = $"{saltHex}:{otp.Trim()}";
        var bytes = Encoding.UTF8.GetBytes(combined);
        var hash = SHA256.HashData(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
