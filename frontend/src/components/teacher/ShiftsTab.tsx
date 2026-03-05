import { useEffect, useState } from 'react';
import { fetchWeekBriefings } from '../../api/teacher';
import type { WeekBriefingSetting } from '../../api/teacher';
import client from '../../api/client';
import ShiftStoryboard from './ShiftStoryboard';

export default function ShiftsTab() {
  const [weekBriefings, setWeekBriefings] = useState<WeekBriefingSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeekId, setSelectedWeekId] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploadStatus, setVideoUploadStatus] = useState('');

  useEffect(() => {
    void fetchWeekBriefings()
      .then((weeks) => {
        setWeekBriefings(weeks);
        if (weeks.length > 0) setSelectedWeekId(weeks[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleWelcomeVideoUpload = async () => {
    if (!videoFile) return;
    setVideoUploading(true);
    setVideoUploadStatus('');
    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      await client.post('/dictionary/welcome-video', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setVideoUploadStatus('Uploaded successfully');
      setVideoFile(null);
    } catch {
      setVideoUploadStatus('Upload failed');
    }
    setVideoUploading(false);
  };

  return (
    <div className="space-y-6">
    {/* Welcome Video Upload */}
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-slate-800 mb-1">Welcome Video</h3>
      <p className="text-xs text-slate-500 mb-3">
        Upload a welcome video that new students will see on their first login.
      </p>
      <div className="flex items-center gap-3">
        <input
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
          className="text-xs text-slate-600"
        />
        <button
          onClick={handleWelcomeVideoUpload}
          disabled={!videoFile || videoUploading}
          className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {videoUploading ? 'Uploading...' : 'Upload'}
        </button>
        {videoUploadStatus && (
          <span className={`text-xs ${videoUploadStatus.includes('fail') ? 'text-red-500' : 'text-emerald-600'}`}>
            {videoUploadStatus}
          </span>
        )}
      </div>
    </section>

    {/* Shift Storyboard */}
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
    </div>
  );
}
