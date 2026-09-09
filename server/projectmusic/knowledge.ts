import fs from "fs";
import path from "path";
import * as yaml from "js-yaml";

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

const BASE_DIR = path.join(process.cwd(), "docs/m-guide");

export function getCatalog(): Catalog {
  const catalogPath = path.join(BASE_DIR, "catalog.yml");
  const content = fs.readFileSync(catalogPath, "utf8");
  return yaml.load(content) as Catalog;
}

export function getForAi(): string {
  const forAiPath = path.join(BASE_DIR, "for-ai.md");
  return fs.readFileSync(forAiPath, "utf8");
}

export function getKnowledgeDoc(docPath: string): string {
  // Ensure the path is relative to the repo root as defined in catalog.yml
  // The catalog.yml paths are like "docs/m-guide/meta/purpose.md"
  // But our BASE_DIR is already process.cwd()/docs/m-guide
  // So we need to handle the path carefully.
  
  const relativePath = docPath.startsWith("docs/m-guide/") 
    ? docPath.replace("docs/m-guide/", "") 
    : docPath;
    
  const fullPath = path.join(BASE_DIR, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Knowledge document not found: ${fullPath}`);
  }
  return fs.readFileSync(fullPath, "utf8");
}

export function getDocsForStep(step: number, docRefs: string[] = []): string {
  const catalog = getCatalog();
  const docs: string[] = [];
  
  // Always include meta/standards.md and pipeline/overview.md for context
  const coreDocIds = ["META.STANDARDS", "PIPE.OVERVIEW"];
  
  // Filter pages that serve this step OR are explicitly requested via docRefs
  const pagesToLoad = catalog.pages.filter(p => 
    p["serves-steps"].includes(step) || docRefs.includes(p.id)
  );
  
  // Add step-specific pipeline doc
  const stepPipelineDoc = `PIPE.STEP-0${step}`;
  if (!pagesToLoad.some(p => p.id === stepPipelineDoc)) {
    const pDoc = catalog.pages.find(p => p.id === stepPipelineDoc);
    if (pDoc) pagesToLoad.push(pDoc);
  }

  for (const page of pagesToLoad) {
    try {
      const content = getKnowledgeDoc(page.path);
      docs.push(`--- DOCUMENT: ${page.id} (${page.path}) ---\n${content}\n`);
    } catch (e) {
      console.warn(`Failed to load doc ${page.id}:`, e);
    }
  }
  
  return docs.join("\n\n");
}

export function getStyleCard(styleId: string): string | null {
  const catalog = getCatalog();
  const page = catalog.pages.find(p => p.id === styleId && p.tags.includes("style"));
  if (!page) return null;
  return getKnowledgeDoc(page.path);
}
