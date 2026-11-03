import { db, newId } from './db';
import { parseRepTargets } from './session';
import type { Equipment, Exercise, ExerciseKind, Template, TemplateItem, Weekdays } from './types';

/** Minimal RFC 4180 CSV parser (quotes, escaped quotes, CRLF). */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

/** Normalised key for matching plan names to library names. */
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/\bdb\b/g, 'dumbbell')
    .replace(/\bbb\b/g, 'barbell')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w))
    .join(' ');
const noBarbell = (k: string) => k.replace(/^barbell /, '');

const titleCase = (s: string) =>
  s
    .replace(/\bdb\b/gi, 'DB')
    .replace(/\b([a-z])([a-z]*)/g, (_, a: string, b: string) => a.toUpperCase() + b)
    .replace(/\bOr\b/g, 'or')
    .replace(/\bEz\b/g, 'EZ');

function guessEquipment(name: string): Equipment {
  const n = name.toLowerCase();
  if (/\b(db|dumbbell)/.test(n)) return 'Dumbbell';
  if (/cable|rope|pushdown|face pull|woodchop/.test(n)) return 'Cable';
  if (/machine|press machine|pec deck|leg press|leg curl|leg extension/.test(n)) return 'Machine';
  if (/barbell|bar\b|squat|deadlift|ez/.test(n)) return 'Barbell';
  if (/kettlebell/.test(n)) return 'Kettlebell';
  if (/pull-up|chin-up|dip|push-up|hanging/.test(n)) return 'Bodyweight';
  return 'Other';
}
const guessKind = (name: string): ExerciseKind =>
  /pull-up|chin-up|\bdips?\b|push-up|hanging/.test(name.toLowerCase()) ? 'bodyweight' : 'weighted';

/** "90 sec", "90-120 sec", "45 sec after superset", "2 min", "None" → seconds (first number). */
export function parseRest(text: string): number | undefined {
  const m = text.match(/(\d+(?:\.\d+)?)/);
  if (!m) return undefined;
  const n = Number(m[1]);
  return Math.round(/min/i.test(text) ? n * 60 : n);
}

export interface PlannedItem {
  item: TemplateItem;
  exerciseName: string;
  /** Library exercise it matched, or undefined if a new custom one will be created. */
  matched?: Exercise;
}
export interface PlannedTemplate {
  name: string;
  items: PlannedItem[];
  existingId?: string;
}
export interface ImportPlan {
  templates: PlannedTemplate[];
  newExercises: Exercise[];
  warnings: string[];
}

/**
 * Turn the CSV into templates. Expected header (case-insensitive):
 * Day, Order, Block, Exercise, Sets, Reps, Rest, Notes
 */
