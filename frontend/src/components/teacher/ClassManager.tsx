import { useState, useEffect } from 'react';
import {
  createClass,
  regenerateClassCode,
  unlockWeek,
  lockWeek,
  fetchWeekBriefings,
} from '../../api/teacher';
import type { ClassInfo, WeekBriefingSetting } from '../../api/teacher';

interface Props {
  classes: ClassInfo[];
  onRefresh: () => Promise<void>;
}

export default function ClassManager({ classes, onRefresh }: Props) {
  const [newClassName, setNewClassName] = useState('');
  const [creating, setCreating] = useState(false);
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
  const [weeks, setWeeks] = useState<WeekBriefingSetting[]>([]);
  const [weeksLoaded, setWeeksLoaded] = useState(false);

  useEffect(() => {
    if (!weeksLoaded) {
      void fetchWeekBriefings().then((w) => {
        setWeeks(w);
        setWeeksLoaded(true);
      });
    }
  }, [weeksLoaded]);

  const handleCreate = async () => {
    if (!newClassName.trim()) return;
    setCreating(true);
    try {
      await createClass(newClassName.trim());
      setNewClassName('');
      await onRefresh();
    } catch (err) {
      console.error('Failed to create class:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleRegenCode = async (classId: string) => {
    try {
      await regenerateClassCode(classId);
      await onRefresh();
    } catch (err) {
      console.error('Failed to regenerate code:', err);
    }
  };

  const handleToggleWeek = async (classId: string, weekId: string, isUnlocked: boolean) => {
    try {
      if (isUnlocked) {
        await lockWeek(classId, weekId);
      } else {
        await unlockWeek(classId, weekId);
      }
      await onRefresh();
    } catch (err) {
      console.error('Failed to toggle week:', err);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Classes</h2>

      {/* Create new class */}
      <div className="flex items-center gap-2 mb-5">
        <input
          type="text"
          value={newClassName}
          onChange={(e) => setNewClassName(e.target.value)}
          placeholder="New class name (e.g. 110-B)"
          className="flex-1 text-sm border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        />
        <button
          onClick={handleCreate}
          disabled={creating || !newClassName.trim()}
          className="text-sm px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors font-medium"
        >
          {creating ? 'Creating...' : 'Create Class'}
        </button>
      </div>

      {/* Class list */}
      <div className="space-y-3">
        {classes.map((cls) => {
          const isExpanded = expandedClassId === cls.id;
          return (
            <div key={cls.id} className="border border-slate-200 rounded-lg">
              {/* Class header */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-800">{cls.name}</span>
                  <span className="text-xs text-slate-500">{cls.studentCount} students</span>
                </div>
                <div className="flex items-center gap-3">
                  {/* Join code badge */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">Code:</span>
                    <code className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      {cls.joinCode}
                    </code>
                    <button
                      onClick={() => handleRegenCode(cls.id)}
                      className="text-[10px] text-slate-400 hover:text-slate-600"
                      title="Regenerate join code"
                    >
                      ↻
                    </button>
                  </div>
                  <button
                    onClick={() => setExpandedClassId(isExpanded ? null : cls.id)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    {isExpanded ? 'Hide Weeks' : 'Week Unlocks'}
                  </button>
                </div>
              </div>

              {/* Week unlock controls */}
              {isExpanded && (
                <div className="border-t border-slate-100 px-4 py-3">
                  <div className="grid grid-cols-6 sm:grid-cols-9 lg:grid-cols-18 gap-1.5">
                    {weeks.map((week) => {
                      const isUnlocked = cls.unlockedWeekIds.includes(week.id);
                      return (
                        <button
                          key={week.id}
                          onClick={() => handleToggleWeek(cls.id, week.id, isUnlocked)}
                          className={`text-xs py-1.5 rounded-md font-medium transition-colors ${
                            isUnlocked
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                          }`}
                          title={`Shift ${week.weekNumber}: ${week.title} — ${isUnlocked ? 'Click to lock' : 'Click to unlock'}`}
                        >
                          {week.weekNumber}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">
                    Green = unlocked. Click to toggle.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {classes.length === 0 && (
        <div className="text-center py-8 text-sm text-slate-400">
          No classes yet. Create your first class above.
        </div>
      )}
    </div>
  );
}
