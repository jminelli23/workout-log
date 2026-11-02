import { useState } from 'react';
import { IconCalendar, IconProgram, IconSettings, IconToday } from './components/Icons';
import { Placeholder } from './components/ui';
import { ProgramTab } from './screens/ProgramTab';
import { TodayPreview } from './screens/TodayPreview';

type Tab = 'today' | 'calendar' | 'program' | 'settings';

const TABS: { id: Tab; label: string; Icon: typeof IconToday }[] = [
  { id: 'today', label: 'Today', Icon: IconToday },
  { id: 'calendar', label: 'Calendar', Icon: IconCalendar },
  { id: 'program', label: 'Program', Icon: IconProgram },
  { id: 'settings', label: 'Settings', Icon: IconSettings },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('program');

  return (
    <>
      {tab === 'today' && <TodayPreview />}
      {tab === 'calendar' && <Placeholder title="Calendar" text="The monthly calendar arrives in step 4." />}
      {tab === 'program' && <ProgramTab />}
      {tab === 'settings' && <Placeholder title="Settings" text="Backup, restore and import arrive in step 6." />}

      <nav className="tabbar">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`tab ${tab === id ? 'active' : ''}`}
            onClick={() => {
              setTab(id);
              window.scrollTo(0, 0);
            }}
          >
            <Icon />
            {label}
          </button>
        ))}
      </nav>
    </>
  );
}
