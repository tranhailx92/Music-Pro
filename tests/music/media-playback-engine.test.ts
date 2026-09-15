import { HtmlMediaPlaybackEngine, type MediaElementLike } from '../../src/audio/media-playback-engine';
import type { ScoreTimeline } from '../../src/music/score-timeline';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

class FakeMedia implements MediaElementLike {
  currentTime = 0;
  duration = 0;
  paused = true;
  ended = false;
  src = '';
  preload = '';
  playCalls = 0;
  pauseCalls = 0;
  loadCalls = 0;

  async play(): Promise<void> {
    this.playCalls += 1;
    this.paused = false;
    this.ended = false;
  }

  pause(): void {
    this.pauseCalls += 1;
    this.paused = true;
  }

  load(): void {
    this.loadCalls += 1;
  }
}

const timeline: ScoreTimeline = {
  title: 'Demo',
  tempoMap: [{ quarter: 0, bpm: 120 }],
  timeSignatures: [{ quarter: 0, beats: 4, beatType: 4 }],
  measureStarts: [{ measure: 1, quarter: 0 }],
  parts: [],
  totalQuarters: 4,
  totalDurationSeconds: 2,
};

async function main() {
  console.log('--- HTML media playback engine tests ---');
  const media = new FakeMedia();
  let renders = 0;
  const revoked: string[] = [];
  let nextUrl = 1;

  const engine = new HtmlMediaPlaybackEngine({
    createMedia: () => media,
    renderPreview: async () => {
      renders += 1;
      return new Blob(['wav'], { type: 'audio/wav' });
    },
    createObjectURL: () => `blob:test-${nextUrl++}`,
    revokeObjectURL: url => revoked.push(url),
  });

  await engine.load(timeline, 'score-a');
  assert(renders === 1, 'first score load must render one preview blob');
  assert(media.src === 'blob:test-1', 'rendered preview must be attached to HTML media element');
  assert(media.preload === 'auto', 'media element must preload prepared audio');
  assert(engine.duration === 2, 'duration must come from deterministic score timeline');

  await engine.play(0);
  assert(media.playCalls === 1, 'play must use HTMLMediaElement.play()');
  assert(engine.isPlaying, 'engine must report playing when media is not paused');

  await engine.seek(1.25);
  assert(Math.abs(media.currentTime - 1.25) < 1e-9, 'seek must update HTML media currentTime');
  assert(Math.abs(engine.getPosition() - 1.25) < 1e-9, 'position must reflect HTML media currentTime');

  engine.pause();
  assert(media.paused, 'pause must pause HTML media');

  await engine.load(timeline, 'score-a');
  assert(renders === 1, 'loading the same score id must reuse the prepared blob');

  await engine.load(timeline, 'score-b');
  assert(Number(renders) === 2, 'loading a different score must prepare a new blob');
  assert(revoked.includes('blob:test-1'), 'old object URL must be revoked after replacement');

  await engine.play(2);
  assert(media.currentTime === 0, 'playing from end must restart from the beginning');

  engine.stop();
  assert(media.currentTime === 0 && media.paused, 'stop must pause and rewind');

  engine.dispose();
  assert(revoked.includes('blob:test-2'), 'dispose must revoke the active object URL');

  console.log('🚀 HTML MEDIA PLAYBACK ENGINE TESTS PASSED');
}

void main();
