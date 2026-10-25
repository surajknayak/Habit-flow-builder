import React, { useId } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  Accessibility,
  Armchair,
  Calendar,
  Check,
  Eye,
  Flame,
  Footprints,
  Hand,
  Moon,
  PersonStanding,
  Play,
  Snowflake,
  Sparkles,
  Star,
  Sun,
  User,
  Zap,
} from 'lucide-react';
import { PlanItem } from '../types';

export function getCategoryIcon(iconName: string) {
  switch (iconName) {
    case 'armchair':
      return Armchair;
    case 'accessibility':
      return Accessibility;
    case 'spline':
      return Activity;
    case 'footprints':
      return Footprints;
    case 'hand':
      return Hand;
    case 'eye':
      return Eye;
    case 'zap':
      return Zap;
    case 'moon':
      return Moon;
    case 'star':
      return Star;
    case 'flame':
      return Flame;
    case 'person-standing':
    default:
      return PersonStanding;
  }
}

export function getCategoryColors(category: string): {
  bg: string;
  fg: string;
} {
  switch (category) {
    case 'coral':
      return { bg: 'var(--coral-soft)', fg: 'var(--coral)' };
    case 'lavender':
      return { bg: 'var(--lavender-soft)', fg: 'var(--lavender)' };
    case 'mint':
      return { bg: 'var(--mint-soft)', fg: 'var(--mint-dark)' };
    case 'sun':
      return { bg: 'var(--sun-soft)', fg: '#B88600' };
    case 'primary':
    default:
      return { bg: 'var(--primary-soft)', fg: 'var(--primary)' };
  }
}

export const TabHeader: React.FC<{
  title: string;
  streak: number;
  freezeActive?: boolean;
}> = ({ title, streak, freezeActive }) => {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between py-3 px-5 backdrop-blur-md bg-white/60 dark:bg-slate-950/60 border-b border-white/40 dark:border-white/10">
      <div className="flex items-center gap-3 min-w-0">
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
        <div className="flex flex-col min-w-0">
          <span
            className="text-[12px] font-bold uppercase tracking-[0.08em] leading-none"
            style={{ color: 'var(--brand-label)' }}
          >
            HABIT FLOW
          </span>
          <h1 className="text-[24px] font-extrabold leading-tight truncate font-display">
            {title}
          </h1>
        </div>
      </div>

      <div
        className="flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-white/95 dark:bg-slate-800/95 shadow-sm border border-white/80 dark:border-white/10 shrink-0"
        title={
          freezeActive
            ? `${streak}-day streak (1 weekly streak freeze active)`
            : `${streak}-day streak`
        }
        aria-label={`${streak} day streak`}
      >
        <Flame
          className="w-4 h-4 shrink-0"
          style={{ color: 'var(--coral)', fill: 'var(--coral)' }}
        />
        <span className="text-[15px] font-extrabold tabular-nums font-display">
          {streak}
        </span>
        {freezeActive && (
          <Snowflake
            className="w-3.5 h-3.5 text-sky-500 ml-0.5"
            aria-label="Streak freeze used this week"
          />
        )}
      </div>
    </header>
  );
};

export const PrimaryButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  leadingPlay?: boolean;
  trailingIcon?: React.ReactNode;
  className?: string;
  type?: 'button' | 'submit';
}> = ({
  children,
  onClick,
  disabled,
  leadingPlay,
  trailingIcon,
  className = '',
  type = 'button',
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`tap-scale w-full h-[56px] rounded-full flex items-center justify-center gap-3 px-5 font-display text-[18px] font-bold shadow-md disabled:opacity-50 cursor-pointer ${className}`}
      style={{
        backgroundColor: 'var(--primary)',
        color: 'var(--on-primary)',
      }}
    >
      {leadingPlay && (
        <span className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 -ml-1 shadow-xs">
          <Play
            className="w-5 h-5 ml-0.5"
            style={{ color: 'var(--primary)', fill: 'var(--primary)' }}
          />
        </span>
      )}
      <span className="truncate">{children}</span>
      {trailingIcon && <span className="shrink-0 ml-auto">{trailingIcon}</span>}
    </button>
  );
};

