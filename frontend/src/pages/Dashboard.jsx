import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function Dashboard() {
  const [content, setContent] = useState('');
  const [timeline, setTimeline] = useState([]);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadTimeline = async () => {
    try {
      const res = await fetch(`${API_URL}/timeline`);
      if (!res.ok) throw new Error('Failed to load timeline');
      const data = await res.json();
      setTimeline(data);
    } catch (e) {
      console.error(e);
      setError('Failed to load timeline. Please try again later.');
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTimeline();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/thoughts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      if (!res.ok) throw new Error('Failed to save thought');
      setContent('');
      loadTimeline();
    } catch (e) {
      console.error(e);
      setError('Failed to save thought. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto">
      <h2 className="text-3xl font-bold mb-6">Dashboard</h2>
      
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-sm text-slate-500 font-semibold uppercase">Balance</h3>
          <p className="text-2xl font-bold">$0.00</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-sm text-slate-500 font-semibold uppercase">Today's Goals</h3>
          <p className="text-slate-400 mt-2">No goals yet</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-sm text-slate-500 font-semibold uppercase">Habits</h3>
          <p className="text-slate-400 mt-2">No habits tracked</p>
        </div>
      </div>
      
      <div className="flex gap-8">
        <div className="flex-2 w-2/3 flex flex-col gap-6">
          {/* Thoughts Input */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold mb-4 text-slate-700">What's on your mind?</h3>
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <textarea 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="Write a thought..."
                rows="3"
                disabled={isSubmitting}
              />
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="self-end bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Capturing...' : 'Capture'}
              </button>
            </form>
          </div>
          
          {/* Timeline */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
             <h3 className="text-lg font-semibold mb-4 text-slate-700">Timeline</h3>
             <div className="flex flex-col gap-4">
               {timeline.length === 0 ? (
                 <p className="text-slate-500 italic">No timeline items yet.</p>
               ) : (
                 timeline.map(item => (
                   <div key={item.id} className="p-4 bg-slate-50 rounded border border-slate-100 flex flex-col gap-1">
                     <div className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()} &bull; {item.itemType}</div>
                     <div className="text-slate-800">{item.content}</div>
                   </div>
                 ))
               )}
             </div>
          </div>
        </div>
        <div className="w-1/3">
           <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
             <h3 className="text-lg font-semibold mb-4 text-slate-700">Recent Spending</h3>
             <p className="text-slate-500 italic">Coming soon</p>
           </div>
        </div>
      </div>
    </div>
  );
}