export async function buildImport(csv: string): Promise<ImportPlan> {
  const rows = parseCSV(csv.replace(/^﻿/, ''));
  if (rows.length < 2) throw new Error('The file is empty.');
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => head.indexOf(name);
  const C = { day: col('day'), order: col('order'), block: col('block'), ex: col('exercise'), sets: col('sets'), reps: col('reps'), rest: col('rest'), notes: col('notes') };
  const missing = (['day', 'ex', 'sets', 'reps'] as const).filter((k) => C[k] < 0);
  if (missing.length)
    throw new Error('Missing columns. The first row needs at least: Day, Exercise, Sets, Reps (optional: Order, Block, Rest, Notes).');

  const [library, templates] = await Promise.all([db.exercises.toArray(), db.templates.toArray()]);
  const byKey = new Map<string, Exercise>();
  for (const e of library) {
    byKey.set(norm(e.name), e);
    if (!byKey.has(noBarbell(norm(e.name)))) byKey.set(noBarbell(norm(e.name)), e);
  }
  const created = new Map<string, Exercise>();
  const warnings: string[] = [];

  const get = (r: string[], i: number) => (i >= 0 ? (r[i] ?? '').trim() : '');
  const days = new Map<string, string[][]>();
  for (const r of rows.slice(1)) {
    const d = get(r, C.day);
    if (!d || !get(r, C.ex)) continue;
    if (!days.has(d)) days.set(d, []);
    days.get(d)!.push(r);
  }

  const out: PlannedTemplate[] = [];
  for (const [day, dayRows] of days) {
    if (C.order >= 0) dayRows.sort((x, y) => Number(get(x, C.order)) - Number(get(y, C.order)));
    const items: PlannedItem[] = [];
    let warmup: string | undefined;

    for (const r of dayRows) {
      const name = get(r, C.ex);
      const block = get(r, C.block);
      const repsText = get(r, C.reps);
      const notes = get(r, C.notes);

      // Warm-ups become a note on the next exercise.
      if (/warm/i.test(block)) {
        warmup = `Warm-up: ${name}${repsText ? `, ${repsText}` : ''}${notes ? `. ${notes}` : ''}`;
        continue;
      }

      const key = norm(name);
      let ex = byKey.get(key) ?? byKey.get(noBarbell(key)) ?? created.get(key);
      const matched = ex && !created.has(key) ? ex : undefined;
      if (!ex) {
        ex = {
          id: newId(),
          name: titleCase(name),
          muscles: [],
          equipment: guessEquipment(name),
          kind: guessKind(name),
          defaultRestSec: parseRest(get(r, C.rest)) ?? 90,
          isCustom: true,
        };
        created.set(key, ex);
      }

      const sets = Math.max(1, Math.min(20, parseInt(get(r, C.sets), 10) || 3));
      const targets = parseRepTargets(repsText);
      // Words in the reps column ("per arm", "Near failure") are kept as a note.
      const repWords = repsText.replace(/[\d/\s]+/g, ' ').trim();
      const noteParts = [warmup, repWords && repsText, notes].filter(Boolean);
      warmup = undefined;
      let repsPerSet = targets.repsPerSet;
      if (repsPerSet && repsPerSet.length !== sets) {
        warnings.push(`${day} · ${name}: ${repsPerSet.length} rep targets for ${sets} sets — the last target repeats.`);
      }
      if (repsPerSet && repsPerSet.length > sets) repsPerSet = repsPerSet.slice(0, sets);

      const block2 = block.match(/superset\s*(\w+)/i);
      items.push({
        exerciseName: ex.name,
        matched,
        item: {
          id: newId(),
          exerciseId: ex.id,
          sets,
          targetReps: targets.targetReps,
          repsPerSet,
          restSec: parseRest(get(r, C.rest)) ?? ex.defaultRestSec,
          notes: noteParts.join(' · ') || undefined,
          supersetId: block2 ? `${day}-${block2[1]}`.toLowerCase() : undefined,
        },
      });
    }
    if (warmup) warnings.push(`${day}: warm-up at the end had no exercise after it and was skipped.`);
    const existing = templates.find((t) => t.name.trim().toLowerCase() === day.toLowerCase());
    out.push({ name: day, items, existingId: existing?.id });
  }
  if (!out.length) throw new Error('No exercises found in the file.');
  return { templates: out, newExercises: [...created.values()], warnings };
}

/**
 * Save the import. Templates with the same name are replaced in place, so any
 * weekday assignments pointing at them keep working. `weekdays` maps a
 * template name to the Date.getDay() numbers it should be scheduled on.
 */
export async function applyImport(plan: ImportPlan, weekdays: Record<string, number[]>) {
  await db.transaction('rw', db.exercises, db.templates, db.program, async () => {
    await db.exercises.bulkAdd(plan.newExercises);
    const ids: Record<string, string> = {};
    for (const t of plan.templates) {
      const tpl: Template = {
        id: t.existingId ?? newId(),
        name: t.name,
        items: t.items.map((i) => i.item),
        updatedAt: Date.now(),
      };
      await db.templates.put(tpl);
      ids[t.name] = tpl.id;
    }
    const p = await db.program.get('main');
    if (p) {
      const wd = [...p.weekdays] as Weekdays;
      for (const [name, days] of Object.entries(weekdays)) for (const d of days) wd[d] = ids[name];
      await db.program.update('main', { weekdays: wd });
    }
  });
}
