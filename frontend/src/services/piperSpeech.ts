type PiperEngine = {
  generate: (text: string, voice: string, speaker?: number) => Promise<{ file: Blob }>;
};

type PiperProvider = {
  list: () => Promise<string[]>;
};

let enginePromise: Promise<{ engine: PiperEngine; voices: string[] }> | null = null;
let activeAudio: HTMLAudioElement | null = null;
let activeUrl: string | null = null;

const voicePrefix: Record<string, string> = {
  hi: 'hi_IN',
  mr: 'mr_IN',
};

async function loadPiperWithTimeout() {
  const timeoutMs = 4000;
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Piper load timeout')), timeoutMs)
  );

  const loadPromise = (async () => {
    const module = await import('piper-tts-web');
    const provider = new module.HuggingFaceVoiceProvider() as PiperProvider;
    const voices = await provider.list();
    const engine = new module.PiperWebWorkerEngine({ voiceProvider: provider }) as PiperEngine;
    return { engine, voices };
  })();

  return Promise.race([loadPromise, timeoutPromise]);
}

function pickVoice(voices: string[], language: string) {
  const prefix = voicePrefix[language];
  if (!prefix) return null;
  const configured = import.meta.env[`VITE_PIPER_${language.toUpperCase()}_VOICE`];
  return configured || voices.find((voice) => voice.startsWith(prefix)) || null;
}

export async function speakWithPiper(
  text: string,
  language: string,
  onStart?: () => void,
  onEnd?: () => void
): Promise<void> {
  stopPiperSpeech();

  if (!enginePromise) {
    enginePromise = loadPiperWithTimeout().catch((err) => {
      enginePromise = null; // Reset so future attempts can retry
      throw err;
    });
  }

  const loaded = await enginePromise;
  const voice = pickVoice(loaded.voices, language);
  if (!voice) {
    throw new Error(`No Piper voice found for language ${language}`);
  }

  const result = await loaded.engine.generate(text, voice, 0);
  activeUrl = URL.createObjectURL(result.file);
  activeAudio = new Audio(activeUrl);

  return new Promise((resolve, reject) => {
    if (!activeAudio) return reject(new Error('Audio destroyed'));

    activeAudio.onplay = () => {
      onStart?.();
    };
    activeAudio.onended = () => {
      stopPiperSpeech();
      onEnd?.();
      resolve();
    };
    activeAudio.onerror = (e) => {
      stopPiperSpeech();
      onEnd?.();
      reject(e);
    };

    activeAudio.play().catch((err) => {
      stopPiperSpeech();
      onEnd?.();
      reject(err);
    });
  });
}

export function stopPiperSpeech() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.onplay = null;
    activeAudio.onended = null;
    activeAudio.onerror = null;
    activeAudio = null;
  }
  if (activeUrl) {
    URL.revokeObjectURL(activeUrl);
    activeUrl = null;
  }
}
