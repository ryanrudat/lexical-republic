import { useMessagingStore } from '../../stores/messagingStore';
import InboxView from './InboxView';
import ThreadView from './ThreadView';

export default function MessagingPanel() {
  const isPanelOpen = useMessagingStore((s) => s.isPanelOpen);
  const closePanel = useMessagingStore((s) => s.closePanel);
  const selectedMessageId = useMessagingStore((s) => s.selectedMessageId);
  const backToInbox = useMessagingStore((s) => s.backToInbox);
  const messages = useMessagingStore((s) => s.messages);

  const selectedMessage = selectedMessageId
    ? messages.find((m) => m.id === selectedMessageId) ?? null
    : null;

  return (
    <>
      {/* Dark overlay */}
      {isPanelOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[40] transition-opacity"
          onClick={closePanel}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 h-full w-[360px] max-w-[90vw] z-[41] bg-ios-bg/95 backdrop-blur-xl border-l border-white/10 transition-transform duration-500 ease-out ${
          isPanelOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          {selectedMessage ? (
            /* Thread header: back arrow + character name */
            <div className="flex items-center gap-2.5">
              <button
                onClick={backToInbox}
                className="ios-glass-pill px-2 py-1.5 hover:border-neon-cyan/30 transition-all"
                aria-label="Back to inbox"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-white/50">
                  <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <div>
                <h2 className="font-special-elite text-xs text-white/80">
                  {selectedMessage.characterName}
                </h2>
                {selectedMessage.designation && (
                  <p className="font-ibm-mono text-[8px] text-white/25 tracking-wider">
                    {selectedMessage.designation}
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* Inbox header */
            <div>
              <h2 className="font-ibm-mono text-xs text-white/80 tracking-[0.2em] uppercase">
                Messages
              </h2>
              <p className="font-ibm-mono text-[9px] text-white/30 tracking-wider mt-0.5">
                Department Communications
              </p>
            </div>
          )}
          <button
            onClick={closePanel}
            className="ios-glass-pill px-2 py-1 font-ibm-mono text-[10px] text-white/40 hover:text-white transition-colors"
          >
            CLOSE
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 ios-scroll" style={{ maxHeight: 'calc(100vh - 52px)' }}>
          {selectedMessage ? (
            <ThreadView key={selectedMessage.id} message={selectedMessage} />
          ) : (
            <InboxView />
          )}
        </div>
      </div>
    </>
  );
}
