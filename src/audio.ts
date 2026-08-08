export type MusicMode = "none" | "draw" | "battle" | "result";

type AudioContextConstructor = typeof AudioContext;

const getAudioContext = (): AudioContextConstructor | undefined => {
  if (typeof window === "undefined") return undefined;
  return window.AudioContext ?? (window as typeof window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
};

class GameAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private effects: GainNode | null = null;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private enabled = true;
  private mode: MusicMode = "none";

  private async ensureContext() {
    const AudioContextClass = getAudioContext();
    if (!AudioContextClass) return null;
    if (!this.context) {
      this.context = new AudioContextClass();
      this.master = this.context.createGain();
      this.music = this.context.createGain();
      this.effects = this.context.createGain();
      this.master.gain.value = 0.58;
      this.music.gain.value = 0.12;
      this.effects.gain.value = 0.34;
      this.music.connect(this.master);
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

  private stopMusicTimer() {
    if (this.musicTimer !== null) window.clearInterval(this.musicTimer);
    this.musicTimer = null;
    this.musicStep = 0;
  }

  private scheduleMusicStep() {
    if (!this.enabled || this.mode === "none" || !this.context || !this.music) return;
    const patterns: Record<Exclude<MusicMode, "none">, number[]> = {
      draw: [220, 277.18, 329.63, 415.3, 329.63, 277.18],
      battle: [110, 164.81, 123.47, 196, 146.83, 220, 164.81, 246.94],
      result: [261.63, 329.63, 392, 523.25, 392, 329.63],
    };
    const pattern = patterns[this.mode];
    const note = pattern[this.musicStep % pattern.length];
    const isBattle = this.mode === "battle";
    this.tone(note, isBattle ? 0.22 : 0.5, 0, isBattle ? 0.095 : 0.075, isBattle ? "sawtooth" : "sine", this.music);
    if (isBattle && this.musicStep % 2 === 0) this.tone(55, 0.14, 0, 0.055, "triangle", this.music);
    this.musicStep += 1;
  }

  private startMusicTimer() {
    this.stopMusicTimer();
    if (!this.enabled || this.mode === "none") return;
    this.scheduleMusicStep();
    const interval = this.mode === "battle" ? 310 : this.mode === "draw" ? 560 : 680;
    this.musicTimer = window.setInterval(() => this.scheduleMusicStep(), interval);
  }

  async setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.stopMusicTimer();
      if (this.context && this.master) this.master.gain.setTargetAtTime(0.0001, this.context.currentTime, 0.025);
      return;
    }
    const context = await this.ensureContext();
    if (!context || !this.master) return;
    this.master.gain.setTargetAtTime(0.58, context.currentTime, 0.03);
    this.startMusicTimer();
    this.playSelect();
  }

  async setMode(mode: MusicMode) {
    this.mode = mode;
    if (!this.enabled) return;
    const context = await this.ensureContext();
    if (!context) return;
    this.startMusicTimer();
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
    this.stopMusicTimer();
  }
}

export const gameAudio = new GameAudio();
