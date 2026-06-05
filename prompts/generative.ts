type StyleColor = {
  name?: string;
  value?: string;
  usage?: string;
  hexColor?: string;
  description?: string;
  swatches?: StyleColor[];
};

type StyleType = {
  role?: string;
  family?: string;
  weight?: string;
  size?: string;
  lineHeight?: string;
  usage?: string;
  name?: string;
  description?: string;
  fontFamily?: string;
  fontWeight?: string;
  fontSize?: string;
  styles?: StyleType[];
};

type GeneratePromptInput = {
  projectName?: string;
  userPrompt?: string;
  styleGuide?: unknown;
  imageCount?: number;
  frameSnapshotAvailable?: boolean;
  frame?: unknown;
  frameShapes?: unknown[];
};

function parseStyleGuideInput(styleGuide: unknown) {
  if (typeof styleGuide !== "string") return styleGuide;

  try {
    return JSON.parse(styleGuide) as unknown;
  } catch {
    return styleGuide;
  }
}

function summarizeWireframeShapes(frameShapes: unknown[] = []) {
  const records = frameShapes.map(asRecord);
  const textLabels = records
    .map((shape) => (typeof shape.text === "string" ? shape.text.trim() : ""))
    .filter(Boolean);
  const types = records.reduce<Record<string, number>>((acc, shape) => {
    const type = typeof shape.type === "string" ? shape.type : "unknown";
    acc[type] = (acc[type] ?? 0) + 1;
    return acc;
  }, {});

  return JSON.stringify({ shapeTypes: types, visibleText: textLabels }, null, 2);
}
function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function flattenColors(styleGuide: unknown) {
  const guide = asRecord(styleGuide);
  const sections = Array.isArray(guide.colorSections) ? guide.colorSections : [];

  return sections
    .flatMap((section) => {
      const color = section as StyleColor;
      return Array.isArray(color.swatches) ? color.swatches : [color];
    })
    .map((color) => {
      const hex = color.value ?? color.hexColor ?? "";
      const usage = color.usage ?? color.description ?? "";
      return `${color.name ?? "Color"}: ${hex}${usage ? `, ${usage}` : ""}`;
    })
    .filter((entry) => !entry.endsWith(": "))
    .join("\n");
}

function flattenTypography(styleGuide: unknown) {
  const guide = asRecord(styleGuide);
  const sections = Array.isArray(guide.typographySections) ? guide.typographySections : [];

  return sections
    .flatMap((section) => {
      const type = section as StyleType;
      return Array.isArray(type.styles) ? type.styles : [type];
    })
    .map((type) => {
      const role = type.role ?? type.name ?? "Typography";
      const family = type.family ?? type.fontFamily ?? "Inter";
      const weight = type.weight ?? type.fontWeight ?? "400";
      const size = type.size ?? type.fontSize ?? "14px";
      const lineHeight = type.lineHeight ?? "22px";
      const usage = type.usage ?? type.description ?? "";
      return `${role}: ${family}, ${weight}, ${size}, ${lineHeight}${usage ? `, ${usage}` : ""}`;
    })
    .join("\n");
}

export function buildStyleGuideUserPrompt(imageCount: number) {
  return `Analyze these ${imageCount} mood board images and generate a design system.
Extract colors that work harmoniously together and create typography that matches the aesthetic.
Return ONLY the JSON object matching the requested schema.`;
}

export function buildGenerateUserPrompt(input: GeneratePromptInput) {
  const parsedStyleGuide = parseStyleGuideInput(input.styleGuide);
  const colors = flattenColors(parsedStyleGuide);
  const typography = flattenTypography(parsedStyleGuide);

  return `You are generating the final UI for a selected S2C wireframe frame. The selected frame is the layout blueprint. The style guide and attached inspiration images are the visual source of truth. Preserve the frame intent, hierarchy, visible labels, card count, pricing/content structure, and relative placement. Map the style guide colors, typography scale, spacing, and radii directly into the returned HTML/CSS. If inspiration images are attached, match their palette, density, surfaces, button style, and product category before any generic S2C defaults. Enforce WCAG AA contrast. Never invent unrelated visual language; stay consistent with S2C as a practical AI sketch-to-code SaaS.

User request:
${input.userPrompt?.trim() || "Generate a clean, production-ready UI from this frame."}

Project:
${input.projectName || "Untitled S2C project"}

Frame snapshot image attached: ${input.frameSnapshotAvailable ? "yes - treat this as the primary visual blueprint" : "no"}

Wireframe frame JSON:
${JSON.stringify(input.frame ?? {}, null, 2)}

Wireframe child shapes JSON:
${JSON.stringify(input.frameShapes ?? [], null, 2)}

Wireframe summary:
${summarizeWireframeShapes(input.frameShapes)}

Style Guide Colors:
${colors || "Use compact dark neutrals with one clear blue accent."}

Typography:
${typography || "Use Inter with clear display, heading, body, and label roles."}

Inspiration images available: ${input.imageCount ?? 0}
If a frame snapshot image is attached, reproduce its layout intent first: same major regions, card count, text hierarchy, approximate spacing, and content placement. If inspiration images are attached, they are not optional. Use them for concrete visual choices: color palette, product category, component styling, spacing, card treatment, gradients, and content tone. Do not echo image URLs in the output. If an image is unreachable, ignore only that image.

Return ONLY complete HTML wrapped in <div data-generated-ui>. Include a <style> tag inside that wrapper or return CSS classes that can be safely extracted into a stylesheet. The result should look like a polished implementation of the selected frame, not a generic dashboard shell. No markdown, no explanations, no scripts, no event handlers.`;
}

export function buildRedesignUserPrompt(params: { userMessage: string; currentHTML: string }) {
  return `Please redesign this UI based on my request: "${params.userMessage}"

Current HTML for reference:
${params.currentHTML.substring(0, 2000)}

Modify the provided UI instead of creating an unrelated page. Keep semantic HTML, accessibility, and the same core workflow. Return only the updated <div data-generated-ui> HTML.`;
}

export function buildWorkflowUserPrompt(params: {
  selectedPageType: string;
  currentHTML: string;
  styleGuide?: unknown;
  imageCount?: number;
}) {
  return `Create a "${params.selectedPageType}" workflow page that complements the provided main page design.

Main page reference:
${params.currentHTML.substring(0, 2000)}

Use the same visual style, colors, typography, spacing, and component patterns. Generate realistic content and functional UI elements for this page type.

Style Guide Colors:
${flattenColors(params.styleGuide) || "Use the main page style."}

Typography:
${flattenTypography(params.styleGuide) || "Use the main page typography."}

Inspiration images available: ${params.imageCount ?? 0}
Return only complete <div data-generated-ui> HTML.`;
}

export function buildWorkflowRedesignUserPrompt(params: { userMessage: string; currentHTML: string; styleGuide?: unknown }) {
  return `CRITICAL: You are redesigning a SPECIFIC WORKFLOW PAGE, not creating a new page from scratch.

USER REQUEST: "${params.userMessage}"

CURRENT WORKFLOW PAGE HTML TO REDESIGN:
${params.currentHTML}

Modify the provided HTML. Keep the same page type, IDs, semantic structure, component hierarchy, and workflow purpose while applying the user's requested changes.

Style Guide Colors:
${flattenColors(params.styleGuide)}

Typography:
${flattenTypography(params.styleGuide)}

Return only the modified <div data-generated-ui> HTML.`;
}