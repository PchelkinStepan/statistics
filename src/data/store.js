import { db } from '../firebase';
import { doc, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';

// 🔒 ФЛАГ защиты от рекурсии
let isSavingFromLocal = false;

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
    { id: 'rpl', name: 'РПЛ', country: 'Россия', currentSeason: '2024/25' }
  ],
  seasons: [
    { id: '2023/24', name: '2023/24', leagueId: 'rpl', isActive: false, avgTotalCorners: 8.9, avgCornersHome: 4.9, avgCornersAway: 4.0, avgXG: 1.15, avgShotsInsideBox: 6.3 },
    { id: '2024/25', name: '2024/25', leagueId: 'rpl', isActive: true, avgTotalCorners: 9.2, avgCornersHome: 5.1, avgCornersAway: 4.1, avgXG: 1.18, avgShotsInsideBox: 6.5 }
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

// 🔧 initStore с фиксом гонки данных
export const initStore = (callback) => {
  const docRef = doc(db, 'football', 'stats');
  
  unsubscribeFirestore = onSnapshot(docRef, async (snapshot) => {
    // 🔒 ПРОПУСКАЕМ свои же изменения
    if (isSavingFromLocal) {
      console.log('⏭️ Пропускаем своё обновление');
      return;
    }
    
    if (snapshot.exists()) {
      const cloudData = snapshot.data();
      const cloudMatchesCount = cloudData.matchesCount || 0;
      
      const autoBackup = localStorage.getItem('football_auto_backup');
      const backupData = autoBackup ? JSON.parse(autoBackup) : null;
      const backupMatches = backupData?.matches?.length || 0;
      
      const cached = localStorage.getItem('football_cache');
      const cachedData = cached ? JSON.parse(cached) : null;
      const cachedMatches = cachedData?.matches?.length || 0;
      
      if (backupMatches > 100 && cloudMatchesCount < backupMatches * 0.9 && cloudMatchesCount < 10) {
        console.warn('⚠️ Firebase потерял данные! Восстанавливаю из бэкапа:', backupMatches);
        currentData = backupData;
        await setDoc(docRef, { ...backupData, matches: [], matchesCount: backupMatches });
        const { writeBatch } = await import('firebase/firestore');
        const batch = writeBatch(db);
        backupData.matches?.forEach(m => batch.set(doc(db, 'football', 'stats', 'matches', m.id), m));
        await batch.commit();
      } else if (cachedMatches > cloudMatchesCount && cloudMatchesCount > 10) {
        currentData = cloudData;
      } else {
        currentData = cloudData;
      }
      
      if ((!currentData.matches || currentData.matches.length === 0) && cloudMatchesCount > 10) {
        try {
          const { getDocs, collection } = await import('firebase/firestore');
          const matchesSnap = await getDocs(collection(db, 'football', 'stats', 'matches'));
          currentData.matches = [];
          matchesSnap.forEach(d => currentData.matches.push(d.data()));
          console.log('📦 Матчи из коллекции:', currentData.matches.length);
        } catch(e) {}
      }
      
      if (!currentData.seasons) currentData.seasons = DEFAULT_DATA.seasons;
      if (currentData.teams && !currentData.teams[0]?.seasonIds) {
        currentData.teams = currentData.teams.map(t => ({ ...t, seasonIds: ['2024/25'] }));
      }
      if (currentData.matches && !currentData.matches[0]?.seasonId) {
        currentData.matches = currentData.matches.map(m => ({ ...m, seasonId: getSeasonFromDate(m.date) }));
      }
      
      console.log('☁️ Синхронизировано:', currentData.matches?.length || 0, 'матчей,', currentData.bets?.length || 0, 'ставок');
      
      if (currentData.matches?.length > 10) {
        localStorage.setItem('football_cache', JSON.stringify(currentData));
      }
      
      subscribers.forEach(cb => cb(currentData));
      if (callback) callback(currentData);
    } else {
      // 🔒 ФИКС: НЕ перезаписываем пустую Firebase локальным кэшем
      const autoBackup = localStorage.getItem('football_auto_backup');
      const cached = localStorage.getItem('football_cache');
      if (autoBackup) currentData = JSON.parse(autoBackup);
      else if (cached) currentData = JSON.parse(cached);
      else currentData = { ...DEFAULT_DATA, lastUpdated: new Date().toISOString() };
      
      console.log('📦 Из кэша (без записи в Firebase):', currentData.matches?.length || 0, 'матчей,', currentData.bets?.length || 0, 'ставок');
      // 🔒 НЕ пушим в Firebase — там может быть более свежая версия с другого устройства
      
      subscribers.forEach(cb => cb(currentData));
      if (callback) callback(currentData);
    }
  }, (error) => {
    console.error('❌ Ошибка синхронизации:', error);
    const autoBackup = localStorage.getItem('football_auto_backup');
    const cached = localStorage.getItem('football_cache');
    if (autoBackup) currentData = JSON.parse(autoBackup);
    else if (cached) currentData = JSON.parse(cached);
    if (currentData) subscribers.forEach(cb => cb(currentData));
    if (callback) callback(currentData);
  });
  
  return () => { if (unsubscribeFirestore) unsubscribeFirestore(); };
};

export const getData = () => currentData || DEFAULT_DATA;

export const subscribe = (callback) => {
  subscribers.push(callback);
  if (currentData) callback(currentData);
  return () => { subscribers = subscribers.filter(cb => cb !== callback); };
};

// 🔧 ИСПРАВЛЕНО: saveData с параметром skipMatches
export const saveData = async (data, changedMatchId = null, skipMatches = false) => {
  isSavingFromLocal = true;
  
  const dataWithTimestamp = { 
    ...data, 
    lastUpdated: new Date().toISOString(),
    matchesCount: data.matches?.length || 0
  };
  
  try {
    localStorage.setItem('football_cache', JSON.stringify(dataWithTimestamp));
    if (dataWithTimestamp.matchesCount > 10) {
      localStorage.setItem('football_auto_backup', JSON.stringify(dataWithTimestamp));
    }
    
    const { writeBatch } = await import('firebase/firestore');
    const batch = writeBatch(db);
    
    const { matches, ...metaData } = dataWithTimestamp;
    // Сохраняем метаданные (1 запись)
    batch.set(doc(db, 'football', 'stats'), { ...metaData, matches: [] });
    
    // 🔥 КЛЮЧЕВОЕ: skipMatches — сохраняем только метаданные, матчи не трогаем
    if (skipMatches) {
      // Ничего не делаем с матчами — экономим квоту
    } else if (changedMatchId) {
      const changedMatch = dataWithTimestamp.matches?.find(m => m.id === changedMatchId);
      if (changedMatch) {
        batch.set(doc(db, 'football', 'stats', 'matches', changedMatchId), changedMatch);
      }
    } else {
      // Полная перезапись только при первой синхронизации или восстановлении
      dataWithTimestamp.matches?.forEach(match => {
        batch.set(doc(db, 'football', 'stats', 'matches', match.id), match);
      });
    }
    
    await batch.commit();
    
    const prevCount = currentData?.matches?.length || 0;
    currentData = dataWithTimestamp;
    
    if (prevCount > 0 && dataWithTimestamp.matchesCount < prevCount) {
      console.log('🗑️ Матч удалён:', prevCount, '→', dataWithTimestamp.matchesCount);
    } else if (dataWithTimestamp.matchesCount > prevCount) {
      console.log('✅ Матч добавлен:', prevCount, '→', dataWithTimestamp.matchesCount);
    }
    
    console.log('☁️ Сохранено:', dataWithTimestamp.matchesCount, 'матчей,', dataWithTimestamp.bets?.length || 0, 'ставок', skipMatches ? '(только метаданные)' : '');
    return true;
  } catch (error) {
    console.error('❌ Ошибка сохранения:', error);
    localStorage.setItem('football_offline_save', JSON.stringify(dataWithTimestamp));
    console.log('💾 Сохранено локально (оффлайн)');
    return false;
  } finally {
    setTimeout(() => { isSavingFromLocal = false; }, 2000);
  }
};

// ===== ФУНКЦИИ СЕЗОНОВ =====
export const getSeasons = (leagueId) => { const data = getData(); return data.seasons?.filter(s => s.leagueId === leagueId) || []; };
export const getActiveSeason = (leagueId) => { const data = getData(); return data.seasons?.find(s => s.leagueId === leagueId && s.isActive) || null; };

export const addSeason = async (season) => {
  const data = getData();
  const uniqueId = `${season.leagueId}_${(season.id || season.name).replace(/\//g, '_')}`;
  const exists = data.seasons?.find(s => s.id === uniqueId);
  if (exists) { console.warn('⚠️ Сезон уже существует'); return updateSeason(uniqueId, season); }
  await saveData({ ...data, seasons: [...(data.seasons || []), { ...season, id: uniqueId, leagueId: season.leagueId }] });
  return { ...season, id: uniqueId };
};

export const updateSeason = async (seasonId, updates) => { const data = getData(); await saveData({ ...data, seasons: data.seasons.map(s => s.id === seasonId ? { ...s, ...updates } : s) }, null, true); return updates; };
export const deleteSeason = async (seasonId) => { const data = getData(); await saveData({ ...data, seasons: data.seasons.filter(s => s.id !== seasonId), matches: data.matches.filter(m => m.seasonId !== seasonId) }); };
export const setActiveSeason = async (leagueId, seasonId) => { const data = getData(); await saveData({ ...data, seasons: data.seasons.map(s => ({ ...s, isActive: s.leagueId === leagueId ? s.id === seasonId : s.isActive })) }, null, true); };

// ===== ФУНКЦИИ ЛИГ =====
export const addLeague = async (league) => { const data = getData(); await saveData({ ...data, leagues: [...data.leagues, { ...league, id: Date.now().toString() }] }); return league; };
export const deleteLeague = async (leagueId) => { const data = getData(); await saveData({ ...data, leagues: data.leagues.filter(l => l.id !== leagueId), seasons: data.seasons.filter(s => s.leagueId !== leagueId), teams: data.teams.filter(t => t.leagueId !== leagueId), matches: data.matches.filter(m => m.leagueId !== leagueId) }); };

// ===== ФУНКЦИИ КОМАНД =====
export const getTeamsForSeason = (leagueId, seasonId) => { const data = getData(); return data.teams.filter(t => t.leagueId === leagueId && (!seasonId || t.seasonIds?.includes(seasonId))); };
export const addTeam = async (team) => { const data = getData(); await saveData({ ...data, teams: [...data.teams, { ...team, id: Date.now().toString() }] }); return team; };
export const updateTeam = async (teamId, updates) => { const data = getData(); await saveData({ ...data, teams: data.teams.map(t => t.id === teamId ? { ...t, ...updates } : t) }, null, true); };
export const deleteTeam = async (teamId) => { const data = getData(); await saveData({ ...data, teams: data.teams.filter(t => t.id !== teamId), matches: data.matches.filter(m => m.homeTeamId !== teamId && m.awayTeamId !== teamId) }); };

// ===== ФУНКЦИИ МАТЧЕЙ (ИСПРАВЛЕНО) =====
export const addMatch = async (match) => {
  const data = getData();
  const newMatch = { ...match, id: match.id || Date.now().toString() };
  await saveData(
    { ...data, matches: [...data.matches, newMatch] },
    newMatch.id
  );
  return newMatch;
};

export const updateMatch = async (matchId, updates) => {
  const data = getData();
  await saveData(
    { ...data, matches: data.matches.map(m => m.id === matchId ? { ...m, ...updates } : m) },
    matchId
  );
};

export const deleteMatch = async (matchId) => {
  const data = getData();
  const updatedData = { ...data, matches: data.matches.filter(m => m.id !== matchId) };
  
  try {
    const { deleteDoc: delDoc } = await import('firebase/firestore');
    await delDoc(doc(db, 'football', 'stats', 'matches', matchId));
    console.log('🗑️ Документ удалён из коллекции:', matchId);
  } catch(e) {
    console.warn('⚠️ Не удалось удалить из коллекции:', e.message);
  }
  
  await saveData(updatedData);
};

export const getMatchesForSeason = (leagueId, seasonId) => { const data = getData(); let m = data.matches.filter(m => m.leagueId === leagueId); if (seasonId) m = m.filter(m => m.seasonId === seasonId); return m.sort((a, b) => new Date(b.date) - new Date(a.date)); };

// ===== СТАТИСТИКА И ПРЕДСКАЗАНИЯ =====
export const getLeagueAverages = (leagueId, seasonId) => {
  const data = getData();
  let s = data.seasons?.find(s => s.leagueId === leagueId && s.id === seasonId);
  if (!s) s = data.seasons?.find(s => s.leagueId === leagueId && s.isActive);
  if (!s) s = data.seasons?.find(s => s.leagueId === leagueId);
  if (s) return { avgTotalCorners: s.avgTotalCorners || 9, avgCornersHome: s.avgCornersHome || 5, avgCornersAway: s.avgCornersAway || 4, avgXG: s.avgXG || 1.2, avgShotsInsideBox: s.avgShotsInsideBox || 7 };
  return { avgTotalCorners: 9, avgCornersHome: 5, avgCornersAway: 4, avgXG: 1.2, avgShotsInsideBox: 7 };
};

export const getTeamStats = (teamId, seasonId, matchesCount = 10) => {
  const data = getData();
  let tm = data.matches.filter(m => m.homeTeamId === teamId || m.awayTeamId === teamId).sort((a, b) => new Date(b.date) - new Date(a.date));
  if (seasonId) tm = tm.filter(m => m.seasonId === seasonId);
  tm = tm.slice(0, matchesCount);
  if (tm.length === 0) return null;
  const fm = tm[0];
  let la; try { la = getLeagueAverages(fm.leagueId, seasonId); } catch (e) { la = null; }
  if (!la) return null;
  const fXG = la?.avgXG || 1.2, fSh = la?.avgShotsInsideBox || 7, fHC = la?.avgCornersHome || 5, fAC = la?.avgCornersAway || 4;
  let st = { teamId, matchesPlayed: tm.length, totalCornersFor: 0, totalCornersAgainst: 0, cornersForHome: 0, cornersForAway: 0, xG: 0, xGA: 0, shotsInsideBox: 0, shotsInsideBoxAgainst: 0, possession: 0, saves: 0 };
  tm.forEach(m => {
    const ih = m.homeTeamId === teamId;
    st.totalCornersFor += ih ? (m.homeCorners || fHC) : (m.awayCorners || fAC);
    st.totalCornersAgainst += ih ? (m.awayCorners || fAC) : (m.homeCorners || fHC);
    st.xG += ih ? (m.homeXG || fXG) : (m.awayXG || fXG);
    st.xGA += ih ? (m.awayXG || fXG) : (m.homeXG || fXG);
    st.shotsInsideBox += ih ? (m.homeShotsInsideBox || fSh) : (m.awayShotsInsideBox || fSh);
    st.shotsInsideBoxAgainst += ih ? (m.awayShotsInsideBox || fSh) : (m.homeShotsInsideBox || fSh);
    st.possession += ih ? (m.homePossession || 50) : (m.awayPossession || 50);
    st.saves += ih ? (m.homeSaves || 0) : (m.awaySaves || 0);
    if (ih) st.cornersForHome += (m.homeCorners || fHC); else st.cornersForAway += (m.awayCorners || fAC);
  });
  const n = st.matchesPlayed, hm = tm.filter(m => m.homeTeamId === teamId).length, am = tm.filter(m => m.awayTeamId === teamId).length;
  return { ...st, avgCornersFor: st.totalCornersFor / n, avgCornersAgainst: st.totalCornersAgainst / n, avgCornersForHome: hm > 0 ? st.cornersForHome / hm : 0, avgCornersForAway: am > 0 ? st.cornersForAway / am : 0, avgXG: st.xG / n, avgXGA: st.xGA / n, avgShotsInsideBox: st.shotsInsideBox / n, avgShotsInsideBoxAgainst: st.shotsInsideBoxAgainst / n, avgPossession: st.possession / n, avgSaves: st.saves / n, matchesPlayed: n };
};

/** P(T <= maxK) для T ~ Poisson(lambda), суммирование PMF от 0 */
export const poissonCdf = (lambda, maxK) => {
  if (!isFinite(lambda) || lambda <= 0) return maxK < 0 ? 0 : 1;
  if (maxK < 0) return 0;
  let sum = 0;
  let pmf = Math.exp(-lambda);
  sum += pmf;
  for (let k = 1; k <= maxK; k++) {
    pmf = (pmf * lambda) / k;
    sum += pmf;
    if (sum >= 1 - 1e-12) return 1;
  }
  return sum;
};

/**
 * Вероятность ТБ для линии с «половиной» (9.5, 10.5): тотал целый, ТБ если угловых >= floor(line)+1
 * @returns {number} процент 0–100
 */
export const poissonOverProbabilityPct = (lambdaTotal, lineTotal) => {
  const maxUnder = Math.floor(lineTotal);
  const pUnder = poissonCdf(lambdaTotal, maxUnder);
  const pOver = Math.max(0, Math.min(1, 1 - pUnder));
  return pOver * 100;
};

const poissonRecommendation = (tp, selectedTotal) => {
  const t = Math.round(tp);
  if (tp >= 72) return `🔥 СИЛЬНЫЙ ТБ ${selectedTotal} (${t}%)`;
  if (tp >= 62) return `✅ ХОРОШИЙ ТБ ${selectedTotal} (${t}%)`;
  if (tp >= 54) return `🤔 Слабый ТБ ${selectedTotal} (${t}%)`;
  if (tp >= 48) return `➖ Рядом с линией ${selectedTotal} (${t}%)`;
  if (tp >= 40) return `🤔 Слабый ТМ ${selectedTotal} (${100 - t}%)`;
  if (tp >= 30) return `✅ ХОРОШИЙ ТМ ${selectedTotal} (${100 - t}%)`;
  return `🔥 СИЛЬНЫЙ ТМ ${selectedTotal} (${100 - t}%)`;
};

export const predictMatch = (homeTeamId, awayTeamId, leagueId, seasonId, selectedTotal = 9.5) => {
  const data = getData();
  const la = getLeagueAverages(leagueId, seasonId);
  const hs = getTeamStats(homeTeamId, seasonId);
  const as = getTeamStats(awayTeamId, seasonId);
  if (!hs || !as || !la) return null;
  const sd = (a, b, f = 1) => { if (!b || b === 0 || isNaN(a) || isNaN(b)) return f; const r = a / b; return isNaN(r) || !isFinite(r) ? f : r; };
  const hcr = Math.max(0.3, sd(hs.avgCornersFor, la.avgCornersHome, 1));
  const adc = Math.max(0.3, sd(as.avgCornersAgainst, la.avgCornersAway, 1));
  let he = la.avgCornersHome * hcr * adc;
  if (isNaN(he) || he < 1) he = la.avgCornersHome; if (he > 15) he = 12;
  const acr = Math.max(0.3, sd(as.avgCornersFor, la.avgCornersAway, 1));
  const hdc = Math.max(0.3, sd(hs.avgCornersAgainst, la.avgCornersHome, 1));
  let ae = la.avgCornersAway * acr * hdc;
  if (isNaN(ae) || ae < 0.5) ae = la.avgCornersAway; if (ae > 12) ae = 10;
  he = Math.round(he * 100) / 100; ae = Math.round(ae * 100) / 100;
  const lambdaTotal = Math.max(0.35, he + ae);
  const tp = Math.round(poissonOverProbabilityPct(lambdaTotal, selectedTotal));
  const underPct = Math.max(0, Math.min(100, 100 - tp));
  const rec = poissonRecommendation(tp, selectedTotal);
  return {
    homeExpected: he.toFixed(2),
    awayExpected: ae.toFixed(2),
    totalExpected: (he + ae).toFixed(2),
    lambdaTotal,
    totalProbability: tp,
    underProbability: underPct,
    recommendation: rec,
    selectedTotal,
  };
};

export const getLeagueTable = (leagueId, seasonId) => {
  const data = getData();
  const teams = getTeamsForSeason(leagueId, seasonId);
  const matches = getMatchesForSeason(leagueId, seasonId);
  const table = teams.map(team => {
    let p = 0, w = 0, d = 0, l = 0, gf = 0, ga = 0;
    matches.forEach(m => {
      if (m.homeTeamId === team.id) { p++; gf += m.homeScore || 0; ga += m.awayScore || 0; if ((m.homeScore || 0) > (m.awayScore || 0)) w++; else if (m.homeScore === m.awayScore) d++; else l++; }
      if (m.awayTeamId === team.id) { p++; gf += m.awayScore || 0; ga += m.homeScore || 0; if ((m.awayScore || 0) > (m.homeScore || 0)) w++; else if (m.awayScore === m.homeScore) d++; else l++; }
    });
    return { ...team, played: p, wins: w, draws: d, losses: l, goalsFor: gf, goalsAgainst: ga, goalDiff: gf - ga, points: w * 3 + d };
  });
  return table.sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff);
};

