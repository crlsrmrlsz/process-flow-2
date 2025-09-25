import type { ProcessCase } from '../types/EventLog';
import type { Variant } from '../types/Variant';
import type { DirectlyFollowsGraph } from '../types/DFG';
import { TRANSITION_TIME_RANGES } from '../constants/permitStates';

/**
 * Get Expected Time for Process Transition
 *
 * PURPOSE:
 * Retrieves the expected maximum processing time for a specific state transition.
 * This is used for bottleneck detection and displaying expected times to users.
 *
 * PARAMETERS:
 * @param from - Source state name (e.g., 'submitted', 'review_in_progress')
 * @param to - Target state name (e.g., 'intake_validation', 'approved')
 *
 * RETURNS:
 * - number: Expected maximum time in hours (from TRANSITION_TIME_RANGES.max)
 * - null: If no expected time is configured for this transition
 *
 * USAGE:
 * - Bottleneck Detection: Compare actual times against expected times
 * - UI Display: Show "expected: 48h" in edge labels
 * - Business Logic: Use expected times for process optimization
 *
 * EXAMPLES:
 * - getExpectedTime('submitted', 'intake_validation') → 48 (hours)
 * - getExpectedTime('unknown', 'state') → null
 *
 * NOTE: Uses the 'max' value from time ranges as the bottleneck threshold.
 * This represents the business expectation for maximum acceptable processing time.
 */
export function getExpectedTime(from: string, to: string): number | null {
  const transitionKey = `${from}->${to}` as keyof typeof TRANSITION_TIME_RANGES;
  const timeRange = TRANSITION_TIME_RANGES[transitionKey];
  return timeRange ? timeRange.max : null; // Use max as the expected threshold
}

// Interface for worker performance analysis
export interface WorkerPerformanceAnalysis {
  workerId: string;
  processCount: number;
  meanTime: number;
  isOverExpected: boolean;
  percentageOver: number;
}

// Analyze individual worker performance against expected time
export function analyzeWorkerPerformance(
  performerBreakdown: Record<string, { count: number; median_time_hours: number; mean_time_hours: number }>,
  expectedTime: number | null
): WorkerPerformanceAnalysis[] {
  if (!expectedTime || !performerBreakdown) {
    return [];
  }

  return Object.entries(performerBreakdown).map(([workerId, data]) => {
    const isOverExpected = data.mean_time_hours > expectedTime;
    const percentageOver = expectedTime > 0
      ? ((data.mean_time_hours - expectedTime) / expectedTime) * 100
      : 0;

    return {
      workerId,
      processCount: data.count,
      meanTime: data.mean_time_hours,
      isOverExpected,
      percentageOver: Math.max(0, percentageOver) // Don't show negative percentages
    };
  });
}

export interface ProcessMetrics {
  caseMetrics: {
    totalCases: number;
    averageCaseDuration: number;
    medianCaseDuration: number;
    percentile95CaseDuration: number;
    shortestCase: { caseId: string; duration: number };
    longestCase: { caseId: string; duration: number };
  };

  variantMetrics: {
    totalVariants: number;
    mostCommonVariant: string;
    variantCoverage: number; // percentage of cases covered by top 3 variants
    variantComplexity: number; // average path length
  };

  transitionMetrics: {
    totalTransitions: number;
    averageTransitionTime: number;
    slowestTransition: { from: string; to: string; medianTime: number };
    fastestTransition: { from: string; to: string; medianTime: number };
  };

  performerMetrics: {
    totalPerformers: number;
    performerWorkload: Record<string, {
      totalTransitions: number;
      averageTime: number;
      activities: string[];
    }>;
    bottleneckPerformers: string[];
  };

  throughputMetrics: {
    casesPerDay: number;
    casesPerWeek: number;
    busiest24Hours: { start: string; caseCount: number };
  };
}

