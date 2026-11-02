import type { Equipment, Exercise, ExerciseKind, Muscle } from './types';

type Row = [name: string, muscles: Muscle[], equipment: Equipment, kind: ExerciseKind, restSec: number];

const ROWS: Row[] = [
  // Chest
  ['Barbell Bench Press', ['Chest', 'Triceps', 'Shoulders'], 'Barbell', 'weighted', 180],
  ['Incline Barbell Bench Press', ['Chest', 'Shoulders', 'Triceps'], 'Barbell', 'weighted', 180],
  ['Dumbbell Bench Press', ['Chest', 'Triceps', 'Shoulders'], 'Dumbbell', 'weighted', 120],
  ['Incline Dumbbell Press', ['Chest', 'Shoulders', 'Triceps'], 'Dumbbell', 'weighted', 120],
  ['Machine Chest Press', ['Chest', 'Triceps'], 'Machine', 'weighted', 90],
  ['Cable Fly', ['Chest'], 'Cable', 'weighted', 60],
  ['Dumbbell Fly', ['Chest'], 'Dumbbell', 'weighted', 60],
  ['Pec Deck', ['Chest'], 'Machine', 'weighted', 60],
  ['Push-Up', ['Chest', 'Triceps', 'Shoulders'], 'Bodyweight', 'bodyweight', 60],
  ['Dip', ['Chest', 'Triceps'], 'Bodyweight', 'bodyweight', 120],
  // Back
  ['Deadlift', ['Back', 'Hamstrings', 'Glutes'], 'Barbell', 'weighted', 240],
  ['Barbell Row', ['Back', 'Biceps'], 'Barbell', 'weighted', 150],
  ['Dumbbell Row', ['Back', 'Biceps'], 'Dumbbell', 'weighted', 90],
  ['Pull-Up', ['Back', 'Biceps'], 'Bodyweight', 'bodyweight', 120],
  ['Chin-Up', ['Back', 'Biceps'], 'Bodyweight', 'bodyweight', 120],
  ['Lat Pulldown', ['Back', 'Biceps'], 'Cable', 'weighted', 90],
  ['Seated Cable Row', ['Back', 'Biceps'], 'Cable', 'weighted', 90],
  ['Chest-Supported Row', ['Back', 'Biceps'], 'Machine', 'weighted', 90],
  ['T-Bar Row', ['Back', 'Biceps'], 'Barbell', 'weighted', 120],
  ['Face Pull', ['Shoulders', 'Back'], 'Cable', 'weighted', 60],
  ['Back Extension', ['Back', 'Glutes', 'Hamstrings'], 'Bodyweight', 'bodyweight', 60],
  // Shoulders
  ['Overhead Press', ['Shoulders', 'Triceps'], 'Barbell', 'weighted', 180],
  ['Seated Dumbbell Press', ['Shoulders', 'Triceps'], 'Dumbbell', 'weighted', 120],
  ['Machine Shoulder Press', ['Shoulders', 'Triceps'], 'Machine', 'weighted', 90],
  ['Lateral Raise', ['Shoulders'], 'Dumbbell', 'weighted', 60],
  ['Cable Lateral Raise', ['Shoulders'], 'Cable', 'weighted', 60],
  ['Rear Delt Fly', ['Shoulders', 'Back'], 'Dumbbell', 'weighted', 60],
  ['Barbell Shrug', ['Back'], 'Barbell', 'weighted', 60],
  // Arms
  ['Barbell Curl', ['Biceps'], 'Barbell', 'weighted', 60],
  ['Dumbbell Curl', ['Biceps'], 'Dumbbell', 'weighted', 60],
  ['Hammer Curl', ['Biceps', 'Forearms'], 'Dumbbell', 'weighted', 60],
  ['Preacher Curl', ['Biceps'], 'Machine', 'weighted', 60],
  ['Cable Curl', ['Biceps'], 'Cable', 'weighted', 60],
  ['Triceps Pushdown', ['Triceps'], 'Cable', 'weighted', 60],
  ['Overhead Triceps Extension', ['Triceps'], 'Cable', 'weighted', 60],
  ['Skull Crusher', ['Triceps'], 'Barbell', 'weighted', 60],
  ['Close-Grip Bench Press', ['Triceps', 'Chest'], 'Barbell', 'weighted', 120],
  ['Wrist Curl', ['Forearms'], 'Dumbbell', 'weighted', 45],
  // Legs
  ['Back Squat', ['Quads', 'Glutes'], 'Barbell', 'weighted', 240],
  ['Front Squat', ['Quads', 'Glutes', 'Core'], 'Barbell', 'weighted', 180],
  ['Romanian Deadlift', ['Hamstrings', 'Glutes', 'Back'], 'Barbell', 'weighted', 150],
  ['Leg Press', ['Quads', 'Glutes'], 'Machine', 'weighted', 120],
  ['Hack Squat', ['Quads', 'Glutes'], 'Machine', 'weighted', 120],
  ['Bulgarian Split Squat', ['Quads', 'Glutes'], 'Dumbbell', 'weighted', 90],
  ['Walking Lunge', ['Quads', 'Glutes'], 'Dumbbell', 'weighted', 90],
  ['Goblet Squat', ['Quads', 'Glutes'], 'Dumbbell', 'weighted', 90],
  ['Leg Extension', ['Quads'], 'Machine', 'weighted', 60],
  ['Lying Leg Curl', ['Hamstrings'], 'Machine', 'weighted', 60],
  ['Seated Leg Curl', ['Hamstrings'], 'Machine', 'weighted', 60],
  ['Hip Thrust', ['Glutes', 'Hamstrings'], 'Barbell', 'weighted', 120],
  ['Hip Abduction', ['Glutes'], 'Machine', 'weighted', 60],
  ['Standing Calf Raise', ['Calves'], 'Machine', 'weighted', 60],
  ['Seated Calf Raise', ['Calves'], 'Machine', 'weighted', 60],
  // Core
  ['Plank', ['Core'], 'Bodyweight', 'duration', 60],
  ['Side Plank', ['Core'], 'Bodyweight', 'duration', 45],
  ['Hanging Leg Raise', ['Core'], 'Bodyweight', 'bodyweight', 60],
  ['Cable Crunch', ['Core'], 'Cable', 'weighted', 60],
  ['Ab Wheel Rollout', ['Core'], 'Other', 'bodyweight', 60],
  ['Dead Bug', ['Core'], 'Bodyweight', 'bodyweight', 45],
  // Full body / conditioning
  ['Kettlebell Swing', ['Full Body', 'Glutes', 'Hamstrings'], 'Kettlebell', 'weighted', 90],
  ['Farmer Carry', ['Full Body', 'Forearms'], 'Dumbbell', 'duration', 90],
  ['Dead Hang', ['Forearms', 'Back'], 'Bodyweight', 'duration', 60],
];

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export const SEED_EXERCISES: Exercise[] = ROWS.map(([name, muscles, equipment, kind, restSec]) => ({
  id: `seed-${slug(name)}`,
  name,
  muscles,
  equipment,
  kind,
  defaultRestSec: restSec,
  isCustom: false,
}));
