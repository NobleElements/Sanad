import { API_URL } from '../config';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { ERROR_CODES } from '../constants/errorCodes';

export default function MaintenancePage() {
  const [checking, setChecking] = useState(false);

  const onResolved = () => {
    window.location.href = '/dashboard';
  }
  const handleCheck = async () => {
    setChecking(true);
    try {
      // Just ping the auth status endpoint
      const res = await fetch(`${API_URL}/auth/status`);
      if (res.ok) {
        onResolved();
      } else if (res.status === 503) {
        const data = await res.json();
        if (data.error !== ERROR_CODES.ACCOUNT_MIGRATING) {
          onResolved(); // Not migrating anymore?
        }
      }
    } catch (e) {
      // ignore
    }
    setChecking(false);
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center border border-slate-100">
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-indigo-600 animate-spin-slow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-4">Account Maintenance</h1>
        <p className="text-slate-600 mb-8 leading-relaxed">
          We are currently moving your account to a new datastore. This process usually takes a few minutes. Your data is perfectly safe.
        </p>
        <button 
          onClick={handleCheck}
          disabled={checking}
          className="w-full flex justify-center items-center gap-2 bg-indigo-600 text-white font-medium py-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-70"
        >
          {checking && <Loader2 className="w-5 h-5 animate-spin" />}
          {checking ? "Checking..." : "I've waited, refresh now"}
        </button>
      </div>
    </div>
  );
}
