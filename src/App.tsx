/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  HashRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import {
  BottomSheet,
  PrimaryButton,
  ToastBanner,
} from './components/ui';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { TodayScreen } from './screens/TodayScreen';
import { PlanScreen } from './screens/PlanScreen';
import { ProgressScreen } from './screens/ProgressScreen';
import { CareScreen } from './screens/CareScreen';
import { MeScreen } from './screens/MeScreen';
import { WorkoutDetailScreen } from './screens/WorkoutDetailScreen';
import { PlanWorkoutScreen } from './screens/PlanWorkoutScreen';
import { PlayerScreen } from './screens/PlayerScreen';
import { CompleteScreen } from './screens/CompleteScreen';
import { PostureScreen } from './screens/PostureScreen';
import { PainCheckinScreen } from './screens/PainCheckinScreen';

const GlobalReminderSheet: React.FC = () => {
  const { dueReminder, dismissReminder } = useApp();
  const navigate = useNavigate();
  const [sittingReply, setSittingReply] = useState<
    'got-up' | 'still-sitting' | undefined
  >(undefined);

  if (!dueReminder) return null;

  return (
    <BottomSheet
      open={Boolean(dueReminder)}
      onClose={() => dismissReminder('snooze', sittingReply)}
      title={`Time to reset your ${dueReminder.area}.`}
    >
      <div className="space-y-4">
        <p className="text-[15px]" style={{ color: 'var(--text-soft)' }}>
          {dueReminder.durationMin} minutes
        </p>

        {/* Sitting block reply pills (Section 8) */}
        <div className="flex items-center gap-2">
          {(
            [
              { id: 'got-up', label: 'I got up' },
              { id: 'still-sitting', label: 'Still sitting' },
            ] as const
          ).map((opt) => {
            const active = sittingReply === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSittingReply(opt.id)}
                className="flex-1 h-10 rounded-full text-[13px] font-bold border cursor-pointer"
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
                {opt.label}
              </button>
            );
          })}
        </div>

        <PrimaryButton
          leadingPlay
          onClick={() => {
            const targetSession = dueReminder.sessionId;
            const targetId = dueReminder.id;
            dismissReminder('start', sittingReply);
            navigate(`/player/${targetSession}?itemId=${targetId}`);
          }}
        >
          Start
        </PrimaryButton>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => dismissReminder('snooze', sittingReply)}
            className="h-11 rounded-full font-bold text-[14px] bg-white/80 dark:bg-slate-800/80 cursor-pointer"
          >
            Snooze 10 min
          </button>
          <button
            type="button"
            onClick={() => dismissReminder('skip', sittingReply)}
            className="h-11 rounded-full font-bold text-[14px] cursor-pointer"
            style={{ color: 'var(--text-soft)' }}
          >
            Skip today
          </button>
        </div>
      </div>
    </BottomSheet>
  );
};

const AppRoutes: React.FC = () => {
  const { loading, uid, profile, toastMessage } = useApp();

  if (loading) {
    return (
      <div className="max-w-[430px] mx-auto min-h-screen px-5 pt-16 space-y-4">
        <div className="h-12 rounded-[20px] bg-white/50 animate-pulse" />
        <div className="h-48 rounded-[28px] bg-white/50 animate-pulse" />
        <div className="h-64 rounded-[28px] bg-white/50 animate-pulse" />
      </div>
    );
  }

  const requireCompletedProfile = (element: React.ReactElement) => {
    if (!uid) return <Navigate to="/welcome" replace />;
    if (!profile) return <Navigate to="/onboarding/1" replace />;
    return element;
  };

  return (
    <div className="max-w-[430px] mx-auto min-h-screen relative">
      <ToastBanner message={toastMessage} />
      <GlobalReminderSheet />

      <Routes>
        <Route
          path="/welcome"
          element={
            uid && profile ? <Navigate to="/" replace /> : <WelcomeScreen />
          }
        />
        <Route path="/onboarding/:step" element={<OnboardingScreen />} />

        <Route path="/" element={requireCompletedProfile(<TodayScreen />)} />
        <Route path="/plan" element={requireCompletedProfile(<PlanScreen />)} />
        <Route
          path="/progress"
          element={requireCompletedProfile(<ProgressScreen />)}
        />
        <Route path="/care" element={requireCompletedProfile(<CareScreen />)} />
        <Route
          path="/care/:conditionId"
          element={requireCompletedProfile(<CareScreen />)}
        />
        <Route path="/me" element={requireCompletedProfile(<MeScreen />)} />
        <Route
          path="/workout/:id"
          element={requireCompletedProfile(<WorkoutDetailScreen />)}
        />
        <Route
          path="/plan-workout/:id"
          element={requireCompletedProfile(<PlanWorkoutScreen />)}
        />
        <Route
          path="/player/:sessionId"
          element={requireCompletedProfile(<PlayerScreen />)}
        />
        <Route
          path="/complete/:logId"
          element={requireCompletedProfile(<CompleteScreen />)}
        />
        <Route
          path="/posture"
          element={requireCompletedProfile(<PostureScreen />)}
        />
        <Route
          path="/pain-checkin"
          element={requireCompletedProfile(<PainCheckinScreen />)}
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AppProvider>
  );
}
