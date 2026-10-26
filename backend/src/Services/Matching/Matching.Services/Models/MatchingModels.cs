namespace Matching.Services.Models;

/// <summary>
/// Hồ sơ sinh viên đầu vào cho công thức Matching (độc lập với kiểu sinh từ proto).
/// </summary>
public sealed record StudentInput(
    string UserId,
    string Major,
    IReadOnlyCollection<string> Skills,
    IReadOnlyCollection<string> Interests);

/// <summary>
/// Nhu cầu của nhóm đầu vào cho công thức Matching.
/// </summary>
public sealed record GroupInput(
    string GroupId,
    IReadOnlyCollection<string> RequiredMajors,
    IReadOnlyCollection<string> RequiredSkills,
    string ProjectDomain);

/// <summary>
/// Kết quả so khớp một sinh viên với một nhóm. Score trong khoảng 0–100, làm tròn 1 chữ số.
/// </summary>
public sealed record MatchOutcome(
    string UserId,
    string GroupId,
    double Score,
    IReadOnlyList<string> MatchedSkills,
    IReadOnlyList<string> MissingSkills);
