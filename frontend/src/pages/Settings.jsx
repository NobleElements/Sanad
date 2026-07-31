import { Target, Lightbulb, CheckSquare, Calendar, Book, DollarSign, BookOpen, Folder, Settings2 } from 'lucide-react';
import useSettingsStore from '../store/useSettingsStore';
import usePageTitle from '../hooks/usePageTitle';

export default function Settings() {
  usePageTitle('Settings');
  
  const features = useSettingsStore((state) => state.features);
  const toggleFeature = useSettingsStore((state) => state.toggleFeature);

  const featureConfigs = [
    { id: 'todayGoal', name: 'Today Goal', description: 'Set and track your daily objective on the dashboard.', icon: Target, color: 'text-rose-500' },
    { id: 'thoughts', name: 'Thoughts', description: 'Quickly capture and organize your thoughts.', icon: Lightbulb, color: 'text-amber-500' },
    { id: 'habits', name: 'Habits', description: 'Track your daily routines and build good habits.', icon: Settings2, color: 'text-indigo-500' },
    { id: 'tasks', name: 'Tasks', description: 'Manage your to-dos and projects.', icon: CheckSquare, color: 'text-emerald-500' },
    { id: 'calendar', name: 'Calendar', description: 'Schedule and view your upcoming events.', icon: Calendar, color: 'text-blue-500' },
    { id: 'notebook', name: 'Notebook', description: 'Write and organize rich text notes.', icon: Book, color: 'text-purple-500' },
    { id: 'finance', name: 'Finance', description: 'Track your spending and manage budgets.', icon: DollarSign, color: 'text-green-600' },
    { id: 'reading', name: 'Reading', description: 'Log your reading progress and manage your library.', icon: BookOpen, color: 'text-orange-500' },
    { id: 'files', name: 'Files', description: 'Securely store and manage your documents.', icon: Folder, color: 'text-sky-500' },
  ];

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full">
        <h2 className="text-2xl md:text-3xl font-bold mb-2">Settings</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          Customize your experience by toggling features on or off. Toggled off features will be hidden from the sidebar and dashboard.
        </p>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Active Features</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Select which tools you want to use in Sanad.</p>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {featureConfigs.map((feature) => {
              const Icon = feature.icon;
              const isEnabled = features[feature.id];
              return (
                <div key={feature.id} className="p-4 md:p-6 flex items-start sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                  <div className="flex items-start sm:items-center gap-4">
                    <div className={`p-2.5 rounded-lg bg-slate-100 dark:bg-slate-700 ${feature.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800 dark:text-slate-200">{feature.name}</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{feature.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleFeature(feature.id)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 dark:focus:ring-offset-slate-800 ${isEnabled ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-600'}`}
                    role="switch"
                    aria-checked={isEnabled}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
