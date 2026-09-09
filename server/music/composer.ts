import { GoogleGenAI, Type, GenerateContentParameters, GenerateContentResponse } from "@google/genai";
import { getForAi, getCoreDocsForStep, getDocsByRefs, getCatalogCandidates, getStyleCard, getCatalog } from "../projectmusic/knowledge";
import { validateLeadSheet, validateArrangement } from "./musicxml-validator";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const TEXT_MODEL = process.env.TEXT_MODEL || 'gemini-3.5-flash-lite';
const FALLBACK_MODEL = process.env.TEXT_FALLBACK_MODEL || 'gemini-3.5-flash';

// Dependency Injection for testing
export type GenerateFn = (params: GenerateContentParameters) => Promise<GenerateContentResponse>;

const defaultGenerate: GenerateFn = (params) => ai.models.generateContent(params);

export interface Step2Result {
  songRequest: any;
  metaPlan: string;
  composePrompt: string;
  arrangePrompt: string;
  docRefs: string[];
  planSummary: string;
  style: {
    id: string;
    displayName: string;
  };
}

export async function prepareComposition(idea: string, styleId: string, generate: GenerateFn = defaultGenerate): Promise<Step2Result> {
  const forAi = getForAi();
  const catalog = getCatalog();
  const styleCard = getStyleCard(styleId);
  const stylePage = catalog.pages.find(p => p.id === styleId);
  const styleDisplayName = stylePage ? stylePage.summary.split(':')[0] : styleId;

  // Step 1: Hiểu ý tưởng -> Meta Plan & Song Request (Structured)
  const step1Docs = getCoreDocsForStep(1);
  const step1System = `${forAi}\n\n${step1Docs}\n\nStyle Context:\n${styleCard || styleId}\n\nYou are an expert music curator. 
Transform the user's idea and style into a structured song request and a meta plan.`;

  const songRequestSchema = {
    type: Type.OBJECT,
    properties: {
      language: { type: Type.STRING },
      concept: { type: Type.STRING },
      emotion: { type: Type.STRING },
      story: { type: Type.STRING },
      genre: { type: Type.STRING },
      songForm: { type: Type.STRING },
      lyricDirection: { type: Type.STRING },
      melodyDirection: { type: Type.STRING },
      rhythmDirection: { type: Type.STRING },
      harmonyDirection: { type: Type.STRING },
      vocalDirection: { type: Type.STRING },
      arrangementDirection: { type: Type.STRING },
      constraints: { type: Type.STRING }
    },
    required: ["concept", "emotion", "genre"]
  };

  const response1 = await generate({
    model: TEXT_MODEL,
    contents: [{ parts: [{ text: `Idea: ${idea}\nStyle: ${styleDisplayName}` }] }],
    config: {
      systemInstruction: step1System,
      temperature: 0.7,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          songRequest: songRequestSchema,
          metaPlan: { type: Type.STRING }
        },
        required: ["songRequest", "metaPlan"]
      }
    }
  });

  const step1Result = JSON.parse(response1.text);

  // Step 2: Select DOC_REFS & Prepare Prompts
  const candidates = getCatalogCandidates(2);
  const step2Docs = getCoreDocsForStep(2);
  const step2System = `${forAi}\n\n${step2Docs}\n\nCatalog Candidates:\n${JSON.stringify(candidates, null, 2)}\n\nYou are a senior music producer.
Based on the Meta Plan, generate specialized prompts and select relevant document IDs (DOC_REFS).
ONLY select IDs from the candidates list. Max 10 refs.`;

  const response2 = await generate({
    model: TEXT_MODEL,
    contents: [{ parts: [{ text: `Meta Plan:\n${step1Result.metaPlan}` }] }],
    config: {
      systemInstruction: step2System,
      temperature: 0.4,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          composePrompt: { type: Type.STRING },
          arrangePrompt: { type: Type.STRING },
          docRefs: { type: Type.ARRAY, items: { type: Type.STRING } },
          planSummary: { type: Type.STRING }
        },
        required: ["composePrompt", "arrangePrompt", "docRefs", "planSummary"]
      }
    }
  });

  const step2Result = JSON.parse(response2.text);
  
  // Validate docRefs
  const validIds = new Set(catalog.pages.map(p => p.id));
  const filteredRefs = (step2Result.docRefs as string[])
    .filter(id => validIds.has(id))
    .slice(0, 12);

  return {
    songRequest: step1Result.songRequest,
    metaPlan: step1Result.metaPlan,
    composePrompt: step2Result.composePrompt,
    arrangePrompt: step2Result.arrangePrompt,
    docRefs: filteredRefs,
    planSummary: step2Result.planSummary,
    style: {
      id: styleId,
      displayName: styleDisplayName
    }
  };
}

