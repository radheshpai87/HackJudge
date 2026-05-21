import * as nodemailerPkg from "nodemailer";

const nodemailer = (nodemailerPkg as any).default ?? nodemailerPkg;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "localhost",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

export async function sendMagicLink(email: string, token: string, eventSlug: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || "http://localhost:3000";
  const url = `${appUrl}/auth/verify?token=${token}&slug=${eventSlug}`;

  if (process.env.NODE_ENV !== "production" || !process.env.SMTP_HOST) {
    console.log("\n========== MAGIC LINK (dev) ==========");
    console.log(`To:    ${email}`);
    console.log(`Event: ${eventSlug}`);
    console.log(`Token: ${token}`);
    console.log(`URL:   ${url}`);
    console.log("======================================\n");
    return;
  }

  await transporter.sendMail({
    from: process.env.FROM_EMAIL || "noreply@hackjudge.dev",
    to: email,
    subject: "Your HackJudge magic link",
    html: `<p>Click to sign in: <a href="${url}">${url}</a></p>`,
  });
}