export const FloatingChip: React.FC<{
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ icon, children, className = '' }) => {
  return (
    <div
      className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-white/90 dark:bg-slate-900/90 text-[14px] font-semibold shadow-sm backdrop-blur-xs ${className}`}
      style={{ color: 'var(--text)' }}
    >
      {icon}
      <span className="whitespace-nowrap">{children}</span>
    </div>
  );
};

export const TaskCard: React.FC<{
  item: PlanItem;
  formattedTime: string;
  onCardClick: () => void;
  onStatusClick: (e: React.MouseEvent) => void;
}> = ({ item, formattedTime, onCardClick, onStatusClick }) => {
  const IconComp = getCategoryIcon(item.icon);
  const colors = getCategoryColors(item.category);

  const rowBg =
    item.status === 'done'
      ? 'var(--mint-soft)'
      : item.status === 'next'
      ? 'var(--primary-soft)'
      : 'var(--row)';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onCardClick();
        }
      }}
      className="tap-scale w-full rounded-[20px] p-[14px] flex items-center gap-3 text-left transition-colors cursor-pointer"
      style={{ backgroundColor: rowBg }}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: colors.bg, color: colors.fg }}
      >
        <IconComp className="w-6 h-6" />
      </div>

      <div className="flex-1 min-w-0">
        <div
          className="text-[13px] font-medium leading-tight tabular-nums"
          style={{ color: 'var(--text-soft)' }}
        >
          {formattedTime}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[18px] font-semibold leading-snug font-display">
            {item.title}
          </span>
          {item.status === 'next' && (
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: 'var(--primary)' }}
              aria-label="Up next"
            />
          )}
          {item.status === 'done' && (
            <span
              className="px-2 py-0.5 rounded-full text-[12px] font-semibold"
              style={{
                backgroundColor: 'var(--mint)',
                color: '#06202F',
              }}
            >
              Done
            </span>
          )}
          {item.tag && item.status !== 'done' && (
            <span
              className="px-2.5 py-0.5 rounded-full text-[12px] font-semibold"
              style={{
                backgroundColor: 'var(--primary-soft)',
                color: 'var(--brand-label)',
              }}
            >
              {item.tag}
            </span>
          )}
        </div>
        <div
          className="text-[14px] mt-0.5 truncate"
          style={{ color: 'var(--text-soft)' }}
        >
          {item.subtitle}
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onStatusClick(e);
        }}
        aria-label={
          item.status === 'done'
            ? `${item.title} completed`
            : `Start ${item.title}`
        }
        className="w-12 h-12 -mr-1.5 flex items-center justify-center shrink-0 cursor-pointer"
      >
        {item.status === 'done' ? (
          <span
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--mint)', color: '#0B2A3C' }}
          >
            <Check className="w-5 h-5" strokeWidth={2.8} />
          </span>
        ) : item.status === 'next' ? (
          <span
            className="w-9 h-9 rounded-full bg-white flex items-center justify-center border-2"
            style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
          >
            <Play
              className="w-4 h-4 ml-0.5"
              style={{ fill: 'var(--primary)' }}
            />
          </span>
        ) : (
          <span
            className="w-9 h-9 rounded-full border-2"
            style={{ borderColor: 'var(--text-soft)' }}
          />
        )}
      </button>
    </div>
  );
};

export const StatTile: React.FC<{
  label: string;
  value: string;
  unit?: string;
  progress?: number; // 0 to 1
  accentColor?: string;
  tintBg?: string;
  icon: React.ReactNode;
  actionLink?: { text: string; onClick: () => void };
}> = ({
  label,
  value,
  unit,
  progress,
  accentColor = 'var(--primary)',
  tintBg = 'var(--primary-soft)',
  icon,
  actionLink,
}) => {
  return (
    <div className="glass-card flex flex-col justify-between">
      <div className="flex items-start justify-between gap-2">
        <span
          className="text-[14px] font-medium"
          style={{ color: 'var(--text-soft)' }}
        >
          {label}
        </span>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: tintBg, color: accentColor }}
        >
          {icon}
        </div>
      </div>

      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-[28px] font-extrabold tabular-nums font-display leading-none">
          {value}
        </span>
        {unit && (
          <span
            className="text-[13px] font-medium"
            style={{ color: 'var(--text-soft)' }}
          >
            {unit}
          </span>
        )}
      </div>

      {typeof progress === 'number' ? (
        <div className="mt-3 w-full h-1.5 rounded-full bg-slate-200/70 dark:bg-slate-700/60 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(100, Math.max(0, Math.round(progress * 100)))}%`,
              backgroundColor: accentColor,
            }}
          />
        </div>
      ) : actionLink ? (
        <button
          type="button"
          onClick={actionLink.onClick}
          className="mt-2.5 text-left text-[13px] font-semibold underline cursor-pointer"
          style={{ color: 'var(--brand-label)' }}
        >
          {actionLink.text}
        </button>
      ) : null}
    </div>
  );
};

