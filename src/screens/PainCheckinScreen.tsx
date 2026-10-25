import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PrimaryButton } from '../components/ui';
import {
  CONDITION_LABELS,
  getLatestPainScore,
} from '../lib/planEngine';
import { ConditionId } from '../types';

export const PainCheckinScreen: React.FC = () => {
  const navigate = useNavigate();
  const { profile, pain, savePainCheckin } = useApp();

  const conditions: ConditionId[] =
    profile?.conditions && profile.conditions.length > 0
      ? profile.conditions
      : ['lower-back'];

  const [scores, setScores] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const c of conditions) {
      init[c] = profile ? getLatestPainScore(c, profile, pain) : 3;
    }
    return init;
  });

  const [notes, setNotes] = useState<Record<string, string>>({});

  const primaryArea =
    conditions.length === 1
      ? CONDITION_LABELS[conditions[0]].toLowerCase()
      : 'body';

  const handleSave = async () => {
    const entries = conditions.map((c) => ({
      condition: c,
      score: scores[c] ?? 3,
      note: notes[c]?.trim() || undefined,
    }));
    await savePainCheckin(entries);
    navigate(-1);
  };

  return (
    <div className="min-h-screen px-5 pt-4 pb-10 flex flex-col justify-between">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="tap-scale w-12 h-12 rounded-full bg-white/90 dark:bg-slate-800/90 flex items-center justify-center shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[24px] font-extrabold font-display leading-tight">
            How does your {primaryArea} feel today?
          </h1>
        </div>

        <p className="text-[14px]" style={{ color: 'var(--text-soft)' }}>
          Weekly check-ins help us adjust your workouts and resets gently.
        </p>

        <div className="space-y-4">
          {conditions.map((cond) => {
            const val = scores[cond] ?? 3;
            return (
              <div key={cond} className="glass-card space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[18px] font-bold font-display">
                    {CONDITION_LABELS[cond]}
                  </span>
                  <span
                    className="text-[36px] font-extrabold tabular-nums font-display leading-none"
                    style={{
                      color: val >= 7 ? 'var(--caution)' : 'var(--text)',
                    }}
                  >
                    {val}
                  </span>
                </div>

                <div>
                  <div
                    className="flex justify-between text-[12px] font-semibold mb-1.5"
                    style={{ color: 'var(--text-soft)' }}
                  >
                    <span>0 · Comfortable</span>
                    <span>10 · Severe</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={val}
                    onChange={(e) =>
                      setScores((prev) => ({
                        ...prev,
                        [cond]: parseInt(e.target.value, 10),
                      }))
                    }
                    className="w-full h-2.5 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background:
                        'linear-gradient(90deg, #5EE6B0 0%, #FFD24D 60%, #E5533D 100%)',
                    }}
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold mb-1">
                    Optional note
                  </label>
                  <input
                    type="text"
                    value={notes[cond] || ''}
                    maxLength={200}
                    onChange={(e) =>
                      setNotes((prev) => ({ ...prev, [cond]: e.target.value }))
                    }
                    placeholder="e.g. Stiff after morning meetings"
                    className="w-full h-11 px-3.5 rounded-[14px] bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-[14px]"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-6">
        <PrimaryButton onClick={handleSave}>Save</PrimaryButton>
      </div>
    </div>
  );
};
