using Exe.BuildingBlocks.Web;
using Group.Repository.Entities;
using Group.Repository.Enums;
using Group.Repository.Interfaces;
using Group.Services.DTOs;
using Group.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace Group.Services.Implementations;

public class ElectionService(
    IGroupRepository groupRepo,
    IGroupUnitOfWork uow,
    ICurrentUser currentUser,
    ILogger<ElectionService> logger) : IElectionService
{
    public async Task<LeaderElectionResponse> StartElectionAsync(Guid groupId, StartElectionRequest request, CancellationToken ct = default)
    {
        var group = await groupRepo.GetByIdAsync(groupId, ct)
            ?? throw new NotFoundException("Group", groupId);

        var currentUserId = currentUser.UserId;
        var currentMember = group.Members.FirstOrDefault(m => m.UserId == currentUserId)
            ?? throw new BusinessRuleException("NOT_MEMBER", "Chỉ thành viên hiện tại của nhóm mới được phát động bầu cử Leader.");

        if (group.Members.Count < 2)
        {
            throw new BusinessRuleException("INSUFFICIENT_MEMBERS", "Nhóm phải có từ 2 thành viên trở lên mới có thể tổ chức bầu chọn Leader.");
        }

        var candidate = group.Members.FirstOrDefault(m => m.UserId == request.CandidateId)
            ?? throw new BusinessRuleException("CANDIDATE_NOT_MEMBER", "Người được đề cử phải là thành viên trong nhóm.");

        if (candidate.UserId == group.LeaderId)
        {
            throw new BusinessRuleException("ALREADY_LEADER", $"{candidate.FullName} hiện đã là Leader của nhóm.");
        }

        // BR-19: Mỗi Room chỉ có tối đa 1 cuộc bầu cử diễn ra tại một thời điểm
        var existing = await groupRepo.GetActiveElectionAsync(groupId, ct);
        if (existing is not null)
        {
            if (DateTime.UtcNow < existing.ExpiresAt)
            {
                throw new BusinessRuleException("ACTIVE_ELECTION_EXISTS",
                    $"Nhóm đang có cuộc bầu chọn cho ứng viên {existing.CandidateName} còn hiệu lực đến {existing.ExpiresAt:HH:mm dd/MM/yyyy}.");
            }
            existing.Status = ElectionStatus.TimedOut;
            existing.CompletedAt = existing.ExpiresAt;
        }

        var now = DateTime.UtcNow;
        var election = new LeaderElection
        {
            Id = Guid.NewGuid(),
            GroupId = groupId,
            CandidateId = candidate.UserId,
            CandidateName = candidate.FullName,
            InitiatedById = currentUserId,
            InitiatedByName = currentMember.FullName,
            Status = ElectionStatus.Active,
            StartedAt = now,
            ExpiresAt = now.AddHours(24), // 24h timeout (BR-19)
            CompletedAt = null
        };

        groupRepo.AddElection(election);
        await uow.SaveChangesAsync(ct);

        logger.LogInformation("Started leader election {ElectionId} for group {GroupId}, candidate: {CandidateName}",
            election.Id, groupId, candidate.FullName);

        return MapToResponse(election, group.Members.Count);
    }

    public async Task<LeaderElectionResponse> VoteElectionAsync(Guid groupId, Guid electionId, VoteElectionRequest request, CancellationToken ct = default)
    {
        var group = await groupRepo.GetByIdAsync(groupId, ct)
            ?? throw new NotFoundException("Group", groupId);

        var currentUserId = currentUser.UserId;
        var currentMember = group.Members.FirstOrDefault(m => m.UserId == currentUserId)
            ?? throw new BusinessRuleException("NOT_MEMBER", "Bạn không phải là thành viên của nhóm này để bỏ phiếu.");

        var election = await groupRepo.GetElectionByIdAsync(electionId, ct)
            ?? throw new NotFoundException("LeaderElection", electionId);

        if (election.GroupId != groupId)
        {
            throw new BusinessRuleException("INVALID_GROUP", "Cuộc bầu cử không thuộc nhóm này.");
        }

        if (election.Status != ElectionStatus.Active)
        {
            throw new BusinessRuleException("ELECTION_CLOSED", $"Cuộc bầu cử đã kết thúc với trạng thái: {election.Status}.");
        }

        var now = DateTime.UtcNow;
        if (now >= election.ExpiresAt)
        {
            election.Status = ElectionStatus.TimedOut;
            election.CompletedAt = election.ExpiresAt;
            await uow.SaveChangesAsync(ct);
            throw new BusinessRuleException("ELECTION_EXPIRED", "Cuộc bầu cử đã hết thời hạn 24 giờ.");
        }

        // BR-19: ứng viên đã rời nhóm thì cuộc bầu không còn hiệu lực.
        if (group.Members.All(m => m.UserId != election.CandidateId))
        {
            election.Status = ElectionStatus.Failed;
            election.CompletedAt = now;
            await uow.SaveChangesAsync(ct);
            throw new BusinessRuleException("ELECTION_CANDIDATE_LEFT", $"{election.CandidateName} đã rời nhóm nên cuộc bầu này đã kết thúc.");
        }

        if (election.Votes.Any(v => v.VoterId == currentUserId))
        {
            throw new BusinessRuleException("ALREADY_VOTED", "Bạn đã bỏ phiếu cho cuộc bầu cử này rồi (mỗi thành viên 1 phiếu).");
        }

        var vote = new ElectionVote
        {
            ElectionId = election.Id,
            VoterId = currentUserId,
            VoterName = currentMember.FullName,
            IsAgree = request.IsAgree,
            VotedAt = now
        };

        groupRepo.AddElectionVote(vote);
        if (!election.Votes.Any(v => v.VoterId == currentUserId))
        {
            election.Votes.Add(vote);
        }

        // Kiểm tra ngưỡng thông qua (> 50% tổng số thành viên hiện tại - BR-19)
        var totalMembers = group.Members.Count;
        var requiredToPass = (totalMembers / 2) + 1; // Hơn 50%
        var agreedCount = election.Votes.DistinctBy(v => v.VoterId).Count(v => v.IsAgree);
        var totalDistinctVotes = election.Votes.DistinctBy(v => v.VoterId).Count();

        if (agreedCount >= requiredToPass)
        {
            election.Status = ElectionStatus.Passed;
            election.CompletedAt = now;

            // Chuyển quyền Leader cho ứng viên chiến thắng
            var oldLeader = group.Members.FirstOrDefault(m => m.UserId == group.LeaderId);
            if (oldLeader is not null) oldLeader.Role = MemberRole.Member;

            var newLeader = group.Members.FirstOrDefault(m => m.UserId == election.CandidateId);
            if (newLeader is not null) newLeader.Role = MemberRole.Leader;

            group.LeaderId = election.CandidateId;
            group.UpdatedAt = now;

            logger.LogInformation("Election {ElectionId} PASSED! Group {GroupId} leadership transferred to {CandidateName}",
                election.Id, groupId, election.CandidateName);
        }
        else if (totalDistinctVotes >= totalMembers)
        {
            // Mọi người đã vote xong nhưng không đạt quá bán
            election.Status = ElectionStatus.Failed;
            election.CompletedAt = now;
            logger.LogInformation("Election {ElectionId} FAILED for Group {GroupId}. Votes: {Agreed}/{Total}",
                election.Id, groupId, agreedCount, totalMembers);
        }

        await uow.SaveChangesAsync(ct);

        return MapToResponse(election, totalMembers);
    }

    public async Task<LeaderElectionResponse?> GetCurrentElectionAsync(Guid groupId, CancellationToken ct = default)
    {
        var group = await groupRepo.GetByIdAsync(groupId, ct)
            ?? throw new NotFoundException("Group", groupId);

        var election = await groupRepo.GetActiveElectionAsync(groupId, ct);
        if (election is null) return null;

        if (DateTime.UtcNow >= election.ExpiresAt)
        {
            election.Status = ElectionStatus.TimedOut;
            election.CompletedAt = election.ExpiresAt;
            await uow.SaveChangesAsync(ct);
            return null;
        }

        return MapToResponse(election, group.Members.Count);
    }

    private static LeaderElectionResponse MapToResponse(LeaderElection e, int totalMembers)
    {
        var distinctVotes = e.Votes.DistinctBy(v => v.VoterId).ToList();
        var agreed = distinctVotes.Count(v => v.IsAgree);
        var disagreed = distinctVotes.Count(v => !v.IsAgree);
        var requiredToPass = (totalMembers / 2) + 1;
        var remainingSeconds = Math.Max(0, (e.ExpiresAt - DateTime.UtcNow).TotalSeconds);

        return new LeaderElectionResponse(
            Id: e.Id,
            GroupId: e.GroupId,
            CandidateId: e.CandidateId,
            CandidateName: e.CandidateName,
            InitiatedById: e.InitiatedById,
            InitiatedByName: e.InitiatedByName,
            Status: e.Status.ToString(),
            StartedAt: e.StartedAt,
            ExpiresAt: e.ExpiresAt,
            CompletedAt: e.CompletedAt,
            TotalAgreed: agreed,
            TotalDisagreed: disagreed,
            TotalVotes: distinctVotes.Count,
            RequiredVotesToPass: requiredToPass,
            TotalMembers: totalMembers,
            SecondsRemaining: remainingSeconds,
            Votes: distinctVotes.Select(v => new ElectionVoteResponse(
                v.VoterId,
                v.VoterName,
                v.IsAgree,
                v.VotedAt
            )).ToList()
        );
    }
}
