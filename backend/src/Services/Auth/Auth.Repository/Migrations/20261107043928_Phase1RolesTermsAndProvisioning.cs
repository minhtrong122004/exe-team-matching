using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Auth.Repository.Migrations
{
    /// <inheritdoc />
    public partial class Phase1RolesTermsAndProvisioning : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "AcceptedTermsAt",
                table: "Accounts",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "MustChangePassword",
                table: "Accounts",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "StudentCode",
                table: "Accounts",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.Sql("DELETE FROM [Accounts] WHERE [Email] = N'admin@exe.local'; UPDATE [Accounts] SET [Role] = N'Moderator' WHERE [Role] = N'Admin';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AcceptedTermsAt",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "MustChangePassword",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "StudentCode",
                table: "Accounts");
        }
    }
}
