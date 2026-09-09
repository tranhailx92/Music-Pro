import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_"
});
const xml = `<harmony><root><root-step>G</root-step></root><kind text="dominant">dominant</kind></harmony>`;
const parsed = parser.parse(xml);
console.log("Parsed harmony:", JSON.stringify(parsed.harmony));
