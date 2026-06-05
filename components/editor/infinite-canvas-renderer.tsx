"use client";

import type { RefObject, PointerEvent, ReactNode, WheelEvent } from "react";
import { FileJson, ImageDown, ImagePlus, Wand2 } from "lucide-react";

import { ArrowPreview } from "@/components/shapes/arrow/preview";
import { ElipsePreview } from "@/components/shapes/elipse/preview";
import { FramePreview } from "@/components/shapes/frame/preview";
import { LinePreview } from "@/components/shapes/line/preview";
import { RectanglePreview } from "@/components/shapes/rectangle/preview";
import { FreeDrawStrokePreview } from "@/components/shapes/stroke/preview";
import { cn } from "@/lib/utils";
import type { CanvasDraft } from "@/hooks/use-infinite-canvas";
import type { Shape } from "@/redux/slice/shapes";
import type { Point } from "@/redux/slice/viewport";

type Bounds = { x: number; y: number; w: number; h: number };
type ResizeCorner = "nw" | "ne" | "sw" | "se";

type Viewport = {
  scale: number;
  translate: Point;
  mode?: "idle" | "panning" | "shiftPanning";
};

type InfiniteCanvasRendererProps = {
  viewportRef: RefObject<HTMLDivElement | null>;
  viewport: Viewport;
  spacePressed: boolean;
  draft: CanvasDraft | null;
  shapes: Shape[];
  selected: Record<string, true>;
  tool: "select" | "eraser" | string;
  getShapeBounds: (shape: Shape) => Bounds;
  renderShape: (shape: Shape) => ReactNode;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
  onWheel: (event: WheelEvent<HTMLDivElement>) => void;
  onShapePointerDown: (event: PointerEvent<HTMLDivElement>, shape: Shape) => void;
  onResizePointerDown: (event: PointerEvent<HTMLButtonElement>, shape: Shape, corner: ResizeCorner) => void;
  onFrameInspiration: (shape: Extract<Shape, { type: "frame" }>) => void;
  onFrameGenerateDesign: (shape: Extract<Shape, { type: "frame" }>, format: "json" | "png") => void;
  onGeneratedExport: (shape: Extract<Shape, { type: "generatedui" }>, format: "json" | "png") => void;
  onGeneratedWorkflow: (shape: Extract<Shape, { type: "generatedui" }>) => void;
};

function renderDraftPreview(draft: CanvasDraft | null) {
  if (!draft) return null;

  if (draft.tool === "frame") {
    return <FramePreview startWorld={draft.startWorld} currentWorld={draft.currentWorld} />;
  }

  if (draft.tool === "rect") {
    return <RectanglePreview startWorld={draft.startWorld} currentWorld={draft.currentWorld} />;
  }

  if (draft.tool === "ellipse") {
    return <ElipsePreview startWorld={draft.startWorld} currentWorld={draft.currentWorld} />;
  }

  if (draft.tool === "line") {
    return <LinePreview startWorld={draft.startWorld} currentWorld={draft.currentWorld} />;
  }

  if (draft.tool === "arrow") {
    return <ArrowPreview startWorld={draft.startWorld} currentWorld={draft.currentWorld} />;
  }

  if (draft.tool === "freedraw") {
    return <FreeDrawStrokePreview points={draft.points} />;
  }

  return null;
}

