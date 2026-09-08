import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { extractSongDNA } from "./server/music/song-dna";
import { buildProductionBlueprint } from "./server/music/production-blueprint";
import { buildGeminiMusicBrief, buildLyriaPromptPreview } from "./server/music/gemini-music-brief";

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

  app.post("/api/music/blueprint", (req, res) => {
    try {
      const { musicXml, style, language, mood, genre, sourceRunId } = req.body;
      
      if (!musicXml || typeof musicXml !== 'string') {
        return res.status(400).json({ error: "Missing or invalid musicXml" });
      }

      const songDNA = extractSongDNA(musicXml, sourceRunId);
      const blueprint = buildProductionBlueprint(songDNA, { style, language, mood, genre });
      const geminiBrief = buildGeminiMusicBrief(blueprint);
      const lyriaPromptPreview = buildLyriaPromptPreview(blueprint);

      res.json({
        songDNA,
        blueprint,
        geminiBrief,
        lyriaPromptPreview
      });
    } catch (error: any) {
      console.error("Blueprint generation error:", error);
      res.status(400).json({ error: error.message || "Failed to parse MusicXML and generate blueprint" });
    }
  });

  app.post("/api/generate", async (req, res) => {
    try {
      const { prompt, systemInstruction, temperature = 0.7, customApiKey, customModel } = req.body;
      
      const apiKey = customApiKey || process.env.GEMINI_API_KEY;
      const modelName = customModel || 'gemini-3.1-pro-preview';

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
