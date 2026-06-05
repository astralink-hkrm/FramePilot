import { NextRequest, NextResponse } from "next/server";

import { prompts } from "@/prompts";

export const runtime = "nodejs";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-4o";
const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";
const GEMINI_FALLBACK_MODELS = ["gemini-2.5-flash-lite", "gemini-2.5-flash"];

type GenerateStylePayload = {
  projectName?: string;
  images?: string[];
  notes?: string;
};

type StyleGuide = {
  colorSections: Array<{ name: string; value: string; usage: string }>;
  typographySections: Array<{ role: string; family: string; weight: string; size: string; lineHeight: string; usage: string }>;
  notes: string;
};

const fallbackGuide: StyleGuide = {
  colorSections: [
    { name: "Ink", value: "#0B0D10", usage: "Primary app, canvas, and high-focus workspace background" },
    { name: "Panel", value: "#181B20", usage: "Dashboard cards, editor panels, and modal surfaces" },
    { name: "Line", value: "#343A46", usage: "Wireframe strokes, dividers, borders, and selection outlines" },
    { name: "Signal", value: "#9DB7FF", usage: "AI actions, selected states, active tabs, and focus rings" },
    { name: "Soft Text", value: "#AEB6C5", usage: "Secondary labels, metadata, helper copy, and inactive controls" },
  ],
  typographySections: [
    { role: "Display", family: "Inter", weight: "700", size: "40px", lineHeight: "48px", usage: "Project titles and high-emphasis generated screen headings" },
    { role: "Heading", family: "Inter", weight: "600", size: "24px", lineHeight: "32px", usage: "Dashboard sections, editor panels, and modal titles" },
    { role: "Body", family: "Inter", weight: "400", size: "14px", lineHeight: "22px", usage: "Forms, cards, generated UI copy, and everyday product text" },
    { role: "Label", family: "Inter", weight: "500", size: "12px", lineHeight: "16px", usage: "Tool labels, field captions, metadata, and compact controls" },
  ],
  notes: "Generated for a compact AI sketch-to-code workflow: dark, practical, readable, and fast to scan.",
};

function stripMarkdownFences(value: string) {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function validHex(value: unknown) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function cleanGuide(value: unknown): StyleGuide {
  if (!value || typeof value !== "object") return fallbackGuide;
  const record = value as Record<string, unknown>;
  const colorSections = Array.isArray(record.colorSections)
    ? record.colorSections
        .map((item) => {
          const color = item as Record<string, unknown>;
          return {
            name: typeof color.name === "string" && color.name.trim() ? color.name.trim() : "Color",
            value: validHex(color.value) ? String(color.value).toUpperCase() : validHex(color.hexColor) ? String(color.hexColor).toUpperCase() : "#9DB7FF",
            usage: typeof color.usage === "string" && color.usage.trim() ? color.usage.trim() : "Describe where this color belongs",
          };
        })
        .slice(0, 8)
    : fallbackGuide.colorSections;

  const typographySections = Array.isArray(record.typographySections)
    ? record.typographySections
        .map((item) => {
          const type = item as Record<string, unknown>;
          return {
            role: typeof type.role === "string" && type.role.trim() ? type.role.trim() : "Body",
            family: typeof type.family === "string" && type.family.trim() ? type.family.trim() : "Inter",
            weight: typeof type.weight === "string" && type.weight.trim() ? type.weight.trim() : "400",
            size: typeof type.size === "string" && type.size.trim() ? type.size.trim() : "14px",
            lineHeight: typeof type.lineHeight === "string" && type.lineHeight.trim() ? type.lineHeight.trim() : "22px",
            usage: typeof type.usage === "string" && type.usage.trim() ? type.usage.trim() : "Describe where this type style belongs",
          };
        })
        .slice(0, 8)
    : fallbackGuide.typographySections;

  return {
    colorSections: colorSections.length ? colorSections : fallbackGuide.colorSections,
    typographySections: typographySections.length ? typographySections : fallbackGuide.typographySections,
    notes: typeof record.notes === "string" && record.notes.trim() ? record.notes.trim() : fallbackGuide.notes,
  };
}

function geminiModelChain() {
  const configured = (process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL)
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);

  return Array.from(new Set([...configured, ...GEMINI_FALLBACK_MODELS]));
}

