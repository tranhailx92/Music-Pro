import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { extractSongDNA } from "./server/music/song-dna";
import { buildProductionBlueprint } from "./server/music/production-blueprint";
import { buildGeminiMusicBrief, buildLyriaPrompt } from "./server/music/gemini-music-brief";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for large XML files
  app.use(express.json({ limit: '10mb' }));

  // --- API Routes ---
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "ProjectMusic00 API is running." });
  });

  app.get("/api/music/capabilities", (req, res) => {
    res.json({
      lyriaEnabled: process.env.LYRIA_ENABLED === 'true',
      textModel: process.env.TEXT_MODEL || 'gemini-3.5-flash-lite'
    });
  });

  app.post("/api/music/blueprint", (req, res) => {
    try {
      const { musicXml, style, language, mood, genre, sourceRunId, lyrics, arrangementNotes, idea } = req.body;
      
      if (!musicXml || typeof musicXml !== 'string') {
        return res.status(400).json({ error: { code: 'MISSING_SCORE', message: "Missing or invalid musicXml" } });
      }

      const songDNA = extractSongDNA(musicXml, sourceRunId);
      const blueprint = buildProductionBlueprint(songDNA, { style, language, mood, genre, lyrics, arrangementNotes, idea });
      const geminiBrief = buildGeminiMusicBrief(blueprint);
      const lyriaPromptPreview = buildLyriaPrompt(blueprint);

      res.json({
        songDNA,
        blueprint,
        geminiBrief,
        lyriaPromptPreview
      });
    } catch (error: any) {
      console.error("Blueprint generation error:", error);
      const code = error.code || 'BLUEPRINT_FAILED';
      res.status(400).json({ error: { code, message: error.message || "Failed to parse MusicXML and generate blueprint" } });
    }
  });

  app.post("/api/music/generate-audio", async (req, res) => {
    try {
      if (process.env.LYRIA_ENABLED !== 'true') {
        return res.status(503).json({
          error: {
            code: "LYRIA_DISABLED",
            message: "Tính năng tạo bản thu AI chưa được bật trong môi trường này."
          }
        });
      }

      const { musicXml, lyrics, idea, style, mood, genre, arrangementNotes, sourceRunId } = req.body;
      
      if (!musicXml || typeof musicXml !== 'string') {
        return res.status(400).json({ error: { code: 'MISSING_SCORE', message: "Missing or invalid musicXml" } });
      }

      const songDNA = extractSongDNA(musicXml, sourceRunId);
      const blueprint = buildProductionBlueprint(songDNA, { style, mood, genre, lyrics, arrangementNotes, idea });
      const lyriaPrompt = buildLyriaPrompt(blueprint);

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: { code: "LYRIA_API_ERROR", message: "API Key is not configured." } });
      }

      const client = new GoogleGenAI({ apiKey });
      const model = process.env.LYRIA_MODEL || 'lyria-3.5';
      
      const interaction = await client.interactions.create({
        model,
        input: lyriaPrompt
      });

      if (!interaction.output_audio) {
        return res.status(500).json({ error: { code: "LYRIA_NO_AUDIO", message: "Lyria API returned no audio." } });
      }

      res.json({
        audioBase64: interaction.output_audio,
        mimeType: "audio/mpeg",
        generatedText: interaction.output_text,
        model
      });
    } catch (error: any) {
      console.error("Lyria generation error:", error);
      const code = error.code || 'LYRIA_API_ERROR';
      res.status(500).json({ error: { code, message: error.message || "Failed to generate audio" } });
    }
  });

  app.post("/api/generate", async (req, res) => {
    try {
      const { prompt, systemInstruction, temperature = 0.7, useFallbackModel } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      
      let modelName = process.env.TEXT_MODEL || 'gemini-3.5-flash-lite';
      if (useFallbackModel) {
        modelName = process.env.TEXT_FALLBACK_MODEL || 'gemini-3.5-flash';
      }

      if (!apiKey) {
        return res.status(500).json({ error: "API Key is not configured." });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          systemInstruction,
          temperature
        }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate content" });
    }
  });
  // ------------------

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static file serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