// 🔧 ФИКС: updateSeasonAverages передаёт skipMatches = true
export const updateSeasonAverages = async (seasonId) => {
  const data = getData();
  const season = data.seasons?.find(s => s.id === seasonId);
  if (!season) { console.error('❌ Сезон не найден:', seasonId); return null; }
  const matches = data.matches.filter(m => m.seasonId === seasonId);
  if (matches.length === 0) { console.warn('⚠️ Нет матчей:', seasonId); return season; }
  let t = 0, h = 0, a = 0, xg = 0, sh = 0;
  matches.forEach(m => { t += (m.homeCorners || 0) + (m.awayCorners || 0); h += m.homeCorners || 0; a += m.awayCorners || 0; xg += (m.homeXG || 0) + (m.awayXG || 0); sh += (m.homeShotsInsideBox || 0) + (m.awayShotsInsideBox || 0); });
  const n = matches.length;
  const us = { ...season, avgTotalCorners: t / n, avgCornersHome: h / n, avgCornersAway: a / n, avgXG: xg / n, avgShotsInsideBox: sh / n };
  if (isNaN(us.avgTotalCorners)) { console.error('❌ Средние не посчитались!'); return season; }
  console.log('✅ Средние обновлены:', seasonId, { тотал: us.avgTotalCorners.toFixed(2), дома: us.avgCornersHome.toFixed(2), гости: us.avgCornersAway.toFixed(2), матчей: n });
  await saveData({ ...data, seasons: data.seasons.map(s => s.id === seasonId ? us : s) }, null, true);
  return us;
};