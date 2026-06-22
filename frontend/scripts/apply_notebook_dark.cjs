const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'pages', 'Notebook.jsx');

const replacements = [
  { pattern: /\bbg-white\b(?!\s+dark:bg-)/g, replacement: 'bg-white dark:bg-slate-800' },
  { pattern: /\bbg-slate-50\b(?!\s+dark:bg-)/g, replacement: 'bg-slate-50 dark:bg-slate-900' },
  { pattern: /\btext-slate-900\b(?!\s+dark:text-)/g, replacement: 'text-slate-900 dark:text-slate-100' },
  { pattern: /\btext-slate-800\b(?!\s+dark:text-)/g, replacement: 'text-slate-800 dark:text-slate-200' },
  { pattern: /\btext-slate-700\b(?!\s+dark:text-)/g, replacement: 'text-slate-700 dark:text-slate-300' },
  { pattern: /\btext-slate-600\b(?!\s+dark:text-)/g, replacement: 'text-slate-600 dark:text-slate-400' },
  { pattern: /\btext-slate-500\b(?!\s+dark:text-)/g, replacement: 'text-slate-500 dark:text-slate-400' },
  { pattern: /\btext-slate-400\b(?!\s+dark:text-)/g, replacement: 'text-slate-400 dark:text-slate-500' },
  { pattern: /\bborder-slate-200\b(?!\s+dark:border-)/g, replacement: 'border-slate-200 dark:border-slate-700' },
  { pattern: /\bborder-slate-300\b(?!\s+dark:border-)/g, replacement: 'border-slate-300 dark:border-slate-600' },
  { pattern: /\bhover:bg-slate-50\b(?!\s+dark:hover:bg-)/g, replacement: 'hover:bg-slate-50 dark:hover:bg-slate-700/50' },
  { pattern: /\bhover:bg-slate-100\b(?!\s+dark:hover:bg-)/g, replacement: 'hover:bg-slate-100 dark:hover:bg-slate-700' },
  { pattern: /\bhover:text-slate-900\b(?!\s+dark:hover:text-)/g, replacement: 'hover:text-slate-900 dark:hover:text-white' },
  { pattern: /\bhover:text-indigo-600\b(?!\s+dark:hover:text-)/g, replacement: 'hover:text-indigo-600 dark:hover:text-indigo-400' },
  { pattern: /\btext-indigo-600\b(?!\s+dark:text-)/g, replacement: 'text-indigo-600 dark:text-indigo-400' },
  { pattern: /\bbg-indigo-50\b(?!\s+dark:bg-)/g, replacement: 'bg-indigo-50 dark:bg-indigo-500/10' },
  // Apply input backgrounds
  { pattern: /className="([^"]*\bborder\b[^"]*)"/g, replacement: (match, p1) => {
      let newClass = p1;
      if (newClass.includes('focus:ring') || newClass.includes('p-') || newClass.includes('px-')) {
          if (!newClass.includes('dark:bg-') && !newClass.includes('bg-transparent')) {
              newClass += ' dark:bg-slate-700';
          }
          if (!newClass.includes('dark:text-')) {
              newClass += ' dark:text-slate-100';
          }
      }
      return `className="${newClass}"`;
  }}
];

if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  replacements.forEach(({ pattern, replacement }) => {
    if (typeof replacement === 'function') {
      content = content.replace(pattern, replacement);
    } else {
      content = content.replace(pattern, replacement);
    }
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}
