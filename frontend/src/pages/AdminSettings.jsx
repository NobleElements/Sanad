import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import usePageTitle from '../hooks/usePageTitle';

export default function AdminSettings() {
  usePageTitle('Admin Settings');
  
  const [settings, setSettings] = useState({
    isPaddleEnabled: false,
    enableNewSubscriptions: false,
    paddleEnvironment: 'sandbox',
    paddleApiKey: '',
    paddleClientToken: '',
    paddleWebhookSecret: '',
    contactEmail: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [verifyStatus, setVerifyStatus] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/settings`);
      if (res.ok) {
        const data = await res.json();
        setSettings({
          isPaddleEnabled: data.isPaddleEnabled || false,
          enableNewSubscriptions: data.enableNewSubscriptions || false,
          paddleEnvironment: data.paddleEnvironment || 'sandbox',
          paddleApiKey: data.paddleApiKey || '',
          paddleClientToken: data.paddleClientToken || '',
          paddleWebhookSecret: data.paddleWebhookSecret || '',
          contactEmail: data.contactEmail || ''
        });
      }
    } catch (e) {
      setError('Failed to load settings.');
    }
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const res = await fetch(`${API_URL}/admin/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setMessage('Settings saved successfully.');
      } else {
        const text = await res.text();
        setError(`Failed to save: ${text}`);
      }
    } catch (err) {
      setError('Failed to save settings.');
    }
    setSaving(false);
  };

  const handleVerify = async () => {
    setVerifyStatus('Verifying...');
    try {
      const res = await fetch(`${API_URL}/admin/settings/verify-paddle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          environment: settings.paddleEnvironment,
          apiKey: settings.paddleApiKey
        })
      });
      if (res.ok) {
        setVerifyStatus('Success! API Key is valid.');
      } else {
        const text = await res.text();
        setVerifyStatus(`Failed: ${text}`);
      }
    } catch (err) {
      setVerifyStatus('Failed to connect to backend.');
    }
  };

  if (loading) return <div className="p-8">Loading settings...</div>;

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-50 dark:bg-slate-900">
      <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-8">Admin Settings</h1>
      
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700 max-w-2xl dark:text-slate-100">
        {message && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">{message}</div>}
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}

        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <h2 className="text-xl font-bold mb-4">General Settings</h2>
            <div className="mb-4">
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Contact Email Address</label>
              <input 
                type="email"
                value={settings.contactEmail}
                onChange={(e) => setSettings({...settings, contactEmail: e.target.value})}
                className="w-full border rounded-md px-3 py-2 dark:bg-slate-700 dark:text-slate-100"
                placeholder="e.g. support@yourdomain.com"
              />
              <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">This email will be used for the 'Contact Us' form on the landing page.</p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold mb-4">Paddle Integration</h2>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input 
                  type="checkbox" 
                  id="isPaddleEnabled"
                  checked={settings.isPaddleEnabled}
                  onChange={(e) => setSettings({...settings, isPaddleEnabled: e.target.checked})}
                  className="w-4 h-4"
                />
                <label htmlFor="isPaddleEnabled" className="font-medium text-slate-700 dark:text-slate-300">Enable Paddle Integration</label>
              </div>

              <div className="flex items-center space-x-3">
                <input 
                  type="checkbox" 
                  id="enableNewSubscriptions"
                  checked={settings.enableNewSubscriptions}
                  onChange={(e) => setSettings({...settings, enableNewSubscriptions: e.target.checked})}
                  className="w-4 h-4"
                />
                <label htmlFor="enableNewSubscriptions" className="font-medium text-slate-700 dark:text-slate-300">Enable New Subscriptions</label>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Paddle Base URL</label>
                <select 
                  value={settings.paddleEnvironment}
                  onChange={(e) => setSettings({...settings, paddleEnvironment: e.target.value})}
                  className="w-full border rounded-md px-3 py-2 dark:bg-slate-700 dark:text-slate-100"
                >
                  <option value="sandbox">Sandbox (https://sandbox-api.paddle.com)</option>
                  <option value="production">Live (https://api.paddle.com)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Paddle API Key (Backend)</label>
                <input 
                  type="password"
                  value={settings.paddleApiKey}
                  onChange={(e) => setSettings({...settings, paddleApiKey: e.target.value})}
                  className="w-full border rounded-md px-3 py-2 dark:bg-slate-700 dark:text-slate-100"
                  placeholder="e.g. 5d..."
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Paddle Client Token (Frontend)</label>
                <input 
                  type="text"
                  value={settings.paddleClientToken}
                  onChange={(e) => setSettings({...settings, paddleClientToken: e.target.value})}
                  className="w-full border rounded-md px-3 py-2 dark:bg-slate-700 dark:text-slate-100"
                  placeholder="e.g. live_..."
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Paddle Webhook Secret</label>
                <input 
                  type="password"
                  value={settings.paddleWebhookSecret}
                  onChange={(e) => setSettings({...settings, paddleWebhookSecret: e.target.value})}
                  className="w-full border rounded-md px-3 py-2 dark:bg-slate-700 dark:text-slate-100"
                  placeholder="e.g. whsec_..."
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center space-x-4">
            <button 
              type="submit" 
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            
            <button 
              type="button" 
              onClick={handleVerify}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900"
            >
              Verify API Access
            </button>
            
            {verifyStatus && (
              <span className={`text-sm ${verifyStatus.includes('Success') ? 'text-green-600' : 'text-red-600 dark:text-red-400'}`}>
                {verifyStatus}
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
