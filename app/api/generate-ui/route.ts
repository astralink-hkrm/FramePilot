import { NextRequest, NextResponse } from "next/server";

import { prompts } from "@/prompts";
import { buildGenerateUserPrompt } from "@/prompts/generative";

export const runtime = "nodejs";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-4o";
const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";
const GEMINI_FALLBACK_MODELS = ["gemini-2.5-flash-lite", "gemini-2.5-flash"];

type WireframeShape = {
  id?: string;
  type?: string;
  text?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
};

type GeneratePayload = {
  projectName?: string;
  prompt?: string;
  styleGuide?: unknown;
  moodboardImages?: string[];
  frameSnapshotImage?: string;
  frame?: WireframeShape & { frameNumber?: number };
  frameShapes?: WireframeShape[];
  stream?: boolean;
};

type GeneratedUiResult = {
  title: string;
  prompt: string;
  sourceFrameId?: string;
  sourceFrameNumber?: number;
  sections: Array<{ label: string; tone: string }>;
  html: string;
  stylesheet: string;
  code: string;
  fallback?: boolean;
  providerError?: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function stripMarkdownFences(value: string) {
  const trimmed = value.trim();
  return trimmed
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
  const matches = [...value.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)];
  return matches.map((match) => match[1].trim()).filter(Boolean).join("\n\n");
}

function withoutStyleTags(value: string) {
  return value.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").trim();
}

