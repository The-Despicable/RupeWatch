import { prisma } from "@/lib/db";
import { auth, currentUser } from "@clerk/nextjs/server";

/**
 * Returns the DB user record for the currently authenticated Clerk user.
 * Creates the user in the database if this is their first visit.
 * Throws if not authenticated.
 */
export async function getOrCreateDbUser() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Fast path — user already exists
  const existing = await prisma.user.findUnique({
    where: { clerkId: userId },
  });
  if (existing) return existing;

  // First visit — fetch Clerk profile and persist
  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error("Clerk user not found");

  const email =
    clerkUser.emailAddresses[0]?.emailAddress ?? `${userId}@unknown.com`;

  return prisma.user.create({
    data: {
      clerkId: userId,
      email,
      phone: clerkUser.phoneNumbers[0]?.phoneNumber ?? null,
    },
  });
}
