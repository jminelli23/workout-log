import { useState } from 'react';
import { ProgramHome } from './ProgramHome';
import { TemplateEditor } from './TemplateEditor';
import { ExerciseEditor, ExerciseLibrary } from './ExerciseLibrary';

export type ProgramRoute =
  | { name: 'home' }
  | { name: 'template'; id: string; isNew?: boolean }
  | { name: 'library' }
  | { name: 'exercise'; id: string | null };

export function ProgramTab() {
  const [stack, setStack] = useState<ProgramRoute[]>([{ name: 'home' }]);
  const push = (r: ProgramRoute) => {
    setStack((s) => [...s, r]);
    window.scrollTo(0, 0);
  };
  const pop = () => {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
    window.scrollTo(0, 0);
  };
  const top = stack[stack.length - 1];

  switch (top.name) {
    case 'home':
      return <ProgramHome push={push} />;
    case 'template':
      return <TemplateEditor key={top.id} id={top.id} isNew={top.isNew} onBack={pop} />;
    case 'library':
      return <ExerciseLibrary push={push} onBack={pop} />;
    case 'exercise':
      return <ExerciseEditor key={top.id ?? 'new'} id={top.id} onBack={pop} />;
  }
}