function compactShape(shape: WireframeShape) {
  const base: Record<string, unknown> = {
    id: shape.id,
    type: shape.type,
  };

  if (typeof shape.text === "string") base.text = shape.text;
  if (typeof shape.x === "number") base.x = Math.round(shape.x);
  if (typeof shape.y === "number") base.y = Math.round(shape.y);
  if (typeof shape.w === "number") base.w = Math.round(shape.w);
  if (typeof shape.h === "number") base.h = Math.round(shape.h);
  if (typeof shape.startX === "number") base.startX = Math.round(shape.startX);
  if (typeof shape.startY === "number") base.startY = Math.round(shape.startY);
  if (typeof shape.endX === "number") base.endX = Math.round(shape.endX);
  if (typeof shape.endY === "number") base.endY = Math.round(shape.endY);

  return base;
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
function colorFromGuide(styleGuide: unknown, key: string, fallback: string) {
  const parsedStyleGuide = parseStyleGuideInput(styleGuide);
  if (!parsedStyleGuide || typeof parsedStyleGuide !== "object") return fallback;

  const guide = parsedStyleGuide as Record<string, unknown>;
  const direct = guide[key];
  if (typeof direct === "string" && /^#[0-9a-f]{6}$/i.test(direct)) return direct;

  const sections = guide.colorSections;
  if (!Array.isArray(sections)) return fallback;

  for (const section of sections) {
    if (!section || typeof section !== "object") continue;
    const swatches = (section as Record<string, unknown>).swatches;
    if (!Array.isArray(swatches)) continue;

    for (const swatch of swatches) {
      if (!swatch || typeof swatch !== "object") continue;
      const record = swatch as Record<string, unknown>;
      const name = String(record.name ?? "").toLowerCase().replace(/\s+/g, "");
      const hex = record.hexColor ?? record.hex ?? record.value;
      if (name.includes(key.toLowerCase()) && typeof hex === "string" && /^#[0-9a-f]{6}$/i.test(hex)) {
        return hex;
      }
    }
  }

  return fallback;
}

function textHintsFromShapes(frameShapes: WireframeShape[]) {
  return frameShapes
    .filter((shape) => shape.type === "text" && typeof shape.text === "string")
    .map((shape) => String(shape.text).trim())
    .filter(Boolean)
    .slice(0, 5);
}

function fallbackGeneratedUi(payload: GeneratePayload, providerError?: string): GeneratedUiResult {
  const frameShapes = payload.frameShapes ?? [];
  const textHints = textHintsFromShapes(frameShapes);
  const title = textHints[0] || payload.prompt?.trim() || payload.projectName || `Frame ${payload.frame?.frameNumber ?? 1} concept`;
  const body = textHints[1] || "A focused, production-ready interface generated from your S2C wireframe.";
  const cta = textHints[2] || "Continue";

  const background = colorFromGuide(payload.styleGuide, "background", "#0b0b0b");
  const foreground = colorFromGuide(payload.styleGuide, "foreground", "#f8fafc");
  const card = colorFromGuide(payload.styleGuide, "card", "#161616");
  const primary = colorFromGuide(payload.styleGuide, "primary", "#9dbbff");
  const primaryFg = colorFromGuide(payload.styleGuide, "primaryforeground", "#06111f");
  const muted = colorFromGuide(payload.styleGuide, "muted", "#27272a");
  const mutedFg = colorFromGuide(payload.styleGuide, "mutedforeground", "#a1a1aa");
  const border = colorFromGuide(payload.styleGuide, "border", "#2f3440");

  const sections = [
    { label: "Hero", tone: title },
    { label: "Content", tone: `${frameShapes.length} source layer${frameShapes.length === 1 ? "" : "s"}` },
    { label: "Action", tone: cta },
  ];

  const stylesheet = `
[data-generated-ui] {
  width: 100%;
  min-height: 100%;
  background: ${background};
  color: ${foreground};
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
[data-generated-ui] .s2c-shell {
  min-height: 100%;
  padding: 48px;
  background:
    radial-gradient(circle at 20% 15%, ${primary}24, transparent 28%),
    linear-gradient(135deg, ${background}, ${card});
}
[data-generated-ui] .s2c-card {
  max-width: 960px;
  border: 1px solid ${border};
  border-radius: 18px;
  background: color-mix(in srgb, ${card} 88%, transparent);
  padding: 36px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.34);
}
[data-generated-ui] .s2c-eyebrow {
  margin: 0 0 16px;
  color: ${primary};
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
[data-generated-ui] .s2c-title {
  margin: 0;
  max-width: 760px;
  color: ${foreground};
  font-size: clamp(32px, 5vw, 64px);
  line-height: 0.95;
  letter-spacing: -0.03em;
}
[data-generated-ui] .s2c-copy {
  margin: 18px 0 0;
  max-width: 620px;
  color: ${mutedFg};
  font-size: 18px;
  line-height: 1.65;
}
[data-generated-ui] .s2c-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
}
[data-generated-ui] .s2c-button {
  border: 0;
  border-radius: 12px;
  background: ${primary};
  color: ${primaryFg};
  padding: 12px 18px;
  font-weight: 700;
}
[data-generated-ui] .s2c-secondary {
  border: 1px solid ${border};
  border-radius: 12px;
  background: ${muted};
  color: ${foreground};
  padding: 12px 18px;
  font-weight: 650;
}
[data-generated-ui] .s2c-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 34px;
}
[data-generated-ui] .s2c-tile {
  min-height: 120px;
  border: 1px solid ${border};
  border-radius: 14px;
  background: ${muted};
  padding: 18px;
}
[data-generated-ui] .s2c-tile strong {
  display: block;
  color: ${foreground};
  font-size: 15px;
}
[data-generated-ui] .s2c-tile span {
  display: block;
  margin-top: 8px;
  color: ${mutedFg};
  font-size: 13px;
  line-height: 1.45;
}
@media (max-width: 720px) {
  [data-generated-ui] .s2c-shell { padding: 24px; }
  [data-generated-ui] .s2c-grid { grid-template-columns: 1fr; }
}
`.trim();

  const html = `
<div data-generated-ui>
  <main class="s2c-shell" id="generated-screen">
    <section class="s2c-card" id="hero-section">
      <p class="s2c-eyebrow">S2C Generated UI</p>
      <h1 class="s2c-title">${escapeHtml(title)}</h1>
      <p class="s2c-copy">${escapeHtml(body)}</p>
      <div class="s2c-actions">
        <button class="s2c-button" id="cta-button">${escapeHtml(cta)}</button>
        <button class="s2c-secondary" id="secondary-button">View details</button>
      </div>
      <div class="s2c-grid" id="feature-grid">
        ${sections
          .map(
            (section, index) => `<article class="s2c-tile" id="feature-card-${index + 1}"><strong>${escapeHtml(section.label)}</strong><span>${escapeHtml(section.tone)}</span></article>`
          )
          .join("\n        ")}
      </div>
    </section>
  </main>
</div>
`.trim();

  return {
    title,
    prompt: payload.prompt?.trim() || "Generate a clean S2C interface from this frame.",
    sourceFrameId: payload.frame?.id,
    sourceFrameNumber: payload.frame?.frameNumber,
    sections,
    html,
    stylesheet,
    code: `<style>\n${stylesheet}\n</style>\n${html}`,
    fallback: true,
    providerError,
  };
}

function normalizeGeneratedOutput(rawOutput: string, payload: GeneratePayload): GeneratedUiResult {
  const cleaned = removeUnsafeMarkup(stripMarkdownFences(rawOutput));
  const stylesheet = extractStylesheet(cleaned) || fallbackGeneratedUi(payload).stylesheet;
  let html = withoutStyleTags(cleaned);

  if (!/<div\s+data-generated-ui/i.test(html)) {
    html = `<div data-generated-ui>\n${html}\n</div>`;
  }

  const textHints = textHintsFromShapes(payload.frameShapes ?? []);
  const title = textHints[0] || payload.prompt?.trim() || payload.projectName || "Generated UI";
  const sections = [
    { label: "Source", tone: `Frame ${payload.frame?.frameNumber ?? 1}` },
    { label: "Stylesheet", tone: stylesheet ? "HTML + CSS generated" : "Fallback styles applied" },
    { label: "Layers", tone: `${payload.frameShapes?.length ?? 0} source shapes` },
  ];

  return {
    title,
    prompt: payload.prompt?.trim() || "Generated from S2C frame data.",
    sourceFrameId: payload.frame?.id,
    sourceFrameNumber: payload.frame?.frameNumber,
    sections,
    html,
    stylesheet,
    code: `<style>\n${stylesheet}\n</style>\n${html}`,
  };
}

function extractOutputText(data: unknown) {
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


function usableImageUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:image/");
}

async function imageUrlToDataUrl(imageUrl: string) {
  if (imageUrl.startsWith("data:image/")) return imageUrl;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(imageUrl, { signal: controller.signal });
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") || "image/png";
    if (!contentType.startsWith("image/")) return null;

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength > 7_000_000) return null;

    return `data:${contentType};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveImageInputs(imageUrls: string[] = []) {
  const resolved = await Promise.all(imageUrls.filter(usableImageUrl).slice(0, 8).map(imageUrlToDataUrl));
  return resolved.filter((value): value is string => Boolean(value));
}

function userContentWithImages(userPrompt: string, imageUrls: string[] = []) {
  const content: Array<{ type: "input_text"; text: string } | { type: "input_image"; image_url: string }> = [
    { type: "input_text", text: userPrompt },
  ];

  imageUrls.filter(usableImageUrl).slice(0, 8).forEach((imageUrl) => {
    content.push({ type: "input_image", image_url: imageUrl });
  });

  return content;
}

function dataUrlToGeminiPart(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;

  return {
    inlineData: {
      mimeType: match[1],
      data: match[2],
    },
  };
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

async function generateWithGemini(payload: GeneratePayload, userPrompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fallbackGeneratedUi(payload, "GEMINI_API_KEY is not configured");

  const imageInputs = await resolveImageInputs([payload.frameSnapshotImage, ...(payload.moodboardImages ?? [])].filter((image): image is string => Boolean(image)));
  const parts = [
    {
      text: `${prompts.generativeUi.system}

${userPrompt}`,
    },
    ...imageInputs.map(dataUrlToGeminiPart).filter(Boolean),
  ];

  let lastMessage = "Gemini returned no HTML";

  for (const model of geminiModelChain()) {
    const response = await fetch(`${GEMINI_API_BASE_URL}/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.35,
        },
      }),
    });

    const data = (await response.json()) as unknown;
    if (!response.ok) {
      lastMessage = data && typeof data === "object" && "error" in data ? JSON.stringify((data as { error: unknown }).error) : response.statusText;
      continue;
    }

    const outputText = extractGeminiText(data);
    if (outputText) return normalizeGeneratedOutput(outputText, payload);
    lastMessage = `${model} returned no HTML`;
  }

  return fallbackGeneratedUi(payload, lastMessage);
}

