import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Laptop } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Illustration } from '../components/Illustration';
import {
  BottomNav,
  PrimaryButton,
  TabHeader,
} from '../components/ui';

const POSTURE_ITEMS = [
  {
    id: 'eye-level',
    label: 'Screen at eye level',
    tip: 'Raise your monitor or laptop on books or a stand so the top third is at eye level.',
  },
  {
    id: 'feet-flat',
    label: 'Feet flat on the floor',
    tip: 'Uncross your legs and rest both feet flat (or on a small footrest).',
  },
  {
    id: 'elbows-90',
    label: 'Elbows near 90 degrees',
    tip: 'Bring your keyboard and mouse closer so your elbows rest softly by your sides.',
  },
  {
    id: 'back-supported',
    label: 'Lower back supported',
    tip: 'Sit back into the chair or place a small rolled towel behind your lower waist.',
  },
  {
    id: 'shoulders-relaxed',
    label: 'Shoulders relaxed',
    tip: 'Exhale and let your shoulders drop away from your ears.',
  },
];

export const PostureScreen: React.FC = () => {
  const navigate = useNavigate();
  const { streak, freezeActive, savePostureCheck } = useApp();

  const [checkedIds, setCheckedIds] = useState<string[]>([
    'feet-flat',
    'elbows-90',
    'shoulders-relaxed',
  ]);

  const toggleItem = (id: string) => {
    setCheckedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const score = checkedIds.length;
  const uncheckedItems = POSTURE_ITEMS.filter(
    (item) => !checkedIds.includes(item.id)
  );

  return (
    <div className="min-h-screen pb-[120px]">
      <TabHeader title="Posture" streak={streak} freezeActive={freezeActive} />

      <main className="px-5 pt-4 space-y-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-[14px] font-semibold cursor-pointer"
          style={{ color: 'var(--text-soft)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {/* Quick posture check card */}
        <section className="glass-card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[20px] font-extrabold font-display">
              Quick posture check
            </h2>
            <span
              className="px-3 py-1 rounded-full text-[13px] font-extrabold tabular-nums font-display"
              style={{
                backgroundColor:
                  score >= 4 ? 'var(--mint-soft)' : 'var(--primary-soft)',
                color: score >= 4 ? 'var(--mint-dark)' : 'var(--brand-label)',
              }}
            >
              {score} of 5
            </span>
          </div>

          <div className="space-y-2">
            {POSTURE_ITEMS.map((item) => {
              const checked = checkedIds.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  className="tap-scale w-full p-3.5 rounded-[18px] flex items-center justify-between gap-3 text-left cursor-pointer"
                  style={{
                    backgroundColor: checked
                      ? 'var(--mint-soft)'
                      : 'var(--row)',
                  }}
                >
                  <span className="text-[16px] font-semibold">
                    {item.label}
                  </span>
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center border-2 shrink-0"
                    style={
                      checked
                        ? {
                            backgroundColor: 'var(--mint)',
                            borderColor: 'var(--mint)',
                            color: '#06202F',
                          }
                        : {
                            borderColor: 'var(--text-soft)',
                          }
                    }
                  >
                    {checked && <Check className="w-4 h-4" strokeWidth={2.8} />}
                  </span>
                </button>
              );
            })}
          </div>

          {/* One-line tip for each unchecked item */}
          {uncheckedItems.length > 0 && (
            <div
              className="rounded-[18px] p-3.5 space-y-2 text-[13px]"
              style={{ backgroundColor: 'var(--primary-soft)' }}
            >
              <div
                className="font-bold text-[12px] uppercase tracking-wider"
                style={{ color: 'var(--brand-label)' }}
              >
                Quick adjustments
              </div>
              {uncheckedItems.map((u) => (
                <p key={u.id} className="leading-snug">
                  • <strong>{u.label}:</strong> {u.tip}
                </p>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => savePostureCheck(score)}
            className="tap-scale w-full h-11 rounded-full font-display text-[15px] font-bold bg-white/90 dark:bg-slate-800 shadow-xs cursor-pointer"
            style={{ color: 'var(--brand-label)' }}
          >
            Save posture check ({score} of 5)
          </button>
        </section>

        {/* Set up your workspace card */}
        <section className="glass-card space-y-3">
          <h2 className="text-[20px] font-extrabold font-display">
            Set up your workspace
          </h2>
          <Illustration
            name="posture-workspace"
            category="primary"
            className="w-full h-36 rounded-[20px]"
            alt="Ergonomic workspace setup"
          />
          <div
            className="p-3.5 rounded-[18px] flex items-start gap-3"
            style={{ backgroundColor: 'var(--row)' }}
          >
            <Laptop
              className="w-5 h-5 shrink-0 mt-0.5"
              style={{ color: 'var(--primary)' }}
            />
            <p
              className="text-[13px] leading-relaxed"
              style={{ color: 'var(--text-soft)' }}
            >
              <strong>Laptop-only tip:</strong> If you don&apos;t have an
              external keyboard, angle the screen slightly back and take a
              30-second chin tuck break every 25 minutes so your neck doesn&apos;t
              stay flexed downward.
            </p>
          </div>
        </section>

        {/* Start posture session button */}
        <PrimaryButton
          leadingPlay
          onClick={() => navigate('/player/posture-session')}
        >
          Start posture session
        </PrimaryButton>
      </main>

      <BottomNav />
    </div>
  );
};
