import bcrypt from "bcrypt";
import { prisma } from "../../config/database.js";
import type { User } from "../../../generated/prisma/client.js";

export async function verifyMagicLink(
  token: string,
  ipAddress?: string
): Promise<User | null> {
  // Find all unexpired, unused magic links
  const candidates = await prisma.magicLink.findMany({
    where: {
      usedAt: null,
      expiresAt: { gt: new Date() },
      purpose: "signin",
    },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });

  for (const link of candidates) {
    const matches = await bcrypt.compare(token, link.tokenDigest);
    if (matches) {
      // Mark as used
      await prisma.magicLink.update({
        where: { id: link.id },
        data: {
          usedAt: new Date(),
          ipAddress: ipAddress || null,
        },
      });
      return link.user;
    }
  }

  return null;
}
