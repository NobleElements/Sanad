using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sanad.Api.Migrations.Admin
{
    /// <inheritdoc />
    public partial class AddDatastores : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DatastoreId",
                table: "Users",
                type: "INTEGER",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<bool>(
                name: "IsMigrating",
                table: "Users",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "TargetDatastoreId",
                table: "Users",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Datastores",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Path = table.Column<string>(type: "TEXT", nullable: false),
                    IsDefault = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Datastores", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "Datastores",
                columns: new[] { "Id", "CreatedAt", "IsDefault", "Name", "Path" },
                values: new object[] { 1, new DateTime(2026, 6, 16, 11, 38, 32, 19, DateTimeKind.Utc).AddTicks(7070), true, "Default", "Data" });

            migrationBuilder.CreateIndex(
                name: "IX_Users_DatastoreId",
                table: "Users",
                column: "DatastoreId");

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Datastores_DatastoreId",
                table: "Users",
                column: "DatastoreId",
                principalTable: "Datastores",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Users_Datastores_DatastoreId",
                table: "Users");

            migrationBuilder.DropTable(
                name: "Datastores");

            migrationBuilder.DropIndex(
                name: "IX_Users_DatastoreId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "DatastoreId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "IsMigrating",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "TargetDatastoreId",
                table: "Users");
        }
    }
}
