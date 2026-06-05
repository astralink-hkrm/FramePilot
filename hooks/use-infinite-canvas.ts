import { useCallback, useState, type Dispatch, type MouseEvent, type PointerEvent, type RefObject, type WheelEvent } from "react";
import type { AnyAction } from "@reduxjs/toolkit";

import {
  addArrow,
  addEllipse,
  addFrame,
  addFreeDrawShape,
  addLine,
  addRect,
  addText,
  clearSelection,
  setTool,
  type Tool,
} from "@/redux/slice/shapes";
import {
  panEnd,
  panMove,
  panStart,
  screenToWorld,
  wheelPan,
  wheelZoom,
  type Point,
} from "@/redux/slice/viewport";

export type CanvasDraft = {
  tool: Exclude<Tool, "select" | "eraser">;
  startWorld: Point;
  currentWorld: Point;
  points: Point[];
};

type ViewportLike = {
  scale: number;
  translate: Point;
  mode: "idle" | "panning" | "shiftPanning";
};

type UseInfiniteCanvasArgs = {
  viewportRef: RefObject<HTMLDivElement | null>;
  viewport: ViewportLike;
  tool: Tool;
  spacePressed: boolean;
  dispatch: Dispatch<AnyAction>;
};

const MIN_DRAW_SIZE = 10;
const DEFAULT_STROKE = { stroke: "#8ea0c4", strokeWidth: 2 };

function normalizeBox(start: Point, end: Point) {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    w: Math.abs(end.x - start.x),
    h: Math.abs(end.y - start.y),
  };
}

function isDrawableTool(tool: Tool): tool is CanvasDraft["tool"] {
  return tool !== "select" && tool !== "eraser";
}

export function useInfiniteCanvas({ viewportRef, viewport, tool, spacePressed, dispatch }: UseInfiniteCanvasArgs) {
  const [draft, setDraft] = useState<CanvasDraft | null>(null);

  const screenPoint = useCallback(
    (event: PointerEvent | MouseEvent | WheelEvent): Point => {
      const rect = viewportRef.current?.getBoundingClientRect();
      return {
        x: event.clientX - (rect?.left ?? 0),
        y: event.clientY - (rect?.top ?? 0),
      };
    },
    [viewportRef]
  );

  const worldPoint = useCallback(
    (event: PointerEvent | MouseEvent | WheelEvent): Point => screenToWorld(screenPoint(event), viewport.translate, viewport.scale),
    [screenPoint, viewport.scale, viewport.translate]
  );

  const commitDraft = useCallback(
    (nextDraft: CanvasDraft) => {
      const box = normalizeBox(nextDraft.startWorld, nextDraft.currentWorld);
      const lineTooSmall = Math.hypot(nextDraft.currentWorld.x - nextDraft.startWorld.x, nextDraft.currentWorld.y - nextDraft.startWorld.y) < MIN_DRAW_SIZE;
      const boxTooSmall = box.w < MIN_DRAW_SIZE || box.h < MIN_DRAW_SIZE;

      if (nextDraft.tool === "text") {
        dispatch(addText({ x: nextDraft.startWorld.x, y: nextDraft.startWorld.y, text: "Type here...", fontSize: 18, fill: "#dbe5ff" }));
        dispatch(setTool("select"));
        return;
      }

      if (["frame", "rect", "ellipse"].includes(nextDraft.tool) && boxTooSmall) {
        return;
      }

      if (["line", "arrow"].includes(nextDraft.tool) && lineTooSmall) {
        return;
      }

      if (nextDraft.tool === "frame") {
        dispatch(addFrame({ ...box, fill: "rgba(255,255,255,0.035)" }));
      }

      if (nextDraft.tool === "rect") {
        dispatch(addRect({ ...DEFAULT_STROKE, ...box, fill: "rgba(255,255,255,0.03)" }));
      }

      if (nextDraft.tool === "ellipse") {
        dispatch(addEllipse({ ...DEFAULT_STROKE, ...box, fill: "rgba(255,255,255,0.03)" }));
      }

      if (nextDraft.tool === "line") {
        dispatch(addLine({ ...DEFAULT_STROKE, startX: nextDraft.startWorld.x, startY: nextDraft.startWorld.y, endX: nextDraft.currentWorld.x, endY: nextDraft.currentWorld.y }));
      }

      if (nextDraft.tool === "arrow") {
        dispatch(addArrow({ ...DEFAULT_STROKE, startX: nextDraft.startWorld.x, startY: nextDraft.startWorld.y, endX: nextDraft.currentWorld.x, endY: nextDraft.currentWorld.y }));
      }

      if (nextDraft.tool === "freedraw" && nextDraft.points.length > 1) {
        dispatch(addFreeDrawShape({ ...DEFAULT_STROKE, points: nextDraft.points }));
      }
    },
    [dispatch]
  );

  const onCanvasPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.button === 1 || event.button === 2 || spacePressed) {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        dispatch(panStart({ screen: screenPoint(event), mode: "panning" }));
        return;
      }

      if (tool === "select") {
        dispatch(clearSelection());
        return;
      }

      if (!isDrawableTool(tool)) return;

      event.preventDefault();
      const point = worldPoint(event);

      if (tool === "text") {
        commitDraft({ tool, startWorld: point, currentWorld: point, points: [point] });
        return;
      }

      setDraft({ tool, startWorld: point, currentWorld: point, points: [point] });
    },
    [commitDraft, dispatch, screenPoint, spacePressed, tool, worldPoint]
  );

  const onCanvasPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (draft) {
        const point = worldPoint(event);
        setDraft((current) => {
          if (!current) return current;
          return {
            ...current,
            currentWorld: point,
            points: current.tool === "freedraw" ? [...current.points, point] : current.points,
          };
        });
        return;
      }

      if (viewport.mode === "panning" || viewport.mode === "shiftPanning") {
        dispatch(panMove(screenPoint(event)));
      }
    },
    [dispatch, draft, screenPoint, viewport.mode, worldPoint]
  );

  const onCanvasPointerUp = useCallback(() => {
    if (draft) {
      commitDraft(draft);
      setDraft(null);
    }

    dispatch(panEnd());
  }, [commitDraft, dispatch, draft]);

  const onCanvasPointerLeave = useCallback(() => {
    setDraft(null);
    dispatch(panEnd());
  }, [dispatch]);

  const onWheel = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      event.preventDefault();

      if (event.altKey) {
        dispatch(wheelPan({ dx: 0, dy: -event.deltaY }));
        return;
      }

      if (event.shiftKey) {
        dispatch(wheelPan({ dx: -event.deltaY, dy: -event.deltaX }));
        return;
      }

      if (event.ctrlKey || event.metaKey || Math.abs(event.deltaY) >= Math.abs(event.deltaX)) {
        dispatch(wheelZoom({ deltaY: event.deltaY, originScreen: screenPoint(event) }));
        return;
      }

      dispatch(wheelPan({ dx: -event.deltaX, dy: -event.deltaY }));
    },
    [dispatch, screenPoint]
  );

  return {
    draft,
    screenPoint,
    worldPoint,
    onCanvasPointerDown,
    onCanvasPointerMove,
    onCanvasPointerUp,
    onCanvasPointerLeave,
    onWheel,
  };
}