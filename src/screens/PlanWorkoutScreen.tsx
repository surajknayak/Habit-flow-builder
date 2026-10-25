import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BellRing,
  ChevronRight,
  Clock,
  Flame,
  Footprints,
  Hourglass,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Illustration } from '../components/Illustration';
import {
  BottomSheet,
  FloatingChip,
  NumberPillPicker,
  PrimaryButton,
} from '../components/ui';
import { pickBestResetNow, WORKOUTS } from '../lib/planEngine';

export const PlanWorkoutScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    profile,
    schedule,
    logs,
    pain,
    workoutPrefs,
    setWorkoutPrefs,
  } = useApp();

  const [editSheet, setEditSheet] = useState<
    'cycle' | 'warmup' | 'audio' | null
  >(null);

  const workout =
    WORKOUTS.find((w) => w.id === id) || WORKOUTS[0];

  const isStrengthOrMobility =
    workout.theme === 'strength' ||
    workout.theme === 'mobility' ||
    workout.theme === 'restore';

  const isWeekend = [0, 6].includes(new Date().getDay());
  const recommendedMin = isWeekend
    ? schedule?.weekendMinutes || 30
    : schedule?.weekdayMinutes || 20;

  const selectedMin = workoutPrefs.durationMin;

  const handleQuickChoice = (choice: '3min' | '5min' | 'full') => {
    if (choice === 'full') return;
    if (profile) {
      const bestReset = pickBestResetNow(profile, logs, pain);
      navigate(`/player/${bestReset.id}?min=${choice === '5min' ? 5 : 3}`);
    } else {
      navigate('/player/desk-reset');
    }
  };

  const cycleTotalSec = workoutPrefs.jogSec + workoutPrefs.walkSec;
  const cycleMin = Math.floor(cycleTotalSec / 60);
  const cycleRemSec = String(cycleTotalSec % 60).padStart(2, '0');

  return (
    <div className="min-h-screen pb-32 px-5 pt-4 flex flex-col justify-between">
      <div>
        {/* Top bar: back arrow (left), centred title "Plan your workout" (22/800) */}
        <div className="relative flex items-center justify-center h-12">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="tap-scale absolute left-0 w-12 h-12 rounded-full bg-white/90 dark:bg-slate-800/90 flex items-center justify-center shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[22px] font-extrabold font-display text-center">
            Plan your workout
          </h1>
        </div>

        {/* 1. Quick choices row (chips, margin top 12) */}
        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => handleQuickChoice('3min')}
            className="tap-scale h-10 px-4 rounded-full text-[14px] font-semibold bg-white/80 dark:bg-slate-800/80 cursor-pointer"
          >
            3 min reset
          </button>
          <button
            type="button"
            onClick={() => handleQuickChoice('5min')}
            className="tap-scale h-10 px-4 rounded-full text-[14px] font-semibold bg-white/80 dark:bg-slate-800/80 cursor-pointer"
          >
            5 min reset
          </button>
          <button
            type="button"
            onClick={() => handleQuickChoice('full')}
            className="tap-scale h-10 px-4 rounded-full text-[14px] font-bold cursor-pointer"
            style={{
              backgroundColor: 'var(--primary)',
              color: 'var(--on-primary)',
            }}
          >
            Full workout
          </button>
        </div>

        {/* 2. Round illustration (190 px circle with 6 px mint-to-sky gradient ring) */}
        <div className="mt-5 flex flex-col items-center">
          <div
            className="w-[190px] h-[190px] rounded-full p-[6px] shadow-md"
            style={{
              background:
                'linear-gradient(135deg, var(--mint) 0%, var(--primary) 100%)',
            }}
          >
            <Illustration
              name="hero-workout"
              category="coral"
              className="w-full h-full rounded-full"
              alt={workout.title}
            />
          </div>

          <FloatingChip
            icon={<Clock className="w-4 h-4" style={{ color: 'var(--primary)' }} />}
            className="-mt-4 relative z-10"
          >
            {selectedMin} min
          </FloatingChip>
        </div>

        {/* 3. Minutes card (glass; shown once) */}
        <section className="mt-4 glass-card space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hourglass
                className="w-5 h-5"
                style={{ color: 'var(--primary)' }}
              />
              <span className="text-[18px] font-bold font-display">Minutes</span>
            </div>
            <span
              className="text-[14px] font-semibold"
              style={{ color: 'var(--primary)' }}
            >
              {selectedMin} min selected
            </span>
          </div>

          <NumberPillPicker
            options={[10, 20, 30, 45]}
            value={selectedMin}
            onChange={(val) =>
              setWorkoutPrefs((prev) => ({ ...prev, durationMin: val }))
            }
          />

          <hr className="border-slate-200/70 dark:border-slate-700/70" />

          <p className="text-[14px]" style={{ color: 'var(--text-soft)' }}>
            Recommended: {recommendedMin} min, based on your{' '}
            {isWeekend ? 'weekend' : 'weekday'} window.
          </p>
        </section>

        {/* 4. Three rows (glass, height at least 72, radius 28, text wraps to two lines) */}
        <div className="mt-4 space-y-3">
          {/* Row 1 */}
          <button
            type="button"
            onClick={() => setEditSheet('cycle')}
            className="tap-scale w-full min-h-[72px] glass-card !p-4 flex items-center justify-between gap-3 text-left cursor-pointer"
          >
            <div
              className="w-11 h-11 rounded-[16px] flex items-center justify-center shrink-0"
              style={{
                backgroundColor: 'var(--primary-soft)',
                color: 'var(--primary)',
              }}
            >
              <Footprints className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-[16px] font-bold font-display leading-snug">
                {isStrengthOrMobility ? 'Rounds and rest' : 'Move and easy time'}
              </div>
              <div
                className="text-[13px] leading-snug mt-0.5"
                style={{ color: 'var(--text-soft)' }}
              >
                {isStrengthOrMobility
                  ? `Steady pace through each circuit move`
                  : `Jog ${Math.round(workoutPrefs.jogSec / 60)} min, walk ${Math.round(
                      workoutPrefs.walkSec / 60
                    )} min`}
              </div>
            </div>

            <span
              className="text-[14px] font-bold shrink-0 text-right"
              style={{ color: 'var(--primary)' }}
            >
              {isStrengthOrMobility
                ? `${workoutPrefs.rounds} rounds, ${workoutPrefs.restSec} sec rest`
                : `${cycleMin}:${cycleRemSec} per cycle`}
            </span>

            <span className="w-9 h-9 rounded-full bg-white/80 dark:bg-slate-800/80 flex items-center justify-center shrink-0">
              <ChevronRight className="w-4 h-4" />
            </span>
          </button>

          {/* Row 2 */}
          <button
            type="button"
            onClick={() => setEditSheet('warmup')}
            className="tap-scale w-full min-h-[72px] glass-card !p-4 flex items-center justify-between gap-3 text-left cursor-pointer"
          >
            <div
              className="w-11 h-11 rounded-[16px] flex items-center justify-center shrink-0"
              style={{
                backgroundColor: 'var(--coral-soft)',
                color: 'var(--coral)',
              }}
            >
              <Flame className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-[16px] font-bold font-display leading-snug">
                Warm-up and cool-down
              </div>
              <div
                className="text-[13px] leading-snug mt-0.5"
                style={{ color: 'var(--text-soft)' }}
              >
                Brisk walk and gentle stretches
              </div>
            </div>

            <span
              className="text-[14px] font-bold shrink-0 text-right"
              style={{ color: 'var(--mint-dark)' }}
            >
              {workoutPrefs.warmupMin} min each
            </span>

            <span className="w-9 h-9 rounded-full bg-white/80 dark:bg-slate-800/80 flex items-center justify-center shrink-0">
              <ChevronRight className="w-4 h-4" />
            </span>
          </button>

          {/* Row 3 */}
          <button
            type="button"
            onClick={() => setEditSheet('audio')}
            className="tap-scale w-full min-h-[72px] glass-card !p-4 flex items-center justify-between gap-3 text-left cursor-pointer"
          >
            <div
              className="w-11 h-11 rounded-[16px] flex items-center justify-center shrink-0"
              style={{
                backgroundColor: 'var(--lavender-soft)',
                color: 'var(--lavender)',
              }}
            >
              <BellRing className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-[16px] font-bold font-display leading-snug">
                Audio cues
              </div>
              <div
                className="text-[13px] leading-snug mt-0.5"
                style={{ color: 'var(--text-soft)' }}
              >
                Vibration and chime
              </div>
            </div>

            <span
              className="text-[14px] font-bold shrink-0 text-right"
              style={{ color: 'var(--primary)' }}
            >
              {workoutPrefs.audioCue}
            </span>

            <span className="w-9 h-9 rounded-full bg-white/80 dark:bg-slate-800/80 flex items-center justify-center shrink-0">
              <ChevronRight className="w-4 h-4" />
            </span>
          </button>
        </div>
      </div>

      {/* 5. Bottom fixed primary button */}
      <div className="fixed bottom-5 left-0 right-0 z-30 mx-auto max-w-[430px] px-5">
        <PrimaryButton
          leadingPlay
          onClick={() =>
            navigate(
              `/player/workout-${workout.id}?min=${selectedMin}`
            )
          }
        >
          Start {selectedMin} min workout
        </PrimaryButton>
      </div>

      {/* Edit Sheets */}
      <BottomSheet
        open={editSheet === 'cycle'}
        onClose={() => setEditSheet(null)}
        title={isStrengthOrMobility ? 'Rounds and rest' : 'Move and easy time'}
      >
        {isStrengthOrMobility ? (
          <div className="space-y-4">
            <div>
              <label className="block text-[14px] font-semibold mb-1">
                Rounds ({workoutPrefs.rounds})
              </label>
              <input
                type="range"
                min={1}
                max={5}
                value={workoutPrefs.rounds}
                onChange={(e) =>
                  setWorkoutPrefs((prev) => ({
                    ...prev,
                    rounds: parseInt(e.target.value, 10),
                  }))
                }
                className="w-full accent-sky-500"
              />
            </div>
            <div>
              <label className="block text-[14px] font-semibold mb-1">
                Rest between rounds ({workoutPrefs.restSec} sec)
              </label>
              <input
                type="range"
                min={15}
                max={60}
                step={15}
                value={workoutPrefs.restSec}
                onChange={(e) =>
                  setWorkoutPrefs((prev) => ({
                    ...prev,
                    restSec: parseInt(e.target.value, 10),
                  }))
                }
                className="w-full accent-sky-500"
              />
            </div>
            <PrimaryButton onClick={() => setEditSheet(null)}>Done</PrimaryButton>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-[14px] font-semibold mb-1">
                Jog / brisk interval ({Math.round(workoutPrefs.jogSec / 60)} min)
              </label>
              <input
                type="range"
                min={60}
                max={240}
                step={60}
                value={workoutPrefs.jogSec}
                onChange={(e) =>
                  setWorkoutPrefs((prev) => ({
                    ...prev,
                    jogSec: parseInt(e.target.value, 10),
                  }))
                }
                className="w-full accent-sky-500"
              />
            </div>
            <div>
              <label className="block text-[14px] font-semibold mb-1">
                Easy walk interval ({Math.round(workoutPrefs.walkSec / 60)} min)
              </label>
              <input
                type="range"
                min={60}
                max={240}
                step={60}
                value={workoutPrefs.walkSec}
                onChange={(e) =>
                  setWorkoutPrefs((prev) => ({
                    ...prev,
                    walkSec: parseInt(e.target.value, 10),
                  }))
                }
                className="w-full accent-sky-500"
              />
            </div>
            <PrimaryButton onClick={() => setEditSheet(null)}>Done</PrimaryButton>
          </div>
        )}
      </BottomSheet>

      <BottomSheet
        open={editSheet === 'warmup'}
        onClose={() => setEditSheet(null)}
        title="Warm-up and cool-down"
      >
        <div className="space-y-3">
          {[3, 5].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setWorkoutPrefs((prev) => ({ ...prev, warmupMin: m }));
                setEditSheet(null);
              }}
              className="w-full h-12 px-4 rounded-[16px] flex items-center justify-between font-semibold cursor-pointer"
              style={{
                backgroundColor:
                  workoutPrefs.warmupMin === m
                    ? 'var(--primary-soft)'
                    : 'var(--row)',
              }}
            >
              <span>{m} minutes each</span>
              {workoutPrefs.warmupMin === m && <span>Selected</span>}
            </button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet
        open={editSheet === 'audio'}
        onClose={() => setEditSheet(null)}
        title="Audio cues"
      >
        <div className="space-y-2.5">
          {(['Soft chime', 'Voice', 'Vibration', 'Off'] as const).map((cue) => (
            <button
              key={cue}
              type="button"
              onClick={() => {
                setWorkoutPrefs((prev) => ({ ...prev, audioCue: cue }));
                setEditSheet(null);
              }}
              className="w-full h-12 px-4 rounded-[16px] flex items-center justify-between font-semibold cursor-pointer"
              style={{
                backgroundColor:
                  workoutPrefs.audioCue === cue
                    ? 'var(--primary-soft)'
                    : 'var(--row)',
              }}
            >
              <span>{cue}</span>
              {workoutPrefs.audioCue === cue && <span>Selected</span>}
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
};