export const NumberPillPicker: React.FC<{
  options: readonly (10 | 20 | 30 | 45)[];
  value: 10 | 20 | 30 | 45;
  onChange: (val: 10 | 20 | 30 | 45) => void;
}> = ({ options, value, onChange }) => {
  return (
    <div className="flex items-center justify-between gap-2.5 py-1">
      {options.map((opt) => {
        const selected = opt === value;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`tap-scale flex-1 rounded-full flex items-center justify-center tabular-nums font-display transition-all cursor-pointer ${
              selected
                ? 'h-[56px] text-[28px] font-extrabold shadow-sm'
                : 'h-[44px] text-[18px] font-semibold bg-white/80 dark:bg-slate-800/80'
            }`}
            style={
              selected
                ? {
                    backgroundColor: 'var(--primary)',
                    color: 'var(--on-primary)',
                  }
                : { color: 'var(--text)' }
            }
            aria-pressed={selected}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
};

export const ProgressRing: React.FC<{
  size?: number;
  strokeWidth?: number;
  progress: number; // 0 to 1
  children?: React.ReactNode;
}> = ({ size = 190, strokeWidth = 14, progress, children }) => {
  const gradId = useId();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, progress));
  const offset = circumference - clamped * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--mint)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(46, 184, 245, 0.15)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 300ms ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
        {children}
      </div>
    </div>
  );
};

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    { path: '/', label: 'Today', icon: Sun },
    { path: '/plan', label: 'Plan', icon: Calendar },
    { path: '/progress', label: 'Progress', icon: Activity },
    { path: '/care', label: 'Care', icon: PersonStanding },
    { path: '/me', label: 'Me', icon: User },
  ];

  const isTabActive = (tabPath: string) => {
    if (tabPath === '/') return location.pathname === '/';
    return location.pathname.startsWith(tabPath);
  };

  return (
    <nav
      aria-label="Primary Bottom Navigation"
      className="fixed bottom-5 left-0 right-0 z-40 mx-auto max-w-[430px] px-5 pointer-events-none"
    >
      <div className="pointer-events-auto h-16 rounded-[32px] glass-card !p-1.5 flex items-center justify-between shadow-lg">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isTabActive(tab.path);
          return (
            <button
              key={tab.path}
              type="button"
              onClick={() => navigate(tab.path)}
              aria-current={active ? 'page' : undefined}
              className={`tap-scale h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                active ? 'px-4 gap-1.5 font-bold' : 'flex-1 flex-col gap-0.5'
              }`}
              style={
                active
                  ? {
                      backgroundColor: 'var(--primary)',
                      color: 'var(--on-primary)',
                    }
                  : { color: 'var(--text-soft)' }
              }
            >
              <Icon className="w-5 h-5 shrink-0" strokeWidth={active ? 2.5 : 2} />
              <span
                className={
                  active
                    ? 'text-[13px] font-bold whitespace-nowrap'
                    : 'text-[11px] font-medium whitespace-nowrap'
                }
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export const BottomSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}> = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Sheet'}
        className="w-full max-w-[430px] glass-sheet p-5 pb-8 max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1.5 rounded-full bg-slate-400/50 mx-auto mb-4" />
        {title && (
          <h2 className="text-[22px] font-extrabold font-display mb-3">
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
};

export const ToastBanner: React.FC<{ message: string | null }> = ({
  message,
}) => {
  if (!message) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 glass-card !py-2.5 !px-5 !rounded-full shadow-lg flex items-center gap-2 text-[14px] font-semibold"
    >
      <Sparkles className="w-4 h-4" style={{ color: 'var(--primary)' }} />
      <span>{message}</span>
    </div>
  );
};
