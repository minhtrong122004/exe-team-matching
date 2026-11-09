using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Auth.Repository.Migrations
{
    /// <inheritdoc />
    public partial class RemovePasswordAndOtp : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EmailVerificationChallenges");

            migrationBuilder.DropColumn(
                name: "EmailConfirmed",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "EmailConfirmedAt",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "MustChangePassword",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "PasswordHash",
                table: "Accounts");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "EmailConfirmed",
                table: "Accounts",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "EmailConfirmedAt",
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
                name: "PasswordHash",
                table: "Accounts",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "EmailVerificationChallenges",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AccountId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    FailedAttempts = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    IsUsed = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    OtpHash = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                    Purpose = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false, defaultValue: "EmailVerification"),
                    ResendAvailableAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Salt = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                    UsedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmailVerificationChallenges", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EmailVerificationChallenges_Accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EmailVerificationChallenges_AccountId",
                table: "EmailVerificationChallenges",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_EmailVerificationChallenges_Email",
                table: "EmailVerificationChallenges",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_EmailVerificationChallenges_Email_Purpose",
                table: "EmailVerificationChallenges",
                columns: new[] { "Email", "Purpose" });

            migrationBuilder.CreateIndex(
                name: "IX_EmailVerificationChallenges_ExpiresAt",
                table: "EmailVerificationChallenges",
                column: "ExpiresAt");
        }
    }
}
