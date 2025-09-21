import type { Event, EventLog } from '../types/EventLog';
import type { PermitState } from '../constants/permitStates';
import { VARIANT_DEFINITIONS, TRANSITION_TIME_RANGES, PERFORMERS, HUMAN_STATES } from '../constants/permitStates';

export interface GeneratorConfig {
  totalCases: number;
  seed: number;
  variantOverrides?: Partial<Record<keyof typeof VARIANT_DEFINITIONS, number>>;
}

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  choice<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }
}

export function generateEventLog(config: GeneratorConfig): EventLog {
  const rng = new SeededRandom(config.seed);
  const events: Event[] = [];

  // Calculate variant distribution
  const variants = Object.entries(VARIANT_DEFINITIONS);
  const probabilities = variants.map(([key, variant]) =>
    config.variantOverrides?.[key as keyof typeof VARIANT_DEFINITIONS] ?? variant.probability
  );

  // Normalize probabilities
  const total = probabilities.reduce((sum, p) => sum + p, 0);
  const normalizedProbs = probabilities.map(p => p / total);

  for (let caseIndex = 0; caseIndex < config.totalCases; caseIndex++) {
    const caseId = `PERMIT_2024_${String(caseIndex + 1).padStart(6, '0')}`;

    // Select variant based on probability
    const rand = rng.next();
    let cumulative = 0;
    let selectedVariant = variants[0];

    for (let i = 0; i < variants.length; i++) {
      cumulative += normalizedProbs[i];
      if (rand <= cumulative) {
        selectedVariant = variants[i];
        break;
      }
    }

    const [, variantDef] = selectedVariant;
    const caseEvents = generateCaseEvents(caseId, variantDef.sequence, rng);
    events.push(...caseEvents);
  }

  // Sort events by timestamp
  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return {
    events,
    metadata: {
      generated_at: new Date().toISOString(),
      total_cases: config.totalCases,
      seed: config.seed
    }
  };
}

function generateCaseEvents(caseId: string, sequence: PermitState[], rng: SeededRandom): Event[] {
  const events: Event[] = [];

  // Start with a random timestamp within the last 6 months
  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);
  let currentTime = new Date(
    rng.nextFloat(sixMonthsAgo.getTime(), now.getTime() - 30 * 24 * 60 * 60 * 1000) // At least 30 days ago
  );

  for (let i = 0; i < sequence.length; i++) {
    const state = sequence[i];

    // Determine performer
    let performer: string | null = null;
    if (HUMAN_STATES.includes(state)) {
      if (state === 'intake_validation') {
        performer = rng.choice([...PERFORMERS.clerks]);
      } else if (state === 'health_inspection') {
        performer = rng.choice([...PERFORMERS.health_inspectors]);
      } else {
        performer = rng.choice([...PERFORMERS.reviewers]);
      }
    }

    events.push({
      case_id: caseId,
      state,
      timestamp: currentTime.toISOString(),
      performer
    });

    // Calculate time to next state
    if (i < sequence.length - 1) {
      const transitionKey = `${state}->${sequence[i + 1]}` as keyof typeof TRANSITION_TIME_RANGES;
      const timeRange = TRANSITION_TIME_RANGES[transitionKey];

      if (timeRange) {
        const durationHours = rng.nextFloat(timeRange.min, timeRange.max);
        currentTime = new Date(currentTime.getTime() + durationHours * 60 * 60 * 1000);
      } else {
        // Default fallback for unknown transitions
        const durationHours = rng.nextFloat(1, 24);
        currentTime = new Date(currentTime.getTime() + durationHours * 60 * 60 * 1000);
      }
    }
  }

  return events;
}

export function validateEventLog(eventLog: EventLog): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!eventLog.events || !Array.isArray(eventLog.events)) {
    errors.push('Events must be an array');
    return { isValid: false, errors };
  }

  if (!eventLog.metadata || typeof eventLog.metadata.total_cases !== 'number') {
    errors.push('Metadata must include total_cases');
  }

  // Check each event has required fields
  for (const event of eventLog.events) {
    if (!event.case_id || typeof event.case_id !== 'string') {
      errors.push(`Event missing case_id: ${JSON.stringify(event)}`);
    }
    if (!event.state || typeof event.state !== 'string') {
      errors.push(`Event missing state: ${JSON.stringify(event)}`);
    }
    if (!event.timestamp || typeof event.timestamp !== 'string') {
      errors.push(`Event missing timestamp: ${JSON.stringify(event)}`);
    }
    if (event.performer !== null && typeof event.performer !== 'string') {
      errors.push(`Event has invalid performer: ${JSON.stringify(event)}`);
    }
  }

  // Check case completeness
  const caseGroups = new Map<string, Event[]>();
  for (const event of eventLog.events) {
    if (!caseGroups.has(event.case_id)) {
      caseGroups.set(event.case_id, []);
    }
    caseGroups.get(event.case_id)!.push(event);
  }

  for (const [caseId, events] of caseGroups) {
    events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const sequence = events.map(e => e.state);

    // Check if sequence ends in a final state
    const lastState = sequence[sequence.length - 1];
    if (!['approved', 'rejected', 'withdrawn'].includes(lastState)) {
      errors.push(`Case ${caseId} does not end in final state: ${lastState}`);
    }
  }

  return { isValid: errors.length === 0, errors };
}