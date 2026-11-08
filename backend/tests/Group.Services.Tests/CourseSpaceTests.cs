using Group.Repository.Enums;
using Group.Services.DTOs;
using Group.Services.Validators;

namespace Group.Services.Tests;

public class CourseSpaceTests
{
    [Theory]
    [InlineData(50, 5, 1.2, 12)]   // 50 / 5 * 1.2 = 10 * 1.2 = 12
    [InlineData(48, 5, 1.2, 12)]   // 48 / 5 * 1.2 = 9.6 * 1.2 = 11.52 -> 12
    [InlineData(51, 5, 1.2, 13)]   // 51 / 5 * 1.2 = 10.2 * 1.2 = 12.24 -> 13
    [InlineData(20, 4, 1.0, 5)]    // 20 / 4 * 1.0 = 5
    [InlineData(21, 4, 1.0, 6)]    // 21 / 4 * 1.0 = 5.25 -> 6
    [InlineData(30, 6, 1.5, 8)]    // 30 / 6 * 1.5 = 5 * 1.5 = 7.5 -> 8
    public void RoomGenerationFormula_CalculatesCeilingRoomsCorrectly(
        int totalStudents, int maxMembers, decimal bufferRatio, int expectedRooms)
    {
        // Formula: Math.Ceiling((decimal)totalStudents / maxMembers * bufferRatio)
        var actualRooms = (int)Math.Ceiling((decimal)totalStudents / maxMembers * bufferRatio);
        Assert.Equal(expectedRooms, actualRooms);
    }

    [Fact]
    public void CreateCourseSpaceValidator_ValidRequest_PassesValidation()
    {
        var validator = new CreateCourseSpaceRequestValidator();
        var request = new CreateCourseSpaceRequest(
            SemesterCode: "FA26",
            SubjectCode: "EXE101",
            Name: "Học kỳ FA26 - EXE101 Khởi nghiệp",
            MaxMembersPerGroup: 5,
            BufferRatio: 1.2m,
            MaxConcurrentApplies: 3,
            RegistrationDeadline: DateTime.UtcNow.AddDays(7));

        var result = validator.Validate(request);
        Assert.True(result.IsValid);
    }

    [Theory]
    [InlineData(3)] // Less than 4 (BR-02)
    [InlineData(7)] // Greater than 6 (BR-02)
    public void CreateCourseSpaceValidator_InvalidMaxMembers_FailsValidation(int maxMembers)
    {
        var validator = new CreateCourseSpaceRequestValidator();
        var request = new CreateCourseSpaceRequest(
            SemesterCode: "FA26",
            SubjectCode: "EXE101",
            Name: "Test Space",
            MaxMembersPerGroup: maxMembers,
            BufferRatio: 1.2m,
            MaxConcurrentApplies: 3,
            RegistrationDeadline: DateTime.UtcNow.AddDays(7));

        var result = validator.Validate(request);
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(request.MaxMembersPerGroup));
    }

    [Theory]
    [InlineData(0.5)] // Less than 1.0
    [InlineData(2.5)] // Greater than 2.0
    public void CreateCourseSpaceValidator_InvalidBufferRatio_FailsValidation(decimal bufferRatio)
    {
        var validator = new CreateCourseSpaceRequestValidator();
        var request = new CreateCourseSpaceRequest(
            SemesterCode: "FA26",
            SubjectCode: "EXE101",
            Name: "Test Space",
            MaxMembersPerGroup: 5,
            BufferRatio: bufferRatio,
            MaxConcurrentApplies: 3,
            RegistrationDeadline: DateTime.UtcNow.AddDays(7));

        var result = validator.Validate(request);
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(request.BufferRatio));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(6)]
    public void CreateCourseSpaceValidator_InvalidMaxConcurrentApplies_FailsValidation(int maxApplies)
    {
        var validator = new CreateCourseSpaceRequestValidator();
        var request = new CreateCourseSpaceRequest(
            SemesterCode: "FA26",
            SubjectCode: "EXE101",
            Name: "Test Space",
            MaxMembersPerGroup: 5,
            BufferRatio: 1.2m,
            MaxConcurrentApplies: maxApplies,
            RegistrationDeadline: DateTime.UtcNow.AddDays(7));

        var result = validator.Validate(request);
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(request.MaxConcurrentApplies));
    }

    [Fact]
    public void ImportFapStudentsValidator_EmptyList_FailsValidation()
    {
        var validator = new ImportFapStudentsRequestValidator();
        var request = new ImportFapStudentsRequest(new List<FapStudentItem>());

        var result = validator.Validate(request);
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(request.Students));
    }

    [Fact]
    public void ImportFapStudentsValidator_ValidList_PassesValidation()
    {
        var validator = new ImportFapStudentsRequestValidator();
        var request = new ImportFapStudentsRequest(new List<FapStudentItem>
        {
            new("SE180001", "student1@fpt.edu.vn", "Nguyễn Văn A", "Kỹ thuật phần mềm", "K18", "SE1801"),
            new("SE180002", "student2@fpt.edu.vn", "Trần Thị B", "Trí tuệ nhân tạo", "K18", "AI1801")
        });

        var result = validator.Validate(request);
        Assert.True(result.IsValid);
    }
}

