import { db } from '../firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

// Определение сезона по дате
const getSeasonFromDate = (dateStr) => {
  if (!dateStr) return '2024/25';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '2024/25';
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  if (month >= 7) {
    return `${year}/${(year + 1).toString().slice(-2)}`;
  } else {
    return `${year - 1}/${year.toString().slice(-2)}`;
  }
};

const DEFAULT_DATA = {
  leagues: [
    { 
      id: 'rpl', 
      name: 'РПЛ', 
      country: 'Россия',
      currentSeason: '2024/25'
    }
  ],
  seasons: [
    {
      id: '2023/24',
      name: '2023/24',
      leagueId: 'rpl',
      isActive: false,
      avgTotalCorners: 8.9,
      avgCornersHome: 4.9,
      avgCornersAway: 4.0,
      avgXG: 1.15,
      avgShotsInsideBox: 6.3
    },
    {
      id: '2024/25',
      name: '2024/25',
      leagueId: 'rpl',
      isActive: true,
      avgTotalCorners: 9.2,
      avgCornersHome: 5.1,
      avgCornersAway: 4.1,
      avgXG: 1.18,
      avgShotsInsideBox: 6.5
    }
  ],
  teams: [
    { id: 'zen', name: 'Зенит', leagueId: 'rpl', seasonIds: ['2024/25'] },
    { id: 'spa', name: 'Спартак', leagueId: 'rpl', seasonIds: ['2024/25'] },
    { id: 'csk', name: 'ЦСКА', leagueId: 'rpl', seasonIds: ['2024/25'] },
    { id: 'lok', name: 'Локомотив', leagueId: 'rpl', seasonIds: ['2024/25'] },
    { id: 'kra', name: 'Краснодар', leagueId: 'rpl', seasonIds: ['2024/25'] },
    { id: 'ros', name: 'Ростов', leagueId: 'rpl', seasonIds: ['2024/25'] },
    { id: 'din', name: 'Динамо', leagueId: 'rpl', seasonIds: ['2024/25'] },
    { id: 'sochi', name: 'Сочи', leagueId: 'rpl', seasonIds: ['2024/25'] }
  ],
  matches: [],
  bets: [],
  bankroll: { initial: 10000, current: 10000 },
  lastUpdated: new Date().toISOString(),
  version: '6.0'
};

let subscribers = [];
let currentData = null;
let unsubscribeFirestore = null;

