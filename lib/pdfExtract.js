import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export async function extractPdfText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map(item => item.str).join(" "));
  }
  return pages;
}

// Render only the requested page numbers (1-indexed) to JPEG data URLs.
// Returns Map<pageNum, dataUrl>.
export async function renderSpecificPages(file, pageNums) {
  const nums = [...new Set(pageNums)].filter(n => Number.isInteger(n) && n >= 1);
  if (nums.length === 0) return new Map();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const result = new Map();
  for (const pageNum of nums) {
    if (pageNum > pdf.numPages) continue;
    try {
      const page = await pdf.getPage(pageNum);
      const scale = 0.75;
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
      result.set(pageNum, canvas.toDataURL("image/jpeg", 0.8));
    } catch {
      // skip unrenderable pages
    }
  }
  return result;
}

export function chunkPageTexts(pages, chunkSize = 20) {
  const chunks = [];
  for (let i = 0; i < pages.length; i += chunkSize) {
    const slice = pages.slice(i, i + chunkSize);
    const text = slice
      .map((t, j) => `=== Page ${i + j + 1} ===\n${t}`)
      .join("\n\n");
    chunks.push(text);
  }
  return chunks;
}
