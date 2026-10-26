using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Group.Repository.Migrations
{
    /// <inheritdoc />
    public partial class AddPendingUniqueIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_JoinRequests_StudentId_GroupId_Pending",
                table: "JoinRequests",
                columns: new[] { "StudentId", "GroupId" },
                unique: true,
                filter: "[Status] = 'Pending'");

            migrationBuilder.CreateIndex(
                name: "IX_Invitations_StudentId_GroupId_Pending",
                table: "Invitations",
                columns: new[] { "StudentId", "GroupId" },
                unique: true,
                filter: "[Status] = 'Pending'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_JoinRequests_StudentId_GroupId_Pending",
                table: "JoinRequests");

            migrationBuilder.DropIndex(
                name: "IX_Invitations_StudentId_GroupId_Pending",
                table: "Invitations");
        }
    }
}
