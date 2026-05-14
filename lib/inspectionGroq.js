const APPLIANCE_CATEGORY_MAP = {
  "furnace":               { category: "HVAC",       item: "Furnace" },
  "air handler":           { category: "HVAC",       item: "Furnace / Air Handler" },
  "central air":           { category: "HVAC",       item: "Central Air Conditioner" },
  "air conditioner":       { category: "HVAC",       item: "Central Air Conditioner" },
  "heat pump":             { category: "HVAC",       item: "Heat Pump" },
  "water heater":          { category: "Plumbing",   item: "Water Heater (Tank)" },
  "tankless water heater": { category: "Plumbing",   item: "Water Heater (Tankless)" },
  "sump pump":             { category: "Plumbing",   item: "Sump Pump" },
  "water softener":        { category: "Plumbing",   item: "Water Softener" },
  "electrical panel":      { category: "Electrical", item: "Electrical Panel" },
  "panel":                 { category: "Electrical", item: "Electrical Panel" },
  "generator":             { category: "Electrical", item: "Generator" },
  "refrigerator":          { category: "Appliances", item: "Refrigerator" },
  "dishwasher":            { category: "Appliances", item: "Dishwasher" },
  "washer":                { category: "Appliances", item: "Washer" },
  "dryer":                 { category: "Appliances", item: "Dryer" },
  "range":                 { category: "Appliances", item: "Range" },
  "oven":                  { category: "Appliances", item: "Oven" },
  "microwave":             { category: "Appliances", item: "Microwave" },
  "garage door opener":    { category: "Exterior",   item: "Garage Door Opener" },
};

export function resolveAppliance(appliance) {
  const key = (appliance.item || "").toLowerCase().trim();
  return APPLIANCE_CATEGORY_MAP[key] ?? {
    category: appliance.category || "General",
    item: appliance.item,
  };
}

function buildPrompt(chunkText) {
  return `You are a home inspection data extractor. Analyze the inspection report excerpt below and extract structured data in Foreman's exact field schema.

Each page in the excerpt is labeled "=== Page N ===". For each todo and project, include a "sourcePages" field with the page numbers where that finding is described (e.g. [5] or [5, 6]).

Return ONLY a JSON object with these three arrays (empty array if nothing found):

{
  "appliances": [{
    "item": "appliance/equipment name (e.g. 'Furnace', 'Water Heater (Tank)')",
    "category": "Foreman category (e.g. 'HVAC', 'Plumbing', 'Electrical', 'Appliances')",
    "manufacturer": "string or null",
    "model": "string or null",
    "age": "approximate age or install year (e.g. '~12 years', '2008') or null"
  }],
  "todos": [{
    "title": "concise action title (imperative: 'Replace damaged flashing at chimney')",
    "description": "inspector finding verbatim or paraphrased — full context for the homeowner",
    "priority": "urgent | high | medium | low",
    "status": "not-started",
    "linkedCategory": "Foreman inventory category name or null (e.g. 'HVAC', 'Plumbing', 'Electrical', 'Roof')",
    "linkedItem": "Foreman inventory item name or null (e.g. 'Furnace', 'Water Heater (Tank)')",
    "labels": ["array of relevant tags, e.g. 'Safety', 'Deferred Maintenance', 'Inspector Finding'"],
    "sourcePages": [array of page numbers where this finding is described]
  }],
  "projects": [{
    "name": "project title (e.g. 'Replace Roof', 'Rewire Electrical Panel')",
    "description": "full scope as described by inspector — include location, severity, and any urgency notes",
    "priority": "urgent | high | medium | low",
    "status": "not-started",
    "linkedCategory": "Foreman inventory category name or null",
    "linkedItem": "Foreman inventory item name or null",
    "sourcePages": [array of page numbers where this finding is described]
  }]
}

Priority rules:
- todos: "urgent" = life-safety or structural failure. "high" = deficiency requiring near-term repair. "medium" = monitor or schedule within 1 year. "low" = cosmetic or minor note.
- projects: "urgent" = immediate large-scale work needed. "high" = plan within 6 months. "medium" = within 1-2 years. "low" = long-term improvement.
- projects vs todos: Use "projects" for multi-step or whole-system replacements (e.g. "replace entire roof", "rewire electrical panel", "replace HVAC system"). Use "todos" for single discrete repairs and recommendations.
- Do NOT list the same finding in both todos and projects.
- appliances: include any equipment/system where make, model, or age is mentioned.
- Return ONLY the JSON. No markdown, no explanation.

--- INSPECTION REPORT EXCERPT ---
${chunkText}`;
}

export async function extractChunk(chunkText, apiKey) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  let res;
  try {
    res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      signal: controller.signal,
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: buildPrompt(chunkText) }],
        temperature: 0.2,
        max_tokens: 3000,
      }),
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Groq ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  const raw = data.choices[0].message.content.replace(/```json\n?|\n?```/g, "").trim();
  return JSON.parse(raw);
}

export function mergeResults(results) {
  const merged = { appliances: [], todos: [], projects: [] };
  const seenAppliances = new Set();
  for (const result of results) {
    (result.appliances || []).forEach(a => {
      const key = (a.item || "").toLowerCase().trim();
      if (!seenAppliances.has(key)) {
        seenAppliances.add(key);
        merged.appliances.push(a);
      }
    });
    merged.todos.push(...(result.todos || []));
    merged.projects.push(...(result.projects || []));
  }
  return merged;
}

// Maps sourcePages on each todo/project to stored image IDs from those pages.
// pageImageIds: Map<pageNumber, string[]> — already-stored image IDs per page.
export function associateImages(merged, pageImageIds) {
  function getIdsForItem(item) {
    const pages = Array.isArray(item.sourcePages) ? item.sourcePages : [];
    const ids = [];
    for (const p of pages) {
      const pageIds = pageImageIds.get(p) || [];
      ids.push(...pageIds);
    }
    // deduplicate while preserving order
    return [...new Set(ids)];
  }

  return {
    ...merged,
    todos:    merged.todos.map(t => ({ ...t, images: getIdsForItem(t) })),
    projects: merged.projects.map(p => ({ ...p, images: getIdsForItem(p) })),
  };
}