function sse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function streamFinal(result: GeneratedUiResult) {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(sse("done", { ok: true, ...result })));
        controller.close();
      },
    }),
    {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    }
  );
}

async function streamOpenAIResponse(payload: GeneratePayload, userPrompt: string, apiKey: string) {
  const encoder = new TextEncoder();
  const imageInputs = await resolveImageInputs([payload.frameSnapshotImage, ...(payload.moodboardImages ?? [])].filter((image): image is string => Boolean(image)));
  const aiResponse = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
      stream: true,
      input: [
        { role: "system", content: prompts.generativeUi.system },
        { role: "user", content: userContentWithImages(userPrompt, imageInputs) },
      ],
    }),
  });

  if (!aiResponse.ok || !aiResponse.body) {
    let message = aiResponse.statusText;
    try {
      const data = (await aiResponse.json()) as unknown;
      message = data && typeof data === "object" && "error" in data ? JSON.stringify((data as { error: unknown }).error) : message;
    } catch {}
    return streamFinal(fallbackGeneratedUi(payload, message));
  }

  return new Response(
    new ReadableStream({
      async start(controller) {
        const reader = aiResponse.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let outputText = "";

        const emitDelta = (delta: string) => {
          if (!delta) return;
          outputText += delta;
          controller.enqueue(encoder.encode(sse("delta", { delta })));
        };

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const chunks = buffer.split("\n\n");
            buffer = chunks.pop() ?? "";

            for (const chunk of chunks) {
              const dataLine = chunk
                .split("\n")
                .find((line) => line.startsWith("data: "));
              if (!dataLine) continue;

              const dataText = dataLine.slice(6).trim();
              if (!dataText || dataText === "[DONE]") continue;

              try {
                const event = JSON.parse(dataText) as Record<string, unknown>;
                if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
                  emitDelta(event.delta);
                }
              } catch {}
            }
          }

          const final = outputText ? normalizeGeneratedOutput(outputText, payload) : fallbackGeneratedUi(payload, "Model returned no streamed HTML");
          controller.enqueue(encoder.encode(sse("done", { ok: true, ...final })));
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown streaming error";
          controller.enqueue(encoder.encode(sse("done", { ok: true, ...fallbackGeneratedUi(payload, message) })));
        } finally {
          controller.close();
        }
      },
    }),
    {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    }
  );
}
export async function POST(request: NextRequest) {
  let payload: GeneratePayload;

  try {
    payload = (await request.json()) as GeneratePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (!payload.frame) {
    return NextResponse.json({ error: "A source frame is required" }, { status: 400 });
  }

  payload = {
    ...payload,
    frame: compactShape(payload.frame) as GeneratePayload["frame"],
    frameShapes: (payload.frameShapes ?? []).slice(0, 80).map(compactShape),
    styleGuide: parseStyleGuideInput(payload.styleGuide),
    moodboardImages: (payload.moodboardImages ?? []).slice(0, 6),
    frameSnapshotImage: payload.frameSnapshotImage && usableImageUrl(payload.frameSnapshotImage) ? payload.frameSnapshotImage : undefined,
  };

  const userPrompt = buildGenerateUserPrompt({
    projectName: payload.projectName,
    userPrompt: payload.prompt,
    styleGuide: payload.styleGuide,
    imageCount: payload.moodboardImages?.length ?? 0,
    frameSnapshotAvailable: Boolean(payload.frameSnapshotImage),
    frame: payload.frame,
    frameShapes: payload.frameShapes,
  });

  if ((process.env.AI_PROVIDER || "").toLowerCase() === "gemini") {
    const result = await generateWithGemini(payload, userPrompt);
    return payload.stream ? streamFinal(result) : NextResponse.json({ ok: true, ...result });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const fallback = fallbackGeneratedUi(payload, "OPENAI_API_KEY is not configured");
    return payload.stream ? streamFinal(fallback) : NextResponse.json({ ok: true, ...fallback });
  }

  if (payload.stream) {
    return await streamOpenAIResponse(payload, userPrompt, apiKey);
  }

  try {
    const imageInputs = await resolveImageInputs([payload.frameSnapshotImage, ...(payload.moodboardImages ?? [])].filter((image): image is string => Boolean(image)));

    const aiResponse = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
        input: [
          { role: "system", content: prompts.generativeUi.system },
          { role: "user", content: userContentWithImages(userPrompt, imageInputs) },
        ],
      }),
    });

    const data = (await aiResponse.json()) as unknown;

    if (!aiResponse.ok) {
      const message = data && typeof data === "object" && "error" in data ? JSON.stringify((data as { error: unknown }).error) : aiResponse.statusText;
      return NextResponse.json({ ok: true, ...fallbackGeneratedUi(payload, message) });
    }

    const outputText = extractOutputText(data);
    if (!outputText) {
      return NextResponse.json({ ok: true, ...fallbackGeneratedUi(payload, "Model returned no HTML") });
    }

    return NextResponse.json({ ok: true, ...normalizeGeneratedOutput(outputText, payload) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown generation error";
    return NextResponse.json({ ok: true, ...fallbackGeneratedUi(payload, message) });
  }
}
