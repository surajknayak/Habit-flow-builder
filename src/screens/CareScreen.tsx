import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Info,
  RefreshCw,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  BottomNav,
  BottomSheet,
  PrimaryButton,
  TabHeader,
} from '../components/ui';
import { submitProblemReport } from '../lib/db';
import {
  CARE_CARDS,
  getLatestPainScore,
} from '../lib/planEngine';
import { ConditionId } from '../types';

export const CareScreen: React.FC = () => {
  const { conditionId } = useParams<{ conditionId?: string }>();
  const navigate = useNavigate();
  const {
    uid,
    profile,
    pain,
    streak,
    freezeActive,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<
    'do' | 'dont' | 'recover' | 'seeDoctor'
  >('do');
  const [reportSheetOpen, setReportSheetOpen] = useState(false);
  const [reportText, setReportText] = useState('');
  const [showAllConditions, setShowAllConditions] = useState(false);

  // Detail view if :conditionId is in URL
  if (conditionId) {
    const card =
      CARE_CARDS.find((c) => c.id === conditionId) || CARE_CARDS[0];

    const tabs: {
      id: 'do' | 'dont' | 'recover' | 'seeDoctor';
      label: string;
    }[] = [
      { id: 'do', label: 'Do' },
      { id: 'dont', label: "Don't" },
      { id: 'recover', label: 'Recover' },
      { id: 'seeDoctor', label: 'See a doctor' },
    ];

    const items = card[activeTab] || [];

    return (
      <div className="min-h-screen pb-[140px]">
        <TabHeader
          title={card.title}
          streak={streak}
          freezeActive={freezeActive}
        />

        <main className="px-5 pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate('/care')}
              className="inline-flex items-center gap-1.5 text-[14px] font-semibold cursor-pointer"
              style={{ color: 'var(--text-soft)' }}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>All care guides</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/pain-checkin')}
              className="h-9 px-3.5 rounded-full text-[13px] font-bold cursor-pointer"
              style={{
                backgroundColor: 'var(--primary-soft)',
                color: 'var(--brand-label)',
              }}
            >
              Check in pain
            </button>
          </div>

          {/* Four tabs: Do, Don't, Recover, See a doctor */}
          <div className="glass-card !p-1.5 !rounded-full flex items-center justify-between gap-1">
            {tabs.map((t) => {
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className="tap-scale flex-1 h-10 rounded-full text-[13px] font-bold whitespace-nowrap px-2 cursor-pointer"
                  style={
                    active
                      ? {
                          backgroundColor: 'var(--primary)',
                          color: 'var(--on-primary)',
                        }
                      : { color: 'var(--text-soft)' }
                  }
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Tab content list */}
          <section className="glass-card space-y-3">
            <h2 className="text-[20px] font-extrabold font-display">
              {activeTab === 'do'
                ? 'Helpful daily habits'
                : activeTab === 'dont'
                ? 'Things to avoid'
                : activeTab === 'recover'
                ? 'Easing back comfortably'
                : 'When to speak with a doctor'}
            </h2>

            <div className="space-y-2.5">
              {items.map((item) => (
                <div
                  key={item}
                  className="p-3.5 rounded-[18px] flex items-start gap-3"
                  style={{
                    backgroundColor:
                      activeTab === 'seeDoctor'
                        ? 'var(--caution-soft)'
                        : 'var(--row)',
                  }}
                >
                  {activeTab === 'do' && (
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{
                        backgroundColor: 'var(--mint)',
                        color: '#06202F',
                      }}
                    >
                      <Check className="w-4 h-4" strokeWidth={2.8} />
                    </span>
                  )}
                  {activeTab === 'dont' && (
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{
                        backgroundColor: 'var(--coral-soft)',
                        color: 'var(--coral)',
                      }}
                    >
                      <X className="w-4 h-4" strokeWidth={2.8} />
                    </span>
                  )}
                  {activeTab === 'recover' && (
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{
                        backgroundColor: 'var(--primary-soft)',
                        color: 'var(--primary)',
                      }}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </span>
                  )}
                  {activeTab === 'seeDoctor' && (
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{
                        backgroundColor: 'var(--caution-soft)',
                        color: 'var(--caution)',
                      }}
                    >
                      <Info className="w-4 h-4" />
                    </span>
                  )}

                  <span className="text-[15px] leading-snug font-medium">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Persistent bottom strip */}
          <div className="glass-card !py-3.5 !px-4 flex flex-col gap-1.5 text-center">
            <p
              className="text-[12px] font-medium"
              style={{ color: 'var(--text-soft)' }}
            >
              General wellness guidance, not medical advice. Stop and seek help
              if you feel sharp pain, dizziness, numbness or chest discomfort.
            </p>
            <button
              type="button"
              onClick={() => setReportSheetOpen(true)}
              className="text-[12px] font-bold underline cursor-pointer"
              style={{ color: 'var(--brand-label)' }}
            >
              Report a problem
            </button>
          </div>
        </main>

        <BottomSheet
          open={reportSheetOpen}
          onClose={() => setReportSheetOpen(false)}
          title="Report a problem"
        >
          <div className="space-y-3">
            <p className="text-[13px]" style={{ color: 'var(--text-soft)' }}>
              Let us know if a cue or exercise on this care card felt unclear or
              uncomfortable.
            </p>
            <textarea
              rows={3}
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              placeholder="Describe the issue..."
              className="w-full p-3 rounded-[14px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[14px]"
            />
            <PrimaryButton
              onClick={async () => {
                if (reportText.trim()) {
                  await submitProblemReport(
                    uid || 'guest-local',
                    card.id,
                    reportText.trim()
                  );
                }
                setReportText('');
                setReportSheetOpen(false);
                showToast('Thank you. Your report was saved.');
              }}
            >
              Send report
            </PrimaryButton>
          </div>
        </BottomSheet>

        <BottomNav />
      </div>
    );
  }

  // Main Care list view (/care)
  const userCondIds = new Set<ConditionId>(profile?.conditions || []);
  const displayedCards = showAllConditions
    ? CARE_CARDS
    : CARE_CARDS.filter((c) => userCondIds.has(c.id));

  const cardsToShow =
    displayedCards.length > 0 ? displayedCards : CARE_CARDS.slice(0, 5);

  return (
    <div className="min-h-screen pb-[130px]">
      <TabHeader title="Care" streak={streak} freezeActive={freezeActive} />

      <main className="px-5 pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[20px] font-extrabold font-display">
              Your care guides
            </h2>
            <p className="text-[13px]" style={{ color: 'var(--text-soft)' }}>
              Gentle guidance and comfort tracking
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/pain-checkin')}
            className="tap-scale h-10 px-4 rounded-full text-[13px] font-bold cursor-pointer"
            style={{
              backgroundColor: 'var(--primary)',
              color: 'var(--on-primary)',
            }}
          >
            Check in
          </button>
        </div>

        <div className="space-y-3">
          {cardsToShow.map((card) => {
            const latestScore = profile
              ? getLatestPainScore(card.id, profile, pain)
              : 3;
            const condLogs = pain
              .filter((p) => p.condition === card.id)
              .sort((a, b) => a.date.localeCompare(b.date));
            const firstScore =
              condLogs.length > 0 ? condLogs[0].score : Math.min(10, latestScore + 1);

            return (
              <button
                key={card.id}
                type="button"
                onClick={() => navigate(`/care/${card.id}`)}
                className="tap-scale w-full glass-card !p-4 flex items-center justify-between gap-3 text-left cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[18px] font-bold font-display">
                    {card.title}
                  </div>
                  <div
                    className="text-[13px] mt-0.5 truncate"
                    style={{ color: 'var(--text-soft)' }}
                  >
                    {card.do[0]}
                  </div>
                </div>

                {/* Small sparkline + latest pain score */}
                <div className="flex items-center gap-3 shrink-0">
                  <svg viewBox="0 0 60 28" className="w-14 h-7">
                    <polyline
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={`4,${24 - (firstScore / 10) * 18} 30,${
                        24 - ((firstScore + latestScore) / 20) * 18
                      } 56,${24 - (latestScore / 10) * 18}`}
                    />
                    <circle
                      cx="56"
                      cy={24 - (latestScore / 10) * 18}
                      r="3"
                      fill="var(--mint)"
                    />
                  </svg>

                  <div className="text-right">
                    <div
                      className="text-[18px] font-extrabold tabular-nums font-display leading-none"
                      style={{
                        color:
                          latestScore >= 7 ? 'var(--caution)' : 'var(--text)',
                      }}
                    >
                      {latestScore}/10
                    </div>
                    <div
                      className="text-[11px]"
                      style={{ color: 'var(--text-soft)' }}
                    >
                      Score
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5" style={{ color: 'var(--text-soft)' }} />
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => setShowAllConditions((v) => !v)}
            className="text-[14px] font-bold underline cursor-pointer"
            style={{ color: 'var(--brand-label)' }}
          >
            {showAllConditions
              ? 'Show only my conditions'
              : `Browse all ${CARE_CARDS.length} condition guides`}
          </button>

          <button
            type="button"
            onClick={() => navigate('/posture')}
            className="text-[14px] font-bold underline cursor-pointer"
            style={{ color: 'var(--brand-label)' }}
          >
            Posture check →
          </button>
        </div>

        {/* Persistent bottom strip */}
        <div className="glass-card !py-3.5 !px-4 text-center space-y-1">
          <p
            className="text-[12px] font-medium"
            style={{ color: 'var(--text-soft)' }}
          >
            General wellness guidance, not medical advice. Stop and seek help if
            you feel sharp pain, dizziness, numbness or chest discomfort.
          </p>
          <button
            type="button"
            onClick={() => setReportSheetOpen(true)}
            className="text-[12px] font-bold underline cursor-pointer"
            style={{ color: 'var(--brand-label)' }}
          >
            Report a problem
          </button>
        </div>
      </main>

      <BottomSheet
        open={reportSheetOpen}
        onClose={() => setReportSheetOpen(false)}
        title="Report a problem"
      >
        <div className="space-y-3">
          <textarea
            rows={3}
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            placeholder="Share your feedback or report an issue..."
            className="w-full p-3 rounded-[14px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[14px]"
          />
          <PrimaryButton
            onClick={async () => {
              if (reportText.trim()) {
                await submitProblemReport(
                  uid || 'guest-local',
                  'general',
                  reportText.trim()
                );
              }
              setReportText('');
              setReportSheetOpen(false);
              showToast('Thank you. Your report was saved.');
            }}
          >
            Send report
          </PrimaryButton>
        </div>
      </BottomSheet>

      <BottomNav />
    </div>
  );
};