function fallbackForPayload(payload: GenerateStylePayload, providerError?: string) {
  const hasImages = Boolean(payload.images?.length);
  return {
    ok: true,
    fallback: true,
    providerError,
    guide: {
      ...fallbackGuide,
      notes: hasImages
        ? "Generated from the current moodboard direction. Keep the system compact, functional, and aligned with the sketch-to-code workflow."
        : "Add moodboard images to generate a more specific design direction.",
    },
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
  const resolved = await Promise.all(imageUrls.filter(usableImageUrl).slice(0, 5).map(imageUrlToDataUrl));
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

async function callGeminiStyleGuide(payload: GenerateStylePayload, imageInputs: string[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const parts = [
    {
      text: `${prompts.styleGuide.system}

Project: ${payload.projectName || "Untitled S2C project"}
Notes: ${payload.notes || "No additional notes."}
Moodboard image count: ${imageInputs.length}

Return JSON only.`,
    },
    ...imageInputs.map(dataUrlToGeminiPart).filter(Boolean),
  ];

  let lastMessage = "Gemini returned no JSON";

  for (const model of geminiModelChain()) {
    const response = await fetch(`${GEMINI_API_BASE_URL}/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.25,
          responseMimeType: "application/json",
        },
      }),
    });

    const data = (await response.json()) as unknown;
    if (!response.ok) {
      lastMessage = data && typeof data === "object" && "error" in data ? JSON.stringify((data as { error: unknown }).error) : response.statusText;
      continue;
    }

    const candidates = data && typeof data === "object" ? (data as Record<string, unknown>).candidates : undefined;
    const candidate = Array.isArray(candidates) ? candidates[0] : undefined;
    const content = candidate && typeof candidate === "object" ? (candidate as Record<string, unknown>).content : undefined;
    const partsOut = content && typeof content === "object" ? (content as Record<string, unknown>).parts : undefined;
    const text = Array.isArray(partsOut)
      ? partsOut.map((part) => (part && typeof part === "object" && typeof (part as Record<string, unknown>).text === "string" ? (part as Record<string, string>).text : "")).join("\n")
      : "";

    if (text.trim()) return cleanGuide(JSON.parse(stripMarkdownFences(text)));
    lastMessage = `${model} returned no JSON`;
  }

  throw new Error(lastMessage);
}

export async function POST(request: NextRequest) {
  let payload: GenerateStylePayload;

  try {
    payload = (await request.json()) as GenerateStylePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  payload = {
    projectName: payload.projectName,
    notes: payload.notes,
    images: (payload.images ?? []).slice(0, 5),
  };

  try {
    const imageInputs = await resolveImageInputs(payload.images);

    if ((process.env.AI_PROVIDER || "").toLowerCase() === "gemini") {
      try {
        const guide = await callGeminiStyleGuide(payload, imageInputs);
        if (guide) return NextResponse.json({ ok: true, guide });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Gemini style guide generation error";
        return NextResponse.json(fallbackForPayload(payload, message));
      }
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json(fallbackForPayload(payload, "OPENAI_API_KEY is not configured"));

    const userInput = {
      projectName: payload.projectName,
      moodboardImages: payload.images,
      imageInputsProvidedToModel: imageInputs.length,
      notes: payload.notes,
      imageInstruction: imageInputs.length
        ? "The attached images are the source of truth. Extract the dominant colors, accent colors, contrast style, spacing density, corner radius, and typography mood from them. If a moodboard shows purple, yellow, white, peach, neon, or another obvious palette, those directions must appear in the returned design tokens. Do not fall back to the generic S2C dark slate palette unless the images actually support it."
        : "No moodboard images were provided, so create a practical starter guide for S2C.",
      outputSchema: {
        colorSections: [{ name: "Background", value: "#0A0A0A", usage: "Where this token is used" }],
        typographySections: [{ role: "Body", family: "Inter", weight: "400", size: "14px", lineHeight: "22px", usage: "Where this style is used" }],
        notes: "One sentence style direction",
      },
      requirements: [
        "Return JSON only, no markdown.",
        "Use the exact field names in outputSchema.",
        "Use Inter unless the moodboard strongly suggests another common web-safe sans serif.",
        "Keep the system practical for a sketch-to-code AI SaaS editor.",
        "Match the visual language of the provided images before matching any default S2C colors.",
        "Use concrete descriptive token names based on the moodboard, not generic names if the image suggests something stronger.",
        "Use valid 6 digit hex colors.",
      ],
    };

    const aiResponse = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
        input: [
          { role: "system", content: prompts.styleGuide.system },
          { role: "user", content: userContentWithImages(JSON.stringify(userInput, null, 2), imageInputs) },
        ],
      }),
    });

    const data = (await aiResponse.json()) as unknown;

    if (!aiResponse.ok) {
      const message = data && typeof data === "object" && "error" in data ? JSON.stringify((data as { error: unknown }).error) : aiResponse.statusText;
      return NextResponse.json(fallbackForPayload(payload, message));
    }

    const outputText = stripMarkdownFences(extractOutputText(data));
    if (!outputText) return NextResponse.json(fallbackForPayload(payload, "Model returned no JSON"));

    const parsed = JSON.parse(outputText) as unknown;
    return NextResponse.json({ ok: true, guide: cleanGuide(parsed) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown style guide generation error";
    return NextResponse.json(fallbackForPayload(payload, message));
  }
}
