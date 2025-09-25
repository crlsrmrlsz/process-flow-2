import type { Event, EventLog } from '../types/EventLog';
import type { PermitState } from '../constants/permitStates';
import { VARIANT_DEFINITIONS, TRANSITION_TIME_RANGES, PERFORMERS, HUMAN_STATES, PERFORMER_PROFILES } from '../constants/permitStates';

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

// Workload tracking for realistic performer assignment
interface PerformerWorkload {
  caseCount: number;
  totalTime: number;
  fatigueLevel: number;
}

export function generateEventLog(config: GeneratorConfig): EventLog {
  const rng = new SeededRandom(config.seed);
  const events: Event[] = [];

  // Initialize workload tracking for all performers
  const performerWorkloads = new Map<string, PerformerWorkload>();
  const allPerformers = [...PERFORMERS.clerks, ...PERFORMERS.reviewers, ...PERFORMERS.health_inspectors];
  allPerformers.forEach(performer => {
    performerWorkloads.set(performer, {
      caseCount: 0,
      totalTime: 0,
      fatigueLevel: 0
    });
  });

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
    const caseEvents = generateCaseEvents(caseId, variantDef.sequence, rng, performerWorkloads);
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

// Enhanced performer selection based on workload and capacity
function selectPerformerWithWorkload(
  performers: readonly string[],
  rng: SeededRandom,
  workloads: Map<string, PerformerWorkload>
): string {
  // Calculate selection weights based on capacity and inverse workload
  const weights: number[] = [];
  let totalWeight = 0;

  for (const performer of performers) {
    const profile = PERFORMER_PROFILES[performer as keyof typeof PERFORMER_PROFILES];
    const workload = workloads.get(performer)!;

    // Higher capacity performers get more cases, but diminishing returns with high workload
    const capacityFactor = profile.capacity;
    const workloadPenalty = Math.max(0.3, 1 - (workload.caseCount / 100)); // Diminishing capacity
    const weight = capacityFactor * workloadPenalty;

    weights.push(weight);
    totalWeight += weight;
  }

  // Select performer based on weighted probabilities
  const rand = rng.next() * totalWeight;
  let cumulative = 0;

  for (let i = 0; i < performers.length; i++) {
    cumulative += weights[i];
    if (rand <= cumulative) {
      return performers[i];
    }
  }

  return performers[performers.length - 1];
}

// Calculate realistic processing time with performer variance and bottlenecks
function calculateProcessingTime(
  transitionKey: string,
  performer: string | null,
  rng: SeededRandom,
  workloads: Map<string, PerformerWorkload>
): number {
  const timeRange = TRANSITION_TIME_RANGES[transitionKey as keyof typeof TRANSITION_TIME_RANGES];
  let baseDuration: number;

  if (timeRange) {
    baseDuration = rng.nextFloat(timeRange.min, timeRange.max);
  } else {
    baseDuration = rng.nextFloat(1, 24); // Default fallback
  }

  if (!performer) {
    return baseDuration; // Automatic transitions remain unchanged
  }

  const profile = PERFORMER_PROFILES[performer as keyof typeof PERFORMER_PROFILES];
  const workload = workloads.get(performer)!;

  // Apply performer speed multiplier
  let adjustedDuration = baseDuration * profile.speed;

  // Apply consistency variance (lower consistency = more variable performance)
  const varianceMultiplier = 1 + ((1 - profile.consistency) * (rng.nextFloat(-0.5, 0.5)));
  adjustedDuration *= Math.max(0.5, varianceMultiplier);

  // Apply fatigue effect (higher workload = slower performance)
  const fatigueMultiplier = 1 + (workload.fatigueLevel * 0.3);
  adjustedDuration *= fatigueMultiplier;

  // Random bottleneck events (5% chance for 2-4x longer processing)
  if (rng.next() < 0.05) {
    const bottleneckMultiplier = rng.nextFloat(2, 4);
    adjustedDuration *= bottleneckMultiplier;
  }

  // Peak time effects (10% slower during busy periods)
  if (rng.next() < 0.3) { // 30% of cases occur during peak times
    adjustedDuration *= 1.1;
  }

  return Math.max(0.1, adjustedDuration); // Minimum 6 minutes
}

function generateCaseEvents(
  caseId: string,
  sequence: PermitState[],
  rng: SeededRandom,
  performerWorkloads: Map<string, PerformerWorkload>
): Event[] {
  const events: Event[] = [];

  // Start with a random timestamp within the last 6 months
  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);
  let currentTime = new Date(
    rng.nextFloat(sixMonthsAgo.getTime(), now.getTime() - 30 * 24 * 60 * 60 * 1000) // At least 30 days ago
  );

  for (let i = 0; i < sequence.length; i++) {
    const state = sequence[i];

    // Enhanced performer selection with workload consideration
    let performer: string | null = null;
    if (HUMAN_STATES.includes(state)) {
      if (state === 'intake_validation') {
        performer = selectPerformerWithWorkload(PERFORMERS.clerks, rng, performerWorkloads);
      } else if (state === 'health_inspection') {
        performer = selectPerformerWithWorkload(PERFORMERS.health_inspectors, rng, performerWorkloads);
      } else {
        performer = selectPerformerWithWorkload(PERFORMERS.reviewers, rng, performerWorkloads);
      }
    }

    events.push({
      case_id: caseId,
      state,
      timestamp: currentTime.toISOString(),
      performer
    });

    // Calculate time to next state with enhanced variance
    if (i < sequence.length - 1) {
      const transitionKey = `${state}->${sequence[i + 1]}`;
      const durationHours = calculateProcessingTime(transitionKey, performer, rng, performerWorkloads);

      currentTime = new Date(currentTime.getTime() + durationHours * 60 * 60 * 1000);

      // Update performer workload tracking
      if (performer) {
        const workload = performerWorkloads.get(performer)!;
        workload.caseCount++;
        workload.totalTime += durationHours;
        workload.fatigueLevel = Math.min(1.0, workload.caseCount / 50); // Fatigue increases with caseload
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