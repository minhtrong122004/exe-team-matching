using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Group.Repository.Migrations
{
    /// <inheritdoc />
    public partial class AddGroupTransferRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "GroupTransferRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SpaceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RequesterStudentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RequesterStudentName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    RequesterStudentCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    FromGroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FromGroupCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    TargetGroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TargetGroupCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    SwapWithStudentId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    SwapWithStudentName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    SwapWithStudentCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Reason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DecidedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DecidedByModeratorId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DecisionReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GroupTransferRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GroupTransferRequests_CourseSpaces_SpaceId",
                        column: x => x.SpaceId,
                        principalTable: "CourseSpaces",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_GroupTransferRequests_Groups_FromGroupId",
                        column: x => x.FromGroupId,
                        principalTable: "Groups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_GroupTransferRequests_Groups_TargetGroupId",
                        column: x => x.TargetGroupId,
                        principalTable: "Groups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_GroupTransferRequests_FromGroupId",
                table: "GroupTransferRequests",
                column: "FromGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_GroupTransferRequests_RequesterStudentId",
                table: "GroupTransferRequests",
                column: "RequesterStudentId");

            migrationBuilder.CreateIndex(
                name: "IX_GroupTransferRequests_SpaceId",
                table: "GroupTransferRequests",
                column: "SpaceId");

            migrationBuilder.CreateIndex(
                name: "IX_GroupTransferRequests_SpaceId_RequesterStudentId_Status",
                table: "GroupTransferRequests",
                columns: new[] { "SpaceId", "RequesterStudentId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_GroupTransferRequests_Status",
                table: "GroupTransferRequests",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_GroupTransferRequests_TargetGroupId",
                table: "GroupTransferRequests",
                column: "TargetGroupId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GroupTransferRequests");
        }
    }
}
