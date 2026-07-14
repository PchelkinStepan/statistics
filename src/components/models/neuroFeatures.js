/**
 * Общие 84 признака для Neuro (TensorFlow, Random Forest, XGBoost).
 * 23 показателя × 2 команды + 23 × 2 тайма × 2 команды + служебные
 * Фильтрация матчей без новых полей при обучении.
 */

export const NEURO_FEATURE_DIM = 84;

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

/** Проверка наличия новых расширенных полей у матча */
export function hasExtendedData(match) {
  return (
    match.homeXGOT !== undefined ||
    match.awayXGOT !== undefined ||
    match.homeBlockedShots !== undefined ||
    match.awayBlockedShots !== undefined ||
    match.homeShotsOutsideBox !== undefined ||
    match.awayShotsOutsideBox !== undefined ||
    match.homeTouchesBox !== undefined ||
    match.awayTouchesBox !== undefined ||
    match.homeLongPassesAcc !== undefined ||
    match.awayLongPassesAcc !== undefined ||
    match.homeLongPasses !== undefined ||
    match.awayLongPasses !== undefined ||
    match.homeFinalThirdAcc !== undefined ||
    match.awayFinalThirdAcc !== undefined ||
    match.homeFinalThirdPasses !== undefined ||
    match.awayFinalThirdPasses !== undefined ||
    match.homeCrossesAcc !== undefined ||
    match.awayCrossesAcc !== undefined ||
    match.homeCrosses !== undefined ||
    match.awayCrosses !== undefined ||
    match.homeXA !== undefined ||
    match.awayXA !== undefined ||
    match.homeFouls !== undefined ||
    match.awayFouls !== undefined ||
    match.homeDuelsWon !== undefined ||
    match.awayDuelsWon !== undefined ||
    match.homeSaves !== undefined ||
    match.awaySaves !== undefined
  );
}

/** Вспомогательная функция для получения значения поля матча с учётом стороны */
function getMatchValue(match, field, isHome, fallback = 0) {
  const key = isHome ? `home${field}` : `away${field}`;
  const val = match[key];
  return val != null ? val : fallback;
}

/** Вычисление средних по всем 23 полям + разбивка по таймам */
export function calculateFeatures(matches, teamId) {
  const n = matches.length;
  if (n === 0) {
    const def = 0;
    const result = {};
    // Основные поля (23 шт)
    const basicFields = [
      'Score', 'XG', 'Possession', 'TotalShots', 'ShotsOnTarget',
      'Corners', 'YellowCards', 'RedCards', 'XGOT', 'BlockedShots',
      'ShotsInsideBox', 'ShotsOutsideBox', 'TouchesBox',
      'LongPassesAcc', 'LongPasses', 'FinalThirdAcc', 'FinalThirdPasses',
      'CrossesAcc', 'Crosses', 'XA', 'Fouls', 'DuelsWon', 'Saves'
    ];
    basicFields.forEach(f => {
      result[`avg${f}`] = def;
      result[`avg${f}1H`] = def;
      result[`avg${f}2H`] = def;
    });
    result.formPoints = 0;
    result.matchesPlayed = 0;
    result.cornersTrend = 0;
    result.ratio1H = 0.5;
    return result;
  }

  // Инициализация сумм
  const sums = {};
  const fields = [
    'Score', 'XG', 'Possession', 'TotalShots', 'ShotsOnTarget',
    'Corners', 'YellowCards', 'RedCards', 'XGOT', 'BlockedShots',
    'ShotsInsideBox', 'ShotsOutsideBox', 'TouchesBox',
    'LongPassesAcc', 'LongPasses', 'FinalThirdAcc', 'FinalThirdPasses',
    'CrossesAcc', 'Crosses', 'XA', 'Fouls', 'DuelsWon', 'Saves'
  ];
  fields.forEach(f => {
    sums[f] = 0;
    sums[`${f}1H`] = 0;
    sums[`${f}2H`] = 0;
  });

  let formPoints = 0;
  const cornersList = [];

  matches.forEach(m => {
    const isHome = m.homeTeamId === teamId;
    const teamScore = isHome ? (m.homeScore || 0) : (m.awayScore || 0);
    const oppScore = isHome ? (m.awayScore || 0) : (m.homeScore || 0);

    fields.forEach(f => {
      const val = getMatchValue(m, f, isHome, 0);
      sums[f] += val;
      const val1H = getMatchValue(m, `${f}1H`, isHome, 0);
      sums[`${f}1H`] += val1H;
      const val2H = getMatchValue(m, `${f}2H`, isHome, 0);
      sums[`${f}2H`] += val2H;
    });

    const cornersFor = getMatchValue(m, 'Corners', isHome, 0);
    cornersList.push(cornersFor);

    if (teamScore > oppScore) formPoints += 3;
    else if (teamScore === oppScore) formPoints += 1;
  });

  // Вычисление средних
  const result = {};
  fields.forEach(f => {
    result[`avg${f}`] = sums[f] / n;
    result[`avg${f}1H`] = sums[`${f}1H`] / n;
    result[`avg${f}2H`] = sums[`${f}2H`] / n;
  });

  // Тренд угловых (последние vs первые половина матчей)
  const half = Math.max(1, Math.floor(n / 2));
  const firstHalfAvg = cornersList.slice(0, half).reduce((a, b) => a + b, 0) / half;
  const secondHalfAvg = cornersList.slice(half).reduce((a, b) => a + b, 0) / Math.max(1, n - half);
  const rawTrend = firstHalfAvg - secondHalfAvg;
  result.cornersTrend = Math.max(-3, Math.min(3, rawTrend));

  result.formPoints = formPoints;
  result.matchesPlayed = n;

  // Соотношение угловых 1-го тайма к общему
  const totalCorners = sums['Corners'];
  const corners1H = sums['Corners1H'];
  result.ratio1H = totalCorners > 0 ? corners1H / totalCorners : 0.5;

  return result;
}

