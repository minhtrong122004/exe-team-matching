using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Matching.Services.Interfaces;
using Matching.Services.Models;
using Matching.Services.Options;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Matching.Grpc.Services;

public sealed class AiMentorService : IAiMentorService
{
    private readonly HttpClient _httpClient;
    private readonly GeminiOptions _options;
    private readonly ILogger<AiMentorService> _logger;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public AiMentorService(
        HttpClient httpClient,
        IOptions<GeminiOptions> options,
        ILogger<AiMentorService> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<AnalyzeGroupOutcome> AnalyzeGroupAsync(AnalyzeGroupInput input, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(input);

        if (!string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            try
            {
                var aiResult = await CallGeminiApiAsync(input, ct);
                if (aiResult != null)
                {
                    return aiResult;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Gemini AI inference call failed for group {GroupId}. Engaging resilient heuristic fallback engine.", input.GroupId);
            }
        }
        else
        {
            _logger.LogInformation("Gemini API key is not configured. Using rule-based heuristic inference engine.");
        }

        return GenerateHeuristicAnalysis(input);
    }

    private async Task<AnalyzeGroupOutcome?> CallGeminiApiAsync(AnalyzeGroupInput input, CancellationToken ct)
    {
        var membersSummary = new StringBuilder();
        foreach (var m in input.Members)
        {
            membersSummary.AppendLine($"- {m.FullName} ({m.StudentCode}, Ngành {m.Major}) {(m.IsLeader ? "[Trưởng nhóm]" : "[Thành viên]")}: Tech={m.TechScore}/100, Management={m.ManagementScore}/100, Design={m.GraphicDesignScore}/100, Marketing={m.MarketingScore}/100, Sale={m.SaleScore}/100");
        }

        var systemPrompt = """
            Bạn là AI Mentor Cố vấn Khởi nghiệp Đổi mới Sáng tạo (môn EXE) tại Đại học FPT.
            Nhiệm vụ: Đánh giá khách quan, sắc sảo về đội hình khởi nghiệp dựa trên ma trận 5 kỹ năng (Tech, Management, Design, Marketing, Sale), chuyên ngành và đề tài của nhóm.
            Yêu cầu BẮT BUỘC:
            - Phản hồi định dạng JSON thuần túy (không bọc trong markdown ```json).
            - JSON phải có cấu trúc chính xác như sau:
            {
              "overallAssessment": "Đánh giá ngắn gọn 2-3 câu về năng lực thực thi và tinh thần khởi nghiệp của đội hình",
              "strengths": ["Thế mạnh 1 nổi bật kèm dẫn chứng kỹ năng/ngành", "Thế mạnh 2"],
              "blindSpots": ["Điểm mù/rủi ro 1 về kỹ năng còn yếu", "Điểm mù/rủi ro 2 cần khắc phục"],
              "recommendedTopics": [
                {
                  "title": "Tên đề tài khởi nghiệp 1 khả thi cho nhóm",
                  "description": "Mô tả giải pháp công nghệ/kinh doanh",
                  "targetMarket": "Đối tượng khách hàng mục tiêu tại Việt Nam",
                  "businessModel": "Mô hình tạo doanh thu (B2B, B2C, Subscription...)"
                },
                {
                  "title": "Tên đề tài khởi nghiệp 2",
                  "description": "Mô tả",
                  "targetMarket": "Khách hàng",
                  "businessModel": "Mô hình"
                }
              ],
              "firstMonthRoadmap": [
                "Tuần 1: Nghiên cứu thị trường và hoàn thiện Lean Canvas",
                "Tuần 2: Phỏng vấn 20 khách hàng mục tiêu để kiểm chứng giả định",
                "Tuần 3: Xây dựng bản Prototype/MVP tinh gọn",
                "Tuần 4: Thử nghiệm bán trước (Pre-order) và hoàn thiện Pitch Deck"
              ],
              "synergyScore": 85.5
            }
            """;

        var userMessage = $"""
            Hãy phân tích nhóm khởi nghiệp sau:
            Mã phòng: {input.GroupCode}
            Tên nhóm: {input.GroupName}
            Lĩnh vực quan tâm: {input.ProjectDomain}
            Đề tài dự kiến: {(string.IsNullOrWhiteSpace(input.ProjectTopic) ? "Chưa có đề tài chính thức" : input.ProjectTopic)}
            
            Danh sách thành viên:
            {membersSummary}
            """;

        var url = $"{_options.BaseUrl.TrimEnd('/')}/models/{_options.Model}:generateContent?key={_options.ApiKey}";

        var requestBody = new
        {
            systemInstruction = new
            {
                parts = new[] { new { text = systemPrompt } }
            },
            contents = new[]
            {
                new
                {
                    role = "user",
                    parts = new[] { new { text = userMessage } }
                }
            },
            generationConfig = new
            {
                temperature = 0.4,
                responseMimeType = "application/json"
            }
        };

        using var requestMessage = new HttpRequestMessage(HttpMethod.Post, url);
        requestMessage.Content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

        if (_options.ApiKey.StartsWith("AQ.", StringComparison.OrdinalIgnoreCase))
        {
            requestMessage.Headers.TryAddWithoutValidation("x-goog-api-key", _options.ApiKey);
        }

        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeoutCts.CancelAfter(TimeSpan.FromSeconds(_options.TimeoutSeconds));

        using var response = await _httpClient.SendAsync(requestMessage, timeoutCts.Token);
        if (!response.IsSuccessStatusCode)
        {
            var errContent = await response.Content.ReadAsStringAsync(ct);
            _logger.LogWarning("Gemini API returned status {StatusCode}: {Error}", response.StatusCode, errContent);
            return null;
        }

        var responseJson = await response.Content.ReadAsStringAsync(ct);
        using var doc = JsonDocument.Parse(responseJson);

        var text = doc.RootElement
            .GetProperty("candidates")[0]
            .GetProperty("content")
            .GetProperty("parts")[0]
            .GetProperty("text")
            .GetString();

        if (string.IsNullOrWhiteSpace(text)) return null;

        var cleanJson = CleanJsonString(text);
        var parsed = JsonSerializer.Deserialize<GeminiAnalysisPayload>(cleanJson, JsonOpts);
        if (parsed == null) return null;

        return new AnalyzeGroupOutcome(
            input.GroupId,
            parsed.OverallAssessment ?? "Đội hình có sự bổ trợ đa chiều giữa các chuyên ngành.",
            parsed.Strengths ?? [],
            parsed.BlindSpots ?? [],
            (parsed.RecommendedTopics ?? []).Select(t => new AiRecommendedTopicOutcome(
                t.Title ?? "Dự án Khởi nghiệp Đổi mới",
                t.Description ?? string.Empty,
                t.TargetMarket ?? "Thị trường Việt Nam",
                t.BusinessModel ?? "B2B / B2C")).ToList(),
            parsed.FirstMonthRoadmap ?? [],
            Math.Round(Math.Clamp(parsed.SynergyScore, 50.0, 100.0), 1),
            IsAiGenerated: true,
            ModelName: _options.Model);
    }

    private static AnalyzeGroupOutcome GenerateHeuristicAnalysis(AnalyzeGroupInput input)
    {
        var members = input.Members.ToList();
        double avgTech = members.Count > 0 ? members.Average(m => m.TechScore) : 50;
        double avgMgmt = members.Count > 0 ? members.Average(m => m.ManagementScore) : 50;
        double avgDesign = members.Count > 0 ? members.Average(m => m.GraphicDesignScore) : 50;
        double avgMkt = members.Count > 0 ? members.Average(m => m.MarketingScore) : 50;
        double avgSale = members.Count > 0 ? members.Average(m => m.SaleScore) : 50;

        var skills = new List<(string Name, double Score)>
        {
            ("Công nghệ (Tech)", avgTech),
            ("Quản trị (Management)", avgMgmt),
            ("Thiết kế (Graphic Design)", avgDesign),
            ("Marketing", avgMkt),
            ("Kinh doanh & Bán hàng (Sale)", avgSale)
        };

        var sortedSkills = skills.OrderByDescending(s => s.Score).ToList();
        var topSkill = sortedSkills.First();
        var weakestSkill = sortedSkills.Last();

        var distinctMajors = members
            .Select(m => m.Major?.Trim())
            .Where(m => !string.IsNullOrEmpty(m))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var strengths = new List<string>
        {
            $"Thế mạnh nổi bật ở năng lực {topSkill.Name} đạt mức trung bình {topSkill.Score:F0}/100, tạo nền tảng vững chắc để xây dựng sản phẩm chất lượng cao.",
            $"Đội hình quy tụ {distinctMajors.Count} khối ngành chuyên môn ({string.Join(", ", distinctMajors.Take(3))}), giúp tiếp cận vấn đề khởi nghiệp từ nhiều góc nhìn thực tiễn."
        };

        var blindSpots = new List<string>
        {
            $"Chỉ số {weakestSkill.Name} hiện đang thấp nhất đội hình ({weakestSkill.Score:F0}/100). Cần phân công thành viên phụ trách học hỏi bổ sung hoặc tìm kiếm cố vấn chuyên môn để tránh điểm nghẽn.",
            members.Count < 4
                ? "Sĩ số nhóm hiện tại còn mỏng, cần phân bổ khối lượng công việc hợp lý để không bị quá tải trong giai đoạn làm MVP và Pitching."
                : "Số lượng thành viên đông (>=4 SV), Trưởng nhóm cần thiết lập kênh giao tiếp và công cụ quản trị dự án (Jira/Trello/Notion) ngay từ tuần đầu tiên."
        };

        var domain = string.IsNullOrWhiteSpace(input.ProjectDomain) || input.ProjectDomain.Equals("General", StringComparison.OrdinalIgnoreCase)
            ? "EdTech & Dịch vụ số"
            : input.ProjectDomain;

        var recommendedTopics = new List<AiRecommendedTopicOutcome>
        {
            new(
                Title: $"Nền tảng {domain} thông minh tích hợp AI",
                Description: $"Ứng dụng giải quyết bài toán tối ưu hóa quy trình trong lĩnh vực {domain}, tận dụng thế mạnh {topSkill.Name} của nhóm để tạo tính năng vượt trội.",
                TargetMarket: "Giới trẻ, sinh viên và các doanh nghiệp vừa và nhỏ (SMEs) tại các đô thị lớn.",
                BusinessModel: "Freemium + Thu phí theo gói thuê bao (Monthly Subscription)"
            ),
            new(
                Title: $"Hệ sinh thái kết nối & chia sẻ tài nguyên trong ngành {domain}",
                Description: "Mô hình sàn giao dịch dịch vụ phi tập trung kết nối trực tiếp người cung cấp và người có nhu cầu.",
                TargetMarket: "Cộng đồng người dùng trực tuyến và mạng lưới đối tác khởi nghiệp FPT.",
                BusinessModel: "Thu phí hoa hồng trên mỗi giao dịch thành công (Take-rate 8-12%)"
            ),
            new(
                Title: $"Giải pháp chuyển đổi số tinh gọn cho tiểu thương",
                Description: "Ứng dụng di động hỗ trợ quản lý bán hàng, tương tác khách hàng tự động với chi phí tối thiểu.",
                TargetMarket: "Hộ kinh doanh cá thể và startup giai đoạn hạt giống.",
                BusinessModel: "B2B SaaS thanh toán theo chu kỳ năm"
            )
        };

        var roadmap = new List<string>
        {
            "Tuần 1: Thống nhất ý tưởng dự án, phân chia vai trò (RACI matrix) và lập Lean Canvas ban đầu.",
            "Tuần 2: Tiến hành khảo sát thực địa và phỏng vấn tối thiểu 15 khách hàng tiềm năng để kiểm chứng bài toán (Problem Validation).",
            "Tuần 3: Hoàn thiện bản mẫu UI/UX Wireframe và kiến trúc sản phẩm khả dụng tối thiểu (MVP).",
            "Tuần 4: Thử nghiệm bán sớm (Pre-order / Waitlist landing page) và chuẩn bị slide thuyết trình (Pitch Deck) cho Giảng viên hướng dẫn."
        };

        double avgTotal = (avgTech + avgMgmt + avgDesign + avgMkt + avgSale) / 5.0;
        double majorFactor = Math.Min(1.0, distinctMajors.Count / 3.0) * 20.0;
        double synergyScore = Math.Round(Math.Clamp((avgTotal * 0.8) + majorFactor, 60.0, 96.0), 1);

        return new AnalyzeGroupOutcome(
            input.GroupId,
            $"Đội hình {input.GroupCode} có độ kết dính tốt với chỉ số Hiệp đồng Đội ngũ ước tính đạt {synergyScore}%. Nhóm có tiềm năng phát triển mạnh ở mảng {domain} nếu phân bổ vai trò chuẩn xác ngay từ đầu.",
            strengths,
            blindSpots,
            recommendedTopics,
            roadmap,
            synergyScore,
            IsAiGenerated: false,
            ModelName: "heuristic-rule-based-v2");
    }

    private static string CleanJsonString(string text)
    {
        var trimmed = text.Trim();
        if (trimmed.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
        {
            trimmed = trimmed[7..];
        }
        else if (trimmed.StartsWith("```"))
        {
            trimmed = trimmed[3..];
        }

        if (trimmed.EndsWith("```"))
        {
            trimmed = trimmed[..^3];
        }

        return trimmed.Trim();
    }

    private sealed class GeminiAnalysisPayload
    {
        public string? OverallAssessment { get; set; }
        public List<string>? Strengths { get; set; }
        public List<string>? BlindSpots { get; set; }
        public List<GeminiTopicPayload>? RecommendedTopics { get; set; }
        public List<string>? FirstMonthRoadmap { get; set; }
        public double SynergyScore { get; set; }
    }

    private sealed class GeminiTopicPayload
    {
        public string? Title { get; set; }
        public string? Description { get; set; }
        public string? TargetMarket { get; set; }
        public string? BusinessModel { get; set; }
    }
}

