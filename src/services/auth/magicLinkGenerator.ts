import { randomBytes } from "crypto";
import bcrypt from "bcrypt";
import { prisma } from "../../config/database.js";
import type { User } from "../../../generated/prisma/client.js";

const TOKEN_BYTES = 32;
const EXPIRY_MINUTES = 15;
const BCRYPT_ROUNDS = 10;

export async function generateMagicLink(
  user: User,
  purpose = "signin"
): Promise<string> {
  const token = randomBytes(TOKEN_BYTES).toString("hex");
  const tokenDigest = await bcrypt.hash(token, BCRYPT_ROUNDS);

  const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000);

  await prisma.magicLink.create({
    data: {
      userId: user.id,
      tokenDigest,
      purpose,
      expiresAt,
    },
  });

  return token;
}