export function calculateProcessMetrics(cases: ProcessCase[], variants: Variant[], _dfg: DirectlyFollowsGraph): ProcessMetrics {
  // Case Metrics
  const durations = cases.map(c => c.total_duration_hours).sort((a, b) => a - b);
  const averageCaseDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
  const medianCaseDuration = durations[Math.floor(durations.length / 2)];
  const percentile95CaseDuration = durations[Math.floor(durations.length * 0.95)];

  const shortestCase = cases.reduce((min, c) => c.total_duration_hours < min.duration ? { caseId: c.case_id, duration: c.total_duration_hours } : min,
    { caseId: cases[0].case_id, duration: cases[0].total_duration_hours });
  const longestCase = cases.reduce((max, c) => c.total_duration_hours > max.duration ? { caseId: c.case_id, duration: c.total_duration_hours } : max,
    { caseId: cases[0].case_id, duration: cases[0].total_duration_hours });

  // Variant Metrics
  const top3VariantsCases = variants.slice(0, 3).reduce((sum, v) => sum + v.case_count, 0);
  const variantCoverage = (top3VariantsCases / cases.length) * 100;
  const variantComplexity = variants.reduce((sum, v) => sum + v.sequence.length * v.case_count, 0) / cases.length;

  // Transition Metrics
  const allTransitions = variants.flatMap(v => v.transitions);
  const transitionTimes = allTransitions.map(t => t.median_time_hours).filter(t => t > 0);
  const averageTransitionTime = transitionTimes.reduce((sum, t) => sum + t, 0) / transitionTimes.length;

  let slowestTransition = { from: '', to: '', medianTime: 0 };
  let fastestTransition = { from: '', to: '', medianTime: Infinity };

  for (const transition of allTransitions) {
    if (transition.median_time_hours > slowestTransition.medianTime) {
      slowestTransition = { from: transition.from, to: transition.to, medianTime: transition.median_time_hours };
    }
    if (transition.median_time_hours < fastestTransition.medianTime && transition.median_time_hours > 0) {
      fastestTransition = { from: transition.from, to: transition.to, medianTime: transition.median_time_hours };
    }
  }

  // Performer Metrics
  const performerData = new Map<string, { totalTransitions: number; totalTime: number; activities: Set<string> }>();

  for (const variant of variants) {
    for (const transition of variant.transitions) {
      for (const [performer, perfData] of Object.entries(transition.performer_breakdown)) {
        if (!performerData.has(performer)) {
          performerData.set(performer, { totalTransitions: 0, totalTime: 0, activities: new Set() });
        }
        const data = performerData.get(performer)!;
        data.totalTransitions += perfData.count;
        data.totalTime += perfData.mean_time_hours * perfData.count;
        data.activities.add(transition.to);
      }
    }
  }

  const performerWorkload: Record<string, { totalTransitions: number; averageTime: number; activities: string[] }> = {};
  const performerAverageTimes: { performer: string; avgTime: number }[] = [];

  for (const [performer, data] of performerData) {
    const averageTime = data.totalTime / data.totalTransitions;
    performerWorkload[performer] = {
      totalTransitions: data.totalTransitions,
      averageTime,
      activities: Array.from(data.activities)
    };
    performerAverageTimes.push({ performer, avgTime: averageTime });
  }

  // Identify bottleneck performers (top 20% slowest)
  performerAverageTimes.sort((a, b) => b.avgTime - a.avgTime);
  const bottleneckCount = Math.max(1, Math.floor(performerAverageTimes.length * 0.2));
  const bottleneckPerformers = performerAverageTimes.slice(0, bottleneckCount).map(p => p.performer);

  // Throughput Metrics
  const timestamps = cases.map(c => new Date(c.start_time).getTime()).sort((a, b) => a - b);
  const firstCase = new Date(timestamps[0]);
  const lastCase = new Date(timestamps[timestamps.length - 1]);
  const totalDays = (lastCase.getTime() - firstCase.getTime()) / (1000 * 60 * 60 * 24);
  const casesPerDay = cases.length / Math.max(totalDays, 1);
  const casesPerWeek = casesPerDay * 7;

  // Find busiest 24-hour period
  const hourlyBuckets = new Map<string, number>();
  for (const caseData of cases) {
    const hour = new Date(caseData.start_time);
    hour.setMinutes(0, 0, 0); // Round to hour
    const hourKey = hour.toISOString().slice(0, 13); // YYYY-MM-DDTHH
    hourlyBuckets.set(hourKey, (hourlyBuckets.get(hourKey) || 0) + 1);
  }

  let busiest24Hours = { start: '', caseCount: 0 };
  for (const [hourKey, count] of hourlyBuckets) {
    if (count > busiest24Hours.caseCount) {
      busiest24Hours = { start: hourKey, caseCount: count };
    }
  }

  return {
    caseMetrics: {
      totalCases: cases.length,
      averageCaseDuration,
      medianCaseDuration,
      percentile95CaseDuration,
      shortestCase,
      longestCase
    },
    variantMetrics: {
      totalVariants: variants.length,
      mostCommonVariant: variants[0]?.variant_id || 'unknown',
      variantCoverage,
      variantComplexity
    },
    transitionMetrics: {
      totalTransitions: allTransitions.length,
      averageTransitionTime,
      slowestTransition,
      fastestTransition: fastestTransition.medianTime === Infinity ? { from: '', to: '', medianTime: 0 } : fastestTransition
    },
    performerMetrics: {
      totalPerformers: performerData.size,
      performerWorkload,
      bottleneckPerformers
    },
    throughputMetrics: {
      casesPerDay,
      casesPerWeek,
      busiest24Hours
    }
  };
}

