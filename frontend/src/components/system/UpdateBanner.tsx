// Shown at the top of the app when a newer JS bundle has been deployed
// than the one this tab is running. Non-disruptive: stays until the user
// clicks Reload. No auto-refresh — the student may be mid-task and we
// don't want to lose their work.
//
// Cyan/sky accent (matches Compliance Check / Clarity Check) so students
// associate it with "the system is updating" rather than "you're in
// trouble" (amber = remediation; rose = error).

import { useUpdateStore } from '../../stores/updateStore';

export default function UpdateBanner() {
  const updateAvailable = useUpdateStore((s) => s.updateAvailable);
  const latestBuildId = useUpdateStore((s) => s.latestBuildId);

  if (!updateAvailable) return null;

  const reload = () => {
    // Force a network revalidation rather than relying on the bf-cache.
    window.location.reload();
  };

  return (
    <div
      className="fixed top-0 inset-x-0 z-[2000] flex items-center justify-center gap-3 px-3 py-1.5 bg-sky-600 text-white text-xs font-mono shadow-lg pointer-events-auto"
      role="status"
    >
      <span className="tracking-wide">
        A new version is available
        {latestBuildId ? ` (${latestBuildId})` : ''} — reload to update.
      </span>
      <button
        onClick={reload}
        className="px-3 py-1 rounded bg-white text-sky-700 text-xs font-semibold hover:bg-sky-50 active:scale-95 transition-all"
      >
        Reload
      </button>
    </div>
  );
}
