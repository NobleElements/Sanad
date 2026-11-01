using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sanad.Api.Migrations.Sanad
{
    /// <inheritdoc />
    public partial class AddSanadReadQueryIndices : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Notes_NotebookId",
                table: "Notes");

            migrationBuilder.DropIndex(
                name: "IX_HabitLogs_HabitId",
                table: "HabitLogs");

            migrationBuilder.DropIndex(
                name: "IX_Folders_ParentId",
                table: "Folders");

            migrationBuilder.DropIndex(
                name: "IX_FileItems_FolderId",
                table: "FileItems");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_Date",
                table: "Transactions",
                column: "Date");

            migrationBuilder.CreateIndex(
                name: "IX_Thoughts_CreatedAt",
                table: "Thoughts",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_TaskItems_Order_CreatedAt",
                table: "TaskItems",
                columns: new[] { "Order", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_TaskItems_Status_Order_CreatedAt",
                table: "TaskItems",
                columns: new[] { "Status", "Order", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Notes_NotebookId_UpdatedAt",
                table: "Notes",
                columns: new[] { "NotebookId", "UpdatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Notes_UpdatedAt",
                table: "Notes",
                column: "UpdatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_MonthlyBudgets_Year_Month",
                table: "MonthlyBudgets",
                columns: new[] { "Year", "Month" });

            migrationBuilder.CreateIndex(
                name: "IX_HabitLogs_HabitId_Date",
                table: "HabitLogs",
                columns: new[] { "HabitId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_Folders_ParentId_Name",
                table: "Folders",
                columns: new[] { "ParentId", "Name" });

            migrationBuilder.CreateIndex(
                name: "IX_FileItems_FolderId_Name",
                table: "FileItems",
                columns: new[] { "FolderId", "Name" });

            migrationBuilder.CreateIndex(
                name: "IX_DebtSnapshots_RecordedAt",
                table: "DebtSnapshots",
                column: "RecordedAt");

            migrationBuilder.CreateIndex(
                name: "IX_AssetSnapshots_RecordedAt",
                table: "AssetSnapshots",
                column: "RecordedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Transactions_Date",
                table: "Transactions");

            migrationBuilder.DropIndex(
                name: "IX_Thoughts_CreatedAt",
                table: "Thoughts");

            migrationBuilder.DropIndex(
                name: "IX_TaskItems_Order_CreatedAt",
                table: "TaskItems");

            migrationBuilder.DropIndex(
                name: "IX_TaskItems_Status_Order_CreatedAt",
                table: "TaskItems");

            migrationBuilder.DropIndex(
                name: "IX_Notes_NotebookId_UpdatedAt",
                table: "Notes");

            migrationBuilder.DropIndex(
                name: "IX_Notes_UpdatedAt",
                table: "Notes");

            migrationBuilder.DropIndex(
                name: "IX_MonthlyBudgets_Year_Month",
                table: "MonthlyBudgets");

            migrationBuilder.DropIndex(
                name: "IX_HabitLogs_HabitId_Date",
                table: "HabitLogs");

            migrationBuilder.DropIndex(
                name: "IX_Folders_ParentId_Name",
                table: "Folders");

            migrationBuilder.DropIndex(
                name: "IX_FileItems_FolderId_Name",
                table: "FileItems");

            migrationBuilder.DropIndex(
                name: "IX_DebtSnapshots_RecordedAt",
                table: "DebtSnapshots");

            migrationBuilder.DropIndex(
                name: "IX_AssetSnapshots_RecordedAt",
                table: "AssetSnapshots");

            migrationBuilder.CreateIndex(
                name: "IX_Notes_NotebookId",
                table: "Notes",
                column: "NotebookId");

            migrationBuilder.CreateIndex(
                name: "IX_HabitLogs_HabitId",
                table: "HabitLogs",
                column: "HabitId");

            migrationBuilder.CreateIndex(
                name: "IX_Folders_ParentId",
                table: "Folders",
                column: "ParentId");

            migrationBuilder.CreateIndex(
                name: "IX_FileItems_FolderId",
                table: "FileItems",
                column: "FolderId");
        }
    }
}
