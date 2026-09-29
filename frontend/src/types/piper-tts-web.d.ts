declare module 'piper-tts-web' {
  export class HuggingFaceVoiceProvider {
    list(): Promise<string[]>;
  }
  export class PiperWebWorkerEngine {
    constructor(options?: { voiceProvider?: HuggingFaceVoiceProvider });
    generate(text: string, voice: string, speaker?: number): Promise<{ file: Blob }>;
    destroy(): void;
  }
}
