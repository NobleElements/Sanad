import React from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, BrainCircuit, Wallet, BookOpen, HardDrive, ArrowRight, Code } from 'lucide-react';

const FeatureCard = ({ icon: Icon, title, description }) => (
  <div className="flex flex-col items-start p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg mb-4">
      <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
    </div>
    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{description}</p>
  </div>
);

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 font-sans selection:bg-blue-200">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-8 h-8 text-blue-600 dark:text-blue-500" />
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                Sanad
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link 
                to="/login" 
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium px-3 py-2 transition-colors"
              >
                Log In
              </Link>
              <Link 
                to="/login" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')] opacity-20 mix-blend-overlay"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-8">
            Your personal workspace, <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
              all in one place.
            </span>
          </h1>
          <p className="mt-4 text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            Sanad is the ultimate self-hosted companion to organize your tasks, manage your finances, capture your thoughts, and securely store your files.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link 
              to="/login" 
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all"
            >
              Start for free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* App Preview Carousel/Hero Image */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 relative">
        <div className="rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800">
          <img 
            src="/screenshots/dashboard.png" 
            alt="Sanad Dashboard Preview" 
            className="w-full h-auto object-cover"
            onError={(e) => { e.target.src = 'https://placehold.co/1920x1080/1e293b/ffffff?text=Dashboard+Screenshot+Pending' }}
          />
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white dark:bg-gray-900 py-24 border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Everything you need to stay productive</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">Replace multiple apps with one powerful, unified dashboard.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={CheckSquare}
              title="Tasks & Habits"
              description="Keep track of your to-dos, manage your projects, and build lasting habits with our intuitive task manager."
            />
            <FeatureCard 
              icon={BrainCircuit}
              title="Thoughts"
              description="Capture fleeting ideas instantly. A dedicated space for brainstorming and quick brain dumps."
            />
            <FeatureCard 
              icon={Wallet}
              title="Finance"
              description="Monitor your expenses, track budgets, and visualize your financial health with beautiful charts."
            />
            <FeatureCard 
              icon={BookOpen}
              title="Notebook"
              description="Write detailed documents, maintain journals, and organize your knowledge base effortlessly."
            />
            <FeatureCard 
              icon={HardDrive}
              title="File Manager"
              description="Securely store, organize, and access your personal files from anywhere, completely self-hosted."
            />
            <FeatureCard 
              icon={LayoutDashboard}
              title="Customizable Dashboard"
              description="Get a bird's-eye view of your day with customizable widgets that put what matters front and center."
            />
          </div>
        </div>
      </div>

      {/* Detailed Showcases */}
      <div className="py-24 bg-slate-50 dark:bg-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-32">
          
          {/* Showcase 1: Tasks */}
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Master your schedule</h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                Organize your life with our comprehensive task management system. Support for priorities, due dates, subtasks, and rich-text descriptions ensures nothing falls through the cracks.
              </p>
              <ul className="space-y-4">
                {['Drag & drop reordering', 'Rich text editor for descriptions', 'Habit tracking integration'].map((item, i) => (
                  <li key={i} className="flex items-center text-gray-700 dark:text-gray-300">
                    <CheckSquare className="w-5 h-5 text-blue-500 mr-3" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:w-1/2">
              <div className="rounded-xl overflow-hidden shadow-xl border border-gray-200 dark:border-gray-700">
                <img 
                  src="/screenshots/tasks.png" 
                  alt="Tasks Feature" 
                  className="w-full h-auto"
                  onError={(e) => { e.target.src = 'https://placehold.co/1280x720/1e293b/ffffff?text=Tasks+Screenshot+Pending' }}
                />
              </div>
            </div>
          </div>

          {/* Showcase 2: Habits */}
          <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
            <div className="lg:w-1/2">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Build lasting routines</h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                Track your daily habits, build streaks, and stay consistent. Sanad helps you monitor your progress and stay motivated.
              </p>
              <ul className="space-y-4">
                {['Daily tracking', 'Visual streaks', 'Custom icons'].map((item, i) => (
                  <li key={i} className="flex items-center text-gray-700 dark:text-gray-300">
                    <CheckSquare className="w-5 h-5 text-blue-500 mr-3" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:w-1/2">
              <div className="rounded-xl overflow-hidden shadow-xl border border-gray-200 dark:border-gray-700">
                <img 
                  src="/screenshots/habits.png" 
                  alt="Habits Feature" 
                  className="w-full h-auto"
                  onError={(e) => { e.target.src = 'https://placehold.co/1280x720/1e293b/ffffff?text=Habits+Screenshot+Pending' }}
                />
              </div>
            </div>
          </div>

          {/* Showcase 3: Thoughts */}
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Capture every idea</h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                Never lose a fleeting thought again. A dedicated space for brainstorming, quick notes, and logging your daily reflections.
              </p>
              <ul className="space-y-4">
                {['Quick capture', 'Chronological feed', 'Searchable insights'].map((item, i) => (
                  <li key={i} className="flex items-center text-gray-700 dark:text-gray-300">
                    <BrainCircuit className="w-5 h-5 text-purple-500 mr-3" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:w-1/2">
              <div className="rounded-xl overflow-hidden shadow-xl border border-gray-200 dark:border-gray-700">
                <img 
                  src="/screenshots/thoughts.png" 
                  alt="Thoughts Feature" 
                  className="w-full h-auto"
                  onError={(e) => { e.target.src = 'https://placehold.co/1280x720/1e293b/ffffff?text=Thoughts+Screenshot+Pending' }}
                />
              </div>
            </div>
          </div>

          {/* Showcase 4: Finance */}
          <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
            <div className="lg:w-1/2">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Take control of your money</h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                Log your expenses, visualize where your money goes, and manage your budget with beautiful, intuitive charts.
              </p>
              <ul className="space-y-4">
                {['Expense tracking', 'Categorization', 'Visual reports'].map((item, i) => (
                  <li key={i} className="flex items-center text-gray-700 dark:text-gray-300">
                    <Wallet className="w-5 h-5 text-emerald-500 mr-3" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:w-1/2">
              <div className="rounded-xl overflow-hidden shadow-xl border border-gray-200 dark:border-gray-700">
                <img 
                  src="/screenshots/finance.png" 
                  alt="Finance Feature" 
                  className="w-full h-auto"
                  onError={(e) => { e.target.src = 'https://placehold.co/1280x720/1e293b/ffffff?text=Finance+Screenshot+Pending' }}
                />
              </div>
            </div>
          </div>

          {/* Showcase 5: Files */}
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Your personal cloud</h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                A robust file manager that lets you upload, organize, and preview files. Ditch the big tech clouds and take back control of your data with your own storage.
              </p>
              <ul className="space-y-4">
                {['Folder hierarchies', 'File previews', 'Storage quota management'].map((item, i) => (
                  <li key={i} className="flex items-center text-gray-700 dark:text-gray-300">
                    <HardDrive className="w-5 h-5 text-indigo-500 mr-3" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:w-1/2">
              <div className="rounded-xl overflow-hidden shadow-xl border border-gray-200 dark:border-gray-700">
                <img 
                  src="/screenshots/files.png" 
                  alt="Files Feature" 
                  className="w-full h-auto"
                  onError={(e) => { e.target.src = 'https://placehold.co/1280x720/1e293b/ffffff?text=Files+Screenshot+Pending' }}
                />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-900 py-12 border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <LayoutDashboard className="w-6 h-6 text-gray-400" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">Sanad</span>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            © {new Date().getFullYear()} Sanad. All rights reserved.
          </p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <a href="#" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <Code className="w-5 h-5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
