/**
 * Общие 32 признака для Neuro (TensorFlow, Random Forest, XGBoost).
 * Один источник правды: порядок и формулы совпадают между вкладками.
 */

export const NEURO_FEATURE_DIM = 32;

export function safe(val, fallback = 0) {
  return val != null && isFinite(val) && !isNaN(val) ? val : fallback;
}

export function getLeagueAvgTotal(leagueId, seasons) {
  const season = seasons?.find((s) => s.leagueId === leagueId && s.isActive);
  return season?.avgTotalCorners || 9.5;
}

/** Линия тотала для сравнения ТБ/ТМ (АПЛ 10.5, иначе округление среднего сезона) */
export function getLineTotalForLeague(leagueId, seasons, leagues) {
  const season = seasons?.find((s) => s.leagueId === leagueId && s.isActive);
  const league = leagues?.find((l) => l.id === leagueId);
  if (league?.name === 'АПЛ') return 10.5;
  const avg = season?.avgTotalCorners || 9.5;
  return Math.ceil(avg * 2) / 2;
}

export function getLastMatches(allMatches, teamId, beforeDate, count) {
  return allMatches
    .filter((m) => (m.homeTeamId === teamId || m.awayTeamId === teamId) && m.date < beforeDate)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, count);
}

export function calculateFeatures(matches, teamId) {
  if (!matches.length) {
    return {
      avgCornersFor: 5,
      avgCornersAgainst: 4.5,
      cornersTrend: 0,
      avgXG: 1.2,
      avgPossession: 50,
      avgShotsInside: 6,
      formPoints: 0,
      matchesPlayed: 0,
      avgCornersForHome: 5,
      avgCornersAgainstHome: 4.5,
      avgCornersForAway: 5,
      avgCornersAgainstAway: 4.5,
      avgCorners1H: 2.5,
      avgCorners2H: 2.5,
      ratio1H: 0.5,
      avgCorners1HHome: 2.5,
      avgCorners2HHome: 2.5,
      avgCorners1HAway: 2.5,
      avgCorners2HAway: 2.5,
    };
  }

  let tf = 0;
  let ta = 0;
  let cfh = 0;
  let cfa = 0;
  let cah = 0;
  let caa = 0;
  let hc = 0;
  let ac = 0;
  let tx = 0;
  let tp = 0;
  let ts = 0;
  const ct = [];
  let pt = 0;
  let c1 = 0;
  let c2 = 0;
  let c1h = 0;
  let c2h = 0;
  let c1a = 0;
  let c2a = 0;

  matches.forEach((m) => {
    const isHome = m.homeTeamId === teamId;
    const teamScore = isHome ? m.homeScore || 0 : m.awayScore || 0;
    const oppScore = isHome ? m.awayScore || 0 : m.homeScore || 0;
    const cornersFor = isHome ? m.homeCorners || 0 : m.awayCorners || 0;
    const cornersAgainst = isHome ? m.awayCorners || 0 : m.homeCorners || 0;
    const corners1H = isHome ? m.homeCorners1H || 0 : m.awayCorners1H || 0;
    const corners2H = isHome ? m.homeCorners2H || 0 : m.awayCorners2H || 0;
    c1 += corners1H;
    c2 += corners2H;
    if (isHome) {
      cfh += cornersFor;
      cah += cornersAgainst;
      c1h += corners1H;
      c2h += corners2H;
      hc++;
    } else {
      cfa += cornersFor;
      caa += cornersAgainst;
      c1a += corners1H;
      c2a += corners2H;
      ac++;
    }
    tf += cornersFor;
    ta += cornersAgainst;
    ct.push(cornersFor);
    tx += isHome ? m.homeXG || 1.2 : m.awayXG || 1.2;
    tp += isHome ? m.homePossession || 50 : m.awayPossession || 50;
    ts += isHome ? m.homeShotsInsideBox || 6 : m.awayShotsInsideBox || 6;
    if (teamScore > oppScore) pt += 3;
    else if (teamScore === oppScore) pt += 1;
  });

  const n = matches.length;
  const half = Math.max(1, Math.floor(n / 2));
  const firstHalfAvg = ct.slice(0, half).reduce((a, b) => a + b, 0) / half;
  const secondHalfAvg = ct.slice(half).reduce((a, b) => a + b, 0) / Math.max(1, n - half);
  const rawTrend = firstHalfAvg - secondHalfAvg;
  const normalizedTrend = Math.max(-3, Math.min(3, rawTrend));

  return {
    avgCornersFor: tf / n,
    avgCornersAgainst: ta / n,
    cornersTrend: normalizedTrend,
    avgXG: tx / n,
    avgPossession: tp / n,
    avgShotsInside: ts / n,
    formPoints: pt,
    matchesPlayed: n,
    avgCornersForHome: hc > 0 ? cfh / hc : tf / n,
    avgCornersAgainstHome: hc > 0 ? cah / hc : ta / n,
    avgCornersForAway: ac > 0 ? cfa / ac : tf / n,
    avgCornersAgainstAway: ac > 0 ? caa / ac : ta / n,
    avgCorners1H: c1 / n,
    avgCorners2H: c2 / n,
    ratio1H: tf > 0 ? c1 / tf : 0.5,
    avgCorners1HHome: hc > 0 ? c1h / hc : c1 / n,
    avgCorners2HHome: hc > 0 ? c2h / hc : c2 / n,
    avgCorners1HAway: ac > 0 ? c1a / ac : c1 / n,
    avgCorners2HAway: ac > 0 ? c2a / ac : c2 / n,
  };
}

