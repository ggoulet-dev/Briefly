import Handlebars from "handlebars";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { transporter } from "./transporter.js";
import { env } from "../../config/env.js";
import type { CompiledBriefing } from "../briefings/compiler.js";
import type { User } from "../../../generated/prisma/client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatesDir = resolve(__dirname, "../../templates");

function loadTemplate(name: string): Handlebars.TemplateDelegate {
  const content = readFileSync(resolve(templatesDir, name), "utf-8");
  return Handlebars.compile(content);
}

export async function sendBriefingEmail(
  user: User,
  briefing: CompiledBriefing
): Promise<void> {
  const htmlTemplate = loadTemplate("briefing.html.hbs");
  const textTemplate = loadTemplate("briefing.text.hbs");

  const date = new Date().toLocaleDateString("en-CA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const context = {
    userName: user.name || user.email,
    date,
    sections: briefing.sections,
    unsubscribeUrl: `${env.appUrl}/preferences`,
    appUrl: env.appUrl,
  };

  const html = htmlTemplate(context);
  const text = textTemplate(context);

  await transporter.sendMail({
    from: env.smtpFrom,
    to: user.email,
    subject: `Briefly — Your briefing for ${date}`,
    html,
    text,
  });
}
