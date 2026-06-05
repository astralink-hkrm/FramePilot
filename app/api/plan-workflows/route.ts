import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_OPENAI_MODEL = "gpt-4o";
const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";
const GEMINI_FALLBACK_MODELS = ["gemini-2.5-flash-lite", "gemini-2.5-flash"];
const DEFAULT_WORKFLOW_PAGE_TYPES = [
  "Analytics Dashboard",
  "Account Settings",
  "User Profile",
  "Workflow Automations",
];

type PlanPayload = {
  projectName?: string;
  currentHTML?: string;
  styleGuide?: unknown;
  prompt?: string;
};

function stripMarkdownFences(value: string) {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function extractOpenAIText(data: unknown) {
  if (!data || typeof data !== "object") return "";
  const record = data as Record<string, unknown>;
  if (typeof record.output_text === "string") return record.output_text;

  const output = record.output;
  if (!Array.isArray(output)) return "";

  return output
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const content = (item as Record<string, unknown>).content;
      return Array.isArray(content) ? content : [];
    })
    .map((part) => {
      if (!part || typeof part !== "object") return "";
      const recordPart = part as Record<string, unknown>;
      if (typeof recordPart.text === "string") return recordPart.text;
      if (typeof recordPart.content === "string") return recordPart.content;
      return "";
    })
    .join("\n")
    .trim();
}

function extractGeminiText(data: unknown) {
  const candidates = data && typeof data === "object" ? (data as Record<string, unknown>).candidates : undefined;
  const candidate = Array.isArray(candidates) ? candidates[0] : undefined;
  const content = candidate && typeof candidate === "object" ? (candidate as Record<string, unknown>).content : undefined;
  const parts = content && typeof content === "object" ? (content as Record<string, unknown>).parts : undefined;

  return Array.isArray(parts)
    ? parts
        .map((part) =>
          part && typeof part === "object" && typeof (part as Record<string, unknown>).text === "string"
            ? (part as Record<string, string>).text
            : ""
        )
        .join("\n")
    : "";
}

function parsePageTypes(rawOutput: string) {
  const cleaned = stripMarkdownFences(rawOutput);

  try {
    const parsed = JSON.parse(cleaned) as unknown;
    const pageTypes = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>).pageTypes : undefined;
    return cleanPageTypes(pageTypes);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return [];

    try {
      const parsed = JSON.parse(match[0]) as Record<string, unknown>;
      return cleanPageTypes(parsed.pageTypes);
    } catch {
      return [];
    }
  }
}

function cleanPageTypes(value: unknown) {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const cleaned: string[] = [];

  for (const item of value) {
    if (typeof item !== "string") continue;
    const pageType = item.trim().replace(/\s+/g, " ").slice(0, 48);
    if (!pageType || seen.has(pageType.toLowerCase())) continue;
    seen.add(pageType.toLowerCase());
    cleaned.push(pageType);
    if (cleaned.length === 4) break;
  }

  return cleaned;
}

function buildPlanPrompt(payload: PlanPayload) {
  return `You are the workflow planner for S2C, an AI sketch-to-code product.

Analyze the selected generated UI and choose the next 3-4 screens this product actually needs. These names will become AI generation targets, so they must be concrete page types, not vague labels.

Rules:
- Return JSON only: {"pageTypes":["Page One","Page Two","Page Three","Page Four"]}.
- Prefer 4 pages when there is enough product context.
- Choose screens that fit the selected UI, product category, and user prompt.
- Do not always return the same SaaS defaults.
- If the source is a pricing/subscription/SaaS app, use: Analytics Dashboard, Account Settings, User Profile, Workflow Automations.
- If the source is ecommerce, prefer pages like Product Details, Shopping Cart, Checkout, Order Tracking.
- If the source is a portfolio or agency site, prefer pages like Case Studies, Services, Contact, Project Gallery.
- If the source is a social or community app, prefer pages like Feed, Profile, Messages, Notifications.
- Keep each page type to 2-3 words when possible.

Project name:
${payload.projectName || "Untitled project"}

User direction:
${payload.prompt || "Infer the natural workflow for this generated UI."}

Style guide:
${JSON.stringify(payload.styleGuide ?? null).slice(0, 4000)}

Selected generated UI HTML:
${(payload.currentHTML || "").slice(0, 12000)}`;
}

function geminiModelChain() {
  const configured = (process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL)
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);

  return Array.from(new Set([...configured, ...GEMINI_FALLBACK_MODELS]));
}

async function planWithGemini(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  let lastMessage = "Gemini returned no workflow plan";

  for (const model of geminiModelChain()) {
    const response = await fetch(`${GEMINI_API_BASE_URL}/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.25, responseMimeType: "application/json" },
      }),
    });

    const data = (await response.json()) as unknown;
    if (!response.ok) {
      lastMessage = data && typeof data === "object" && "error" in data ? JSON.stringify((data as { error: unknown }).error) : response.statusText;
      continue;
    }

    const text = extractGeminiText(data);
    if (text) return text;
    lastMessage = `${model} returned no workflow plan`;
  }

  throw new Error(lastMessage);
}

async function planWithOpenAI(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
      input: [
        {
          role: "system",
          content: "Return JSON only. Pick context-specific workflow pages for a generated UI.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  const data = (await response.json()) as unknown;
  if (!response.ok) {
    const message = data && typeof data === "object" && "error" in data ? JSON.stringify((data as { error: unknown }).error) : response.statusText;
    throw new Error(message);
  }

  return extractOpenAIText(data);
}

export async function POST(request: NextRequest) {
  let payload: PlanPayload;

  try {
    payload = (await request.json()) as PlanPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (!payload.currentHTML?.trim()) {
    return NextResponse.json({ pageTypes: DEFAULT_WORKFLOW_PAGE_TYPES, fallback: true });
  }

  const prompt = buildPlanPrompt(payload);
  const provider = (process.env.AI_PROVIDER || "").toLowerCase();

  try {
    const rawOutput = provider === "gemini" ? await planWithGemini(prompt) : await planWithOpenAI(prompt);
    const pageTypes = parsePageTypes(rawOutput);

    return NextResponse.json({
      pageTypes: pageTypes.length > 0 ? pageTypes : DEFAULT_WORKFLOW_PAGE_TYPES,
      fallback: pageTypes.length === 0,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({
      pageTypes: DEFAULT_WORKFLOW_PAGE_TYPES,
      fallback: true,
      providerError: error instanceof Error ? error.message : "Could not plan workflow pages",
    });
  }
}
