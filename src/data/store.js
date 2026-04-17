import { saveToCloud, syncData } from './firebase';

const STORAGE_KEY = 'football_stats_db_v2';

const defaultData = {
  leagues: [
    { id: 'apl', name: 'АПЛ', country: 'Англия', 
      avgTotalCorners: 10.4, avgCornersHome: 5.8, avgCornersAway: 4.6,
      avgXG: 1.45, avgShotsInsideBox: 9.2, avgPossession: 50 },
    { id: 'laliga', name: 'Ла Лига', country: 'Испания',
      avgTotalCorners: 9.2, avgCornersHome: 5.1, avgCornersAway: 4.1,
      avgXG: 1.32, avgShotsInsideBox: 8.1, avgPossession: 50 },
    { id: 'bundesliga', name: 'Бундеслига', country: 'Германия',
      avgTotalCorners: 10.8, avgCornersHome: 6.0, avgCornersAway: 4.8,
      avgXG: 1.56, avgShotsInsideBox: 10.1, avgPossession: 50 },
    { id: 'seriea', name: 'Серия А', country: 'Италия',
      avgTotalCorners: 9.8, avgCornersHome: 5.4, avgCornersAway: 4.4,
      avgXG: 1.28, avgShotsInsideBox: 7.8, avgPossession: 50 },
    { id: 'rpl', name: 'РПЛ', country: 'Россия',
      avgTotalCorners: 8.9, avgCornersHome: 4.9, avgCornersAway: 4.0,
      avgXG: 1.18, avgShotsInsideBox: 6.5, avgPossession: 50 }
  ],
  
  teams: [
    { id: 'mci', name: 'Манчестер Сити', leagueId: 'apl' },
    { id: 'ars', name: 'Арсенал', leagueId: 'apl' },
    { id: 'liv', name: 'Ливерпуль', leagueId: 'apl' },
    { id: 'che', name: 'Челси', leagueId: 'apl' },
    { id: 'bar', name: 'Барселона', leagueId: 'laliga' },
    { id: 'rma', name: 'Реал Мадрид', leagueId: 'laliga' },
    { id: 'atm', name: 'Атлетико Мадрид', leagueId: 'laliga' },
    { id: 'bay', name: 'Бавария', leagueId: 'bundesliga' },
    { id: 'bvb', name: 'Боруссия Д', leagueId: 'bundesliga' },
    { id: 'juv', name: 'Ювентус', leagueId: 'seriea' },
    { id: 'int', name: 'Интер', leagueId: 'seriea' },
    { id: 'zen', name: 'Зенит', leagueId: 'rpl' },
    { id: 'spa', name: 'Спартак', leagueId: 'rpl' },
    { id: 'csk', name: 'ЦСКА', leagueId: 'rpl' }
  ],
  
  matches: [],
  lastUpdated: new Date().toISOString(),
  version: '2.0'
};

