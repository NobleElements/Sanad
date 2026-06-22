import React, { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import useSubscriptionStore from '../store/useSubscriptionStore';
import { formatBytes } from '../utils/formatUtils';
import usePageTitle from '../hooks/usePageTitle';
import { initializePaddle } from '@paddle/paddle-js';
import { API_URL } from '../config';

export default function Subscription() {
  usePageTitle('Subscription');
  const { tiers, storageData, loading, fetchSubscriptionData } = useSubscriptionStore();
  const { tierId, tierStartedAt, tierExpiresAt, paddleSubscriptionStatus, apiKey, rerollApiKey, changePassword, checkAuthStatus } = useAuthStore();
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [passwordStatus, setPasswordStatus] = useState({ type: '', msg: '' });
  const [history, setHistory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [paddleInstance, setPaddleInstance] = useState(null);
  const [paddleConfig, setPaddleConfig] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyTransactionId, setVerifyTransactionId] = useState('');
  const [verifyStatus, setVerifyStatus] = useState({ type: '', msg: '' });
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const initPaddle = async () => {
      try {
        const res = await fetch(`${API_URL}/storage/paddle-config`);
        if (res.ok) {
          const config = await res.json();
          setPaddleConfig(config);
          
          if (config.enabled && config.token) {
            let pendingTransactionId = null;

            const paddle = await initializePaddle({
              environment: config.environment,
              token: config.token,
              eventCallback: async (event) => {
                if (event.name === 'checkout.completed') {
                  pendingTransactionId = event.data?.transaction_id;
                } else if (event.name === 'checkout.closed') {
                  if (pendingTransactionId) {
                    try {
                      await fetch(`${API_URL}/subscription/verify-checkout`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${useAuthStore.getState().token}`
                        },
                        body: JSON.stringify({ transactionId: pendingTransactionId })
                      });
                    } catch (e) {
                      console.error('Verify checkout failed', e);
                    } finally {
                      pendingTransactionId = null;
                      fetchSubscriptionData();
                      checkAuthStatus();
                    }
                  }
                }
              }
            });
            setPaddleInstance(paddle);
          }
        }
      } catch (e) {
        console.error('Failed to init paddle', e);
      }
    };
    initPaddle();
  }, [fetchSubscriptionData]);

  useEffect(() => {
    const fetchHistoryAndTransactions = async () => {
      try {
        const res = await fetch(`${API_URL}/storage/history`);
        if (res.ok) setHistory(await res.json());

        const tRes = await fetch(`${API_URL}/subscription/transactions`);
        if (tRes.ok) setTransactions(await tRes.json());
      } catch (e) { console.error(e); }
    };
    fetchHistoryAndTransactions();
  }, []);

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

  const handleVerifySubscription = async () => {
    if (!verifyTransactionId.trim()) return;
    setIsVerifying(true);
    setVerifyStatus({ type: '', msg: '' });
    try {
      const res = await fetch(`${API_URL}/subscription/verify-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}`
        },
        body: JSON.stringify({ transactionId: verifyTransactionId.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setVerifyStatus({ type: 'success', msg: data.message || 'Verified successfully!' });
        fetchSubscriptionData();
        checkAuthStatus();
        setTimeout(() => {
          setIsVerifyModalOpen(false);
          setVerifyTransactionId('');
          setVerifyStatus({ type: '', msg: '' });
        }, 2000);
      } else {
        setVerifyStatus({ type: 'error', msg: data.message || 'Verification failed.' });
      }
    } catch (e) {
      setVerifyStatus({ type: 'error', msg: 'Network error occurred.' });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your auto-renewal? You will keep your tier until the current period expires.')) return;
    try {
      const res = await fetch(`${API_URL}/subscription/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${useAuthStore.getState().token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        checkAuthStatus();
      } else {
        alert(data.message || 'Failed to cancel.');
      }
    } catch (e) {
      alert('Network error.');
    }
  };

  const handleChangeTier = async (newTierId) => {
    if (!confirm('Are you sure you want to change your plan?')) return;
    try {
      const res = await fetch(`${API_URL}/subscription/change-tier`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}`
        },
        body: JSON.stringify({ tierId: newTierId })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        checkAuthStatus();
        fetchSubscriptionData();
      } else {
        alert(data.message || 'Failed to change tier.');
      }
    } catch (e) {
      alert('Network error.');
    }
  };

  if (loading) return <div className="p-8">Loading subscription data...</div>;

  const usagePercent = Math.min(100, (storageData.diskUsed / storageData.diskLimitBytes) * 100);

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-50 dark:bg-slate-900">
      <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">Subscription & Limits</h1>
      <p className="text-slate-600 dark:text-slate-400 dark:text-slate-500 mb-8">Manage your storage tier and limits.</p>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-xl p-6 mb-8 dark:text-slate-100">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">Storage Usage</h2>
        <div className="mb-2 flex justify-between text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">
          <span>{formatBytes(storageData.diskUsed)} used</span>
          <span>{formatBytes(storageData.diskLimitBytes)} total</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2.5 mb-4 overflow-hidden">
          <div 
            className={`h-2.5 rounded-full ${usagePercent > 90 ? 'bg-red-500' : 'bg-blue-600'}`} 
            style={{ width: `${usagePercent}%` }}
          ></div>
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between">
          <p>You are currently on the <span className="font-bold text-slate-700 dark:text-slate-300">{tiers.find(t => t.id === tierId)?.name || 'Unknown'}</span> tier.</p>
          <div className="mt-2 sm:mt-0 text-right flex flex-col items-end gap-2">
            <div>
              {tierStartedAt && <p>Started: {new Date(tierStartedAt).toLocaleDateString()}</p>}
              {tierExpiresAt && <p>Expires: <span className="font-medium text-slate-700 dark:text-slate-300">{new Date(tierExpiresAt).toLocaleDateString()}</span></p>}
            </div>
            {paddleSubscriptionStatus === 'active' && (
              <button 
                onClick={handleCancelSubscription}
                className="text-sm px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded transition-colors"
              >
                Cancel Subscription
              </button>
            )}
            {paddleSubscriptionStatus === 'canceled_pending' && (
              <span className="text-sm text-amber-600 bg-amber-50 px-2 py-1 rounded">Cancels at end of period</span>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-xl p-6 mb-8 dark:text-slate-100">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">Developer Access (MCP)</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500 mb-4">Use this API Key to authenticate your AI agents via the Model Context Protocol (MCP).</p>
        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-700 rounded-lg overflow-x-auto dark:text-slate-100">
          <code className="text-sm font-mono text-slate-800 dark:text-slate-200 select-all whitespace-nowrap flex-1">{apiKey || 'Not available'}</code>
          <button 
            onClick={() => setIsConfirmModalOpen(true)}
            className="px-3 py-1 text-sm bg-slate-800 text-slate-100 rounded hover:bg-slate-700 transition-colors whitespace-nowrap"
          >
            Reroll Key
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-xl p-6 mb-8 dark:text-slate-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Change Password</h2>
          <button 
            onClick={() => setShowChangePassword(!showChangePassword)}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            {showChangePassword ? 'Hide' : 'Change Password'}
          </button>
        </div>
        
        {showChangePassword && (
          <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Current Password</label>
              <input 
                type="password" 
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100" 
                value={passwordData.current}
                onChange={e => setPasswordData({...passwordData, current: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">New Password</label>
              <input 
                type="password" 
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100" 
                value={passwordData.new}
                onChange={e => setPasswordData({...passwordData, new: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Confirm New Password</label>
              <input 
                type="password" 
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100" 
                value={passwordData.confirm}
                onChange={e => setPasswordData({...passwordData, confirm: e.target.value})}
                required
              />
            </div>
            {passwordStatus.msg && (
              <div className={`p-3 rounded-lg text-sm ${passwordStatus.type === 'error' ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-green-50 text-green-600'}`}>
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
        )}
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300">Available Tiers</h2>
        <button 
          onClick={() => setIsVerifyModalOpen(true)}
          className="text-sm font-medium text-slate-600 dark:text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded px-3 py-1 bg-white dark:bg-slate-800"
        >
          Verify Missing Subscription
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tiers.map(tier => {
          const isCurrent = tier.id === tierId;
          const currentTierPrice = tiers.find(t => t.id === tierId)?.price || 0;
          const isUpgrade = tier.price > currentTierPrice;
          return (
            <div key={tier.id} className={`border rounded-2xl p-6 flex flex-col ${isCurrent ? 'border-blue-500 shadow-md bg-blue-50/30 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-300 transition-colors'}`}>
              <h3 className="font-bold text-xl mb-2 text-slate-800 dark:text-slate-200">{tier.name}</h3>
              <div className="flex flex-col mb-4">
                <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  ${tier.price > 0 ? tier.price * 12 : 0}
                  <span className="text-sm font-normal text-slate-500 dark:text-slate-400 dark:text-slate-500">{tier.price > 0 ? '/year' : '/forever'}</span>
                </div>
                {tier.price > 0 && (
                  <div className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">
                    ${tier.price}/month, billed annually
                  </div>
                )}
              </div>
              
              <ul className="space-y-3 mb-8 flex-1 text-slate-600 dark:text-slate-400 dark:text-slate-500">
                <li className="flex items-center">
                  <span className="text-blue-500 mr-2">✓</span>
                  {formatBytes(tier.diskLimitBytes)} Storage
                </li>
              </ul>
              
              <button 
                disabled={isCurrent || (tier.price > 0 && (!paddleInstance || !tier.paddlePriceId))}
                className={`w-full py-3 rounded-lg font-medium transition-colors ${
                  isCurrent 
                    ? 'bg-slate-200 text-slate-500 dark:text-slate-400 dark:text-slate-500 cursor-not-allowed' 
                    : (tier.price > 0 && (!paddleInstance || !tier.paddlePriceId)) 
                      ? 'bg-slate-300 text-white cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                }`}
                onClick={() => {
                  if (tier.price === 0) return; // Need backend API to explicitly downgrade to free
                  
                  if (paddleSubscriptionStatus === 'active' || paddleSubscriptionStatus === 'canceled_pending') {
                    handleChangeTier(tier.id);
                  } else {
                    if (paddleInstance && tier.paddlePriceId) {
                      paddleInstance.Checkout.open({
                        items: [{ priceId: tier.paddlePriceId, quantity: 1 }],
                        customData: { userId: useAuthStore.getState().id || '' }
                      });
                    }
                  }
                }}
              >
                {isCurrent ? 'Current Plan' : (tier.price > 0 && !tier.paddlePriceId ? 'Unavailable' : (isUpgrade ? 'Upgrade' : 'Downgrade'))}
              </button>
            </div>
          );
        })}
      </div>

      {history.length > 0 && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-xl p-6 mt-8 mb-8 dark:text-slate-100">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">Subscription History</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 font-medium">Tier Name</th>
                  <th className="px-4 py-3 font-medium">Started At</th>
                  <th className="px-4 py-3 font-medium">Ended At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((h, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 dark:hover:bg-slate-700/50 dark:bg-slate-900">
                    <td className="px-4 py-3 text-slate-800 dark:text-slate-200 font-medium">{h.tierName}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 dark:text-slate-500">{new Date(h.startedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 dark:text-slate-500">{h.endedAt ? new Date(h.endedAt).toLocaleDateString() : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {transactions.length > 0 && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-xl p-6 mb-8 dark:text-slate-100">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">Billing History</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Transaction ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((t, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 dark:hover:bg-slate-700/50 dark:bg-slate-900">
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 dark:text-slate-500">{new Date(t.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-slate-800 dark:text-slate-200 font-medium">
                      {t.details?.totals?.total ? (parseInt(t.details.totals.total) / 100).toFixed(2) : '0.00'} {t.details?.totals?.currency_code}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 dark:text-slate-500 capitalize">{t.status.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 dark:text-slate-500 font-mono text-xs">{t.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isConfirmModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:bg-slate-700 dark:text-slate-100">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold">
                <AlertTriangle className="w-5 h-5" />
                Warning
              </div>
              <button onClick={() => setIsConfirmModalOpen(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:text-slate-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 text-slate-600 dark:text-slate-400 dark:text-slate-500">
              Are you sure you want to reroll your API Key? <br /><br />
              All existing AI agents using the current key will lose access immediately until you update their configuration with the new key.
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 flex justify-end gap-3 dark:text-slate-100">
              <button 
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 font-medium text-slate-600 dark:text-slate-400 dark:text-slate-500 hover:bg-slate-200 rounded-lg transition-colors"
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

      {isVerifyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:bg-slate-700 dark:text-slate-100">
              <div className="font-semibold text-slate-800 dark:text-slate-200">Verify Subscription</div>
              <button onClick={() => setIsVerifyModalOpen(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:text-slate-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500 mb-4">
                If you recently paid for a subscription but your tier was not updated, please enter your Transaction ID here to verify it.
              </p>
              <input
                type="text"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2 dark:bg-slate-700 dark:text-slate-100"
                placeholder="txn_..."
                value={verifyTransactionId}
                onChange={e => setVerifyTransactionId(e.target.value)}
              />
              {verifyStatus.msg && (
                <div className={`p-3 rounded-lg text-sm mt-2 ${verifyStatus.type === 'error' ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-green-50 text-green-600'}`}>
                  {verifyStatus.msg}
                </div>
              )}
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 flex justify-end gap-3 dark:text-slate-100">
              <button 
                onClick={() => setIsVerifyModalOpen(false)}
                className="px-4 py-2 font-medium text-slate-600 dark:text-slate-400 dark:text-slate-500 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleVerifySubscription}
                disabled={isVerifying || !verifyTransactionId.trim()}
                className="px-4 py-2 font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {isVerifying ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
