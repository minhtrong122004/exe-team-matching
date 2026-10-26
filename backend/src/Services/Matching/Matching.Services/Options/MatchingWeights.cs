namespace Matching.Services.Options;

/// <summary>
/// Trọng số công thức Matching, bind từ section <c>Matching:Weights</c> (CLAUDE.md mục 8).
/// Tổng ba trọng số phải bằng 100 để điểm nằm trong khoảng 0–100.
/// </summary>
public sealed class MatchingWeights
{
    public const string SectionName = "Matching:Weights";

    public double Skill { get; set; } = 50;
    public double Major { get; set; } = 30;
    public double Domain { get; set; } = 20;

    public bool IsValid() =>
        Skill >= 0 && Major >= 0 && Domain >= 0 && Math.Abs(Skill + Major + Domain - 100) < 0.0001;
}
