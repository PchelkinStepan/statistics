import { db } from '../firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

// Определение сезона по дате (РПЛ: июль-май)
const getSeasonFromDate = (dateStr) => {
  if (!dateStr) return '2024/25';
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  
  if (month >= 7) {
    return `${year}/${year + 1}`;
  } else {
    return `${year - 1}/${year}`;
  }
};

// Получение предыдущего сезона
const getLastSeason = (season) => {
  if (!season) return '2023/24';
  const parts = season.split('/');
  if (parts.length !== 2) return '2023/24';
  const start = parseInt(parts[0]);
  if (isNaN(start)) return '2023/24';
  return `${start - 1}/${start}`;
};

const DEFAULT_DATA = {
  leagues: [
    { 
      id: 'rpl', 
      name: 'РПЛ', 
      country: 'Россия',
      currentSeason: '2024/25',
      seasons: {
        '2023/24': { avgTotalCorners: 8.9, avgCornersHome: 4.9, avgCornersAway: 4.0, avgXG: 1.15, avgShotsInsideBox: 6.3 },
        '2024/25': { avgTotalCorners: 9.2, avgCornersHome: 5.1, avgCornersAway: 4.1, avgXG: 1.18, avgShotsInsideBox: 6.5 }
      },
      avgTotalCorners: 9.2,
      avgCornersHome: 5.1,
      avgCornersAway: 4.1,
      avgXG: 1.18,
      avgShotsInsideBox: 6.5,
      avgPossession: 50
    }
  ],
  teams: [
    { id: 'zen', name: 'Зенит', leagueId: 'rpl' },
    { id: 'spa', name: 'Спартак', leagueId: 'rpl' },
    { id: 'csk', name: 'ЦСКА', leagueId: 'rpl' },
    { id: 'lok', name: 'Локомотив', leagueId: 'rpl' },
    { id: 'kra', name: 'Краснодар', leagueId: 'rpl' },
    { id: 'ros', name: 'Ростов', leagueId: 'rpl' },
    { id: 'din', name: 'Динамо', leagueId: 'rpl' },
    { id: 'sochi', name: 'Сочи', leagueId: 'rpl' }
  ],
  matches: [],
  bets: [],
  bankroll: { initial: 10000, current: 10000 },
  lastUpdated: new Date().toISOString(),
  version: '4.0'
};

let subscribers = [];
let currentData = null;
let unsubscribeFirestore = null;

export const initStore = (callback) => {
  const docRef = doc(db, 'football', 'stats');
  
  unsubscribeFirestore = onSnapshot(docRef, async (snapshot) => {
    if (snapshot.exists()) {
      currentData = snapshot.data();
      
      // Проверяем и инициализируем структуру seasons если её нет
      if (currentData.leagues) {
        currentData.leagues = currentData.leagues.map(league => {
          if (!league.seasons) league.seasons = {};
          if (!league.currentSeason) league.currentSeason = '2024/25';
          return league;
        });
      }
      
      console.log('☁️ Данные из облака:', currentData.matches?.length || 0, 'матчей');
    } else {
      currentData = { ...DEFAULT_DATA, lastUpdated: new Date().toISOString() };
      await setDoc(docRef, currentData);
      console.log('📦 Новая база в облаке');
    }
    
    subscribers.forEach(cb => cb(currentData));
    if (callback) callback(currentData);
  }, (error) => {
    console.error('❌ Ошибка синхронизации:', error);
    const cached = localStorage.getItem('football_cache');
    if (cached) {
      currentData = JSON.parse(cached);
      subscribers.forEach(cb => cb(currentData));
      if (callback) callback(currentData);
    }
  });
  
  return () => {
    if (unsubscribeFirestore) unsubscribeFirestore();
  };
};

export const getData = () => {
  if (currentData) {
    // Проверяем структуру при каждом получении
    if (currentData.leagues) {
      currentData.leagues = currentData.leagues.map(league => {
        if (!league.seasons) league.seasons = {};
        if (!league.currentSeason) league.currentSeason = '2024/25';
        return league;
      });
    }
  }
  return currentData || DEFAULT_DATA;
};

