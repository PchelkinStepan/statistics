/**
 * Общие 84 признака для Neuro (TensorFlow, Random Forest, XGBoost).
 * 23 показателя × 2 команды + 23 × 2 тайма × 2 команды + служебные
 * Фильтрация матчей без новых полей при обучении.
 */

export const NEURO_FEATURE_DIM = 148;

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


/** Вспомогательная функция для получения значения поля матча с учётом стороны */
function getMatchValue(match, field, isHome, fallback = 0) {
  const key = isHome ? `home${field}` : `away${field}`;
  const val = match[key];
  return val != null ? val : fallback;
}

/**
 * Байесовская оценка статистики команды.
 * Использует априорное среднее по лиге и обновляет его по мере поступления данных.
 * 
 * @param {Array} matches - матчи команды (может быть пустым)
 * @param {string} teamId - ID команды
 * @param {string} leagueId - ID лиги
 * @param {Array} seasons - сезоны
 * @param {number} priorWeight - вес априорного знания (по умолчанию 5 матчей)
 * @returns {Object} - байесовская оценка статистики
 */
export function getBayesianTeamStats(matches, teamId, leagueId, seasons, priorWeight = 5) {
  const season = seasons?.find((s) => s.leagueId === leagueId && s.isActive);
  
  // Априорные средние по лиге
  const prior = {
    Score: 1.5,
    XG: season?.avgXG || 1.2,
    Possession: 50,
    TotalShots: 10,
    ShotsOnTarget: 4,
    Corners: season?.avgCornersHome || 5,
    YellowCards: 2,
    RedCards: 0.1,
    XGOT: 0.8,
    BlockedShots: 2,
    ShotsInsideBox: season?.avgShotsInsideBox || 7,
    ShotsOutsideBox: 3,
    TouchesBox: 15,
    LongPassesAcc: 20,
    LongPasses: 30,
    FinalThirdAcc: 15,
    FinalThirdPasses: 25,
    CrossesAcc: 5,
    Crosses: 10,
    XA: 0.5,
    Fouls: 10,
    DuelsWon: 50,
    Saves: 3,
  };
  
  // Априорные средние для 1-го и 2-го таймов (пропорции)
  const priorRatio1H = {
    Score: 0.45,
    XG: 0.4,
    Possession: 0.5,
    TotalShots: 0.45,
    ShotsOnTarget: 0.45,
    Corners: 0.5,
    YellowCards: 0.4,
    RedCards: 0.3,
    XGOT: 0.4,
    BlockedShots: 0.45,
    ShotsInsideBox: 0.45,
    ShotsOutsideBox: 0.45,
    TouchesBox: 0.5,
    LongPassesAcc: 0.5,
    LongPasses: 0.5,
    FinalThirdAcc: 0.5,
    FinalThirdPasses: 0.5,
    CrossesAcc: 0.5,
    Crosses: 0.5,
    XA: 0.4,
    Fouls: 0.5,
    DuelsWon: 0.5,
    Saves: 0.5,
  };
  
  const n = matches.length;
  const result = {};
  const fields = Object.keys(prior);
  
  fields.forEach(f => {
    // Сумма наблюдаемых значений
    let observedSum = 0;
    let observedSum1H = 0;
    let observedSum2H = 0;
    
    matches.forEach(m => {
      const isHome = m.homeTeamId === teamId;
      const val = getMatchValue(m, f, isHome, 0);
      observedSum += val;
      
      const val1H = getMatchValue(m, `${f}1H`, isHome, 0);
      observedSum1H += val1H;
      
      const val2H = getMatchValue(m, `${f}2H`, isHome, 0);
      observedSum2H += val2H;
    });
    
    // Байесовская оценка среднего
    const priorMean = prior[f];
    const bayesianMean = (priorWeight * priorMean + observedSum) / (priorWeight + n);
    
    // Байесовская оценка для 1-го тайма
    const priorMean1H = priorMean * priorRatio1H[f];
    const bayesianMean1H = (priorWeight * priorMean1H + observedSum1H) / (priorWeight + n);
    
    // Байесовская оценка для 2-го тайма (остаток)
    const bayesianMean2H = bayesianMean - bayesianMean1H;
    
    result[`avg${f}`] = bayesianMean;
    result[`avg${f}1H`] = bayesianMean1H;
    result[`avg${f}2H`] = bayesianMean2H;
  });
  
  // Байесовская оценка formPoints
  let observedFormPoints = 0;
  matches.forEach(m => {
    const isHome = m.homeTeamId === teamId;
    const teamScore = isHome ? (m.homeScore || 0) : (m.awayScore || 0);
    const oppScore = isHome ? (m.awayScore || 0) : (m.homeScore || 0);
    if (teamScore > oppScore) observedFormPoints += 3;
    else if (teamScore === oppScore) observedFormPoints += 1;
  });
  const priorFormPoints = 1.5; // Среднее по лиге (ничья)
  result.formPoints = (priorWeight * priorFormPoints + observedFormPoints) / (priorWeight + n);
  
  // matchesPlayed — реальное количество матчей (не байесовское)
  result.matchesPlayed = n;
  
  // cornersTrend — байесовская оценка тренда
  const cornersList = matches.map(m => {
    const isHome = m.homeTeamId === teamId;
    return getMatchValue(m, 'Corners', isHome, 0);
  });
  const half = Math.max(1, Math.floor(n / 2));
  const firstHalfAvg = cornersList.slice(0, half).reduce((a, b) => a + b, 0) / half;
  const secondHalfAvg = cornersList.slice(half).reduce((a, b) => a + b, 0) / Math.max(1, n - half);
  const rawTrend = firstHalfAvg - secondHalfAvg;
  const priorTrend = 0;
  result.cornersTrend = (priorWeight * priorTrend + rawTrend * n) / (priorWeight + n);
  result.cornersTrend = Math.max(-3, Math.min(3, result.cornersTrend));
  
  // ratio1H — байесовская оценка
  const totalCorners = matches.reduce((sum, m) => {
    const isHome = m.homeTeamId === teamId;
    return sum + getMatchValue(m, 'Corners', isHome, 0);
  }, 0);
  const corners1H = matches.reduce((sum, m) => {
    const isHome = m.homeTeamId === teamId;
    return sum + getMatchValue(m, 'Corners1H', isHome, 0);
  }, 0);
  const priorRatio = 0.5;
  const observedRatio = totalCorners > 0 ? corners1H / totalCorners : 0.5;
  result.ratio1H = (priorWeight * priorRatio + observedRatio * n) / (priorWeight + n);
  
  return result;
}