/** Построение 84 признаков */
export function buildFeatures(homeStats, awayStats, round, leagueAvgTotal) {
  const features = [];

  const fields = [
    'Score', 'XG', 'Possession', 'TotalShots', 'ShotsOnTarget',
    'Corners', 'YellowCards', 'RedCards', 'XGOT', 'BlockedShots',
    'ShotsInsideBox', 'ShotsOutsideBox', 'TouchesBox',
    'LongPassesAcc', 'LongPasses', 'FinalThirdAcc', 'FinalThirdPasses',
    'CrossesAcc', 'Crosses', 'XA', 'Fouls', 'DuelsWon', 'Saves'
  ];

  // Ключевые поля для 1-го тайма (13 из 23)
  const keyFields1H = ['Score', 'XG', 'Possession', 'TotalShots', 'ShotsOnTarget', 'Corners', 'YellowCards', 'RedCards', 'XGOT', 'BlockedShots', 'ShotsInsideBox', 'ShotsOutsideBox', 'TouchesBox'];

  // 1. Основные поля хозяев (23)
  fields.forEach(f => features.push(safe(homeStats[`avg${f}`], 0)));
  // 2. Основные поля гостей (23)
  fields.forEach(f => features.push(safe(awayStats[`avg${f}`], 0)));
  // 3. 1H ключевые поля хозяев (13)
  keyFields1H.forEach(f => features.push(safe(homeStats[`avg${f}1H`], 0)));
  // 4. 1H ключевые поля гостей (13)
  keyFields1H.forEach(f => features.push(safe(awayStats[`avg${f}1H`], 0)));
  // 5. 2H угловые хозяев и гостей (2)
  features.push(safe(homeStats['avgCorners2H'], 0));
  features.push(safe(awayStats['avgCorners2H'], 0));
  // 6. matchesPlayed (2)
  features.push(safe(homeStats.matchesPlayed, 10));
  features.push(safe(awayStats.matchesPlayed, 10));
  // 7. formPoints (2)
  features.push(safe(homeStats.formPoints / 3, 0));
  features.push(safe(awayStats.formPoints / 3, 0));
  // 8. cornersTrend (2)
  features.push(safe(homeStats.cornersTrend, 0));
  features.push(safe(awayStats.cornersTrend, 0));
  // 9. ratio1H (2)
  features.push(safe(homeStats.ratio1H, 0.5));
  features.push(safe(awayStats.ratio1H, 0.5));
  // 10. round (1)
  features.push(safe(round, 0));
  // 11. leagueAvgTotal (1)
  features.push(safe(leagueAvgTotal, 9.5));

  // Итого: 23+23+13+13+2+2+2+2+2+2+1+1 = 84
  return features;
}

/**
 * Хронологические примеры: с индекса 20, окно 12 матчей, минимум 5 в истории у каждой стороны.
 * Фильтруем только матчи с расширенными данными (hasExtendedData).
 * @returns {{ features: number[], label: number, leagueId: string }[]}
 */
export function buildChronologicalTrainingExamples(matches, seasons) {
  const sortedMatches = [...(matches || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
  const examples = [];
  for (let i = 20; i < sortedMatches.length; i++) {
    const match = sortedMatches[i];
    
    // Пропускаем матчи без расширенных данных
    if (!hasExtendedData(match)) continue;

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
