using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sanad.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectAndEstimatedMinutes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "EstimatedMinutes",
                table: "TaskItems",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Project",
                table: "TaskItems",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EstimatedMinutes",
                table: "TaskItems");

            migrationBuilder.DropColumn(
                name: "Project",
                table: "TaskItems");
        }
    }
}
