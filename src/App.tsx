import { useState } from 'react';
import { IconCalendar, IconProgram, IconSettings, IconToday } from './components/Icons';
import { todayISO } from './lib/dates';
import { CalendarTab } from './screens/CalendarTab';
import { ProgramTab } from './screens/ProgramTab';
import { TodayTab } from './screens/TodayTab';
import { SettingsTab } from './screens/SettingsTab';

type Tab = 'today' | 'calendar' | 'program' | 'settings';

const TABS: { id: Tab; label: string; Icon: typeof IconToday }[] = [
  { id: 'today', label: 'Today', Icon: IconToday },
  { id: 'calendar', label: 'Calendar', Icon: IconCalendar },
  { id: 'program', label: 'Program', Icon: IconProgram },
  { id: 'settings', label: 'Settings', Icon: IconSettings },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('today');
  // The day shown on the Today tab; the calendar sets it when you tap a day.
  const [date, setDate] = useState(todayISO());

  const switchTab = (t: Tab) => {
    // Tapping Today while already on it jumps back to the current date.
    if (t === 'today' && tab === 'today') setDate(todayISO());
    setTab(t);
    window.scrollTo(0, 0);
  };

  return (
    <>
      {tab === 'today' && <TodayTab date={date} setDate={setDate} />}
      {tab === 'calendar' && (
        <CalendarTab
          onOpenDay={(d) => {
            setDate(d);
            setTab('today');
            window.scrollTo(0, 0);
          }}
        />
      )}
      {tab === 'program' && <ProgramTab />}
      {tab === 'settings' && <SettingsTab onImported={() => undefined} />}

      <nav className="tabbar">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} className={`tab ${tab === id ? 'active' : ''}`} onClick={() => switchTab(id)}>
            <Icon />
            {label}
          </button>
        ))}
      </nav>
    </>
  );
}
