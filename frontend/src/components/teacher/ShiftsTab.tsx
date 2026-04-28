import { useEffect, useState, useCallback } from 'react';
import { fetchWeekBriefings } from '../../api/teacher';
import type { WeekBriefingSetting } from '../../api/teacher';
import client from '../../api/client';
import { resolveUploadUrl } from '../../api/client';
import { useTeacherStore } from '../../stores/teacherStore';
import ShiftStoryboard from './ShiftStoryboard';
import ComplianceCheckSlotList from './compliance-check/ComplianceCheckSlotList';

export default function ShiftsTab() {
  const selectedClassId = useTeacherStore(s => s.selectedClassId);
  const [weekBriefings, setWeekBriefings] = useState<WeekBriefingSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeekId, setSelectedWeekId] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploadStatus, setVideoUploadStatus] = useState('');
  const [videoExists, setVideoExists] = useState<boolean | null>(null);
  const [deleting, setDeleting] = useState(false);

  const checkVideoExists = useCallback(async () => {
    try {
      const url = resolveUploadUrl('/uploads/welcome/welcome-video.mp4');
      const resp = await fetch(url, { method: 'HEAD' });
      setVideoExists(resp.ok);
    } catch {
      setVideoExists(false);
    }
  }, []);

  useEffect(() => {
    void fetchWeekBriefings()
      .then((weeks) => {
        setWeekBriefings(weeks);
        if (weeks.length > 0) setSelectedWeekId(weeks[0].id);
      })
      .finally(() => setLoading(false));
    void checkVideoExists();
  }, [checkVideoExists]);

  const handleWelcomeVideoUpload = async () => {
    if (!videoFile) return;
    setVideoUploading(true);
    setVideoUploadStatus('');
    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      await client.post('/dictionary/welcome-video', formData, {
        headers: { 'Content-Type': undefined },
      });
      setVideoUploadStatus('Uploaded successfully');
      setVideoFile(null);
      setVideoExists(true);
    } catch {
      setVideoUploadStatus('Upload failed');
    }
    setVideoUploading(false);
  };

  const handleDeleteVideo = async () => {
    setDeleting(true);
    try {
      await client.delete('/dictionary/welcome-video');
      setVideoExists(false);
      setVideoUploadStatus('Video deleted');
    } catch {
      setVideoUploadStatus('Delete failed');
    }
    setDeleting(false);
  };

  return (
    <div className="space-y-6">
    {/* Welcome Video Upload */}
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-slate-800 mb-1">Welcome Video</h3>
      <p className="text-xs text-slate-500 mb-3">
        Upload a welcome video that new students will see on their first login.
      </p>

      {/* Current status */}
      {videoExists !== null && (
        <div className={`text-xs mb-3 flex items-center gap-2 ${videoExists ? 'text-emerald-600' : 'text-slate-400'}`}>
          <span className={`w-2 h-2 rounded-full ${videoExists ? 'bg-emerald-500' : 'bg-slate-300'}`} />
          {videoExists ? 'Video uploaded' : 'No video uploaded'}
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
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
        {videoExists && (
          <button
            onClick={handleDeleteVideo}
            disabled={deleting}
            className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? 'Deleting...' : 'Delete Video'}
          </button>
        )}
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

          {selectedWeekId && <ShiftStoryboard weekId={selectedWeekId} classId={selectedClassId} />}
        </>
      ) : (
        <div className="text-sm text-slate-400 py-4">No shift data found.</div>
      )}
    </section>

    {/* Compliance Checks for the selected shift */}
    {selectedClassId && selectedWeekId && (() => {
      const selectedWeek = weekBriefings.find(w => w.id === selectedWeekId);
      if (!selectedWeek) return null;
      return (
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-1">
            Compliance Checks
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Schedule screen-locking vocabulary verifications inside this shift. Per-class — different classes can have different checks for the same shift.
          </p>
          <ComplianceCheckSlotList
            classId={selectedClassId}
            weekNumber={selectedWeek.weekNumber}
          />
        </section>
      );
    })()}
    {!selectedClassId && (
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">
          Compliance Checks
        </h2>
        <p className="text-sm text-slate-400 italic">
          Select a class above to schedule Compliance Checks for this shift.
        </p>
      </section>
    )}
    </div>
  );
}
