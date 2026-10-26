using System.Net;
using System.Net.Http.Json;
using Exe.BuildingBlocks.Paging;

namespace Group.Services.Clients;

public sealed class UserClient(HttpClient http) : IUserClient
{
    private const int BatchLimit = 100; // User Service giới hạn 100 id mỗi lần

    public async Task<UserProfileDto?> GetProfileAsync(Guid userId, CancellationToken ct = default)
    {
        using var response = await http.GetAsync($"api/users/{userId}", ct);
        if (response.StatusCode == HttpStatusCode.NotFound) return null;

        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<UserProfileDto>(ct);
    }

    public async Task<IReadOnlyList<UserProfileDto>> GetProfilesAsync(IEnumerable<Guid> userIds, CancellationToken ct = default)
    {
        var result = new List<UserProfileDto>();
        foreach (var chunk in userIds.Distinct().Chunk(BatchLimit))
        {
            using var response = await http.PostAsJsonAsync("api/users/batch", new { userIds = chunk }, ct);
            response.EnsureSuccessStatusCode();
            result.AddRange(await response.Content.ReadFromJsonAsync<List<UserProfileDto>>(ct) ?? []);
        }
        return result;
    }

    public async Task<IReadOnlyList<UserProfileDto>> GetLookingForTeamAsync(int max, CancellationToken ct = default)
    {
        var result = new List<UserProfileDto>();
        for (var page = 1; result.Count < max; page++)
        {
            var paged = await http.GetFromJsonAsync<PagedResult<UserProfileDto>>(
                $"api/users?availability=LookingForTeam&page={page}&pageSize={BatchLimit}", ct);
            if (paged is null || paged.Items.Count == 0) break;

            result.AddRange(paged.Items);
            if (!paged.HasNext) break;
        }
        return result.Take(max).ToList();
    }
}
