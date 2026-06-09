export default function Dashboard() {
  return (
    <div className="flex-1 p-8 overflow-auto">
      <h1 className="text-3xl font-semibold mb-6">Dashboard</h1>
      
      {/* Top Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h2 className="text-slate-500 font-medium mb-2">Balance</h2>
          <div className="text-2xl font-semibold">$0.00</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h2 className="text-slate-500 font-medium mb-2">Today's Goals</h2>
          <div className="text-slate-400 text-sm">Feature pending...</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h2 className="text-slate-500 font-medium mb-2">Habits</h2>
          <div className="text-slate-400 text-sm">Feature pending...</div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-medium mb-4">Capture Thoughts</h2>
            <div className="text-slate-400 text-sm">Input coming in next task...</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-medium mb-4">Timeline</h2>
            <div className="text-slate-400 text-sm">Timeline coming in next task...</div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-medium mb-4">Recent Spending</h2>
            <div className="text-slate-400 text-sm">Quick add spending pending...</div>
          </div>
        </div>
      </div>
    </div>
  );
}
