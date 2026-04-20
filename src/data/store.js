import { db } from '../firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

const DEFAULT_DATA = {
  leagues: [
    { id: 'rpl', name: 'РПЛ', country: 'Россия', 
      avgTotalCorners: 8.9, avgCornersHome: 4.9, avgCornersAway: 4.0,
      avgXG: 1.18, avgShotsInsideBox: 6.5, avgPossession: 50 }
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
  version: '3.0'
};

let subscribers = [];
let currentData = null;
let unsubscribeFirestore = null;

export const initStore = (callback) => {
  const docRef = doc(db, 'football', 'stats');
  
  unsubscribeFirestore = onSnapshot(docRef, async (snapshot) => {
    if (snapshot.exists()) {
      currentData = snapshot.data();
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

export const addMatch = async (match) => {
  const data = getData();
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
  
  const league = data.leagues.find(l => l.id === teamMatches[0].leagueId);
  
  let stats = {
    teamId,
    matchesPlayed: teamMatches.length,
    // Угловые
    totalCornersFor: 0,
    totalCornersAgainst: 0,
    cornersForHome: 0,
    cornersForAway: 0,
    corners1H: 0,
    corners2H: 0,
    // xG
    xG: 0,
    xGA: 0,
    xG1H: 0,
    xG2H: 0,
    // Удары из штрафной
    shotsInsideBox: 0,
    shotsInsideBoxAgainst: 0,
    shotsInsideBox1H: 0,
    shotsInsideBox2H: 0,
    // Всего ударов
    totalShots: 0,
    totalShots1H: 0,
    totalShots2H: 0,
    // Удары в створ
    shotsOnTarget: 0,
    shotsOnTarget1H: 0,
    shotsOnTarget2H: 0,
    // Владение
    possession: 0,
    possession1H: 0,
    possession2H: 0,
    // Сейвы
    saves: 0,
    saves1H: 0,
    saves2H: 0,
  };
  
  teamMatches.forEach(match => {
    const isHome = match.homeTeamId === teamId;
    
    // Угловые
    const cornersFor = isHome ? (match.homeCorners || 0) : (match.awayCorners || 0);
    const cornersAgainst = isHome ? (match.awayCorners || 0) : (match.homeCorners || 0);
    const corners1HFor = isHome ? (match.homeCorners1H || 0) : (match.awayCorners1H || 0);
    const corners2HFor = isHome ? (match.homeCorners2H || 0) : (match.awayCorners2H || 0);
    
    // xG
    const xg = isHome ? (match.homeXG || league?.avgXG || 1.2) : (match.awayXG || league?.avgXG || 1.2);
    const xga = isHome ? (match.awayXG || league?.avgXG || 1.2) : (match.homeXG || league?.avgXG || 1.2);
    const xg1H = isHome ? (match.homeXG1H || xg * 0.5) : (match.awayXG1H || xg * 0.5);
    const xg2H = isHome ? (match.homeXG2H || xg * 0.5) : (match.awayXG2H || xg * 0.5);
    
    // Удары из штрафной
    const shotsInside = isHome ? (match.homeShotsInsideBox || league?.avgShotsInsideBox || 7) : (match.awayShotsInsideBox || league?.avgShotsInsideBox || 7);
    const shotsInsideAgainst = isHome ? (match.awayShotsInsideBox || league?.avgShotsInsideBox || 7) : (match.homeShotsInsideBox || league?.avgShotsInsideBox || 7);
    const shotsInside1H = isHome ? (match.homeShotsInsideBox1H || shotsInside * 0.5) : (match.awayShotsInsideBox1H || shotsInside * 0.5);
    const shotsInside2H = isHome ? (match.homeShotsInsideBox2H || shotsInside * 0.5) : (match.awayShotsInsideBox2H || shotsInside * 0.5);
    
    // Всего ударов
    const totalShots = isHome ? (match.homeTotalShots || 0) : (match.awayTotalShots || 0);
    const totalShots1H = isHome ? (match.homeTotalShots1H || totalShots * 0.5) : (match.awayTotalShots1H || totalShots * 0.5);
    const totalShots2H = isHome ? (match.homeTotalShots2H || totalShots * 0.5) : (match.awayTotalShots2H || totalShots * 0.5);
    
    // Удары в створ
    const shotsOnTarget = isHome ? (match.homeShotsOnTarget || 0) : (match.awayShotsOnTarget || 0);
    const shotsOnTarget1H = isHome ? (match.homeShotsOnTarget1H || shotsOnTarget * 0.5) : (match.awayShotsOnTarget1H || shotsOnTarget * 0.5);
    const shotsOnTarget2H = isHome ? (match.homeShotsOnTarget2H || shotsOnTarget * 0.5) : (match.awayShotsOnTarget2H || shotsOnTarget * 0.5);
    
    // Владение
    const possession = isHome ? (match.homePossession || 50) : (match.awayPossession || 50);
    const possession1H = isHome ? (match.homePossession1H || possession) : (match.awayPossession1H || possession);
    const possession2H = isHome ? (match.homePossession2H || possession) : (match.awayPossession2H || possession);
    
    // Сейвы
    const saves = isHome ? (match.homeSaves || 0) : (match.awaySaves || 0);
    const saves1H = isHome ? (match.homeSaves1H || saves * 0.5) : (match.awaySaves1H || saves * 0.5);
    const saves2H = isHome ? (match.homeSaves2H || saves * 0.5) : (match.awaySaves2H || saves * 0.5);
    
    // Суммируем
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
    // Средние угловые
    avgCornersFor: stats.totalCornersFor / n,
    avgCornersAgainst: stats.totalCornersAgainst / n,
    avgCornersForHome: homeMatches > 0 ? stats.cornersForHome / homeMatches : 0,
    avgCornersForAway: awayMatches > 0 ? stats.cornersForAway / awayMatches : 0,
    avgCorners1H: stats.corners1H / n,
    avgCorners2H: stats.corners2H / n,
    // Средние xG
    avgXG: stats.xG / n,
    avgXGA: stats.xGA / n,
    avgXG1H: stats.xG1H / n,
    avgXG2H: stats.xG2H / n,
    // Средние удары из штрафной
    avgShotsInsideBox: stats.shotsInsideBox / n,
    avgShotsInsideBoxAgainst: stats.shotsInsideBoxAgainst / n,
    avgShotsInsideBox1H: stats.shotsInsideBox1H / n,
    avgShotsInsideBox2H: stats.shotsInsideBox2H / n,
    // Средние всего ударов
    avgTotalShots: stats.totalShots / n,
    avgTotalShots1H: stats.totalShots1H / n,
    avgTotalShots2H: stats.totalShots2H / n,
    // Средние удары в створ
    avgShotsOnTarget: stats.shotsOnTarget / n,
    avgShotsOnTarget1H: stats.shotsOnTarget1H / n,
    avgShotsOnTarget2H: stats.shotsOnTarget2H / n,
    // Среднее владение
    avgPossession: stats.possession / n,
    avgPossession1H: stats.possession1H / n,
    avgPossession2H: stats.possession2H / n,
    // Средние сейвы
    avgSaves: stats.saves / n,
    avgSaves1H: stats.saves1H / n,
    avgSaves2H: stats.saves2H / n,
    matchesPlayed: n
  };
};

export const predictMatch = (homeTeamId, awayTeamId, leagueId, selectedTotal = 9.5) => {
  const data = getData();
  const league = data.leagues.find(l => l.id === leagueId);
  const homeStats = getTeamStats(homeTeamId);
  const awayStats = getTeamStats(awayTeamId);
  
  if (!homeStats || !awayStats || !league) return null;
  
  const safeDivide = (a, b, fallback = 1) => {
    if (!b || b === 0 || isNaN(a) || isNaN(b)) return fallback;
    const result = a / b;
    return isNaN(result) || !isFinite(result) ? fallback : result;
  };
  
  // ===== ФАКТОРЫ ДЛЯ ДОМАШНЕЙ КОМАНДЫ =====
  const homeCornerRating = Math.max(0.3, safeDivide(homeStats.avgCornersFor, league.avgCornersHome, 1));
  const homeXGFactor = Math.max(0.4, safeDivide(homeStats.avgXG, league.avgXG || 1.2, 1));
  const homeShotsFactor = Math.max(0.4, safeDivide(homeStats.avgShotsInsideBox, league.avgShotsInsideBox || 7, 1));
  const homePossessionFactor = Math.max(0.5, (homeStats.avgPossession || 50) / 50);
  const homeShotsOnTargetFactor = Math.max(0.4, safeDivide(homeStats.avgShotsOnTarget, 5, 1));
  
  // Факторы защиты гостей
  const awayDefenseCorner = Math.max(0.3, safeDivide(awayStats.avgCornersAgainst, league.avgCornersAway, 1));
  const awayDefenseXG = Math.max(0.4, safeDivide(awayStats.avgXGA, league.avgXG || 1.2, 1));
  const awayDefenseShots = Math.max(0.4, safeDivide(awayStats.avgShotsInsideBoxAgainst, league.avgShotsInsideBox || 7, 1));
  const awaySavesFactor = Math.max(0.5, safeDivide(awayStats.avgSaves, 4, 1));
  
  // ===== ВЗВЕШЕННАЯ ФОРМУЛА =====
  let homeExpected = league.avgCornersHome 
    * (0.30 * homeCornerRating)
    * (0.25 * homeXGFactor)
    * (0.15 * homeShotsFactor)
    * (0.10 * homePossessionFactor)
    * (0.10 * homeShotsOnTargetFactor)
    * (0.30 * awayDefenseCorner)
    * (0.25 * awayDefenseXG)
    * (0.15 * awayDefenseShots)
    * (0.10 * awaySavesFactor);
  
  if (isNaN(homeExpected) || homeExpected < 1) homeExpected = league.avgCornersHome;
  if (homeExpected > 15) homeExpected = 12;
  
  // ===== ГОСТЕВАЯ КОМАНДА =====
  const awayCornerRating = Math.max(0.3, safeDivide(awayStats.avgCornersFor, league.avgCornersAway, 1));
  const awayXGFactor = Math.max(0.4, safeDivide(awayStats.avgXG, league.avgXG || 1.2, 1));
  const awayShotsFactor = Math.max(0.4, safeDivide(awayStats.avgShotsInsideBox, league.avgShotsInsideBox || 7, 1));
  const awayPossessionFactor = Math.max(0.5, (awayStats.avgPossession || 50) / 50);
  const awayShotsOnTargetFactor = Math.max(0.4, safeDivide(awayStats.avgShotsOnTarget, 5, 1));
  
  const homeDefenseCorner = Math.max(0.3, safeDivide(homeStats.avgCornersAgainst, league.avgCornersHome, 1));
  const homeDefenseXG = Math.max(0.4, safeDivide(homeStats.avgXGA, league.avgXG || 1.2, 1));
  const homeDefenseShots = Math.max(0.4, safeDivide(homeStats.avgShotsInsideBoxAgainst, league.avgShotsInsideBox || 7, 1));
  const homeSavesFactor = Math.max(0.5, safeDivide(homeStats.avgSaves, 4, 1));
  
  let awayExpected = league.avgCornersAway 
    * (0.30 * awayCornerRating)
    * (0.25 * awayXGFactor)
    * (0.15 * awayShotsFactor)
    * (0.10 * awayPossessionFactor)
    * (0.10 * awayShotsOnTargetFactor)
    * (0.30 * homeDefenseCorner)
    * (0.25 * homeDefenseXG)
    * (0.15 * homeDefenseShots)
    * (0.10 * homeSavesFactor);
  
  if (isNaN(awayExpected) || awayExpected < 0.5) awayExpected = league.avgCornersAway;
  if (awayExpected > 12) awayExpected = 10;
  
  homeExpected = Math.round(homeExpected * 100) / 100;
  awayExpected = Math.round(awayExpected * 100) / 100;
  const totalExpected = homeExpected + awayExpected;
  
  console.log('📊 Расчёт:', { homeExpected, awayExpected, totalExpected });
  
  // Расчёт вероятности
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