import React, { useState, useEffect } from 'react';
import useBookStore from '../store/useBookStore';
import { Trash2, Plus } from 'lucide-react';

export default function PlanModal({ period, onClose }) {
  const { updatePlans } = useBookStore();
  const [plans, setPlans] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (period && period.plans) {
      setPlans(period.plans.map(p => ({ ...p })));
    }
  }, [period]);

  const handleSave = async () => {
    setIsSubmitting(true);
    await updatePlans(period.id, plans);
    setIsSubmitting(false);
    onClose();
  };

  const addPlan = () => {
    const lastPage = plans.length > 0 ? plans[plans.length - 1].endPage : 0;
    setPlans([...plans, { title: `Chapter ${plans.length + 1}`, startPage: lastPage + 1, endPage: lastPage + 20 }]);
  };

  const removePlan = (idx) => {
    setPlans(plans.filter((_, i) => i !== idx));
  };

  const updatePlan = (idx, field, value) => {
    const newPlans = [...plans];
    newPlans[idx][field] = value;
    setPlans(newPlans);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl mx-4 p-6 flex flex-col max-h-[90vh]">
        <h3 className="text-xl font-bold text-slate-800 mb-2">Reading Plan: {period.book.title}</h3>
        <p className="text-sm text-slate-500 mb-6">Plan your reading sessions by chapters or page ranges. Total pages: {period.book.totalPages}</p>
        
        <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-3">
          {plans.map((p, idx) => (
            <div key={idx} className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <input type="text" value={p.title} onChange={e => updatePlan(idx, 'title', e.target.value)} placeholder="Session/Chapter Name" className="flex-1 p-2 border rounded focus:ring focus:border-indigo-500 text-sm" />
              <input type="number" min="1" value={p.startPage} onChange={e => updatePlan(idx, 'startPage', parseInt(e.target.value) || 0)} placeholder="Start" className="w-20 p-2 border rounded focus:ring focus:border-indigo-500 text-sm" />
              <span className="text-slate-400">-</span>
              <input type="number" min="1" value={p.endPage} onChange={e => updatePlan(idx, 'endPage', parseInt(e.target.value) || 0)} placeholder="End" className="w-20 p-2 border rounded focus:ring focus:border-indigo-500 text-sm" />
              <button onClick={() => removePlan(idx)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition"><Trash2 className="w-4 h-4"/></button>
            </div>
          ))}
          {plans.length === 0 && <p className="text-sm text-slate-400 italic text-center py-4">No reading plan set. Add chapters to track progress.</p>}
          <button onClick={addPlan} className="mt-2 py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 flex items-center justify-center gap-2 font-medium transition text-sm">
            <Plus className="w-4 h-4"/> Add Session
          </button>
        </div>
        
        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded transition font-medium">Cancel</button>
          <button onClick={handleSave} disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition font-medium">
            {isSubmitting ? 'Saving...' : 'Save Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}
