/**
 * Thin wrapper around the browser Web Speech API (SpeechRecognition).
 * Exposes a tiny imperative interface for the Voice Forge mic button.
 *
 * Not all browsers support this; the caller is expected to gate the UI on
 * `isVoiceSupported()` before showing the mic button.
 */

interface ISpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      length: number;
      [index: number]: { transcript: string };
    };
  };
}

interface ISpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

interface ISpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: ISpeechRecognitionErrorEvent) => void) | null;
  onresult: ((e: ISpeechRecognitionEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionCtor = new () => ISpeechRecognition;

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isVoiceSupported(): boolean {
  return getCtor() !== null;
}

export interface VoiceSession {
  stop: () => void;
}

export interface VoiceCallbacks {
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (message: string) => void;
  onEnd?: () => void;
}

export function startVoice(
  callbacks: VoiceCallbacks,
  lang = 'en-US',
): VoiceSession | null {
  const Ctor = getCtor();
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.continuous = false;
  rec.interimResults = true;
  rec.lang = lang;

  rec.onresult = (e) => {
    let interim = '';
    let final = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      const alt = res[0];
      if (!alt) continue;
      if (res.isFinal) final += alt.transcript;
      else interim += alt.transcript;
    }
    if (interim && callbacks.onInterim) callbacks.onInterim(interim);
    if (final && callbacks.onFinal) callbacks.onFinal(final);
  };

  rec.onerror = (e) => {
    callbacks.onError?.(e.message || e.error || 'Voice input error.');
  };
  rec.onend = () => {
    callbacks.onEnd?.();
  };

  try {
    rec.start();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    callbacks.onError?.(message);
    return null;
  }

  return {
    stop: () => {
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
    },
  };
}
