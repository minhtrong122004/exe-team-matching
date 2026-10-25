using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Report.Repository.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "GroupStats",
                columns: table => new
                {
                    GroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    LeaderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MemberCount = table.Column<int>(type: "int", nullable: false),
                    MaxMembers = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GroupStats", x => x.GroupId);
                });

            migrationBuilder.CreateTable(
                name: "ProcessedEvents",
                columns: table => new
                {
                    EventId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProcessedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProcessedEvents", x => x.EventId);
                });

            migrationBuilder.CreateTable(
                name: "ReportSnapshots",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GeneratedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    TotalStudents = table.Column<int>(type: "int", nullable: false),
                    StudentsInGroup = table.Column<int>(type: "int", nullable: false),
                    StudentsWithoutGroup = table.Column<int>(type: "int", nullable: false),
                    TotalGroups = table.Column<int>(type: "int", nullable: false),
                    RecruitingGroups = table.Column<int>(type: "int", nullable: false),
                    FullGroups = table.Column<int>(type: "int", nullable: false),
                    ByMajorJson = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReportSnapshots", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "StudentStats",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    FullName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Major = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: true),
                    HasGroup = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    GroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StudentStats", x => x.UserId);
                });

            migrationBuilder.CreateIndex(
                name: "IX_GroupStats_Status",
                table: "GroupStats",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_ReportSnapshots_GeneratedAt",
                table: "ReportSnapshots",
                column: "GeneratedAt");

            migrationBuilder.CreateIndex(
                name: "IX_StudentStats_HasGroup_Major",
                table: "StudentStats",
                columns: new[] { "HasGroup", "Major" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GroupStats");

            migrationBuilder.DropTable(
                name: "ProcessedEvents");

            migrationBuilder.DropTable(
                name: "ReportSnapshots");

            migrationBuilder.DropTable(
                name: "StudentStats");
        }
    }
}
