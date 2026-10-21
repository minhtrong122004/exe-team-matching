using System.Net;
using System.Net.Http.Json;

namespace Group.Services.Clients;

public sealed class ProjectClient(HttpClient http) : IProjectClient
{
    public async Task<ProjectDto?> GetProjectAsync(Guid projectId, CancellationToken ct = default)
    {
        using var response = await http.GetAsync($"api/projects/{projectId}", ct);
        if (response.StatusCode == HttpStatusCode.NotFound) return null;

        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<ProjectDto>(ct);
    }
}
