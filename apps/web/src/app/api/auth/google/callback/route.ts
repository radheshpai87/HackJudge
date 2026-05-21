import { NextRequest } from "next/server";
import { prisma } from "@hackjudge/db";
import { signAccessToken, signRefreshToken } from "@/lib/jwt";
import { success, apiError } from "@/lib/api-response";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      return apiError("GOOGLE_AUTH_DENIED", `Google auth error: ${error}`, null, 400);
    }
    if (!code) {
      return apiError("MISSING_CODE", "Authorization code missing", null, 400);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return apiError("CONFIG_ERROR", "Google OAuth not configured", null, 500);
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || `http://localhost:3000`;
    const redirectUri = `${baseUrl}/api/auth/google/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      return apiError("GOOGLE_TOKEN_ERROR", tokenData.error_description || "Failed to exchange code", null, 500);
    }

    // Get user info
    const userRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userData = await userRes.json();
    if (!userRes.ok || !userData.email) {
      return apiError("GOOGLE_USER_ERROR", "Failed to fetch user info", null, 500);
    }

    // Upsert user
    const email = userData.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });

    let user;
    if (existing) {
      user = await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: userData.name || existing.name,
          image: userData.picture || existing.image,
          googleId: userData.id || existing.googleId,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email,
          name: userData.name || email.split("@")[0],
          image: userData.picture,
          googleId: userData.id,
          role: "organizer",
        },
      });
    }

    const accessToken = signAccessToken({ id: user.id, role: user.role, email: user.email });
    const refreshToken = signRefreshToken({ id: user.id, role: user.role, email: user.email });

    // Redirect to login page with tokens in query params (client will store them)
    const redirectUrl = new URL("/login", baseUrl);
    redirectUrl.searchParams.set("accessToken", accessToken);
    redirectUrl.searchParams.set("refreshToken", refreshToken);
    redirectUrl.searchParams.set("from", "google");

    return Response.redirect(redirectUrl.toString(), 302);
  } catch (e: any) {
    console.error(e);
    return apiError("INTERNAL_ERROR", e.message || "Internal error", null, 500);
  }
}
