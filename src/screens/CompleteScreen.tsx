import React, { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Flame, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Illustration } from '../components/Illustration';
import { BottomSheet, PrimaryButton } from '../components/ui';
import { MOVES, SESSIONS } from '../lib/planEngine';
import { FeedbackType } from '../types';

export const CompleteScreen: React.FC = () => {
  const { logId } = useParams<{ logId: string }>();
  const [searchParams] = useSearchParams();
  const defaultMoveId = searchParams.get('moveId') || 'seated-cat-cow';

  const navigate = useNavigate();
  const {
    logs,
    streak,
    submitSessionFeedback,
    toggleMoveDisabled,
    showToast,
  } = useApp();

  const currentLog = logs.find((l) => l.id === logId) || logs[logs.length - 1];
  const isWorkout = currentLog?.kind === 'workout';

  const sessionObj = SESSIONS.find((s) => s.id === currentLog?.refId);
  const sessionMoves =
    sessionObj?.moves
      .map((id) => MOVES.find((m) => m.id === id))
      .filter(Boolean) || [];

  const [selectedFeedback, setSelectedFeedback] =
    useState<FeedbackType | null>(null);
  const [hurtSheetOpen, setHurtSheetOpen] = useState(false);
  const [hurtMoveId, setHurtMoveId] = useState(
    sessionMoves[0]?.id || defaultMoveId
  );

  const minutesToday = Math.max(
    3,
    Math.round(
      logs
        .filter((l) => l.date === currentLog?.date)
        .reduce((acc, l) => acc + l.durationSec, 0) / 60
    )
  );

  const sessionMin = Math.max(
    1,
    Math.round((currentLog?.durationSec || 180) / 60)
  );
  const sessionMovesCount = currentLog?.movesCount || 5;

  const handleFeedbackSelect = async (fb: FeedbackType) => {
    setSelectedFeedback(fb);
    if (!currentLog) return;
    if (fb === 'This hurt') {
      await submitSessionFeedback(currentLog.id, fb, hurtMoveId);
      setHurtSheetOpen(true);
    } else {
      await submitSessionFeedback(currentLog.id, fb);
      showToast('Thanks for your feedback!');
    }
  };

  return (
    <div className="min-h-screen px-5 py-8 flex flex-col justify-between relative overflow-hidden">
      {/* Sparkle burst under 1s */}
      <div
        className="pointer-events-none absolute top-16 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full flex items-center justify-center animate-sparkle"
        aria-hidden="true"
      >
        <Sparkles className="w-28 h-28" style={{ color: 'var(--sun)' }} />
      </div>

      <div className="space-y-5 text-center mt-4">
        {/* Streak chip with bounce */}
        <div className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-white dark:bg-slate-800 shadow-sm animate-bounce">
          <Flame
            className="w-4 h-4"
            style={{ color: 'var(--coral)', fill: 'var(--coral)' }}
          />
          <span className="text-[15px] font-extrabold tabular-nums font-display">
            {streak}-day streak
          </span>
        </div>

        {/* 120 px medal illustration */}
        <Illustration
          name="medal"
          category="mint"
          className="w-[120px] h-[120px] rounded-full mx-auto shadow-md"
          alt="Session complete medal"
        />

        <div>
          <h1 className="text-[32px] font-extrabold font-display">
            {isWorkout ? 'Workout done!' : 'Nice reset!'}
          </h1>
          <p
            className="text-[16px] mt-1"
            style={{ color: 'var(--text-soft)' }}
          >
            That&apos;s {minutesToday}{' '}
            {minutesToday === 1 ? 'minute' : 'minutes'} of movement today.
          </p>
        </div>

        {/* Three glass stat tiles in a row: Minutes, Moves, Streak */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="glass-card !p-3.5 text-center">
            <div className="text-[26px] font-extrabold tabular-nums font-display">
              {sessionMin}
            </div>
            <div
              className="text-[12px] font-semibold"
              style={{ color: 'var(--text-soft)' }}
            >
              Minutes
            </div>
          </div>

          <div className="glass-card !p-3.5 text-center">
            <div className="text-[26px] font-extrabold tabular-nums font-display">
              {sessionMovesCount}
            </div>
            <div
              className="text-[12px] font-semibold"
              style={{ color: 'var(--text-soft)' }}
            >
              Moves
            </div>
          </div>

          <div className="glass-card !p-3.5 text-center">
            <div className="text-[26px] font-extrabold tabular-nums font-display">
              {streak}
            </div>
            <div
              className="text-[12px] font-semibold"
              style={{ color: 'var(--text-soft)' }}
            >
              Streak
            </div>
          </div>
        </div>

        {/* How did that feel? */}
        <div className="glass-card space-y-3 text-left">
          <h2 className="text-[18px] font-bold font-display text-center">
            How did that feel?
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {(
              ['Too easy', 'Just right', 'Too hard', 'This hurt'] as const
            ).map((fb) => {
              const active = selectedFeedback === fb;
              const isHurt = fb === 'This hurt';
              return (
                <button
                  key={fb}
                  type="button"
                  onClick={() => handleFeedbackSelect(fb)}
                  className="tap-scale h-12 rounded-full text-[15px] font-bold border-2 cursor-pointer"
                  style={
                    isHurt
                      ? {
                          borderColor: 'var(--caution)',
                          backgroundColor: active
                            ? 'var(--caution-soft)'
                            : 'transparent',
                          color: 'var(--caution)',
                        }
                      : active
                      ? {
                          borderColor: 'var(--primary)',
                          backgroundColor: 'var(--primary-soft)',
                        }
                      : {
                          borderColor: 'transparent',
                          backgroundColor: 'var(--row)',
                        }
                  }
                >
                  {fb}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom buttons */}
      <div className="space-y-2.5 pt-6">
        <PrimaryButton onClick={() => navigate('/')}>
          Back to Today
        </PrimaryButton>
        <button
          type="button"
          onClick={() => navigate('/progress?logSheet=1')}
          className="w-full py-2.5 text-[15px] font-bold underline cursor-pointer"
          style={{ color: 'var(--text-soft)' }}
        >
          Log something else
        </button>
      </div>

      {/* "This hurt" confirmation sheet */}
      <BottomSheet
        open={hurtSheetOpen}
        onClose={() => setHurtSheetOpen(false)}
        title="Sorry about that."
      >
        <div className="space-y-4">
          <p className="text-[15px]" style={{ color: 'var(--text-soft)' }}>
            Sorry about that. We&apos;ll stop suggesting this move. You can
            re-enable it anytime in <strong>Me</strong>.
          </p>

          {sessionMoves.length > 1 && (
            <div>
              <label className="block text-[13px] font-semibold mb-1.5">
                Which move felt uncomfortable?
              </label>
              <select
                value={hurtMoveId}
                onChange={async (e) => {
                  const newId = e.target.value;
                  setHurtMoveId(newId);
                  if (currentLog) {
                    await submitSessionFeedback(
                      currentLog.id,
                      'This hurt',
                      newId
                    );
                  }
                }}
                className="w-full h-11 px-3 rounded-[14px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[14px]"
              >
                {sessionMoves.map((m) => (
                  <option key={m!.id} value={m!.id}>
                    {m!.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {sessionObj?.conditions?.[0] && (
            <button
              type="button"
              onClick={() => {
                setHurtSheetOpen(false);
                navigate(`/care/${sessionObj.conditions[0]}`);
              }}
              className="w-full py-2 text-left text-[14px] font-semibold underline cursor-pointer"
              style={{ color: 'var(--brand-label)' }}
            >
              View care tips for this area →
            </button>
          )}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={async () => {
                await toggleMoveDisabled(hurtMoveId);
                setSelectedFeedback(null);
                setHurtSheetOpen(false);
              }}
              className="h-12 rounded-full font-bold text-[15px] border border-slate-300 dark:border-slate-700 cursor-pointer"
            >
              Undo
            </button>
            <PrimaryButton onClick={() => setHurtSheetOpen(false)}>
              Okay
            </PrimaryButton>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
};
