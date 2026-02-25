import { useState, type FormEvent } from 'react';
import { useStudentStore } from '../stores/studentStore';

export default function Login() {
  const [mode, setMode] = useState<'student' | 'teacher' | 'register'>('student');
  const [designation, setDesignation] = useState('');
  const [pin, setPin] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [regDesignation, setRegDesignation] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regPinConfirm, setRegPinConfirm] = useState('');
  const [regStudentAName, setRegStudentAName] = useState('');
  const [regStudentBName, setRegStudentBName] = useState('');
  const [regClassCode, setRegClassCode] = useState('');
  const { login, loginTeacher, register, loading, error } = useStudentStore();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (mode === 'student') {
        await login(designation.toUpperCase(), pin);
      } else if (mode === 'teacher') {
        await loginTeacher(username.trim(), password);
      } else {
        await register(
          regDesignation.trim(),
          regPin,
          undefined,
          regClassCode.trim().toUpperCase(),
          regStudentAName.trim() || undefined,
          regStudentBName.trim() || undefined
        );
      }
    } catch {
      // Error handled in store
    }
  };

  const canSubmit = mode === 'student'
    ? Boolean(designation && pin)
    : mode === 'teacher'
    ? Boolean(username && password)
    : Boolean(
        regDesignation.trim() &&
        regPin.length >= 4 &&
        regPin === regPinConfirm &&
        regClassCode.trim().length >= 4 &&
        regStudentAName.trim()
      );

  const pinMismatch = mode === 'register' && regPinConfirm.length > 0 && regPin !== regPinConfirm;

  return (
    <div className="fixed inset-0 bg-retro-cream-wall flex items-center justify-center z-20">
      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(139,115,85,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(139,115,85,0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-md mx-4">
        {/* Party logo + Ministry header */}
        <div className="text-center mb-8">
          <img
            src="/images/party-logo.png"
            alt="The Party"
            className="w-28 h-28 mx-auto mb-4 drop-shadow-lg"
          />
          <div className="inline-block retro-card px-6 py-3 rounded-xl mb-4">
            <h1 className="font-special-elite text-retro-warm-wood text-lg tracking-wider">
              Ministry for Healthy
            </h1>
            <h2 className="font-special-elite text-retro-warm-wood text-lg tracking-wider">
              & Safe Communication
            </h2>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-chrome-mid to-transparent" />
        </div>

        {/* Login card */}
        <form
          onSubmit={handleSubmit}
          className="retro-card p-8 rounded-xl"
        >
          <div className="text-center mb-6">
            <p className="font-ibm-mono text-retro-warm-wood text-sm tracking-wider">
              {mode === 'student' ? 'CITIZEN IDENTIFICATION' : mode === 'teacher' ? 'DIRECTOR ACCESS' : 'NEW PAIR REGISTRATION'}
            </p>
            <p className="font-ibm-mono text-chrome-dark/50 text-xs mt-1">
              v4.7.1 // AUTHORIZED ACCESS ONLY
            </p>
          </div>

          <div className="mb-4 flex rounded-lg border border-chrome-mid overflow-hidden">
            <button
              type="button"
              onClick={() => setMode('student')}
              className={`flex-1 py-2 font-ibm-mono text-xs tracking-wider ${
                mode === 'student'
                  ? 'bg-pearl-iris/10 text-pearl-iris'
                  : 'bg-white/60 text-retro-warm-wood/60'
              }`}
            >
              STUDENT
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 py-2 font-ibm-mono text-xs tracking-wider ${
                mode === 'register'
                  ? 'bg-pearl-iris/10 text-pearl-iris'
                  : 'bg-white/60 text-retro-warm-wood/60'
              }`}
            >
              REGISTER
            </button>
            <button
              type="button"
              onClick={() => setMode('teacher')}
              className={`flex-1 py-2 font-ibm-mono text-xs tracking-wider ${
                mode === 'teacher'
                  ? 'bg-pearl-iris/10 text-pearl-iris'
                  : 'bg-white/60 text-retro-warm-wood/60'
              }`}
            >
              TEACHER
            </button>
          </div>

          {mode === 'student' ? (
            <>
              <div className="mb-4">
                <label className="block font-ibm-mono text-xs text-retro-warm-wood/70 uppercase tracking-wider mb-2">
                  Designation
                </label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value.toUpperCase())}
                  placeholder="CA-1"
                  className="w-full px-4 py-3 text-lg tracking-wider bg-white/80 border border-chrome-mid rounded-lg font-ibm-mono text-retro-warm-wood focus:outline-none focus:border-pearl-iris focus:ring-1 focus:ring-pearl-iris/20"
                  autoComplete="off"
                  autoFocus
                />
              </div>

              <div className="mb-6">
                <label className="block font-ibm-mono text-xs text-retro-warm-wood/70 uppercase tracking-wider mb-2">
                  Security Pin
                </label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="****"
                  maxLength={8}
                  className="w-full px-4 py-3 text-lg tracking-[0.5em] bg-white/80 border border-chrome-mid rounded-lg font-ibm-mono text-retro-warm-wood focus:outline-none focus:border-pearl-iris focus:ring-1 focus:ring-pearl-iris/20"
                />
              </div>
            </>
          ) : mode === 'register' ? (
            <>
              <div className="mb-4">
                <label className="block font-ibm-mono text-xs text-retro-warm-wood/70 uppercase tracking-wider mb-2">
                  Class Code
                </label>
                <input
                  type="text"
                  value={regClassCode}
                  onChange={(e) => setRegClassCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                  placeholder="ALPHA1"
                  maxLength={6}
                  className="w-full px-4 py-3 text-lg tracking-[0.3em] bg-white/80 border border-chrome-mid rounded-lg font-ibm-mono text-retro-warm-wood focus:outline-none focus:border-pearl-iris focus:ring-1 focus:ring-pearl-iris/20"
                  autoComplete="off"
                  autoFocus
                />
                <p className="font-ibm-mono text-chrome-dark/40 text-[10px] mt-1">
                  PROVIDED BY YOUR INSTRUCTOR
                </p>
              </div>

              <div className="mb-4">
                <label className="block font-ibm-mono text-xs text-retro-warm-wood/70 uppercase tracking-wider mb-2">
                  Pair Designation
                </label>
                <input
                  type="text"
                  value={regDesignation}
                  onChange={(e) => setRegDesignation(e.target.value.toUpperCase())}
                  placeholder="CA-33"
                  className="w-full px-4 py-3 text-lg tracking-wider bg-white/80 border border-chrome-mid rounded-lg font-ibm-mono text-retro-warm-wood focus:outline-none focus:border-pearl-iris focus:ring-1 focus:ring-pearl-iris/20"
                  autoComplete="off"
                />
              </div>

              <div className="mb-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-ibm-mono text-xs text-retro-warm-wood/70 uppercase tracking-wider mb-2">
                    Student A Name
                  </label>
                  <input
                    type="text"
                    value={regStudentAName}
                    onChange={(e) => setRegStudentAName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-4 py-3 text-base tracking-wider bg-white/80 border border-chrome-mid rounded-lg font-ibm-mono text-retro-warm-wood focus:outline-none focus:border-pearl-iris focus:ring-1 focus:ring-pearl-iris/20"
                  />
                </div>
                <div>
                  <label className="block font-ibm-mono text-xs text-retro-warm-wood/70 uppercase tracking-wider mb-2">
                    Student B <span className="text-chrome-dark/40">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={regStudentBName}
                    onChange={(e) => setRegStudentBName(e.target.value)}
                    placeholder="Partner name"
                    className="w-full px-4 py-3 text-base tracking-wider bg-white/80 border border-chrome-mid rounded-lg font-ibm-mono text-retro-warm-wood focus:outline-none focus:border-pearl-iris focus:ring-1 focus:ring-pearl-iris/20"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block font-ibm-mono text-xs text-retro-warm-wood/70 uppercase tracking-wider mb-2">
                  Choose PIN (4-8 digits)
                </label>
                <input
                  type="password"
                  value={regPin}
                  onChange={(e) => setRegPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="****"
                  maxLength={8}
                  className="w-full px-4 py-3 text-lg tracking-[0.5em] bg-white/80 border border-chrome-mid rounded-lg font-ibm-mono text-retro-warm-wood focus:outline-none focus:border-pearl-iris focus:ring-1 focus:ring-pearl-iris/20"
                />
              </div>

              <div className="mb-6">
                <label className="block font-ibm-mono text-xs text-retro-warm-wood/70 uppercase tracking-wider mb-2">
                  Confirm PIN
                </label>
                <input
                  type="password"
                  value={regPinConfirm}
                  onChange={(e) => setRegPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="****"
                  maxLength={8}
                  className={`w-full px-4 py-3 text-lg tracking-[0.5em] bg-white/80 border rounded-lg font-ibm-mono text-retro-warm-wood focus:outline-none focus:ring-1 ${
                    pinMismatch
                      ? 'border-neon-pink focus:border-neon-pink focus:ring-neon-pink/20'
                      : 'border-chrome-mid focus:border-pearl-iris focus:ring-pearl-iris/20'
                  }`}
                />
                {pinMismatch && (
                  <p className="font-ibm-mono text-neon-pink text-xs mt-1">PINs do not match</p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="mb-4">
                <label className="block font-ibm-mono text-xs text-retro-warm-wood/70 uppercase tracking-wider mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="teacher"
                  className="w-full px-4 py-3 text-lg tracking-wider bg-white/80 border border-chrome-mid rounded-lg font-ibm-mono text-retro-warm-wood focus:outline-none focus:border-pearl-iris focus:ring-1 focus:ring-pearl-iris/20"
                  autoComplete="username"
                  autoFocus
                />
              </div>

              <div className="mb-6">
                <label className="block font-ibm-mono text-xs text-retro-warm-wood/70 uppercase tracking-wider mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 text-lg bg-white/80 border border-chrome-mid rounded-lg font-ibm-mono text-retro-warm-wood focus:outline-none focus:border-pearl-iris focus:ring-1 focus:ring-pearl-iris/20"
                  autoComplete="current-password"
                />
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 border border-neon-pink/30 bg-neon-pink/5 rounded-lg">
              <p className="font-ibm-mono text-neon-pink text-xs text-center">
                ACCESS DENIED: {error.toUpperCase()}
              </p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="w-full py-3 bg-pearl-iris/10 border border-pearl-iris text-pearl-iris font-ibm-mono text-sm uppercase tracking-[0.3em] rounded-lg hover:bg-pearl-iris/20 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed neon-glow-cyan"
          >
            {loading ? (
              <span className="animate-pulse">
                {mode === 'register' ? 'REGISTERING...' : 'AUTHENTICATING...'}
              </span>
            ) : mode === 'register' ? (
              'REGISTER PAIR'
            ) : (
              'AUTHENTICATE'
            )}
          </button>

          {/* Footer */}
          <p className="mt-6 text-center font-ibm-mono text-chrome-dark/30 text-xs leading-relaxed">
            UNAUTHORIZED ACCESS IS A CLASS-3 VIOLATION
            <br />
            ALL SESSIONS ARE MONITORED BY P.E.A.R.L.
          </p>
        </form>
      </div>
    </div>
  );
}
