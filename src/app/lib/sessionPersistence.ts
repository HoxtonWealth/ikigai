import { Message, Phase } from './types';

const STORAGE_KEY = 'ikigai-session';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export type SavedSession = {
  messages: Message[];
  phase: Phase;
  currentPhaseMessages: number;
  timestamp: number;
};

export function saveSession(
  messages: Message[],
  phase: Phase,
  currentPhaseMessages: number,
): void {
  // Only save if there's actual conversation to preserve
  if (messages.length === 0) return;
  // Don't save terminal states
  if (phase === 'synthesizing' || phase === 'results') return;
  try {
    const data: SavedSession = { messages, phase, currentPhaseMessages, timestamp: Date.now() };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full — silently ignore
  }
}

export function loadSession(): SavedSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved: SavedSession = JSON.parse(raw);
    if (Date.now() - saved.timestamp > MAX_AGE_MS) {
      clearSavedSession();
      return null;
    }
    if (!saved.messages?.length || !saved.phase) {
      clearSavedSession();
      return null;
    }
    return saved;
  } catch {
    clearSavedSession();
    return null;
  }
}

export function clearSavedSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}