export function InfiniteCanvasRenderer({
  viewportRef,
  viewport,
  spacePressed,
  draft,
  shapes,
  selected,
  tool,
  getShapeBounds,
  renderShape,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerLeave,
  onWheel,
  onShapePointerDown,
  onResizePointerDown,
  onFrameInspiration,
  onFrameGenerateDesign,
  onGeneratedExport,
  onGeneratedWorkflow,
}: InfiniteCanvasRendererProps) {
  return (
    <section
      ref={viewportRef}
      className={cn("relative overflow-hidden bg-muted/30 dark:bg-[#090909]", (spacePressed || viewport.mode === "panning") && "cursor-grab")}
      onPointerDown={onPointerDown}
      onWheel={onWheel}
      onContextMenu={(event) => event.preventDefault()}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(120,120,120,0.22)_1px,transparent_1px)] bg-[size:28px_28px] opacity-45" />
      <div
        className="absolute left-0 top-0 h-[1800px] w-[2400px] origin-top-left"
        style={{ transform: `translate(${viewport.translate.x}px, ${viewport.translate.y}px) scale(${viewport.scale})` }}
      >
        {shapes.length === 0 && !draft && (
          <div className="absolute left-[280px] top-[120px] h-[500px] w-[820px] rounded-lg border border-border bg-card shadow-2xl shadow-black/10 dark:shadow-black/50">
            <div className="absolute left-16 top-16 h-2 w-44 rounded-full bg-muted-foreground/45" />
            <div className="absolute left-16 top-[145px] h-2 w-80 rounded-full bg-muted-foreground/45" />
            <div className="absolute left-16 top-[178px] h-2 w-[360px] rounded-full bg-muted-foreground/45" />
            <div className="absolute right-16 top-24 h-60 w-64 border-2 border-muted-foreground/45" />
          </div>
        )}

        {renderDraftPreview(draft)}

        {shapes.map((shape, index) => {
          const bounds = getShapeBounds(shape);
          const isSelected = Boolean(selected[shape.id]);

          return (
            <div key={shape.id} className="pointer-events-none absolute inset-0" style={{ zIndex: index + 1 }}>
              {renderShape(shape)}
              <div
                className={cn("pointer-events-auto absolute rounded-md border border-transparent", tool === "eraser" ? "cursor-crosshair" : "cursor-move", isSelected && "border-primary/70 bg-primary/5")}
                style={{ left: bounds.x - 4, top: bounds.y - 4, width: bounds.w + 8, height: bounds.h + 8 }}
                onPointerDown={(event) => onShapePointerDown(event, shape)}
              />
              {isSelected && (
                <>
                  {shape.type === "frame" && (
                    <div
                      className="pointer-events-auto absolute z-40 flex items-center gap-2"
                      style={{ left: bounds.x + 80, top: bounds.y - 34 }}
                      onPointerDown={(event) => event.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-card px-2 text-[11px] font-medium text-foreground shadow-sm hover:bg-muted"
                        onClick={(event) => {
                          event.stopPropagation();
                          onFrameInspiration(shape);
                        }}
                        suppressHydrationWarning
                      >
                        <ImagePlus className="size-3.5" />
                        Inspiration
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-card px-2 text-[11px] font-medium text-foreground shadow-sm hover:bg-muted"
                        onClick={(event) => {
                          event.stopPropagation();
                          onFrameGenerateDesign(shape, "json");
                        }}
                        suppressHydrationWarning
                      >
                        <Wand2 className="size-3.5" />
                        JSON
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-card px-2 text-[11px] font-medium text-foreground shadow-sm hover:bg-muted"
                        onClick={(event) => {
                          event.stopPropagation();
                          onFrameGenerateDesign(shape, "png");
                        }}
                        suppressHydrationWarning
                      >
                        <Wand2 className="size-3.5" />
                        PNG
                      </button>
                    </div>
                  )}

                  {shape.type === "generatedui" && (
                    <div
                      className="pointer-events-auto absolute z-40 flex items-center gap-2"
                      style={{ left: bounds.x + 10, top: bounds.y - 34 }}
                      onPointerDown={(event) => event.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-card px-2 text-[11px] font-medium text-foreground shadow-sm hover:bg-muted"
                        onClick={(event) => {
                          event.stopPropagation();
                          onGeneratedExport(shape, "json");
                        }}
                        suppressHydrationWarning
                      >
                        <FileJson className="size-3.5" />
                        JSON
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-card px-2 text-[11px] font-medium text-foreground shadow-sm hover:bg-muted"
                        onClick={(event) => {
                          event.stopPropagation();
                          onGeneratedExport(shape, "png");
                        }}
                        suppressHydrationWarning
                      >
                        <ImageDown className="size-3.5" />
                        PNG
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-card px-2 text-[11px] font-medium text-foreground shadow-sm hover:bg-muted"
                        onClick={(event) => {
                          event.stopPropagation();
                          onGeneratedWorkflow(shape);
                        }}
                        suppressHydrationWarning
                      >
                        <Wand2 className="size-3.5" />
                        Workflow
                      </button>
                    </div>
                  )}

                  {(["nw", "ne", "sw", "se"] as ResizeCorner[]).map((corner) => (
                    <button
                      key={corner}
                      type="button"
                      aria-label={`Resize ${corner}`}
                      className={cn(
                        "pointer-events-auto absolute z-50 size-3 rounded-full border border-background bg-primary shadow-sm",
                        corner === "nw" && "cursor-nw-resize",
                        corner === "ne" && "cursor-ne-resize",
                        corner === "sw" && "cursor-sw-resize",
                        corner === "se" && "cursor-se-resize"
                      )}
                      style={{
                        left: corner.includes("w") ? bounds.x - 8 : bounds.x + bounds.w + 2,
                        top: corner.includes("n") ? bounds.y - 8 : bounds.y + bounds.h + 2,
                      }}
                      onPointerDown={(event) => onResizePointerDown(event, shape, corner)}
                      suppressHydrationWarning
                    />
                  ))}
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="pointer-events-none absolute bottom-4 left-5 rounded-md border border-border bg-card/90 px-3 py-2 text-xs text-muted-foreground">
        X: {Math.round(viewport.translate.x)} Y: {Math.round(viewport.translate.y)} | {Math.round(viewport.scale * 100)}% | Wheel zoom | Alt-wheel up/down | Shift-wheel left/right | Space/right drag pan
      </div>
    </section>
  );
}
