import { db } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

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

// Подписка на изменения в реальном времени
let subscribers = [];
let currentData = null;
let unsubscribeFirestore = null;

// Инициализация и подписка на облако
export const initStore = (callback) => {
  const docRef = doc(db, 'football', 'stats');
  
  // Подписываемся на изменения в облаке
  unsubscribeFirestore = onSnapshot(docRef, async (snapshot) => {
    if (snapshot.exists()) {
      currentData = snapshot.data();
      console.log('☁️ Данные получены из облака:', currentData.matches?.length || 0, 'матчей');
    } else {
      // Если облако пустое - создаем с дефолтными данными
      currentData = { ...DEFAULT_DATA, lastUpdated: new Date().toISOString() };
      await setDoc(docRef, currentData);
      console.log('📦 Создана новая база в облаке');
    }
    
    // Оповещаем всех подписчиков
    subscribers.forEach(cb => cb(currentData));
    if (callback) callback(currentData);
  }, (error) => {
    console.error('❌ Ошибка синхронизации:', error);
    // Если офлайн - используем localStorage как кэш
    const cached = localStorage.getItem('football_cache');
    if (cached) {
      currentData = JSON.parse(cached);
      subscribers.forEach(cb => cb(currentData));
      if (callback) callback(currentData);
    }
  });
  
  // Возвращаем функцию отписки
  return () => {
    if (unsubscribeFirestore) unsubscribeFirestore();
  };
};

// Получение текущих данных
export const getData = () => {
  return currentData || DEFAULT_DATA;
};

// Подписка на изменения
export const subscribe = (callback) => {
  subscribers.push(callback);
  if (currentData) callback(currentData);
  
  return () => {
    subscribers = subscribers.filter(cb => cb !== callback);
  };
};

// Сохранение данных в облако
export const saveData = async (data) => {
  const docRef = doc(db, 'football', 'stats');
  const dataWithTimestamp = {
    ...data,
    lastUpdated: new Date().toISOString()
  };
  
  try {
    await setDoc(docRef, dataWithTimestamp);
    console.log('☁️ Данные сохранены в облако');
    localStorage.setItem('football_cache', JSON.stringify(dataWithTimestamp));
    return true;
  } catch (error) {
    console.error('❌ Ошибка сохранения:', error);
    return false;
  }
};

// Добавление матча
export const addMatch = async (match) => {
  const data = getData();
  const newMatch = { ...match, id: Date.now().toString() };
  
  const updatedData = {
    ...data,
    matches: [...data.matches, newMatch]
  };
  
  await saveData(updatedData);
  return newMatch;
};

// Добавление лиги
export const addLeague = async (league) => {
  const data = getData();
  const newLeague = { 
    ...league, 
    id: Date.now().toString(),
    avgXG: league.avgXG || 1.2,
    avgShotsInsideBox: league.avgShotsInsideBox || 7.0,
    avgPossession: 50
  };
  
  const updatedData = {
    ...data,
    leagues: [...data.leagues, newLeague]
  };
  
  await saveData(updatedData);
  return newLeague;
};

// Добавление команды
export const addTeam = async (team) => {
  const data = getData();
  const newTeam = { ...team, id: Date.now().toString() };
  
  const updatedData = {
    ...data,
    teams: [...data.teams, newTeam]
  };
  
  await saveData(updatedData);
  return newTeam;
};

// Удаление матча
export const deleteMatch = async (matchId) => {
  const data = getData();
  const updatedData = {
    ...data,
    matches: data.matches.filter(m => m.id !== matchId)
  };
  await saveData(updatedData);
};

// Удаление лиги
export const deleteLeague = async (leagueId) => {
  const data = getData();
  const updatedData = {
    ...data,
    leagues: data.leagues.filter(l => l.id !== leagueId),
    matches: data.matches.filter(m => m.leagueId !== leagueId)
  };
  await saveData(updatedData);
};

// Удаление команды
export const deleteTeam = async (teamId) => {
  const data = getData();
  const updatedData = {
    ...data,
    teams: data.teams.filter(t => t.id !== teamId)
  };
  await saveData(updatedData);
};

// Добавление ставки
export const addBet = async (bet) => {
  const data = getData();
  const newBet = { ...bet, id: Date.now().toString() };
  
  const updatedData = {
    ...data,
    bets: [...(data.bets || []), newBet]
  };
  
  await saveData(updatedData);
  return newBet;
};

// Обновление банкролла
export const updateBankroll = async (bankroll) => {
  const data = getData();
  const updatedData = {
    ...data,
    bankroll
  };
  await saveData(updatedData);
};

// Получение статистики команды
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
    xG: 0,
    xGA: 0,
    shotsInsideBox: 0
  };
  
  teamMatches.forEach(match => {
    const isHome = match.homeTeamId === teamId;
    
    const cornersFor = isHome ? (match.homeCorners || 0) : (match.awayCorners || 0);
    const cornersAgainst = isHome ? (match.awayCorners || 0) : (match.homeCorners || 0);
    const xg = isHome ? (match.homeXG || league?.avgXG || 1.2) : (match.awayXG || league?.avgXG || 1.2);
    const xga = isHome ? (match.awayXG || league?.avgXG || 1.2) : (match.homeXG || league?.avgXG || 1.2);
    const shots = isHome ? (match.homeShotsInsideBox || league?.avgShotsInsideBox || 7) : (match.awayShotsInsideBox || league?.avgShotsInsideBox || 7);
    
    stats.totalCornersFor += cornersFor;
    stats.totalCornersAgainst += cornersAgainst;
    stats.xG += xg;
    stats.xGA += xga;
    stats.shotsInsideBox += shots;
    
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
    matchesPlayed: n
  };
};

// Прогноз матча
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
  
  const homeCornerRating = Math.max(0.3, safeDivide(homeStats.avgCornersFor, league.avgCornersHome, 1));
  const awayDefenseCorner = Math.max(0.3, safeDivide(awayStats.avgCornersAgainst, league.avgCornersAway, 1));
  
  let homeExpected = league.avgCornersHome * homeCornerRating * awayDefenseCorner;
  if (isNaN(homeExpected) || homeExpected < 1) homeExpected = league.avgCornersHome;
  if (homeExpected > 15) homeExpected = 12;
  
  const awayCornerRating = Math.max(0.3, safeDivide(awayStats.avgCornersFor, league.avgCornersAway, 1));
  const homeDefenseCorner = Math.max(0.3, safeDivide(homeStats.avgCornersAgainst, league.avgCornersHome, 1));
  
  let awayExpected = league.avgCornersAway * awayCornerRating * homeDefenseCorner;
  if (isNaN(awayExpected) || awayExpected < 0.5) awayExpected = league.avgCornersAway;
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

// Турнирная таблица
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