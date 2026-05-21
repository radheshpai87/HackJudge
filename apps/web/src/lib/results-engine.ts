import { prisma } from "@hackjudge/db";

interface ComputedTeamResult {
  teamId: string;
  teamName: string;
  trackId: string | null;
  trackName: string | null;
  score: number | null;
  judgeCount: number;
  criteriaBreakdown: Array<{
    criterionId: string;
    criterionName: string;
    weightedScore: number;
    avgScore: number | null;
    maxScore: number;
  }>;
  outlierFlags: Array<{
    judgeId: string;
    judgeName: string;
    criterionId: string;
    deviation: number;
  }>;
}

export interface ResultSnapshot {
  eventId: string;
  generatedAt: string;
  teams: ComputedTeamResult[];
  trackRankings: Record<string, ComputedTeamResult[]>;
  overallRanking: ComputedTeamResult[];
  tiebreakRequired: boolean;
  tiedTeams: Array<{ teamIds: string[]; trackId: string | null }>;
}

export async function computeResults(eventId: string): Promise<ResultSnapshot> {
  const scores = await prisma.score.findMany({
    where: { team: { eventId } },
    include: { criterion: true, team: true, judge: true },
  });

  const config = (await prisma.event.findUnique({ where: { id: eventId } }))!.configJson as any;
  const tiebreaker = config.results?.tiebreaker ?? "higher_avg";
  const outlierThreshold = config.moderation?.outlier_threshold ?? 1.5;

  const teamScores = new Map<string, typeof scores>();
  for (const s of scores) {
    const arr = teamScores.get(s.teamId) ?? [];
    arr.push(s);
    teamScores.set(s.teamId, arr);
  }

  const teamResults: ComputedTeamResult[] = [];
  const teams = await prisma.team.findMany({ where: { eventId }, include: { track: true } });

  for (const team of teams) {
    const teamScoreList = teamScores.get(team.id) ?? [];
    const judges = new Set(teamScoreList.map((s) => s.judgeId));
    const judgeCount = judges.size;

    if (judgeCount === 0) {
      teamResults.push({
        teamId: team.id, teamName: team.name, trackId: team.trackId,
        trackName: team.track?.name ?? null, score: null, judgeCount: 0,
        criteriaBreakdown: [], outlierFlags: [],
      });
      continue;
    }

    const byCriterion = new Map<string, typeof scores>();
    for (const s of teamScoreList) {
      const arr = byCriterion.get(s.criterionId) ?? [];
      arr.push(s);
      byCriterion.set(s.criterionId, arr);
    }

    let totalScore = 0;
    const criteriaBreakdown: ComputedTeamResult["criteriaBreakdown"] = [];
    const outlierFlags: ComputedTeamResult["outlierFlags"] = [];

    byCriterion.forEach((critScores, criterionId) => {
      const criterion = critScores[0].criterion;
      const maxScore = criterion.maxScore;
      const weight = Number(criterion.weight);
      const avgScore = critScores.reduce((sum, s) => sum + Number(s.value), 0) / critScores.length;
      const weightedScore = (avgScore / maxScore) * weight * 100;
      totalScore += weightedScore;

      criteriaBreakdown.push({ criterionId, criterionName: criterion.name, weightedScore, avgScore, maxScore });

      const values = critScores.map((s) => Number(s.value));
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      if (stdDev > 0) {
        for (const s of critScores) {
          const deviation = Math.abs(Number(s.value) - mean) / stdDev;
          if (deviation > outlierThreshold) {
            outlierFlags.push({ judgeId: s.judgeId, judgeName: s.judge.name, criterionId, deviation: Math.round(deviation * 100) / 100 });
          }
        }
      }
    });

    teamResults.push({
      teamId: team.id, teamName: team.name, trackId: team.trackId,
      trackName: team.track?.name ?? null,
      score: Math.round(totalScore * 100) / 100, judgeCount,
      criteriaBreakdown, outlierFlags,
    });
  }

  const trackRankings: Record<string, ComputedTeamResult[]> = {};
  const tracks = await prisma.track.findMany({ where: { eventId } });
  const trackIds = [...tracks.map((t) => t.id), "null"];

  for (const tid of trackIds) {
    const filtered = teamResults.filter((t) => (tid === "null" ? t.trackId === null : t.trackId === tid));
    trackRankings[tid === "null" ? "overall" : tid] = sortTeams(filtered, tiebreaker);
  }

  const overallRanking = sortTeams(teamResults, tiebreaker);

  const tiedTeams: ResultSnapshot["tiedTeams"] = [];
  if (tiebreaker === "manual") {
    for (const tid of trackIds) {
      const filtered = teamResults.filter((t) => (tid === "null" ? t.trackId === null : t.trackId === tid));
      const scoreGroups = new Map<number | null, string[]>();
      for (const t of filtered) {
        if (t.score === null) continue;
        const arr = scoreGroups.get(t.score) ?? [];
        arr.push(t.teamId);
        scoreGroups.set(t.score, arr);
      }
      scoreGroups.forEach((teamIds) => {
        if (teamIds.length > 1) tiedTeams.push({ teamIds, trackId: tid === "null" ? null : tid });
      });
    }
  }

  return { eventId, generatedAt: new Date().toISOString(), teams: teamResults, trackRankings, overallRanking, tiebreakRequired: tiedTeams.length > 0, tiedTeams };
}

function sortTeams(teams: ComputedTeamResult[], tiebreaker: string): ComputedTeamResult[] {
  return [...teams].sort((a, b) => {
    if (a.score === null && b.score === null) return 0;
    if (a.score === null) return 1;
    if (b.score === null) return -1;
    if (b.score !== a.score) return b.score - a.score;
    if (tiebreaker === "more_judges") return b.judgeCount - a.judgeCount;
    if (tiebreaker === "manual") return 0;
    return b.score - a.score;
  });
}
