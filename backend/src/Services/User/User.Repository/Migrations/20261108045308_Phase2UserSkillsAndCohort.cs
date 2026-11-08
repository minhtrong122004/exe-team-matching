using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace User.Repository.Migrations
{
    /// <inheritdoc />
    public partial class Phase2UserSkillsAndCohort : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Cohort",
                table: "UserProfiles",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CommittedAt",
                table: "UserProfiles",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "GraphicDesignScore",
                table: "UserProfiles",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "IsCommitted",
                table: "UserProfiles",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsProfileCompleted",
                table: "UserProfiles",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "ManagementScore",
                table: "UserProfiles",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "MarketingScore",
                table: "UserProfiles",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "SaleScore",
                table: "UserProfiles",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TechScore",
                table: "UserProfiles",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Cohort",
                table: "UserProfiles");

            migrationBuilder.DropColumn(
                name: "CommittedAt",
                table: "UserProfiles");

            migrationBuilder.DropColumn(
                name: "GraphicDesignScore",
                table: "UserProfiles");

            migrationBuilder.DropColumn(
                name: "IsCommitted",
                table: "UserProfiles");

            migrationBuilder.DropColumn(
                name: "IsProfileCompleted",
                table: "UserProfiles");

            migrationBuilder.DropColumn(
                name: "ManagementScore",
                table: "UserProfiles");

            migrationBuilder.DropColumn(
                name: "MarketingScore",
                table: "UserProfiles");

            migrationBuilder.DropColumn(
                name: "SaleScore",
                table: "UserProfiles");

            migrationBuilder.DropColumn(
                name: "TechScore",
                table: "UserProfiles");
        }
    }
}
