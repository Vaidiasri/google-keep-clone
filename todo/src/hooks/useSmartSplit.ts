import { useCallback, useEffect, useRef, useState } from "react";
import { todoApi } from "../services/todoService";
import { aiApi } from "../services/aiService";
import { parseBulletList } from "../lib/funUtils";
import type { AISplitResponse } from "../types/ai.types";

export type SmartSplitMode = "new" | "existing";

export function useSmartSplit(onComplete: () => Promise<unknown>) {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");
  const [mode, setMode] = useState<SmartSplitMode>("new");
  const [parentTitle, setParentTitle] = useState("");
  const [existingParentId, setExistingParentId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState("");
  const [useAI, setUseAI] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPreview, setAiPreview] = useState<AISplitResponse | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showReasoning, setShowReasoning] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const regexParsed = parseBulletList(text);

  const effectiveParsed = useAI && aiPreview
    ? { title: aiPreview.title, items: aiPreview.subtasks }
    : regexParsed;

  const reset = useCallback(() => {
    setText("");
    setMode("new");
    setParentTitle("");
    setExistingParentId(null);
    setCreating(false);
    setProgress("");
    setUseAI(false);
    setAiLoading(false);
    setAiPreview(null);
    setAiError(null);
    setShowReasoning(false);
  }, []);

  const open = useCallback(() => {
    reset();
    setIsOpen(true);
  }, [reset]);

  const close = useCallback(() => {
    if (creating) return;
    setIsOpen(false);
    reset();
  }, [creating, reset]);

  const fetchAIPreview = useCallback(async (input: string) => {
    if (!input.trim()) {
      setAiPreview(null);
      return;
    }
    setAiLoading(true);
    setAiError(null);
    try {
      const result = await aiApi.split(input);
      setAiPreview(result);
    } catch {
      setAiError("AI unavailable — used basic split instead.");
      setAiPreview(null);
      setUseAI(false);
    } finally {
      setAiLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen || !useAI) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchAIPreview(text);
    }, 600);
    return () => clearTimeout(debounceRef.current);
  }, [text, useAI, isOpen, fetchAIPreview]);

  const execute = useCallback(async (): Promise<
    { success: true; created: number } | { success: false; created: number; total: number } | null
  > => {
    const items = effectiveParsed.items;
    if (items.length === 0) return null;

    setCreating(true);
    let created = 0;
    const total = items.length;

    try {
      if (mode === "new") {
        const title =
          parentTitle.trim() ||
          effectiveParsed.title ||
          aiPreview?.title ||
          "New project";
        setProgress(`Creating parent task…`);
        const parent = await todoApi.createTodo({ text: title });

        for (const itemText of items) {
          created++;
          setProgress(`Creating subtask ${created}/${total}…`);
          await todoApi.createTodo({ text: itemText, parentId: parent.id });
        }
      } else {
        if (!existingParentId) return null;
        for (const itemText of items) {
          created++;
          setProgress(`Creating subtask ${created}/${total}…`);
          await todoApi.createTodo({ text: itemText, parentId: existingParentId });
        }
      }

      await onComplete();
      setIsOpen(false);
      reset();
      return { success: true, created: total };
    } catch {
      await onComplete();
      return { success: false, created, total };
    } finally {
      setCreating(false);
      setProgress("");
    }
  }, [
    effectiveParsed,
    aiPreview,
    mode,
    parentTitle,
    existingParentId,
    onComplete,
    reset,
  ]);

  return {
    isOpen,
    text,
    setText,
    mode,
    setMode,
    parentTitle,
    setParentTitle,
    existingParentId,
    setExistingParentId,
    creating,
    progress,
    parsed: effectiveParsed,
    regexParsed,
    useAI,
    setUseAI,
    aiLoading,
    aiPreview,
    aiError,
    showReasoning,
    setShowReasoning,
    open,
    close,
    execute,
    fetchAIPreview,
  };
}
