import { useEffect, useRef, useState } from 'react';
import type { Column, ProcessingSpecification } from '@dashboard/data-core';
import { type ProcessingGroup } from '../../../shared/ui';
import type { ProcessingAdapter } from '../types';

import { scanSuggestions, suggestionSpecification, type AiSuggestions, type AiSuggestion } from '../ai-suggestions';

export type AiSuggestionsProps = {
  adapter: ProcessingAdapter; group: ProcessingGroup; columns: Column[]; locked: boolean;
  onPreview(specification: ProcessingSpecification): void;
};
export function useAiSuggestions({ adapter, group, columns, locked, onPreview }: {
  adapter: ProcessingAdapter; group: ProcessingGroup; columns: Column[]; locked: boolean;
  onPreview(specification: ProcessingSpecification): void;
}){
  const [state, setState] = useState<{ context: string; data?: AiSuggestions; error?: string; loading?: boolean; stopped?: boolean }>();
  const [visibleCount, setVisibleCount] = useState(10);
  const columnIds = columns.map(column => column.columnId);
  const context = JSON.stringify({ group, columnIds });
  const current = useRef(context);
  const controller = useRef<AbortController | undefined>(undefined);
  useEffect(() => { current.current = context; return () => { controller.current?.abort(); }; }, [context, adapter]);
  const visible = state?.context === context ? state : undefined;
  async function suggest() {
    if (!adapter.suggestions) return;
    controller.current?.abort(); const abort = new AbortController(); controller.current = abort;
    setVisibleCount(10); setState({ context, loading: true });
    try {
      await scanSuggestions(adapter.suggestions, group, columnIds, abort.signal, data => {
        if (!abort.signal.aborted && current.current === context) setState({ context, loading: true, data });
      });
      if (!abort.signal.aborted && current.current === context) setState(value => value?.context === context ? { ...value, loading: false } : value);
    } catch (error) {
      if (!abort.signal.aborted && current.current === context) setState(value => ({ ...value, context, loading: false, error: error instanceof Error ? error.message : 'Không lấy được gợi ý AI.' }));
    }
  }
  function stop() {
    controller.current?.abort();
    setState(value => value?.context === context ? { ...value, loading: false, stopped: true } : value);
  }
  function preview(suggestion: AiSuggestion) {
    try { onPreview(suggestionSpecification(suggestion, group, columnIds)); }
    catch (error) { setState(value => ({ ...value, context, error: error instanceof Error ? error.message : 'Gợi ý không hợp lệ.' })); }
  }

  return {adapter,columns,locked,visibleCount,setVisibleCount,columnIds,visible,suggest,stop,preview};
}
export type AiSuggestionsModel = ReturnType<typeof useAiSuggestions>;
