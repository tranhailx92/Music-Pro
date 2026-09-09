import { getCatalog, getForAi, getDocsForStep, getStyleCard } from "../../server/projectmusic/knowledge";

console.log("--- Testing ProjectMusic Knowledge Loader ---");

// Test 1: Load Catalog
const catalog = getCatalog();
if (!catalog || !catalog.pages || catalog.pages.length === 0) {
  throw new Error("Failed to load catalog or catalog is empty");
}
console.log(`✅ Loaded catalog with ${catalog.pages.length} pages`);

// Test 2: Load for-ai.md
const forAi = getForAi();
if (!forAi || !forAi.includes("ProjectMusic00")) {
  throw new Error("for-ai.md content invalid");
}
console.log("✅ Loaded for-ai.md");

// Test 3: getDocsForStep(1)
const step1Docs = getDocsForStep(1);
if (!step1Docs.includes("PIPE.STEP-01") || !step1Docs.includes("META.STANDARDS")) {
  throw new Error("Step 1 docs missing required core docs");
}
console.log("✅ Step 1 docs loaded correctly");

// Test 4: getStyleCard
const styleCard = getStyleCard("STYLE.VN.VPOP-BALLAD");
if (!styleCard || !styleCard.includes("V-Pop Ballad")) {
  throw new Error("Failed to load style card for V-Pop Ballad");
}
console.log("✅ Style card loaded correctly");

// Test 5: unrelated docs
const step3Docs = getDocsForStep(3);
if (step3Docs.includes("--- DOCUMENT: PIPE.STEP-04")) {
  throw new Error("Unrelated step 4 docs leaked into step 3");
}
console.log("✅ Unrelated docs filter working");

console.log("🚀 ALL KNOWLEDGE LOADER TESTS PASSED");
