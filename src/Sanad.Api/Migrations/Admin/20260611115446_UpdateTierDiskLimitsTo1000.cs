using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sanad.Api.Migrations.Admin
{
    /// <inheritdoc />
    public partial class UpdateTierDiskLimitsTo1000 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Tiers",
                keyColumn: "Id",
                keyValue: 1,
                column: "DiskLimitBytes",
                value: 5000000000L);

            migrationBuilder.UpdateData(
                table: "Tiers",
                keyColumn: "Id",
                keyValue: 2,
                column: "DiskLimitBytes",
                value: 10000000000L);

            migrationBuilder.UpdateData(
                table: "Tiers",
                keyColumn: "Id",
                keyValue: 3,
                column: "DiskLimitBytes",
                value: 50000000000L);

            migrationBuilder.UpdateData(
                table: "Tiers",
                keyColumn: "Id",
                keyValue: 4,
                column: "DiskLimitBytes",
                value: 200000000000L);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Tiers",
                keyColumn: "Id",
                keyValue: 1,
                column: "DiskLimitBytes",
                value: 5368709120L);

            migrationBuilder.UpdateData(
                table: "Tiers",
                keyColumn: "Id",
                keyValue: 2,
                column: "DiskLimitBytes",
                value: 10737418240L);

            migrationBuilder.UpdateData(
                table: "Tiers",
                keyColumn: "Id",
                keyValue: 3,
                column: "DiskLimitBytes",
                value: 53687091200L);

            migrationBuilder.UpdateData(
                table: "Tiers",
                keyColumn: "Id",
                keyValue: 4,
                column: "DiskLimitBytes",
                value: 214748364800L);
        }
    }
}
