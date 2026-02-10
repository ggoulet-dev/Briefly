import type { Job } from "bullmq";
import { compileAllBriefings } from "../services/briefings/compiler.js";

export async function processCompileBriefings(_job: Job): Promise<void> {
  const compiled = await compileAllBriefings();
  console.log(`Compiled ${compiled} briefing(s).`);
}