// Инициализация с примерами матчей
const initializeSampleData = () => {
  const savedData = localStorage.getItem(STORAGE_KEY);
  
  if (savedData) {
    return JSON.parse(savedData);
  }
  
  const newData = JSON.parse(JSON.stringify(defaultData));
  
  const sampleMatches = [
    { 
      homeTeamId: 'mci', awayTeamId: 'ars', leagueId: 'apl',
      homeScore: 2, awayScore: 1,
      homeCorners: 7, awayCorners: 4,
      homeCorners1H: 4, awayCorners1H: 2,
      homeCorners2H: 3, awayCorners2H: 2,
      homePossession1H: 58, awayPossession1H: 42,
      homePossession2H: 65, awayPossession2H: 35,
      homeXG: 1.87, awayXG: 0.93,
      homeShotsInsideBox: 12, awayShotsInsideBox: 5,
      homeShotsOutsideBox: 6, awayShotsOutsideBox: 4,
      homeDangerousAttacks: 48, awayDangerousAttacks: 23,
      homeSaves: 4, awaySaves: 7,
      homeYellowCards: 2, awayYellowCards: 1,
      homePassAccuracyFinalThird: 78, awayPassAccuracyFinalThird: 65,
      date: '2024-05-19'
    },
    { 
      homeTeamId: 'zen', awayTeamId: 'spa', leagueId: 'rpl',
      homeScore: 3, awayScore: 0,
      homeCorners: 8, awayCorners: 2,
      homeCorners1H: 5, awayCorners1H: 1,
      homeCorners2H: 3, awayCorners2H: 1,
      homePossession1H: 62, awayPossession1H: 38,
      homePossession2H: 58, awayPossession2H: 42,
      homeXG: 2.34, awayXG: 0.45,
      homeShotsInsideBox: 14, awayShotsInsideBox: 3,
      homeShotsOutsideBox: 7, awayShotsOutsideBox: 2,
      homeDangerousAttacks: 52, awayDangerousAttacks: 18,
      homeSaves: 2, awaySaves: 9,
      homeYellowCards: 1, awayYellowCards: 3,
      homePassAccuracyFinalThird: 82, awayPassAccuracyFinalThird: 58,
      date: '2024-05-18'
    }
  ];
  
  sampleMatches.forEach((match, index) => {
    newData.matches.push({
      ...match,
      id: (Date.now() + index).toString(),
    });
  });
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
  
  // Пробуем синхронизировать с облаком
  setTimeout(() => {
    syncData(newData).then(cloudData => {
      if (cloudData) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudData));
      }
    });
  }, 100);
  
  return newData;
};

export const getData = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  
  if (!data) {
    return initializeSampleData();
  }
  
  return JSON.parse(data);
};

export const saveData = async (data) => {
  const dataWithTimestamp = {
    ...data,
    lastUpdated: new Date().toISOString()
  };
  
  // Сохраняем локально
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dataWithTimestamp));
  
  // Сохраняем в облако
  try {
    await saveToCloud(dataWithTimestamp);
    console.log('☁️ Данные отправлены в Firebase');
  } catch (error) {
    console.error('❌ Ошибка отправки в Firebase:', error);
  }
  
  return dataWithTimestamp;
};

export const addMatch = async (match) => {
  const data = getData();
  const newMatch = { ...match, id: Date.now().toString() };
  
  data.matches.push(newMatch);
  data.matches = keepLast10MatchesPerTeam(data.matches);
  
  await saveData(data);
  return newMatch;
};

const keepLast10MatchesPerTeam = (matches) => {
  const teamMatches = {};
  
  matches.forEach(match => {
    if (!teamMatches[match.homeTeamId]) teamMatches[match.homeTeamId] = [];
    if (!teamMatches[match.awayTeamId]) teamMatches[match.awayTeamId] = [];
    
    teamMatches[match.homeTeamId].push(match);
    teamMatches[match.awayTeamId].push(match);
  });
  
  const keptMatchIds = new Set();
  
  Object.keys(teamMatches).forEach(teamId => {
    const sorted = teamMatches[teamId].sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );
    
    sorted.slice(0, 10).forEach(match => {
      keptMatchIds.add(match.id);
    });
  });
  
  return matches.filter(match => keptMatchIds.has(match.id));
};

