import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bell,
  Clock,
  Footprints,
  Heart,
  Play,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Star,
  Timer,
  Trash2,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Illustration } from '../components/Illustration';
import {
  BottomNav,
  BottomSheet,
  FloatingChip,
  PrimaryButton,
  StatTile,
  TabHeader,
  TaskCard,
} from '../components/ui';
import {
  CONDITION_LABELS,
  formatTime12h,
  pickBestResetNow,
  QUOTES,
  SESSIONS,
  WORKOUTS,
} from '../lib/planEngine';
import { shareOrDownloadQuoteCard } from '../lib/shareQuote';
import { PlanItem } from '../types';

export const TodayScreen: React.FC = () => {
  const navigate = useNavigate();
  const {
    user,
    profile,
    todayPlan,
    todayDate,
    logs,
    pain,
    streak,
    freezeActive,
    resetsDoneToday,
    resetsPerDay,
    todaySteps,
    isOnline,
    updatePlanItemsForDate,
    startGentleWelcomeBackPlan,
    addStepsForToday,
    triggerDemoReminder,
    showToast,
  } = useApp();

  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [doneItemDetail, setDoneItemDetail] = useState<PlanItem | null>(null);
  const [stepsSheetOpen, setStepsSheetOpen] = useState(false);
  const [stepsInput, setStepsInput] = useState(String(todaySteps || 5000));
  const [goalInput, setGoalInput] = useState(
    String(profile?.stepGoal || 7000)
  );
  const [notifSheetOpen, setNotifSheetOpen] = useState(false);

  if (!todayPlan || !profile) {
    return (
      <div className="min-h-screen pb-32">
        <TabHeader title="Today" streak={streak} freezeActive={freezeActive} />
        <div className="px-5 pt-4 space-y-4">
          <div className="h-14 rounded-[20px] bg-white/50 animate-pulse" />
          <div className="h-[190px] rounded-[28px] bg-white/50 animate-pulse" />
          <div className="h-64 rounded-[28px] bg-white/50 animate-pulse" />
        </div>
        <BottomNav />
      </div>
    );
  }

  const firstName = (user?.name || 'Friend').split(' ')[0];
  const initial = firstName.charAt(0).toUpperCase();

  const totalTasks = todayPlan.items.length;
  const doneTasks = todayPlan.items.filter((i) => i.status === 'done').length;
  const totalMinutes = todayPlan.items.reduce((acc, i) => acc + i.durationMin, 0);
  const nextTask =
    todayPlan.items.find((i) => i.status === 'next') ||
    todayPlan.items.find((i) => i.status === 'pending') ||
    null;
  const allDone = totalTasks > 0 && doneTasks === totalTasks;

  const mainWorkoutItem =
    todayPlan.items.find((i) => i.type === 'workout') || todayPlan.items[0];

  const quote =
    QUOTES.find((q) => q.id === todayPlan.quoteId) || QUOTES[5];

  const handleResetMeNow = () => {
    const best = pickBestResetNow(profile, logs, pain);
    navigate(`/player/${best.id}`);
  };

  const handleStartItem = (item: PlanItem) => {
    if (item.type === 'posture') {
      navigate('/posture');
    } else if (item.type === 'workout') {
      navigate(`/player/workout-${item.refId}?itemId=${item.id}&min=${item.durationMin}`);
    } else {
      navigate(`/player/${item.refId}?itemId=${item.id}`);
    }
  };

  const handleCardTap = (item: PlanItem) => {
    if (item.status === 'done') {
      setDoneItemDetail(item);
      return;
    }
    if (item.type === 'workout') {
      navigate(`/workout/${item.refId}`);
    } else if (item.type === 'posture') {
      navigate('/posture');
    } else {
      navigate(`/player/${item.refId}?itemId=${item.id}`);
    }
  };

  const moveItem = async (index: number, dir: -1 | 1) => {
    const copy = [...todayPlan.items];
    const targetIdx = index + dir;
    if (targetIdx < 0 || targetIdx >= copy.length) return;
    // Swap times so chronological order reflects user's reorder
    const tempTime = copy[index].time;
    copy[index] = { ...copy[index], time: copy[targetIdx].time };
    copy[targetIdx] = { ...copy[targetIdx], time: tempTime };
    const swapped = [...copy];
    const [removed] = swapped.splice(index, 1);
    swapped.splice(targetIdx, 0, removed);
    await updatePlanItemsForDate(todayDate, swapped);
  };

  const removeItem = async (id: string) => {
    if (todayPlan.items.length <= 1) return;
    const filtered = todayPlan.items.filter((i) => i.id !== id);
    await updatePlanItemsForDate(todayDate, filtered);
  };

  const retimeItem = async (id: string, newTime: string) => {
    const updated = todayPlan.items
      .map((i) => (i.id === id ? { ...i, time: newTime } : i))
      .sort((a, b) => a.time.localeCompare(b.time));
    await updatePlanItemsForDate(todayDate, updated);
  };

  const swapItemSession = async (item: PlanItem) => {
    if (item.type === 'workout') {
      const idx = WORKOUTS.findIndex((w) => w.id === item.refId);
      const nextW = WORKOUTS[(idx + 1) % WORKOUTS.length];
      const updated = todayPlan.items.map((i) =>
        i.id === item.id
          ? {
              ...i,
              refId: nextW.id,
              subtitle: `${i.durationMin} min ${nextW.title.toLowerCase()}`,
              tag: nextW.tag,
            }
          : i
      );
      await updatePlanItemsForDate(todayDate, updated);
    } else {
      const idx = SESSIONS.findIndex((s) => s.id === item.refId);
      const nextS = SESSIONS[(idx + 1) % SESSIONS.length];
      const updated = todayPlan.items.map((i) =>
        i.id === item.id
          ? {
              ...i,
              refId: nextS.id,
              title: nextS.title,
              subtitle: `3 min · ${nextS.subtitle}`,
              category: nextS.category,
              icon: nextS.icon,
            }
          : i
      );
      await updatePlanItemsForDate(todayDate, updated);
    }
  };

  return (
    <div className="min-h-screen pb-[120px] relative">
      {/* Soft blurred background blobs behind hero */}
      <div
        className="pointer-events-none absolute top-14 -left-10 w-52 h-52 rounded-full blur-3xl opacity-30"
        style={{ backgroundColor: 'var(--primary)' }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-36 -right-10 w-56 h-56 rounded-full blur-3xl opacity-30"
        style={{ backgroundColor: 'var(--lavender)' }}
        aria-hidden="true"
      />

      {/* 1. Header */}
      <TabHeader title="Today" streak={streak} freezeActive={freezeActive} />

      {/* Offline slim banner */}
      {!isOnline && (
        <div
          role="status"
          className="mx-5 mt-2 px-4 py-2 rounded-full text-[13px] font-semibold text-center"
          style={{
            backgroundColor: 'var(--primary-soft)',
            color: 'var(--brand-label)',
          }}
        >
          You&apos;re offline. Your progress is saved on this device.
        </div>
      )}

      <main className="px-5">
        {/* 2. Greeting row (margin top 12) */}
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-[52px] h-[52px] shrink-0">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={firstName}
                  referrerPolicy="no-referrer"
                  className="w-[52px] h-[52px] rounded-full object-cover shadow-xs"
                />
              ) : (
                <div
                  className="w-[52px] h-[52px] rounded-full flex items-center justify-center text-[20px] font-extrabold font-display shadow-xs"
                  style={{
                    backgroundColor: 'var(--primary-soft)',
                    color: 'var(--brand-label)',
                  }}
                >
                  {initial}
                </div>
              )}
              <span
                className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white"
                style={{ backgroundColor: 'var(--mint)' }}
                aria-hidden="true"
              />
            </div>

            <div className="min-w-0">
              <h2 className="text-[34px] font-extrabold leading-none truncate font-display">
                Hey, {firstName}
              </h2>
              <p
                className="text-[16px] leading-snug mt-1 line-clamp-2"
                style={{ color: 'var(--text-soft)' }}
              >
                Three small moves keep today going.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                navigate(`/plan-workout/${mainWorkoutItem?.refId || 'run-walk'}`)
              }
              aria-label="Plan your workout"
              className="tap-scale w-12 h-12 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm cursor-pointer"
            >
              <Timer className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setNotifSheetOpen(true)}
              aria-label="Notification settings"
              className="tap-scale relative w-12 h-12 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              {!allDone && (
                <span
                  className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full"
                  style={{ backgroundColor: 'var(--coral)' }}
                />
              )}
            </button>
          </div>
        </div>

        {/* Pain safety notice if triggered */}
        {todayPlan.painAlertCondition && (
          <div
            className="mt-4 rounded-[20px] p-3.5 flex items-start gap-2.5 border"
            style={{
              backgroundColor: 'var(--caution-soft)',
              borderColor: 'rgba(229, 83, 61, 0.35)',
            }}
          >
            <AlertCircle
              className="w-5 h-5 shrink-0 mt-0.5"
              style={{ color: 'var(--caution)' }}
            />
            <p className="text-[13px] font-medium leading-snug">
              Your{' '}
              {CONDITION_LABELS[todayPlan.painAlertCondition]?.toLowerCase()}{' '}
              seems sore. We&apos;ve eased your plan. If it keeps getting worse,
              please see a doctor.
            </p>
          </div>
        )}

        {/* 3. Reset button (margin top 16) */}
        <div className="mt-4">
          <PrimaryButton
            leadingPlay
            onClick={handleResetMeNow}
            trailingIcon={<Zap className="w-5 h-5" />}
          >
            Reset me now, 3 min
          </PrimaryButton>
        </div>

        {/* 4. Hero card or Welcome back card (margin top 16) */}
        {todayPlan.isWelcomeBack ? (
          <div className="mt-4 glass-card space-y-3">
            <div className="flex items-center gap-3">
              <Illustration
                name="welcome-back"
                category="mint"
                className="w-16 h-16 rounded-[20px] shrink-0"
                alt="Welcome back"
              />
              <div>
                <h3 className="text-[20px] font-extrabold font-display">
                  Welcome back
                </h3>
                <p className="text-[14px]" style={{ color: 'var(--text-soft)' }}>
                  Let&apos;s ease back in with a gentle, half-length plan today.
                </p>
              </div>
            </div>
            <PrimaryButton onClick={startGentleWelcomeBackPlan}>
              Start gentle
            </PrimaryButton>
          </div>
        ) : (
          <div className="mt-4 relative h-[190px] rounded-[28px] overflow-hidden shadow-md">
            <Illustration
              name={allDone ? 'hero-today-done' : 'hero-today'}
              category={allDone ? 'mint' : 'primary'}
              className="w-full h-full"
              alt={allDone ? 'All done today' : 'Today movement hero'}
            />

            <FloatingChip
              icon={<Clock className="w-4 h-4" style={{ color: 'var(--primary)' }} />}
              className="absolute top-3 left-3"
            >
              {totalMinutes} min today
            </FloatingChip>

            <FloatingChip
              icon={
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: 'var(--mint)' }}
                />
              }
              className="absolute top-3 right-3"
            >
              {doneTasks} of {totalTasks} done
            </FloatingChip>

            <button
              type="button"
              onClick={() => {
                if (nextTask) handleStartItem(nextTask);
              }}
              className="tap-scale absolute bottom-3 left-3 right-3 h-[44px] rounded-full px-3 flex items-center gap-2.5 shadow-sm cursor-pointer"
              style={{
                backgroundColor: 'var(--surface-pill)',
                color: 'var(--text)',
              }}
            >
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: 'var(--primary-soft)',
                  color: 'var(--primary)',
                }}
              >
                <Play
                  className="w-3.5 h-3.5 ml-0.5"
                  style={{ fill: 'var(--primary)' }}
                />
              </span>
              <span className="text-[14px] font-semibold truncate flex-1 text-left">
                {allDone
                  ? 'All done today. Great work!'
                  : nextTask
                  ? `Next: ${nextTask.title}, ${nextTask.durationMin} min at ${formatTime12h(
                      nextTask.time
                    )}`
                  : 'All done today. Great work!'}
              </span>
              {!allDone && (
                <ArrowRight
                  className="w-4 h-4 shrink-0"
                  style={{ color: 'var(--text-soft)' }}
                />
              )}
            </button>
          </div>
        )}

        {/* 5. Today's plan card (glass, margin top 16) */}
        <section className="mt-4 glass-card">
          <div className="flex items-center justify-between gap-2 mb-3.5">
            <div className="flex items-center gap-2.5">
              <h2 className="text-[24px] font-extrabold font-display">
                Today&apos;s plan
              </h2>
              <span
                className="px-3 py-1 rounded-full text-[12px] font-bold"
                style={{
                  backgroundColor: 'var(--primary-soft)',
                  color: 'var(--brand-label)',
                }}
              >
                Today
              </span>
            </div>

            <button
              type="button"
              onClick={() => setCustomizeOpen(true)}
              className="tap-scale flex items-center gap-1.5 text-[14px] font-semibold cursor-pointer"
              style={{ color: 'var(--primary)' }}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Customize</span>
            </button>
          </div>

          <p
            className="text-[13px] mb-3"
            style={{ color: 'var(--text-soft)' }}
          >
            {todayPlan.whyToday}
          </p>

          <div className="space-y-3">
            {todayPlan.items.map((item) => (
              <TaskCard
                key={item.id}
                item={item}
                formattedTime={formatTime12h(item.time)}
                onCardClick={() => handleCardTap(item)}
                onStatusClick={() => handleStartItem(item)}
              />
            ))}
          </div>
        </section>

        {/* 6. Stat tiles (two columns, gap 12, margin top 16) */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <StatTile
            label="Resets"
            value={`${resetsDoneToday} of ${resetsPerDay}`}
            unit="resets"
            progress={resetsPerDay > 0 ? resetsDoneToday / resetsPerDay : 0}
            accentColor="var(--primary)"
            tintBg="var(--primary-soft)"
            icon={<Star className="w-5 h-5" />}
          />

          <StatTile
            label="Steps"
            value={todaySteps.toLocaleString()}
            progress={
              profile.stepGoal && profile.stepGoal > 0
                ? todaySteps / profile.stepGoal
                : undefined
            }
            accentColor="var(--mint)"
            tintBg="var(--mint-soft)"
            icon={<Footprints className="w-5 h-5" />}
            actionLink={
              !profile.stepGoal
                ? {
                    text: 'Add steps',
                    onClick: () => setStepsSheetOpen(true),
                  }
                : undefined
            }
          />
        </div>

        {/* 7. Daily boost card (margin top 16) */}
        <section
          className="mt-4 rounded-[28px] p-5 text-white relative overflow-hidden shadow-md"
          style={{
            background:
              'linear-gradient(135deg, var(--quote-from) 0%, var(--quote-to) 100%)',
          }}
        >
          {/* Faint lotus watermark */}
          <svg
            viewBox="0 0 120 120"
            className="pointer-events-none absolute -bottom-4 -right-2 w-28 h-28 opacity-15"
            aria-hidden="true"
          >
            <g transform="translate(60,70)" fill="#FFFFFF">
              <ellipse cx="0" cy="-24" rx="12" ry="32" />
              <ellipse
                cx="0"
                cy="-24"
                rx="12"
                ry="32"
                transform="rotate(28)"
              />
              <ellipse
                cx="0"
                cy="-24"
                rx="12"
                ry="32"
                transform="rotate(-28)"
              />
              <ellipse
                cx="0"
                cy="-24"
                rx="12"
                ry="32"
                transform="rotate(56)"
              />
              <ellipse
                cx="0"
                cy="-24"
                rx="12"
                ry="32"
                transform="rotate(-56)"
              />
            </g>
          </svg>

          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-[12px] font-bold tracking-[0.08em] uppercase">
              <Heart className="w-3.5 h-3.5 fill-white" />
              DAILY BOOST
            </span>

            <button
              type="button"
              onClick={async () => {
                const msg = await shareOrDownloadQuoteCard(quote);
                showToast(msg);
              }}
              aria-label="Share quote card"
              className="tap-scale w-10 h-10 rounded-full bg-white/20 flex items-center justify-center cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-white" />
            </button>
          </div>

          <p className="mt-3 text-[22px] font-bold leading-snug font-display">
            “{quote.text}”
          </p>

          <p className="mt-2 text-[16px] text-white/90 leading-relaxed">
            {quote.prompt ||
              'Take a slow breath before clicking back into focus.'}
          </p>

          <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-[12px] text-white/85">
            <span className="flex items-center gap-1.5 font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              Tiny win: {todayPlan.tinyWin}
            </span>
            <span className="font-semibold shrink-0 ml-2">Original</span>
          </div>
        </section>

        {/* Required health disclaimer */}
        <p
          className="mt-5 text-center text-[12px] leading-relaxed px-2"
          style={{ color: 'var(--text-soft)' }}
        >
          General wellness guidance, not medical advice. Stop and seek help if
          you feel sharp pain, dizziness, numbness or chest discomfort.
        </p>
      </main>

      {/* Customize Sheet */}
      <BottomSheet
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        title="Customize today's plan"
      >
        <div className="space-y-3">
          {todayPlan.items.map((item, idx) => (
            <div
              key={item.id}
              className="p-3 rounded-[18px] flex items-center justify-between gap-2"
              style={{ backgroundColor: 'var(--row)' }}
            >
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-bold truncate font-display">
                  {item.title}
                </div>
                <div
                  className="text-[12px] truncate"
                  style={{ color: 'var(--text-soft)' }}
                >
                  {item.subtitle}
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="time"
                    value={item.time}
                    onChange={(e) => retimeItem(item.id, e.target.value)}
                    className="h-8 px-2 rounded-[8px] bg-white dark:bg-slate-800 text-[12px]"
                  />
                  <button
                    type="button"
                    onClick={() => swapItemSession(item)}
                    className="h-8 px-2.5 rounded-[8px] bg-white dark:bg-slate-800 text-[12px] font-semibold cursor-pointer"
                    style={{ color: 'var(--brand-label)' }}
                  >
                    Swap
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => moveItem(idx, -1)}
                  aria-label="Move earlier"
                  className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center cursor-pointer"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(idx, 1)}
                  aria-label="Move later"
                  className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center cursor-pointer"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  aria-label="Remove task"
                  className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center cursor-pointer"
                  style={{ color: 'var(--caution)' }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </BottomSheet>

      {/* Done task summary sheet */}
      <BottomSheet
        open={Boolean(doneItemDetail)}
        onClose={() => setDoneItemDetail(null)}
        title={doneItemDetail?.title || 'Completed'}
      >
        {doneItemDetail && (
          <div className="space-y-4">
            <p className="text-[15px]" style={{ color: 'var(--text-soft)' }}>
              Completed today ({doneItemDetail.durationMin} min ·{' '}
              {doneItemDetail.subtitle}).
            </p>
            <PrimaryButton
              leadingPlay
              onClick={() => {
                const it = doneItemDetail;
                setDoneItemDetail(null);
                handleStartItem(it);
              }}
            >
              Do it again
            </PrimaryButton>
          </div>
        )}
      </BottomSheet>

      {/* Steps entry sheet */}
      <BottomSheet
        open={stepsSheetOpen}
        onClose={() => setStepsSheetOpen(false)}
        title="Add today's steps"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold mb-1">
              Steps today
            </label>
            <input
              type="number"
              value={stepsInput}
              onChange={(e) => setStepsInput(e.target.value)}
              className="w-full h-12 px-4 rounded-[16px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[18px] font-bold"
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold mb-1">
              Daily step goal (optional)
            </label>
            <input
              type="number"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              className="w-full h-12 px-4 rounded-[16px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[16px]"
            />
          </div>
          <PrimaryButton
            onClick={async () => {
              const s = Math.max(0, parseInt(stepsInput || '0', 10));
              const g = Math.max(0, parseInt(goalInput || '0', 10));
              await addStepsForToday(s, g > 0 ? g : undefined);
              setStepsSheetOpen(false);
            }}
          >
            Save steps
          </PrimaryButton>
        </div>
      </BottomSheet>

      {/* Notification quick sheet */}
      <BottomSheet
        open={notifSheetOpen}
        onClose={() => setNotifSheetOpen(false)}
        title="Reminders"
      >
        <div className="space-y-3">
          <p className="text-[14px]" style={{ color: 'var(--text-soft)' }}>
            Gentle break reminders fire at the centre of your break windows while
            Habit Flow is open, or you can add them to your phone calendar.
          </p>
          <PrimaryButton
            onClick={() => {
              setNotifSheetOpen(false);
              triggerDemoReminder();
            }}
          >
            Preview due reminder sheet
          </PrimaryButton>
          <button
            type="button"
            onClick={() => {
              setNotifSheetOpen(false);
              navigate('/me');
            }}
            className="w-full py-2.5 text-[14px] font-semibold underline cursor-pointer"
            style={{ color: 'var(--brand-label)' }}
          >
            Open notification settings in Me
          </button>
        </div>
      </BottomSheet>

      {/* 8. Bottom navigation */}
      <BottomNav />
    </div>
  );
};
