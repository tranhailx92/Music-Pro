import { ProductionBlueprint } from './types';

export function buildGeminiMusicBrief(blueprint: ProductionBlueprint): string {
  const m = blueprint.musical;
  
  let brief = `Hãy tạo một bản thu hoàn chỉnh dựa trên bản sáng tác đã được xác định dưới đây.
Ưu tiên cao nhất là giữ nhận diện của bài hát; không sáng tác thành một bài khác.

THÔNG TIN ÂM NHẠC
- Giọng: ${m.key || 'Không xác định'} ${m.mode || ''}
- BPM: ${m.tempo || 'Không xác định'}
- Nhịp: ${m.meter || 'Không xác định'}
- Quãng giọng: ${m.vocalRange || 'Không xác định'}
- Phong cách: ${blueprint.identity.genre}
- Cảm xúc: ${blueprint.identity.mood}

GIAI ĐIỆU CẦN GIỮ
- Motif mở đầu: ${blueprint.melodyIdentity.mainMotif || 'Không có'}
- Nốt kết câu (Cadences): ${blueprint.melodyIdentity.cadences || 'Không có'}
- Hướng phát triển (Contour): ${blueprint.melodyIdentity.contour || 'Không xác định'}
- Yêu cầu đặc biệt: ${blueprint.melodyIdentity.constraints}

HÒA ÂM
${blueprint.harmony.map(h => `- ${h.section}: ${h.progression.join(' | ') || 'Không xác định'}`).join('\n')}

PHỐI KHÍ
- Nhạc cụ: ${blueprint.arrangement.instruments.join(', ') || 'Tự do'}
- Chiều hướng năng lượng: ${blueprint.arrangement.energyCurve}

LỜI BÀI HÁT
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
  
  return `Generate a high-fidelity full song in the style of ${style}. ${tempo} ${key}. Instrumentation: ${instruments}. 
Vocal range constraint: ${m.vocalRange || 'standard'}. 
Strictly preserve the following melody opening motif: ${blueprint.melodyIdentity.mainMotif || 'N/A'}. 
Harmonic progression: ${blueprint.harmony[0]?.progression.join(' ') || 'N/A'}.
Lyrics to follow exactly:
${blueprint.lyrics.exactLyrics || '(Instrumental)'}`;
}
