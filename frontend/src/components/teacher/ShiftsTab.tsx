import { useEffect, useState } from 'react';
import { fetchWeekBriefings } from '../../api/teacher';
import type { WeekBriefingSetting } from '../../api/teacher';
import ShiftStoryboard from './ShiftStoryboard';

export default function ShiftsTab() {
  const [weekBriefings, setWeekBriefings] = useState<WeekBriefingSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeekId, setSelectedWeekId] = useState('');

  useEffect(() => {
    void fetchWeekBriefings()
      .then((weeks) => {
        setWeekBriefings(weeks);
        if (weeks.length > 0) setSelectedWeekId(weeks[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-1">
        Shift Storyboard
      </h2>
      <p className="text-sm text-slate-500 mb-5">
        Visual overview of each shift. Swap activities, upload clips, and control Now Showing.
      </p>

      {loading ? (
        <div className="text-sm text-slate-400 animate-pulse py-4">Loading shift data...</div>
      ) : weekBriefings.length > 0 ? (
        <>
          <div className="mb-5">
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">
              Select Shift
            </label>
            <select
              value={selectedWeekId}
              onChange={(e) => setSelectedWeekId(e.target.value)}
              className="w-full bg-white border border-slate-300 px-3 py-2.5 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {weekBriefings.map((week) => (
                <option key={week.id} value={week.id}>
                  Shift {week.weekNumber}: {week.title}
                </option>
              ))}
            </select>
          </div>

          {selectedWeekId && <ShiftStoryboard weekId={selectedWeekId} />}
        </>
      ) : (
        <div className="text-sm text-slate-400 py-4">No shift data found.</div>
      )}
    </section>
  );
}
