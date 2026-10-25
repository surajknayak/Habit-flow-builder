import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Building2,
  Check,
  Dumbbell,
  Eye,
  Footprints,
  Hand,
  Heart,
  Home,
  PersonStanding,
  Sparkles,
  Sun,
  Trees,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Illustration } from '../components/Illustration';
import {
  BottomSheet,
  NumberPillPicker,
  PrimaryButton,
} from '../components/ui';
import { deriveActivityLevel } from '../lib/planEngine';
import {
  BreakWindow,
  CheerStyle,
  ConditionId,
  ProfileDoc,
  ScheduleDoc,
  UserDoc,
} from '../types';

const AGE_BANDS = [
  '18 to 24',
  '25 to 34',
  '35 to 44',
  '45 to 54',
  '55 to 64',
  '65+',
];

const SEX_OPTIONS = ['Female', 'Male', 'Another', 'Prefer not to say'];

const ACTIVITY_CARDS: {
  title: ProfileDoc['activity']['habitType'];
  subtitle: string;
}[] = [
  { title: 'Mostly sitting', subtitle: 'Long desk hours with occasional walks' },
  { title: 'Light walking', subtitle: 'Daily strolls or errands on foot' },
  { title: 'Some exercise', subtitle: '1 to 3 workouts or active sessions a week' },
  { title: 'Regular exercise', subtitle: '4 or more active sessions each week' },
];

const CONDITION_ITEMS: { id: ConditionId; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'lower-back', label: 'Lower back', icon: Activity },
  { id: 'upper-back', label: 'Upper back', icon: PersonStanding },
  { id: 'neck-shoulders', label: 'Neck and shoulders', icon: PersonStanding },
  { id: 'eyes', label: 'Eyes', icon: Eye },
  { id: 'wrists-hands', label: 'Wrists and hands', icon: Hand },
  { id: 'hips', label: 'Hips', icon: Footprints },
  { id: 'knees', label: 'Knees', icon: Footprints },
  { id: 'ankle-foot', label: 'Ankle or foot', icon: Footprints },
  { id: 'headaches', label: 'Headaches', icon: Sparkles },
  { id: 'high-bp', label: 'High blood pressure', icon: Heart },
  { id: 'heart', label: 'Heart condition', icon: Heart },
  { id: 'pregnancy', label: 'Pregnancy', icon: Sun },
  { id: 'recent-surgery', label: 'Recent surgery', icon: AlertTriangle },
];

const SAFETY_QUESTIONS: { id: string; text: string }[] = [
  { id: 'chest-pain', text: 'Chest pain or dizziness when you exert yourself' },
  { id: 'numbness', text: 'Numbness or tingling down an arm or leg' },
  { id: 'fall', text: 'Pain after a recent fall or accident' },
  { id: 'weight-loss', text: 'Unexplained weight loss along with pain' },
  { id: 'doctor-limit', text: 'A doctor has told you to limit exercise' },
  { id: 'pregnant', text: 'You are pregnant' },
];