/**
 * Возвращает "среднюю" статистику для команды без истории матчей.
 * Использует средние по лиге из сезона.
 * @deprecated Используйте getBayesianTeamStats вместо этой функции
 */
export function getDefaultTeamStats(leagueId, seasons) {
  return getBayesianTeamStats([], null, leagueId, seasons);
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

  // 1. Основные поля хозяев (23)
  fields.forEach(f => features.push(safe(homeStats[`avg${f}`], 0)));
  // 2. Основные поля гостей (23)
  fields.forEach(f => features.push(safe(awayStats[`avg${f}`], 0)));
  // 3. 1H все поля хозяев (23)
  fields.forEach(f => features.push(safe(homeStats[`avg${f}1H`], 0)));
  // 4. 1H все поля гостей (23)
  fields.forEach(f => features.push(safe(awayStats[`avg${f}1H`], 0)));
  // 5. 2H все поля хозяев (23)
  fields.forEach(f => features.push(safe(homeStats[`avg${f}2H`], 0)));
  // 6. 2H все поля гостей (23)
  fields.forEach(f => features.push(safe(awayStats[`avg${f}2H`], 0)));
  // 7. matchesPlayed (2)
  features.push(safe(homeStats.matchesPlayed, 10));
  features.push(safe(awayStats.matchesPlayed, 10));
  // 8. formPoints (2)
  features.push(safe(homeStats.formPoints / 3, 0));
  features.push(safe(awayStats.formPoints / 3, 0));
  // 9. cornersTrend (2)
  features.push(safe(homeStats.cornersTrend, 0));
  features.push(safe(awayStats.cornersTrend, 0));
  // 10. ratio1H (2)
  features.push(safe(homeStats.ratio1H, 0.5));
  features.push(safe(awayStats.ratio1H, 0.5));
  // 11. round (1)
  features.push(safe(round, 0));
  // 12. leagueAvgTotal (1)
  features.push(safe(leagueAvgTotal, 9.5));

  // Итого: 23+23+23+23+23+23+2+2+2+2+2+1+1 = 148
  return features;
}

/**
 * Хронологические примеры: с индекса 20, окно 12 матчей, минимум 5 в истории у каждой стороны.
 * Фильтруем только матчи с расширенными данными (hasExtendedData).
 * @returns {{ features: number[], label: number, leagueId: string }[]}
 */
/** Проверка наличия новых расширенных полей у матча */
function hasExtendedData(match) {
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

export function buildChronologicalTrainingExamples(matches, seasons) {
  const sortedMatches = [...(matches || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
  const examples = [];
  for (let i = 20; i < sortedMatches.length; i++) {
    const match = sortedMatches[i];
    
    // Пропускаем матчи без расширенных данных
    if (!hasExtendedData(match)) continue;

    const homePast = getLastMatches(sortedMatches, match.homeTeamId, match.date, 12);
    const awayPast = getLastMatches(sortedMatches, match.awayTeamId, match.date, 12);
    
    // Если у команды мало матчей — используем fallback
    const homeStats = homePast.length >= 1 
      ? calculateFeatures(homePast, match.homeTeamId)
      : getDefaultTeamStats(match.leagueId, seasons);
    const awayStats = awayPast.length >= 1
      ? calculateFeatures(awayPast, match.awayTeamId)
      : getDefaultTeamStats(match.leagueId, seasons);
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
