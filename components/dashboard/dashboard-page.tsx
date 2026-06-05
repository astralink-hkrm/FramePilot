"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { FileText, LogOut, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { AiUsagePill } from "@/components/ai/usage-pill";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSignOut } from "@/hooks/use-sign-out";
import { useProjects } from "@/lib/use-projects";

function projectGradient(projectNumber: number) {
  const gradients = [
    "linear-gradient(135deg, #ff6b8a 0%, #ffb86c 58%, #ffe66d 100%)",
    "linear-gradient(135deg, #ffd7c7 0%, #ffb6a8 56%, #f7d8bd 100%)",
    "linear-gradient(135deg, #8fd3f4 0%, #84fab0 52%, #f6d365 100%)",
    "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 48%, #fad0c4 100%)",
    "linear-gradient(135deg, #1f2937 0%, #0f766e 58%, #a7f3d0 100%)",
    "linear-gradient(135deg, #c7d2fe 0%, #60a5fa 55%, #22d3ee 100%)",
  ];

  return gradients[(projectNumber - 1) % gradients.length];
}

function relativeDate(timestamp: number) {
  const day = 1000 * 60 * 60 * 24;
  const diff = Math.max(0, Math.floor((Date.now() - timestamp) / day));

  if (diff === 0) return "Today";
  if (diff === 1) return "1 day ago";
  return `${diff} days ago`;
}


export function DashboardPage() {
  const router = useRouter();
  const { projects, isLoading, createProject } = useProjects();
  const { handleSignOut, isLoading: isSigningOut } = useSignOut();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const filteredProjects = useMemo(() => {
    const source = projects ?? [];
    const term = query.trim().toLowerCase();

    if (!term) return source;

    return source.filter((project) =>
      [project.name, project.description ?? "", ...(project.tags ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [projects, query]);

  const onCreate = async () => {
    setIsCreating(true);

    try {
      const projectId = await createProject({
        name,
        description: description.trim() || undefined,
      });
      setOpen(false);
      setName("");
      setDescription("");
      toast.success("Project created");
      router.push(`/dashboard/projects/${projectId}`);
    } catch (error) {
      console.error(error);
      toast.error("Could not create project");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <main suppressHydrationWarning className="min-h-svh bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="grid size-8 place-items-center rounded-md border border-border bg-muted text-sm font-semibold text-foreground">
              S
            </div>
            <div>
              <p className="text-sm font-semibold leading-none">S2C</p>
              <p className="mt-1 text-xs text-muted-foreground">Design workspace</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <AiUsagePill />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-foreground">Account</p>
              <p className="text-xs text-muted-foreground">Learning project</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="size-8 rounded-md border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Sign out"
              suppressHydrationWarning
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-8">
        <div className="flex flex-col gap-5 pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-foreground">Your Projects</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Manage your design projects and continue where you left off.
            </p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="h-9 rounded-md px-3">
                <Plus className="size-4" />
                New project
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-lg border-border bg-card text-card-foreground sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create project</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Start with a blank canvas and save viewport, shapes, and references.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="project-name">Name</Label>
                  <Input
                    id="project-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Landing page concept"
                    className="border-border bg-background text-foreground placeholder:text-muted-foreground"
                    suppressHydrationWarning
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-description">Description</Label>
                  <Textarea
                    id="project-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Short project brief"
                    className="min-h-24 border-border bg-background text-foreground placeholder:text-muted-foreground"
                    suppressHydrationWarning
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  className="rounded-md"
                  onClick={onCreate}
                  disabled={isCreating}
                  suppressHydrationWarning
                >
                  {isCreating ? "Creating" : "Create and open"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-5 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search projects"
              className="h-9 rounded-md border-border bg-background pl-9 text-foreground placeholder:text-muted-foreground"
              suppressHydrationWarning
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Loading" : `${filteredProjects.length} project${filteredProjects.length === 1 ? "" : "s"}`}
          </p>
        </div>

        <div className="mt-6 grid max-w-5xl gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading &&
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="space-y-3">
                <div className="aspect-[1.42] animate-pulse rounded-md border border-border bg-card" />
                <div className="h-4 w-36 animate-pulse rounded bg-muted" />
                <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              </div>
            ))}

          {!isLoading && filteredProjects.length === 0 && (
            <div className="col-span-full grid min-h-72 place-items-center rounded-lg border border-dashed border-border bg-card p-10 text-center">
              <div className="max-w-sm">
                <div className="mx-auto grid size-11 place-items-center rounded-md border border-border bg-muted">
                  <FileText className="size-5 text-muted-foreground" />
                </div>
                <h2 className="mt-4 text-base font-semibold">No projects yet</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Create a project to open the canvas workspace.
                </p>
                <Button className="mt-5 h-9 rounded-md px-4" onClick={() => setOpen(true)}>
                  <Plus className="size-4" />
                  Create project
                </Button>
              </div>
            </div>
          )}

          {filteredProjects.map((project) => (
            <Link
              key={project._id}
              href={`/dashboard/projects/${project._id}`}
              prefetch={false}
              className="group block min-w-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div
                className="relative aspect-[1.42] overflow-hidden rounded-md border border-white/10 transition duration-200 group-hover:-translate-y-0.5 group-hover:border-white/25"
                style={{ background: projectGradient(project.projectNumber) }}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.9)_0,rgba(255,255,255,0.76)_7%,transparent_15%),linear-gradient(135deg,rgba(255,255,255,0.18),transparent_42%,rgba(0,0,0,0.1))]" />
                <div className="absolute inset-0 grid place-items-center">
                  <div className="size-9 rounded-full bg-white/80 shadow-[0_0_32px_rgba(255,255,255,0.55)]" />
                </div>
              </div>
              <div className="mt-2 min-w-0">
                <h2 className="truncate text-xs font-medium leading-none text-foreground">{project.name || `Project ${project.projectNumber}`}</h2>
                <p className="mt-1 text-[11px] leading-none text-muted-foreground">{relativeDate(project.lastModified)}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