export function buildFeatures(homeStats, awayStats, round, leagueAvgTotal) {
  return [
    safe(homeStats.avgCornersFor, 5),
    safe(homeStats.avgCornersAgainst, 4.5),
    safe(homeStats.cornersTrend, 0),
    safe(homeStats.avgXG, 1.2),
    safe(homeStats.avgPossession, 50),
    safe(homeStats.avgShotsInside, 6),
    safe(homeStats.formPoints / 3, 0),
    safe(awayStats.avgCornersFor, 4.5),
    safe(awayStats.avgCornersAgainst, 5),
    safe(awayStats.cornersTrend, 0),
    safe(awayStats.avgXG, 1.1),
    safe(awayStats.avgPossession, 50),
    safe(awayStats.avgShotsInside, 5.5),
    safe(awayStats.formPoints / 3, 0),
    safe(homeStats.avgCornersForHome, 5),
    safe(homeStats.avgCornersAgainstHome, 4.5),
    safe(awayStats.avgCornersForAway, 4.5),
    safe(awayStats.avgCornersAgainstAway, 5),
    safe(homeStats.avgCorners1H, 2.5),
    safe(homeStats.avgCorners2H, 2.5),
    safe(homeStats.ratio1H, 0.5),
    safe(awayStats.avgCorners1H, 2.5),
    safe(awayStats.avgCorners2H, 2.5),
    safe(awayStats.ratio1H, 0.5),
    safe(homeStats.avgCorners1HHome, 2.5),
    safe(homeStats.avgCorners2HHome, 2.5),
    safe(awayStats.avgCorners1HAway, 2.5),
    safe(awayStats.avgCorners2HAway, 2.5),
    safe(round, 0),
    safe(homeStats.matchesPlayed, 10),
    safe(awayStats.matchesPlayed, 10),
    safe(leagueAvgTotal, 9.5),
  ];
}

/**
 * Хронологические примеры: с индекса 20, окно 12 матчей, минимум 5 в истории у каждой стороны.
 * @returns {{ features: number[], label: number, leagueId: string }[]}
 */
export function buildChronologicalTrainingExamples(matches, seasons) {
  const sortedMatches = [...(matches || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
  const examples = [];
  for (let i = 20; i < sortedMatches.length; i++) {
    const match = sortedMatches[i];
    const homePast = getLastMatches(sortedMatches, match.homeTeamId, match.date, 12);
    const awayPast = getLastMatches(sortedMatches, match.awayTeamId, match.date, 12);
    if (homePast.length < 5 || awayPast.length < 5) continue;

    const homeStats = calculateFeatures(homePast, match.homeTeamId);
    const awayStats = calculateFeatures(awayPast, match.awayTeamId);
    const leagueAvgTotal = getLeagueAvgTotal(match.leagueId, seasons);
    const round = match.round ? parseInt(match.round, 10) || 0 : 0;
    const features = buildFeatures(homeStats, awayStats, round, leagueAvgTotal);
    if (features.some((f) => isNaN(f) || !isFinite(f))) continue;

    examples.push({
      features,
      label: (match.homeCorners || 0) + (match.awayCorners || 0),
      leagueId: match.leagueId,
    });
  }
  return examples;
}

/**
 * Честная сигмоида для RF и XGBoost — без чужих ошибок
 */
export function calculateProbabilitySimple(expectedTotal, selectedTotal) {
  const diff = expectedTotal - selectedTotal;
  const probOver = Math.round(100 / (1 + Math.exp(-diff * 2)));
  return Math.min(95, Math.max(5, probOver));
}