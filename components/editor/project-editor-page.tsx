"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ComponentType, type MouseEvent, type PointerEvent, type WheelEvent } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Circle,
  Code2,
  Copy,
  FrameIcon,
  ImagePlus,
  MousePointer2,
  MoveRight,
  PenLine,
  RectangleHorizontal,
  Save,
  Slash,
  Sparkles,
  Type,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toast } from "sonner";

import { Arrow } from "@/components/shapes/arrow";
import { Elipse } from "@/components/shapes/elipse";
import { Frame } from "@/components/shapes/frame";
import { Line } from "@/components/shapes/line";
import { Rectangle } from "@/components/shapes/rectangle";
import { Stroke } from "@/components/shapes/stroke";
import { Text } from "@/components/shapes/text";
import { ThemeToggle } from "@/components/theme/toggle";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { RootState } from "@/redux/store";
import {
  addArrow,
  addEllipse,
  addFrame,
  addFreeDrawShape,
  addLine,
  addRect,
  addText,
  clearSelection,
  loadProject,
  selectShape,
  setTool,
  updateShape,
  type Shape,
  type Tool,
} from "@/redux/slice/shapes";
import {
  resetView,
  restoreViewport,
  screenToWorld,
  setScale,
  wheelPan,
  wheelZoom,
} from "@/redux/slice/viewport";
import { cn } from "@/lib/utils";

const tools: Array<{ id: Tool; label: string; icon: ComponentType<{ className?: string }> }> = [
  { id: "select", label: "Select", icon: MousePointer2 },
  { id: "frame", label: "Frame", icon: FrameIcon },
  { id: "rect", label: "Rectangle", icon: RectangleHorizontal },
  { id: "ellipse", label: "Ellipse", icon: Circle },
  { id: "line", label: "Line", icon: Slash },
  { id: "arrow", label: "Arrow", icon: MoveRight },
  { id: "freedraw", label: "Draw", icon: PenLine },
  { id: "text", label: "Text", icon: Type },
];

function renderShape(shape: Shape) {
  switch (shape.type) {
    case "frame":
      return <Frame key={shape.id} shape={shape} toggleInspiration={() => undefined} />;
    case "rect":
      return <Rectangle key={shape.id} shape={shape} />;
    case "ellipse":
      return <Elipse key={shape.id} shape={shape} />;
    case "line":
      return <Line key={shape.id} shape={shape} />;
    case "arrow":
      return <Arrow key={shape.id} shape={shape} />;
    case "freedraw":
      return <Stroke key={shape.id} shape={shape} />;
    case "text":
      return <Text key={shape.id} shape={shape} />;
    default:
      return null;
  }
}