export function identifyBottlenecks(variants: Variant[]): Array<{
  type: 'transition' | 'performer';
  identifier: string;
  score: number;
  reason: string;
  affectedCases: number;
}> {
  const bottlenecks: Array<{
    type: 'transition' | 'performer';
    identifier: string;
    score: number;
    reason: string;
    affectedCases: number;
  }> = [];

  // Identify transition bottlenecks using expected time comparison
  for (const variant of variants) {
    for (const transition of variant.transitions) {
      const expectedTime = getExpectedTime(transition.from, transition.to);
      let isBottleneck = false;
      let reason = '';

      if (expectedTime) {
        // Use expected time with 1.2x multiplier as threshold for some tolerance
        const threshold = expectedTime * 1.2;
        const exceedsExpected = transition.mean_time_hours > threshold;
        const isHighFrequency = variant.case_count >= 5; // At least 5 cases affected

        if (exceedsExpected && isHighFrequency) {
          isBottleneck = true;
          reason = `Exceeds expected time (${transition.mean_time_hours.toFixed(1)}h vs expected max ${expectedTime.toFixed(1)}h)`;
        }
      } else {
        // Fallback to percentile-based detection for transitions without expected times
        // Calculate percentile threshold if needed
        const allTransitionTimes: number[] = [];
        for (const v of variants) {
          for (const t of v.transitions) {
            if (t.median_time_hours > 0) {
              allTransitionTimes.push(t.median_time_hours);
            }
          }
        }
        allTransitionTimes.sort((a, b) => a - b);
        const p90Threshold = allTransitionTimes[Math.floor(allTransitionTimes.length * 0.9)] || 0;

        const isHighTime = transition.median_time_hours >= p90Threshold;
        const isHighFrequency = variant.case_count >= 5;

        if (isHighTime && isHighFrequency) {
          isBottleneck = true;
          reason = `High median time (${transition.median_time_hours.toFixed(1)}h) in 90th percentile`;
        }
      }

      if (isBottleneck) {
        bottlenecks.push({
          type: 'transition',
          identifier: `${transition.from} → ${transition.to}`,
          score: transition.mean_time_hours,
          reason,
          affectedCases: variant.case_count
        });
      }
    }
  }

  // Identify performer bottlenecks
  const performerTimes = new Map<string, { totalTime: number; count: number; activities: Set<string> }>();

  for (const variant of variants) {
    for (const transition of variant.transitions) {
      for (const [performer, perfData] of Object.entries(transition.performer_breakdown)) {
        if (!performerTimes.has(performer)) {
          performerTimes.set(performer, { totalTime: 0, count: 0, activities: new Set() });
        }
        const data = performerTimes.get(performer)!;
        data.totalTime += perfData.mean_time_hours * perfData.count;
        data.count += perfData.count;
        data.activities.add(transition.to);
      }
    }
  }

  const performerAverages = Array.from(performerTimes.entries()).map(([performer, data]) => ({
    performer,
    avgTime: data.totalTime / data.count,
    count: data.count,
    activities: data.activities.size
  })).sort((a, b) => b.avgTime - a.avgTime);

  // Top 20% slowest performers with significant workload
  const slowPerformerCount = Math.max(1, Math.floor(performerAverages.length * 0.2));
  const slowPerformers = performerAverages.slice(0, slowPerformerCount).filter(p => p.count >= 5);

  for (const perf of slowPerformers) {
    bottlenecks.push({
      type: 'performer',
      identifier: perf.performer,
      score: perf.avgTime,
      reason: `Consistently slow performance (${perf.avgTime.toFixed(1)}h avg) across ${perf.activities} activities`,
      affectedCases: perf.count
    });
  }

  // Sort by score (highest impact first)
  return bottlenecks.sort((a, b) => b.score - a.score);
}