export const initStore = (callback) => {
  const docRef = doc(db, 'football', 'stats');
  
  unsubscribeFirestore = onSnapshot(docRef, async (snapshot) => {
    if (snapshot.exists()) {
      currentData = snapshot.data();
      
      // Миграция старых данных
      if (!currentData.seasons) {
        currentData.seasons = DEFAULT_DATA.seasons;
      }
      if (currentData.teams && !currentData.teams[0]?.seasonIds) {
        currentData.teams = currentData.teams.map(t => ({ ...t, seasonIds: ['2024/25'] }));
      }
      if (currentData.matches && !currentData.matches[0]?.seasonId) {
        currentData.matches = currentData.matches.map(m => ({ 
          ...m, 
          seasonId: getSeasonFromDate(m.date) 
        }));
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
  const dataWithTimestamp = { ...data, lastUpdated: new Date().toISOString() };
  
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

// ===== СЕЗОНЫ =====
export const getSeasons = (leagueId) => {
  const data = getData();
  return data.seasons?.filter(s => s.leagueId === leagueId) || [];
};

export const getActiveSeason = (leagueId) => {
  const data = getData();
  return data.seasons?.find(s => s.leagueId === leagueId && s.isActive) || null;
};

export const addSeason = async (season) => {
  const data = getData();
  const newSeason = { ...season, id: season.id || Date.now().toString() };
  const updatedData = { ...data, seasons: [...(data.seasons || []), newSeason] };
  await saveData(updatedData);
  return newSeason;
};

export const updateSeason = async (seasonId, updates) => {
  const data = getData();
  const updatedData = {
    ...data,
    seasons: data.seasons.map(s => s.id === seasonId ? { ...s, ...updates } : s)
  };
  await saveData(updatedData);
  return updates;
};

export const deleteSeason = async (seasonId) => {
  const data = getData();
  const updatedData = {
    ...data,
    seasons: data.seasons.filter(s => s.id !== seasonId),
    matches: data.matches.filter(m => m.seasonId !== seasonId)
  };
  await saveData(updatedData);
};

export const setActiveSeason = async (leagueId, seasonId) => {
  const data = getData();
  const updatedData = {
    ...data,
    seasons: data.seasons.map(s => ({
      ...s,
      isActive: s.leagueId === leagueId ? s.id === seasonId : s.isActive
    }))
  };
  await saveData(updatedData);
};

// ===== ЛИГИ =====
export const addLeague = async (league) => {
  const data = getData();
  const newLeague = { ...league, id: Date.now().toString() };
  const updatedData = { ...data, leagues: [...data.leagues, newLeague] };
  await saveData(updatedData);
  return newLeague;
};

export const deleteLeague = async (leagueId) => {
  const data = getData();
  const updatedData = {
    ...data,
    leagues: data.leagues.filter(l => l.id !== leagueId),
    seasons: data.seasons.filter(s => s.leagueId !== leagueId),
    teams: data.teams.filter(t => t.leagueId !== leagueId),
    matches: data.matches.filter(m => m.leagueId !== leagueId)
  };
  await saveData(updatedData);
};

// ===== КОМАНДЫ =====
export const getTeamsForSeason = (leagueId, seasonId) => {
  const data = getData();
  return data.teams.filter(t => 
    t.leagueId === leagueId && 
    (!seasonId || t.seasonIds?.includes(seasonId))
  );
};

export const addTeam = async (team) => {
  const data = getData();
  const newTeam = { ...team, id: Date.now().toString() };
  const updatedData = { ...data, teams: [...data.teams, newTeam] };
  await saveData(updatedData);
  return newTeam;
};

export const updateTeam = async (teamId, updates) => {
  const data = getData();
  const updatedData = {
    ...data,
    teams: data.teams.map(t => t.id === teamId ? { ...t, ...updates } : t)
  };
  await saveData(updatedData);
};

export const deleteTeam = async (teamId) => {
  const data = getData();
  const updatedData = {
    ...data,
    teams: data.teams.filter(t => t.id !== teamId),
    matches: data.matches.filter(m => m.homeTeamId !== teamId && m.awayTeamId !== teamId)
  };
  await saveData(updatedData);
};

// ===== МАТЧИ =====
export const addMatch = async (match) => {
  const data = getData();
  const newMatch = { ...match, id: Date.now().toString() };
  const updatedData = { ...data, matches: [...data.matches, newMatch] };
  await saveData(updatedData);
  return newMatch;
};

export const updateMatch = async (matchId, updates) => {
  const data = getData();
  const updatedData = {
    ...data,
    matches: data.matches.map(m => m.id === matchId ? { ...m, ...updates } : m)
  };
  await saveData(updatedData);
};

export const deleteMatch = async (matchId) => {
  const data = getData();
  const updatedData = { ...data, matches: data.matches.filter(m => m.id !== matchId) };
  await saveData(updatedData);
};

export const getMatchesForSeason = (leagueId, seasonId) => {
  const data = getData();
  let matches = data.matches.filter(m => m.leagueId === leagueId);
  if (seasonId) {
    matches = matches.filter(m => m.seasonId === seasonId);
  }
  return matches.sort((a, b) => new Date(b.date) - new Date(a.date));
};

// ===== СТАТИСТИКА =====
export const getLeagueAverages = (leagueId, seasonId) => {
  const data = getData();
  
  // Ищем сезон
  let season = data.seasons?.find(s => s.leagueId === leagueId && s.id === seasonId);
  if (!season) {
    season = data.seasons?.find(s => s.leagueId === leagueId && s.isActive);
  }
  if (!season) {
    season = data.seasons?.find(s => s.leagueId === leagueId);
  }
  
  if (season) {
    return {
      avgTotalCorners: season.avgTotalCorners || 9,
      avgCornersHome: season.avgCornersHome || 5,
      avgCornersAway: season.avgCornersAway || 4,
      avgXG: season.avgXG || 1.2,
      avgShotsInsideBox: season.avgShotsInsideBox || 7
    };
  }
  
  return {
    avgTotalCorners: 9,
    avgCornersHome: 5,
    avgCornersAway: 4,
    avgXG: 1.2,
    avgShotsInsideBox: 7
  };
};

export const getTeamStats = (teamId, seasonId, matchesCount = 10) => {
  const data = getData();
  let teamMatches = data.matches
    .filter(m => m.homeTeamId === teamId || m.awayTeamId === teamId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  
  if (seasonId) {
    teamMatches = teamMatches.filter(m => m.seasonId === seasonId);
  }
  
  teamMatches = teamMatches.slice(0, matchesCount);
  
  if (teamMatches.length === 0) return null;
  
  const leagueAverages = getLeagueAverages(teamMatches[0].leagueId, seasonId);
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
    xG: 0,
    xGA: 0,
    shotsInsideBox: 0,
    shotsInsideBoxAgainst: 0,
    possession: 0,
    saves: 0,
  };
  
  teamMatches.forEach(match => {
    const isHome = match.homeTeamId === teamId;
    
    const cornersFor = isHome 
      ? (match.homeCorners || fallbackHomeCorners) 
      : (match.awayCorners || fallbackAwayCorners);
    const cornersAgainst = isHome 
      ? (match.awayCorners || fallbackAwayCorners) 
      : (match.homeCorners || fallbackHomeCorners);
    
    const xg = isHome ? (match.homeXG || fallbackXG) : (match.awayXG || fallbackXG);
    const xga = isHome ? (match.awayXG || fallbackXG) : (match.homeXG || fallbackXG);
    
    const shotsInside = isHome ? (match.homeShotsInsideBox || fallbackShots) : (match.awayShotsInsideBox || fallbackShots);
    const shotsInsideAgainst = isHome ? (match.awayShotsInsideBox || fallbackShots) : (match.homeShotsInsideBox || fallbackShots);
    
    const possession = isHome ? (match.homePossession || 50) : (match.awayPossession || 50);
    const saves = isHome ? (match.homeSaves || 0) : (match.awaySaves || 0);
    
    stats.totalCornersFor += cornersFor;
    stats.totalCornersAgainst += cornersAgainst;
    stats.xG += xg;
    stats.xGA += xga;
    stats.shotsInsideBox += shotsInside;
    stats.shotsInsideBoxAgainst += shotsInsideAgainst;
    stats.possession += possession;
    stats.saves += saves;
    
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
    avgXG: stats.xG / n,
    avgXGA: stats.xGA / n,
    avgShotsInsideBox: stats.shotsInsideBox / n,
    avgShotsInsideBoxAgainst: stats.shotsInsideBoxAgainst / n,
    avgPossession: stats.possession / n,
    avgSaves: stats.saves / n,
    matchesPlayed: n
  };
};

export const predictMatch = (homeTeamId, awayTeamId, leagueId, seasonId, selectedTotal = 9.5) => {
  const data = getData();
  const leagueAverages = getLeagueAverages(leagueId, seasonId);
  const homeStats = getTeamStats(homeTeamId, seasonId);
  const awayStats = getTeamStats(awayTeamId, seasonId);
  
  if (!homeStats || !awayStats || !leagueAverages) return null;
  
  const safeDivide = (a, b, fallback = 1) => {
    if (!b || b === 0 || isNaN(a) || isNaN(b)) return fallback;
    const result = a / b;
    return isNaN(result) || !isFinite(result) ? fallback : result;
  };
  
  const homeCornerRating = Math.max(0.3, safeDivide(homeStats.avgCornersFor, leagueAverages.avgCornersHome, 1));
  const awayDefenseCorner = Math.max(0.3, safeDivide(awayStats.avgCornersAgainst, leagueAverages.avgCornersAway, 1));
  
  let homeExpected = leagueAverages.avgCornersHome * homeCornerRating * awayDefenseCorner;
  if (isNaN(homeExpected) || homeExpected < 1) homeExpected = leagueAverages.avgCornersHome;
  if (homeExpected > 15) homeExpected = 12;
  
  const awayCornerRating = Math.max(0.3, safeDivide(awayStats.avgCornersFor, leagueAverages.avgCornersAway, 1));
  const homeDefenseCorner = Math.max(0.3, safeDivide(homeStats.avgCornersAgainst, leagueAverages.avgCornersHome, 1));
  
  let awayExpected = leagueAverages.avgCornersAway * awayCornerRating * homeDefenseCorner;
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

export const getLeagueTable = (leagueId, seasonId) => {
  const data = getData();
  const teams = getTeamsForSeason(leagueId, seasonId);
  const matches = getMatchesForSeason(leagueId, seasonId);
  
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

// Обновление средних по сезону
export const updateSeasonAverages = async (seasonId) => {
  const data = getData();
  const season = data.seasons?.find(s => s.id === seasonId);
  if (!season) return null;
  
  const matches = data.matches.filter(m => m.seasonId === seasonId);
  if (matches.length === 0) return season;
  
  let total = 0, home = 0, away = 0, xg = 0, shots = 0;
  
  matches.forEach(match => {
    total += (match.homeCorners || 0) + (match.awayCorners || 0);
    home += match.homeCorners || 0;
    away += match.awayCorners || 0;
    xg += (match.homeXG || 0) + (match.awayXG || 0);
    shots += (match.homeShotsInsideBox || 0) + (match.awayShotsInsideBox || 0);
  });
  
  const n = matches.length;
  const updatedSeason = {
    ...season,
    avgTotalCorners: total / n,
    avgCornersHome: home / n,
    avgCornersAway: away / n,
    avgXG: xg / n,
    avgShotsInsideBox: shots / n
  };
  
  const updatedData = {
    ...data,
    seasons: data.seasons.map(s => s.id === seasonId ? updatedSeason : s)
  };
  
  await saveData(updatedData);
  return updatedSeason;
};