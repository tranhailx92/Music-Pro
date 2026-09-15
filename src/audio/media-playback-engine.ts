import type { ScoreTimeline } from '../music/score-timeline';
import { renderTimelineToWavBlob } from './offline-render';

export interface MediaElementLike {
  currentTime: number;
  readonly duration: number;
  readonly paused: boolean;
  readonly ended: boolean;
  src: string;
  preload: string;
  muted?: boolean;
  volume?: number;
  playsInline?: boolean;
  play(): Promise<void>;
  pause(): void;
  load(): void;
}

export interface HtmlMediaPlaybackEngineOptions {
  createMedia?: () => MediaElementLike;
  renderPreview?: (timeline: ScoreTimeline) => Promise<Blob>;
  createObjectURL?: (blob: Blob) => string;
  revokeObjectURL?: (url: string) => void;
}

function clampPosition(seconds: number, duration: number): number {
  if (!Number.isFinite(seconds) || seconds < 0) return 0;
  if (duration <= 0) return 0;
  return Math.min(seconds, duration);
}

/**
 * Reliable score-preview transport backed by an HTMLAudioElement.
 *
 * The score is rendered once to a WAV Blob, then played through the browser's
 * native media pipeline. The renderer now prefers General MIDI SoundFont
 * samples and automatically falls back to the lightweight synth when the
 * sampled bank cannot be loaded.
 */
export class HtmlMediaPlaybackEngine {
  private readonly media: MediaElementLike;
  private readonly renderPreview: (timeline: ScoreTimeline) => Promise<Blob>;
  private readonly createObjectURL: (blob: Blob) => string;
  private readonly revokeObjectURL: (url: string) => void;
  private timeline: ScoreTimeline | null = null;
  private trackId: string | null = null;
  private objectUrl: string | null = null;
  private loadGeneration = 0;

  constructor(options: HtmlMediaPlaybackEngineOptions = {}) {
    this.media = options.createMedia?.() ?? new Audio();
    this.renderPreview = options.renderPreview ?? ((timeline) => renderTimelineToWavBlob(timeline, {
      sampleRate: 32000,
      channels: 2,
      tailSeconds: 0.75,
      quality: 'auto',
    }));
    this.createObjectURL = options.createObjectURL ?? ((blob) => URL.createObjectURL(blob));
    this.revokeObjectURL = options.revokeObjectURL ?? ((url) => URL.revokeObjectURL(url));

    this.media.preload = 'auto';
    if ('muted' in this.media) this.media.muted = false;
    if ('volume' in this.media) this.media.volume = 1;
    if ('playsInline' in this.media) this.media.playsInline = true;
  }

  async load(timeline: ScoreTimeline, trackId: string): Promise<void> {
    if (this.trackId === trackId && this.objectUrl) {
      this.timeline = timeline;
      return;
    }

    const generation = ++this.loadGeneration;
    this.media.pause();
    const blob = await this.renderPreview(timeline);
    if (generation !== this.loadGeneration) return;

    const nextUrl = this.createObjectURL(blob);
    const previousUrl = this.objectUrl;

    this.objectUrl = nextUrl;
    this.timeline = timeline;
    this.trackId = trackId;
    this.media.src = nextUrl;
    this.media.preload = 'auto';
    this.media.currentTime = 0;
    this.media.load();

    if (previousUrl) this.revokeObjectURL(previousUrl);
  }

  get duration(): number {
    return this.timeline?.totalDurationSeconds || 0;
  }

  get isPlaying(): boolean {
    return Boolean(this.objectUrl) && !this.media.paused && !this.media.ended;
  }

  async play(fromSeconds = this.media.currentTime): Promise<void> {
    if (!this.objectUrl || !this.timeline) {
      throw new Error('Bản nhạc chưa được chuẩn bị để phát.');
    }

    const duration = this.duration;
    const requested = clampPosition(fromSeconds, duration);
    const next = duration > 0 && requested >= duration ? 0 : requested;
    if (Math.abs(this.media.currentTime - next) > 0.01) this.media.currentTime = next;
    await this.media.play();
  }

  pause(): void {
    this.media.pause();
  }

  async toggle(): Promise<void> {
    if (this.isPlaying) this.pause();
    else await this.play();
  }

  async seek(seconds: number): Promise<void> {
    if (!this.objectUrl) return;
    this.media.currentTime = clampPosition(seconds, this.duration);
  }

  stop(): void {
    this.media.pause();
    if (this.objectUrl) this.media.currentTime = 0;
  }

  getPosition(): number {
    if (!this.objectUrl) return 0;
    return clampPosition(this.media.currentTime, this.duration);
  }

  dispose(): void {
    this.loadGeneration += 1;
    this.media.pause();
    this.media.currentTime = 0;
    this.media.src = '';
    this.media.load();
    if (this.objectUrl) this.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
    this.timeline = null;
    this.trackId = null;
  }
}
