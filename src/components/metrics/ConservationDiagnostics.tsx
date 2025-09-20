import React, { useState } from 'react';
import type { ConservationReport } from '../../utils/conservationChecker';

interface ConservationDiagnosticsProps {
  report: ConservationReport;
}

export const ConservationDiagnostics: React.FC<ConservationDiagnosticsProps> = ({ report }) => {
  const [selectedVariant, setSelectedVariant] = useState<string>('all');
  const [showDetails, setShowDetails] = useState(false);

  const getStatusColor = (status: 'PASS' | 'FAIL') => {
    return status === 'PASS' ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100';
  };

  const getStatusIcon = (status: 'PASS' | 'FAIL') => {
    return status === 'PASS' ? '✅' : '❌';
  };

  const filteredChecks = selectedVariant === 'all'
    ? report.nodeResults
    : report.nodeResults.filter(check => check.variant === selectedVariant);

  const variantOptions = ['all', ...Object.keys(report.variantResults), 'DFG'];

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Conservation Diagnostics</h3>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(report.overallStatus)}`}>
          {getStatusIcon(report.overallStatus)} {report.overallStatus}
        </div>
      </div>

      {/* Overall Status */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-blue-50 rounded">
          <div className="text-2xl font-bold text-blue-900">{report.totalChecks}</div>
          <div className="text-sm text-blue-700">Total Checks</div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded">
          <div className="text-2xl font-bold text-green-900">{report.passedChecks}</div>
          <div className="text-sm text-green-700">Passed</div>
        </div>
        <div className="text-center p-3 bg-red-50 rounded">
          <div className="text-2xl font-bold text-red-900">{report.failedChecks}</div>
          <div className="text-sm text-red-700">Failed</div>
        </div>
      </div>

      {/* Summary Messages */}
      {report.summary.criticalErrors.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md mb-4">
          <h4 className="font-medium text-red-800 mb-2">🚨 Critical Errors</h4>
          <ul className="text-sm text-red-700 space-y-1">
            {report.summary.criticalErrors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {report.summary.warnings.length > 0 && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md mb-4">
          <h4 className="font-medium text-yellow-800 mb-2">⚠️ Warnings</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            {report.summary.warnings.map((warning, index) => (
              <li key={index}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}

      {report.summary.recommendations.length > 0 && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md mb-4">
          <h4 className="font-medium text-blue-800 mb-2">💡 Recommendations</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            {report.summary.recommendations.map((rec, index) => (
              <li key={index}>• {rec}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Variant Breakdown */}
      <div className="mb-4">
        <h4 className="font-medium text-gray-900 mb-3">Variant Status</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Object.entries(report.variantResults).map(([variantId, result]) => (
            <div key={variantId} className={`p-2 rounded text-center text-sm ${getStatusColor(result.status)}`}>
              <div className="font-medium">{variantId}</div>
              <div className="text-xs">
                {result.checks.filter(c => c.is_balanced).length}/{result.checks.length} passed
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Filter by:</label>
          <select
            value={selectedVariant}
            onChange={(e) => setSelectedVariant(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {variantOptions.map(option => (
              <option key={option} value={option}>
                {option === 'all' ? 'All Checks' : option}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm transition-colors"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {/* Detailed Results */}
      <div className="space-y-2">
        {filteredChecks.map((check, index) => (
          <div key={index} className={`p-3 rounded-md border ${check.is_balanced ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{check.is_balanced ? '✅' : '❌'}</span>
                <span className="font-medium">{check.node}</span>
                <span className="text-sm text-gray-500">({check.variant})</span>
              </div>
              <div className="text-sm font-mono">
                in: {check.incoming_count} → out: {check.total_outgoing}
              </div>
            </div>

            {showDetails && (
              <div className="mt-2 text-sm">
                {check.error_message ? (
                  <p className="text-red-700">{check.error_message}</p>
                ) : (
                  <p className="text-green-700">Conservation law satisfied</p>
                )}

                {Object.keys(check.outgoing_counts).length > 0 && (
                  <div className="mt-2">
                    <span className="font-medium">Outgoing breakdown:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Object.entries(check.outgoing_counts).map(([target, count]) => (
                        <span key={target} className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                          {target}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredChecks.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No conservation checks found for the selected filter.
        </div>
      )}

      {/* Footer Stats */}
      <div className="mt-4 pt-4 border-t text-center text-sm text-gray-600">
        Showing {filteredChecks.length} of {report.totalChecks} checks
        {selectedVariant !== 'all' && (
          <span> for {selectedVariant}</span>
        )}
      </div>
    </div>
  );
};