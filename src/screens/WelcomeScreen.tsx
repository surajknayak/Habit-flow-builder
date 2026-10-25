import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Timer } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Illustration } from '../components/Illustration';
import { BottomSheet, FloatingChip } from '../components/ui';

export const WelcomeScreen: React.FC = () => {
  const { signInWithGoogle, continueAsGuest } = useApp();
  const navigate = useNavigate();
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null);
  const [busy, setBusy] = useState(false);

  const handleGoogle = async () => {
    setBusy(true);
    try {
      await signInWithGoogle();
      navigate('/onboarding/1');
    } finally {
      setBusy(false);
    }
  };

  const handleGuest = async () => {
    setBusy(true);
    try {
      await continueAsGuest();
      navigate('/onboarding/1');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between relative overflow-hidden">
      {/* Soft blurred background blobs */}
      <div
        className="pointer-events-none absolute -top-12 -left-12 w-60 h-60 rounded-full blur-3xl opacity-30"
        style={{ backgroundColor: 'var(--primary)' }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-28 -right-12 w-64 h-64 rounded-full blur-3xl opacity-30"
        style={{ backgroundColor: 'var(--lavender)' }}
        aria-hidden="true"
      />

      {/* Top-left Habit Flow logo tile + small caps brand text */}
      <header className="px-5 pt-5 pb-2 flex items-center gap-3 relative z-10">
        <div
          className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 shadow-sm"
          style={{
            background: 'linear-gradient(135deg, #27C8E8 0%, #2EB8F5 100%)',
          }}
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6">
            <circle
              cx="12"
              cy="12"
              r="7.5"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeDasharray="36 12"
            />
          </svg>
        </div>
        <span
          className="text-[12px] font-bold uppercase tracking-[0.08em] leading-none"
          style={{ color: 'var(--brand-label)' }}
        >
          HABIT FLOW
        </span>
      </header>

      <div className="px-5 pt-2 pb-4 flex-1 flex flex-col justify-center">
        <div className="relative rounded-[28px] overflow-hidden shadow-md">
          <Illustration
            name="hero-welcome"
            category="primary"
            className="w-full h-[220px]"
            alt="Friendly character stretching arms overhead in a pastel room with a plant and window"
          />
          <FloatingChip
            icon={<Timer className="w-4 h-4" style={{ color: 'var(--primary)' }} />}
            className="absolute top-4 left-4"
          >
            3 min
          </FloatingChip>
          <FloatingChip
            icon={<Sparkles className="w-4 h-4" style={{ color: 'var(--lavender)' }} />}
            className="absolute bottom-4 right-4"
          >
            Neck relief
          </FloatingChip>
        </div>

        <div className="mt-7 text-center px-2">
          <h1
            className="text-[32px] font-extrabold leading-[1.15] font-display"
            style={{ textWrap: 'balance' }}
          >
            Move a little. Feel a lot better.
          </h1>
          <p
            className="mt-2.5 text-[16px] leading-relaxed"
            style={{ color: 'var(--text-soft)' }}
          >
            Quick daily resets, made for your body.
          </p>
        </div>
      </div>

      {/* Bottom glass sheet */}
      <div className="glass-sheet p-6 pb-8 space-y-3">
        <button
          type="button"
          disabled={busy}
          onClick={handleGoogle}
          className="tap-scale w-full h-[56px] rounded-full flex items-center justify-center gap-3 px-5 font-display text-[18px] font-bold shadow-md cursor-pointer disabled:opacity-50"
          style={{
            backgroundColor: 'var(--primary)',
            color: 'var(--on-primary)',
          }}
        >
          <span className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
              />
            </svg>
          </span>
          <span>Continue with Google</span>
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={handleGuest}
          className="tap-scale w-full h-[56px] rounded-full flex items-center justify-center px-5 font-display text-[18px] font-bold border-2 bg-white/60 dark:bg-slate-900/50 cursor-pointer disabled:opacity-50"
          style={{
            borderColor: 'var(--primary)',
            color: 'var(--text)',
          }}
        >
          Continue as guest
        </button>

        <p
          className="text-center text-[12px] pt-1 leading-normal"
          style={{ color: 'var(--text-soft)' }}
        >
          By continuing you agree to the{' '}
          <button
            type="button"
            onClick={() => setLegalModal('terms')}
            className="underline font-semibold cursor-pointer"
          >
            Terms
          </button>{' '}
          and{' '}
          <button
            type="button"
            onClick={() => setLegalModal('privacy')}
            className="underline font-semibold cursor-pointer"
          >
            Privacy Policy
          </button>
          .
        </p>
      </div>

      <BottomSheet
        open={legalModal !== null}
        onClose={() => setLegalModal(null)}
        title={legalModal === 'terms' ? 'Terms of Use' : 'Privacy Policy'}
      >
        {legalModal === 'terms' ? (
          <div className="space-y-3 text-[14px]" style={{ color: 'var(--text-soft)' }}>
            <p>
              <strong>General wellness guidance, not medical advice.</strong>{' '}
              Habit Flow provides gentle, self-guided movement routines for daily
              comfort. It does not diagnose, treat, or replace professional medical care.
            </p>
            <p>
              Stop immediately and seek medical attention if you feel sharp pain,
              dizziness, numbness, or chest discomfort during any activity.
            </p>
          </div>
        ) : (
          <div className="space-y-3 text-[14px]" style={{ color: 'var(--text-soft)' }}>
            <p>
              <strong>Your data belongs to you.</strong> We store your onboarding
              preferences, daily plans, movement logs, and pain check-ins privately
              under your user ID in Firestore and cached on your device in IndexedDB.
            </p>
            <p>
              Your health details are never shared or sold. You can export all of
              your data as a single JSON file or permanently delete your account
              and data at any time from the <strong>Me</strong> tab.
            </p>
          </div>
        )}
      </BottomSheet>
    </div>
  );
};