export async function generateLeadSheet(
  composePrompt: string, 
  docRefs: string[], 
  metaPlan: string, 
  songRequest: any,
  styleId: string,
  generate: GenerateFn = defaultGenerate
): Promise<string> {
  const forAi = getForAi();
  const step3Core = getCoreDocsForStep(3);
  const step3Refs = getDocsByRefs(docRefs);
  const styleCard = getStyleCard(styleId);
  
  const systemInstruction = `${forAi}\n\n${step3Core}\n\n${step3Refs}\n\nStyle Card:\n${styleCard}\n\nYou are a master composer. 
Create a Lead Sheet (melody, lyrics, chords) in MusicXML 4.0 format.
Follow the rules in KNOW.MUSICXML.RULES.
Output ONLY the MusicXML code.`;

  const prompt = `Meta Plan:\n${metaPlan}\n\nSong Request:\n${JSON.stringify(songRequest, null, 2)}\n\nTask:\n${composePrompt}`;

  async function attempt(model: string): Promise<string> {
    const res = await generate({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        systemInstruction,
        temperature: 0.5,
      }
    });
    
    const text = res.text;
    const xmlMatch = text.match(/<\?xml[\s\S]*?<\/score-partwise>/i) || text.match(/<score-partwise[\s\S]*?<\/score-partwise>/i);
    let xml = xmlMatch ? xmlMatch[0] : text.replace(/```xml/g, '').replace(/```/g, '').trim();
    
    if (xml && !xml.trim().startsWith('<?xml')) {
      xml = `<?xml version="1.0" encoding="UTF-8"?>\n${xml.trim()}`;
    }
    return xml;
  }

  let xml = await attempt(TEXT_MODEL);
  let validation = validateLeadSheet(xml, songRequest);
  
  if (!validation.isValid) {
    console.warn("Lead Sheet Attempt 1 failed validation. Retrying with fallback model...", validation.errors);
    xml = await attempt(FALLBACK_MODEL);
    validation = validateLeadSheet(xml, songRequest);
    if (!validation.isValid) {
      throw new Error(`MUSICXML_INVALID_AFTER_RETRY: ${validation.errors.join(", ")}`);
    }
  }

  return xml;
}

export async function generateArrangement(
  leadSheetXml: string, 
  arrangePrompt: string, 
  docRefs: string[],
  songRequest: any,
  styleId: string,
  generate: GenerateFn = defaultGenerate
): Promise<string> {
  const forAi = getForAi();
  const step4Core = getCoreDocsForStep(4);
  const step4Refs = getDocsByRefs(docRefs);
  const styleCard = getStyleCard(styleId);
  
  const systemInstruction = `${forAi}\n\n${step4Core}\n\n${step4Refs}\n\nStyle Card:\n${styleCard}\n\nYou are a world-class arranger.
Take the provided Lead Sheet (MusicXML) and add a full arrangement.
KEEP lyrics, melodic identity, and harmony intent.
Output ONLY final arranged MusicXML 4.0.`;

  const prompt = `Lead Sheet XML:\n${leadSheetXml}\n\nSong Request:\n${JSON.stringify(songRequest, null, 2)}\n\nTask:\n${arrangePrompt}`;

  async function attempt(model: string): Promise<string> {
    const res = await generate({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        systemInstruction,
        temperature: 0.4,
      }
    });
    
    const text = res.text;
    const xmlMatch = text.match(/<\?xml[\s\S]*?<\/score-partwise>/i) || text.match(/<score-partwise[\s\S]*?<\/score-partwise>/i);
    let xml = xmlMatch ? xmlMatch[0] : text.replace(/```xml/g, '').replace(/```/g, '').trim();
    
    if (xml && !xml.trim().startsWith('<?xml')) {
      xml = `<?xml version="1.0" encoding="UTF-8"?>\n${xml.trim()}`;
    }
    return xml;
  }

  let xml = await attempt(TEXT_MODEL);
  let validation = validateArrangement(xml, leadSheetXml);
  
  if (!validation.isValid) {
    console.warn("Arrangement Attempt 1 failed validation. Retrying with fallback model...", validation.errors);
    xml = await attempt(FALLBACK_MODEL);
    validation = validateArrangement(xml, leadSheetXml);
    if (!validation.isValid) {
      throw new Error(`MUSICXML_INVALID_AFTER_RETRY: ${validation.errors.join(", ")}`);
    }
  }

  return xml;
}
