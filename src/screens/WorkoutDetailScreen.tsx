import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Clock,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Illustration } from '../components/Illustration';
import {
  BottomSheet,
  FloatingChip,
  PrimaryButton,
} from '../components/ui';
import { WORKOUTS } from '../lib/planEngine';

export const WorkoutDetailScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    profile,
    todayDate,
    workoutPrefs,
    swapWorkoutForDate,
  } = useApp();

  const [expandedBlock, setExpandedBlock] = useState<number | null>(1);
  const [swapSheetOpen, setSwapSheetOpen] = useState(false);

  const workout =
    WORKOUTS.find((w) => w.id === id) || WORKOUTS[0];
  const durationMin = workoutPrefs.durationMin || 20;
  const warmupMin = durationMin === 10 ? 3 : 5;
  const mainMin = Math.max(4, durationMin - warmupMin * 2);

  // Two safe alternatives
  const safeAlternatives = WORKOUTS.filter(
    (w) =>
      w.id !== workout.id &&
      (w.id === 'brisk-walk' ||
        w.id === 'mobility-flow' ||
        w.id === 'ankle-strength')
  ).slice(0, 2);

  const blocks = [
    {
      title: `Warm-up · ${warmupMin} min`,
      subtitle: 'Easy walk, shoulder rolls, and gentle ankle circles',
      cues: [
        'Breathe smoothly through your nose.',
        'Start slower than you think you need.',
      ],
      needsCare: false,
    },
    {
      title: `${workout.title} · ${mainMin} min`,
      subtitle:
        workout.main.note ||
        workout.main.moves?.join(' · ') ||
        workout.main.pattern?.map((p) => `${p.label} (${p.sec}s)`).join(' · ') ||
        'Steady, comfortable movement',
      cues: workout.cues || [
        'Keep a conversational pace where you can speak in full sentences.',
        'Modify range of motion anytime.',
      ],
      needsCare: (profile?.conditions.length || 0) > 0,
    },
    {
      title: `Cool-down · ${warmupMin} min`,
      subtitle: 'Slow walk and deep belly breaths',
      cues: [
        'Let your heart rate come down gradually.',
        'Finish with two slow breaths.',
      ],
      needsCare: false,
    },
  ];

  return (
    <div className="min-h-screen px-5 pt-4 pb-10 flex flex-col justify-between">
      <div className="space-y-4">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="tap-scale w-12 h-12 rounded-full bg-white/90 dark:bg-slate-800/90 flex items-center justify-center shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => navigate(`/plan-workout/${workout.id}`)}
            className="tap-scale h-10 px-4 rounded-full bg-white/90 dark:bg-slate-800/90 flex items-center gap-1.5 text-[14px] font-semibold shadow-xs cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Plan minutes</span>
          </button>
        </div>

        {/* Hero illustration with chips */}
        <div className="relative h-[190px] rounded-[28px] overflow-hidden shadow-md">
          <Illustration
            name="hero-workout"
            category="coral"
            className="w-full h-full"
            alt={workout.title}
          />
          <FloatingChip
            icon={<Clock className="w-4 h-4" style={{ color: 'var(--primary)' }} />}
            className="absolute top-3 left-3"
          >
            {durationMin} min
          </FloatingChip>
          <FloatingChip
            icon={<Sparkles className="w-4 h-4" style={{ color: 'var(--coral)' }} />}
            className="absolute top-3 right-3"
          >
            {profile?.level || 'Starter'}
          </FloatingChip>
        </div>

        <div>
          <span
            className="inline-block px-3 py-0.5 rounded-full text-[12px] font-bold mb-1.5"
            style={{
              backgroundColor: 'var(--primary-soft)',
              color: 'var(--brand-label)',
            }}
          >
            {workout.tag}
          </span>
          <h1 className="text-[28px] font-extrabold font-display">
            {workout.title}
          </h1>
        </div>

        {/* Glass timeline card listing blocks */}
        <div className="glass-card space-y-3">
          <h2 className="text-[18px] font-bold font-display">
            Session timeline
          </h2>
          {blocks.map((block, idx) => {
            const expanded = expandedBlock === idx;
            return (
              <div
                key={block.title}
                className="rounded-[20px] p-3.5 transition-colors"
                style={{ backgroundColor: 'var(--row)' }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedBlock(expanded ? null : idx)
                  }
                  className="w-full flex items-center justify-between gap-2 text-left cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[16px] font-bold font-display">
                        {block.title}
                      </span>
                      {block.needsCare && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
                          style={{
                            backgroundColor: 'var(--caution-soft)',
                            color: 'var(--caution)',
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: 'var(--caution)' }}
                          />
                          Go gently
                        </span>
                      )}
                    </div>
                    <div
                      className="text-[13px] mt-0.5"
                      style={{ color: 'var(--text-soft)' }}
                    >
                      {block.subtitle}
                    </div>
                  </div>
                  {expanded ? (
                    <ChevronUp className="w-5 h-5 shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 shrink-0" />
                  )}
                </button>

                {expanded && (
                  <ul
                    className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1.5 text-[13px]"
                    style={{ color: 'var(--text-soft)' }}
                  >
                    {block.cues.map((c) => (
                      <li key={c} className="flex items-start gap-2">
                        <span
                          className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                          style={{ backgroundColor: 'var(--primary)' }}
                        />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom buttons & footnote */}
      <div className="space-y-3 pt-6">
        <PrimaryButton
          leadingPlay
          onClick={() =>
            navigate(`/player/workout-${workout.id}?min=${durationMin}`)
          }
        >
          Start
        </PrimaryButton>

        <button
          type="button"
          onClick={() => setSwapSheetOpen(true)}
          className="tap-scale w-full h-[52px] rounded-full border-2 font-display text-[16px] font-bold cursor-pointer"
          style={{
            borderColor: 'var(--primary)',
            color: 'var(--text)',
          }}
        >
          Swap this workout
        </button>

        <p
          className="text-center text-[13px] pt-1"
          style={{ color: 'var(--text-soft)' }}
        >
          Skip if you feel sharp pain.
        </p>
      </div>

      <BottomSheet
        open={swapSheetOpen}
        onClose={() => setSwapSheetOpen(false)}
        title="Choose a safe alternative"
      >
        <div className="space-y-3">
          {safeAlternatives.map((alt) => (
            <button
              key={alt.id}
              type="button"
              onClick={async () => {
                await swapWorkoutForDate(todayDate, alt.id);
                setSwapSheetOpen(false);
                navigate(`/workout/${alt.id}`, { replace: true });
              }}
              className="tap-scale w-full p-4 rounded-[20px] text-left flex items-center justify-between cursor-pointer"
              style={{ backgroundColor: 'var(--row)' }}
            >
              <div>
                <div className="text-[16px] font-bold font-display">
                  {alt.title}
                </div>
                <div
                  className="text-[13px]"
                  style={{ color: 'var(--text-soft)' }}
                >
                  {alt.tag} · Gentle &amp; joint-friendly
                </div>
              </div>
              <span
                className="text-[13px] font-bold"
                style={{ color: 'var(--primary)' }}
              >
                Select
              </span>
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
};