export const subscribe = (callback) => {
  subscribers.push(callback);
  if (currentData) callback(currentData);
  return () => {
    subscribers = subscribers.filter(cb => cb !== callback);
  };
};

export const saveData = async (data) => {
  const docRef = doc(db, 'football', 'stats');
  const dataWithTimestamp = {
    ...data,
    lastUpdated: new Date().toISOString()
  };
  
  try {
    await setDoc(docRef, dataWithTimestamp);
    console.log('☁️ Сохранено в облако');
    localStorage.setItem('football_cache', JSON.stringify(dataWithTimestamp));
    return true;
  } catch (error) {
    console.error('❌ Ошибка сохранения:', error);
    return false;
  }
};

// Проверка и обновление сезона при добавлении матча
const checkAndRollSeason = (leagueId, matchDate) => {
  const data = getData();
  const league = data.leagues.find(l => l.id === leagueId);
  if (!league) return;
  
  // Инициализируем если нужно
  if (!league.seasons) league.seasons = {};
  if (!league.currentSeason) league.currentSeason = '2024/25';
  
  const season = getSeasonFromDate(matchDate);
  
  if (season !== league.currentSeason) {
    console.log(`🔄 Сезон изменился: ${league.currentSeason} → ${season}`);
    
    // Сохраняем старый сезон
    league.seasons[league.currentSeason] = {
      avgTotalCorners: league.avgTotalCorners || 9,
      avgCornersHome: league.avgCornersHome || 5,
      avgCornersAway: league.avgCornersAway || 4,
      avgXG: league.avgXG || 1.2,
      avgShotsInsideBox: league.avgShotsInsideBox || 7
    };
    
    // Берём данные прошлого сезона или дефолт
    const lastSeasonKey = getLastSeason(season);
    const lastSeasonData = league.seasons[lastSeasonKey] || {
      avgTotalCorners: 9.0,
      avgCornersHome: 5.0,
      avgCornersAway: 4.0,
      avgXG: 1.2,
      avgShotsInsideBox: 7.0
    };
    
    const updatedLeague = {
      ...league,
      currentSeason: season,
      seasons: league.seasons,
      avgTotalCorners: lastSeasonData.avgTotalCorners,
      avgCornersHome: lastSeasonData.avgCornersHome,
      avgCornersAway: lastSeasonData.avgCornersAway,
      avgXG: lastSeasonData.avgXG,
      avgShotsInsideBox: lastSeasonData.avgShotsInsideBox
    };
    
    const updatedData = {
      ...data,
      leagues: data.leagues.map(l => l.id === leagueId ? updatedLeague : l)
    };
    
    currentData = updatedData;
    localStorage.setItem('football_cache', JSON.stringify(updatedData));
    saveData(updatedData);
  }
};

