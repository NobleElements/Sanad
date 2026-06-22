import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import usePageTitle from '../hooks/usePageTitle';

export default function LegalPageLayout({ title, lastUpdated, children }) {
  usePageTitle(title);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 font-sans selection:bg-blue-200 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link 
          to="/" 
          className="inline-flex items-center text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
        
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 sm:p-12 dark:text-slate-100">
          <header className="mb-10 border-b border-gray-100 dark:border-gray-700 pb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-4">
              {title}
            </h1>
            {lastUpdated && (
              <p className="text-gray-500 dark:text-gray-400">
                Last updated: {lastUpdated}
              </p>
            )}
          </header>
          
          <div className="text-gray-700 dark:text-gray-300 leading-relaxed space-y-6 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-gray-900 [&>h2]:dark:text-white [&>h2]:mt-10 [&>h2]:mb-4 [&>p]:mb-4 [&>ul]:list-disc [&>ul]:pl-6 [&>ul>li]:mb-2 [&>a]:text-blue-600 [&>a]:dark:text-blue-400 hover:[&>a]:text-blue-500">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
