import { useEffect } from 'react';
import { usePearlStore } from '../../../stores/pearlStore';

const FAKE_NEWS = [
  {
    headline: 'Ministry Reports Record-High Compliance Scores This Quarter',
    body: 'Citizens across all departments have demonstrated exemplary dedication to Right & Proper language standards. The Director commends your collective efforts.',
    time: '08:00',
  },
  {
    headline: 'New Approved Vocabulary List Released for Review Period',
    body: 'The Department of Clarity has updated the approved vocabulary list. All citizens are reminded that using non-approved terms may result in a wellness review.',
    time: '09:30',
  },
  {
    headline: 'P.E.A.R.L. System Upgrade: Enhanced Listening Capabilities',
    body: "Your friendly assistant has been updated with improved monitoring features. P.E.A.R.L. can now better understand your needs and help you stay on track. Isn't that wonderful?",
    time: '11:00',
  },
  {
    headline: 'Community Harmony Index Reaches New Peak',
    body: 'Thanks to diligent participation in Harmony discussions, our community bonds are stronger than ever. Remember: approved words build approved friendships.',
    time: '13:15',
  },
  {
    headline: 'Reminder: Weekly Shift Assignments Are Mandatory',
    body: 'The Ministry reminds all citizens that weekly Shift completion is not optional. Failure to clock out may affect your standing.',
    time: '15:45',
  },
];

export default function DailyProvisionApp() {
  const { messages, loadMessages } = usePearlStore();

  useEffect(() => {
    if (messages.length === 0) loadMessages();
  }, [messages.length, loadMessages]);

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="font-special-elite text-xl text-neon-cyan tracking-wider ios-text-glow mb-1">
          Daily Provision
        </h2>
        <p className="font-ibm-mono text-xs text-white/50 tracking-wider">
          Ministry-Approved News & Updates
        </p>
        <div className="mt-2 h-px bg-gradient-to-r from-transparent via-neon-cyan/30 to-transparent" />
      </div>

      {/* News articles */}
      <div className="space-y-4">
        {FAKE_NEWS.map((article, i) => (
          <div key={i} className="ios-glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-ibm-mono text-[9px] text-neon-cyan/50 tracking-wider">
                {article.time} — MINISTRY PRESS OFFICE
              </span>
            </div>
            <h3 className="font-special-elite text-sm text-white/90 tracking-wider mb-2">
              {article.headline}
            </h3>
            <p className="font-ibm-mono text-xs text-white/50 leading-relaxed">
              {article.body}
            </p>
          </div>
        ))}
      </div>

      {/* Ministry broadcasts */}
      {messages.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-1 bg-neon-cyan" />
            <span className="font-ibm-mono text-[10px] text-neon-cyan/70 tracking-[0.2em] uppercase">
              Official Broadcasts
            </span>
          </div>
          <div className="space-y-2">
            {messages.map((msg, i) => (
              <div key={i} className="rounded-lg border border-white/10 px-3 py-2">
                <p className="font-ibm-mono text-[11px] text-neon-cyan/60 leading-relaxed">
                  {msg.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-center font-ibm-mono text-[9px] text-white/20 tracking-wider mt-8">
        ALL NEWS IS VERIFIED AND APPROVED BY THE MINISTRY
      </p>
    </div>
  );
}
