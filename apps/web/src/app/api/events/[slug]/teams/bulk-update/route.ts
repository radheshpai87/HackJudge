import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@hackjudge/db";
import { requireEventOwner, AuthError } from "@/lib/auth";
import { auditLog } from "@/lib/audit-log";
import { success, apiError } from "@/lib/api-response";

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/events/[slug]/teams/bulk-update
 * Non-destructive bulk update of team metadata (table numbers).
 * Does NOT reset scores, submissions, or judge sessions.
 */
export async function PATCH(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { user, eventId } = await requireEventOwner(req, params.slug);
    const event = await prisma.event.findUnique({ where: { slug: params.slug } });
    if (!event) return apiError("EVENT_NOT_FOUND", "Event not found", null, 404);

    const body = await req.json();
    const schema = z.object({
      teams: z.array(z.object({
        id: z.string(),
        tableNumber: z.string(),
      })),
    });

    const parse = schema.safeParse(body);
    if (!parse.success) return apiError("VALIDATION_ERROR", "Invalid request", parse.error.format());

    let updated = 0;
    for (const entry of parse.data.teams) {
      const team = await prisma.team.findFirst({ where: { id: entry.id, eventId: event.id } });
      if (team) {
        await prisma.team.update({
          where: { id: team.id },
          data: { tableNumber: entry.tableNumber },
        });
        updated++;
      }
    }

    // Also update configJson so the config page reflects changes
    const cfg = event.configJson as any;
    if (cfg.teams && Array.isArray(cfg.teams)) {
      const updateMap = new Map(parse.data.teams.map(t => [t.id, t.tableNumber]));
      cfg.teams = cfg.teams.map((t: any) => {
        const newTable = updateMap.get(t.id);
        return newTable !== undefined ? { ...t, table_number: newTable } : t;
      });
      await prisma.event.update({
        where: { slug: params.slug },
        data: { configJson: cfg },
      });
    }

    await auditLog(event.id, user.id, "organizer", "teams_table_numbers_updated", { count: updated });
    return success({ updated });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.code, error.message, null, error.status);
    }
    console.error("Bulk update teams error:", error);
    return apiError("INTERNAL_ERROR", "Failed to update table numbers", null, 500);
  }
}