export const getTeamStats = (teamId, matchesCount = 10) => {
  const data = getData();
  const teamMatches = data.matches
    .filter(m => m.homeTeamId === teamId || m.awayTeamId === teamId)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, matchesCount);
  
  if (teamMatches.length === 0) return null;
  
  const league = data.leagues.find(l => l.id === teamMatches[0].leagueId);
  
  let stats = {
    teamId,
    matchesPlayed: teamMatches.length,
    totalCornersFor: 0,
    totalCornersAgainst: 0,
    cornersForHome: 0,
    cornersForAway: 0,
    corners1H: 0,
    corners2H: 0,
    possession1H: 0,
    possession2H: 0,
    xG: 0,
    xGA: 0,
    shotsInsideBox: 0,
    shotsInsideBoxAgainst: 0,
    dangerousAttacks: 0,
    saves: 0,
    matchesWithMissingData: 0,
    matches: []
  };
  
  teamMatches.forEach(match => {
    const isHome = match.homeTeamId === teamId;
    
    const hasXG = match.homeXG !== undefined && match.awayXG !== undefined;
    const hasShots = match.homeShotsInsideBox !== undefined;
    
    if (!hasXG || !hasShots) {
      stats.matchesWithMissingData++;
    }
    
    const cornersFor = isHome ? (match.homeCorners || 0) : (match.awayCorners || 0);
    const cornersAgainst = isHome ? (match.awayCorners || 0) : (match.homeCorners || 0);
    const corners1HFor = isHome ? (match.homeCorners1H || cornersFor * 0.5) : (match.awayCorners1H || cornersFor * 0.5);
    const corners2HFor = isHome ? (match.homeCorners2H || cornersFor * 0.5) : (match.awayCorners2H || cornersFor * 0.5);
    
    const possession1H = isHome 
      ? (match.homePossession1H || match.homePossession || 50)
      : (match.awayPossession1H || match.awayPossession || 50);
    
    const possession2H = isHome
      ? (match.homePossession2H || match.homePossession || 50)
      : (match.awayPossession2H || match.awayPossession || 50);
    
    const xg = isHome 
      ? (match.homeXG || league?.avgXG || 1.2)
      : (match.awayXG || league?.avgXG || 1.2);
    
    const xga = isHome 
      ? (match.awayXG || league?.avgXG || 1.2)
      : (match.homeXG || league?.avgXG || 1.2);
    
    const shotsInsideBox = isHome
      ? (match.homeShotsInsideBox || league?.avgShotsInsideBox || 7)
      : (match.awayShotsInsideBox || league?.avgShotsInsideBox || 7);
    
    const shotsInsideBoxAgainst = isHome
      ? (match.awayShotsInsideBox || league?.avgShotsInsideBox || 7)
      : (match.homeShotsInsideBox || league?.avgShotsInsideBox || 7);
    
    const dangerousAttacks = isHome
      ? (match.homeDangerousAttacks || 30)
      : (match.awayDangerousAttacks || 30);
    
    const saves = isHome
      ? (match.awaySaves || 3)
      : (match.homeSaves || 3);
    
    stats.totalCornersFor += cornersFor;
    stats.totalCornersAgainst += cornersAgainst;
    stats.corners1H += corners1HFor;
    stats.corners2H += corners2HFor;
    stats.possession1H += possession1H;
    stats.possession2H += possession2H;
    stats.xG += xg;
    stats.xGA += xga;
    stats.shotsInsideBox += shotsInsideBox;
    stats.shotsInsideBoxAgainst += shotsInsideBoxAgainst;
    stats.dangerousAttacks += dangerousAttacks;
    stats.saves += saves;
    
    if (isHome) {
      stats.cornersForHome += cornersFor;
    } else {
      stats.cornersForAway += cornersFor;
    }
    
    stats.matches.push({
      date: match.date,
      opponent: isHome ? match.awayTeamId : match.homeTeamId,
      cornersFor,
      cornersAgainst,
      isHome
    });
  });
  
  const n = stats.matchesPlayed;
  const homeMatches = stats.matches.filter(m => m.isHome).length;
  const awayMatches = stats.matches.filter(m => !m.isHome).length;
  
  const dataQuality = ((n - stats.matchesWithMissingData) / n) * 100;
  
  return {
    ...stats,
    avgCornersFor: stats.totalCornersFor / n,
    avgCornersAgainst: stats.totalCornersAgainst / n,
    avgCornersForHome: homeMatches > 0 ? stats.cornersForHome / homeMatches : 0,
    avgCornersForAway: awayMatches > 0 ? stats.cornersForAway / awayMatches : 0,
    avgCorners1H: stats.corners1H / n,
    avgCorners2H: stats.corners2H / n,
    avgPossession1H: stats.possession1H / n,
    avgPossession2H: stats.possession2H / n,
    avgXG: stats.xG / n,
    avgXGA: stats.xGA / n,
    avgShotsInsideBox: stats.shotsInsideBox / n,
    avgDangerousAttacks: stats.dangerousAttacks / n,
    avgSaves: stats.saves / n,
    dataQuality: dataQuality.toFixed(0),
    reliability: dataQuality > 80 ? 'Высокая' : dataQuality > 50 ? 'Средняя' : 'Низкая'
  };
};

