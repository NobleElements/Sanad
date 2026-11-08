using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sanad.Api.Migrations.Sanad
{
    /// <inheritdoc />
    public partial class AddThoughtCollectionsAndKeepFeatures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CollectionId",
                table: "Thoughts",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Color",
                table: "Thoughts",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsPinned",
                table: "Thoughts",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Thoughts",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ThoughtCollections",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Color = table.Column<string>(type: "TEXT", nullable: false),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ThoughtCollections", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Thoughts_CollectionId",
                table: "Thoughts",
                column: "CollectionId");

            migrationBuilder.CreateIndex(
                name: "IX_Thoughts_IsPinned_CreatedAt",
                table: "Thoughts",
                columns: new[] { "IsPinned", "CreatedAt" });

            migrationBuilder.AddForeignKey(
                name: "FK_Thoughts_ThoughtCollections_CollectionId",
                table: "Thoughts",
                column: "CollectionId",
                principalTable: "ThoughtCollections",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Thoughts_ThoughtCollections_CollectionId",
                table: "Thoughts");

            migrationBuilder.DropTable(
                name: "ThoughtCollections");

            migrationBuilder.DropIndex(
                name: "IX_Thoughts_CollectionId",
                table: "Thoughts");

            migrationBuilder.DropIndex(
                name: "IX_Thoughts_IsPinned_CreatedAt",
                table: "Thoughts");

            migrationBuilder.DropColumn(
                name: "CollectionId",
                table: "Thoughts");

            migrationBuilder.DropColumn(
                name: "Color",
                table: "Thoughts");

            migrationBuilder.DropColumn(
                name: "IsPinned",
                table: "Thoughts");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Thoughts");
        }
    }
}