// Получение средних по лиге с учётом сезона
export const getLeagueAverages = (leagueId) => {
  const data = getData();
  const league = data.leagues.find(l => l.id === leagueId);
  if (!league) return null;
  
  // Инициализируем если нужно
  if (!league.seasons) league.seasons = {};
  if (!league.currentSeason) league.currentSeason = '2024/25';
  
  const currentSeasonMatches = data.matches.filter(m => 
    m.leagueId === leagueId && 
    getSeasonFromDate(m.date) === league.currentSeason
  );
  
  const n = currentSeasonMatches.length;
  
  // Если матчей мало — смешиваем с прошлым сезоном
  if (n < 30) {
    const lastSeasonKey = getLastSeason(league.currentSeason);
    const lastSeason = league.seasons[lastSeasonKey] || {
      avgTotalCorners: league.avgTotalCorners || 9,
      avgCornersHome: league.avgCornersHome || 5,
      avgCornersAway: league.avgCornersAway || 4,
      avgXG: league.avgXG || 1.2,
      avgShotsInsideBox: league.avgShotsInsideBox || 7
    };
    
    const weight = Math.min(n / 30, 1);
    
    let currentTotal = 0, currentHome = 0, currentAway = 0, currentXG = 0, currentShots = 0;
    
    currentSeasonMatches.forEach(match => {
      currentTotal += (match.homeCorners || 0) + (match.awayCorners || 0);
      currentHome += match.homeCorners || 0;
      currentAway += match.awayCorners || 0;
      currentXG += (match.homeXG || 0) + (match.awayXG || 0);
      currentShots += (match.homeShotsInsideBox || 0) + (match.awayShotsInsideBox || 0);
    });
    
    const currentAvgTotal = n > 0 ? currentTotal / n : lastSeason.avgTotalCorners;
    const currentAvgHome = n > 0 ? currentHome / n : lastSeason.avgCornersHome;
    const currentAvgAway = n > 0 ? currentAway / n : lastSeason.avgCornersAway;
    const currentAvgXG = n > 0 ? currentXG / n : lastSeason.avgXG;
    const currentAvgShots = n > 0 ? currentShots / n : lastSeason.avgShotsInsideBox;
    
    return {
      avgTotalCorners: currentAvgTotal * weight + lastSeason.avgTotalCorners * (1 - weight),
      avgCornersHome: currentAvgHome * weight + lastSeason.avgCornersHome * (1 - weight),
      avgCornersAway: currentAvgAway * weight + lastSeason.avgCornersAway * (1 - weight),
      avgXG: currentAvgXG * weight + lastSeason.avgXG * (1 - weight),
      avgShotsInsideBox: currentAvgShots * weight + lastSeason.avgShotsInsideBox * (1 - weight)
    };
  }
  
  // Матчей достаточно — только текущий сезон
  let total = 0, home = 0, away = 0, xg = 0, shots = 0;
  
  currentSeasonMatches.forEach(match => {
    total += (match.homeCorners || 0) + (match.awayCorners || 0);
    home += match.homeCorners || 0;
    away += match.awayCorners || 0;
    xg += (match.homeXG || 0) + (match.awayXG || 0);
    shots += (match.homeShotsInsideBox || 0) + (match.awayShotsInsideBox || 0);
  });
  
  return {
    avgTotalCorners: total / n,
    avgCornersHome: home / n,
    avgCornersAway: away / n,
    avgXG: xg / n,
    avgShotsInsideBox: shots / n
  };
};

export const addMatch = async (match) => {
  const data = getData();
  
  // Проверяем сезон (с защитой)
  try {
    checkAndRollSeason(match.leagueId, match.date);
  } catch (error) {
    console.error('Ошибка проверки сезона:', error);
  }
  
  const newMatch = { ...match, id: Date.now().toString() };
  const updatedData = { ...data, matches: [...data.matches, newMatch] };
  await saveData(updatedData);
  return newMatch;
};

export const addLeague = async (league) => {
  const data = getData();
  const newLeague = { 
    ...league, 
    id: Date.now().toString(),
    currentSeason: '2024/25',
    seasons: {
      '2024/25': {
        avgTotalCorners: league.avgTotalCorners || 9,
        avgCornersHome: league.avgCornersHome || 5,
        avgCornersAway: league.avgCornersAway || 4,
        avgXG: league.avgXG || 1.2,
        avgShotsInsideBox: league.avgShotsInsideBox || 7
      }
    },
    avgXG: league.avgXG || 1.2,
    avgShotsInsideBox: league.avgShotsInsideBox || 7.0,
    avgPossession: 50
  };
  const updatedData = { ...data, leagues: [...data.leagues, newLeague] };
  await saveData(updatedData);
  return newLeague;
};

export const addTeam = async (team) => {
  const data = getData();
  const newTeam = { ...team, id: Date.now().toString() };
  const updatedData = { ...data, teams: [...data.teams, newTeam] };
  await saveData(updatedData);
  return newTeam;
};

export const deleteMatch = async (matchId) => {
  const data = getData();
  const updatedData = { ...data, matches: data.matches.filter(m => m.id !== matchId) };
  await saveData(updatedData);
};

export const deleteLeague = async (leagueId) => {
  const data = getData();
  const updatedData = {
    ...data,
    leagues: data.leagues.filter(l => l.id !== leagueId),
    matches: data.matches.filter(m => m.leagueId !== leagueId)
  };
  await saveData(updatedData);
};

export const deleteTeam = async (teamId) => {
  const data = getData();
  const updatedData = { ...data, teams: data.teams.filter(t => t.id !== teamId) };
  await saveData(updatedData);
};

