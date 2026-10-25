import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Activity,
  Armchair,
  ArrowRight,
  Award,
  Calendar,
  Check,
  CheckSquare,
  Flame,
  Lightbulb,
  Lock,
  PersonStanding,
  PlusCircle,
  RefreshCw,
  Smile,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  BottomNav,
  BottomSheet,
  PrimaryButton,
  ProgressRing,
  TabHeader,
} from '../components/ui';
import { parseAppleHealthFile } from '../lib/appleHealthImport';
import {
  CONDITION_LABELS,
  formatDateYYYYMMDD,
  formatTime12h,
  isConditionTrendingDown,
} from '../lib/planEngine';
import { ConditionId } from '../types';

const ALL_BADGES = [
  {
    id: '3-Day Reset',
    label: '3-Day Reset',
    bg: 'var(--mint-soft)',
    fg: 'var(--mint-dark)',
    icon: RefreshCw,
  },
  {
    id: '7-Day Consistency',
    label: '7-Day Consistency',
    bg: 'var(--mint-soft)',
    fg: 'var(--mint-dark)',
    icon: Calendar,
  },
  {
    id: '30-Day Master',
    label: '30-Day Master',
    bg: 'var(--coral-soft)',
    fg: 'var(--coral)',
    icon: Award,
  },
  {
    id: 'Back Care Streak',
    label: 'Back Care Streak',
    bg: 'var(--coral)',
    fg: '#FFFFFF',
    icon: PersonStanding,
  },
  {
    id: 'First Workout',
    label: 'First Workout',
    bg: 'var(--primary-soft)',
    fg: 'var(--primary)',
    icon: Flame,
  },
  {
    id: 'Posture Pro',
    label: 'Posture Pro',
    bg: 'var(--lavender-soft)',
    fg: 'var(--lavender)',
    icon: Check,
  },
  {
    id: 'Comeback',
    label: 'Comeback',
    bg: 'var(--sun-soft)',
    fg: '#8C6500',
    icon: Smile,
  },
];

