import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Calendar,
  Download,
  LogOut,
  Moon,
  Shield,
  Sun,
  Trash2,
} from 'lucide-react';
import { useApp, ThemeMode } from '../context/AppContext';
import { PWAInstallCard } from '../components/PWAInstallBanner';
import {
  BottomNav,
  BottomSheet,
  PrimaryButton,
  TabHeader,
} from '../components/ui';
import { downloadRemindersICS } from '../lib/calendarExport';
import {
  CONDITION_LABELS,
  MOVES,
} from '../lib/planEngine';
import { CheerStyle, ConditionId } from '../types';

const ALL_CONDITIONS: ConditionId[] = [
  'lower-back',
  'upper-back',
  'neck-shoulders',
  'eyes',
  'wrists-hands',
  'hips',
  'knees',
  'ankle-foot',
  'headaches',
  'high-bp',
  'heart',
  'pregnancy',
  'recent-surgery',
];

export const MeScreen: React.FC = () => {
  const navigate = useNavigate();
  const {
    user,
    profile,
    schedule,
    meta,
    streak,
    freezeActive,
    theme,
    setTheme,
    linkGuestToGoogle,
    signOutUser,
    deleteAccountAndData,
    updateProfileAndSchedule,
    toggleMoveDisabled,
    exportAllDataAsJson,
    showToast,
  } = useApp();

  const [editConditionsOpen, setEditConditionsOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [staticDocModal, setStaticDocModal] = useState<
    'terms' | 'privacy' | 'about' | null
  >(null);

  if (!profile || !schedule) return null;

  const isGuest = Boolean(user?.isGuest);
  const initial = (user?.name || 'F').charAt(0).toUpperCase();

  const handleTurnOnBrowserNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      showToast('Notifications are not supported in this browser.');
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        showToast('Browser notifications enabled while app is open.');
      } else {
        showToast('Notification permission was not granted.');
      }
    } catch {
      showToast('Could not request notification permission.');
    }
  };

  const toggleConditionInMe = async (cond: ConditionId) => {
    const exists = profile.conditions.includes(cond);
    const nextConds = exists
      ? profile.conditions.filter((c) => c !== cond)
      : [...profile.conditions, cond];
    await updateProfileAndSchedule({ conditions: nextConds });
  };

  return (
    <div className="min-h-screen pb-[130px]">
      <TabHeader title="Me" streak={streak} freezeActive={freezeActive} />

      <main className="px-5 pt-4 space-y-4">
        {/* Guest "Save my progress" top card */}
        {isGuest && (
          <section className="glass-card space-y-3 border-2" style={{ borderColor: 'var(--primary)' }}>
            <div>
              <h2 className="text-[18px] font-extrabold font-display">
                Save my progress
              </h2>
              <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-soft)' }}>
                Link your Google account so your streak, plans, and logs stay safe across devices.
              </p>
            </div>
            <PrimaryButton onClick={linkGuestToGoogle}>
              Continue with Google
            </PrimaryButton>
          </section>
        )}

        {/* Profile header (avatar, name, level chip) */}
        <section className="glass-card flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.name}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-full object-cover"
              />
            ) : (
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-[22px] font-extrabold font-display shrink-0"
                style={{
                  backgroundColor: 'var(--primary-soft)',
                  color: 'var(--brand-label)',
                }}
              >
                {initial}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-[20px] font-extrabold font-display truncate">
                {user?.name || 'Friend'}
              </h2>
              <p className="text-[13px] truncate" style={{ color: 'var(--text-soft)' }}>
                {user?.email || (isGuest ? 'Guest session on this device' : '')}
              </p>
            </div>
          </div>

          <span
            className="px-3.5 py-1 rounded-full text-[13px] font-bold shrink-0"
            style={{
              backgroundColor: 'var(--primary-soft)',
              color: 'var(--brand-label)',
            }}
          >
            {profile.level}
          </span>
        </section>

        {/* Add to Home Screen help card */}
        <PWAInstallCard />

        {/* Profile and conditions */}
        <section className="glass-card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[18px] font-bold font-display">
              Profile and conditions
            </h3>
            <button
              type="button"
              onClick={() => setEditConditionsOpen(true)}
              className="text-[13px] font-bold underline cursor-pointer"
              style={{ color: 'var(--brand-label)' }}
            >
              Edit
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {profile.conditions.length > 0 ? (
              profile.conditions.map((c) => (
                <span
                  key={c}
                  className="px-3 py-1 rounded-full text-[13px] font-semibold"
                  style={{ backgroundColor: 'var(--row)' }}
                >
                  {CONDITION_LABELS[c]}
                </span>
              ))
            ) : (
              <span className="text-[13px]" style={{ color: 'var(--text-soft)' }}>
                No active conditions selected
              </span>
            )}
          </div>

          {/* Disabled moves list (if user tapped "This hurt") */}
          {(meta.disabledMoveIds?.length || 0) > 0 && (
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2">
              <div className="text-[13px] font-bold">
                Paused moves (marked &ldquo;This hurt&rdquo;)
              </div>
              {meta.disabledMoveIds.map((mId) => {
                const mv = MOVES.find((m) => m.id === mId);
                return (
                  <div
                    key={mId}
                    className="flex items-center justify-between p-2.5 rounded-[14px]"
                    style={{ backgroundColor: 'var(--row)' }}
                  >
                    <span className="text-[14px] font-medium">
                      {mv?.title || mId}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleMoveDisabled(mId)}
                      className="text-[12px] font-bold underline cursor-pointer"
                      style={{ color: 'var(--brand-label)' }}
                    >
                      Re-enable
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Notifications */}
        <section className="glass-card space-y-3">
          <h3 className="text-[18px] font-bold font-display">Notifications</h3>

          <div className="flex items-center justify-between text-[14px]">
            <span style={{ color: 'var(--text-soft)' }}>Reminders per day</span>
            <div className="flex items-center gap-1.5">
              {[2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() =>
                    updateProfileAndSchedule(undefined, { remindersPerDay: n })
                  }
                  className="w-9 h-9 rounded-full text-[13px] font-bold cursor-pointer"
                  style={
                    schedule.remindersPerDay === n
                      ? {
                          backgroundColor: 'var(--primary)',
                          color: 'var(--on-primary)',
                        }
                      : { backgroundColor: 'var(--row)' }
                  }
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-[14px]">
            <span style={{ color: 'var(--text-soft)' }}>Quiet days</span>
            <span className="font-semibold">
              {(schedule.daysOff || []).join(', ') || 'None'}
            </span>
          </div>

          <div className="flex items-center justify-between text-[14px]">
            <span style={{ color: 'var(--text-soft)' }}>Break windows</span>
            <span className="font-semibold tabular-nums">
              {(schedule.breakWindows || []).map((b) => b.time).join(' · ')}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => downloadRemindersICS(schedule)}
              className="tap-scale w-full h-12 rounded-full flex items-center justify-center gap-2 font-display text-[15px] font-bold cursor-pointer"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--on-primary)',
              }}
            >
              <Calendar className="w-4 h-4" />
              <span>Add reminders to my calendar</span>
            </button>

            <button
              type="button"
              onClick={handleTurnOnBrowserNotifications}
              className="tap-scale w-full h-11 rounded-full flex items-center justify-center gap-2 text-[14px] font-bold bg-white/80 dark:bg-slate-800/80 cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              <span>Turn on notifications</span>
            </button>
          </div>
        </section>

        {/* Cheering style */}
        <section className="glass-card space-y-2.5">
          <h3 className="text-[18px] font-bold font-display">Cheering style</h3>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'gentle', label: 'Gentle' },
                { id: 'cheerleader', label: 'Cheerleader' },
                { id: 'data', label: 'Data-driven' },
              ] as { id: CheerStyle; label: string }[]
            ).map((cs) => {
              const active = profile.cheerStyle === cs.id;
              return (
                <button
                  key={cs.id}
                  type="button"
                  onClick={() =>
                    updateProfileAndSchedule({ cheerStyle: cs.id })
                  }
                  className="tap-scale h-11 rounded-full text-[13px] font-bold cursor-pointer"
                  style={
                    active
                      ? {
                          backgroundColor: 'var(--primary)',
                          color: 'var(--on-primary)',
                        }
                      : { backgroundColor: 'var(--row)' }
                  }
                >
                  {cs.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Appearance (Light, Dark, System) */}
        <section className="glass-card space-y-2.5">
          <h3 className="text-[18px] font-bold font-display">Appearance</h3>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'light', label: 'Light', icon: Sun },
                { id: 'dark', label: 'Dark', icon: Moon },
                { id: 'system', label: 'System', icon: Shield },
              ] as { id: ThemeMode; label: string; icon: React.FC<{ className?: string }> }[]
            ).map((opt) => {
              const Icon = opt.icon;
              const active = theme === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTheme(opt.id)}
                  className="tap-scale h-11 rounded-full flex items-center justify-center gap-1.5 text-[13px] font-bold cursor-pointer"
                  style={
                    active
                      ? {
                          backgroundColor: 'var(--primary)',
                          color: 'var(--on-primary)',
                        }
                      : { backgroundColor: 'var(--row)' }
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Privacy */}
        <section className="glass-card space-y-2.5">
          <h3 className="text-[18px] font-bold font-display">Privacy</h3>

          <button
            type="button"
            onClick={exportAllDataAsJson}
            className="tap-scale w-full h-12 px-4 rounded-[18px] flex items-center justify-between font-semibold text-[15px] cursor-pointer"
            style={{ backgroundColor: 'var(--row)' }}
          >
            <span>Export my data</span>
            <Download className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setDeleteConfirmOpen(true)}
            className="tap-scale w-full h-12 px-4 rounded-[18px] flex items-center justify-between font-bold text-[15px] cursor-pointer"
            style={{
              backgroundColor: 'var(--caution-soft)',
              color: 'var(--caution)',
            }}
          >
            <span>Delete account and data</span>
            <Trash2 className="w-4 h-4" />
          </button>
        </section>

        {/* About and disclaimer */}
        <section className="glass-card space-y-2.5">
          <h3 className="text-[18px] font-bold font-display">
            About and disclaimer
          </h3>
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-soft)' }}>
            General wellness guidance, not medical advice. Stop and seek help if
            you feel sharp pain, dizziness, numbness or chest discomfort.
          </p>
          <div className="flex items-center gap-4 pt-1 text-[13px] font-bold">
            <button
              type="button"
              onClick={() => setStaticDocModal('terms')}
              className="underline cursor-pointer"
              style={{ color: 'var(--brand-label)' }}
            >
              Terms
            </button>
            <button
              type="button"
              onClick={() => setStaticDocModal('privacy')}
              className="underline cursor-pointer"
              style={{ color: 'var(--brand-label)' }}
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => setStaticDocModal('about')}
              className="underline cursor-pointer"
              style={{ color: 'var(--brand-label)' }}
            >
              About
            </button>
          </div>

          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
            <button
              type="button"
              onClick={async () => {
                await signOutUser();
                navigate('/welcome');
              }}
              className="inline-flex items-center gap-1.5 text-[14px] font-semibold cursor-pointer"
              style={{ color: 'var(--text-soft)' }}
            >
              <LogOut className="w-4 h-4" />
              <span>Sign out</span>
            </button>
          </div>
        </section>
      </main>

      {/* Edit conditions sheet */}
      <BottomSheet
        open={editConditionsOpen}
        onClose={() => setEditConditionsOpen(false)}
        title="Update your conditions"
      >
        <div className="flex flex-wrap gap-2 pb-4">
          {ALL_CONDITIONS.map((c) => {
            const active = profile.conditions.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleConditionInMe(c)}
                className="h-10 px-3.5 rounded-full text-[13px] font-bold border-2 cursor-pointer"
                style={
                  active
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
                {CONDITION_LABELS[c]}
              </button>
            );
          })}
        </div>
        <PrimaryButton onClick={() => setEditConditionsOpen(false)}>
          Done
        </PrimaryButton>
      </BottomSheet>

      {/* Delete confirmation sheet */}
      <BottomSheet
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Delete account and data?"
      >
        <div className="space-y-4">
          <p className="text-[14px]" style={{ color: 'var(--text-soft)' }}>
            This permanently deletes your profile, schedule, daily plans,
            activity logs, and pain history from this device and Firestore. This
            cannot be undone.
          </p>
          <button
            type="button"
            onClick={async () => {
              setDeleteConfirmOpen(false);
              await deleteAccountAndData();
              navigate('/welcome');
            }}
            className="w-full h-13 rounded-full font-display text-[17px] font-bold text-white cursor-pointer"
            style={{ backgroundColor: 'var(--caution)' }}
          >
            Yes, delete everything
          </button>
          <button
            type="button"
            onClick={() => setDeleteConfirmOpen(false)}
            className="w-full py-2.5 text-[15px] font-bold cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </BottomSheet>

      {/* Static pages modal (Terms, Privacy Policy, About) */}
      <BottomSheet
        open={staticDocModal !== null}
        onClose={() => setStaticDocModal(null)}
        title={
          staticDocModal === 'terms'
            ? 'Terms of Use'
            : staticDocModal === 'privacy'
            ? 'Privacy Policy'
            : 'About Habit Flow'
        }
      >
        {staticDocModal === 'terms' && (
          <div className="space-y-3 text-[14px]" style={{ color: 'var(--text-soft)' }}>
            <p>
              <strong>Not a medical product.</strong> Habit Flow provides
              curated, low-impact movement resets and general wellness tips. It
              does not provide medical diagnosis or treatment.
            </p>
            <p>
              Always consult a qualified healthcare professional before starting
              new physical activities, especially if you have an injury, chronic
              pain, heart condition, or are pregnant.
            </p>
          </div>
        )}
        {staticDocModal === 'privacy' && (
          <div className="space-y-3 text-[14px]" style={{ color: 'var(--text-soft)' }}>
            <p>
              <strong>What is stored:</strong> Your age band, selected body
              conditions, pain check-in scores, work schedule windows, and
              completed reset logs.
            </p>
            <p>
              <strong>Private to you:</strong> Your data is protected by strict
              user-level security rules (`request.auth.uid == uid`) and cached
              on your device via IndexedDB for offline access.
            </p>
            <p>
              <strong>Your control:</strong> Use <em>Export my data</em> at any
              time to download a full JSON archive, or <em>Delete account and data</em>{' '}
              to erase everything permanently.
            </p>
          </div>
        )}
        {staticDocModal === 'about' && (
          <div className="space-y-3 text-[14px]" style={{ color: 'var(--text-soft)' }}>
            <p>
              <strong>Habit Flow</strong> is a self-guided daily movement coach
              built for adults who sit at a desk or want gentle, guilt-free
              consistency.
            </p>
            <p>
              Every day brings one main session, three to five 3-minute break
              resets, a quick posture check, and a Daily Boost quote.
            </p>
          </div>
        )}
      </BottomSheet>

      <BottomNav />
    </div>
  );
};
