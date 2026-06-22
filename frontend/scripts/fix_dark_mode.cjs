const fs = require('fs');
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles) {
  files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.jsx')) {
        arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  });
  return arrayOfFiles;
}

const basePath = path.join(__dirname, '..', 'src');
const allJsxFiles = getAllFiles(basePath);

const excludeList = [
  'TaskModal.jsx',
  'Tasks.jsx',
  'FileManager',
  'FilePreview.jsx',
  'FileUploader.jsx',
  'TransferProgress.jsx',
  'VideoPlayer.jsx',
  'TipTapEditor.jsx',
  'Notebook.jsx'
];

const filesToProcess = allJsxFiles.filter(file => {
  return !excludeList.some(excluded => file.includes(excluded));
});

const replacements = [
  // Fix the border typos
  { pattern: /\bborder-slate-200\b(?!\s+dark:border-)/g, replacement: 'border-slate-200 dark:border-slate-700' },
  { pattern: /\bborder-slate-300\b(?!\s+dark:border-)/g, replacement: 'border-slate-300 dark:border-slate-600' },
  
  // Also add dark mode to inputs, textareas, selects that have standard border styling
  { pattern: /className="([^"]*\bborder\b[^"]*)"/g, replacement: (match, p1) => {
      let newClass = p1;
      // If it's an input-like element and lacks dark bg/text
      if (newClass.includes('focus:ring') || newClass.includes('p-') || newClass.includes('px-')) {
          if (!newClass.includes('dark:bg-') && !newClass.includes('bg-transparent')) {
              newClass += ' dark:bg-slate-700';
          }
          if (!newClass.includes('dark:text-')) {
              newClass += ' dark:text-slate-100';
          }
      }
      return `className="${newClass}"`;
  }},

  // Add global text color to root app layout in App.jsx
  { pattern: /className="flex h-screen w-full bg-slate-50 dark:bg-slate-900 font-sans overflow-hidden"/g, replacement: 'className="flex h-screen w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans overflow-hidden"' }
];

filesToProcess.forEach(filePath => {
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
});
