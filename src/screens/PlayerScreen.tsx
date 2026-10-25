import React, { useEffect, useId, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Info,
  Pause,
  Play,
  Repeat,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Illustration } from '../components/Illustration';
import { BottomSheet, PrimaryButton } from '../components/ui';
import {
  playSoftChime,
  requestScreenWakeLock,
  speakCue,
  stopSpeech,
  triggerHapticTick,
} from '../lib/audioCoach';
import {
  getSafeMovesForSession,
  MOVES,
  SESSIONS,
  WORKOUTS,
} from '../lib/planEngine';
import { Move } from '../types';

export const PlayerScreen: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const planItemId = searchParams.get('itemId') || undefined;
  const customMin = parseInt(searchParams.get('min') || '0', 10);

  const navigate = useNavigate();
  const {
    profile,
    meta,
    pain,
    workoutPrefs,
    completeSession,
    showToast,
  } = useApp();

  const isWorkout = Boolean(sessionId?.startsWith('workout-'));
  const rawId = isWorkout
    ? sessionId!.replace('workout-', '')
    : sessionId || 'desk-reset';

  const sessionObj = useMemo(
    () => SESSIONS.find((s) => s.id === rawId) || SESSIONS[0],
    [rawId]
  );

  const workoutObj = useMemo(
    () => WORKOUTS.find((w) => w.id === rawId) || WORKOUTS[0],
    [rawId]
  );

  // Build sequence of moves or blocks
  const sequence: Move[] = useMemo(() => {
    if (!isWorkout) {
      if (profile) {
        return getSafeMovesForSession(
          sessionObj,
          profile,
          meta.disabledMoveIds || [],
          pain
        );
      }
      return sessionObj.moves
        .map((mId) => MOVES.find((m) => m.id === mId))
        .filter((m): m is Move => Boolean(m));
    }

    // Build workout blocks from template
    const totalMinutes = customMin || workoutPrefs.durationMin || 20;
    const warmupMin = totalMinutes === 10 ? 3 : workoutPrefs.warmupMin || 5;
    const blocks: Move[] = [
      {
        id: 'warmup-block',
        title: 'Warm-up walk & reach',
        focus: 'Whole body warm-up',
        twoSided: false,
        durationSec: warmupMin * 60,
        instruction:
          'Start with an easy brisk walk and gentle shoulder rolls to warm your joints.',
        dontCue: "Don't rush your pace during warm-up.",
        avoidFor: [],
      },
    ];

    if (workoutObj.main.pattern && workoutObj.main.pattern.length > 0) {
      workoutObj.main.pattern.forEach((p, idx) => {
        blocks.push({
          id: `block-${idx + 1}`,
          title: p.label,
          focus: workoutObj.title,
          twoSided: false,
          durationSec: p.sec,
          instruction:
            workoutObj.cues?.[0] ||
            'Keep a steady, talk-test pace where you can speak comfortably.',
          dontCue:
            workoutObj.cues?.[1] ||
            "Don't clench your fists or hunch your shoulders.",
          avoidFor: [],
        });
      });
    } else if (workoutObj.main.moves && workoutObj.main.moves.length > 0) {
      workoutObj.main.moves.forEach((mLabel, idx) => {
        blocks.push({
          id: `circuit-${idx + 1}`,
          title: mLabel,
          focus: workoutObj.title,
          twoSided: mLabel.toLowerCase().includes('each side'),
          durationSec: 45,
          instruction:
            workoutObj.cues?.[0] ||
            'Move with smooth control and steady breathing.',
          dontCue:
            "Don't push into sharp discomfort or hold your breath.",
          avoidFor: [],
        });
      });
    } else {
      blocks.push({
        id: 'outdoor-main',
        title: workoutObj.title,
        focus: 'Steady outdoor pace',
        twoSided: false,
        durationSec: Math.max(5, totalMinutes - warmupMin * 2) * 60,
        instruction:
          workoutObj.main.note ||
          'Move at a steady, comfortable pace and enjoy your surroundings.',
        dontCue: "Don't ignore uneven ground or skip water breaks.",
        avoidFor: [],
      });
    }

    blocks.push({
      id: 'cooldown-block',
      title: 'Cool-down & slow breaths',
      focus: 'Recovery',
      twoSided: false,
      durationSec: warmupMin * 60,
      instruction:
        'Slow your pace and let your breathing settle comfortably.',
      dontCue: "Don't stop abruptly without cooling down.",
      avoidFor: [],
    });

    return blocks;
  }, [isWorkout, profile, sessionObj, meta.disabledMoveIds, pain, customMin, workoutPrefs, workoutObj]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentMove = sequence[currentIndex] || sequence[0];
  const nextMove = sequence[currentIndex + 1] || null;

  const [secondsLeft, setSecondsLeft] = useState(
    currentMove?.durationSec || 30
  );
  const [paused, setPaused] = useState(false);
  const [soundOn, setSoundOn] = useState(
    workoutPrefs.audioCue !== 'Off'
  );
  const [endSheetOpen, setEndSheetOpen] = useState(false);
  const [switchedHalfway, setSwitchedHalfway] = useState(false);

  const ringGradId = useId();

  // Wake Lock
  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null;
    requestScreenWakeLock().then((s) => {
      sentinel = s;
    });
    return () => {
      sentinel?.release().catch(() => {});
      stopSpeech();
    };
  }, []);

  // Reset move timer and speak cue when move changes
  useEffect(() => {
    if (!currentMove) return;
    setSecondsLeft(currentMove.durationSec);
    setSwitchedHalfway(false);
    if (soundOn) {
      playSoftChime();
      speakCue(
        `${currentMove.title}. ${currentMove.instruction}`,
        workoutPrefs.audioCue === 'Voice' || soundOn
      );
    }
  }, [currentIndex, currentMove, soundOn, workoutPrefs.audioCue]);

  const handleFinishSession = async () => {
    stopSpeech();
    const totalSec = sequence.reduce((acc, m) => acc + m.durationSec, 0);
    const log = await completeSession({
      planItemId,
      kind: isWorkout
        ? 'workout'
        : rawId === 'posture-session'
        ? 'posture'
        : 'reset',
      refId: rawId,
      title: isWorkout ? workoutObj.title : sessionObj.title,
      durationSec: totalSec,
      movesCount: sequence.length,
    });
    navigate(`/complete/${log.id}?moveId=${currentMove?.id || ''}`, {
      replace: true,
    });
  };

  // Countdown tick
  useEffect(() => {
    if (paused || endSheetOpen || !currentMove) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (currentIndex + 1 < sequence.length) {
            setCurrentIndex((i) => i + 1);
          } else {
            clearInterval(timer);
            handleFinishSession();
          }
          return 0;
        }

        const nextVal = prev - 1;
        // Halfway switch sides notification for twoSided moves
        if (
          currentMove.twoSided &&
          !switchedHalfway &&
          nextVal === Math.floor(currentMove.durationSec / 2)
        ) {
          setSwitchedHalfway(true);
          showToast('Switch sides');
          triggerHapticTick();
          if (soundOn) {
            playSoftChime();
            speakCue('Switch sides', true);
          }
        }
        return nextVal;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [
    paused,
    endSheetOpen,
    currentMove,
    currentIndex,
    sequence.length,
    switchedHalfway,
    soundOn,
  ]);

  const handleSwitchSideEarly = () => {
    if (currentMove.twoSided && !switchedHalfway) {
      setSwitchedHalfway(true);
      setSecondsLeft(Math.max(5, Math.floor(currentMove.durationSec / 2)));
      showToast('Switch sides');
      triggerHapticTick();
      if (soundOn) {
        playSoftChime();
        speakCue('Switch sides', true);
      }
    } else {
      // Skip move
      if (currentIndex + 1 < sequence.length) {
        setCurrentIndex((i) => i + 1);
      } else {
        handleFinishSession();
      }
    }
  };

  const totalSec = currentMove?.durationSec || 30;
  const ringProgress = totalSec > 0 ? secondsLeft / totalSec : 0;
  const ringSize = 220;
  const ringStroke = 16;
  const radius = (ringSize - ringStroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - ringProgress);

  const mins = Math.floor(secondsLeft / 60);
  const secs = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div className="min-h-screen px-5 pt-3 pb-8 flex flex-col justify-between select-none">
      <div>
        {/* Single top row (margin top 12) */}
        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setPaused(true);
              setEndSheetOpen(true);
            }}
            aria-label="End session"
            className="tap-scale w-12 h-12 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="h-10 px-4 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: '#0A5C80' }}
            />
            <span className="text-[16px] font-bold font-display tabular-nums">
              {isWorkout ? 'Block' : 'Move'} {currentIndex + 1} of{' '}
              {sequence.length}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setSoundOn((v) => {
                if (v) stopSpeech();
                return !v;
              });
            }}
            aria-label={soundOn ? 'Mute audio coach' : 'Turn on audio coach'}
            className="tap-scale w-12 h-12 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm cursor-pointer"
          >
            {soundOn ? (
              <Volume2 className="w-5 h-5" />
            ) : (
              <VolumeX className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Row of {n} progress dots/segments (margin top 8) */}
        <div className="mt-2 flex items-center gap-1.5">
          {sequence.map((m, idx) => {
            const isDone = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            return (
              <div
                key={m.id + idx}
                className={`h-1 rounded-full transition-all duration-300 ${
                  isCurrent ? 'flex-[2]' : 'flex-1'
                }`}
                style={{
                  backgroundColor: isDone
                    ? 'var(--mint)'
                    : isCurrent
                    ? 'var(--primary)'
                    : 'rgba(15, 42, 58, 0.15)',
                }}
              />
            );
          })}
        </div>

        {/* Move card (glass, radius 28, padding 14, margin top 16) */}
        <div className="mt-4 relative">
          <div
            className={`glass-card !p-[14px] transition-opacity duration-200 ${
              paused ? 'opacity-60' : 'opacity-100'
            }`}
          >
            <div className="relative aspect-[1.45] w-full rounded-[20px] overflow-hidden">
              <div className="w-full h-full animate-breathe">
                <Illustration
                  name={`moves/${currentMove.id}`}
                  category={sessionObj.category}
                  className="w-full h-full"
                  alt={currentMove.title}
                />
              </div>

              {/* Focus chip bottom-left */}
              <div
                className="absolute bottom-3 left-3 h-8 px-3 rounded-full flex items-center gap-2 text-[14px] font-semibold shadow-xs"
                style={{
                  backgroundColor: 'var(--surface-pill)',
                  color: 'var(--text)',
                }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: 'var(--primary)' }}
                />
                <span>Focus: {currentMove.focus}</span>
              </div>
            </div>
          </div>

          {/* Pause overlay */}
          {paused && !endSheetOpen && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 z-20">
              <PrimaryButton
                leadingPlay
                onClick={() => setPaused(false)}
              >
                Resume
              </PrimaryButton>
              <button
                type="button"
                onClick={() => setEndSheetOpen(true)}
                className="py-2 px-4 rounded-full bg-white/90 dark:bg-slate-900/90 text-[15px] font-bold cursor-pointer"
                style={{ color: 'var(--caution)' }}
              >
                End session
              </button>
            </div>
          )}
        </div>

        {/* Centred move name, instruction, caution pill, and Up next */}
        <div className="mt-4 text-center space-y-3">
          <h1 className="text-[28px] font-extrabold font-display leading-tight">
            {currentMove.title}
          </h1>

          <p
            className="text-[17px] leading-snug max-w-[340px] mx-auto line-clamp-3"
            style={{ color: 'var(--text-soft)' }}
          >
            {currentMove.instruction}
          </p>

          {/* Caution pill */}
          <div
            className="w-full rounded-full px-[18px] py-[12px] flex items-center justify-center gap-2 text-left"
            style={{
              backgroundColor: 'var(--caution-soft)',
              border: '1.5px solid rgba(229, 83, 61, 0.35)',
            }}
          >
            <Info
              className="w-4 h-4 shrink-0"
              style={{ color: 'var(--caution)' }}
            />
            <span className="text-[13px] font-semibold leading-snug">
              {currentMove.dontCue}
            </span>
          </div>

          {nextMove && (
            <div className="inline-flex items-center px-3.5 py-1 rounded-full bg-white/75 dark:bg-slate-800/75 text-[14px]">
              <span style={{ color: 'var(--text-soft)' }}>Up next:&nbsp;</span>
              <strong className="font-bold">{nextMove.title}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Timer ring (margin top 24, diameter 220) */}
      <div className="mt-6 flex flex-col items-center">
        <div
          className="relative flex items-center justify-center"
          style={{ width: ringSize, height: ringSize }}
        >
          <svg width={ringSize} height={ringSize} className="-rotate-90">
            <defs>
              <linearGradient
                id={ringGradId}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="var(--primary)" />
                <stop offset="100%" stopColor="var(--mint)" />
              </linearGradient>
            </defs>
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke="rgba(46, 184, 245, 0.16)"
              strokeWidth={ringStroke}
            />
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke={`url(#${ringGradId})`}
              strokeWidth={ringStroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 300ms linear' }}
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="text-[13px] font-bold tracking-[0.08em] uppercase"
              style={{ color: 'var(--text-soft)' }}
            >
              TIME LEFT
            </span>
            <span
              className="text-[64px] font-extrabold tabular-nums font-display leading-none my-1"
              aria-live={secondsLeft % 10 === 0 ? 'polite' : 'off'}
            >
              {mins}:{secs}
            </span>
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? 'Resume timer' : 'Pause timer'}
              className="tap-scale mt-1 w-[56px] h-[56px] rounded-full flex items-center justify-center shadow-md cursor-pointer"
              style={{
                backgroundColor: 'var(--primary)',
                color: '#FFFFFF',
              }}
            >
              {paused ? (
                <Play className="w-6 h-6 ml-0.5 fill-white" />
              ) : (
                <Pause className="w-6 h-6 fill-white" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom row (margin top 24, three items evenly spread) */}
      <div className="mt-6 flex items-center justify-between gap-4">
        <button
          type="button"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          aria-label="Previous move"
          className="tap-scale w-[56px] h-[56px] rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm disabled:opacity-40 cursor-pointer"
        >
          <SkipBack className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={handleSwitchSideEarly}
          className="tap-scale flex-1 h-[56px] rounded-full bg-white dark:bg-slate-800 flex items-center justify-center gap-2 px-5 font-display text-[16px] font-bold shadow-sm cursor-pointer"
        >
          {currentMove.twoSided && !switchedHalfway ? (
            <>
              <Repeat className="w-4 h-4" />
              <span>Switch side</span>
            </>
          ) : (
            <span>Skip move</span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            if (currentIndex + 1 < sequence.length) {
              setCurrentIndex((i) => i + 1);
            } else {
              handleFinishSession();
            }
          }}
          aria-label="Next move"
          className="tap-scale w-[56px] h-[56px] rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm cursor-pointer"
        >
          <SkipForward className="w-5 h-5" />
        </button>
      </div>

      {/* End-session sheet */}
      <BottomSheet
        open={endSheetOpen}
        onClose={() => {
          setEndSheetOpen(false);
          setPaused(false);
        }}
        title="End session?"
      >
        <div className="space-y-4">
          <p className="text-[15px]" style={{ color: 'var(--text-soft)' }}>
            Your progress so far is saved.
          </p>
          <PrimaryButton
            onClick={() => {
              setEndSheetOpen(false);
              setPaused(false);
            }}
          >
            Keep going
          </PrimaryButton>
          <button
            type="button"
            onClick={() => {
              stopSpeech();
              navigate('/');
            }}
            className="w-full py-2.5 text-[16px] font-bold cursor-pointer"
            style={{ color: 'var(--caution)' }}
          >
            End
          </button>
        </div>
      </BottomSheet>
    </div>
  );
};
