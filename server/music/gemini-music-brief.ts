import { ProductionBlueprint } from './types';

export function buildGeminiMusicBrief(blueprint: ProductionBlueprint): string {
  const m = blueprint.musical;
  
  let brief = `Hãy tạo một bản thu âm nhạc (audio) dựa trên bản master MusicXML đã cung cấp. Bản thu AI này là một bản interpretation, nhưng ưu tiên cao nhất là giữ nhận diện của bài hát; không sáng tác thành một bài khác.

THÔNG TIN ÂM NHẠC
- Giọng (Key/Mode): ${m.key || 'Không xác định'} ${m.mode || ''}
- BPM: ${m.tempo || 'Không xác định'}
- Nhịp (Meter): ${m.meter || 'Không xác định'}
- Quãng giọng (Vocal Range): ${m.vocalRange || 'Không xác định'}
- Thời lượng dự kiến: ${m.targetDuration ? Math.round(m.targetDuration) + ' giây' : 'Không xác định'}
- Phong cách: ${blueprint.identity.genre}

CẤU TRÚC BÀI HÁT
${blueprint.structure.map(s => `- ${s.name} (Từ ô nhịp ${s.start} - ${s.end})`).join('\n')}

GIAI ĐIỆU CẦN GIỮ
- Motif mở đầu: ${blueprint.melodyIdentity.mainMotif || 'Không có'}
${blueprint.melodyIdentity.chorusHook ? `- Chorus Hook: ${blueprint.melodyIdentity.chorusHook}` : ''}
- Rhythmic fingerprint (nhịp điệu motif): [${blueprint.melodyIdentity.normalizedRhythm?.join(', ') || ''}]
- Hướng phát triển (Contour): ${blueprint.melodyIdentity.contour || 'Không xác định'}
- Yêu cầu đặc biệt: ${blueprint.melodyIdentity.constraints}

HÒA ÂM (Chord Progression)
${blueprint.harmony.map(h => `- ${h.section}: ${h.progression.join(' | ') || 'Không có'}`).join('\n')}

PHỐI KHÍ
- Nhạc cụ: ${blueprint.arrangement.instruments.join(', ') || 'Tự do'}
${blueprint.arrangement.productionDirection ? `- Ghi chú phối khí: ${blueprint.arrangement.productionDirection}` : ''}

LỜI BÀI HÁT EXACT
${blueprint.lyrics.exactLyrics ? blueprint.lyrics.exactLyrics : '(Không có lời bài hát)'}
`;

  return brief;
}

export function buildLyriaPromptPreview(blueprint: ProductionBlueprint): string {
  const m = blueprint.musical;
  const style = blueprint.identity.genre;
  const tempo = m.tempo ? `${m.tempo} BPM` : 'mid-tempo';
  const key = m.key ? `in ${m.key}` : '';
  const instruments = blueprint.arrangement.instruments.join(', ') || 'standard band';
  const hook = blueprint.melodyIdentity.chorusHook ? `Chorus Hook: ${blueprint.melodyIdentity.chorusHook}.` : '';
  const duration = m.targetDuration ? `Target duration: ~${Math.round(m.targetDuration)}s.` : '';
  
  return `Generate a high-fidelity full audio interpretation in the style of ${style}. ${tempo} ${key}. Instrumentation: ${instruments}. 
Vocal range constraint: ${m.vocalRange || 'standard'}. ${duration}
Structure: ${blueprint.structure.map(s => s.name).join(' -> ')}.
Strictly preserve the following melody opening motif: ${blueprint.melodyIdentity.mainMotif || 'N/A'}. ${hook}
Harmonic progression: ${blueprint.harmony.map(h => `[${h.section}] ${h.progression.join(' ')}`).join(', ') || 'N/A'}.
Lyrics to follow exactly:
${blueprint.lyrics.exactLyrics || '(Instrumental)'}`;
}
