using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sanad.Api.Migrations.Sanad
{
    /// <inheritdoc />
    public partial class AddWhiteboardCameraAndMinimapState : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "CameraX",
                table: "Whiteboards",
                type: "REAL",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "CameraY",
                table: "Whiteboards",
                type: "REAL",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "CameraZ",
                table: "Whiteboards",
                type: "REAL",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsMinimapOpen",
                table: "Whiteboards",
                type: "INTEGER",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CameraX",
                table: "Whiteboards");

            migrationBuilder.DropColumn(
                name: "CameraY",
                table: "Whiteboards");

            migrationBuilder.DropColumn(
                name: "CameraZ",
                table: "Whiteboards");

            migrationBuilder.DropColumn(
                name: "IsMinimapOpen",
                table: "Whiteboards");
        }
    }
}
