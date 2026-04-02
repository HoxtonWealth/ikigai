import { Message, Phase, IkigaiSynthesis } from './types';

const STORAGE_KEY = 'ikigai-session';
const SYNTHESIS_KEY = 'ikigai-synthesis-backup';
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
  if (messages.length === 0) return;
  if (phase === 'results') return;
  try {
    const data: SavedSession = { messages, phase, currentPhaseMessages, timestamp: Date.now() };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full — silently ignore
  }
}

export function saveSynthesisBackup(raw: string, parsed: IkigaiSynthesis | null): void {
  try {
    const data = JSON.stringify({ raw, parsed, timestamp: Date.now() });
    sessionStorage.setItem(SYNTHESIS_KEY, data);
    localStorage.setItem(SYNTHESIS_KEY, data);
  } catch {
    // Ignore
  }
}

export function loadSynthesisBackup(): { raw: string; parsed: IkigaiSynthesis | null } | null {
  try {
    const data = sessionStorage.getItem(SYNTHESIS_KEY) || localStorage.getItem(SYNTHESIS_KEY);
    if (!data) return null;
    const backup = JSON.parse(data);
    if (Date.now() - backup.timestamp > MAX_AGE_MS) {
      clearSynthesisBackup();
      return null;
    }
    return backup;
  } catch {
    return null;
  }
}

export function clearSynthesisBackup(): void {
  try {
    sessionStorage.removeItem(SYNTHESIS_KEY);
    localStorage.removeItem(SYNTHESIS_KEY);
  } catch {
    // Ignore
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