export const OnboardingScreen: React.FC = () => {
  const { step } = useParams<{ step: string }>();
  const navigate = useNavigate();
  const { user, completeOnboarding, showToast } = useApp();

  const currentStep = Math.min(9, Math.max(1, parseInt(step || '1', 10)));

  // Step 1 state
  const [name, setName] = useState(user?.name || 'Alex');
  const [ageBand, setAgeBand] = useState(user?.ageBand || '25 to 34');
  const [sex, setSex] = useState(user?.sex || 'Prefer not to say');
  const [heightVal, setHeightVal] = useState('');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [weightVal, setWeightVal] = useState('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>('kg');
  const [timeZone, setTimeZone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  );

  // Step 2 state
  const [habitType, setHabitType] =
    useState<ProfileDoc['activity']['habitType']>('Mostly sitting');
  const [exerciseDays, setExerciseDays] = useState(2);
  const [hoursSitting, setHoursSitting] = useState(8);
  const [hikesPerMonth, setHikesPerMonth] = useState(1);
  const [dailySteps, setDailySteps] = useState(4500);

  // Step 3 state
  const [conditions, setConditions] = useState<ConditionId[]>(['lower-back', 'neck-shoulders']);
  const [noneSelected, setNoneSelected] = useState(false);
  const [painBaseline, setPainBaseline] = useState<Record<string, number>>({
    'lower-back': 4,
    'neck-shoulders': 5,
  });
  const [painDuration, setPainDuration] = useState<Record<string, string>>({
    'lower-back': '2 to 12 weeks',
    'neck-shoulders': '2 to 12 weeks',
  });
  const [gettingWorse, setGettingWorse] = useState<Record<string, boolean>>({});

  // Step 4 state
  const [workStart, setWorkStart] = useState('09:00');
  const [workEnd, setWorkEnd] = useState('17:30');
  const [workType, setWorkType] = useState<ScheduleDoc['workType']>('Desk');
  const [breakWindows, setBreakWindows] = useState<BreakWindow[]>([
    { label: 'Morning', time: '10:30' },
    { label: 'Lunch', time: '13:00' },
    { label: 'Afternoon', time: '15:30' },
  ]);
  const [daysOff, setDaysOff] = useState<string[]>(['Sat', 'Sun']);

  // Step 5 state
  const [weekdayMinutes, setWeekdayMinutes] = useState<10 | 20 | 30 | 45>(20);
  const [weekendMinutes, setWeekendMinutes] = useState<10 | 20 | 30 | 45>(30);

  // Step 6 state
  const [equipment, setEquipment] = useState<string[]>(['No equipment']);
  const [location, setLocation] = useState<ProfileDoc['location']>('Both');

  // Step 7 state
  const [goal, setGoal] = useState<ProfileDoc['goal']>('Less pain');
  const [cheerStyle, setCheerStyle] = useState<CheerStyle>('gentle');

  // Step 8 state
  const [safetyAnswers, setSafetyAnswers] = useState<Record<string, boolean>>({});
  const [consentChecked, setConsentChecked] = useState(true);
  const [showSafetySheet, setShowSafetySheet] = useState(false);
  const [showLearnMore, setShowLearnMore] = useState(false);

  const toggleCondition = (id: ConditionId) => {
    setNoneSelected(false);
    setConditions((prev) => {
      if (prev.includes(id)) {
        return prev.filter((c) => c !== id);
      }
      setPainBaseline((pb) => ({ ...pb, [id]: pb[id] ?? 3 }));
      setPainDuration((pd) => ({ ...pd, [id]: pd[id] ?? '2 to 12 weeks' }));
      return [...prev, id];
    });
  };

  const selectNoneCondition = () => {
    setNoneSelected(true);
    setConditions([]);
  };

  const toggleBreakWindow = (label: BreakWindow['label'], defaultTime: string) => {
    setBreakWindows((prev) => {
      const exists = prev.find((b) => b.label === label);
      if (exists) {
        return prev.length > 1 ? prev.filter((b) => b.label !== label) : prev;
      }
      return [...prev, { label, time: defaultTime }];
    });
  };

  const updateBreakTime = (label: BreakWindow['label'], time: string) => {
    setBreakWindows((prev) =>
      prev.map((b) => (b.label === label ? { ...b, time } : b))
    );
  };

  const toggleDayOff = (day: string) => {
    setDaysOff((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const toggleEquipment = (item: string) => {
    setEquipment((prev) =>
      prev.includes(item)
        ? prev.length > 1
          ? prev.filter((e) => e !== item)
          : prev
        : [...prev, item]
    );
  };

  const finalizeAndSave = async () => {
    const derivedLevel = deriveActivityLevel(habitType, exerciseDays);
    const activeSafetyFlags = Object.entries(safetyAnswers)
      .filter(([, v]) => v)
      .map(([k]) => k);

    const newUser: UserDoc = {
      name: name.trim() || 'Friend',
      email: user?.email,
      photoURL: user?.photoURL,
      isGuest: user?.isGuest ?? true,
      ageBand,
      sex,
      heightCm: heightVal ? parseFloat(heightVal) : undefined,
      weightKg: weightVal ? parseFloat(weightVal) : undefined,
      heightUnit,
      weightUnit,
      timeZone,
      language: 'English',
      createdAt: user?.createdAt || new Date().toISOString(),
    };

    const newProfile: ProfileDoc = {
      conditions: noneSelected ? [] : conditions,
      painBaseline,
      painDuration,
      gettingWorse,
      safetyFlags: activeSafetyFlags,
      equipment,
      location,
      goal,
      cheerStyle,
      level: derivedLevel,
      activity: {
        habitType,
        exerciseDaysPerWeek: exerciseDays,
        hoursSittingPerDay: hoursSitting,
        hikesPerMonth,
        dailySteps: dailySteps > 0 ? dailySteps : undefined,
      },
      stepGoal: dailySteps > 0 ? dailySteps : undefined,
      consent: {
        at: new Date().toISOString(),
        version: '1.0',
      },
    };

    const newSchedule: ScheduleDoc = {
      workStart,
      workEnd,
      workType,
      breakWindows,
      daysOff,
      weekdayMinutes,
      weekendMinutes,
      remindersPerDay: Math.max(3, breakWindows.length),
      quietStart: '22:00',
      quietEnd: '07:00',
    };

    try {
      await completeOnboarding(newUser, newProfile, newSchedule);
      navigate('/onboarding/9');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Save failed: ${msg}`);
      navigate('/onboarding/9');
    }
  };

  const handleNext = async () => {
    if (currentStep < 8) {
      navigate(`/onboarding/${currentStep + 1}`);
      return;
    }
    if (currentStep === 8) {
      if (!consentChecked) {
        showToast('Please agree to save your health details to continue.');
        return;
      }
      const hasAnyYes = Object.values(safetyAnswers).some(Boolean);
      if (hasAnyYes) {
        setShowSafetySheet(true);
      } else {
        await finalizeAndSave();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      navigate(`/onboarding/${currentStep - 1}`);
    } else {
      navigate('/welcome');
    }
  };

  // Step 9: "Your plan is ready" screen
  if (currentStep === 9) {
    const derivedLevel = deriveActivityLevel(habitType, exerciseDays);
    return (
      <div className="min-h-screen px-5 py-8 flex flex-col justify-between">
        <div className="space-y-5 mt-6 text-center">
          <Illustration
            name="hero-today-done"
            category="mint"
            className="w-40 h-40 rounded-full mx-auto shadow-md"
            alt="Your plan is ready"
          />
          <h1 className="text-[32px] font-extrabold font-display">
            Your plan is ready
          </h1>
          <p className="text-[16px]" style={{ color: 'var(--text-soft)' }}>
            Personalised for your <strong>{derivedLevel}</strong> rhythm,{' '}
            <strong>{weekdayMinutes} min</strong> weekday window, and daily
            3-minute desk resets.
          </p>

          <div className="glass-card text-left space-y-2.5">
            <div className="flex items-center justify-between text-[14px]">
              <span style={{ color: 'var(--text-soft)' }}>Level</span>
              <span className="font-bold">{derivedLevel}</span>
            </div>
            <div className="flex items-center justify-between text-[14px]">
              <span style={{ color: 'var(--text-soft)' }}>Daily resets</span>
              <span className="font-bold">{breakWindows.length} x 3 min</span>
            </div>
            <div className="flex items-center justify-between text-[14px]">
              <span style={{ color: 'var(--text-soft)' }}>Focus areas</span>
              <span className="font-bold">
                {conditions.length > 0 ? `${conditions.length} selected` : 'Whole body'}
              </span>
            </div>
          </div>
        </div>

        <PrimaryButton onClick={() => navigate('/')}>
          Show me today
        </PrimaryButton>
      </div>
    );
  }

  const isOptionalStep = [1, 3, 6].includes(currentStep);

  return (
    <div className="min-h-screen flex flex-col justify-between pb-8">
      {/* Fixed top row */}
      <div className="sticky top-0 z-30 px-5 pt-4 pb-3 flex items-center gap-3 backdrop-blur-md bg-white/50 dark:bg-slate-950/50">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Go back"
          className="tap-scale w-12 h-12 rounded-full bg-white/90 dark:bg-slate-800/90 flex items-center justify-center shadow-xs shrink-0 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 h-1.5 rounded-full bg-slate-200/80 dark:bg-slate-700/70 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${(currentStep / 8) * 100}%`,
              background: 'linear-gradient(90deg, var(--primary) 0%, var(--mint) 100%)',
            }}
          />
        </div>

        {isOptionalStep ? (
          <button
            type="button"
            onClick={handleNext}
            className="tap-scale h-9 px-3.5 rounded-full text-[13px] font-semibold bg-white/80 dark:bg-slate-800/80 cursor-pointer"
            style={{ color: 'var(--text-soft)' }}
          >
            Skip
          </button>
        ) : (
          <span className="text-[12px] font-bold tabular-nums w-10 text-right" style={{ color: 'var(--text-soft)' }}>
            {currentStep}/8
          </span>
        )}
      </div>

      {/* Content */}
      <div className="px-5 pt-2 pb-6 flex-1 space-y-5">
        <Illustration
          name={`onboarding-${currentStep}`}
          category={currentStep % 2 === 0 ? 'lavender' : 'primary'}
          className="w-full h-[120px] rounded-[24px]"
          alt={`Onboarding step ${currentStep}`}
        />

        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <h1 className="text-[28px] font-extrabold font-display">
                Tell us a little about you
              </h1>
              <p className="text-[14px] mt-1" style={{ color: 'var(--text-soft)' }}>
                Used only to tailor your daily pace and reminders.
              </p>
            </div>

            <div className="glass-card space-y-3">
              <label className="block text-[13px] font-semibold">First name</label>
              <input
                type="text"
                value={name}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your first name"
                className="w-full h-12 px-4 rounded-[16px] bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-[16px]"
              />

              <label className="block text-[13px] font-semibold pt-1">Age band</label>
              <div className="flex flex-wrap gap-2">
                {AGE_BANDS.map((band) => {
                  const selected = ageBand === band;
                  return (
                    <button
                      key={band}
                      type="button"
                      onClick={() => setAgeBand(band)}
                      className="tap-scale h-11 px-4 rounded-full text-[14px] font-semibold border-2 cursor-pointer"
                      style={
                        selected
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
                      {band}
                    </button>
                  );
                })}
              </div>

              <label className="block text-[13px] font-semibold pt-1">
                Sex (optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {SEX_OPTIONS.map((opt) => {
                  const selected = sex === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setSex(opt)}
                      className="tap-scale h-11 px-3.5 rounded-full text-[13px] font-semibold border-2 cursor-pointer"
                      style={
                        selected
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
                      {opt}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-semibold">Height (opt)</span>
                    <button
                      type="button"
                      onClick={() => setHeightUnit((u) => (u === 'cm' ? 'ft' : 'cm'))}
                      className="text-[12px] font-bold underline cursor-pointer"
                      style={{ color: 'var(--brand-label)' }}
                    >
                      {heightUnit}
                    </button>
                  </div>
                  <input
                    type="number"
                    value={heightVal}
                    onChange={(e) => setHeightVal(e.target.value)}
                    placeholder={heightUnit === 'cm' ? '170' : '5.7'}
                    className="w-full h-11 px-3 rounded-[14px] bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-[15px]"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-semibold">Weight (opt)</span>
                    <button
                      type="button"
                      onClick={() => setWeightUnit((u) => (u === 'kg' ? 'lb' : 'kg'))}
                      className="text-[12px] font-bold underline cursor-pointer"
                      style={{ color: 'var(--brand-label)' }}
                    >
                      {weightUnit}
                    </button>
                  </div>
                  <input
                    type="number"
                    value={weightVal}
                    onChange={(e) => setWeightVal(e.target.value)}
                    placeholder={weightUnit === 'kg' ? '70' : '154'}
                    className="w-full h-11 px-3 rounded-[14px] bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-[15px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[12px] font-semibold mb-1">
                    Time zone
                  </label>
                  <input
                    type="text"
                    value={timeZone}
                    onChange={(e) => setTimeZone(e.target.value)}
                    className="w-full h-11 px-3 rounded-[14px] bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold mb-1">
                    Language
                  </label>
                  <input
                    type="text"
                    value="English"
                    disabled
                    className="w-full h-11 px-3 rounded-[14px] bg-slate-100 dark:bg-slate-800/50 text-[13px]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <div>
              <h1 className="text-[28px] font-extrabold font-display">
                How active are you right now?
              </h1>
              <p className="text-[14px] mt-1" style={{ color: 'var(--text-soft)' }}>
                We start where you are—never too fast.
              </p>
            </div>

            <div className="space-y-2.5">
              {ACTIVITY_CARDS.map((card) => {
                const selected = habitType === card.title;
                return (
                  <button
                    key={card.title}
                    type="button"
                    onClick={() => setHabitType(card.title)}
                    className="tap-scale w-full glass-card !p-4 text-left flex items-center justify-between border-2 cursor-pointer"
                    style={
                      selected
                        ? {
                            borderColor: 'var(--primary)',
                            backgroundColor: 'var(--primary-soft)',
                          }
                        : {}
                    }
                  >
                    <div>
                      <div className="text-[17px] font-bold font-display">
                        {card.title}
                      </div>
                      <div
                        className="text-[13px]"
                        style={{ color: 'var(--text-soft)' }}
                      >
                        {card.subtitle}
                      </div>
                    </div>
                    {selected && (
                      <Check
                        className="w-5 h-5 shrink-0"
                        style={{ color: 'var(--brand-label)' }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="glass-card space-y-4">
              <div>
                <div className="flex justify-between text-[14px] font-semibold mb-1">
                  <span>Exercise days per week</span>
                  <span className="tabular-nums font-bold">{exerciseDays} days</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={7}
                  value={exerciseDays}
                  onChange={(e) => setExerciseDays(parseInt(e.target.value, 10))}
                  className="w-full accent-sky-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-[14px] font-semibold mb-1">
                  <span>Hours sitting a day</span>
                  <span className="tabular-nums font-bold">{hoursSitting} hrs</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={14}
                  value={hoursSitting}
                  onChange={(e) => setHoursSitting(parseInt(e.target.value, 10))}
                  className="w-full accent-sky-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-[14px] font-semibold mb-1">
                  <span>Hikes or treks a month</span>
                  <span className="tabular-nums font-bold">{hikesPerMonth}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={8}
                  value={hikesPerMonth}
                  onChange={(e) => setHikesPerMonth(parseInt(e.target.value, 10))}
                  className="w-full accent-sky-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-[14px] font-semibold mb-1">
                  <span>Daily steps (optional)</span>
                  <span className="tabular-nums font-bold">
                    {dailySteps.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={20000}
                  step={500}
                  value={dailySteps}
                  onChange={(e) => setDailySteps(parseInt(e.target.value, 10))}
                  className="w-full accent-sky-500"
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4">
            <div>
              <h1 className="text-[28px] font-extrabold font-display">
                Anything bothering you?
              </h1>
              <p className="text-[14px] mt-1" style={{ color: 'var(--text-soft)' }}>
                We will pick gentle moves and avoid anything that strains these areas.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {CONDITION_ITEMS.map((item) => {
                const Icon = item.icon;
                const selected = !noneSelected && conditions.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleCondition(item.id)}
                    className="tap-scale h-11 px-3.5 rounded-full flex items-center gap-2 text-[14px] font-semibold border-2 cursor-pointer"
                    style={
                      selected
                        ? {
                            borderColor: 'var(--primary)',
                            backgroundColor: 'var(--primary-soft)',
                          }
                        : {
                            borderColor: 'transparent',
                            backgroundColor: 'var(--card-solid)',
                          }
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={selectNoneCondition}
                className="tap-scale h-11 px-4 rounded-full text-[14px] font-semibold border-2 cursor-pointer"
                style={
                  noneSelected
                    ? {
                        borderColor: 'var(--primary)',
                        backgroundColor: 'var(--primary-soft)',
                      }
                    : {
                        borderColor: 'transparent',
                        backgroundColor: 'var(--card-solid)',
                      }
                }
              >
                None
              </button>
            </div>

            {!noneSelected &&
              conditions.map((condId) => {
                const condObj = CONDITION_ITEMS.find((c) => c.id === condId);
                const score = painBaseline[condId] ?? 3;
                const dur = painDuration[condId] || '2 to 12 weeks';
                const worse = Boolean(gettingWorse[condId]);

                return (
                  <div key={condId} className="glass-card space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[16px] font-bold font-display">
                        {condObj?.label}
                      </span>
                      <span
                        className="text-[20px] font-extrabold tabular-nums font-display"
                        style={{
                          color: score >= 7 ? 'var(--caution)' : 'var(--text)',
                        }}
                      >
                        {score}/10
                      </span>
                    </div>

                    <div>
                      <div className="flex justify-between text-[12px] mb-1" style={{ color: 'var(--text-soft)' }}>
                        <span>0 (Comfort)</span>
                        <span>10 (Severe)</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={10}
                        value={score}
                        onChange={(e) =>
                          setPainBaseline((prev) => ({
                            ...prev,
                            [condId]: parseInt(e.target.value, 10),
                          }))
                        }
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background:
                            'linear-gradient(90deg, #5EE6B0 0%, #FFD24D 60%, #E5533D 100%)',
                        }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[12px] font-semibold mb-1">
                          How long?
                        </label>
                        <select
                          value={dur}
                          onChange={(e) =>
                            setPainDuration((prev) => ({
                              ...prev,
                              [condId]: e.target.value,
                            }))
                          }
                          className="w-full h-10 px-2.5 rounded-[12px] bg-white/90 dark:bg-slate-800/90 text-[13px] border border-slate-200 dark:border-slate-700"
                        >
                          <option value="Under 2 weeks">Under 2 weeks</option>
                          <option value="2 to 12 weeks">2 to 12 weeks</option>
                          <option value="Over 3 months">Over 3 months</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[12px] font-semibold mb-1">
                          Getting worse?
                        </label>
                        <div className="flex gap-2">
                          {(['No', 'Yes'] as const).map((ans) => {
                            const active = (ans === 'Yes') === worse;
                            return (
                              <button
                                key={ans}
                                type="button"
                                onClick={() =>
                                  setGettingWorse((prev) => ({
                                    ...prev,
                                    [condId]: ans === 'Yes',
                                  }))
                                }
                                className="flex-1 h-10 rounded-[12px] text-[13px] font-semibold border cursor-pointer"
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
                                {ans}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-4">
            <div>
              <h1 className="text-[28px] font-extrabold font-display">
                When do you work?
              </h1>
              <p className="text-[14px] mt-1" style={{ color: 'var(--text-soft)' }}>
                We place your 3-minute resets inside your break windows.
              </p>
            </div>

            <div className="glass-card space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-semibold mb-1">
                    Start time
                  </label>
                  <input
                    type="time"
                    value={workStart}
                    onChange={(e) => setWorkStart(e.target.value)}
                    className="w-full h-11 px-3 rounded-[14px] bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold mb-1">
                    End time
                  </label>
                  <input
                    type="time"
                    value={workEnd}
                    onChange={(e) => setWorkEnd(e.target.value)}
                    className="w-full h-11 px-3 rounded-[14px] bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-semibold mb-2">
                  Work type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Desk', 'Standing', 'On the move', 'Shifts'] as const).map(
                    (wt) => {
                      const selected = workType === wt;
                      return (
                        <button
                          key={wt}
                          type="button"
                          onClick={() => setWorkType(wt)}
                          className="tap-scale h-12 rounded-[16px] font-semibold text-[14px] border-2 cursor-pointer"
                          style={
                            selected
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
                          {wt}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-semibold mb-2">
                  Break windows
                </label>
                <div className="space-y-2">
                  {(
                    [
                      { label: 'Morning', def: '10:30' },
                      { label: 'Lunch', def: '13:00' },
                      { label: 'Afternoon', def: '15:30' },
                      { label: 'Evening', def: '18:00' },
                    ] as const
                  ).map((bw) => {
                    const active = breakWindows.find((b) => b.label === bw.label);
                    return (
                      <div
                        key={bw.label}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-[16px]"
                        style={{
                          backgroundColor: active
                            ? 'var(--primary-soft)'
                            : 'var(--row)',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => toggleBreakWindow(bw.label, bw.def)}
                          className="flex items-center gap-2.5 text-[14px] font-semibold cursor-pointer"
                        >
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center border"
                            style={{
                              backgroundColor: active ? 'var(--primary)' : 'transparent',
                              borderColor: 'var(--primary)',
                            }}
                          >
                            {active && <Check className="w-3.5 h-3.5 text-slate-950" />}
                          </span>
                          <span>{bw.label}</span>
                        </button>
                        {active && (
                          <input
                            type="time"
                            value={active.time}
                            onChange={(e) => updateBreakTime(bw.label, e.target.value)}
                            className="h-9 px-2.5 rounded-[10px] bg-white/90 dark:bg-slate-800 text-[13px]"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-semibold mb-2">
                  Days off
                </label>
                <div className="flex justify-between gap-1.5">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => {
                    const selected = daysOff.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDayOff(d)}
                        className="tap-scale flex-1 h-11 rounded-full text-[12px] font-bold border cursor-pointer"
                        style={
                          selected
                            ? {
                                borderColor: 'var(--primary)',
                                backgroundColor: 'var(--primary)',
                                color: 'var(--on-primary)',
                              }
                            : {
                                borderColor: 'transparent',
                                backgroundColor: 'var(--row)',
                              }
                        }
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 5 && (
          <div className="space-y-4">
            <div>
              <h1 className="text-[28px] font-extrabold font-display">
                How much time can you spare?
              </h1>
              <p className="text-[14px] mt-1" style={{ color: 'var(--text-soft)' }}>
                For your main daily movement session (resets are always 3 minutes).
              </p>
            </div>

            <div className="glass-card space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[16px] font-bold font-display">
                    Weekdays (minutes)
                  </span>
                  <span
                    className="text-[14px] font-semibold"
                    style={{ color: 'var(--brand-label)' }}
                  >
                    {weekdayMinutes} min
                  </span>
                </div>
                <NumberPillPicker
                  options={[10, 20, 30, 45]}
                  value={weekdayMinutes}
                  onChange={setWeekdayMinutes}
                />
              </div>

              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[16px] font-bold font-display">
                    Weekends (minutes)
                  </span>
                  <span
                    className="text-[14px] font-semibold"
                    style={{ color: 'var(--brand-label)' }}
                  >
                    {weekendMinutes} min
                  </span>
                </div>
                <NumberPillPicker
                  options={[10, 20, 30, 45]}
                  value={weekendMinutes}
                  onChange={setWeekendMinutes}
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 6 && (
          <div className="space-y-4">
            <div>
              <h1 className="text-[28px] font-extrabold font-display">
                What can you use?
              </h1>
              <p className="text-[14px] mt-1" style={{ color: 'var(--text-soft)' }}>
                Select any equipment and where you usually move.
              </p>
            </div>

            <div className="glass-card space-y-4">
              <div className="space-y-2">
                {[
                  { label: 'No equipment', icon: PersonStanding },
                  { label: 'Dumbbells or bands', icon: Dumbbell },
                  { label: 'Treadmill or elliptical', icon: Activity },
                  { label: 'Gym', icon: Dumbbell },
                  { label: 'Outdoors', icon: Trees },
                ].map((eq) => {
                  const Icon = eq.icon;
                  const selected = equipment.includes(eq.label);
                  return (
                    <button
                      key={eq.label}
                      type="button"
                      onClick={() => toggleEquipment(eq.label)}
                      className="tap-scale w-full h-13 px-4 rounded-[18px] flex items-center justify-between border-2 cursor-pointer"
                      style={
                        selected
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
                      <span className="flex items-center gap-3 font-semibold text-[15px]">
                        <Icon className="w-5 h-5" />
                        {eq.label}
                      </span>
                      {selected && <Check className="w-5 h-5" />}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2">
                <label className="block text-[13px] font-semibold mb-2">
                  Where you move
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'Home', icon: Home },
                      { id: 'Office', icon: Building2 },
                      { id: 'Both', icon: Sparkles },
                    ] as const
                  ).map((loc) => {
                    const Icon = loc.icon;
                    const selected = location === loc.id;
                    return (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => setLocation(loc.id)}
                        className="tap-scale h-12 rounded-[16px] flex items-center justify-center gap-1.5 font-semibold text-[14px] border-2 cursor-pointer"
                        style={
                          selected
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
                        <Icon className="w-4 h-4" />
                        {loc.id}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 7 && (
          <div className="space-y-4">
            <div>
              <h1 className="text-[28px] font-extrabold font-display">
                What matters most?
              </h1>
              <p className="text-[14px] mt-1" style={{ color: 'var(--text-soft)' }}>
                Pick your main goal and how you like to be encouraged.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {(
                ['Less pain', 'More energy', 'Lose weight', 'Build a habit'] as const
              ).map((g) => {
                const selected = goal === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGoal(g)}
                    className="tap-scale glass-card !p-4 text-left border-2 cursor-pointer"
                    style={
                      selected
                        ? {
                            borderColor: 'var(--primary)',
                            backgroundColor: 'var(--primary-soft)',
                          }
                        : {}
                    }
                  >
                    <div className="text-[16px] font-bold font-display">{g}</div>
                  </button>
                );
              })}
            </div>

            <div className="space-y-2.5 pt-2">
              <h2 className="text-[18px] font-bold font-display">
                How should we cheer you on?
              </h2>
              {(
                [
                  {
                    id: 'gentle' as const,
                    title: 'Gentle',
                    sample: '“Small moves count. Start with one.”',
                  },
                  {
                    id: 'cheerleader' as const,
                    title: 'Cheerleader',
                    sample: '“Stand up. Breathe. You’ve got this!”',
                  },
                  {
                    id: 'data' as const,
                    title: 'Data-driven',
                    sample: '“Three-minute breaks every hour cut sitting stiffness in half.”',
                  },
                ]
              ).map((c) => {
                const selected = cheerStyle === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCheerStyle(c.id)}
                    className="tap-scale w-full glass-card !p-4 text-left border-2 cursor-pointer"
                    style={
                      selected
                        ? {
                            borderColor: 'var(--primary)',
                            backgroundColor: 'var(--primary-soft)',
                          }
                        : {}
                    }
                  >
                    <div className="text-[16px] font-bold font-display">
                      {c.title}
                    </div>
                    <div
                      className="text-[13px] mt-0.5"
                      style={{ color: 'var(--text-soft)' }}
                    >
                      {c.sample}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {currentStep === 8 && (
          <div className="space-y-4">
            <div>
              <h1 className="text-[28px] font-extrabold font-display">
                Quick safety check
              </h1>
              <p className="text-[14px] mt-1" style={{ color: 'var(--text-soft)' }}>
                We check first so we can keep you safe.
              </p>
            </div>

            <div className="glass-card space-y-3">
              {SAFETY_QUESTIONS.map((q) => {
                const val = Boolean(safetyAnswers[q.id]);
                return (
                  <div
                    key={q.id}
                    className="flex items-center justify-between gap-3 py-2 border-b last:border-b-0 border-slate-200/60 dark:border-slate-700/60"
                  >
                    <span className="text-[14px] leading-snug flex-1">
                      {q.text}
                    </span>
                    <div className="flex gap-1.5 shrink-0">
                      {(['No', 'Yes'] as const).map((opt) => {
                        const active = (opt === 'Yes') === val;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() =>
                              setSafetyAnswers((prev) => ({
                                ...prev,
                                [q.id]: opt === 'Yes',
                              }))
                            }
                            className="h-9 px-3.5 rounded-full text-[13px] font-bold border cursor-pointer"
                            style={
                              active
                                ? {
                                    borderColor:
                                      opt === 'Yes'
                                        ? 'var(--caution)'
                                        : 'var(--primary)',
                                    backgroundColor:
                                      opt === 'Yes'
                                        ? 'var(--caution-soft)'
                                        : 'var(--primary-soft)',
                                  }
                                : {
                                    borderColor: 'transparent',
                                    backgroundColor: 'var(--row)',
                                  }
                            }
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="glass-card space-y-2.5">
              <p className="text-[13px]" style={{ color: 'var(--text-soft)' }}>
                Your answers are stored privately in your account and on this
                device so we can build safe daily plans. You can export or delete
                them anytime in Me.
              </p>
              <label className="flex items-center gap-3 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="w-5 h-5 rounded accent-sky-500"
                />
                <span className="text-[14px] font-semibold">
                  I agree to save my health details to my account
                </span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Bottom primary button */}
      <div className="px-5">
        <PrimaryButton onClick={handleNext}>Continue</PrimaryButton>
      </div>

      {/* Safety sheet */}
      <BottomSheet
        open={showSafetySheet}
        onClose={() => setShowSafetySheet(false)}
      >
        <div className="space-y-4 text-center">
          <div
            className="w-12 h-12 rounded-full mx-auto flex items-center justify-center"
            style={{
              backgroundColor: 'var(--caution-soft)',
              color: 'var(--caution)',
            }}
          >
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-[24px] font-extrabold font-display">
            Let&apos;s start gently.
          </h2>
          <p className="text-[15px]" style={{ color: 'var(--text-soft)' }}>
            Your plan will be easy, and it&apos;s a good idea to talk to a doctor
            before you start.
          </p>

          {showLearnMore && (
            <div
              className="rounded-[16px] p-3.5 text-left text-[13px]"
              style={{ backgroundColor: 'var(--row)', color: 'var(--text-soft)' }}
            >
              Because you marked yes on the safety check, we automatically keep
              your sessions to gentle walks, calm breathing, and light seated
              mobility at half duration. Stop immediately if you feel any discomfort.
            </div>
          )}

          <PrimaryButton
            onClick={async () => {
              setShowSafetySheet(false);
              await finalizeAndSave();
            }}
          >
            Start my gentle plan
          </PrimaryButton>

          <button
            type="button"
            onClick={() => setShowLearnMore((v) => !v)}
            className="w-full py-2 text-[14px] font-semibold underline cursor-pointer"
            style={{ color: 'var(--text-soft)' }}
          >
            Learn more
          </button>
        </div>
      </BottomSheet>
    </div>
  );
};
