using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Group.Repository.Migrations
{
    /// <inheritdoc />
    public partial class Phase3CourseSpaceAndRooms : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Groups_ProjectId",
                table: "Groups");

            migrationBuilder.AlterColumn<Guid>(
                name: "ProjectId",
                table: "Groups",
                type: "uniqueidentifier",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.AlterColumn<string>(
                name: "ProjectDomain",
                table: "Groups",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<Guid>(
                name: "LeaderId",
                table: "Groups",
                type: "uniqueidentifier",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.AddColumn<bool>(
                name: "IsClosedByLeader",
                table: "Groups",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "RoomCode",
                table: "Groups",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SpaceId",
                table: "Groups",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "CourseSpaces",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SemesterCode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    SubjectCode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    MaxMembersPerGroup = table.Column<int>(type: "int", nullable: false),
                    GroupThreshold = table.Column<int>(type: "int", nullable: false),
                    BufferRatio = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: false),
                    MaxConcurrentApplies = table.Column<int>(type: "int", nullable: false),
                    RegistrationDeadline = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CourseSpaces", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SpaceEnrollments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SpaceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StudentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StudentCode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    FullName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Major = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Cohort = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    ClassCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    EnrolledAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SpaceEnrollments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SpaceEnrollments_CourseSpaces_SpaceId",
                        column: x => x.SpaceId,
                        principalTable: "CourseSpaces",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Groups_ProjectId",
                table: "Groups",
                column: "ProjectId",
                unique: true,
                filter: "[ProjectId] IS NOT NULL AND [Status] <> 'Disbanded'");

            migrationBuilder.CreateIndex(
                name: "IX_Groups_SpaceId",
                table: "Groups",
                column: "SpaceId");

            migrationBuilder.CreateIndex(
                name: "IX_Groups_SpaceId_RoomCode",
                table: "Groups",
                columns: new[] { "SpaceId", "RoomCode" },
                unique: true,
                filter: "[SpaceId] IS NOT NULL AND [RoomCode] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_CourseSpaces_SemesterCode_SubjectCode",
                table: "CourseSpaces",
                columns: new[] { "SemesterCode", "SubjectCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CourseSpaces_Status",
                table: "CourseSpaces",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_SpaceEnrollments_SpaceId_StudentCode",
                table: "SpaceEnrollments",
                columns: new[] { "SpaceId", "StudentCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SpaceEnrollments_SpaceId_StudentId",
                table: "SpaceEnrollments",
                columns: new[] { "SpaceId", "StudentId" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Groups_CourseSpaces_SpaceId",
                table: "Groups",
                column: "SpaceId",
                principalTable: "CourseSpaces",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Groups_CourseSpaces_SpaceId",
                table: "Groups");

            migrationBuilder.DropTable(
                name: "SpaceEnrollments");

            migrationBuilder.DropTable(
                name: "CourseSpaces");

            migrationBuilder.DropIndex(
                name: "IX_Groups_ProjectId",
                table: "Groups");

            migrationBuilder.DropIndex(
                name: "IX_Groups_SpaceId",
                table: "Groups");

            migrationBuilder.DropIndex(
                name: "IX_Groups_SpaceId_RoomCode",
                table: "Groups");

            migrationBuilder.DropColumn(
                name: "IsClosedByLeader",
                table: "Groups");

            migrationBuilder.DropColumn(
                name: "RoomCode",
                table: "Groups");

            migrationBuilder.DropColumn(
                name: "SpaceId",
                table: "Groups");

            migrationBuilder.AlterColumn<Guid>(
                name: "ProjectId",
                table: "Groups",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ProjectDomain",
                table: "Groups",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "LeaderId",
                table: "Groups",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Groups_ProjectId",
                table: "Groups",
                column: "ProjectId",
                unique: true,
                filter: "[Status] <> 'Disbanded'");
        }
    }
}
