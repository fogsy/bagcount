import type { Drill } from './drill';

export const SEED_DRILLS: Drill[] = [
  {
    id: 'jab-builder',
    name: 'Jab Builder',
    targetMoves: ['JAB'],
    comboSequence: ['JAB'],
    durationSec: 45,
    rounds: 1,
    difficulty: 'beginner',
    description: 'Throw clean jabs on the beep. Build your lead hand.',
  },
  {
    id: 'cross-control',
    name: 'Cross Control',
    targetMoves: ['CROSS'],
    comboSequence: ['CROSS'],
    durationSec: 45,
    rounds: 1,
    difficulty: 'beginner',
    description: 'Straight rear hands — power with control.',
  },
  {
    id: 'one-two-combo',
    name: '1-2 Combo',
    targetMoves: ['JAB', 'CROSS'],
    comboSequence: ['JAB', 'CROSS'],
    durationSec: 60,
    rounds: 2,
    difficulty: 'intermediate',
    description: 'Classic jab-cross. Finish the combo every time.',
  },
  {
    id: 'speed-hands',
    name: 'Speed Hands',
    targetMoves: ['JAB', 'CROSS', 'HOOK', 'UPPERCUT'],
    comboSequence: ['JAB', 'CROSS', 'HOOK', 'UPPERCUT'],
    durationSec: 60,
    rounds: 2,
    difficulty: 'advanced',
    description: 'Cycle jab, cross, hook, uppercut as fast as you can.',
  },
];

export function getDrillById(id: string): Drill | undefined {
  return SEED_DRILLS.find((d) => d.id === id);
}
