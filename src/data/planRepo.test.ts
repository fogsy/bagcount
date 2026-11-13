import { buildThirtyDayPlan, planDayIndex } from './planRepo';

describe('planRepo helpers', () => {
  it('seeds 30 days with level-based rotation', () => {
    const plan = buildThirtyDayPlan('2026-10-01', 1);
    expect(plan.days).toHaveLength(30);
    expect(plan.days[0]?.drillId).toBe('jab-builder');
    expect(plan.days.every((d) => !d.completed)).toBe(true);
  });

  it('maps today to a clamped day index', () => {
    const plan = buildThirtyDayPlan('2026-10-01', 3);
    expect(planDayIndex(plan, '2026-10-01')).toBe(0);
    expect(planDayIndex(plan, '2026-10-05')).toBe(4);
    expect(planDayIndex(plan, '2026-09-20')).toBe(0);
    expect(planDayIndex(plan, '2026-12-01')).toBe(29);
  });
});
