using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Group.Repository.Migrations
{
    /// <inheritdoc />
    public partial class Phase4MemberRemovalAuditLog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MemberRemovalLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RemovedUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RemovedUserName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    RemovedUserEmail = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    LeaderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LeaderName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Category = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    RemovedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MemberRemovalLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MemberRemovalLogs_Groups_GroupId",
                        column: x => x.GroupId,
                        principalTable: "Groups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MemberRemovalLogs_GroupId",
                table: "MemberRemovalLogs",
                column: "GroupId");

            migrationBuilder.CreateIndex(
                name: "IX_MemberRemovalLogs_RemovedUserId",
                table: "MemberRemovalLogs",
                column: "RemovedUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MemberRemovalLogs");
        }
    }
}
