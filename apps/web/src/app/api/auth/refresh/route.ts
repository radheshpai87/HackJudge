import { NextRequest } from "next/server";
import { z } from "zod";
import { signAccessToken, verifyRefreshToken } from "@/lib/jwt";
import { success, apiError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const schema = z.object({ refreshToken: z.string() });
    const parse = schema.safeParse(body);
    if (!parse.success) {
      return apiError("VALIDATION_ERROR", "Invalid request", parse.error.format());
    }

    try {
      const decoded = verifyRefreshToken(parse.data.refreshToken) as any;
      const accessToken = signAccessToken({
        id: decoded.id,
        judgeId: decoded.judgeId,
        eventId: decoded.eventId,
        role: decoded.role,
      });
      return success({ accessToken });
    } catch {
      return apiError("UNAUTHORIZED", "Invalid refresh token", null, 401);
    }
  } catch (e: any) {
    console.error(e);
    return apiError("INTERNAL_ERROR", e.message || "Internal error", null, 500);
  }
}
