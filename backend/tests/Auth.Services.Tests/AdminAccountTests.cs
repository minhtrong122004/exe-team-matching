using Auth.Repository.Entities;
using Auth.Repository.Enums;
using Auth.Services.DTOs;
using Auth.Services.Implementations;
using Auth.Services.Tests.TestDoubles;
using Auth.Services.Validators;
using Exe.BuildingBlocks.Exceptions;

namespace Auth.Services.Tests;

public class AdminAccountTests
{
    private readonly FakeAccountRepository _accountRepo = new();
    private readonly FakeRefreshTokenRepository _refreshTokenRepo = new();
    private readonly FakeOutboxRepository _outboxRepo = new();
    private readonly FakeUnitOfWork _unitOfWork = new();
    private readonly CreateLecturerRequestValidator _validator = new();
    private readonly ProvisionFapStudentsRequestValidator _provisionValidator = new();

    private AdminAccountService CreateService()
    {
        return new AdminAccountService(
            _accountRepo,
            _refreshTokenRepo,
            _outboxRepo,
            _unitOfWork,
            _validator,
            _provisionValidator,
            new NullLogger<AdminAccountService>()
        );
    }

    [Fact]
    public async Task GetAccountsPaged_ShouldFilterAndPaginateCorrectly()
    {
        // 13. Admin account listing
        var service = CreateService();

        for (int i = 1; i <= 15; i++)
        {
            await _accountRepo.AddAsync(new Account
            {
                Id = Guid.NewGuid(),
                Email = $"student{i}@fpt.edu.vn",
                RegistrationFullName = $"Sinh Viên {i}",
                Role = i <= 10 ? AccountRole.Student : AccountRole.Lecturer,
                IsActive = i % 2 == 1,
                CreatedAt = DateTime.UtcNow.AddMinutes(i)
            });
        }

        var query = new GetAccountsQuery(
            Role: AccountRole.Student,
            IsActive: true,
            Page: 1,
            PageSize: 5
        );

        var result = await service.GetAccountsPagedAsync(query);

        Assert.NotNull(result);
        Assert.Equal(1, result.Page);
        Assert.Equal(5, result.PageSize);
        Assert.Equal(5, result.TotalCount); // 5 active students (1, 3, 5, 7, 9)
        Assert.Equal(1, result.TotalPages);
        Assert.Equal(5, result.Items.Count);
        Assert.All(result.Items, item =>
        {
            Assert.Equal("Student", item.Role);
            Assert.True(item.IsActive);
        });
    }