export const predictMatch = (homeTeamId, awayTeamId, leagueId) => {
  const data = getData();
  const league = data.leagues.find(l => l.id === leagueId);
  const homeStats = getTeamStats(homeTeamId);
  const awayStats = getTeamStats(awayTeamId);
  
  if (!homeStats || !awayStats || !league) return null;
  
  const homeCornerRating = homeStats.avgCornersFor / league.avgCornersHome;
  const homePossessionFactor = ((homeStats.avgPossession1H + homeStats.avgPossession2H) / 2) / 50;
  const homeXGFactor = homeStats.avgXG / league.avgXG;
  const homeShotsFactor = homeStats.avgShotsInsideBox / league.avgShotsInsideBox;
  
  const awayDefenseCorner = awayStats.avgCornersAgainst / league.avgCornersAway;
  const awayDefenseXG = awayStats.avgXGA / league.avgXG;
  const awayDefenseShots = awayStats.avgShotsInsideBoxAgainst / league.avgShotsInsideBox;
  
  const homeExpected = league.avgCornersHome 
    * (0.35 * homeCornerRating)
    * (0.25 * homePossessionFactor)
    * (0.20 * homeXGFactor)
    * (0.15 * homeShotsFactor)
    * (0.35 * awayDefenseCorner)
    * (0.25 * awayDefenseXG)
    * (0.15 * awayDefenseShots)
    * 1.1;
  
  const awayCornerRating = awayStats.avgCornersFor / league.avgCornersAway;
  const awayPossessionFactor = ((awayStats.avgPossession1H + awayStats.avgPossession2H) / 2) / 50;
  const awayXGFactor = awayStats.avgXG / league.avgXG;
  const awayShotsFactor = awayStats.avgShotsInsideBox / league.avgShotsInsideBox;
  
  const homeDefenseCorner = homeStats.avgCornersAgainst / league.avgCornersHome;
  const homeDefenseXG = homeStats.avgXGA / league.avgXG;
  const homeDefenseShots = homeStats.avgShotsInsideBoxAgainst / league.avgShotsInsideBox;
  
  const awayExpected = league.avgCornersAway 
    * (0.35 * awayCornerRating)
    * (0.25 * awayPossessionFactor)
    * (0.20 * awayXGFactor)
    * (0.15 * awayShotsFactor)
    * (0.35 * homeDefenseCorner)
    * (0.25 * homeDefenseXG)
    * (0.15 * homeDefenseShots)
    * 1.05;
  
  const probabilities = {
    homeExpected: Math.max(1.5, homeExpected).toFixed(2),
    awayExpected: Math.max(0.8, awayExpected).toFixed(2),
    totalExpected: (homeExpected + awayExpected).toFixed(2),
    
    over8_5: 0,
    over9_5: 0,
    over10_5: 0,
    over11_5: 0,
    
    homeWin: 0,
    draw: 0,
    awayWin: 0,
    
    recommendation: '',
    fairOdds: {},
    valueBets: []
  };
  
  const totalLambda = homeExpected + awayExpected;
  
  for (let i = 0; i <= 25; i++) {
    const prob = calculatePoissonProbability(totalLambda, i);
    if (i > 8.5) probabilities.over8_5 += prob;
    if (i > 9.5) probabilities.over9_5 += prob;
    if (i > 10.5) probabilities.over10_5 += prob;
    if (i > 11.5) probabilities.over11_5 += prob;
  }
  
  for (let h = 0; h <= 15; h++) {
    for (let a = 0; a <= 15; a++) {
      const prob = calculatePoissonProbability(homeExpected, h) * 
                   calculatePoissonProbability(awayExpected, a);
      if (h > a) probabilities.homeWin += prob;
      else if (h === a) probabilities.draw += prob;
      else probabilities.awayWin += prob;
    }
  }
  
  const percentFields = ['over8_5', 'over9_5', 'over10_5', 'over11_5', 'homeWin', 'draw', 'awayWin'];
  percentFields.forEach(key => {
    probabilities[key] = (probabilities[key] * 100).toFixed(1);
  });
  
  probabilities.fairOdds = {
    over9_5: (1 / (probabilities.over9_5 / 100)).toFixed(2),
    over10_5: (1 / (probabilities.over10_5 / 100)).toFixed(2),
    homeWin: (1 / (probabilities.homeWin / 100)).toFixed(2)
  };
  
  if (parseFloat(probabilities.over9_5) > 65) {
    probabilities.recommendation = '🔥 СИЛЬНЫЙ СИГНАЛ: ТБ 9.5 угловых';
    probabilities.valueBets.push({ bet: 'ТБ 9.5', confidence: 'Высокая', minOdds: probabilities.fairOdds.over9_5 });
  } else if (parseFloat(probabilities.over9_5) > 60) {
    probabilities.recommendation = '✅ ХОРОШИЙ СИГНАЛ: Рассмотри ТБ 9.5';
    probabilities.valueBets.push({ bet: 'ТБ 9.5', confidence: 'Средняя', minOdds: probabilities.fairOdds.over9_5 });
  } else if (parseFloat(probabilities.over9_5) < 40) {
    probabilities.recommendation = '❄️ СИГНАЛ: Рассмотри ТМ 9.5 угловых';
    probabilities.valueBets.push({ bet: 'ТМ 9.5', confidence: 'Средняя', maxOdds: (1 / ((100 - probabilities.over9_5) / 100)).toFixed(2) });
  } else {
    probabilities.recommendation = '⚖️ Нет явного сигнала, пропусти';
  }
  
  return probabilities;
};

