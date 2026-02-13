import { useStudentStore } from '../stores/studentStore';
import { useTeacherStore } from '../stores/teacherStore';
import type { TeacherTab } from '../stores/teacherStore';
import { useTeacherSocket } from '../hooks/useTeacherSocket';
import ClassMonitor from '../components/teacher/ClassMonitor';
import Gradebook from '../components/teacher/Gradebook';
import ShiftsTab from '../components/teacher/ShiftsTab';

const TABS: { id: TeacherTab; label: string }[] = [
  { id: 'class', label: 'Class' },
  { id: 'grades', label: 'Grades' },
  { id: 'shifts', label: 'Shifts' },
];

export default function TeacherDashboard() {
  const user = useStudentStore((s) => s.user);
  const logout = useStudentStore((s) => s.logout);
  const activeTab = useTeacherStore((s) => s.activeTab);
  const setActiveTab = useTeacherStore((s) => s.setActiveTab);

  useTeacherSocket();

  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-indigo-700 text-white shrink-0">
        <div className="flex items-center justify-between px-6 py-3 max-w-7xl mx-auto w-full">
          <span className="text-sm font-medium">
            Director {user?.displayName || 'Unknown'}
          </span>
          <div className="flex items-center gap-4">
            <span className="text-xs text-indigo-300 tracking-wider uppercase hidden sm:inline">
              Director Oversight Panel
            </span>
            <button
              onClick={logout}
              className="text-sm text-indigo-200 hover:text-white transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </div>

      {/* Sticky tab bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shrink-0">
        <div className="max-w-7xl mx-auto w-full px-6 flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto w-full px-6 py-6">
          {activeTab === 'class' && <ClassMonitor />}
          {activeTab === 'grades' && <Gradebook />}
          {activeTab === 'shifts' && <ShiftsTab />}
        </div>
      </div>
    </div>
  );
}
