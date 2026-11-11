using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace Notification.API.Hubs;

/// <summary>
/// Hub SignalR tập trung cho toàn hệ thống EXE Team Matching.
/// Quản lý kết nối thời gian thực cho tất cả các vai trò: Moderator, Lecturer, Student.
/// </summary>
[Authorize]
public class AppRealtimeHub : Hub
{
    private readonly ILogger<AppRealtimeHub> _logger;

    public AppRealtimeHub(ILogger<AppRealtimeHub> logger)
    {
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirst("sub")?.Value 
                     ?? Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var role = Context.User?.FindFirst("role")?.Value 
                   ?? Context.User?.FindFirst(ClaimTypes.Role)?.Value;

        if (!string.IsNullOrEmpty(userId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");
        }

        if (!string.IsNullOrEmpty(role))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"role_{role.ToLowerInvariant()}");
        }

        _logger.LogInformation("SignalR connected: ConnectionId={ConnectionId}, UserId={UserId}, Role={Role}",
            Context.ConnectionId, userId, role);

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("SignalR disconnected: ConnectionId={ConnectionId}, Reason={Reason}",
            Context.ConnectionId, exception?.Message ?? "Normal closure");
        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Tham gia phòng môn học để nhận cập nhật về trạng thái môn học, sĩ số các phòng, chia nhóm.
    /// </summary>
    public async Task JoinSpace(string spaceId)
    {
        if (!string.IsNullOrWhiteSpace(spaceId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"space_{spaceId}");
            _logger.LogDebug("Client {ConnectionId} joined space_{SpaceId}", Context.ConnectionId, spaceId);
        }
    }

    /// <summary>
    /// Rời phòng môn học khi chuyển sang trang khác.
    /// </summary>
    public async Task LeaveSpace(string spaceId)
    {
        if (!string.IsNullOrWhiteSpace(spaceId))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"space_{spaceId}");
            _logger.LogDebug("Client {ConnectionId} left space_{SpaceId}", Context.ConnectionId, spaceId);
        }
    }

    /// <summary>
    /// Tham gia phòng nhóm / room để nhận thông báo nội bộ (đơn apply, thành viên vào/ra, bầu cử).
    /// </summary>
    public async Task JoinGroup(string groupId)
    {
        if (!string.IsNullOrWhiteSpace(groupId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"group_{groupId}");
            _logger.LogDebug("Client {ConnectionId} joined group_{GroupId}", Context.ConnectionId, groupId);
        }
    }

    /// <summary>
    /// Rời phòng nhóm / room.
    /// </summary>
    public async Task LeaveGroup(string groupId)
    {
        if (!string.IsNullOrWhiteSpace(groupId))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"group_{groupId}");
            _logger.LogDebug("Client {ConnectionId} left group_{GroupId}", Context.ConnectionId, groupId);
        }
    }
}

