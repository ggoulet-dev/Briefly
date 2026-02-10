import Handlebars from "handlebars";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { transporter } from "./transporter.js";
import { env } from "../../config/env.js";
import type { User } from "../../../generated/prisma/client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatesDir = resolve(__dirname, "../../templates");

function loadTemplate(name: string): Handlebars.TemplateDelegate {
  const content = readFileSync(resolve(templatesDir, name), "utf-8");
  return Handlebars.compile(content);
}

export async function sendMagicLinkEmail(
  user: User,
  token: string
): Promise<void> {
  const htmlTemplate = loadTemplate("magicLink.html.hbs");

  const verifyUrl = `${env.appUrl}/auth/verify?token=${token}`;

  const html = htmlTemplate({
    userName: user.name || user.email,
    verifyUrl,
    appUrl: env.appUrl,
  });

  await transporter.sendMail({
    from: env.smtpFrom,
    to: user.email,
    subject: "Sign in to Briefly",
    html,
    text: `Sign in to Briefly by visiting: ${verifyUrl}\n\nThis link expires in 15 minutes.`,
  });
}
