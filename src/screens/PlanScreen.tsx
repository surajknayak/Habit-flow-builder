import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  RefreshCw,
  Shuffle,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  BottomNav,
  BottomSheet,
  getCategoryColors,
  getCategoryIcon,
  PrimaryButton,
  TabHeader,
} from '../components/ui';
import {
  formatDateYYYYMMDD,
  WORKOUTS,
} from '../lib/planEngine';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_THEME_LABELS: Record<string, string> = {
  Mon: 'Strength day',
  Tue: 'Brisk walk day',
  Wed: 'Mobility flow day',
  Thu: 'Intervals day',
  Fri: 'Fun cardio day',
  Sat: 'Outdoors day',
  Sun: 'Restore day',
};

export const PlanScreen: React.FC = () => {
  const navigate = useNavigate();
  const {
    meta,
    todayDate,
    streak,
    freezeActive,
    getOrCreatePlanForDate,
    swapWorkoutForDate,
  } = useApp();

  // Compute Monday-to-Sunday dates for the current week
  const weekDays = useMemo(() => {
    const now = new Date(`${todayDate}T12:00:00`);
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMon);

    return DAY_NAMES.map((label, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      const dateStr = formatDateYYYYMMDD(d);
      return {
        label,
        dayNum: d.getDate(),
        dateStr,
        isToday: dateStr === todayDate,
        isPast: dateStr < todayDate,
      };
    });
  }, [todayDate]);

  const [selectedDate, setSelectedDate] = useState(todayDate);
  const [swapModalOpen, setSwapModalOpen] = useState(false);

  const selectedDayInfo =
    weekDays.find((d) => d.dateStr === selectedDate) || weekDays[0];
  const dayPlan = getOrCreatePlanForDate(selectedDate);

  const workoutItem = dayPlan?.items.find((i) => i.type === 'workout');
  const resetItems =
    dayPlan?.items.filter((i) => i.type === 'reset' || i.type === 'posture') ||
    [];

  const handleSurpriseMe = async () => {
    const randomWorkout =
      WORKOUTS[Math.floor(Math.random() * WORKOUTS.length)];
    await swapWorkoutForDate(selectedDate, randomWorkout.id);
  };

  return (
    <div className="min-h-screen pb-[120px]">
      <TabHeader title="Plan" streak={streak} freezeActive={freezeActive} />

      <main className="px-5 pt-4 space-y-4">
        {/* Monthly theme banner */}
        <div
          className="rounded-[24px] p-4 flex items-center justify-between"
          style={{
            backgroundColor: 'var(--primary-soft)',
            color: 'var(--brand-label)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 shrink-0" />
            <span className="text-[15px] font-bold font-display">
              This month: {meta.monthlyTheme || 'Strong back'}
            </span>
          </div>
          <span className="text-[12px] font-semibold">4-week focus</span>
        </div>

        {/* Horizontal day selector (Mon to Sun, today as a primary pill) */}
        <div className="flex items-center justify-between gap-1.5">
          {weekDays.map((d) => {
            const isSelected = d.dateStr === selectedDate;
            return (
              <button
                key={d.dateStr}
                type="button"
                onClick={() => setSelectedDate(d.dateStr)}
                className="tap-scale flex-1 py-2.5 rounded-full flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer"
                style={
                  isSelected
                    ? {
                        backgroundColor: 'var(--primary)',
                        color: 'var(--on-primary)',
                      }
                    : d.isToday
                    ? {
                        backgroundColor: 'var(--primary-soft)',
                        color: 'var(--brand-label)',
                      }
                    : {
                        backgroundColor: 'var(--card-solid)',
                        color: 'var(--text-soft)',
                      }
                }
              >
                <span className="text-[11px] font-bold">{d.label}</span>
                <span className="text-[16px] font-extrabold tabular-nums font-display">
                  {d.dayNum}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected day themed card */}
        {dayPlan && (
          <section className="glass-card space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span
                  className="text-[12px] font-bold uppercase tracking-wider"
                  style={{ color: 'var(--brand-label)' }}
                >
                  {selectedDayInfo.isToday
                    ? 'Today'
                    : selectedDayInfo.isPast
                    ? 'Completed / Past'
                    : 'Upcoming'}
                </span>
                <h2 className="text-[22px] font-extrabold font-display">
                  {DAY_THEME_LABELS[selectedDayInfo.label] || 'Movement day'}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSurpriseMe}
                  className="tap-scale h-9 px-3 rounded-full bg-white/90 dark:bg-slate-800/90 flex items-center gap-1.5 text-[13px] font-bold shadow-xs cursor-pointer"
                >
                  <Shuffle className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
                  <span>Surprise me</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSwapModalOpen(true)}
                  className="tap-scale h-9 px-3 rounded-full bg-white/90 dark:bg-slate-800/90 flex items-center gap-1.5 text-[13px] font-bold shadow-xs cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Swap</span>
                </button>
              </div>
            </div>

            {/* Main workout card */}
            {workoutItem && (
              <div
                className="p-4 rounded-[20px] flex items-center justify-between gap-3"
                style={{ backgroundColor: 'var(--row)' }}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[17px] font-bold font-display">
                      {workoutItem.subtitle}
                    </span>
                    {workoutItem.tag && (
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                        style={{
                          backgroundColor: 'var(--primary-soft)',
                          color: 'var(--brand-label)',
                        }}
                      >
                        {workoutItem.tag}
                      </span>
                    )}
                  </div>
                  <p
                    className="text-[13px] mt-0.5"
                    style={{ color: 'var(--text-soft)' }}
                  >
                    Scheduled for {workoutItem.time}
                  </p>
                </div>

                {workoutItem.status === 'done' ? (
                  <span
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[12px] font-bold"
                    style={{
                      backgroundColor: 'var(--mint)',
                      color: '#0B2A3C',
                    }}
                  >
                    <Check className="w-3.5 h-3.5" />
                    Done
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate(`/workout/${workoutItem.refId}`)}
                    className="tap-scale h-10 px-4 rounded-full text-[13px] font-bold cursor-pointer"
                    style={{
                      backgroundColor: 'var(--primary)',
                      color: 'var(--on-primary)',
                    }}
                  >
                    Details
                  </button>
                )}
              </div>
            )}

            {/* Day's resets as small icon chips */}
            <div>
              <h3
                className="text-[13px] font-bold mb-2"
                style={{ color: 'var(--text-soft)' }}
              >
                Daily 3-minute resets ({resetItems.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {resetItems.map((r) => {
                  const Icon = getCategoryIcon(r.icon);
                  const colors = getCategoryColors(r.category);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() =>
                        r.type === 'posture'
                          ? navigate('/posture')
                          : navigate(`/player/${r.refId}`)
                      }
                      className="tap-scale h-10 px-3.5 rounded-full flex items-center gap-2 text-[13px] font-semibold cursor-pointer"
                      style={{
                        backgroundColor:
                          r.status === 'done'
                            ? 'var(--mint-soft)'
                            : colors.bg,
                        color: 'var(--text)',
                      }}
                    >
                      <Icon className="w-4 h-4" style={{ color: colors.fg }} />
                      <span>{r.title}</span>
                      <span
                        className="text-[11px] tabular-nums"
                        style={{ color: 'var(--text-soft)' }}
                      >
                        {r.time}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedDayInfo.isToday && workoutItem && (
              <PrimaryButton
                leadingPlay
                onClick={() =>
                  navigate(
                    `/player/workout-${workoutItem.refId}?min=${workoutItem.durationMin}`
                  )
                }
              >
                Start today&apos;s workout
              </PrimaryButton>
            )}
          </section>
        )}
      </main>

      <BottomSheet
        open={swapModalOpen}
        onClose={() => setSwapModalOpen(false)}
        title="Swap main workout"
      >
        <div className="space-y-2.5">
          {WORKOUTS.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={async () => {
                await swapWorkoutForDate(selectedDate, w.id);
                setSwapModalOpen(false);
              }}
              className="w-full p-3.5 rounded-[18px] text-left flex items-center justify-between cursor-pointer"
              style={{ backgroundColor: 'var(--row)' }}
            >
              <div>
                <div className="text-[15px] font-bold font-display">
                  {w.title}
                </div>
                <div
                  className="text-[12px]"
                  style={{ color: 'var(--text-soft)' }}
                >
                  {w.tag} · {w.theme}
                </div>
              </div>
              <span
                className="text-[13px] font-bold"
                style={{ color: 'var(--primary)' }}
              >
                Choose
              </span>
            </button>
          ))}
        </div>
      </BottomSheet>

      <BottomNav />
    </div>
  );
};
