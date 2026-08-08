export type MusicMode = "none" | "draw" | "battle" | "result";

type AudioContextConstructor = typeof AudioContext;

const getAudioContext = (): AudioContextConstructor | undefined => {
  if (typeof window === "undefined") return undefined;
  return window.AudioContext ?? (window as typeof window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
};

const backgroundMusicUrl = `${import.meta.env.BASE_URL}audio/siege_of_the_sun_gates.mp3`;

class GameAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private effects: GainNode | null = null;
  private backgroundMusic: HTMLAudioElement | null = null;
  private enabled = true;
  private mode: MusicMode = "none";

  private getBackgroundMusic() {
    if (typeof window === "undefined") return null;
    if (!this.backgroundMusic) {
      this.backgroundMusic = new Audio(backgroundMusicUrl);
      this.backgroundMusic.loop = true;
      this.backgroundMusic.preload = "auto";
      this.backgroundMusic.volume = 0.2;
      this.backgroundMusic.setAttribute("aria-hidden", "true");
      this.backgroundMusic.style.display = "none";
      document.body.appendChild(this.backgroundMusic);
    }
    return this.backgroundMusic;
  }

  private startBackgroundMusic() {
    const track = this.getBackgroundMusic();
    if (!track || !this.enabled || this.mode === "none") return;
    void track.play().catch(() => undefined);
  }

  private stopBackgroundMusic(reset = false) {
    if (!this.backgroundMusic) return;
    this.backgroundMusic.pause();
    if (reset) this.backgroundMusic.currentTime = 0;
  }

  private async ensureContext() {
    const AudioContextClass = getAudioContext();
    if (!AudioContextClass) return null;
    if (!this.context) {
      this.context = new AudioContextClass();
      this.master = this.context.createGain();
      this.effects = this.context.createGain();
      this.master.gain.value = 0.58;
      this.effects.gain.value = 0.34;
      this.effects.connect(this.master);
      this.master.connect(this.context.destination);
    }
    if (this.context.state === "suspended") await this.context.resume();
    return this.context;
  }

  private tone(frequency: number, duration: number, delay = 0, volume = 0.2, type: OscillatorType = "sine", destination = this.effects) {
    const context = this.context;
    if (!context || !destination || !this.enabled) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + delay;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  async setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.stopBackgroundMusic();
      if (this.context && this.master) this.master.gain.setTargetAtTime(0.0001, this.context.currentTime, 0.025);
      return;
    }
    this.startBackgroundMusic();
    const context = await this.ensureContext();
    if (!context || !this.master) return;
    this.master.gain.setTargetAtTime(0.58, context.currentTime, 0.03);
    this.playSelect();
  }

  async setMode(mode: MusicMode) {
    this.mode = mode;
    if (mode === "none") {
      this.stopBackgroundMusic(true);
      return;
    }
    if (!this.enabled) return;
    this.startBackgroundMusic();
    await this.ensureContext();
  }

  async playReveal(power = 0) {
    if (!this.enabled) return;
    await this.ensureContext();
    const lift = Math.min(power, 7) * 22;
    [392, 523.25, 659.25, 783.99].forEach((note, index) => this.tone(note + lift, 0.34, index * 0.065, 0.17, "sine"));
  }

  async playSelect() {
    if (!this.enabled) return;
    await this.ensureContext();
    this.tone(440, 0.11, 0, 0.13, "triangle");
    this.tone(659.25, 0.14, 0.055, 0.1, "sine");
  }

  async playAdvance() {
    if (!this.enabled) return;
    await this.ensureContext();
    this.tone(293.66, 0.12, 0, 0.09, "triangle");
    this.tone(392, 0.16, 0.07, 0.1, "triangle");
  }

  async playClash() {
    if (!this.enabled) return;
    const context = await this.ensureContext();
    if (!context || !this.effects) return;
    const buffer = context.createBuffer(1, Math.floor(context.sampleRate * 0.28), context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < channel.length; index += 1) channel[index] = (Math.random() * 2 - 1) * (1 - index / channel.length);
    const noise = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    noise.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.value = 1350;
    filter.Q.value = 0.8;
    gain.gain.setValueAtTime(0.28, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.28);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.effects);
    noise.start();
    this.tone(92, 0.34, 0, 0.22, "sawtooth");
  }

  async playOutcome(winner: "A" | "B" | "draw") {
    if (!this.enabled) return;
    await this.ensureContext();
    const notes = winner === "draw" ? [329.63, 329.63] : [392, 523.25, 659.25];
    notes.forEach((note, index) => this.tone(note, 0.28, 0.2 + index * 0.1, 0.13, "sine"));
  }

  stop() {
    this.mode = "none";
    this.stopBackgroundMusic(true);
  }
}

export const gameAudio = new GameAudio();
