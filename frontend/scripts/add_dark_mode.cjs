const fs = require('fs');
const path = require('path');

const files = [
  'src/App.jsx',
  'src/pages/Dashboard.jsx',
  'src/pages/Thoughts.jsx',
  'src/pages/Habits.jsx',
  'src/pages/FinanceDashboard.jsx',
  'src/pages/Books.jsx',
  'src/pages/Subscription.jsx',
  'src/pages/AdminDashboard.jsx',
  'src/components/Sidebar.jsx'
];

const basePath = path.join(__dirname, '..');

const replacements = [
  { pattern: /\bbg-slate-50\b(?!\s+dark:bg-)/g, replacement: 'bg-slate-50 dark:bg-slate-900' },
  { pattern: /\bbg-white\b(?!\s+dark:bg-)/g, replacement: 'bg-white dark:bg-slate-800' },
  { pattern: /\btext-slate-900\b(?!\s+dark:text-)/g, replacement: 'text-slate-900 dark:text-slate-100' },
  { pattern: /\btext-slate-800\b(?!\s+dark:text-)/g, replacement: 'text-slate-800 dark:text-slate-200' },
  { pattern: /\btext-slate-700\b(?!\s+dark:text-)/g, replacement: 'text-slate-700 dark:text-slate-300' },
  { pattern: /\btext-slate-600\b(?!\s+dark:text-)/g, replacement: 'text-slate-600 dark:text-slate-400' },
  { pattern: /\btext-slate-500\b(?!\s+dark:text-)/g, replacement: 'text-slate-500 dark:text-slate-400' },
  { pattern: /\border-slate-200\b(?!\s+dark:border-)/g, replacement: 'border-slate-200 dark:border-slate-700' },
  { pattern: /\border-slate-300\b(?!\s+dark:border-)/g, replacement: 'border-slate-300 dark:border-slate-600' },
  { pattern: /\bhover:bg-slate-50\b(?!\s+dark:hover:bg-)/g, replacement: 'hover:bg-slate-50 dark:hover:bg-slate-700/50' },
  { pattern: /\bhover:bg-slate-100\b(?!\s+dark:hover:bg-)/g, replacement: 'hover:bg-slate-100 dark:hover:bg-slate-700' },
  { pattern: /\bhover:text-slate-900\b(?!\s+dark:hover:text-)/g, replacement: 'hover:text-slate-900 dark:hover:text-white' },
  { pattern: /\bhover:text-indigo-600\b(?!\s+dark:hover:text-)/g, replacement: 'hover:text-indigo-600 dark:hover:text-indigo-400' },
  { pattern: /\btext-indigo-600\b(?!\s+dark:text-)/g, replacement: 'text-indigo-600 dark:text-indigo-400' },
  { pattern: /\bbg-indigo-50\b(?!\s+dark:bg-)/g, replacement: 'bg-indigo-50 dark:bg-indigo-500/10' },
  { pattern: /\bbg-indigo-100\b(?!\s+dark:bg-)/g, replacement: 'bg-indigo-100 dark:bg-indigo-500/20' },
  { pattern: /\bbg-indigo-600\b(?!\s+dark:bg-)/g, replacement: 'bg-indigo-600 dark:bg-indigo-500' },
  { pattern: /\bhover:bg-indigo-700\b(?!\s+dark:hover:bg-)/g, replacement: 'hover:bg-indigo-700 dark:hover:bg-indigo-600' },
  { pattern: /\bbg-emerald-50\b(?!\s+dark:bg-)/g, replacement: 'bg-emerald-50 dark:bg-emerald-500/10' },
  { pattern: /\btext-emerald-600\b(?!\s+dark:text-)/g, replacement: 'text-emerald-600 dark:text-emerald-400' },
  { pattern: /\btext-red-500\b(?!\s+dark:text-)/g, replacement: 'text-red-500 dark:text-red-400' },
  { pattern: /\btext-red-600\b(?!\s+dark:text-)/g, replacement: 'text-red-600 dark:text-red-400' },
  { pattern: /\bbg-red-50\b(?!\s+dark:bg-)/g, replacement: 'bg-red-50 dark:bg-red-500/10' },
];

files.forEach(file => {
  const filePath = path.join(basePath, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    replacements.forEach(({ pattern, replacement }) => {
      content = content.replace(pattern, replacement);
    });

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${file}`);
    } else {
      console.log(`No changes needed for ${file}`);
    }
  } else {
    console.log(`File not found: ${file}`);
  }
});
