using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Group.Repository.Migrations
{
    /// <inheritdoc />
    public partial class AddIsProfileCompletedToSpaceEnrollment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsProfileCompleted",
                table: "SpaceEnrollments",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsProfileCompleted",
                table: "SpaceEnrollments");
        }
    }
}