    [Fact]
    public async Task LockAccount_ShouldDeactivateAccountAndRevokeAllRefreshTokens()
    {
        // 13. Lock account & revoke sessions
        var service = CreateService();

        var account = new Account
        {
            Id = Guid.NewGuid(),
            Email = "target_lock@fpt.edu.vn",
            RegistrationFullName = "Đối Tượng Khóa",
            Role = AccountRole.Student,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        await _accountRepo.AddAsync(account);

        var token1 = new RefreshToken
        {
            Id = Guid.NewGuid(),
            AccountId = account.Id,
            TokenHash = "hash1",
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow
        };
        var token2 = new RefreshToken
        {
            Id = Guid.NewGuid(),
            AccountId = account.Id,
            TokenHash = "hash2",
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow
        };
        await _refreshTokenRepo.AddAsync(token1);
        await _refreshTokenRepo.AddAsync(token2);

        var response = await service.LockAccountAsync(account.Id);

        Assert.False(response.IsActive);
        Assert.False(account.IsActive);

        // Verify all refresh tokens are revoked
        Assert.NotNull(token1.RevokedAt);
        Assert.Equal("AccountLockedByAdmin", token1.RevokeReason);
        Assert.NotNull(token2.RevokedAt);
        Assert.Equal("AccountLockedByAdmin", token2.RevokeReason);
    }

    [Fact]
    public async Task UnlockAccount_ShouldReactivateAccount()
    {
        // 13. Unlock account
        var service = CreateService();

        var account = new Account
        {
            Id = Guid.NewGuid(),
            Email = "locked_user@fpt.edu.vn",
            RegistrationFullName = "Người Dùng Khóa",
            Role = AccountRole.Student,
            IsActive = false,
            CreatedAt = DateTime.UtcNow
        };
        await _accountRepo.AddAsync(account);

        var response = await service.UnlockAccountAsync(account.Id);

        Assert.True(response.IsActive);
        Assert.True(account.IsActive);
    }

    [Fact]
    public async Task LockAccount_NonExistent_ShouldThrowNotFound()
    {
        var service = CreateService();

        var ex = await Assert.ThrowsAsync<NotFoundException>(() =>
            service.LockAccountAsync(Guid.NewGuid()));

        Assert.Equal("ACCOUNT_NOT_FOUND", ex.ErrorCode);
    }

    [Fact]
    public async Task CreateLecturer_ValidRequest_CreatesAccountAndOutboxMessage()
    {
        var service = CreateService();
        var request = new CreateLecturerRequest("lecturer@fpt.edu.vn", "Thầy Nguyễn Văn A");

        var response = await service.CreateLecturerAsync(request);

        Assert.NotNull(response);
        Assert.Equal("lecturer@fpt.edu.vn", response.Email);
        Assert.Equal("Thầy Nguyễn Văn A", response.FullName);
        Assert.Equal("Lecturer", response.Role);
        Assert.True(response.IsActive);

        // Verify Account persisted
        var account = Assert.Single(_accountRepo.Accounts);
        Assert.Equal(response.Id, account.Id);
        Assert.Equal(AccountRole.Lecturer, account.Role);

        // Verify OutboxMessage persisted with UserRegisteredEvent
        var outboxMsg = Assert.Single(_outboxRepo.Messages);
        Assert.Equal("UserRegisteredEvent", outboxMsg.EventType);
        Assert.Contains("\"role\":\"Lecturer\"", outboxMsg.Payload);
        Assert.Contains("\"email\":\"lecturer@fpt.edu.vn\"", outboxMsg.Payload);
    }

    [Fact]
    public async Task CreateLecturer_DuplicateEmail_ThrowsConflictException()
    {
        var service = CreateService();
        _accountRepo.Accounts.Add(new Account
        {
            Id = Guid.NewGuid(),
            Email = "lecturer@fpt.edu.vn",
            RegistrationFullName = "Existing",
            Role = AccountRole.Lecturer,
            IsActive = true
        });

        var request = new CreateLecturerRequest("lecturer@fpt.edu.vn", "Thầy Mới");
        var ex = await Assert.ThrowsAsync<ConflictException>(() => service.CreateLecturerAsync(request));

        Assert.Equal("EMAIL_ALREADY_EXISTS", ex.ErrorCode);
    }

    [Theory]
    [InlineData("not-an-email", "Name")]
    [InlineData("lecturer@fpt.edu.vn", "")]
    public async Task CreateLecturer_InvalidData_ThrowsValidationException(string email, string fullName)
    {
        var service = CreateService();
        var request = new CreateLecturerRequest(email, fullName);

        await Assert.ThrowsAsync<FluentValidation.ValidationException>(() => service.CreateLecturerAsync(request));
    }

    [Fact]
    public async Task ProvisionFapStudents_NewStudent_CreatesAccountWithoutAnyPasswordInEvent()
    {
        var service = CreateService();
        var request = new ProvisionFapStudentsRequest(
            [new FapStudentImportItem("SE190001", "Sinh Viên A", "SinhVienA@gmail.com", "SE")]);

        var response = await service.ProvisionFapStudentsAsync(request);

        Assert.Equal(1, response.NewlyCreatedCount);
        var account = Assert.Single(_accountRepo.Accounts);
        Assert.Equal("sinhviena@gmail.com", account.Email);
        Assert.Equal(AccountRole.Student, account.Role);
        Assert.Equal("SE190001", account.StudentCode);

        var outboxMessage = Assert.Single(_outboxRepo.Messages);
        Assert.DoesNotContain("password", outboxMessage.Payload, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("password", Assert.Single(response.Results).StatusMessage, StringComparison.OrdinalIgnoreCase);
    }
}
