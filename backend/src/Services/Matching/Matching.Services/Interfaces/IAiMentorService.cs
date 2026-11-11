using Matching.Services.Models;

namespace Matching.Services.Interfaces;

/// <summary>
/// Trợ lý Cố vấn Khởi nghiệp AI Mentor (Google Gemini) đánh giá ma trận kỹ năng, cảnh báo điểm mù và gợi ý đề tài EXE.
/// </summary>
public interface IAiMentorService
{
    Task<AnalyzeGroupOutcome> AnalyzeGroupAsync(AnalyzeGroupInput input, CancellationToken ct = default);
}

