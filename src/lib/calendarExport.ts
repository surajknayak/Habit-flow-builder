import { ScheduleDoc } from '../types';

const DAY_TO_ICS: Record<string, string> = {
  Mon: 'MO',
  Tue: 'TU',
  Wed: 'WE',
  Thu: 'TH',
  Fri: 'FR',
  Sat: 'SA',
  Sun: 'SU',
};

export function downloadRemindersICS(schedule: ScheduleDoc) {
  const allDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const activeDays = allDays.filter((d) => !(schedule.daysOff || []).includes(d));
  const byDay = (activeDays.length > 0 ? activeDays : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
    .map((d) => DAY_TO_ICS[d])
    .join(',');

  const windows = (schedule.breakWindows || []).slice(0, schedule.remindersPerDay || 3);
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');

  const events = windows.map((bw, idx) => {
    const [hh, mm] = (bw.time || '10:30').split(':');
    const startH = parseInt(hh, 10) || 10;
    const startM = parseInt(mm, 10) || 30;
    const endDate = new Date(y, now.getMonth(), now.getDate(), startH, startM + 10);
    const endH = String(endDate.getHours()).padStart(2, '0');
    const endMin = String(endDate.getMinutes()).padStart(2, '0');

    const dtStart = `${y}${m}${d}T${String(startH).padStart(2, '0')}${String(startM).padStart(2, '0')}00`;
    const dtEnd = `${y}${m}${d}T${endH}${endMin}00`;

    return [
      'BEGIN:VEVENT',
      `UID:habitflow-reset-${idx + 1}-${Date.now()}@habitflow.local`,
      `DTSTAMP:${dtStart}Z`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${byDay}`,
      `SUMMARY:Habit Flow · 3-min ${bw.label} Reset`,
      'DESCRIPTION:Time for a gentle 3-minute movement reset in Habit Flow.',
      'BEGIN:VALARM',
      'TRIGGER:-PT0M',
      'ACTION:DISPLAY',
      'DESCRIPTION:Time to reset your body (3 min)',
      'END:VALARM',
      'END:VEVENT',
    ].join('\r\n');
  });

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Habit Flow//Daily Movement Coach//EN',
    'CALSCALE:GREGORIAN',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'habit-flow-reminders.ics';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
