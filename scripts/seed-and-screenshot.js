const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:5000/api';
const FRONTEND_URL = 'http://localhost:5173';

async function seedData() {
  const username = `demo_${Date.now()}`;
  const password = 'Password123!';

  console.log(`Seeding data for user: ${username}`);

  // 1. Create User
  const signupRes = await fetch(`${API_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (!signupRes.ok) {
    throw new Error(`Signup failed: ${await signupRes.text()}`);
  }

  const { apiKey } = await signupRes.json();
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey
  };

  // 2. Create Tasks
  const tasks = [
    { title: 'Design new Landing Page UI', content: 'Create a stunning, modern dark mode landing page using TailwindCSS and framer-motion.', status: 2, tags: 'UI, Design', project: 'Sanad V2', estimatedMinutes: 240 },
    { title: 'Review Pull Request #142', content: 'The authentication flow has some edge cases we need to address before merging.', status: 1, tags: 'Review, Code', project: 'Core' },
    { title: 'Fix memory leak in background worker', content: 'Look into the memory profile from production. It seems the file watcher is not releasing handles.', status: 0, tags: 'Bug, High Priority', project: 'Core', estimatedMinutes: 120 },
    { title: 'Write Q3 Performance Review', content: 'Prepare the self-evaluation document for the upcoming performance cycle.', status: 0, tags: 'Personal', estimatedMinutes: 60 },
    { title: 'Deploy to Production', content: 'Run the migration scripts and deploy the V2 release.', status: 1, tags: 'DevOps', project: 'Sanad V2' },
    { title: 'Renew AWS SSL Certificates', content: 'The certificates for the main domain expire next week.', status: 0, tags: 'DevOps, Security' },
    { title: 'Prepare slides for team meeting', content: 'Update the roadmap and highlight Q3 achievements.', status: 2, tags: 'Management' },
  ];

  for (const t of tasks) {
    await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers,
      body: JSON.stringify(t)
    });
  }

  // 3. Create Thoughts
  const thoughts = [
    { content: 'The new landing page is looking great! I should try adding some subtle gradient animations to the hero section.' },
    { content: 'Remember to check the disk space usage on the server soon. We might need to upgrade the EBS volume before the end of the month.' },
    { content: 'Idea for next feature: Kanban board for tasks with drag-and-drop support. Oh wait, we already built that!' },
    { content: 'Need to research the best way to handle large file uploads in Node.js without blocking the event loop.' },
  ];

  for (const th of thoughts) {
    await fetch(`${API_URL}/thoughts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(th)
    });
  }

  // 4. Create Finance Transactions
  const dateStr = new Date().toISOString();
  const txs = [
    { amount: 120.50, type: 'expense', category: 'Utilities', date: dateStr, description: 'Electricity Bill' },
    { amount: 15.99, type: 'expense', category: 'Subscriptions', date: dateStr, description: 'Netflix' },
    { amount: 10.00, type: 'expense', category: 'Subscriptions', date: dateStr, description: 'GitHub Copilot' },
    { amount: 245.30, type: 'expense', category: 'Food', date: dateStr, description: 'Groceries at Whole Foods' },
    { amount: 35.00, type: 'expense', category: 'Transportation', date: dateStr, description: 'Uber to Airport' },
    { amount: 65.00, type: 'expense', category: 'Food', date: dateStr, description: 'Dinner with team' },
    { amount: 49.99, type: 'expense', category: 'Utilities', date: dateStr, description: 'Internet Bill' },
  ];

  for (const tx of txs) {
    await fetch(`${API_URL}/finance/transactions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(tx)
    });
  }

  // 5. Create Notebook
  const note1 = {
    title: 'Project Architecture Notes',
    content: '<h1>System Architecture</h1><p>The system is split into a frontend using <strong>React</strong> and <strong>Vite</strong>, and a backend using <strong>ASP.NET Core</strong>.</p><h2>Database</h2><p>We are using SQLite for simplicity and portability, with Entity Framework Core for data access.</p>',
  };
  const note2 = {
    title: 'Meeting Notes - June 14',
    content: '<h1>Weekly Sync</h1><ul><li>Discussed the new landing page.</li><li>Decided to focus on UI polish and animations.</li><li>Need to ensure all components are responsive.</li></ul>',
  };
  
  await fetch(`${API_URL}/notebook`, { method: 'POST', headers, body: JSON.stringify(note1) });
  await fetch(`${API_URL}/notebook`, { method: 'POST', headers, body: JSON.stringify(note2) });

  // 6. Create Habits
  const habits = [
    { name: 'Read 20 pages', icon: '📚', frequency: 'daily' },
    { name: 'Workout', icon: '🏋️‍♂️', frequency: 'daily' },
    { name: 'Meditate', icon: '🧘‍♂️', frequency: 'daily' },
  ];
  
  for (const h of habits) {
    const res = await fetch(`${API_URL}/habits`, { method: 'POST', headers, body: JSON.stringify(h) });
    if (res.ok) {
        const habit = await res.json();
        // Toggle some past days
        for(let i=0; i<3; i++) {
           const d = new Date();
           d.setDate(d.getDate() - i);
           await fetch(`${API_URL}/habits/${habit.id}/toggle`, { method: 'POST', headers, body: JSON.stringify({ date: d.toISOString() }) });
        }
    }
  }

  console.log('Seed data created successfully!');
  return { username, password };
}

async function takeScreenshots(credentials) {
  console.log('Starting Playwright...');
  
  // Create screenshots directory if not exists
  const screenshotsDir = path.join(__dirname, '..', 'frontend', 'public', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  
  const page = await context.newPage();

  console.log(`Navigating to ${FRONTEND_URL}`);
  await page.goto(FRONTEND_URL);

  // Login
  console.log('Logging in...');
  await page.goto(`${FRONTEND_URL}/login`);
  await page.waitForTimeout(1000);
  await page.fill('input[type="text"]', credentials.username);
  await page.fill('input[type="password"]', credentials.password);
  await page.click('button[type="submit"]');

  // Wait for Dashboard to load
  await page.waitForURL('**/dashboard*');
  await page.waitForTimeout(3000); // Allow data to fetch and render

  console.log('Taking screenshot of Dashboard...');
  await page.screenshot({ path: path.join(screenshotsDir, 'dashboard.png') });

  // Tasks
  console.log('Navigating to Tasks...');
  await page.goto(`${FRONTEND_URL}/tasks`);
  await page.waitForTimeout(3000); // Longer wait for the Kanban board to render
  await page.screenshot({ path: path.join(screenshotsDir, 'tasks.png') });
  
  // Habits
  console.log('Navigating to Habits...');
  await page.goto(`${FRONTEND_URL}/habits`);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(screenshotsDir, 'habits.png') });

  // Thoughts
  console.log('Navigating to Thoughts...');
  await page.goto(`${FRONTEND_URL}/thoughts`);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(screenshotsDir, 'thoughts.png') });

  // Finance
  console.log('Navigating to Finance...');
  await page.goto(`${FRONTEND_URL}/finance`);
  await page.waitForTimeout(2500); // Wait for charts to animate
  await page.screenshot({ path: path.join(screenshotsDir, 'finance.png') });

  // Files
  console.log('Navigating to Files...');
  await page.goto(`${FRONTEND_URL}/files`);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(screenshotsDir, 'files.png') });

  await browser.close();
  console.log('Screenshots generated successfully!');
}

async function run() {
  try {
    const creds = await seedData();
    await takeScreenshots(creds);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
