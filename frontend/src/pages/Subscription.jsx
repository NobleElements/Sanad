import React, { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import useSubscriptionStore from '../store/useSubscriptionStore';
import { formatBytes } from '../utils/formatUtils';
import usePageTitle from '../hooks/usePageTitle';

export default function Subscription() {
  usePageTitle('Subscription');
  const { tiers, storageData, loading, fetchSubscriptionData } = useSubscriptionStore();
  const { tierId, apiKey, rerollApiKey, changePassword } = useAuthStore();
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [passwordStatus, setPasswordStatus] = useState({ type: '', msg: '' });

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordStatus({ type: '', msg: '' });
    if (passwordData.new !== passwordData.confirm) {
      return setPasswordStatus({ type: 'error', msg: 'New passwords do not match' });
    }
    if (passwordData.new.length < 6) {
      return setPasswordStatus({ type: 'error', msg: 'New password must be at least 6 characters' });
    }
    const res = await changePassword(passwordData.current, passwordData.new);
    if (res.success) {
      setPasswordStatus({ type: 'success', msg: 'Password changed successfully' });
      setPasswordData({ current: '', new: '', confirm: '' });
    } else {
      setPasswordStatus({ type: 'error', msg: res.error });
    }
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, [fetchSubscriptionData]);

  if (loading) return <div className="p-8">Loading subscription data...</div>;

  const usagePercent = Math.min(100, (storageData.diskUsed / storageData.diskLimitBytes) * 100);

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-50">
      <h1 className="text-3xl font-bold text-slate-800 mb-2">Subscription & Limits</h1>
      <p className="text-slate-600 mb-8">Manage your storage tier and limits.</p>

      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 mb-8">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Storage Usage</h2>
        <div className="mb-2 flex justify-between text-sm text-slate-600">
          <span>{formatBytes(storageData.diskUsed)} used</span>
          <span>{formatBytes(storageData.diskLimitBytes)} total</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2.5 mb-4 overflow-hidden">
          <div 
            className={`h-2.5 rounded-full ${usagePercent > 90 ? 'bg-red-500' : 'bg-blue-600'}`} 
            style={{ width: `${usagePercent}%` }}
          ></div>
        </div>
        <p className="text-sm text-slate-500">
          You are currently on the <span className="font-bold text-slate-700">{tiers.find(t => t.id === tierId)?.name || 'Unknown'}</span> tier.
        </p>
      </div>

      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 mb-8">
        <h2 className="text-xl font-semibold text-slate-800 mb-2">Developer Access (MCP)</h2>
        <p className="text-sm text-slate-600 mb-4">Use this API Key to authenticate your AI agents via the Model Context Protocol (MCP).</p>
        <div className="flex items-center gap-4 bg-slate-50 p-3 border border-slate-200 rounded-lg overflow-x-auto">
          <code className="text-sm font-mono text-slate-800 select-all whitespace-nowrap flex-1">{apiKey || 'Not available'}</code>
          <button 
            onClick={() => setIsConfirmModalOpen(true)}
            className="px-3 py-1 text-sm bg-slate-800 text-slate-100 rounded hover:bg-slate-700 transition-colors whitespace-nowrap"
          >
            Reroll Key
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 mb-8">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Change Password</h2>
        <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
            <input 
              type="password" 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
              value={passwordData.current}
              onChange={e => setPasswordData({...passwordData, current: e.target.value})}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
            <input 
              type="password" 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
              value={passwordData.new}
              onChange={e => setPasswordData({...passwordData, new: e.target.value})}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
            <input 
              type="password" 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
              value={passwordData.confirm}
              onChange={e => setPasswordData({...passwordData, confirm: e.target.value})}
              required
            />
          </div>
          {passwordStatus.msg && (
            <div className={`p-3 rounded-lg text-sm ${passwordStatus.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
              {passwordStatus.msg}
            </div>
          )}
          <button 
            type="submit"
            className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            Update Password
          </button>
        </form>
      </div>

      <h2 className="text-xl font-semibold mb-4 text-slate-700">Available Tiers</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tiers.map(tier => {
          const isCurrent = tier.id === tierId;
          return (
            <div key={tier.id} className={`border rounded-2xl p-6 flex flex-col ${isCurrent ? 'border-blue-500 shadow-md bg-blue-50/30' : 'border-slate-200 bg-white hover:border-blue-300 transition-colors'}`}>
              <h3 className="font-bold text-xl mb-2 text-slate-800">{tier.name}</h3>
              <div className="text-3xl font-bold text-slate-900 mb-4">${tier.price}<span className="text-sm font-normal text-slate-500">/mo</span></div>
              
              <ul className="space-y-3 mb-8 flex-1 text-slate-600">
                <li className="flex items-center">
                  <span className="text-blue-500 mr-2">✓</span>
                  {formatBytes(tier.diskLimitBytes)} Storage
                </li>
              </ul>
              
              <button 
                disabled={isCurrent}
                className={`w-full py-3 rounded-lg font-medium transition-colors ${
                  isCurrent 
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                }`}
                onClick={() => alert('Payment integration would go here!')}
              >
                {isCurrent ? 'Current Plan' : 'Upgrade'}
              </button>
            </div>
          );
        })}
      </div>

      {isConfirmModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-red-600 font-semibold">
                <AlertTriangle className="w-5 h-5" />
                Warning
              </div>
              <button onClick={() => setIsConfirmModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 text-slate-600">
              Are you sure you want to reroll your API Key? <br /><br />
              All existing AI agents using the current key will lose access immediately until you update their configuration with the new key.
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  await rerollApiKey();
                  setIsConfirmModalOpen(false);
                }}
                className="px-4 py-2 font-medium bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors shadow-sm"
              >
                Yes, Reroll Key
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
