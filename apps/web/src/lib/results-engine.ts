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
  finishedJudges: Array<{ id: string; name: string }>;
  allJudges: Array<{ id: string; name: string }>;
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
  // Fetch all data upfront in parallel to avoid N+1 queries
  const [scores, submissions, teams, criteria, judges, event, tracks] = await Promise.all([
    prisma.score.findMany({ where: { eventId } }),
    prisma.scoreSubmission.findMany({ where: { eventId } }),
    prisma.team.findMany({ where: { eventId } }),
    prisma.criterion.findMany({ where: { eventId } }),
    prisma.judge.findMany({ where: { eventId } }),
    prisma.event.findUnique({ where: { id: eventId } }),
    prisma.track.findMany({ where: { eventId } }),
  ]);

  if (!event) throw new Error("Event not found");

  const config = event.configJson as any;
  const tiebreaker = config.results?.tiebreaker ?? "higher_avg";
  const outlierThreshold = config.moderation?.outlier_threshold ?? 1.5;

  // Build lookup maps for O(1) access instead of DB joins
  const trackMap = new Map<string, any>(tracks.map((t: any) => [t.id, t]));
  const criterionMap = new Map<string, any>(criteria.map((c: any) => [c.id, c]));
  const judgeMap = new Map<string, any>(judges.map((j: any) => [j.id, j]));

  // Group scores by team
  const teamScoresMap = new Map<string, any[]>();
  for (const s of scores) {
    const arr = teamScoresMap.get(s.teamId) ?? [];
    arr.push(s);
    teamScoresMap.set(s.teamId, arr);
  }

  // Group submissions by team
  const teamSubmissionsMap = new Map<string, any[]>();
  for (const sub of submissions) {
    const arr = teamSubmissionsMap.get(sub.teamId) ?? [];
    arr.push(sub);
    teamSubmissionsMap.set(sub.teamId, arr);
  }

  const teamResults: ComputedTeamResult[] = [];

  for (const team of teams) {
    const trackInfo = team.trackId ? trackMap.get(team.trackId) : null;
    const teamScoreList = teamScoresMap.get(team.id) ?? [];
    const uniqueJudgeIds = new Set(teamScoreList.map((s: any) => s.judgeId));
    const judgeCount = uniqueJudgeIds.size;

    if (judgeCount === 0) {
      teamResults.push({
        teamId: team.id, teamName: team.name, trackId: team.trackId,
        trackName: trackInfo?.name ?? null, score: null, judgeCount: 0,
        criteriaBreakdown: [], outlierFlags: [],
        finishedJudges: [], allJudges: [],
      });
      continue;
    }

    // Group scores by criterion
    const byCriterion = new Map<string, any[]>();
    for (const s of teamScoreList) {
      const arr = byCriterion.get(s.criterionId) ?? [];
      arr.push(s);
      byCriterion.set(s.criterionId, arr);
    }

    // Group scores by judge for weighted total
    const byJudge = new Map<string, any[]>();
    for (const s of teamScoreList) {
      const arr = byJudge.get(s.judgeId) ?? [];
      arr.push(s);
      byJudge.set(s.judgeId, arr);
    }

    let totalScoreSum = 0;
    byJudge.forEach((judgeScores) => {
      const judgeTotal = judgeScores.reduce((sum: number, s: any) => {
        const crit = criterionMap.get(s.criterionId);
        if (!crit) return sum;
        const weight = Number(crit.weight);
        const maxScore = Number(crit.maxScore);
        const valOutOf100 = maxScore > 0 ? (Number(s.value) / maxScore) * 100 : 0;
        return sum + valOutOf100 * weight;
      }, 0);
      totalScoreSum += judgeTotal;
    });
    const totalScore = byJudge.size > 0 ? (totalScoreSum / byJudge.size) : 0;

    const criteriaBreakdown: ComputedTeamResult["criteriaBreakdown"] = [];
    const outlierFlags: ComputedTeamResult["outlierFlags"] = [];

    byCriterion.forEach((critScores, criterionId) => {
      const criterion = criterionMap.get(criterionId);
      if (!criterion) return;
      const maxScore = criterion.maxScore;
      const weight = Number(criterion.weight);
      const avgScore = critScores.reduce((sum: number, s: any) => sum + Number(s.value), 0) / critScores.length;
      const weightedScore = maxScore > 0 ? (avgScore / maxScore) * weight * 100 : 0;

      criteriaBreakdown.push({ criterionId, criterionName: criterion.name, weightedScore, avgScore, maxScore });

      const values = critScores.map((s: any) => Number(s.value));
      const mean = values.reduce((a: number, b: number) => a + b, 0) / values.length;
      const variance = values.reduce((sum: number, v: number) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      if (stdDev > 0) {
        for (const s of critScores) {
          const deviation = Math.abs(Number(s.value) - mean) / stdDev;
          if (deviation > outlierThreshold) {
            const judge = judgeMap.get(s.judgeId);
            outlierFlags.push({ judgeId: s.judgeId, judgeName: judge?.name ?? "Unknown", criterionId, deviation: Math.round(deviation * 100) / 100 });
          }
        }
      }
    });

    // Build judge lists from map lookups
    const allJudges = Array.from(uniqueJudgeIds).map(id => {
      const judge = judgeMap.get(id);
      return { id, name: judge?.name ?? "Unknown" };
    });

    const subList = teamSubmissionsMap.get(team.id) ?? [];
    const finishedJudges = subList.map((sub: any) => {
      const judge = judgeMap.get(sub.judgeId);
      return { id: sub.judgeId, name: judge?.name ?? "Unknown Judge" };
    });

    teamResults.push({
      teamId: team.id, teamName: team.name, trackId: team.trackId,
      trackName: trackInfo?.name ?? null,
      score: Math.round(totalScore * 100) / 100, judgeCount,
      criteriaBreakdown, outlierFlags,
      finishedJudges, allJudges,
    });
  }

  const trackRankings: Record<string, ComputedTeamResult[]> = {};
  const trackIds = [...tracks.map((t: any) => t.id), "null"];

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