export const calculatePoissonProbability = (lambda, k) => {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
};

const factorial = (n) => {
  if (n === 0 || n === 1) return 1;
  return n * factorial(n - 1);
};

export const getLeagueTable = (leagueId) => {
  const data = getData();
  const teams = data.teams.filter(t => t.leagueId === leagueId);
  const matches = data.matches.filter(m => m.leagueId === leagueId);
  
  const table = teams.map(team => {
    let played = 0, wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;
    
    matches.forEach(match => {
      if (match.homeTeamId === team.id) {
        played++;
        goalsFor += match.homeScore;
        goalsAgainst += match.awayScore;
        if (match.homeScore > match.awayScore) wins++;
        else if (match.homeScore === match.awayScore) draws++;
        else losses++;
      }
      if (match.awayTeamId === team.id) {
        played++;
        goalsFor += match.awayScore;
        goalsAgainst += match.homeScore;
        if (match.awayScore > match.homeScore) wins++;
        else if (match.awayScore === match.homeScore) draws++;
        else losses++;
      }
    });
    
    return {
      ...team,
      played,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      goalDiff: goalsFor - goalsAgainst,
      points: wins * 3 + draws
    };
  });
  
  return table.sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff);
};

export const addLeague = async (league) => {
  const data = getData();
  const newLeague = { 
    ...league, 
    id: Date.now().toString(),
    avgXG: league.avgXG || 1.2,
    avgShotsInsideBox: league.avgShotsInsideBox || 7.0,
    avgPossession: 50
  };
  data.leagues.push(newLeague);
  await saveData(data);
  return newLeague;
};

export const addTeam = async (team) => {
  const data = getData();
  const newTeam = { ...team, id: Date.now().toString() };
  data.teams.push(newTeam);
  await saveData(data);
  return newTeam;
};