export const getTeamStats = (teamId, matchesCount = 10) => {
  const data = getData();
  const teamMatches = data.matches
    .filter(m => m.homeTeamId === teamId || m.awayTeamId === teamId)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, matchesCount);
  
  if (teamMatches.length === 0) return null;
  
  const leagueAverages = getLeagueAverages(teamMatches[0].leagueId);
  const fallbackXG = leagueAverages?.avgXG || 1.2;
  const fallbackShots = leagueAverages?.avgShotsInsideBox || 7;
  const fallbackHomeCorners = leagueAverages?.avgCornersHome || 5;
  const fallbackAwayCorners = leagueAverages?.avgCornersAway || 4;
  
  let stats = {
    teamId,
    matchesPlayed: teamMatches.length,
    totalCornersFor: 0,
    totalCornersAgainst: 0,
    cornersForHome: 0,
    cornersForAway: 0,
    corners1H: 0,
    corners2H: 0,
    xG: 0,
    xGA: 0,
    xG1H: 0,
    xG2H: 0,
    shotsInsideBox: 0,
    shotsInsideBoxAgainst: 0,
    shotsInsideBox1H: 0,
    shotsInsideBox2H: 0,
    totalShots: 0,
    totalShots1H: 0,
    totalShots2H: 0,
    shotsOnTarget: 0,
    shotsOnTarget1H: 0,
    shotsOnTarget2H: 0,
    possession: 0,
    possession1H: 0,
    possession2H: 0,
    saves: 0,
    saves1H: 0,
    saves2H: 0,
  };
  
  teamMatches.forEach(match => {
    const isHome = match.homeTeamId === teamId;
    
    const cornersFor = isHome 
      ? (match.homeCorners || fallbackHomeCorners) 
      : (match.awayCorners || fallbackAwayCorners);
    const cornersAgainst = isHome 
      ? (match.awayCorners || fallbackAwayCorners) 
      : (match.homeCorners || fallbackHomeCorners);
    const corners1HFor = isHome ? (match.homeCorners1H || cornersFor * 0.5) : (match.awayCorners1H || cornersFor * 0.5);
    const corners2HFor = isHome ? (match.homeCorners2H || cornersFor * 0.5) : (match.awayCorners2H || cornersFor * 0.5);
    
    const xg = isHome ? (match.homeXG || fallbackXG) : (match.awayXG || fallbackXG);
    const xga = isHome ? (match.awayXG || fallbackXG) : (match.homeXG || fallbackXG);
    const xg1H = isHome ? (match.homeXG1H || xg * 0.5) : (match.awayXG1H || xg * 0.5);
    const xg2H = isHome ? (match.homeXG2H || xg * 0.5) : (match.awayXG2H || xg * 0.5);
    
    const shotsInside = isHome ? (match.homeShotsInsideBox || fallbackShots) : (match.awayShotsInsideBox || fallbackShots);
    const shotsInsideAgainst = isHome ? (match.awayShotsInsideBox || fallbackShots) : (match.homeShotsInsideBox || fallbackShots);
    const shotsInside1H = isHome ? (match.homeShotsInsideBox1H || shotsInside * 0.5) : (match.awayShotsInsideBox1H || shotsInside * 0.5);
    const shotsInside2H = isHome ? (match.homeShotsInsideBox2H || shotsInside * 0.5) : (match.awayShotsInsideBox2H || shotsInside * 0.5);
    
    const totalShots = isHome ? (match.homeTotalShots || 0) : (match.awayTotalShots || 0);
    const totalShots1H = isHome ? (match.homeTotalShots1H || totalShots * 0.5) : (match.awayTotalShots1H || totalShots * 0.5);
    const totalShots2H = isHome ? (match.homeTotalShots2H || totalShots * 0.5) : (match.awayTotalShots2H || totalShots * 0.5);
    
    const shotsOnTarget = isHome ? (match.homeShotsOnTarget || 0) : (match.awayShotsOnTarget || 0);
    const shotsOnTarget1H = isHome ? (match.homeShotsOnTarget1H || shotsOnTarget * 0.5) : (match.awayShotsOnTarget1H || shotsOnTarget * 0.5);
    const shotsOnTarget2H = isHome ? (match.homeShotsOnTarget2H || shotsOnTarget * 0.5) : (match.awayShotsOnTarget2H || shotsOnTarget * 0.5);
    
    const possession = isHome ? (match.homePossession || 50) : (match.awayPossession || 50);
    const possession1H = isHome ? (match.homePossession1H || possession) : (match.awayPossession1H || possession);
    const possession2H = isHome ? (match.homePossession2H || possession) : (match.awayPossession2H || possession);
    
    const saves = isHome ? (match.homeSaves || 0) : (match.awaySaves || 0);
    const saves1H = isHome ? (match.homeSaves1H || saves * 0.5) : (match.awaySaves1H || saves * 0.5);
    const saves2H = isHome ? (match.homeSaves2H || saves * 0.5) : (match.awaySaves2H || saves * 0.5);
    
    stats.totalCornersFor += cornersFor;
    stats.totalCornersAgainst += cornersAgainst;
    stats.corners1H += corners1HFor;
    stats.corners2H += corners2HFor;
    stats.xG += xg;
    stats.xGA += xga;
    stats.xG1H += xg1H;
    stats.xG2H += xg2H;
    stats.shotsInsideBox += shotsInside;
    stats.shotsInsideBoxAgainst += shotsInsideAgainst;
    stats.shotsInsideBox1H += shotsInside1H;
    stats.shotsInsideBox2H += shotsInside2H;
    stats.totalShots += totalShots;
    stats.totalShots1H += totalShots1H;
    stats.totalShots2H += totalShots2H;
    stats.shotsOnTarget += shotsOnTarget;
    stats.shotsOnTarget1H += shotsOnTarget1H;
    stats.shotsOnTarget2H += shotsOnTarget2H;
    stats.possession += possession;
    stats.possession1H += possession1H;
    stats.possession2H += possession2H;
    stats.saves += saves;
    stats.saves1H += saves1H;
    stats.saves2H += saves2H;
    
    if (isHome) {
      stats.cornersForHome += cornersFor;
    } else {
      stats.cornersForAway += cornersFor;
    }
  });
  
  const n = stats.matchesPlayed;
  const homeMatches = teamMatches.filter(m => m.homeTeamId === teamId).length;
  const awayMatches = teamMatches.filter(m => m.awayTeamId === teamId).length;
  
  return {
    ...stats,
    avgCornersFor: stats.totalCornersFor / n,
    avgCornersAgainst: stats.totalCornersAgainst / n,
    avgCornersForHome: homeMatches > 0 ? stats.cornersForHome / homeMatches : 0,
    avgCornersForAway: awayMatches > 0 ? stats.cornersForAway / awayMatches : 0,
    avgCorners1H: stats.corners1H / n,
    avgCorners2H: stats.corners2H / n,
    avgXG: stats.xG / n,
    avgXGA: stats.xGA / n,
    avgXG1H: stats.xG1H / n,
    avgXG2H: stats.xG2H / n,
    avgShotsInsideBox: stats.shotsInsideBox / n,
    avgShotsInsideBoxAgainst: stats.shotsInsideBoxAgainst / n,
    avgShotsInsideBox1H: stats.shotsInsideBox1H / n,
    avgShotsInsideBox2H: stats.shotsInsideBox2H / n,
    avgTotalShots: stats.totalShots / n,
    avgTotalShots1H: stats.totalShots1H / n,
    avgTotalShots2H: stats.totalShots2H / n,
    avgShotsOnTarget: stats.shotsOnTarget / n,
    avgShotsOnTarget1H: stats.shotsOnTarget1H / n,
    avgShotsOnTarget2H: stats.shotsOnTarget2H / n,
    avgPossession: stats.possession / n,
    avgPossession1H: stats.possession1H / n,
    avgPossession2H: stats.possession2H / n,
    avgSaves: stats.saves / n,
    avgSaves1H: stats.saves1H / n,
    avgSaves2H: stats.saves2H / n,
    matchesPlayed: n
  };
};

