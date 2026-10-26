using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Notification.Repository.Entities;
using Notification.Repository.Enums;
using Notification.Services.DTOs;
using Notification.Services.Implementations;
using Notification.Services.Tests.TestDoubles;

namespace Notification.Services.Tests;

public class EmailQueueProcessorTests
{
    private readonly FakeEmailLogRepository _emailLogRepo = new();
    private readonly FakeNotificationUnitOfWork _unitOfWork = new();
    private readonly FakeSmtpEmailSender _smtpSender = new();
    private readonly EmailQueueProcessor _sut;

    public EmailQueueProcessorTests()
    {
        var options = Options.Create(new SmtpOptions { MaxAttempts = 3, BatchSize = 10 });
        _sut = new EmailQueueProcessor(
            _emailLogRepo,
            _unitOfWork,
            _smtpSender,
            options,
            NullLogger<EmailQueueProcessor>.Instance);
    }

    [Fact]
    public async Task ProcessPendingEmailsAsync_WhenSendSucceeds_MarksSentAndSetsSentAt()
    {
        _emailLogRepo.Items.Add(new EmailLog
        {
            Id = Guid.NewGuid(),
            To = "student@fpt.edu.vn",
            Subject = "Welcome",
            Body = "<p>Hello</p>",
            Status = EmailStatus.Pending,
            Attempts = 0,
            CreatedAt = DateTime.UtcNow
        });

        var result = await _sut.ProcessPendingEmailsAsync();

        Assert.Equal(1, result.Processed);
        Assert.Equal(1, result.Sent);
        Assert.Equal(0, result.Failed);
        Assert.Equal(EmailStatus.Sent, _emailLogRepo.Items[0].Status);
        Assert.Equal(1, _emailLogRepo.Items[0].Attempts);
        Assert.NotNull(_emailLogRepo.Items[0].SentAt);
        Assert.Single(_smtpSender.SentEmails);
    }

    [Fact]
    public async Task ProcessPendingEmailsAsync_WhenSmtpFails_MarksFailedAndRecordsErrorWithoutThrowing()
    {
        _smtpSender.ExceptionToThrow = new InvalidOperationException("SMTP server unreachable");
        _emailLogRepo.Items.Add(new EmailLog
        {
            Id = Guid.NewGuid(),
            To = "student@fpt.edu.vn",
            Subject = "Welcome",
            Body = "<p>Hello</p>",
            Status = EmailStatus.Pending,
            Attempts = 0,
            CreatedAt = DateTime.UtcNow
        });

        var result = await _sut.ProcessPendingEmailsAsync();

        Assert.Equal(1, result.Processed);
        Assert.Equal(0, result.Sent);
        Assert.Equal(1, result.Failed);
        Assert.Equal(EmailStatus.Failed, _emailLogRepo.Items[0].Status);
        Assert.Equal(1, _emailLogRepo.Items[0].Attempts);
        Assert.Contains("SMTP server unreachable", _emailLogRepo.Items[0].LastError);
    }
}
