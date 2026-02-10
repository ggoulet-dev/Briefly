import express from "express";
import session from "express-session";
import { env } from "./config/env.js";
import { prisma } from "./config/database.js";
import { authRouter } from "./routes/auth.js";
import { preferencesRouter } from "./routes/preferences.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: !env.isDev,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/preferences", preferencesRouter);

const PORT = parseInt(process.env["PORT"] || "3000", 10);

app.listen(PORT, () => {
  console.log(`Briefly server running on port ${PORT}`);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
