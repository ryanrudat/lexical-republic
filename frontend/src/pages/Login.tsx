import { useState, useEffect, useRef, useCallback, type FormEvent } from 'react';
import { useStudentStore } from '../stores/studentStore';
import { useLoginFormStore } from '../stores/loginFormStore';

export default function Login() {
  const {
    mode, designation, pin, username, password,
    regDesignation, regPin, regPinConfirm, regStudentAName, regStudentBName, regClassCode,
    tRegUsername, tRegPassword, tRegPasswordConfirm, tRegDisplayName, tRegCode,
    setMode, setField, clearForm,
  } = useLoginFormStore();

  const setDesignation = (v: string) => setField('designation', v);
  const setPin = (v: string) => setField('pin', v);
  const setUsername = (v: string) => setField('username', v);
  const setPassword = (v: string) => setField('password', v);
  const setRegDesignation = (v: string) => setField('regDesignation', v);
  const setRegPin = (v: string) => setField('regPin', v);
  const setRegPinConfirm = (v: string) => setField('regPinConfirm', v);
  const setRegStudentAName = (v: string) => setField('regStudentAName', v);
  const setRegStudentBName = (v: string) => setField('regStudentBName', v);
  const setRegClassCode = (v: string) => setField('regClassCode', v);
  const setTRegUsername = (v: string) => setField('tRegUsername', v);
  const setTRegPassword = (v: string) => setField('tRegPassword', v);
  const setTRegPasswordConfirm = (v: string) => setField('tRegPasswordConfirm', v);
  const setTRegDisplayName = (v: string) => setField('tRegDisplayName', v);
  const setTRegCode = (v: string) => setField('tRegCode', v);

  const { login, loginTeacher, register, registerTeacher, loading, error } = useStudentStore();

  // Background music — autoplay blocked by browsers, so start on first interaction
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const musicStartedRef = useRef(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const audio = new Audio('/audio/Synthetic_Serenity.mp3');
    audio.loop = true;
    audio.volume = 0.35;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  const isTeacherMode = mode === 'teacher' || mode === 'teacher-register';

  const startMusic = useCallback(() => {
    if (musicStartedRef.current || isTeacherMode) return;
    const audio = audioRef.current;
    if (!audio) return;
    audio.play().then(() => { musicStartedRef.current = true; }).catch(() => {});
  }, [isTeacherMode]);

  useEffect(() => {
    if (isTeacherMode) return;
    const handler = () => startMusic();
    document.addEventListener('click', handler, { once: true });
    document.addEventListener('keydown', handler, { once: true });
    return () => {
      document.removeEventListener('click', handler);
      document.removeEventListener('keydown', handler);
    };
  }, [startMusic, isTeacherMode]);

  // Pause music on teacher views, resume on student views
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isTeacherMode) {
      audio.pause();
    } else if (musicStartedRef.current) {
      audio.play().catch(() => {});
    }
  }, [isTeacherMode]);

  const toggleMute = useCallback(() => {
    setMuted(prev => {
      const next = !prev;
      if (audioRef.current) audioRef.current.muted = next;
      return next;
    });
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (mode === 'student') {
        await login(designation.toUpperCase(), pin);
      } else if (mode === 'teacher') {
        await loginTeacher(username.trim(), password);
      } else if (mode === 'teacher-register') {
        await registerTeacher(
          tRegUsername.trim(),
          tRegPassword,
          tRegDisplayName.trim(),
          tRegCode.trim()
        );
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
      // Clear form on successful login/register
      clearForm();
    } catch {
      // Error handled in store
    }
  };

  const canSubmit = mode === 'student'
    ? Boolean(designation && pin)
    : mode === 'teacher'
    ? Boolean(username && password)
    : mode === 'teacher-register'
    ? Boolean(
        tRegUsername.trim() &&
        tRegPassword.length >= 6 &&
        tRegPassword === tRegPasswordConfirm &&
        tRegCode.trim()
      )
    : Boolean(
        regDesignation.trim() &&
        regPin.length >= 4 &&
        regPin === regPinConfirm &&
        regClassCode.trim().length >= 4 &&
        regStudentAName.trim()
      );

  const pinMismatch = mode === 'register' && regPinConfirm.length > 0 && regPin !== regPinConfirm;
  const tPasswordMismatch = mode === 'teacher-register' && tRegPasswordConfirm.length > 0 && tRegPassword !== tRegPasswordConfirm;

  // Translucent by default, solid on focus — pure CSS, no state needed
  // text-base (16px) minimum prevents iOS Safari auto-zoom on focus
  const inputCls = 'w-full px-4 py-3 text-base rounded-xl font-ibm-mono bg-white/30 border border-white/40 text-[#3a4a58]/80 placeholder:text-[#3a4a58]/30 focus:outline-none focus:bg-white focus:border-[#2D8A6E]/40 focus:ring-2 focus:ring-[#2D8A6E]/15 focus:text-[#3a4a58] focus:shadow-sm';

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#E8F5E9] via-[#F0F7FA] to-[#FFF9C4]/30 z-20 overflow-hidden">
      {/* Large faint watermark logo — centered in viewport */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <img
          src="/images/party-logo.png"
          alt=""
          className="w-full h-full object-contain opacity-[0.08] p-4"
        />
      </div>

      {/* Soft pastel accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#B3E5FC] via-[#E1BEE7] to-[#FCE4EC] z-10" />

      {/* Music mute toggle — hidden on teacher views */}
      {!isTeacherMode && <button
        type="button"
        onClick={toggleMute}
        className="absolute bottom-5 right-5 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-white/30 backdrop-blur-sm border border-white/50 text-[#2D8A6E]/60 hover:bg-white/50 hover:text-[#2D8A6E] transition-all"
        title={muted ? 'Unmute music' : 'Mute music'}
      >
        {muted ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        )}
      </button>}

      {/* Fixed header — does NOT scroll */}
      <div className="relative pt-6 pb-4 z-10">
        <div className="max-w-lg mx-auto text-center px-4">
          <img
            src="/images/party-logo.png"
            alt="The Party — Unity, Happiness, Obedience"
            className="w-20 h-20 mx-auto mb-3 drop-shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
          />

          <h1 className="font-special-elite text-[#2D8A6E] text-xl tracking-[0.12em] leading-tight">
            Ministry of Safe
          </h1>
          <h1 className="font-special-elite text-[#2D8A6E] text-xl tracking-[0.12em] leading-tight">
            & Healthy Communication
          </h1>

          <div className="mt-3 mb-2 flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#B3E5FC]" />
            <div className="w-1.5 h-1.5 rotate-45 bg-[#E1BEE7]/70" />
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#FCE4EC]" />
          </div>

          <p className="font-ibm-mono text-[#2D8A6E]/40 text-[10px] tracking-[0.4em] uppercase">
            Department of Clarity — Secure Access Portal
          </p>
        </div>
      </div>

      {/* Form card area — card itself scrolls internally */}
      <div className="absolute left-0 right-0 bottom-0 flex justify-center px-4 pb-6 z-10 safe-area-bottom" style={{ top: 'min(220px, 30dvh)' }}>
        <div className="w-full max-w-md max-h-full">
          <form
            onSubmit={handleSubmit}
            className="bg-white/35 backdrop-blur-sm border border-white/50 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.03)] max-h-full overflow-y-auto p-8"
          >
              <div className="text-center mb-6">
                <p className="font-ibm-mono text-[#2D8A6E] text-sm tracking-[0.2em] font-medium">
                  {mode === 'student' ? 'CITIZEN IDENTIFICATION' : mode === 'teacher' ? 'DIRECTOR ACCESS' : mode === 'teacher-register' ? 'DIRECTOR REGISTRATION' : 'NEW PAIR REGISTRATION'}
                </p>
                <p className="font-ibm-mono text-[#5a6a78]/40 text-[10px] mt-1 tracking-wider">
                  v4.7.1 // AUTHORIZED ACCESS ONLY
                </p>
              </div>

              <div className="mb-5 flex rounded-full border border-white/50 overflow-hidden bg-white/20">
                <button
                  type="button"
                  onClick={() => setMode('student')}
                  className={`flex-1 py-3 min-h-[44px] font-ibm-mono text-xs tracking-wider transition-all ${
                    mode === 'student'
                      ? 'bg-[#2D8A6E] text-white rounded-full shadow-sm'
                      : 'text-[#5a6a78]/50 hover:text-[#2D8A6E]/70'
                  }`}
                >
                  STUDENT
                </button>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className={`flex-1 py-3 min-h-[44px] font-ibm-mono text-xs tracking-wider transition-all ${
                    mode === 'register'
                      ? 'bg-[#2D8A6E] text-white rounded-full shadow-sm'
                      : 'text-[#5a6a78]/50 hover:text-[#2D8A6E]/70'
                  }`}
                >
                  REGISTER
                </button>
                <button
                  type="button"
                  onClick={() => setMode(mode === 'teacher-register' ? 'teacher-register' : 'teacher')}
                  className={`flex-1 py-3 min-h-[44px] font-ibm-mono text-xs tracking-wider transition-all ${
                    mode === 'teacher' || mode === 'teacher-register'
                      ? 'bg-[#2D8A6E] text-white rounded-full shadow-sm'
                      : 'text-[#5a6a78]/50 hover:text-[#2D8A6E]/70'
                  }`}
                >
                  TEACHER
                </button>
              </div>

              {mode === 'student' ? (
                <>
                  <div className="mb-4">
                    <label className="block font-ibm-mono text-[11px] text-[#5a6a78]/60 uppercase tracking-[0.15em] mb-2">
                      Designation
                    </label>
                    <input
                      type="text"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value.toUpperCase())}
                      placeholder="CA-1"
                      className={`${inputCls} text-lg tracking-wider`}
                      autoComplete="off"
                      autoFocus
                    />
                  </div>

                  <div className="mb-6">
                    <label className="block font-ibm-mono text-[11px] text-[#5a6a78]/60 uppercase tracking-[0.15em] mb-2">
                      Security Pin
                    </label>
                    <input
                      type="password"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="****"
                      maxLength={8}
                      className={`${inputCls} text-lg tracking-[0.5em]`}
                    />
                  </div>
                </>
              ) : mode === 'register' ? (
                <>
                  <div className="mb-4">
                    <label className="block font-ibm-mono text-[11px] text-[#5a6a78]/60 uppercase tracking-[0.15em] mb-2">
                      Class Code
                    </label>
                    <input
                      type="text"
                      value={regClassCode}
                      onChange={(e) => setRegClassCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                      placeholder="ALPHA1"
                      maxLength={6}
                      className={`${inputCls} text-lg tracking-[0.3em]`}
                      autoComplete="off"
                      autoFocus
                    />
                    <p className="font-ibm-mono text-[#5a6a78]/35 text-[10px] mt-1 tracking-wider">
                      PROVIDED BY YOUR INSTRUCTOR
                    </p>
                  </div>

                  <div className="mb-4">
                    <label className="block font-ibm-mono text-[11px] text-[#5a6a78]/60 uppercase tracking-[0.15em] mb-2">
                      Designated Sign-In
                    </label>
                    <input
                      type="text"
                      value={regDesignation}
                      onChange={(e) => setRegDesignation(e.target.value.toUpperCase())}
                      placeholder="CA-33"
                      className={`${inputCls} text-lg tracking-wider`}
                      autoComplete="off"
                    />
                  </div>

                  <div className="mb-4 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-ibm-mono text-[11px] text-[#5a6a78]/60 uppercase tracking-[0.15em] mb-2">
                        Student A Name
                      </label>
                      <input
                        type="text"
                        value={regStudentAName}
                        onChange={(e) => setRegStudentAName(e.target.value)}
                        placeholder="Your name"
                        className={`${inputCls} text-base tracking-wider`}
                      />
                    </div>
                    <div>
                      <label className="block font-ibm-mono text-[11px] text-[#5a6a78]/60 uppercase tracking-[0.15em] mb-2">
                        Student B <span className="opacity-50">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={regStudentBName}
                        onChange={(e) => setRegStudentBName(e.target.value)}
                        placeholder="Partner name"
                        className={`${inputCls} text-base tracking-wider`}
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block font-ibm-mono text-[11px] text-[#5a6a78]/60 uppercase tracking-[0.15em] mb-2">
                      Choose PIN (4-8 digits)
                    </label>
                    <input
                      type="password"
                      value={regPin}
                      onChange={(e) => setRegPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                      placeholder="****"
                      maxLength={8}
                      className={`${inputCls} text-lg tracking-[0.5em]`}
                    />
                  </div>

                  <div className="mb-6">
                    <label className="block font-ibm-mono text-[11px] text-[#5a6a78]/60 uppercase tracking-[0.15em] mb-2">
                      Confirm PIN
                    </label>
                    <input
                      type="password"
                      value={regPinConfirm}
                      onChange={(e) => setRegPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 8))}
                      placeholder="****"
                      maxLength={8}
                      className={`${inputCls} text-lg tracking-[0.5em] ${
                        pinMismatch ? '!border-neon-pink/40 focus:!border-neon-pink focus:!ring-neon-pink/20' : ''
                      }`}
                    />
                    {pinMismatch && (
                      <p className="font-ibm-mono text-neon-pink text-xs mt-1">PINs do not match</p>
                    )}
                  </div>
                </>
              ) : mode === 'teacher' ? (
                <>
                  <div className="mb-4">
                    <label className="block font-ibm-mono text-[11px] text-[#5a6a78]/60 uppercase tracking-[0.15em] mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="teacher"
                      className={`${inputCls} text-lg tracking-wider`}
                      autoComplete="username"
                      autoFocus
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block font-ibm-mono text-[11px] text-[#5a6a78]/60 uppercase tracking-[0.15em] mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`${inputCls} text-lg`}
                      autoComplete="current-password"
                    />
                  </div>

                  <div className="mb-6 text-center">
                    <button
                      type="button"
                      onClick={() => setMode('teacher-register')}
                      className="font-ibm-mono text-[11px] text-[#2D8A6E]/60 hover:text-[#2D8A6E] tracking-wider transition-colors"
                    >
                      NEW DIRECTOR? REGISTER HERE
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-4">
                    <label className="block font-ibm-mono text-[11px] text-[#5a6a78]/60 uppercase tracking-[0.15em] mb-2">
                      Registration Code
                    </label>
                    <input
                      type="text"
                      value={tRegCode}
                      onChange={(e) => setTRegCode(e.target.value)}
                      placeholder="Provided by administrator"
                      className={`${inputCls} text-base tracking-wider`}
                      autoComplete="off"
                      autoFocus
                    />
                    <p className="font-ibm-mono text-[#5a6a78]/35 text-[10px] mt-1 tracking-wider">
                      CONTACT YOUR ADMINISTRATOR FOR ACCESS
                    </p>
                  </div>

                  <div className="mb-4">
                    <label className="block font-ibm-mono text-[11px] text-[#5a6a78]/60 uppercase tracking-[0.15em] mb-2">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={tRegDisplayName}
                      onChange={(e) => setTRegDisplayName(e.target.value)}
                      placeholder="Director Wells"
                      className={`${inputCls} text-base tracking-wider`}
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block font-ibm-mono text-[11px] text-[#5a6a78]/60 uppercase tracking-[0.15em] mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={tRegUsername}
                      onChange={(e) => setTRegUsername(e.target.value)}
                      placeholder="Choose a username"
                      className={`${inputCls} text-base tracking-wider`}
                      autoComplete="off"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block font-ibm-mono text-[11px] text-[#5a6a78]/60 uppercase tracking-[0.15em] mb-2">
                      Password (min 6 chars)
                    </label>
                    <input
                      type="password"
                      value={tRegPassword}
                      onChange={(e) => setTRegPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`${inputCls} text-lg`}
                      autoComplete="new-password"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block font-ibm-mono text-[11px] text-[#5a6a78]/60 uppercase tracking-[0.15em] mb-2">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={tRegPasswordConfirm}
                      onChange={(e) => setTRegPasswordConfirm(e.target.value)}
                      placeholder="••••••••"
                      className={`${inputCls} text-lg ${
                        tPasswordMismatch ? '!border-neon-pink/40 focus:!border-neon-pink focus:!ring-neon-pink/20' : ''
                      }`}
                      autoComplete="new-password"
                    />
                    {tPasswordMismatch && (
                      <p className="font-ibm-mono text-neon-pink text-xs mt-1">Passwords do not match</p>
                    )}
                  </div>

                  <div className="mb-6 text-center">
                    <button
                      type="button"
                      onClick={() => setMode('teacher')}
                      className="font-ibm-mono text-[11px] text-[#2D8A6E]/60 hover:text-[#2D8A6E] tracking-wider transition-colors"
                    >
                      ALREADY REGISTERED? LOG IN
                    </button>
                  </div>
                </>
              )}

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 border border-[#FCE4EC] bg-[#FCE4EC]/40 rounded-xl">
                  <p className="font-ibm-mono text-[#c0392b] text-xs text-center tracking-wider">
                    ACCESS DENIED: {error.toUpperCase()}
                  </p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !canSubmit}
                className="w-full py-3.5 bg-[#2D8A6E] text-white font-ibm-mono text-sm uppercase tracking-[0.3em] rounded-full hover:bg-[#258060] transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_2px_12px_rgba(45,138,110,0.2)]"
              >
                {loading ? (
                  <span className="animate-pulse">
                    {mode === 'register' || mode === 'teacher-register' ? 'REGISTERING...' : 'AUTHENTICATING...'}
                  </span>
                ) : mode === 'register' ? (
                  'REGISTER PAIR'
                ) : mode === 'teacher-register' ? (
                  'REGISTER DIRECTOR'
                ) : (
                  'AUTHENTICATE'
                )}
              </button>

              {/* Footer warning */}
              <div className="mt-6 pt-4 border-t border-[#E1BEE7]/30">
                <p className="text-center font-ibm-mono text-[#5a6a78]/30 text-[10px] leading-relaxed tracking-wider">
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
