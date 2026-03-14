'use client';

import { useRef, useCallback, useState, useEffect } from 'react';

const MAX_HISTORY = 30;

/**
 * Generic undo/redo history hook.
 * Tracks state snapshots (deep-compared via JSON.stringify) and lets callers
 * navigate back/forward through the stack.
 *
 * @param current  The current state value (kept in sync by the parent)
 * @param onApply  Called when undo/redo restores a previous snapshot
 */
export function useHistory<T>(current: T, onApply: (state: T) => void) {
  const historyRef = useRef<T[]>([current]);
  const pointerRef = useRef(0);
  const isUndoRedoRef = useRef(false);
  const lastValueRef = useRef(current);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateFlags = useCallback(() => {
    setCanUndo(pointerRef.current > 0);
    setCanRedo(pointerRef.current < historyRef.current.length - 1);
  }, []);

  // Detect external changes and push to history
  useEffect(() => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }
    if (
      JSON.stringify(current) !== JSON.stringify(lastValueRef.current) &&
      JSON.stringify(current) !== JSON.stringify(historyRef.current[pointerRef.current])
    ) {
      const next = historyRef.current.slice(0, pointerRef.current + 1);
      next.push(structuredClone(current));
      if (next.length > MAX_HISTORY) next.shift();
      historyRef.current = next;
      pointerRef.current = next.length - 1;
      lastValueRef.current = current;
      updateFlags();
    }
  }, [current, updateFlags]);

  const undo = useCallback(() => {
    if (pointerRef.current > 0) {
      pointerRef.current -= 1;
      isUndoRedoRef.current = true;
      const state = structuredClone(historyRef.current[pointerRef.current]);
      lastValueRef.current = state;
      updateFlags();
      onApply(state);
    }
  }, [onApply, updateFlags]);

  const redo = useCallback(() => {
    if (pointerRef.current < historyRef.current.length - 1) {
      pointerRef.current += 1;
      isUndoRedoRef.current = true;
      const state = structuredClone(historyRef.current[pointerRef.current]);
      lastValueRef.current = state;
      updateFlags();
      onApply(state);
    }
  }, [onApply, updateFlags]);

  const reset = useCallback((initial?: T) => {
    const val = initial !== undefined ? structuredClone(initial) : structuredClone(current);
    historyRef.current = [val];
    pointerRef.current = 0;
    lastValueRef.current = val;
    updateFlags();
  }, [current, updateFlags]);

  return { canUndo, canRedo, undo, redo, reset };
}
