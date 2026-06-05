import { inngest } from "./client";

export const autosaveRequested = inngest.createFunction(
  {
    id: "project-autosave-requested",
    name: "Project autosave requested",
    triggers: [{ event: "project/autosave.requested" }],
  },
  async ({ event, step }) => {
    const payload = await step.run("prepare autosave payload", async () => ({
      projectId: event.data.projectId,
      shapeCount: event.data.shapeCount,
      savedAt: event.data.savedAt,
    }));

    return payload;
  }
);

export const functions = [autosaveRequested];