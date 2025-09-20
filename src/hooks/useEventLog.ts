import { useState, useCallback } from 'react';
import type { EventLog } from '../types/EventLog';
import { validateEventLog } from '../utils/dataGenerator';

export interface EventLogState {
  eventLog: EventLog | null;
  isLoading: boolean;
  error: string | null;
  validationResult: { isValid: boolean; errors: string[] } | null;
}

export function useEventLog() {
  const [state, setState] = useState<EventLogState>({
    eventLog: null,
    isLoading: false,
    error: null,
    validationResult: null
  });

  const loadEventLog = useCallback(async (eventLog: EventLog) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const validation = validateEventLog(eventLog);

      setState({
        eventLog: validation.isValid ? eventLog : null,
        isLoading: false,
        error: validation.isValid ? null : `Validation failed: ${validation.errors.join(', ')}`,
        validationResult: validation
      });
    } catch (error) {
      setState({
        eventLog: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        validationResult: null
      });
    }
  }, []);

  const loadFromFile = useCallback(async (file: File) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const text = await file.text();
      const data = JSON.parse(text) as EventLog;
      await loadEventLog(data);
    } catch (error) {
      setState({
        eventLog: null,
        isLoading: false,
        error: `Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        validationResult: null
      });
    }
  }, [loadEventLog]);

  const loadFromUrl = useCallback(async (url: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as EventLog;
      await loadEventLog(data);
    } catch (error) {
      setState({
        eventLog: null,
        isLoading: false,
        error: `Failed to load from URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        validationResult: null
      });
    }
  }, [loadEventLog]);

  const reset = useCallback(() => {
    setState({
      eventLog: null,
      isLoading: false,
      error: null,
      validationResult: null
    });
  }, []);

  return {
    ...state,
    loadEventLog,
    loadFromFile,
    loadFromUrl,
    reset
  };
}