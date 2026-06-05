import {
  createSlice,
  createEntityAdapter,
  nanoid,
  PayloadAction,
  EntityState,
  current,
} from "@reduxjs/toolkit";
import type { Point } from "../viewport";

export type Tool =
  | "select"
  | "frame"
  | "rect"
  | "ellipse"
  | "freedraw"
  | "arrow"
  | "line"
  | "text"
  | "eraser";

export interface BaseShape {
  id: string;
  stroke: string;
  strokeWidth: number;
  fill?: string | null;
}
export interface FrameShape extends BaseShape {
  type: "frame";
  x: number;
  y: number;
  w: number;
  h: number;
  frameNumber: number;
}
export interface RectShape extends BaseShape {
  type: "rect";
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface EllipseShape extends BaseShape {
  type: "ellipse";
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface FreeDrawShape extends BaseShape {
  type: "freedraw";
  points: Point[];
}
export interface ArrowShape extends BaseShape {
  type: "arrow";
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}
export interface LineShape extends BaseShape {
  type: "line";
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}
export interface TextShape extends BaseShape {
  type: "text";
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  fontStyle: "normal" | "italic";
  textAlign: "left" | "center" | "right";
  textDecoration: "none" | "underline" | "line-through";
  lineHeight: number;
  letterSpacing: number;
  textTransform: "none" | "uppercase" | "lowercase" | "capitalize";
}

export interface GeneratedUIShape extends BaseShape {
  type: "generatedui";
  x: number;
  y: number;
  w: number;
  h: number;
  uiSpecData: string | null;
  sourceFrameId: string;
  isWorkflowPage?: boolean; // Flag to identify workflow pages
}

export type Shape =
  | FrameShape
  | RectShape
  | EllipseShape
  | FreeDrawShape
  | ArrowShape
  | LineShape
  | TextShape
  | GeneratedUIShape;

const shapesAdapter = createEntityAdapter<Shape, string>({
  selectId: (s) => s.id,
});

type SelectionMap = Record<string, true>;

type ShapesSnapshot = {
  shapes: EntityState<Shape, string>;
  selected: SelectionMap;
  frameCounter: number;
};

interface ShapesState {
  tool: Tool;
  shapes: EntityState<Shape, string>;
  selected: SelectionMap;
  frameCounter: number;
  clipboard: Shape[];
  past: ShapesSnapshot[];
  future: ShapesSnapshot[];
}

const initialState: ShapesState = {
  tool: "select",
  shapes: shapesAdapter.getInitialState(),
  selected: {},
  frameCounter: 0,
  clipboard: [],
  past: [],
  future: [],
};

const DEFAULTS = { stroke: "#ffff", strokeWidth: 2 as const };
const HISTORY_LIMIT = 80;

function cloneData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function takeSnapshot(state: ShapesState): ShapesSnapshot {
  const plain = current(state);
  return cloneData({
    shapes: plain.shapes,
    selected: plain.selected,
    frameCounter: plain.frameCounter,
  });
}

function pushHistory(state: ShapesState) {
  state.past.push(takeSnapshot(state));
  if (state.past.length > HISTORY_LIMIT) state.past.shift();
  state.future = [];
}

function restoreSnapshot(state: ShapesState, snapshot: ShapesSnapshot) {
  state.shapes = cloneData(snapshot.shapes);
  state.selected = cloneData(snapshot.selected);
  state.frameCounter = snapshot.frameCounter;
}

const makeFrame = (p: {
  x: number;
  y: number;
  w: number;
  h: number;
  frameNumber: number;
  stroke?: string;
  strokeWidth?: number;
  fill?: string | null;
}): FrameShape => ({
  id: nanoid(),
  type: "frame",
  x: p.x,
  y: p.y,
  w: p.w,
  h: p.h,
  frameNumber: p.frameNumber,
  stroke: "transparent",
  strokeWidth: 0,
  fill: p.fill ?? "rgba(255, 255, 255, 0.05)",
});

const makeRect = (p: {
  x: number;
  y: number;
  w: number;
  h: number;
  stroke?: string;
  strokeWidth?: number;
  fill?: string | null;
}): RectShape => ({
  id: nanoid(),
  type: "rect",
  x: p.x,
  y: p.y,
  w: p.w,
  h: p.h,
  stroke: p.stroke ?? DEFAULTS.stroke,
  strokeWidth: p.strokeWidth ?? DEFAULTS.strokeWidth,
  fill: p.fill ?? null,
});

const makeEllipse = (p: {
  x: number;
  y: number;
  w: number;
  h: number;
  stroke?: string;
  strokeWidth?: number;
  fill?: string | null;
}): EllipseShape => ({
  id: nanoid(),
  type: "ellipse",
  x: p.x,
  y: p.y,
  w: p.w,
  h: p.h,
  stroke: p.stroke ?? DEFAULTS.stroke,
  strokeWidth: p.strokeWidth ?? DEFAULTS.strokeWidth,
  fill: p.fill ?? null,
});

const makeFree = (p: {
  points: Point[];
  stroke?: string;
  strokeWidth?: number;
  fill?: string | null;
}): FreeDrawShape => ({
  id: nanoid(),
  type: "freedraw",
  points: p.points,
  stroke: p.stroke ?? DEFAULTS.stroke,
  strokeWidth: p.strokeWidth ?? DEFAULTS.strokeWidth,
  fill: p.fill ?? null,
});

const makeArrow = (p: {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  stroke?: string;
  strokeWidth?: number;
  fill?: string | null;
}): ArrowShape => ({
  id: nanoid(),
  type: "arrow",
  startX: p.startX,
  startY: p.startY,
  endX: p.endX,
  endY: p.endY,
  stroke: p.stroke ?? DEFAULTS.stroke,
  strokeWidth: p.strokeWidth ?? DEFAULTS.strokeWidth,
  fill: p.fill ?? null,
});

const makeLine = (p: {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  stroke?: string;
  strokeWidth?: number;
  fill?: string | null;
}): LineShape => ({
  id: nanoid(),
  type: "line",
  startX: p.startX,
  startY: p.startY,
  endX: p.endX,
  endY: p.endY,
  stroke: p.stroke ?? DEFAULTS.stroke,
  strokeWidth: p.strokeWidth ?? DEFAULTS.strokeWidth,
  fill: p.fill ?? null,
});

const makeText = (p: {
  x: number;
  y: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  fontStyle?: "normal" | "italic";
  textAlign?: "left" | "center" | "right";
  textDecoration?: "none" | "underline" | "line-through";
  lineHeight?: number;
  letterSpacing?: number;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  stroke?: string;
  strokeWidth?: number;
  fill?: string | null;
}): TextShape => ({
  id: nanoid(),
  type: "text",
  x: p.x,
  y: p.y,
  text: p.text ?? "Type here...", // Start with placeholder text
  fontSize: p.fontSize ?? 16,
  fontFamily: p.fontFamily ?? "Inter, sans-serif",
  fontWeight: p.fontWeight ?? 400,
  fontStyle: p.fontStyle ?? "normal",
  textAlign: p.textAlign ?? "left",
  textDecoration: p.textDecoration ?? "none",
  lineHeight: p.lineHeight ?? 1.2,
  letterSpacing: p.letterSpacing ?? 0,
  textTransform: p.textTransform ?? "none",
  stroke: p.stroke ?? DEFAULTS.stroke,
  strokeWidth: p.strokeWidth ?? DEFAULTS.strokeWidth,
  fill: p.fill ?? "#ffffff",
});

const makeGeneratedUI = (p: {
  x: number;
  y: number;
  w: number;
  h: number;
  uiSpecData: string | null; // HTML markup as string
  sourceFrameId: string;
  id?: string;
  stroke?: string;
  strokeWidth?: number;
  fill?: string | null;
  isWorkflowPage?: boolean; // Flag to identify workflow pages
}): GeneratedUIShape => ({
  id: p.id ?? nanoid(),
  type: "generatedui",
  x: p.x,
  y: p.y,
  w: p.w,
  h: p.h,
  uiSpecData: p.uiSpecData,
  sourceFrameId: p.sourceFrameId,
  isWorkflowPage: p.isWorkflowPage,
  stroke: "transparent", // No border for generated UI
  strokeWidth: 0,
  fill: p.fill ?? null,
});


type Bounds = { x: number; y: number; w: number; h: number };
const PASTE_OFFSET = 32;

function shapeBounds(shape: Shape): Bounds {
  if ("x" in shape && "y" in shape && "w" in shape && "h" in shape) {
    return { x: shape.x, y: shape.y, w: shape.w, h: shape.h };
  }

  if (shape.type === "text") {
    return {
      x: shape.x,
      y: shape.y,
      w: Math.max(80, shape.text.length * shape.fontSize * 0.55),
      h: Math.max(28, shape.fontSize * shape.lineHeight),
    };
  }

  if (shape.type === "freedraw") {
    const xs = shape.points.map((point) => point.x);
    const ys = shape.points.map((point) => point.y);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, w: Math.max(1, Math.max(...xs) - x), h: Math.max(1, Math.max(...ys) - y) };
  }

  const x = Math.min(shape.startX, shape.endX);
  const y = Math.min(shape.startY, shape.endY);
  return { x, y, w: Math.abs(shape.endX - shape.startX), h: Math.abs(shape.endY - shape.startY) };
}

function centerInside(shape: Shape, container: Bounds) {
  const bounds = shapeBounds(shape);
  const centerX = bounds.x + bounds.w / 2;
  const centerY = bounds.y + bounds.h / 2;
  return centerX >= container.x && centerX <= container.x + container.w && centerY >= container.y && centerY <= container.y + container.h;
}

function offsetShape(shape: Shape, dx: number, dy: number, idMap: Record<string, string>): Shape {
  const next = cloneData(shape);
  next.id = idMap[shape.id] ?? nanoid();

  if (next.type === "freedraw") {
    next.points = next.points.map((point) => ({ x: point.x + dx, y: point.y + dy }));
    return next;
  }

  if (next.type === "arrow" || next.type === "line") {
    next.startX += dx;
    next.startY += dy;
    next.endX += dx;
    next.endY += dy;
    return next;
  }

  next.x += dx;
  next.y += dy;

  if (next.type === "generatedui" && idMap[next.sourceFrameId]) {
    next.sourceFrameId = idMap[next.sourceFrameId];
  }

  return next;
}

function selectedWithFrameContents(state: ShapesState) {
  const selectedIds = Object.keys(state.selected);
  if (!selectedIds.length) return [];

  const allShapes = (state.shapes.ids as string[])
    .map((id) => state.shapes.entities[id])
    .filter((shape): shape is Shape => Boolean(shape));
  const copyIds = new Set(selectedIds);

  selectedIds.forEach((id) => {
    const shape = state.shapes.entities[id];
    if (!shape || !["frame", "rect", "ellipse", "generatedui"].includes(shape.type)) return;

    const bounds = shapeBounds(shape);
    allShapes.forEach((candidate) => {
      if (candidate.id !== shape.id && centerInside(candidate, bounds)) copyIds.add(candidate.id);
    });
  });

  return allShapes.filter((shape) => copyIds.has(shape.id));
}
const shapesSlice = createSlice({
  name: "shapes",
  initialState,
  reducers: {
    snapshotHistory(state) {
      pushHistory(state);
    },

    undo(state) {
      const previous = state.past.pop();
      if (!previous) return;

      state.future.push(takeSnapshot(state));
      restoreSnapshot(state, previous);
    },

    redo(state) {
      const next = state.future.pop();
      if (!next) return;

      state.past.push(takeSnapshot(state));
      restoreSnapshot(state, next);
    },

    setTool(state, action: PayloadAction<Tool>) {
      state.tool = action.payload;
      if (action.payload !== "select") state.selected = {};
    },

    addFrame(
      state,
      action: PayloadAction<
        Omit<Parameters<typeof makeFrame>[0], "frameNumber">
      >
    ) {
      pushHistory(state);
      state.frameCounter += 1;
      const frameWithNumber = {
        ...action.payload,
        frameNumber: state.frameCounter,
      };
      shapesAdapter.addOne(state.shapes, makeFrame(frameWithNumber));
    },
    addRect(state, action: PayloadAction<Parameters<typeof makeRect>[0]>) {
      pushHistory(state);
      shapesAdapter.addOne(state.shapes, makeRect(action.payload));
    },
    addEllipse(
      state,
      action: PayloadAction<Parameters<typeof makeEllipse>[0]>
    ) {
      pushHistory(state);
      shapesAdapter.addOne(state.shapes, makeEllipse(action.payload));
    },
    addFreeDrawShape(
      state,
      action: PayloadAction<Parameters<typeof makeFree>[0]>
    ) {
      const { points } = action.payload;
      if (!points || points.length === 0) return;
      pushHistory(state);
      shapesAdapter.addOne(state.shapes, makeFree(action.payload));
    },
    addArrow(state, action: PayloadAction<Parameters<typeof makeArrow>[0]>) {
      pushHistory(state);
      shapesAdapter.addOne(state.shapes, makeArrow(action.payload));
    },
    addLine(state, action: PayloadAction<Parameters<typeof makeLine>[0]>) {
      pushHistory(state);
      shapesAdapter.addOne(state.shapes, makeLine(action.payload));
    },
    addText(state, action: PayloadAction<Parameters<typeof makeText>[0]>) {
      pushHistory(state);
      shapesAdapter.addOne(state.shapes, makeText(action.payload));
    },
    addGeneratedUI(
      state,
      action: PayloadAction<Parameters<typeof makeGeneratedUI>[0]>
    ) {
      pushHistory(state);
      shapesAdapter.addOne(state.shapes, makeGeneratedUI(action.payload));
    },

    copySelectedToClipboard(state) {
      state.clipboard = cloneData(selectedWithFrameContents(state));
    },

    pasteClipboard(state) {
      if (!state.clipboard.length) return;
      pushHistory(state);

      const idMap = Object.fromEntries(state.clipboard.map((shape) => [shape.id, nanoid()]));
      const pasted = state.clipboard.map((shape) => {
        const next = offsetShape(shape, PASTE_OFFSET, PASTE_OFFSET, idMap);
        if (next.type === "frame") {
          state.frameCounter += 1;
          next.frameNumber = state.frameCounter;
        }
        return next;
      });

      shapesAdapter.addMany(state.shapes, pasted);
      state.selected = Object.fromEntries(pasted.map((shape) => [shape.id, true]));
      state.tool = "select";
    },
    updateShape(
      state,
      action: PayloadAction<{ id: string; patch: Partial<Shape>; recordHistory?: boolean }>
    ) {
      const { id, patch, recordHistory = true } = action.payload;
      if (recordHistory) pushHistory(state);
      shapesAdapter.updateOne(state.shapes, { id, changes: patch });
    },

    removeShape(state, action: PayloadAction<string>) {
      pushHistory(state);
      const id = action.payload;
      const shape = state.shapes.entities[id];
      if (shape?.type === "frame") {
        state.frameCounter = Math.max(0, state.frameCounter - 1);
      }
      shapesAdapter.removeOne(state.shapes, id);
      delete state.selected[id];
    },

    removeShapes(state, action: PayloadAction<string[]>) {
      const ids = action.payload;
      if (!ids.length) return;
      pushHistory(state);

      ids.forEach((id) => {
        const shape = state.shapes.entities[id];
        if (shape?.type === "frame") {
          state.frameCounter = Math.max(0, state.frameCounter - 1);
        }
        delete state.selected[id];
      });
      shapesAdapter.removeMany(state.shapes, ids);
    },

    clearAll(state) {
      pushHistory(state);
      shapesAdapter.removeAll(state.shapes);
      state.selected = {};
      state.frameCounter = 0;
    },

    selectShape(state, action: PayloadAction<string>) {
      state.selected[action.payload] = true;
    },
    deselectShape(state, action: PayloadAction<string>) {
      delete state.selected[action.payload];
    },
    clearSelection(state) {
      state.selected = {};
    },
    selectAll(state) {
      const ids = state.shapes.ids as string[];
      state.selected = Object.fromEntries(ids.map((id) => [id, true]));
    },
    deleteSelected(state) {
      const ids = Object.keys(state.selected);
      if (!ids.length) return;
      pushHistory(state);
      shapesAdapter.removeMany(state.shapes, ids);
      state.selected = {};
    },
    loadProject(
      state,
      action: PayloadAction<{
        shapes: EntityState<Shape, string>;
        tool: Tool;
        selected: SelectionMap;
        frameCounter: number;
      }>
    ) {
      // Load project data into the shapes state
      state.shapes = action.payload.shapes;
      state.tool = action.payload.tool;
      state.selected = action.payload.selected;
      state.frameCounter = action.payload.frameCounter;
    },
  },
});

export const {
  snapshotHistory,
  undo,
  redo,
  setTool,
  addFrame,
  addRect,
  addEllipse,
  addFreeDrawShape,
  addArrow,
  addLine,
  addText,
  addGeneratedUI,
  copySelectedToClipboard,
  pasteClipboard,
  updateShape,
  removeShape,
  removeShapes,
  clearAll,
  selectShape,
  deselectShape,
  clearSelection,
  selectAll,
  deleteSelected,
  loadProject,
} = shapesSlice.actions;

export default shapesSlice.reducer;
