import type { Variant, ConservationCheck } from '../types/Variant';
import type { DirectlyFollowsGraph } from '../types/DFG';

export interface ConservationReport {
  overallStatus: 'PASS' | 'FAIL';
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  nodeResults: ConservationCheck[];
  variantResults: Record<string, {
    status: 'PASS' | 'FAIL';
    checks: ConservationCheck[];
  }>;
  summary: {
    criticalErrors: string[];
    warnings: string[];
    recommendations: string[];
  };
}

export function checkVariantConservation(variant: Variant): ConservationCheck[] {
  const checks: ConservationCheck[] = [];

  // Build a count map for each state in the variant
  const stateCounts = new Map<string, { incoming: number; outgoing: number }>();

  // Initialize counts for all states
  for (const state of variant.sequence) {
    if (!stateCounts.has(state)) {
      stateCounts.set(state, { incoming: 0, outgoing: 0 });
    }
  }

  // Count transitions
  for (const transition of variant.transitions) {
    const fromState = stateCounts.get(transition.from)!;
    const toState = stateCounts.get(transition.to)!;

    fromState.outgoing += transition.count;
    toState.incoming += transition.count;
  }

  // Check conservation for each state
  for (const [state, counts] of stateCounts) {
    const isStartState = variant.sequence[0] === state;
    const isEndState = variant.sequence[variant.sequence.length - 1] === state;

    let isBalanced = true;
    let errorMessage: string | null = null;

    if (isStartState && isEndState) {
      // Single-state variant (edge case)
      isBalanced = counts.incoming === 0 && counts.outgoing === 0;
      if (!isBalanced) {
        errorMessage = `Single-state variant should have no transitions, but found incoming=${counts.incoming}, outgoing=${counts.outgoing}`;
      }
    } else if (isStartState) {
      // Start state: should have no incoming transitions
      isBalanced = counts.incoming === 0;
      if (!isBalanced) {
        errorMessage = `Start state should have incoming=0, but found incoming=${counts.incoming}`;
      }
    } else if (isEndState) {
      // End state: should have no outgoing transitions
      isBalanced = counts.outgoing === 0;
      if (!isBalanced) {
        errorMessage = `End state should have outgoing=0, but found outgoing=${counts.outgoing}`;
      }
    } else {
      // Intermediate state: incoming should equal outgoing
      isBalanced = counts.incoming === counts.outgoing;
      if (!isBalanced) {
        errorMessage = `Intermediate state should have incoming=outgoing, but found incoming=${counts.incoming}, outgoing=${counts.outgoing}`;
      }
    }

    const outgoingCounts: Record<string, number> = {};
    for (const transition of variant.transitions.filter(t => t.from === state)) {
      outgoingCounts[transition.to] = transition.count;
    }

    checks.push({
      node: state,
      variant: variant.variant_id,
      incoming_count: counts.incoming,
      outgoing_counts: outgoingCounts,
      total_outgoing: counts.outgoing,
      is_balanced: isBalanced,
      error_message: errorMessage
    });
  }

  return checks;
}

export function checkDFGConservation(dfg: DirectlyFollowsGraph): ConservationCheck[] {
  const checks: ConservationCheck[] = [];

  for (const [activity, node] of dfg.nodes) {
    const incomingCount = node.incomingEdges.reduce((sum, edge) => sum + edge.count, 0);
    const outgoingCounts: Record<string, number> = {};
    let totalOutgoing = 0;

    for (const edge of node.outgoingEdges) {
      outgoingCounts[edge.to] = edge.count;
      totalOutgoing += edge.count;
    }

    const isStartActivity = dfg.startActivities.includes(activity);
    const isEndActivity = dfg.endActivities.includes(activity);

    let isBalanced = true;
    let errorMessage: string | null = null;

    if (isStartActivity && isEndActivity) {
      // Activity that can be both start and end (single-activity cases)
      isBalanced = true; // This is valid
    } else if (isStartActivity) {
      isBalanced = incomingCount === 0;
      if (!isBalanced) {
        errorMessage = `Start activity should have no incoming edges, found ${incomingCount}`;
      }
    } else if (isEndActivity) {
      isBalanced = totalOutgoing === 0;
      if (!isBalanced) {
        errorMessage = `End activity should have no outgoing edges, found ${totalOutgoing}`;
      }
    } else {
      isBalanced = incomingCount === totalOutgoing;
      if (!isBalanced) {
        errorMessage = `Intermediate activity flow imbalance: incoming=${incomingCount}, outgoing=${totalOutgoing}`;
      }
    }

    checks.push({
      node: activity,
      variant: 'DFG', // Special marker for DFG-level checks
      incoming_count: incomingCount,
      outgoing_counts: outgoingCounts,
      total_outgoing: totalOutgoing,
      is_balanced: isBalanced,
      error_message: errorMessage
    });
  }

  return checks;
}

