namespace Notification.Services.DTOs;

public class SmtpOptions
{
    public const string SectionName = "Smtp";

    public string Host { get; set; } = "localhost";
    public int Port { get; set; } = 1025;
    public string FromEmail { get; set; } = "noreply@exe-matching.local";
    public string FromName { get; set; } = "EXE Team Matching";
    public bool UseSsl { get; set; } = false;
    public string? Username { get; set; }
    public string? Password { get; set; }
    public int MaxAttempts { get; set; } = 3;
    public int BatchSize { get; set; } = 20;
    public int PollIntervalSeconds { get; set; } = 5;
}
