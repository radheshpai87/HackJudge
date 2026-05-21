import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@hackjudge/db";
import { signAccessToken, signRefreshToken } from "@/lib/jwt";
import { success, apiError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const schema = z.object({
      email: z.string().email("Invalid email"),
      password: z.string().min(1, "Password is required"),
    });
    const parse = schema.safeParse(body);
    if (!parse.success) {
      return apiError("VALIDATION_ERROR", "Invalid request", parse.error.format());
    }

    const { email, password } = parse.data;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (!user || !user.passwordHash) {
      return apiError("UNAUTHORIZED", "Invalid email or password", null, 401);
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return apiError("UNAUTHORIZED", "Invalid email or password", null, 401);
    }

    const accessToken = signAccessToken({ id: user.id, role: user.role, email: user.email });
    const refreshToken = signRefreshToken({ id: user.id, role: user.role, email: user.email });

    return success({
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (e: any) {
    console.error(e);
    return apiError("INTERNAL_ERROR", e.message || "Internal error", null, 500);
  }
}
