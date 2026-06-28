import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, BrainCircuit, Wallet, BookOpen, HardDrive, ArrowRight, Code, Check, Terminal, Copy, Calendar } from 'lucide-react';
import { API_URL } from '../config';
import { formatBytes } from '../utils/formatUtils';

const GithubIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
  </svg>
);

const FeatureCard = ({ icon: Icon, title, description }) => (
  <div className="flex flex-col items-start p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow dark:text-slate-100">
    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg mb-4">
      <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
    </div>
    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{description}</p>
  </div>
);

export default function LandingPage() {
  const [tiers, setTiers] = useState([]);
  const [loadingTiers, setLoadingTiers] = useState(true);
  const [contactEmail, setContactEmail] = useState('');
  const [contactReason, setContactReason] = useState('General Inquiry');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText("curl -O https://raw.githubusercontent.com/NobleElements/Sanad/main/docs/docker-compose.yml && docker compose up -d");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    fetch(`${API_URL}/storage/tiers`)
      .then(res => res.json())
      .then(data => {
        setTiers(data);
        setLoadingTiers(false);
      })
      .catch(err => {
        console.error("Failed to load tiers", err);
        setLoadingTiers(false);
      });

    fetch(`${API_URL}/settings/public`)
      .then(res => res.json())
      .then(data => {
        if (data.contactEmail) {
          setContactEmail(data.contactEmail);
        }
      })
      .catch(err => console.error("Failed to load public settings", err));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 font-sans selection:bg-blue-200">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white dark:bg-slate-800/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 z-50 dark:text-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Sanad Logo" className="w-32 dark:invert" />
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-4 mr-4">
                <a 
                  href="https://github.com/NobleElements/Sanad" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium px-3 py-2 transition-colors flex items-center gap-2"
                >
                  <GithubIcon className="w-5 h-5" />
                  GitHub
                </a>
                <a 
                  href="#features" 
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium px-3 py-2 transition-colors"
                >
                  Features
                </a>
                <a 
                  href="#pricing" 
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium px-3 py-2 transition-colors"
                >
                  Pricing
                </a>
                {contactEmail && (
                  <a 
                    href="#contact" 
                    className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium px-3 py-2 transition-colors"
                  >
                    Contact
                  </a>
                )}
              </div>
              <Link 
                to="/login" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
              >
                Log In
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-16 lg:pt-48 lg:pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')] opacity-20 mix-blend-overlay"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-8">
            Your self-hosted personal workspace, <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
              all in one place.
            </span>
          </h1>
          <p className="mt-4 text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            Sanad is the ultimate companion to organize your tasks, manage your finances, capture your thoughts, and securely store your files. Self-hosted for complete data control and privacy in your personal management.
          </p>
        </div>
      </div>

      {/* Self-Hosting Section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-48 relative">
        <div className="bg-gradient-to-r from-gray-900 to-slate-800 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-lg border border-gray-700">
          <div className="p-4 md:p-6 flex flex-col lg:flex-row items-center gap-4 md:gap-6">
            <div className="flex-shrink-0 flex items-center gap-3">
              <div className="bg-blue-500/20 p-2 rounded-lg">
                <Terminal className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold text-white whitespace-nowrap">
                Self-host with one line
              </h2>
            </div>
            <div className="flex-1 w-full relative">
              <button 
                onClick={handleCopy}
                className="absolute top-1/2 -translate-y-1/2 right-2 p-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-md text-gray-400 hover:text-white transition-all z-10"
                title="Copy command"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
              <div 
                className="w-full bg-black/50 rounded-lg border border-gray-700 py-3 pl-4 pr-14 shadow-inner"
              >
                <pre className="text-sm font-mono text-gray-300 whitespace-pre-wrap break-all sm:break-words">
                  <code>curl -O https://raw.githubusercontent.com/NobleElements/Sanad/main/docs/docker-compose.yml && docker compose up -d</code>
                </pre>
              </div>
            </div>
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
      <div id="features" className="bg-white dark:bg-gray-900 py-24 border-t border-gray-100 dark:border-gray-800">
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
              icon={Calendar}
              title="Calendar"
              description="Visualize your scheduled tasks and daily habits in a unified calendar view to plan your time effectively."
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
                {['Drag & drop reordering', 'Rich text editor for descriptions', 'Projects, Comments and Attachments'].map((item, i) => (
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

          {/* Showcase 3: Calendar */}
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Plan your days</h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                Visualize your schedule with a unified calendar view. See your upcoming tasks, habits, and daily goals all in one place.
              </p>
              <ul className="space-y-4">
                {['Monthly and weekly views', 'Integrated tasks and habits', 'Quick scheduling'].map((item, i) => (
                  <li key={i} className="flex items-center text-gray-700 dark:text-gray-300">
                    <Calendar className="w-5 h-5 text-rose-500 mr-3" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:w-1/2">
              <div className="rounded-xl overflow-hidden shadow-xl border border-gray-200 dark:border-gray-700">
                <img 
                  src="/screenshots/calendar.png" 
                  alt="Calendar Feature" 
                  className="w-full h-auto"
                  onError={(e) => { e.target.src = 'https://placehold.co/1280x720/1e293b/ffffff?text=Calendar+Screenshot+Pending' }}
                />
              </div>
            </div>
          </div>

          {/* Showcase 4: Thoughts */}
          <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
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

          {/* Showcase 5: Finance */}
          <div className="flex flex-col lg:flex-row items-center gap-16">
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

          {/* Showcase 6: Files */}
          <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
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

      {/* Pricing Section */}
      <div id="pricing" className="bg-white dark:bg-gray-900 py-24 border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Simple, transparent pricing</h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">Start for free, upgrade when you need more storage.</p>
          </div>
          
          <div className={`grid grid-cols-1 md:grid-cols-2 ${tiers.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-8 w-full mx-auto`}>
            {loadingTiers ? (
              <div className="col-span-full text-center py-12 text-gray-500">Loading pricing plans...</div>
            ) : tiers.length > 0 ? (
              tiers.map((tier, index) => {
                const isPopular = tier.price > 0 && index === 1; // Highlight the second tier if it has a price
                return (
                  <div key={tier.id} className={`flex flex-col p-8 rounded-2xl ${isPopular ? 'bg-white dark:bg-gray-800 border-2 border-blue-500 shadow-xl relative md:scale-105 z-10' : 'bg-slate-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700'}`}>
                    {isPopular && (
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                        Most Popular
                      </div>
                    )}
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{tier.name}</h3>
                    <div className="flex flex-col mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-extrabold text-gray-900 dark:text-white">${tier.price > 0 ? tier.price * 12 : 0}</span>
                        <span className="text-gray-500 dark:text-gray-400">{tier.price > 0 ? '/year' : '/forever'}</span>
                      </div>
                      {tier.price > 0 && (
                        <span className="text-sm text-gray-400 dark:text-gray-500 mt-1">${tier.price}/month, billed annually</span>
                      )}
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-8">
                      {tier.price === 0 ? "Perfect for getting started and organizing your personal life." : "Everything you need for serious productivity and storage."}
                    </p>
                    <Link to="/login" className={`w-full py-3 px-4 font-medium rounded-xl text-center transition-colors mb-8 ${isPopular ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md' : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}>
                      {tier.price === 0 ? "Get Started" : "Upgrade to " + tier.name}
                    </Link>
                    <ul className="space-y-4 flex-1">
                      <li className="flex items-center text-gray-600 dark:text-gray-400">
                        <Check className="w-5 h-5 text-blue-500 mr-3 shrink-0" />
                        <span className={isPopular ? "text-gray-900 dark:text-white font-medium" : ""}>Up to {formatBytes(tier.diskLimitBytes)} Storage</span>
                      </li>
                      <li className="flex items-center text-gray-600 dark:text-gray-400">
                        <Check className="w-5 h-5 text-blue-500 mr-3 shrink-0" />
                        <span className={isPopular ? "text-gray-900 dark:text-white font-medium" : ""}>Unlimited Tasks</span>
                      </li>
                      <li className="flex items-center text-gray-600 dark:text-gray-400">
                        <Check className="w-5 h-5 text-blue-500 mr-3 shrink-0" />
                        <span className={isPopular ? "text-gray-900 dark:text-white font-medium" : ""}>Basic Habit Tracking</span>
                      </li>
                      <li className="flex items-center text-gray-600 dark:text-gray-400">
                        <Check className="w-5 h-5 text-blue-500 mr-3 shrink-0" />
                        <span className={isPopular ? "text-gray-900 dark:text-white font-medium" : ""}>Core Finance Features</span>
                      </li>
                      {isPopular && (
                        <li className="flex items-center text-gray-600 dark:text-gray-400">
                          <Check className="w-5 h-5 text-blue-500 mr-3 shrink-0" />
                          <span className="text-gray-900 dark:text-white font-medium">Priority Support</span>
                        </li>
                      )}
                    </ul>
                  </div>
                );
              })
            ) : (
              <div className="col-span-1 md:col-span-3 text-center py-12 text-gray-500">No pricing plans available.</div>
            )}
          </div>
        </div>
      </div>

      {/* Contact Us Section */}
      {contactEmail && (
        <div id="contact" className="bg-slate-50 dark:bg-gray-800/50 py-24 border-t border-gray-100 dark:border-gray-800">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Get in Touch</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
              Have questions or need support? Select a reason and reach out to us. We'll get back to you as soon as possible.
            </p>
            
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 dark:text-slate-100">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-center">
                <div className="w-full md:w-1/2 text-left">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reason for Contacting</label>
                  <select 
                    value={contactReason}
                    onChange={(e) => setContactReason(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Technical Support">Technical Support</option>
                    <option value="Billing Issue">Billing Issue</option>
                    <option value="Feature Request">Feature Request</option>
                    <option value="Bug Report">Bug Report</option>
                  </select>
                </div>
                
                <div className="w-full md:w-auto mt-4 md:mt-0 pt-6">
                  <a 
                    href={`mailto:${contactEmail}?subject=${encodeURIComponent(contactReason)}`}
                    className="inline-flex w-full md:w-auto items-center justify-center px-8 py-3 text-lg font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all"
                  >
                    Send Email
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comparisons Section */}
      <div id="comparisons" className="bg-white dark:bg-gray-900 py-24 border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">How Sanad Compares</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">See why users are choosing a unified personal workspace.</p>
          </div>
          
          <div className="space-y-4">
            <details className="group bg-slate-50 dark:bg-gray-800/50 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-6 text-gray-900 dark:text-white text-lg">
                <span>Sanad vs Notion</span>
                <span className="transition group-open:rotate-180">
                  <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                </span>
              </summary>
              <div className="text-gray-600 dark:text-gray-400 p-6 pt-0 leading-relaxed">
                Notion is a highly flexible workspace, but it often requires you to build your own systems from scratch. Sanad provides a structured, out-of-the-box experience tailored for personal management—including dedicated modules for tasks, habits, finances, calendar, and file storage. Furthermore, Sanad is self-hosted, ensuring complete control over your data privacy.
              </div>
            </details>

            <details className="group bg-slate-50 dark:bg-gray-800/50 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-6 text-gray-900 dark:text-white text-lg">
                <span>Sanad vs Obsidian</span>
                <span className="transition group-open:rotate-180">
                  <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                </span>
              </summary>
              <div className="text-gray-600 dark:text-gray-400 p-6 pt-0 leading-relaxed">
                While Obsidian is exceptional for connected notes and local markdown files, it relies heavily on community plugins to add features like task management or calendars. Sanad delivers a cohesive, all-in-one application out-of-the-box, combining notes, a full task manager, finance tracking, and file storage into a single unified dashboard.
              </div>
            </details>

            <details className="group bg-slate-50 dark:bg-gray-800/50 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-6 text-gray-900 dark:text-white text-lg">
                <span>Sanad vs TickTick</span>
                <span className="transition group-open:rotate-180">
                  <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                </span>
              </summary>
              <div className="text-gray-600 dark:text-gray-400 p-6 pt-0 leading-relaxed">
                TickTick is great for tasks and habits, but it stops there. Sanad takes your productivity further by integrating a robust rich-text notebook, a self-hosted file manager, and a comprehensive finance tracker, giving you a holistic view of your entire life in one place.
              </div>
            </details>

            <details className="group bg-slate-50 dark:bg-gray-800/50 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-6 text-gray-900 dark:text-white text-lg">
                <span>Sanad vs Todoist</span>
                <span className="transition group-open:rotate-180">
                  <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                </span>
              </summary>
              <div className="text-gray-600 dark:text-gray-400 p-6 pt-0 leading-relaxed">
                Todoist is a focused and powerful task manager. However, managing your life often requires more than just to-dos. Sanad brings your tasks, calendar, daily habits, personal notes, and financial transactions into a single, beautifully designed self-hosted platform.
              </div>
            </details>

            <details className="group bg-slate-50 dark:bg-gray-800/50 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-6 text-gray-900 dark:text-white text-lg">
                <span>Sanad vs Amplenote</span>
                <span className="transition group-open:rotate-180">
                  <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                </span>
              </summary>
              <div className="text-gray-600 dark:text-gray-400 p-6 pt-0 leading-relaxed">
                Amplenote integrates notes, tasks, and a calendar effectively. Sanad expands on this concept by adding complete file management, detailed finance tracking, and habit streaks. Additionally, Sanad's self-hostable nature and multi-tenancy support offer unparalleled data sovereignty.
              </div>
            </details>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-900 py-12 border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <span className="text-xl font-bold text-gray-900 dark:text-white">Sanad</span>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            © {new Date().getFullYear()} Sanad. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 mt-6 md:mt-0 text-sm">
            <Link to="/terms" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">Terms</Link>
            <Link to="/privacy" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">Privacy</Link>
            <Link to="/refund" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">Refunds</Link>
            <a href="https://github.com/NobleElements/Sanad" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-2" title="GitHub Repository">
              <GithubIcon className="w-5 h-5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
