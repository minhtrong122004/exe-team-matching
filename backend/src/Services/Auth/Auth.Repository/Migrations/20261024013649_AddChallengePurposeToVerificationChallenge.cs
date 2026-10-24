using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Auth.Repository.Migrations
{
    /// <inheritdoc />
    public partial class AddChallengePurposeToVerificationChallenge : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Purpose",
                table: "EmailVerificationChallenges",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "EmailVerification");

            migrationBuilder.CreateIndex(
                name: "IX_EmailVerificationChallenges_Email_Purpose",
                table: "EmailVerificationChallenges",
                columns: new[] { "Email", "Purpose" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_EmailVerificationChallenges_Email_Purpose",
                table: "EmailVerificationChallenges");

            migrationBuilder.DropColumn(
                name: "Purpose",
                table: "EmailVerificationChallenges");
        }
    }
}
