using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Group.Repository.Migrations
{
    /// <inheritdoc />
    public partial class Phase4RoomGroupLifecycleAndVoting : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ApplicationVotes",
                columns: table => new
                {
                    JoinRequestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VoterId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VoterName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    IsUpvote = table.Column<bool>(type: "bit", nullable: false),
                    Comment = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    VotedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApplicationVotes", x => new { x.JoinRequestId, x.VoterId });
                    table.ForeignKey(
                        name: "FK_ApplicationVotes_JoinRequests_JoinRequestId",
                        column: x => x.JoinRequestId,
                        principalTable: "JoinRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LeaderElections",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CandidateId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CandidateName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    InitiatedById = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    InitiatedByName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    StartedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LeaderElections", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LeaderElections_Groups_GroupId",
                        column: x => x.GroupId,
                        principalTable: "Groups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ElectionVotes",
                columns: table => new
                {
                    ElectionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VoterId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VoterName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    IsAgree = table.Column<bool>(type: "bit", nullable: false),
                    VotedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ElectionVotes", x => new { x.ElectionId, x.VoterId });
                    table.ForeignKey(
                        name: "FK_ElectionVotes_LeaderElections_ElectionId",
                        column: x => x.ElectionId,
                        principalTable: "LeaderElections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LeaderElections_GroupId_Active",
                table: "LeaderElections",
                columns: new[] { "GroupId", "Status" },
                unique: true,
                filter: "[Status] = 'Active'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ApplicationVotes");

            migrationBuilder.DropTable(
                name: "ElectionVotes");

            migrationBuilder.DropTable(
                name: "LeaderElections");
        }
    }
}
