import { setServerSession } from "../../helpers/getSetServerSession";
import { db } from "../../helpers/db";
import { randomBytes, randomUUID } from "crypto";
import bcrypt from "bcryptjs";

export async function handle(request: Request) {
  try {
    const { username, password } = await request.json();

    const expectedUsername = process.env.ADMIN_USERNAME;
    const expectedHash = process.env.ADMIN_PASSWORD_HASH;

    if (!expectedUsername || !expectedHash) {
      return Response.json({ error: "Admin login not configured" }, { status: 503 });
    }

    if (username !== expectedUsername) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, expectedHash);
    if (!valid) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Find or create admin user in DB
    let user = await db
      .selectFrom("users")
      .selectAll()
      .where("email", "=", username + "@admin.local")
      .limit(1)
      .executeTakeFirst();

    if (!user) {
      const inserted = await db
        .insertInto("users")
        .values({
          email: username + "@admin.local",
          displayName: username,
          role: "admin",
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any)
        .returning("id")
        .executeTakeFirstOrThrow();
      user = await db
        .selectFrom("users")
        .selectAll()
        .where("id", "=", inserted.id as any)
        .limit(1)
        .executeTakeFirstOrThrow();
    }

    // Create a session
    const sessionId = randomBytes(32).toString("hex");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await db
      .insertInto("sessions")
      .values({
        id: sessionId,
        userId: user.id,
        createdAt: now,
        lastAccessed: now,
        expiresAt,
      } as any)
      .execute();

    const response = Response.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role ?? "admin",
      },
    });

    await setServerSession(response, {
      id: sessionId,
      createdAt: now.getTime(),
      lastAccessed: now.getTime(),
    });

    return response;
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
