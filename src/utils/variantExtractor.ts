import type { Event, ProcessCase } from '../types/EventLog';
import type { Variant, StateOccupancy } from '../types/Variant';
import { VARIANT_DEFINITIONS } from '../constants/permitStates';

export function extractCases(events: Event[]): ProcessCase[] {
  const caseGroups = new Map<string, Event[]>();

  // Group events by case_id
  for (const event of events) {
    if (!caseGroups.has(event.case_id)) {
      caseGroups.set(event.case_id, []);
    }
    caseGroups.get(event.case_id)!.push(event);
  }

  // Convert to ProcessCase objects
  const cases: ProcessCase[] = [];
  for (const [caseId, caseEvents] of caseGroups) {
    // Sort events by timestamp
    caseEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const sequence = caseEvents.map(e => e.state);
    const startTime = caseEvents[0].timestamp;
    const endTime = caseEvents[caseEvents.length - 1].timestamp;
    const totalDuration = (new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60 * 60); // hours

    cases.push({
      case_id: caseId,
      events: caseEvents,
      sequence,
      start_time: startTime,
      end_time: endTime,
      total_duration_hours: totalDuration
    });
  }

  return cases;
}

export function extractVariants(cases: ProcessCase[]): Variant[] {
  const variantGroups = new Map<string, ProcessCase[]>();

  // Group cases by sequence hash
  for (const processCase of cases) {
    const sequenceKey = processCase.sequence.join('→');
    if (!variantGroups.has(sequenceKey)) {
      variantGroups.set(sequenceKey, []);
    }
    variantGroups.get(sequenceKey)!.push(processCase);
  }

  // Convert to Variant objects and identify known variants
  const variants: Variant[] = [];
  let unknownCounter = 1;

  for (const [, variantCases] of variantGroups) {
    const sequence = variantCases[0].sequence;

    // Try to identify known variant
    let variantId = `unknown_${unknownCounter++}`;
    for (const [knownKey, knownVariant] of Object.entries(VARIANT_DEFINITIONS)) {
      if (JSON.stringify(sequence) === JSON.stringify(knownVariant.sequence)) {
        variantId = knownKey;
        break;
      }
    }

    // Calculate transitions with CORRECT counting (count actual transition occurrences, not variant cases)
    const transitions = [];
    for (let i = 0; i < sequence.length - 1; i++) {
      const from = sequence[i];
      const to = sequence[i + 1];

      // Calculate timing metrics and performer breakdown
      const durations: number[] = [];
      const performerData = new Map<string, { durations: number[]; count: number }>();
      let actualTransitionCount = 0; // Count actual transition occurrences

      for (const processCase of variantCases) {
        // Count ALL occurrences of this transition in this case (handles loops correctly)
        for (let eventIdx = 0; eventIdx < processCase.events.length - 1; eventIdx++) {
          const currentEvent = processCase.events[eventIdx];
          const nextEvent = processCase.events[eventIdx + 1];

          if (currentEvent.state === from && nextEvent.state === to) {
            actualTransitionCount++; // Increment for each actual transition occurrence

            const duration = (new Date(nextEvent.timestamp).getTime() - new Date(currentEvent.timestamp).getTime()) / (1000 * 60 * 60);
            durations.push(duration);

            // Track performer for the transition (performer of the target state)
            const performer = nextEvent.performer;
            if (performer) {
              if (!performerData.has(performer)) {
                performerData.set(performer, { durations: [], count: 0 });
              }
              const perfData = performerData.get(performer)!;
              perfData.durations.push(duration);
              perfData.count++;
            }
          }
        }
      }

      // Only add transition if it actually occurs
      if (actualTransitionCount > 0) {
        durations.sort((a, b) => a - b);
        const median = durations[Math.floor(durations.length / 2)] || 0;
        const mean = durations.reduce((sum, d) => sum + d, 0) / durations.length || 0;
        const p95 = durations[Math.floor(durations.length * 0.95)] || 0;

        // Build performer breakdown
        const performer_breakdown: Record<string, { count: number; median_time_hours: number; mean_time_hours: number }> = {};
        for (const [performer, data] of performerData) {
          data.durations.sort((a, b) => a - b);
          performer_breakdown[performer] = {
            count: data.count,
            median_time_hours: data.durations[Math.floor(data.durations.length / 2)] || 0,
            mean_time_hours: data.durations.reduce((sum, d) => sum + d, 0) / data.durations.length || 0
          };
        }

        transitions.push({
          from,
          to,
          count: actualTransitionCount, // FIX: Use actual transition occurrences, not variant case count
          median_time_hours: median,
          mean_time_hours: mean,
          percentile_95_hours: p95,
          performer_breakdown
        });
      }
    }

    // Calculate state occupancy (unique cases per state) - FIX for loops
    const stateOccupancy: StateOccupancy[] = [];
    for (const state of sequence) {
      const uniqueCases = new Set<string>();

      // Find all cases that pass through this state (regardless of loops)
      for (const processCase of variantCases) {
        if (processCase.events.some(event => event.state === state)) {
          uniqueCases.add(processCase.case_id);
        }
      }

      stateOccupancy.push({
        state,
        unique_case_count: uniqueCases.size,
        unique_cases: Array.from(uniqueCases)
      });
    }

    // Calculate total timing metrics
    const totalDurations = variantCases.map(c => c.total_duration_hours).sort((a, b) => a - b);
    const totalMedian = totalDurations[Math.floor(totalDurations.length / 2)] || 0;
    const totalMean = totalDurations.reduce((sum, d) => sum + d, 0) / totalDurations.length || 0;
    const totalP95 = totalDurations[Math.floor(totalDurations.length * 0.95)] || 0;

    variants.push({
      variant_id: variantId,
      sequence,
      case_count: variantCases.length,
      cases: variantCases.map(c => c.case_id),
      transitions,
      state_occupancy: stateOccupancy, // NEW: Proper state occupancy tracking
      total_median_hours: totalMedian,
      total_mean_hours: totalMean,
      total_percentile_95_hours: totalP95
    });
  }

  // Sort by case count (most common first)
  variants.sort((a, b) => b.case_count - a.case_count);

  return variants;
}