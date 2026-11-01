using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sanad.Api.Migrations.Admin
{
    /// <inheritdoc />
    public partial class AddAdminReadQueryIndices : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Users_ApiKey",
                table: "Users",
                column: "ApiKey");

            migrationBuilder.CreateIndex(
                name: "IX_Users_PaddleCustomerId",
                table: "Users",
                column: "PaddleCustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_SharedLinks_Token",
                table: "SharedLinks",
                column: "Token");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Users_ApiKey",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_PaddleCustomerId",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_SharedLinks_Token",
                table: "SharedLinks");
        }
    }
}
