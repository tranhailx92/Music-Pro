import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as yaml from "js-yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface CatalogPage {
  id: string;
  path: string;
  tags: string[];
  "serves-steps": number[];
  summary: string;
}

export interface Catalog {
  version: string;
  updated: string;
  pages: CatalogPage[];
}

const resolveKnowledgeDir = () => {
  if (process.env.PROJECTMUSIC_DIR) return process.env.PROJECTMUSIC_DIR;
  
  const possiblePaths = [
    path.join(process.cwd(), "docs/m-guide"),
    path.join(process.cwd(), "dist/docs/m-guide"),
    path.join(__dirname, "../docs/m-guide"),
    path.join(__dirname, "../../docs/m-guide")
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(path.join(p, "catalog.yml"))) return p;
  }
  return path.join(process.cwd(), "docs/m-guide");
};

const BASE_DIR = resolveKnowledgeDir();

export function getCatalog(): Catalog {
  const catalogPath = path.join(BASE_DIR, "catalog.yml");
  if (!fs.existsSync(catalogPath)) {
    throw new Error(`Catalog not found at ${catalogPath}`);
  }
  const content = fs.readFileSync(catalogPath, "utf8");
  return yaml.load(content) as Catalog;
}

export function getForAi(): string {
  const forAiPath = path.join(BASE_DIR, "for-ai.md");
  if (!fs.existsSync(forAiPath)) return "";
  return fs.readFileSync(forAiPath, "utf8");
}

export function getKnowledgeDoc(docPath: string): string {
  const relativePath = docPath.startsWith("docs/m-guide/") 
    ? docPath.replace("docs/m-guide/", "") 
    : docPath;
    
  const fullPath = path.join(BASE_DIR, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Knowledge document not found: ${fullPath}`);
  }
  return fs.readFileSync(fullPath, "utf8");
}

export function getCoreDocsForStep(step: number): string {
  const catalog = getCatalog();
  const coreIds = ["META.STANDARDS", "PIPE.OVERVIEW", `PIPE.STEP-0${step}`];
  
  // Specific core docs per step if needed
  if (step === 3) coreIds.push("KNOW.MUSICXML.RULES");
  if (step === 4) coreIds.push("KNOW.MUSICXML.RULES");

  const docs: string[] = [];
  for (const id of coreIds) {
    const page = catalog.pages.find(p => p.id === id);
    if (page) {
      try {
        const content = getKnowledgeDoc(page.path);
        docs.push(`--- DOCUMENT: ${page.id} ---\n${content}`);
      } catch (e) {
        console.warn(`Failed to load core doc ${id}:`, e);
      }
    }
  }
  return docs.join("\n\n");
}

export function getDocsByRefs(docRefs: string[]): string {
  const catalog = getCatalog();
  const docs: string[] = [];
  const uniqueRefs = [...new Set(docRefs)];

  for (const id of uniqueRefs) {
    const page = catalog.pages.find(p => p.id === id);
    if (page) {
      try {
        const content = getKnowledgeDoc(page.path);
        docs.push(`--- DOCUMENT: ${page.id} ---\n${content}`);
      } catch (e) {
        console.warn(`Failed to load referenced doc ${id}:`, e);
      }
    }
  }
  return docs.join("\n\n");
}

export function getCatalogCandidates(step: number) {
  const catalog = getCatalog();
  // Return only metadata for Step 2 selection
  // Filter for relevant steps (usually 3 and 4)
  return catalog.pages
    .filter(p => p["serves-steps"].some(s => s === 3 || s === 4))
    .map(p => ({
      id: p.id,
      tags: p.tags,
      servesSteps: p["serves-steps"],
      summary: p.summary
    }));
}

export function getStyleCard(styleId: string): string | null {
  const catalog = getCatalog();
  const page = catalog.pages.find(p => p.id === styleId && p.tags.includes("style"));
  if (!page) return null;
  return getKnowledgeDoc(page.path);
}

// Deprecated in favor of selective loading
export function getDocsForStep(step: number, docRefs: string[] = []): string {
  return `${getCoreDocsForStep(step)}\n\n${getDocsByRefs(docRefs)}`;
}
