using Auth.Services.Security;

namespace Auth.Services.Tests;

public class OtpServiceTests
{
    private readonly OtpService _otpService = new();

    [Fact]
    public void GenerateSixDigitOtp_ShouldReturnValidSixDigitString()
    {
        for (int i = 0; i < 100; i++)
        {
            var otp = _otpService.GenerateSixDigitOtp();
            Assert.NotNull(otp);
            Assert.Equal(6, otp.Length);
            Assert.True(int.TryParse(otp, out var val));
            Assert.InRange(val, 100000, 999999);
        }
    }

    [Fact]
    public void HashOtp_ShouldGenerateNonEmptyHashAndSalt()
    {
        var (hash, salt) = _otpService.HashOtp("123456");

        Assert.NotEmpty(hash);
        Assert.NotEmpty(salt);
        Assert.Equal(64, hash.Length); // 256 bits = 64 hex characters
        Assert.Equal(32, salt.Length); // 16 bytes = 32 hex characters
    }

    [Fact]
    public void HashOtp_ShouldGenerateUniqueSaltForEveryCall()
    {
        var (hash1, salt1) = _otpService.HashOtp("123456");
        var (hash2, salt2) = _otpService.HashOtp("123456");

        Assert.NotEqual(salt1, salt2);
        Assert.NotEqual(hash1, hash2);
    }

    [Fact]
    public void VerifyOtp_WithCorrectOtp_ShouldReturnTrue()
    {
        var (hash, salt) = _otpService.HashOtp("654321");
        var result = _otpService.VerifyOtp("654321", hash, salt);

        Assert.True(result);
    }

    [Fact]
    public void VerifyOtp_WithIncorrectOtp_ShouldReturnFalse()
    {
        var (hash, salt) = _otpService.HashOtp("654321");
        var result = _otpService.VerifyOtp("000000", hash, salt);

        Assert.False(result);
    }

    [Fact]
    public void VerifyOtp_WithEmptyOrNull_ShouldReturnFalse()
    {
        var (hash, salt) = _otpService.HashOtp("654321");

        Assert.False(_otpService.VerifyOtp("", hash, salt));
        Assert.False(_otpService.VerifyOtp(null!, hash, salt));
        Assert.False(_otpService.VerifyOtp("654321", "", salt));
        Assert.False(_otpService.VerifyOtp("654321", hash, ""));
    }
}
