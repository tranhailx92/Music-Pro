import { GoogleGenAI, Type } from "@google/genai";
import { getCatalog, getForAi, getDocsForStep, getStyleCard } from "../projectmusic/knowledge";

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

export interface Step1Result {
  songRequest: any;
  metaPlan: string;
}

export interface Step2Result {
  composePrompt: string;
  arrangePrompt: string;
  docRefs: string[];
  planSummary: string;
}

export async function prepareComposition(idea: string, style: string): Promise<Step2Result> {
  // Step 1: Hiểu ý tưởng -> Meta Plan
  const forAi = getForAi();
  const step1Docs = getDocsForStep(1);
  
  const step1System = `${forAi}\n\n${step1Docs}\n\nYou are an expert music curator. 
Your task is to transform a user's idea and style into a structured song request and a meta plan.
Follow the guidelines in docs/m-guide/pipeline/step-01-meta-prompt.md.`;

  const step1Prompt = `Idea: ${idea}\nStyle: ${style}\n\nCreate a structured meta-plan for this song.`;

  const response1 = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: [{ parts: [{ text: step1Prompt }] }],
    config: {
      systemInstruction: step1System,
      temperature: 0.7,
    }
  });

  const metaPlan = response1.text;

  // Step 2: Prepare prompts and DOC_REFS
  const step2Docs = getDocsForStep(2);
  const step2System = `${forAi}\n\n${step2Docs}\n\nYou are a senior music producer.
Based on the Meta Plan provided, generate specialized prompts for Step 3 (Compose) and Step 4 (Arrange).
You MUST select relevant document IDs (DOC_REFS) from the catalog for each step.`;

  const step2Prompt = `Meta Plan:\n${metaPlan}\n\nGenerate the composition plan using the defined schema.`;

  const response2 = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: [{ parts: [{ text: step2Prompt }] }],
    config: {
      systemInstruction: step2System,
      temperature: 0.4,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          composePrompt: { type: Type.STRING, description: "Detailed prompt for the Lead Sheet step" },
          arrangePrompt: { type: Type.STRING, description: "Detailed prompt for the Arrangement step" },
          docRefs: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "List of Catalog Doc IDs (e.g., KNOW.MELODY.CONTOUR) to be loaded for Step 3 and 4"
          },
          planSummary: { type: Type.STRING, description: "Brief summary of the creative approach" }
        },
        required: ["composePrompt", "arrangePrompt", "docRefs", "planSummary"]
      }
    }
  });

  return JSON.parse(response2.text) as Step2Result;
}

export async function generateLeadSheet(composePrompt: string, docRefs: string[], metaPlan: string): Promise<string> {
  const forAi = getForAi();
  const step3Docs = getDocsForStep(3, docRefs);
  
  const systemInstruction = `${forAi}\n\n${step3Docs}\n\nYou are a master composer. 
Create a Lead Sheet (melody, lyrics, chords) in MusicXML 4.0 format.
Follow the rules in KNOW.MUSICXML.RULES.
Bắt buộc bao gồm piano reduction (piano texture) nghe được, không pad whole-note.
Output ONLY the MusicXML code inside a code block.`;

  const prompt = `Meta Plan Context:\n${metaPlan}\n\nCompose Task:\n${composePrompt}`;

  async function attempt(model: string): Promise<string> {
    const res = await ai.models.generateContent({
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
  
  // Validation
  const isValid = xml.includes('<score-partwise') && xml.includes('</score-partwise>') && xml.includes('<part-list>') && xml.includes('<measure');
  
  if (!isValid) {
    console.warn("Lead Sheet Attempt 1 failed validation. Retrying with fallback model...");
    xml = await attempt(FALLBACK_MODEL);
  }

  return xml;
}

export async function generateArrangement(leadSheetXml: string, arrangePrompt: string, docRefs: string[]): Promise<string> {
  const forAi = getForAi();
  const step4Docs = getDocsForStep(4, docRefs);
  
  const systemInstruction = `${forAi}\n\n${step4Docs}\n\nYou are a world-class arranger.
Take the provided Lead Sheet (MusicXML) and add a full arrangement.
KEEP the lyrics, melodic identity, and harmony intent.
Output ONLY the final arranged MusicXML 4.0 code inside a code block.
Bắt buộc: importer_self_check PASS và piano_texture_check PASS.`;

  const prompt = `Lead Sheet XML:\n${leadSheetXml}\n\nArrangement Task:\n${arrangePrompt}`;

  async function attempt(model: string): Promise<string> {
    const res = await ai.models.generateContent({
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
  
  // Validation
  const isValid = xml.includes('<score-partwise') && xml.includes('</score-partwise>') && xml.includes('<part-list>') && xml.includes('<measure');
  
  if (!isValid) {
    console.warn("Arrangement Attempt 1 failed validation. Retrying with fallback model...");
    xml = await attempt(FALLBACK_MODEL);
  }

  return xml;
}
