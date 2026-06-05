import { NextRequest, NextResponse } from "next/server";

import { prompts } from "@/prompts";
import { buildWorkflowUserPrompt } from "@/prompts/generative";

export const runtime = "nodejs";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_OPENAI_MODEL = "gpt-4o";
const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";
const GEMINI_FALLBACK_MODELS = ["gemini-2.5-flash-lite", "gemini-2.5-flash"];

type WorkflowPayload = {
  selectedPageType?: string;
  currentHTML?: string;
  styleGuide?: unknown;
  moodboardImages?: string[];
  prompt?: string;
};

type WorkflowResult = {
  ok: true;
  title: string;
  prompt: string;
  html: string;
  stylesheet: string;
  code: string;
  sections: Array<{ label: string; tone: string }>;
  fallback?: boolean;
  providerError?: string;
};

function stripMarkdownFences(value: string) {
  return value
    .trim()
    .replace(/^```(?:html)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function removeUnsafeMarkup(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
}

function extractStylesheet(value: string) {
  return [...value.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((match) => match[1].trim())
    .filter(Boolean)
    .join("\n\n");
}

function withoutStyleTags(value: string) {
  return value.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").trim();
}

function parseStyleGuideInput(styleGuide: unknown) {
  if (typeof styleGuide !== "string") return styleGuide;

  try {
    return JSON.parse(styleGuide) as unknown;
  } catch {
    return styleGuide;
  }
}

function geminiModelChain() {
  const configured = (process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL)
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);

  return Array.from(new Set([...configured, ...GEMINI_FALLBACK_MODELS]));
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
    ? parts.map((part) => (part && typeof part === "object" && typeof (part as Record<string, unknown>).text === "string" ? (part as Record<string, string>).text : "")).join("\n")
    : "";
}

function normalizeWorkflowOutput(rawOutput: string, pageType: string, prompt: string): WorkflowResult {
  const cleaned = removeUnsafeMarkup(stripMarkdownFences(rawOutput));
  const stylesheet = extractStylesheet(cleaned);
  let html = withoutStyleTags(cleaned);

  if (!/<div\s+data-generated-ui/i.test(html)) {
    html = `<div data-generated-ui>\n${html}\n</div>`;
  }

  return {
    ok: true,
    title: `${pageType} workflow`,
    prompt,
    html,
    stylesheet,
    code: `<style>\n${stylesheet}\n</style>\n${html}`,
    sections: [
      { label: "Workflow", tone: pageType },
      { label: "Source", tone: "Generated from selected UI" },
      { label: "Style", tone: "Matched to current design system" },
    ],
  };
}

function fallbackWorkflow(pageType: string, prompt: string, providerError?: string): WorkflowResult {
  const title = `${pageType} workflow`;
  const stylesheet = `
[data-generated-ui] {
  width: 100%;
  min-height: 100%;
  background: #0b0d10;
  color: #f8fafc;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}
[data-generated-ui] .workflow-shell {
  min-height: 100%;
  padding: 32px;
  background: linear-gradient(135deg, #0b0d10, #181b20);
}
[data-generated-ui] .workflow-card {
  max-width: 820px;
  border: 1px solid #343a46;
  border-radius: 16px;
  background: #181b20;
  padding: 28px;
}
[data-generated-ui] .workflow-eyebrow {
  margin: 0 0 12px;
  color: #9db7ff;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}
[data-generated-ui] h1 {
  margin: 0;
  font-size: 38px;
  line-height: 1;
}
[data-generated-ui] p {
  color: #aeb6c5;
  line-height: 1.6;
}
`.trim();
  const html = `<div data-generated-ui><main class="workflow-shell"><section class="workflow-card"><p class="workflow-eyebrow">S2C Workflow</p><h1>${title}</h1><p>${providerError || "Generated fallback workflow page."}</p></section></main></div>`;

  return {
    ok: true,
    title,
    prompt,
    html,
    stylesheet,
    code: `<style>\n${stylesheet}\n</style>\n${html}`,
    sections: [
      { label: "Workflow", tone: pageType },
      { label: "Status", tone: providerError ? "Fallback" : "Ready" },
      { label: "Provider", tone: providerError || "Local fallback" },
    ],
    fallback: true,
    providerError,
  };
}

async function generateWithGemini(userPrompt: string, pageType: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fallbackWorkflow(pageType, userPrompt, "GEMINI_API_KEY is not configured");

  let lastMessage = "Gemini returned no HTML";

  for (const model of geminiModelChain()) {
    const response = await fetch(`${GEMINI_API_BASE_URL}/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${prompts.generativeUi.system}\n\n${userPrompt}` }],
          },
        ],
        generationConfig: { temperature: 0.35 },
      }),
    });

    const data = (await response.json()) as unknown;
    if (!response.ok) {
      lastMessage = data && typeof data === "object" && "error" in data ? JSON.stringify((data as { error: unknown }).error) : response.statusText;
      continue;
    }

    const text = extractGeminiText(data);
    if (text) return normalizeWorkflowOutput(text, pageType, userPrompt);
    lastMessage = `${model} returned no HTML`;
  }

  return fallbackWorkflow(pageType, userPrompt, lastMessage);
}

async function generateWithOpenAI(userPrompt: string, pageType: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return fallbackWorkflow(pageType, userPrompt, "OPENAI_API_KEY is not configured");

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
      input: [
        { role: "system", content: prompts.generativeUi.system },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  const data = (await response.json()) as unknown;
  if (!response.ok) {
    const message = data && typeof data === "object" && "error" in data ? JSON.stringify((data as { error: unknown }).error) : response.statusText;
    return fallbackWorkflow(pageType, userPrompt, message);
  }

  const text = extractOpenAIText(data);
  return text ? normalizeWorkflowOutput(text, pageType, userPrompt) : fallbackWorkflow(pageType, userPrompt, "OpenAI returned no HTML");
}

export async function POST(request: NextRequest) {
  let payload: WorkflowPayload;

  try {
    payload = (await request.json()) as WorkflowPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const selectedPageType = payload.selectedPageType?.trim() || "Details";
  const currentHTML = payload.currentHTML?.trim();

  if (!currentHTML) {
    return NextResponse.json({ error: "A selected generated UI preview is required" }, { status: 400 });
  }

  const userPrompt = `${buildWorkflowUserPrompt({
    selectedPageType,
    currentHTML,
    styleGuide: parseStyleGuideInput(payload.styleGuide),
    imageCount: payload.moodboardImages?.length ?? 0,
  })}

Additional user direction:
${payload.prompt?.trim() || "Create the next practical workflow screen for this product."}

Workflow behavior:
- This page is one screen in a connected product flow derived from the selected generated UI.
- Preserve the product name, page category, palette, typography, and navigation/header treatment from the source HTML.
- Make the page type obvious: ${selectedPageType}.
- Do not create a generic dashboard unless the requested workflow type is Dashboard.
- Use realistic controls and states for the page type while keeping the same visual system.

Return only complete HTML wrapped in <div data-generated-ui>, with scoped CSS in a <style> tag.`;

  const provider = (process.env.AI_PROVIDER || "").toLowerCase();
  const result = provider === "gemini" ? await generateWithGemini(userPrompt, selectedPageType) : await generateWithOpenAI(userPrompt, selectedPageType);

  return NextResponse.json(result);
}