export function ProjectEditorPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId as Id<"projects">;
  const project = useQuery(api.projects.get, { id: projectId });
  const updateProject = useMutation(api.projects.update);
  const dispatch = useDispatch();
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [didLoadProject, setDidLoadProject] = useState(false);
  const dragRef = useRef<{ id: string; start: { x: number; y: number }; shape: Shape } | null>(null);

  const shapesState = useSelector((state: RootState) => state.shapes);
  const viewport = useSelector((state: RootState) => state.viewport);
  const shapes = useMemo(
    () =>
      (shapesState.shapes.ids as string[])
        .map((id) => shapesState.shapes.entities[id])
        .filter(Boolean) as Shape[],
    [shapesState.shapes]
  );
  const selectedIds = Object.keys(shapesState.selected);
  const selectedShape = selectedIds.length === 1 ? shapesState.shapes.entities[selectedIds[0]] : null;

  useEffect(() => {
    if (!project || didLoadProject) return;

    const savedSketches = project.sketchesData as Partial<typeof shapesState> | undefined;
    const savedViewport = project.viewportData as { scale?: number; translate?: { x: number; y: number } } | undefined;

    if (
      savedSketches?.shapes &&
      savedSketches.tool &&
      savedSketches.selected &&
      typeof savedSketches.frameCounter === "number"
    ) {
      dispatch(
        loadProject({
          shapes: savedSketches.shapes,
          tool: savedSketches.tool,
          selected: savedSketches.selected,
          frameCounter: savedSketches.frameCounter,
        })
      );
    }

    if (savedViewport?.scale && savedViewport.translate) {
      dispatch(
        restoreViewport({
          scale: savedViewport.scale,
          translate: savedViewport.translate,
        })
      );
    } else {
      dispatch(resetView());
    }

    setDidLoadProject(true);
  }, [didLoadProject, dispatch, project, shapesState]);

  const screenPoint = (event: PointerEvent | MouseEvent) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    return {
      x: event.clientX - (rect?.left ?? 0),
      y: event.clientY - (rect?.top ?? 0),
    };
  };

  const addShapeAt = (event: PointerEvent<HTMLDivElement>) => {
    const world = screenToWorld(screenPoint(event), viewport.translate, viewport.scale);
    const common = { stroke: "#8ea0c4", strokeWidth: 2 };

    if (shapesState.tool === "select") {
      dispatch(clearSelection());
      return;
    }

    if (shapesState.tool === "frame") {
      dispatch(addFrame({ x: world.x, y: world.y, w: 390, h: 300, fill: "rgba(255,255,255,0.035)" }));
    }

    if (shapesState.tool === "rect") {
      dispatch(addRect({ ...common, x: world.x, y: world.y, w: 180, h: 110, fill: "rgba(255,255,255,0.03)" }));
    }

    if (shapesState.tool === "ellipse") {
      dispatch(addEllipse({ ...common, x: world.x, y: world.y, w: 150, h: 100, fill: "rgba(255,255,255,0.03)" }));
    }

    if (shapesState.tool === "line") {
      dispatch(addLine({ ...common, startX: world.x, startY: world.y, endX: world.x + 160, endY: world.y + 72 }));
    }

    if (shapesState.tool === "arrow") {
      dispatch(addArrow({ ...common, startX: world.x, startY: world.y, endX: world.x + 170, endY: world.y + 80 }));
    }

    if (shapesState.tool === "freedraw") {
      dispatch(
        addFreeDrawShape({
          ...common,
          points: [
            { x: world.x, y: world.y },
            { x: world.x + 38, y: world.y + 24 },
            { x: world.x + 92, y: world.y + 10 },
            { x: world.x + 132, y: world.y + 44 },
          ],
        })
      );
    }

    if (shapesState.tool === "text") {
      dispatch(addText({ x: world.x, y: world.y, text: "Label", fontSize: 18, fill: "#dbe5ff" }));
    }

    dispatch(setTool("select"));
  };

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();

    if (event.ctrlKey || event.metaKey) {
      dispatch(wheelZoom({ deltaY: event.deltaY, originScreen: screenPoint(event) }));
      return;
    }

    dispatch(wheelPan({ dx: -event.deltaX, dy: -event.deltaY }));
  };

  const shapeBounds = (shape: Shape) => {
    if (shape.type === "frame" || shape.type === "rect" || shape.type === "ellipse" || shape.type === "generatedui") {
      return { x: shape.x, y: shape.y, w: shape.w, h: shape.h };
    }

    if (shape.type === "text") {
      return { x: shape.x, y: shape.y, w: Math.max(80, shape.text.length * shape.fontSize * 0.6), h: shape.fontSize * 1.6 };
    }

    if (shape.type === "line" || shape.type === "arrow") {
      const x = Math.min(shape.startX, shape.endX) - 10;
      const y = Math.min(shape.startY, shape.endY) - 10;
      return {
        x,
        y,
        w: Math.abs(shape.endX - shape.startX) + 20,
        h: Math.abs(shape.endY - shape.startY) + 20,
      };
    }

    if (shape.points.length === 0) return { x: 0, y: 0, w: 0, h: 0 };

    const xs = shape.points.map((point) => point.x);
    const ys = shape.points.map((point) => point.y);
    const x = Math.min(...xs) - 10;
    const y = Math.min(...ys) - 10;

    return {
      x,
      y,
      w: Math.max(20, Math.max(...xs) - Math.min(...xs) + 20),
      h: Math.max(20, Math.max(...ys) - Math.min(...ys) + 20),
    };
  };

  const moveShapePatch = (shape: Shape, dx: number, dy: number): Partial<Shape> => {
    if (shape.type === "frame" || shape.type === "rect" || shape.type === "ellipse" || shape.type === "generatedui") {
      return { x: shape.x + dx, y: shape.y + dy } as Partial<Shape>;
    }

    if (shape.type === "text") {
      return { x: shape.x + dx, y: shape.y + dy } as Partial<Shape>;
    }

    if (shape.type === "line" || shape.type === "arrow") {
      return {
        startX: shape.startX + dx,
        startY: shape.startY + dy,
        endX: shape.endX + dx,
        endY: shape.endY + dy,
      } as Partial<Shape>;
    }

    return {
      points: shape.points.map((point) => ({ x: point.x + dx, y: point.y + dy })),
    } as Partial<Shape>;
  };

  const startShapeDrag = (event: PointerEvent<HTMLDivElement>, shape: Shape) => {
    if (shapesState.tool !== "select") return;

    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { id: shape.id, start: screenToWorld(screenPoint(event), viewport.translate, viewport.scale), shape };
    dispatch(clearSelection());
    dispatch(selectShape(shape.id));
  };

  const moveShapeDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;

    const current = screenToWorld(screenPoint(event), viewport.translate, viewport.scale);
    const dx = current.x - dragRef.current.start.x;
    const dy = current.y - dragRef.current.start.y;

    dispatch(
      updateShape({
        id: dragRef.current.id,
        patch: moveShapePatch(dragRef.current.shape, dx, dy),
      })
    );
  };

  const endShapeDrag = () => {
    dragRef.current = null;
  };
  const onSave = async () => {
    setIsSaving(true);

    try {
      await updateProject({
        id: projectId,
        patch: {
          sketchesData: shapesState,
          viewportData: {
            scale: viewport.scale,
            translate: viewport.translate,
          },
        },
      });
      toast.success("Project saved");
    } catch (error) {
      console.error(error);
      toast.error("Could not save project");
    } finally {
      setIsSaving(false);
    }
  };

  if (project === undefined) {
    return <div className="grid min-h-svh place-items-center bg-background text-muted-foreground">Loading workspace</div>;
  }

  if (project === null) {
    return <div className="grid min-h-svh place-items-center bg-background text-foreground">Project not found</div>;
  }

  return (
    <main className="flex h-svh flex-col overflow-hidden bg-background text-foreground">
      <header className="z-30 flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="size-9 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
            <Link href="/dashboard" aria-label="Back to dashboard">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold leading-none">{project.name}</h1>
            <p className="mt-1 truncate text-xs text-muted-foreground">S2C / Editor</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex h-9 items-center gap-2 rounded-md border border-border bg-muted px-3 text-sm text-muted-foreground">
            <ZoomOut className="size-4 cursor-pointer" onClick={() => dispatch(setScale({ scale: viewport.scale / 1.15, originScreen: { x: 500, y: 320 } }))} />
            <span className="w-12 text-center">{Math.round(viewport.scale * 100)}%</span>
            <ZoomIn className="size-4 cursor-pointer" onClick={() => dispatch(setScale({ scale: viewport.scale * 1.15, originScreen: { x: 500, y: 320 } }))} />
          </div>
          <ThemeToggle />
          <Button onClick={onSave} disabled={isSaving} className="h-9 rounded-md px-4">
            <Save className="size-4" />
            {isSaving ? "Saving" : "Save"}
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[56px_minmax(0,1fr)_240px]">
        <aside className="flex flex-col items-center border-r border-border bg-muted/35 py-3">
          <div className="grid gap-2">
            {tools.map((tool, index) => {
              const Icon = tool.icon;
              const active = shapesState.tool === tool.id;

              return (
                <button
                  key={tool.id}
                  type="button"
                  title={tool.label}
                  suppressHydrationWarning
                  onClick={() => dispatch(setTool(tool.id))}
                  className={cn(
                    "grid size-10 place-items-center rounded-md border border-transparent text-muted-foreground transition hover:bg-muted hover:text-foreground",
                    active && "border-primary/50 bg-primary/10 text-primary"
                  )}
                >
                  <Icon className="size-5" />
                  {index === 1 || index === 5 ? <span className="mt-3 h-px w-8 bg-border" /> : null}
                </button>
              );
            })}
          </div>
          <div className="mt-auto grid gap-2">
            <button className="grid size-10 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" title="Layers" suppressHydrationWarning>
              <Copy className="size-5" />
            </button>
          </div>
        </aside>

        <section ref={viewportRef} className="relative overflow-hidden bg-muted/30 dark:bg-[#090909]" onPointerDown={addShapeAt} onWheel={onWheel} onPointerMove={moveShapeDrag} onPointerUp={endShapeDrag} onPointerLeave={endShapeDrag}>
          <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(120,120,120,0.22)_1px,transparent_1px)] bg-[size:28px_28px] opacity-45" />
          <div
            className="absolute left-0 top-0 h-[1800px] w-[2400px] origin-top-left"
            style={{ transform: `translate(${viewport.translate.x}px, ${viewport.translate.y}px) scale(${viewport.scale})` }}
          >
            <div className="absolute left-[280px] top-[120px] h-[500px] w-[820px] rounded-lg border border-border bg-card shadow-2xl shadow-black/10 dark:shadow-black/50">
              <div className="absolute left-16 top-16 h-2 w-44 rounded-full bg-muted-foreground/45" />
              <div className="absolute left-16 top-[145px] h-2 w-80 rounded-full bg-muted-foreground/45" />
              <div className="absolute left-16 top-[178px] h-2 w-[360px] rounded-full bg-muted-foreground/45" />
              <div className="absolute right-16 top-24 h-60 w-64 border-2 border-muted-foreground/45" />
            </div>
            {shapes.map((shape) => {
              const bounds = shapeBounds(shape);
              const isSelected = Boolean(shapesState.selected[shape.id]);

              return (
                <div key={shape.id}>
                  {renderShape(shape)}
                  <div
                    className={cn(
                      "absolute cursor-move rounded-md border border-transparent",
                      isSelected && "border-primary/70 bg-primary/5"
                    )}
                    style={{
                      left: bounds.x - 4,
                      top: bounds.y - 4,
                      width: bounds.w + 8,
                      height: bounds.h + 8,
                    }}
                    onPointerDown={(event) => startShapeDrag(event, shape)}
                  />
                </div>
              );
            })}
          </div>
          <div className="pointer-events-none absolute bottom-4 left-5 rounded-md border border-border bg-card/90 px-3 py-2 text-xs text-muted-foreground">
            X: {Math.round(viewport.translate.x)} Y: {Math.round(viewport.translate.y)} | 28px Grid
          </div>
        </section>

        <aside className="flex min-h-0 flex-col border-l border-border bg-card">
          <section className="border-b border-border p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Properties</p>
              <span className="text-xs capitalize text-muted-foreground">{selectedShape ? selectedShape.type : "None"}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <label className="space-y-1.5 text-muted-foreground">
                X
                <div className="rounded-md border border-border bg-background px-3 py-2 text-right text-foreground">320</div>
              </label>
              <label className="space-y-1.5 text-muted-foreground">
                Y
                <div className="rounded-md border border-border bg-background px-3 py-2 text-right text-foreground">120</div>
              </label>
              <label className="space-y-1.5 text-muted-foreground">
                Width
                <div className="rounded-md border border-border bg-background px-3 py-2 text-right text-foreground">1440</div>
              </label>
              <label className="space-y-1.5 text-muted-foreground">
                Height
                <div className="rounded-md border border-border bg-background px-3 py-2 text-right text-foreground">900</div>
              </label>
            </div>
          </section>

          <section className="min-h-0 overflow-y-auto border-b border-border p-3">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">AI Generation</p>
              <Sparkles className="size-4 text-primary" />
            </div>
            <p className="mb-2 text-xs text-muted-foreground">Context Images</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid aspect-square place-items-center rounded-md border border-dashed border-border bg-muted/50 text-center text-xs text-muted-foreground">
                <div>
                  <ImagePlus className="mx-auto mb-2 size-5" />
                  Upload
                </div>
              </div>
              <div className="aspect-square rounded-md border border-border bg-muted" />
            </div>
            <label className="mt-4 block space-y-2 text-xs text-muted-foreground">
              Prompt Input
              <textarea
                className="min-h-20 w-full resize-none rounded-md border border-border bg-background p-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                placeholder="Describe the desired aesthetic, component style, and color palette..."
                suppressHydrationWarning
              />
            </label>
            <Button className="mt-4 h-10 w-full rounded-md">
              <Sparkles className="size-4" />
              Generate Modern UI
            </Button>
          </section>

          <section className="mt-auto border-t border-border p-3">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Code Export</p>
              <Code2 className="size-4 text-muted-foreground" />
            </div>
            <div className="rounded-md border border-border bg-background p-3 text-xs leading-5 text-muted-foreground">
              <span className="text-primary">Tailwind + React</span>
              <br />
              {`<div className="bg-black..." />`}
            </div>
            <Button variant="outline" className="mt-3 h-9 w-full rounded-md">
              <Copy className="size-4" />
              Copy JSX
            </Button>
          </section>
        </aside>
      </div>
    </main>
  );
}