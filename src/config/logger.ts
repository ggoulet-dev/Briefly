import winston from "winston";
import { env } from "./env.js";

export const logger = winston.createLogger({
  level: env.isDev ? "debug" : "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    env.isDev
      ? winston.format.combine(winston.format.colorize(), winston.format.simple())
      : winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});
