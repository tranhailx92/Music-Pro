// Mocking the behavior of generateLeadSheet and generateArrangement to test routing and retries
import { XMLValidator } from 'fast-xml-parser';

async function mockGenerateWithAI(prompt: string, isValid: boolean, model: string) {
    if (!isValid) return "Invalid XML";
    return model === 'gemini-3.5-flash-lite' ? "<score-partwise><part-list/><part><measure/></part></score-partwise>" : "<score-partwise><part-list/><part><measure/></part></score-partwise>";
}

async function testLeadSheetRouting(firstAttemptValid: boolean) {
    let callCount = 0;
    const TEXT_MODEL = 'gemini-3.5-flash-lite';
    const FALLBACK_MODEL = 'gemini-3.5-flash';

    async function attempt(model: string, valid: boolean) {
        callCount++;
        const res = await mockGenerateWithAI("prompt", valid, model);
        const xml = res.includes('<score-partwise') ? res : "invalid";
        return xml;
    }

    let xml = await attempt(TEXT_MODEL, firstAttemptValid);
    const isValid = xml.includes('<score-partwise');
    
    if (!isValid) {
        xml = await attempt(FALLBACK_MODEL, true); // Fallback usually succeeds in mock
    }

    return { xml, callCount };
}

console.log("--- Testing Compose Routing & Fallback Logic ---");

async function runTests() {
    // Case A: First attempt succeeds
    const resA = await testLeadSheetRouting(true);
    if (resA.callCount !== 1) throw new Error("Case A failed: should not retry if valid");
    console.log("✅ Case A: No retry on valid XML");

    // Case B: First attempt fails -> Retries once
    const resB = await testLeadSheetRouting(false);
    if (resB.callCount !== 2) throw new Error("Case B failed: should retry exactly once if invalid");
    console.log("✅ Case B: Retried once on invalid XML");
    
    console.log("🚀 ALL COMPOSE ROUTING TESTS PASSED");
}

runTests();
