import {useCallback, useRef, useState} from 'react';

type HistoryEntry = {
  nodes: unknown[];
  edges: unknown[];
};

export function useUndoRedo(initial: HistoryEntry) {
  const [history, setHistory] = useState<HistoryEntry[]>([initial]);
  const [index, setIndex] = useState(0);
  const skipRef = useRef(false);

  const current = history[index];

  const push = useCallback((entry: HistoryEntry) => {
    if (skipRef.current) {
      skipRef.current = false;
      return;
    }
    setHistory((prev) => {
      const newHistory = prev.slice(0, index + 1);
      newHistory.push(entry);
      return newHistory;
    });
    setIndex((prev) => prev + 1);
  }, [index]);

  const undo = useCallback(() => {
    if (index <= 0) return null;
    skipRef.current = true;
    setIndex((prev) => prev - 1);
    return history[index - 1];
  }, [history, index]);

  const redo = useCallback(() => {
    if (index >= history.length - 1) return null;
    skipRef.current = true;
    setIndex((prev) => prev + 1);
    return history[index + 1];
  }, [history, index]);

  const canUndo = index > 0;
  const canRedo = index < history.length - 1;

  return {current, push, undo, redo, canUndo, canRedo};
}
