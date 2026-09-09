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
  const envDir = process.env.PROJECTMUSIC_DIR;
  if (envDir && fs.existsSync(path.join(envDir, "catalog.yml"))) {
    return envDir;
  }
  
  const possiblePaths = [
    path.join(process.cwd(), "docs/m-guide"),
    path.join(process.cwd(), "dist/docs/m-guide"),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(path.join(p, "catalog.yml"))) return p;
  }
  
  // Last resort: default dev path if exists, or just return path to prevent crash until first access
  return path.join(process.cwd(), "docs/m-guide");
};

const BASE_DIR = resolveKnowledgeDir();

export function getCatalog(): Catalog {
  const catalogPath = path.join(BASE_DIR, "catalog.yml");
  if (!fs.existsSync(catalogPath)) {
    throw new Error(`Catalog not found at ${catalogPath}. Check docs/m-guide presence.`);
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
  // Prevent arbitrary path access
  const normalizedPath = path.normalize(docPath).replace(/^(\.\.(\/|\\|$))+/, '');
  const relativePath = normalizedPath.startsWith("docs/m-guide/") 
    ? normalizedPath.replace("docs/m-guide/", "") 
    : normalizedPath;
    
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
  if (step === 3 || step === 4) coreIds.push("KNOW.MUSICXML.RULES");

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

export function getDocsByRefs(docRefs: string[], step?: number): string {
  const catalog = getCatalog();
  const docs: string[] = [];
  const uniqueRefs = [...new Set(docRefs)];

  for (const id of uniqueRefs) {
    const page = catalog.pages.find(p => p.id === id);
    if (page) {
      // Step validation if provided
      if (step && !page["serves-steps"].includes(step)) {
        console.warn(`Skipping doc ${id} for step ${step}: does not serve this step.`);
        continue;
      }
      try {
        const content = getKnowledgeDoc(page.path);
        docs.push(`--- DOCUMENT: ${page.id} ---\n${content}`);
      } catch (e) {
        console.warn(`Failed to load referenced doc ${id}:`, e);
      }
    } else {
      console.warn(`Skipping unknown doc ID: ${id}`);
    }
  }
  return docs.join("\n\n");
}

export function getCatalogCandidates(step: number) {
  const catalog = getCatalog();
  // Return metadata for Step 2 selection
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

export interface StyleInfo {
  id: string;
  displayName: string;
  content: string;
}

export function getStyleInfo(styleId: string): StyleInfo | null {
  const catalog = getCatalog();
  const page = catalog.pages.find(p => p.id === styleId && p.tags.includes("style"));
  if (!page) return null;

  const content = getKnowledgeDoc(page.path);
  
  // Extract display name from "# Thẻ: Name" or "# Style: Name"
  let displayName = styleId;
  const match = content.match(/^#\s+(?:Thẻ|Style|Card):\s*(.+)$/m);
  if (match) {
    displayName = match[1].trim();
  } else {
    // Fallback: extract from summary "Name: description"
    displayName = page.summary.split(':')[0].trim();
  }

  return {
    id: styleId,
    displayName,
    content
  };
}

export function getStyleCard(styleId: string): string | null {
  const info = getStyleInfo(styleId);
  return info ? info.content : null;
}

// Deprecated
export function getDocsForStep(step: number, docRefs: string[] = []): string {
  return `${getCoreDocsForStep(step)}\n\n${getDocsByRefs(docRefs, step)}`;
}