export const ProgressScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    profile,
    schedule,
    meta,
    todayPlan,
    todayDate,
    logs,
    pain,
    streak,
    freezeActive,
    resetsPerDay,
    weeklyResetsDone,
    weeklyResetTarget,
    completeSession,
    addStepsForToday,
    importAppleHealthData,
  } = useApp();

  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [selectedCondition, setSelectedCondition] = useState<ConditionId>(
    profile?.conditions?.[0] || 'lower-back'
  );
  const [allBadgesOpen, setAllBadgesOpen] = useState(false);
  const [logSheetOpen, setLogSheetOpen] = useState(
    searchParams.get('logSheet') === '1'
  );
  const [importSheetOpen, setImportSheetOpen] = useState(false);

  // Manual log state
  const [manualType, setManualType] = useState('Brisk walk');
  const [manualMin, setManualMin] = useState('20');
  const [manualSteps, setManualSteps] = useState('');

  // Apple health & steps state
  const [stepEntryVal, setStepEntryVal] = useState('');
  const [stepGoalVal, setStepGoalVal] = useState(
    String(profile?.stepGoal || 7000)
  );
  const [importProgress, setImportProgress] = useState<number | null>(null);

  const remainingResets = Math.max(0, weeklyResetTarget - weeklyResetsDone);

  // Compute sitting blocks & longest sit from workStart, workEnd, and reset times
  const sittingData = useMemo(() => {
    const startStr = schedule?.workStart || '09:00';
    const endStr = schedule?.workEnd || '17:00';
    const [sh, sm] = startStr.split(':').map(Number);
    const [eh, em] = endStr.split(':').map(Number);
    const startMin = (sh || 9) * 60 + (sm || 0);
    const endMin = Math.max(startMin + 120, (eh || 17) * 60 + (em || 0));
    const totalSpan = endMin - startMin;

    const resetItems =
      todayPlan?.items.filter((i) => i.type === 'reset') || [];
    const doneResets = resetItems.filter((i) => i.status === 'done');

    const breakMinutes = resetItems
      .map((r) => {
        const [rh, rm] = r.time.split(':').map(Number);
        return (rh || 10) * 60 + (rm || 30);
      })
      .filter((m) => m > startMin && m < endMin)
      .sort((a, b) => a - b);

    const points = [startMin, ...breakMinutes, endMin];
    let longestGapMin = 95;
    if (points.length >= 2) {
      let maxGap = 0;
      for (let i = 1; i < points.length; i++) {
        maxGap = Math.max(maxGap, points[i] - points[i - 1]);
      }
      longestGapMin = maxGap;
    }

    const longestH = Math.floor(longestGapMin / 60);
    const longestM = longestGapMin % 60;

    const markers = breakMinutes.map((m) => ({
      pct: Math.min(96, Math.max(4, ((m - startMin) / totalSpan) * 100)),
    }));

    return {
      startLabel: formatTime12h(startStr),
      endLabel: formatTime12h(endStr),
      longestStr: `${longestH}h ${longestM}m`,
      resetsTaken: doneResets.length || resetItems.length,
      markers,
    };
  }, [schedule, todayPlan]);

  // Build 8-week (or 12-week) pain points for SVG chart
  const painChartData = useMemo(() => {
    const count = viewMode === 'month' ? 12 : 8;
    const baseScore = profile?.painBaseline?.[selectedCondition] ?? 6;
    const condLogs = pain
      .filter((p) => p.condition === selectedCondition)
      .sort((a, b) => a.date.localeCompare(b.date));

    const latestScore =
      condLogs.length > 0
        ? condLogs[condLogs.length - 1].score
        : Math.max(2, baseScore - 2);

    const firstScore =
      condLogs.length > 1
        ? condLogs[0].score
        : Math.min(10, Math.max(baseScore, latestScore + 2));

    // Interpolate smooth weekly points ending at latestScore
    const scores: number[] = [];
    for (let i = 0; i < count; i++) {
      if (i === count - 1) {
        scores.push(latestScore);
      } else if (i === 0) {
        scores.push(firstScore);
      } else {
        const t = i / (count - 1);
        const interp = Math.round(firstScore + (latestScore - firstScore) * t);
        scores.push(interp);
      }
    }

    const trend = isConditionTrendingDown(selectedCondition, pain);
    const isTrendingDown =
      trend.trendingDown ||
      (scores.length >= 3 &&
        scores[scores.length - 1] <= scores[scores.length - 2] &&
        scores[scores.length - 1] < scores[0]);

    return {
      scores,
      first: scores[0],
      latest: scores[scores.length - 1],
      isTrendingDown,
      labels: scores.map((_, idx) =>
        idx === scores.length - 1 ? 'Now' : `W${idx + 1}`
      ),
    };
  }, [viewMode, profile, selectedCondition, pain]);

  // Month heatmap days (last 28 days)
  const monthDays = useMemo(() => {
    const days: { date: string; count: number }[] = [];
    const now = new Date(`${todayDate}T12:00:00`);
    for (let i = 27; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dStr = formatDateYYYYMMDD(d);
      const cnt = logs.filter((l) => l.date === dStr).length;
      days.push({ date: dStr, count: cnt });
    }
    return days;
  }, [todayDate, logs]);

  const earnedBadgesSet = new Set(meta.badges || ['3-Day Reset']);

  return (
    <div className="min-h-screen pb-[120px]">
      <TabHeader title="Progress" streak={streak} freezeActive={freezeActive} />

      <main className="px-5 pt-4 space-y-4">
        {/* Segmented control "Week" | "Month" */}
        <div className="glass-card !p-1.5 !rounded-full grid grid-cols-2 gap-1.5">
          {(['week', 'month'] as const).map((mode) => {
            const active = viewMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className="tap-scale h-11 rounded-full flex items-center justify-center gap-2 font-display text-[15px] font-bold cursor-pointer"
                style={
                  active
                    ? {
                        backgroundColor: 'var(--primary)',
                        color: 'var(--on-primary)',
                      }
                    : { color: 'var(--text-soft)' }
                }
              >
                <Calendar className="w-4 h-4" />
                <span className="capitalize">{mode}</span>
              </button>
            );
          })}
        </div>

        {viewMode === 'week' ? (
          /* 1. Weekly card (glass, centred) */
          <section className="glass-card flex flex-col items-center text-center space-y-3">
            <div
              className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full text-[13px] font-bold"
              style={{
                backgroundColor: 'var(--mint-soft)',
                color: 'var(--mint-dark)',
              }}
            >
              <Flame
                className="w-4 h-4"
                style={{ color: 'var(--coral)', fill: 'var(--coral)' }}
              />
              <span>{streak}-day streak!</span>
            </div>

            <ProgressRing
              size={190}
              strokeWidth={14}
              progress={
                weeklyResetTarget > 0
                  ? weeklyResetsDone / weeklyResetTarget
                  : 0
              }
            >
              <div className="text-[48px] font-extrabold tabular-nums font-display leading-none">
                {weeklyResetsDone}/{weeklyResetTarget}
              </div>
              <div
                className="text-[13px] font-semibold mt-1"
                style={{ color: 'var(--text-soft)' }}
              >
                {weeklyResetsDone} of {weeklyResetTarget} resets
              </div>
              <div
                className="text-[12px] mt-0.5"
                style={{ color: 'var(--text-soft)' }}
              >
                Goal: {resetsPerDay} a day
              </div>
            </ProgressRing>

            {remainingResets > 0 && (
              <div
                className="flex items-center justify-center gap-2 text-[13px] font-medium pt-1"
                style={{ color: 'var(--text-soft)' }}
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: 'var(--mint-soft)',
                    color: 'var(--mint-dark)',
                  }}
                >
                  <Check className="w-3.5 h-3.5" />
                </span>
                <span>
                  Just {remainingResets} quick desk pauses to complete your week
                </span>
              </div>
            )}
          </section>
        ) : (
          /* Month view calendar heatmap & totals */
          <section className="glass-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[18px] font-bold font-display">
                  Monthly activity heatmap
                </h2>
                <p
                  className="text-[13px]"
                  style={{ color: 'var(--text-soft)' }}
                >
                  Last 28 days of completed resets and workouts
                </p>
              </div>
              <div className="text-right">
                <div className="text-[22px] font-extrabold tabular-nums font-display">
                  {logs.length}
                </div>
                <div
                  className="text-[11px] font-bold uppercase"
                  style={{ color: 'var(--text-soft)' }}
                >
                  Total sessions
                </div>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {monthDays.map((d) => (
                <div
                  key={d.date}
                  title={`${d.date}: ${d.count} completed`}
                  className="h-9 rounded-[10px] flex items-center justify-center text-[11px] font-bold tabular-nums"
                  style={{
                    backgroundColor:
                      d.count >= 3
                        ? 'var(--mint)'
                        : d.count >= 1
                        ? 'var(--primary-soft)'
                        : 'var(--row)',
                    color: d.count >= 3 ? '#06202F' : 'var(--text-soft)',
                  }}
                >
                  {d.date.slice(-2)}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 2. Sitting blocks today (glass) */}
        <section className="glass-card space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-[16px] flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: 'var(--primary-soft)',
                  color: 'var(--primary)',
                }}
              >
                <Armchair className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-[18px] font-bold font-display">
                  Sitting blocks today
                </h2>
                <p
                  className="text-[13px]"
                  style={{ color: 'var(--text-soft)' }}
                >
                  Desk intervals and reset breaks
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: 'var(--text-soft)' }}
              >
                LONGEST SIT
              </div>
              <div className="text-[20px] font-extrabold tabular-nums font-display">
                {sittingData.longestStr}
              </div>
            </div>
          </div>

          {/* Labels above timeline bar */}
          <div className="flex items-center justify-between text-[12px] font-semibold pt-1">
            <span style={{ color: 'var(--text-soft)' }}>
              {sittingData.startLabel}
            </span>
            <span style={{ color: 'var(--brand-label)' }}>
              {sittingData.resetsTaken} mini resets taken
            </span>
            <span style={{ color: 'var(--text-soft)' }}>
              {sittingData.endLabel}
            </span>
          </div>

          {/* Horizontal timeline bar (height 14, radius 999) */}
          <div
            className="relative w-full h-[14px] rounded-full overflow-hidden"
            style={{ backgroundColor: 'var(--primary-soft)' }}
          >
            {sittingData.markers.map((m, idx) => (
              <span
                key={idx}
                className="absolute top-0 bottom-0 w-3 rounded-full"
                style={{
                  left: `${m.pct}%`,
                  backgroundColor: 'var(--mint)',
                }}
              />
            ))}
          </div>

          {/* Hour ticks */}
          <div
            className="flex items-center justify-between text-[11px] tabular-nums"
            style={{ color: 'var(--text-soft)' }}
          >
            <span>9 AM</span>
            <span>11 AM</span>
            <span>1 PM</span>
            <span>3 PM</span>
            <span>5 PM</span>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5 pt-1 text-[12px] font-medium">
            <span className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: 'var(--primary)' }}
              />
              Seated focus
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: 'var(--mint)' }}
              />
              Active reset break
            </span>
          </div>
        </section>

        {/* 3. Pain trend (glass) */}
        <section className="glass-card space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-[16px] flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: 'var(--coral-soft)',
                  color: 'var(--coral)',
                }}
              >
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-[18px] font-bold font-display">
                  Pain trend
                </h2>
                <p
                  className="text-[13px]"
                  style={{ color: 'var(--text-soft)' }}
                >
                  {CONDITION_LABELS[selectedCondition]}, last{' '}
                  {viewMode === 'month' ? '12' : '8'} weeks
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: 'var(--text-soft)' }}
              >
                SCALE CHANGE
              </div>
              <div
                className="text-[22px] font-extrabold tabular-nums font-display"
                style={{ color: 'var(--mint-dark)' }}
              >
                {painChartData.first} to {painChartData.latest}
              </div>
            </div>
          </div>

          {/* Condition switcher chips if user has multiple conditions */}
          {(profile?.conditions.length || 0) > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {profile!.conditions.map((cond) => {
                const active = cond === selectedCondition;
                return (
                  <button
                    key={cond}
                    type="button"
                    onClick={() => setSelectedCondition(cond)}
                    className="h-8 px-3 rounded-full text-[12px] font-bold cursor-pointer"
                    style={
                      active
                        ? {
                            backgroundColor: 'var(--primary)',
                            color: 'var(--on-primary)',
                          }
                        : {
                            backgroundColor: 'var(--row)',
                            color: 'var(--text-soft)',
                          }
                    }
                  >
                    {CONDITION_LABELS[cond]}
                  </button>
                );
              })}
            </div>
          )}

          {/* SVG Chart (height 170) */}
          <div className="w-full h-[170px]">
            <svg viewBox="0 0 340 170" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="painAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2EB8F5" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#2EB8F5" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Y-axis labels 0, 5, 10 with dashed gridlines */}
              {[
                { val: 10, y: 20 },
                { val: 5, y: 78 },
                { val: 0, y: 135 },
              ].map((g) => (
                <g key={g.val}>
                  <text
                    x="4"
                    y={g.y + 4}
                    fontSize="11"
                    fill="var(--text-soft)"
                    fontWeight="600"
                  >
                    {g.val}
                  </text>
                  <line
                    x1="28"
                    y1={g.y}
                    x2="332"
                    y2={g.y}
                    stroke="rgba(79, 107, 122, 0.22)"
                    strokeDasharray="4 4"
                  />
                </g>
              ))}

              {/* Comfort target (<=3) dashed line with label placed at top-left away from data points */}
              <line
                x1="28"
                y1={101}
                x2="332"
                y2={101}
                stroke="#0E7A53"
                strokeWidth="1.2"
                strokeDasharray="5 4"
              />
              <text
                x="32"
                y="95"
                fontSize="10"
                fill="#0E7A53"
                fontWeight="700"
              >
                Comfort target (≤3)
              </text>

              {/* Compute coordinates */}
              {(() => {
                const pts = painChartData.scores.map((s, idx) => {
                  const x =
                    36 +
                    (idx / (painChartData.scores.length - 1)) * (324 - 36);
                  const y = 135 - (s / 10) * (135 - 20);
                  return { x, y, s, label: painChartData.labels[idx] };
                });

                const linePath = pts
                  .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
                  .join(' ');
                const areaPath = `${linePath} L ${pts[pts.length - 1].x} 135 L ${
                  pts[0].x
                } 135 Z`;

                return (
                  <>
                    <path d={areaPath} fill="url(#painAreaGrad)" />
                    <path
                      d={linePath}
                      fill="none"
                      stroke="#0B5C80"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {pts.map((p, idx) => {
                      const isLast = idx === pts.length - 1;
                      return (
                        <g key={idx}>
                          {isLast && (
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r="8"
                              fill="rgba(94, 230, 176, 0.35)"
                            />
                          )}
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={isLast ? '5' : '4'}
                            fill={isLast ? '#5EE6B0' : '#0B5C80'}
                            stroke="#FFFFFF"
                            strokeWidth="1.5"
                          />
                          <text
                            x={p.x}
                            y="156"
                            fontSize="10"
                            textAnchor="middle"
                            fill="var(--text-soft)"
                            fontWeight="600"
                          >
                            {p.label}
                          </text>
                        </g>
                      );
                    })}
                  </>
                );
              })()}
            </svg>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <div
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-semibold"
              style={{
                backgroundColor: painChartData.isTrendingDown
                  ? 'var(--mint-soft)'
                  : 'var(--row)',
                color: painChartData.isTrendingDown
                  ? 'var(--mint-dark)'
                  : 'var(--text-soft)',
              }}
            >
              <Smile className="w-4 h-4 shrink-0" />
              <span>
                {painChartData.isTrendingDown
                  ? 'Trending down 3 weeks in a row'
                  : 'Keep checking in weekly.'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => navigate('/pain-checkin')}
              className="text-[13px] font-bold underline cursor-pointer"
              style={{ color: 'var(--brand-label)' }}
            >
              Check in
            </button>
          </div>
        </section>

        {/* 4. Badges earned (glass) */}
        <section className="glass-card space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[18px] font-bold font-display">
                Badges earned
              </h2>
              <p
                className="text-[13px]"
                style={{ color: 'var(--text-soft)' }}
              >
                Daily movement milestones
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAllBadgesOpen(true)}
              className="text-[13px] font-bold underline cursor-pointer"
              style={{ color: 'var(--brand-label)' }}
            >
              View all ({ALL_BADGES.length})
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-1">
            {ALL_BADGES.slice(0, 4).map((b) => {
              const Icon = b.icon;
              const unlocked = earnedBadgesSet.has(b.id);
              return (
                <div
                  key={b.id}
                  className="flex flex-col items-center text-center gap-1.5"
                >
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center shadow-xs"
                    style={
                      unlocked
                        ? { backgroundColor: b.bg, color: b.fg }
                        : {
                            backgroundColor: 'var(--row)',
                            color: 'var(--text-soft)',
                          }
                    }
                  >
                    {unlocked ? (
                      <Icon className="w-7 h-7" />
                    ) : (
                      <Lock className="w-6 h-6 opacity-60" />
                    )}
                  </div>
                  <span className="text-[12px] font-semibold leading-tight">
                    {b.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* 5. Tip of the day (glass, text only) */}
        <section className="glass-card space-y-2">
          <div
            className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider"
            style={{ color: 'var(--mint-dark)' }}
          >
            <Lightbulb className="w-4 h-4" />
            <span>TIP OF THE DAY</span>
          </div>
          <h3 className="text-[18px] font-bold font-display">
            Gentle shifts beat rigid posture
          </h3>
          <p
            className="text-[14px] leading-relaxed"
            style={{ color: 'var(--text-soft)' }}
          >
            Your spine loves variety more than sitting military-straight.
            Changing position every 35 minutes keeps joints comfortable.
          </p>
          <button
            type="button"
            onClick={() => navigate('/care')}
            className="inline-flex items-center gap-1.5 text-[14px] font-bold pt-1 cursor-pointer"
            style={{ color: 'var(--brand-label)' }}
          >
            <span>Read more in Care</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </section>

        {/* 6. Log it myself button & Apple Health link */}
        <div className="space-y-3 pt-1">
          <PrimaryButton
            onClick={() => setLogSheetOpen(true)}
            trailingIcon={<PlusCircle className="w-5 h-5" />}
          >
            Log it myself
          </PrimaryButton>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setImportSheetOpen(true)}
              className="inline-flex items-center gap-1.5 text-[14px] font-semibold underline cursor-pointer"
              style={{ color: 'var(--text-soft)' }}
            >
              <CheckSquare className="w-4 h-4" />
              <span>Add steps or import Apple Health file</span>
            </button>
          </div>
        </div>
      </main>

      {/* All Badges Sheet */}
      <BottomSheet
        open={allBadgesOpen}
        onClose={() => setAllBadgesOpen(false)}
        title="All movement badges"
      >
        <div className="grid grid-cols-3 gap-4 py-2">
          {ALL_BADGES.map((b) => {
            const Icon = b.icon;
            const unlocked = earnedBadgesSet.has(b.id);
            return (
              <div
                key={b.id}
                className="flex flex-col items-center text-center gap-1.5"
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={
                    unlocked
                      ? { backgroundColor: b.bg, color: b.fg }
                      : {
                          backgroundColor: 'var(--row)',
                          color: 'var(--text-soft)',
                        }
                  }
                >
                  {unlocked ? (
                    <Icon className="w-7 h-7" />
                  ) : (
                    <Lock className="w-6 h-6 opacity-60" />
                  )}
                </div>
                <span className="text-[12px] font-semibold">{b.label}</span>
              </div>
            );
          })}
        </div>
      </BottomSheet>

      {/* Log it myself sheet */}
      <BottomSheet
        open={logSheetOpen}
        onClose={() => setLogSheetOpen(false)}
        title="Log it myself"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold mb-1">
              Activity type
            </label>
            <select
              value={manualType}
              onChange={(e) => setManualType(e.target.value)}
              className="w-full h-12 px-3 rounded-[14px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[15px]"
            >
              <option value="Brisk walk">Brisk walk</option>
              <option value="Desk stretch">Desk stretch</option>
              <option value="Cycling">Cycling</option>
              <option value="Swimming">Swimming</option>
              <option value="Yoga or mobility">Yoga or mobility</option>
              <option value="Strength session">Strength session</option>
            </select>
          </div>

          <div>
            <label className="block text-[13px] font-semibold mb-1">
              Minutes
            </label>
            <input
              type="number"
              value={manualMin}
              onChange={(e) => setManualMin(e.target.value)}
              className="w-full h-12 px-3 rounded-[14px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[16px] font-bold"
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold mb-1">
              Steps (optional)
            </label>
            <input
              type="number"
              value={manualSteps}
              onChange={(e) => setManualSteps(e.target.value)}
              placeholder="e.g. 2500"
              className="w-full h-12 px-3 rounded-[14px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[15px]"
            />
          </div>

          <PrimaryButton
            onClick={async () => {
              const mins = Math.max(1, parseInt(manualMin || '10', 10));
              const st = manualSteps ? parseInt(manualSteps, 10) : undefined;
              await completeSession({
                kind: 'manual',
                refId: 'manual-log',
                title: manualType,
                durationSec: mins * 60,
                steps: st,
              });
              setLogSheetOpen(false);
            }}
          >
            Save activity
          </PrimaryButton>
        </div>
      </BottomSheet>

      {/* Apple Health & Steps sheet */}
      <BottomSheet
        open={importSheetOpen}
        onClose={() => setImportSheetOpen(false)}
        title="Steps & Apple Health import"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-[18px] space-y-3" style={{ backgroundColor: 'var(--row)' }}>
            <h3 className="text-[15px] font-bold font-display">
              Manual daily steps
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[12px] font-semibold mb-1">
                  Today&apos;s steps
                </label>
                <input
                  type="number"
                  value={stepEntryVal}
                  onChange={(e) => setStepEntryVal(e.target.value)}
                  placeholder="6000"
                  className="w-full h-10 px-3 rounded-[12px] bg-white dark:bg-slate-800 text-[14px]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold mb-1">
                  Daily goal
                </label>
                <input
                  type="number"
                  value={stepGoalVal}
                  onChange={(e) => setStepGoalVal(e.target.value)}
                  placeholder="7000"
                  className="w-full h-10 px-3 rounded-[12px] bg-white dark:bg-slate-800 text-[14px]"
                />
              </div>
            </div>
            <PrimaryButton
              onClick={async () => {
                await addStepsForToday(
                  parseInt(stepEntryVal || '0', 10),
                  parseInt(stepGoalVal || '7000', 10)
                );
                setImportSheetOpen(false);
              }}
            >
              Save steps
            </PrimaryButton>
          </div>

          <div className="p-3.5 rounded-[18px] space-y-2.5" style={{ backgroundColor: 'var(--row)' }}>
            <h3 className="text-[15px] font-bold font-display">
              Import Apple Health file (export.zip or export.xml)
            </h3>
            <p className="text-[12px]" style={{ color: 'var(--text-soft)' }}>
              Parsed locally in your browser. Nothing is uploaded—only your
              last 90 days of daily step totals and workouts are saved.
            </p>
            <input
              type="file"
              accept=".zip,.xml"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setImportProgress(1);
                try {
                  const res = await parseAppleHealthFile(file, (pct) =>
                    setImportProgress(pct)
                  );
                  await importAppleHealthData(res.dailySteps, res.workouts);
                } finally {
                  setImportProgress(null);
                  setImportSheetOpen(false);
                }
              }}
              className="block w-full text-[13px] file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-bold file:bg-sky-500 file:text-slate-950 cursor-pointer"
            />

            {importProgress !== null && (
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[12px] font-bold">
                  <span>Reading Apple Health archive...</span>
                  <span>{importProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${importProgress}%`,
                      backgroundColor: 'var(--primary)',
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </BottomSheet>

      <BottomNav />
    </div>
  );
};