export function generateConservationReport(variants: Variant[], dfg: DirectlyFollowsGraph): ConservationReport {
  const variantResults: Record<string, { status: 'PASS' | 'FAIL'; checks: ConservationCheck[] }> = {};
  let allChecks: ConservationCheck[] = [];

  // Check each variant
  for (const variant of variants) {
    const checks = checkVariantConservation(variant);
    const hasFailures = checks.some(check => !check.is_balanced);

    variantResults[variant.variant_id] = {
      status: hasFailures ? 'FAIL' : 'PASS',
      checks
    };

    allChecks = allChecks.concat(checks);
  }

  // Check DFG conservation
  const dfgChecks = checkDFGConservation(dfg);
  allChecks = allChecks.concat(dfgChecks);

  const passedChecks = allChecks.filter(check => check.is_balanced).length;
  const failedChecks = allChecks.length - passedChecks;
  const overallStatus = failedChecks === 0 ? 'PASS' : 'FAIL';

  // Generate summary
  const criticalErrors: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  if (failedChecks > 0) {
    criticalErrors.push(`${failedChecks} conservation law violations detected`);

    const failedVariants = Object.entries(variantResults)
      .filter(([, result]) => result.status === 'FAIL')
      .map(([variantId]) => variantId);

    if (failedVariants.length > 0) {
      criticalErrors.push(`Affected variants: ${failedVariants.join(', ')}`);
    }

    recommendations.push('Review event log data for missing or duplicate events');
    recommendations.push('Verify timestamp ordering within each case');
    recommendations.push('Check for incomplete case traces');
  }

  // Check for performance warnings
  const highFrequencyImbalances = allChecks.filter(check =>
    !check.is_balanced &&
    (check.incoming_count > 100 || check.total_outgoing > 100)
  );

  if (highFrequencyImbalances.length > 0) {
    warnings.push(`${highFrequencyImbalances.length} high-frequency nodes with conservation issues`);
    recommendations.push('Prioritize fixing high-frequency conservation issues first');
  }

  if (passedChecks === allChecks.length) {
    recommendations.push('All conservation checks passed - data integrity confirmed');
  }

  return {
    overallStatus,
    totalChecks: allChecks.length,
    passedChecks,
    failedChecks,
    nodeResults: allChecks,
    variantResults,
    summary: {
      criticalErrors,
      warnings,
      recommendations
    }
  };
}

export function validateWorkerSplitConservation(
  originalTransition: { from: string; to: string; count: number },
  workerBreakdown: Record<string, { count: number; median_time_hours: number }>
): { isValid: boolean; details: { expectedTotal: number; actualTotal: number; breakdown: Record<string, number> } } {
  const actualTotal = Object.values(workerBreakdown).reduce((sum, worker) => sum + worker.count, 0);
  const expectedTotal = originalTransition.count;

  const breakdown: Record<string, number> = {};
  for (const [worker, data] of Object.entries(workerBreakdown)) {
    breakdown[worker] = data.count;
  }

  return {
    isValid: actualTotal === expectedTotal,
    details: {
      expectedTotal,
      actualTotal,
      breakdown
    }
  };
}