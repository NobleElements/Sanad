import React, { useState } from 'react';
import useAuthStore from '../store/useAuthStore';

import { API_BASE } from '../config';

export default function AuthOverlay({ mode, onAuthenticated }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const isSetup = mode === 'setup';
    const title = isSetup ? 'Welcome to Sanad' : 'Welcome Back';
    const subtitle = isSetup 
        ? 'Please create an account to secure your personal organizer.'
        : 'Please log in to continue.';
    const buttonText = isSetup ? 'Create Account' : 'Log In';

    const login = useAuthStore((state) => state.login);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await login(username, password, isSetup);
        if (result.success) {
            onAuthenticated(username);
        } else {
            setError(result.error);
        }
        
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm">
            <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-2xl dark:bg-gray-800">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{title}</h2>
                    <p className="text-gray-600 dark:text-gray-400">{subtitle}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Username
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors"
                            placeholder="Enter your username"
                            required
                            autoFocus
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors"
                            placeholder="Enter your password"
                            required
                        />
                    </div>

                    {error && (
                        <div className="p-3 text-sm text-red-600 bg-red-100 rounded-lg dark:bg-red-900/30 dark:text-red-400">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Processing...' : buttonText}
                    </button>
                </form>
            </div>
        </div>
    );
}
