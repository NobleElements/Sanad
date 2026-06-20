using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sanad.Api.Migrations.Admin
{
    /// <inheritdoc />
    public partial class AddPaddleIntegration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PaddleCustomerId",
                table: "Users",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaddleSubscriptionId",
                table: "Users",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaddleSubscriptionStatus",
                table: "Users",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaddlePriceId",
                table: "Tiers",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaddleProductId",
                table: "Tiers",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "SystemSettings",
                columns: table => new
                {
                    Key = table.Column<string>(type: "TEXT", nullable: false),
                    Value = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SystemSettings", x => x.Key);
                });

            migrationBuilder.UpdateData(
                table: "Tiers",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "PaddlePriceId", "PaddleProductId" },
                values: new object[] { null, null });

            migrationBuilder.UpdateData(
                table: "Tiers",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "PaddlePriceId", "PaddleProductId" },
                values: new object[] { null, null });

            migrationBuilder.UpdateData(
                table: "Tiers",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "PaddlePriceId", "PaddleProductId" },
                values: new object[] { null, null });

            migrationBuilder.UpdateData(
                table: "Tiers",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "PaddlePriceId", "PaddleProductId" },
                values: new object[] { null, null });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SystemSettings");

            migrationBuilder.DropColumn(
                name: "PaddleCustomerId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "PaddleSubscriptionId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "PaddleSubscriptionStatus",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "PaddlePriceId",
                table: "Tiers");

            migrationBuilder.DropColumn(
                name: "PaddleProductId",
                table: "Tiers");
        }
    }
}
