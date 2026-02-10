import { Router, type IRouter } from "express";
import { verifyMagicLink } from "../services/auth/magicLinkVerifier.js";

export const authRouter: IRouter = Router();

// GET /auth/verify?token=xxx — verify magic link token, set session
authRouter.get("/verify", async (req, res) => {
  const token = req.query["token"] as string | undefined;

  if (!token) {
    res.status(400).json({ error: "Missing token parameter" });
    return;
  }

  const ip = req.ip || req.socket.remoteAddress;
  const user = await verifyMagicLink(token, ip);

  if (!user) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  req.session.userId = user.id;
  res.redirect("/preferences");
});
