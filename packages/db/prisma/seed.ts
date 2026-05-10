import { PrismaClient } from "@prisma/client";
import { parseConfig } from "@hackjudge/config-engine";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

async function main() {
  const templatePath = join(__dirname, "../../cli/templates/event.yaml");
  const config = await parseConfig(templatePath);

  const event = await prisma.event.create({
    data: {
      slug: config.event.slug,
      configJson: config as unknown as any,
      configHash: "demo-hash",
      status: "active",
    },
  });

  const trackMap = new Map<string, string>();
  for (const track of config.tracks) {
    const created = await prisma.track.create({
      data: { eventId: event.id, name: track.name, description: track.description },
    });
    trackMap.set(track.id, created.id);
  }

  for (const criterion of config.criteria) {
    await prisma.criterion.create({
      data: {
        eventId: event.id,
        trackId: criterion.track_id ? trackMap.get(criterion.track_id) : null,
        name: criterion.name,
        weight: criterion.weight,
        maxScore: criterion.max_score,
        scoringType: criterion.scoring_type,
        rubric: criterion.rubric as any,
      },
    });
  }

  for (const team of config.teams) {
    await prisma.team.create({
      data: {
        eventId: event.id,
        name: team.name,
        trackId: team.track_id ? trackMap.get(team.track_id) : null,
        tableNumber: team.table_number,
        members: team.members ?? [],
      },
    });
  }

  for (const judge of config.judges) {
    const created = await prisma.judge.create({
      data: {
        eventId: event.id,
        name: judge.name,
        email: judge.email,
      },
    });
    if (Array.isArray(judge.tracks)) {
      for (const tid of judge.tracks) {
        await prisma.judgeTrack.create({
          data: { judgeId: created.id, trackId: trackMap.get(tid)! },
        });
      }
    }
  }

  console.log("Seeded demo event:", event.slug);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