export const predictMatch = (homeTeamId, awayTeamId, leagueId, selectedTotal = 9.5) => {
  const data = getData();
  const leagueAverages = getLeagueAverages(leagueId);
  const homeStats = getTeamStats(homeTeamId);
  const awayStats = getTeamStats(awayTeamId);
  
  if (!homeStats || !awayStats || !leagueAverages) return null;
  
  const safeDivide = (a, b, fallback = 1) => {
    if (!b || b === 0 || isNaN(a) || isNaN(b)) return fallback;
    const result = a / b;
    return isNaN(result) || !isFinite(result) ? fallback : result;
  };
  
  const homeCornerRating = Math.max(0.3, safeDivide(homeStats.avgCornersFor, leagueAverages.avgCornersHome, 1));
  const homeXGFactor = Math.max(0.4, safeDivide(homeStats.avgXG, leagueAverages.avgXG || 1.2, 1));
  const homeShotsFactor = Math.max(0.4, safeDivide(homeStats.avgShotsInsideBox, leagueAverages.avgShotsInsideBox || 7, 1));
  const homePossessionFactor = Math.max(0.5, (homeStats.avgPossession || 50) / 50);
  const homeShotsOnTargetFactor = Math.max(0.4, safeDivide(homeStats.avgShotsOnTarget, 5, 1));
  
  const awayDefenseCorner = Math.max(0.3, safeDivide(awayStats.avgCornersAgainst, leagueAverages.avgCornersAway, 1));
  const awayDefenseXG = Math.max(0.4, safeDivide(awayStats.avgXGA, leagueAverages.avgXG || 1.2, 1));
  const awayDefenseShots = Math.max(0.4, safeDivide(awayStats.avgShotsInsideBoxAgainst, leagueAverages.avgShotsInsideBox || 7, 1));
  const awaySavesFactor = Math.max(0.5, safeDivide(awayStats.avgSaves, 4, 1));
  
  let homeExpected = leagueAverages.avgCornersHome 
    * (0.30 * homeCornerRating)
    * (0.25 * homeXGFactor)
    * (0.15 * homeShotsFactor)
    * (0.10 * homePossessionFactor)
    * (0.10 * homeShotsOnTargetFactor)
    * (0.30 * awayDefenseCorner)
    * (0.25 * awayDefenseXG)
    * (0.15 * awayDefenseShots)
    * (0.10 * awaySavesFactor);
  
  if (isNaN(homeExpected) || homeExpected < 1) homeExpected = leagueAverages.avgCornersHome;
  if (homeExpected > 15) homeExpected = 12;
  
  const awayCornerRating = Math.max(0.3, safeDivide(awayStats.avgCornersFor, leagueAverages.avgCornersAway, 1));
  const awayXGFactor = Math.max(0.4, safeDivide(awayStats.avgXG, leagueAverages.avgXG || 1.2, 1));
  const awayShotsFactor = Math.max(0.4, safeDivide(awayStats.avgShotsInsideBox, leagueAverages.avgShotsInsideBox || 7, 1));
  const awayPossessionFactor = Math.max(0.5, (awayStats.avgPossession || 50) / 50);
  const awayShotsOnTargetFactor = Math.max(0.4, safeDivide(awayStats.avgShotsOnTarget, 5, 1));
  
  const homeDefenseCorner = Math.max(0.3, safeDivide(homeStats.avgCornersAgainst, leagueAverages.avgCornersHome, 1));
  const homeDefenseXG = Math.max(0.4, safeDivide(homeStats.avgXGA, leagueAverages.avgXG || 1.2, 1));
  const homeDefenseShots = Math.max(0.4, safeDivide(homeStats.avgShotsInsideBoxAgainst, leagueAverages.avgShotsInsideBox || 7, 1));
  const homeSavesFactor = Math.max(0.5, safeDivide(homeStats.avgSaves, 4, 1));
  
  let awayExpected = leagueAverages.avgCornersAway 
    * (0.30 * awayCornerRating)
    * (0.25 * awayXGFactor)
    * (0.15 * awayShotsFactor)
    * (0.10 * awayPossessionFactor)
    * (0.10 * awayShotsOnTargetFactor)
    * (0.30 * homeDefenseCorner)
    * (0.25 * homeDefenseXG)
    * (0.15 * homeDefenseShots)
    * (0.10 * homeSavesFactor);
  
  if (isNaN(awayExpected) || awayExpected < 0.5) awayExpected = leagueAverages.avgCornersAway;
  if (awayExpected > 12) awayExpected = 10;
  
  homeExpected = Math.round(homeExpected * 100) / 100;
  awayExpected = Math.round(awayExpected * 100) / 100;
  const totalExpected = homeExpected + awayExpected;
  
  let totalProbability = 50;
  let recommendation = '';
  
  if (totalExpected > selectedTotal + 2) {
    totalProbability = 85;
    recommendation = `🔥 СИЛЬНЫЙ СИГНАЛ: ТБ ${selectedTotal} угловых`;
  } else if (totalExpected > selectedTotal + 1.5) {
    totalProbability = 75;
    recommendation = `🔥 СИЛЬНЫЙ СИГНАЛ: ТБ ${selectedTotal} угловых`;
  } else if (totalExpected > selectedTotal + 1) {
    totalProbability = 68;
    recommendation = `✅ ХОРОШИЙ СИГНАЛ: ТБ ${selectedTotal} угловых`;
  } else if (totalExpected > selectedTotal + 0.5) {
    totalProbability = 60;
    recommendation = `👍 СИГНАЛ: ТБ ${selectedTotal} угловых`;
  } else if (totalExpected > selectedTotal - 0.5) {
    totalProbability = 52;
    recommendation = `⚖️ Нет явного сигнала (близко к ${selectedTotal})`;
  } else if (totalExpected > selectedTotal - 1) {
    totalProbability = 42;
    recommendation = `❄️ СИГНАЛ: Рассмотри ТМ ${selectedTotal} угловых`;
  } else if (totalExpected > selectedTotal - 1.5) {
    totalProbability = 35;
    recommendation = `❄️ ХОРОШИЙ СИГНАЛ: ТМ ${selectedTotal} угловых`;
  } else {
    totalProbability = 25;
    recommendation = `🧊 СИЛЬНЫЙ СИГНАЛ: ТМ ${selectedTotal} угловых`;
  }
  
  const underProbability = 100 - totalProbability;
  
  return {
    homeExpected: homeExpected.toFixed(2),
    awayExpected: awayExpected.toFixed(2),
    totalExpected: totalExpected.toFixed(2),
    totalProbability,
    underProbability,
    recommendation,
    selectedTotal
  };
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
        goalsFor += match.homeScore || 0;
        goalsAgainst += match.awayScore || 0;
        if ((match.homeScore || 0) > (match.awayScore || 0)) wins++;
        else if (match.homeScore === match.awayScore) draws++;
        else losses++;
      }
      if (match.awayTeamId === team.id) {
        played++;
        goalsFor += match.awayScore || 0;
        goalsAgainst += match.homeScore || 0;
        if ((match.awayScore || 0) > (match.homeScore || 0)) wins++;
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

// Обновление средних по лиге (ручное)
export const updateLeagueAverages = async (leagueId) => {
  const data = getData();
  const league = data.leagues.find(l => l.id === leagueId);
  if (!league) return null;
  
  const averages = getLeagueAverages(leagueId);
  if (!averages) return null;
  
  // Инициализируем seasons если нет
  if (!league.seasons) league.seasons = {};
  if (!league.currentSeason) league.currentSeason = '2024/25';
  
  const updatedLeague = {
    ...league,
    avgTotalCorners: averages.avgTotalCorners,
    avgCornersHome: averages.avgCornersHome,
    avgCornersAway: averages.avgCornersAway,
    avgXG: averages.avgXG,
    avgShotsInsideBox: averages.avgShotsInsideBox,
    seasons: {
      ...league.seasons,
      [league.currentSeason]: {
        avgTotalCorners: averages.avgTotalCorners,
        avgCornersHome: averages.avgCornersHome,
        avgCornersAway: averages.avgCornersAway,
        avgXG: averages.avgXG,
        avgShotsInsideBox: averages.avgShotsInsideBox
      }
    }
  };
  
  const updatedData = {
    ...data,
    leagues: data.leagues.map(l => l.id === leagueId ? updatedLeague : l)
  };
  
  await saveData(updatedData);
  return updatedLeague;
};