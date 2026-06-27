using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sanad.Api.Migrations.Sanad
{
    /// <inheritdoc />
    public partial class AddEventNotificationPreference : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "NotificationPreference",
                table: "CalendarEvents",
                type: "INTEGER",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "NotificationPreference",
                table: "CalendarEvents");
        }
    }
}
