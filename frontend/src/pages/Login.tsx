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
    <div className="fixed inset-0 bg-[#f5f0e8] flex flex-col z-20 overflow-y-auto">
      {/* Subtle linen texture */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(100,80,60,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(100,80,60,0.4) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Top gold accent bar */}
      <div className="w-full h-1.5 bg-gradient-to-r from-[#8B6914] via-[#C9A84C] to-[#8B6914] shrink-0" />

      {/* Official header banner */}
      <div className="relative w-full bg-[#1a1a1a] py-8 shrink-0">
        <div className="max-w-lg mx-auto text-center px-4">
          {/* Party seal */}
          <img
            src="/images/party-logo.png"
            alt="The Party — Unity, Happiness, Obedience"
            className="w-44 h-44 mx-auto mb-5 drop-shadow-[0_4px_20px_rgba(201,168,76,0.3)]"
          />

          {/* Ministry name */}
          <h1 className="font-special-elite text-[#C9A84C] text-2xl tracking-[0.15em] leading-tight">
            Ministry for Healthy
          </h1>
          <h1 className="font-special-elite text-[#C9A84C] text-2xl tracking-[0.15em] leading-tight">
            & Safe Communication
          </h1>

          {/* Divider */}
          <div className="mt-4 mb-3 flex items-center justify-center gap-3">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#C9A84C]/40" />
            <div className="w-1.5 h-1.5 rotate-45 bg-[#C9A84C]/50" />
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-[#C9A84C]/40" />
          </div>

          <p className="font-ibm-mono text-[#C9A84C]/50 text-[10px] tracking-[0.4em] uppercase">
            Department of Clarity — Secure Access Portal
          </p>
        </div>
      </div>

      {/* Bottom gold accent bar */}
      <div className="w-full h-0.5 bg-gradient-to-r from-[#8B6914] via-[#C9A84C] to-[#8B6914] shrink-0" />

      {/* Content area */}
      <div className="flex-1 flex items-start justify-center pt-8 pb-12 px-4">
        <div className="w-full max-w-md">
          {/* Login card */}
          <form
            onSubmit={handleSubmit}
            className="bg-white/70 backdrop-blur-sm border border-[#d4cbbe] rounded-lg shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-8"
          >
            <div className="text-center mb-6">
              <p className="font-ibm-mono text-[#5a4a38] text-sm tracking-[0.2em] font-medium">
                {mode === 'student' ? 'CITIZEN IDENTIFICATION' : mode === 'teacher' ? 'DIRECTOR ACCESS' : 'NEW PAIR REGISTRATION'}
              </p>
              <p className="font-ibm-mono text-[#5a4a38]/40 text-[10px] mt-1 tracking-wider">
                v4.7.1 // AUTHORIZED ACCESS ONLY
              </p>
            </div>

            <div className="mb-5 flex rounded-md border border-[#d4cbbe] overflow-hidden">
              <button
                type="button"
                onClick={() => setMode('student')}
                className={`flex-1 py-2.5 font-ibm-mono text-xs tracking-wider transition-colors ${
                  mode === 'student'
                    ? 'bg-[#1a1a1a] text-[#C9A84C]'
                    : 'bg-[#f5f0e8] text-[#5a4a38]/50 hover:bg-[#ede7db]'
                }`}
              >
                STUDENT
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`flex-1 py-2.5 font-ibm-mono text-xs tracking-wider border-x border-[#d4cbbe] transition-colors ${
                  mode === 'register'
                    ? 'bg-[#1a1a1a] text-[#C9A84C]'
                    : 'bg-[#f5f0e8] text-[#5a4a38]/50 hover:bg-[#ede7db]'
                }`}
              >
                REGISTER
              </button>
              <button
                type="button"
                onClick={() => setMode('teacher')}
                className={`flex-1 py-2.5 font-ibm-mono text-xs tracking-wider transition-colors ${
                  mode === 'teacher'
                    ? 'bg-[#1a1a1a] text-[#C9A84C]'
                    : 'bg-[#f5f0e8] text-[#5a4a38]/50 hover:bg-[#ede7db]'
                }`}
              >
                TEACHER
              </button>
            </div>

            {mode === 'student' ? (
              <>
                <div className="mb-4">
                  <label className="block font-ibm-mono text-[11px] text-[#5a4a38]/70 uppercase tracking-[0.15em] mb-2">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value.toUpperCase())}
                    placeholder="CA-1"
                    className="w-full px-4 py-3 text-lg tracking-wider bg-white border border-[#d4cbbe] rounded-md font-ibm-mono text-[#3a3025] focus:outline-none focus:border-[#8B6914] focus:ring-1 focus:ring-[#C9A84C]/30"
                    autoComplete="off"
                    autoFocus
                  />
                </div>

                <div className="mb-6">
                  <label className="block font-ibm-mono text-[11px] text-[#5a4a38]/70 uppercase tracking-[0.15em] mb-2">
                    Security Pin
                  </label>
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="****"
                    maxLength={8}
                    className="w-full px-4 py-3 text-lg tracking-[0.5em] bg-white border border-[#d4cbbe] rounded-md font-ibm-mono text-[#3a3025] focus:outline-none focus:border-[#8B6914] focus:ring-1 focus:ring-[#C9A84C]/30"
                  />
                </div>
              </>
            ) : mode === 'register' ? (
              <>
                <div className="mb-4">
                  <label className="block font-ibm-mono text-[11px] text-[#5a4a38]/70 uppercase tracking-[0.15em] mb-2">
                    Class Code
                  </label>
                  <input
                    type="text"
                    value={regClassCode}
                    onChange={(e) => setRegClassCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                    placeholder="ALPHA1"
                    maxLength={6}
                    className="w-full px-4 py-3 text-lg tracking-[0.3em] bg-white border border-[#d4cbbe] rounded-md font-ibm-mono text-[#3a3025] focus:outline-none focus:border-[#8B6914] focus:ring-1 focus:ring-[#C9A84C]/30"
                    autoComplete="off"
                    autoFocus
                  />
                  <p className="font-ibm-mono text-[#5a4a38]/35 text-[10px] mt-1 tracking-wider">
                    PROVIDED BY YOUR INSTRUCTOR
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block font-ibm-mono text-[11px] text-[#5a4a38]/70 uppercase tracking-[0.15em] mb-2">
                    Pair Designation
                  </label>
                  <input
                    type="text"
                    value={regDesignation}
                    onChange={(e) => setRegDesignation(e.target.value.toUpperCase())}
                    placeholder="CA-33"
                    className="w-full px-4 py-3 text-lg tracking-wider bg-white border border-[#d4cbbe] rounded-md font-ibm-mono text-[#3a3025] focus:outline-none focus:border-[#8B6914] focus:ring-1 focus:ring-[#C9A84C]/30"
                    autoComplete="off"
                  />
                </div>

                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-ibm-mono text-[11px] text-[#5a4a38]/70 uppercase tracking-[0.15em] mb-2">
                      Student A Name
                    </label>
                    <input
                      type="text"
                      value={regStudentAName}
                      onChange={(e) => setRegStudentAName(e.target.value)}
                      placeholder="Your name"
                      className="w-full px-4 py-3 text-base tracking-wider bg-white border border-[#d4cbbe] rounded-md font-ibm-mono text-[#3a3025] focus:outline-none focus:border-[#8B6914] focus:ring-1 focus:ring-[#C9A84C]/30"
                    />
                  </div>
                  <div>
                    <label className="block font-ibm-mono text-[11px] text-[#5a4a38]/70 uppercase tracking-[0.15em] mb-2">
                      Student B <span className="opacity-50">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={regStudentBName}
                      onChange={(e) => setRegStudentBName(e.target.value)}
                      placeholder="Partner name"
                      className="w-full px-4 py-3 text-base tracking-wider bg-white border border-[#d4cbbe] rounded-md font-ibm-mono text-[#3a3025] focus:outline-none focus:border-[#8B6914] focus:ring-1 focus:ring-[#C9A84C]/30"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block font-ibm-mono text-[11px] text-[#5a4a38]/70 uppercase tracking-[0.15em] mb-2">
                    Choose PIN (4-8 digits)
                  </label>
                  <input
                    type="password"
                    value={regPin}
                    onChange={(e) => setRegPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="****"
                    maxLength={8}
                    className="w-full px-4 py-3 text-lg tracking-[0.5em] bg-white border border-[#d4cbbe] rounded-md font-ibm-mono text-[#3a3025] focus:outline-none focus:border-[#8B6914] focus:ring-1 focus:ring-[#C9A84C]/30"
                  />
                </div>

                <div className="mb-6">
                  <label className="block font-ibm-mono text-[11px] text-[#5a4a38]/70 uppercase tracking-[0.15em] mb-2">
                    Confirm PIN
                  </label>
                  <input
                    type="password"
                    value={regPinConfirm}
                    onChange={(e) => setRegPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="****"
                    maxLength={8}
                    className={`w-full px-4 py-3 text-lg tracking-[0.5em] bg-white border rounded-md font-ibm-mono text-[#3a3025] focus:outline-none focus:ring-1 ${
                      pinMismatch
                        ? 'border-neon-pink focus:border-neon-pink focus:ring-neon-pink/20'
                        : 'border-[#d4cbbe] focus:border-[#8B6914] focus:ring-[#C9A84C]/30'
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
                  <label className="block font-ibm-mono text-[11px] text-[#5a4a38]/70 uppercase tracking-[0.15em] mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="teacher"
                    className="w-full px-4 py-3 text-lg tracking-wider bg-white border border-[#d4cbbe] rounded-md font-ibm-mono text-[#3a3025] focus:outline-none focus:border-[#8B6914] focus:ring-1 focus:ring-[#C9A84C]/30"
                    autoComplete="username"
                    autoFocus
                  />
                </div>

                <div className="mb-6">
                  <label className="block font-ibm-mono text-[11px] text-[#5a4a38]/70 uppercase tracking-[0.15em] mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 text-lg bg-white border border-[#d4cbbe] rounded-md font-ibm-mono text-[#3a3025] focus:outline-none focus:border-[#8B6914] focus:ring-1 focus:ring-[#C9A84C]/30"
                    autoComplete="current-password"
                  />
                </div>
              </>
            )}

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 border border-[#8B2020]/30 bg-[#8B2020]/5 rounded-md">
                <p className="font-ibm-mono text-[#8B2020] text-xs text-center tracking-wider">
                  ACCESS DENIED: {error.toUpperCase()}
                </p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="w-full py-3.5 bg-[#1a1a1a] text-[#C9A84C] font-ibm-mono text-sm uppercase tracking-[0.3em] rounded-md hover:bg-[#2a2a2a] transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed border border-[#C9A84C]/30"
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

            {/* Footer warning */}
            <div className="mt-6 pt-4 border-t border-[#d4cbbe]/60">
              <p className="text-center font-ibm-mono text-[#5a4a38]/30 text-[10px] leading-relaxed tracking-wider">
                UNAUTHORIZED ACCESS IS A CLASS-3 VIOLATION
                <br />
                ALL SESSIONS ARE MONITORED BY P.E.A.R.L.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
