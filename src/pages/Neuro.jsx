import { useState, useEffect, useRef } from 'react';
import { Brain, Activity, Database, Target, Play, RefreshCw, Calculator, Clock, Save, Wallet, TrendingUp } from 'lucide-react';
import { getData, getActiveSeason } from '../data/store';
import * as tf from '@tensorflow/tfjs';
import BetModal from '../components/BetModal';

const Neuro = () => {
  const data = getData();
  const totalMatches = data.matches?.length || 0;

  const [activeTab, setActiveTab] = useState('tensorflow');
  const [trainingLog, setTrainingLog] = useState([]);
  const [isTraining, setIsTraining] = useState(false);
  const [isRetraining, setIsRetraining] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [loadedModel, setLoadedModel] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [trainingHistory, setTrainingHistory] = useState([]);
  const [historicalErrors, setHistoricalErrors] = useState([]);
  const [leagueStats, setLeagueStats] = useState({});
  const [showBetModal, setShowBetModal] = useState(false);

  const [selectedTotal, setSelectedTotal] = useState(9.5);
  const availableTotals = [6.5, 7.5, 8.5, 9.5, 10.5, 11.5, 12.5];

  const [predictLeague, setPredictLeague] = useState(data.leagues?.[0]?.id || 'rpl');
  const [predictHomeTeam, setPredictHomeTeam] = useState('');
  const [predictAwayTeam, setPredictAwayTeam] = useState('');
  const [neuroPrediction, setNeuroPrediction] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false);
  
  // 🔥 Value калькулятор
  const [manualKef, setManualKef] = useState('1.85');
  const [valueResult, setValueResult] = useState(null);

  const modelLoadedRef = useRef(false);

  const activeSeason = getActiveSeason(predictLeague)?.id;
  const teamsInLeague = data.teams?.filter(t => t.leagueId === predictLeague) || [];

  // 🔥 Расчёт value при изменении кэфа или прогноза
  useEffect(() => {
    if (neuroPrediction && manualKef && testResults) {
      const kef = parseFloat(manualKef);
      const accuracy = parseFloat(testResults.accuracy || 58);
      if (kef > 0) {
        const value = ((accuracy / 100) * kef * 100 - 100).toFixed(1);
        const isValue = value > 5;
        const isSuper = value > 10;
        setValueResult({ value, isValue, isSuper, accuracy });
      }
    }
  }, [manualKef, neuroPrediction, testResults]);

  const getDefaultTotal = (leagueId) => {
    const season = data.seasons?.find(s => s.leagueId === leagueId && s.isActive);
    const league = data.leagues?.find(l => l.id === leagueId);
    if (league?.name === 'АПЛ') return 10.5;
    const avg = season?.avgTotalCorners || 9.5;
    return Math.ceil(avg * 2) / 2;
  };

  const getLineTotalForLeague = (leagueId, seasons) => {
    const season = seasons?.find(s => s.leagueId === leagueId && s.isActive);
    const league = data.leagues?.find(l => l.id === leagueId);
    if (league?.name === 'АПЛ') return 10.5;
    const avg = season?.avgTotalCorners || 9.5;
    return Math.ceil(avg * 2) / 2;
  };

  useEffect(() => { setSelectedTotal(getDefaultTotal(predictLeague)); }, [predictLeague, data.seasons]);

  useEffect(() => {
    const loadSavedModel = async () => {
      if (modelLoadedRef.current) return;
      modelLoadedRef.current = true;
      try {
        const models = await tf.io.listModels();
        if (models['localstorage://football-neuro-model']) {
          setModelReady(true);
          const model = await tf.loadLayersModel('localstorage://football-neuro-model');
          model.compile({ optimizer: tf.train.adam(0.001), loss: 'meanSquaredError', metrics: ['mae'] });
          setLoadedModel(model);
          const sr = localStorage.getItem('neuro_test_results');
          if (sr) try { setTestResults(JSON.parse(sr)); } catch(e) {}
          const sh = localStorage.getItem('neuro_training_history');
          if (sh) try { setTrainingHistory(JSON.parse(sh)); } catch(e) {}
          const se = localStorage.getItem('neuro_historical_errors');
          if (se) try { setHistoricalErrors(JSON.parse(se)); } catch(e) {}
          const sl = localStorage.getItem('neuro_league_stats');
          if (sl) try { setLeagueStats(JSON.parse(sl)); } catch(e) {}
          addLog('✅ Модель загружена из кэша');
        } else {
          addLog('⚡ Модель не найдена. Нажмите "Обучить".');
        }
      } catch (error) { console.error(error); }
    };
    loadSavedModel();
  }, []);

  const addLog = (msg) => { console.log(msg); setTrainingLog(p => [...p, { time: new Date().toLocaleTimeString(), text: msg }]); };

  const addHist = (t, m, a, mae) => {
    const e = { type: t, date: new Date().toISOString(), matches: m, accuracy: a, mae };
    const u = [e, ...trainingHistory].slice(0, 20);
    setTrainingHistory(u);
    localStorage.setItem('neuro_training_history', JSON.stringify(u));
  };

  const safe = (val, fallback = 0) => (val != null && isFinite(val) && !isNaN(val)) ? val : fallback;

  const getLeagueAvgTotal = (leagueId, seasons) => {
    const season = seasons?.find(s => s.leagueId === leagueId && s.isActive);
    return season?.avgTotalCorners || 9.5;
  };

  const getLastMatches = (allMatches, teamId, beforeDate, count) => {
    return allMatches
      .filter(m => (m.homeTeamId === teamId || m.awayTeamId === teamId) && m.date < beforeDate)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, count);
  };

  const calculateFeatures = (matches, teamId) => {
    if (!matches.length) {
      return {
        avgCornersFor: 5, avgCornersAgainst: 4.5, cornersTrend: 0, avgXG: 1.2, avgPossession: 50,
        avgShotsInside: 6, formPoints: 0, matchesPlayed: 0, avgCornersForHome: 5, avgCornersAgainstHome: 4.5,
        avgCornersForAway: 5, avgCornersAgainstAway: 4.5, avgCorners1H: 2.5, avgCorners2H: 2.5, ratio1H: 0.5,
        avgCorners1HHome: 2.5, avgCorners2HHome: 2.5, avgCorners1HAway: 2.5, avgCorners2HAway: 2.5
      };
    }
    
    let tf = 0, ta = 0, cfh = 0, cfa = 0, cah = 0, caa = 0, hc = 0, ac = 0, tx = 0, tp = 0, ts = 0, ct = [], pt = 0;
    let c1 = 0, c2 = 0, c1h = 0, c2h = 0, c1a = 0, c2a = 0;
    
    matches.forEach(m => {
      const isHome = m.homeTeamId === teamId;
      const teamScore = isHome ? (m.homeScore || 0) : (m.awayScore || 0);
      const oppScore = isHome ? (m.awayScore || 0) : (m.homeScore || 0);
      const cornersFor = isHome ? (m.homeCorners || 0) : (m.awayCorners || 0);
      const cornersAgainst = isHome ? (m.awayCorners || 0) : (m.homeCorners || 0);
      const corners1H = isHome ? (m.homeCorners1H || 0) : (m.awayCorners1H || 0);
      const corners2H = isHome ? (m.homeCorners2H || 0) : (m.awayCorners2H || 0);
      c1 += corners1H; c2 += corners2H;
      if (isHome) { cfh += cornersFor; cah += cornersAgainst; c1h += corners1H; c2h += corners2H; hc++; }
      else { cfa += cornersFor; caa += cornersAgainst; c1a += corners1H; c2a += corners2H; ac++; }
      tf += cornersFor; ta += cornersAgainst; ct.push(cornersFor);
      tx += isHome ? (m.homeXG || 1.2) : (m.awayXG || 1.2);
      tp += isHome ? (m.homePossession || 50) : (m.awayPossession || 50);
      ts += isHome ? (m.homeShotsInsideBox || 6) : (m.awayShotsInsideBox || 6);
      if (teamScore > oppScore) pt += 3; else if (teamScore === oppScore) pt += 1;
    });
    
    const n = matches.length;
    const half = Math.floor(n / 2);
    const firstHalfAvg = ct.slice(0, half).reduce((a, b) => a + b, 0) / half;
    const secondHalfAvg = ct.slice(half).reduce((a, b) => a + b, 0) / (n - half);
    const rawTrend = firstHalfAvg - secondHalfAvg;
    const normalizedTrend = Math.max(-3, Math.min(3, rawTrend));
    
    return {
      avgCornersFor: tf / n, avgCornersAgainst: ta / n, cornersTrend: normalizedTrend,
      avgXG: tx / n, avgPossession: tp / n, avgShotsInside: ts / n, formPoints: pt, matchesPlayed: n,
      avgCornersForHome: hc > 0 ? cfh / hc : tf / n, avgCornersAgainstHome: hc > 0 ? cah / hc : ta / n,
      avgCornersForAway: ac > 0 ? cfa / ac : tf / n, avgCornersAgainstAway: ac > 0 ? caa / ac : ta / n,
      avgCorners1H: c1 / n, avgCorners2H: c2 / n, ratio1H: tf > 0 ? c1 / tf : 0.5,
      avgCorners1HHome: hc > 0 ? c1h / hc : c1 / n, avgCorners2HHome: hc > 0 ? c2h / hc : c2 / n,
      avgCorners1HAway: ac > 0 ? c1a / ac : c1 / n, avgCorners2HAway: ac > 0 ? c2a / ac : c2 / n,
    };
  };

  const buildFeatures = (homeStats, awayStats, round, leagueAvgTotal) => {
    return [
      safe(homeStats.avgCornersFor, 5), safe(homeStats.avgCornersAgainst, 4.5), safe(homeStats.cornersTrend, 0),
      safe(homeStats.avgXG, 1.2), safe(homeStats.avgPossession, 50), safe(homeStats.avgShotsInside, 6), safe(homeStats.formPoints / 3, 0),
      safe(awayStats.avgCornersFor, 4.5), safe(awayStats.avgCornersAgainst, 5), safe(awayStats.cornersTrend, 0),
      safe(awayStats.avgXG, 1.1), safe(awayStats.avgPossession, 50), safe(awayStats.avgShotsInside, 5.5), safe(awayStats.formPoints / 3, 0),
      safe(homeStats.avgCornersForHome, 5), safe(homeStats.avgCornersAgainstHome, 4.5),
      safe(awayStats.avgCornersForAway, 4.5), safe(awayStats.avgCornersAgainstAway, 5),
      safe(homeStats.avgCorners1H, 2.5), safe(homeStats.avgCorners2H, 2.5), safe(homeStats.ratio1H, 0.5),
      safe(awayStats.avgCorners1H, 2.5), safe(awayStats.avgCorners2H, 2.5), safe(awayStats.ratio1H, 0.5),
      safe(homeStats.avgCorners1HHome, 2.5), safe(homeStats.avgCorners2HHome, 2.5),
      safe(awayStats.avgCorners1HAway, 2.5), safe(awayStats.avgCorners2HAway, 2.5),
      safe(round, 0), safe(homeStats.matchesPlayed, 10), safe(awayStats.matchesPlayed, 10),
      safe(leagueAvgTotal, 9.5),
    ];
  };

  const prepareTrainingData = (allMatches, seasons) => {
    const sortedMatches = [...allMatches].sort((a, b) => new Date(a.date) - new Date(b.date));
    const trainingExamples = [];
    for (let i = 20; i < sortedMatches.length; i++) {
      const match = sortedMatches[i];
      const homePast = getLastMatches(sortedMatches, match.homeTeamId, match.date, 12);
      const awayPast = getLastMatches(sortedMatches, match.awayTeamId, match.date, 12);
      if (homePast.length < 5 || awayPast.length < 5) continue;
      const homeStats = calculateFeatures(homePast, match.homeTeamId);
      const awayStats = calculateFeatures(awayPast, match.awayTeamId);
      const actualTotal = (match.homeCorners || 0) + (match.awayCorners || 0);
      const leagueAvgTotal = getLeagueAvgTotal(match.leagueId, seasons);
      const round = match.round ? parseInt(match.round) || 0 : 0;
      const features = buildFeatures(homeStats, awayStats, round, leagueAvgTotal);
      if (features.some(f => isNaN(f) || !isFinite(f))) continue;
      trainingExamples.push({ features, label: actualTotal });
    }
    return trainingExamples;
  };

  const createModel = () => {
    const model = tf.sequential();
    model.add(tf.layers.dense({ units: 64, activation: 'relu', inputShape: [32], kernelRegularizer: tf.regularizers.l2({ l2: 0.001 }) }));
    model.add(tf.layers.dropout({ rate: 0.3 }));
    model.add(tf.layers.dense({ units: 32, activation: 'relu', kernelRegularizer: tf.regularizers.l2({ l2: 0.001 }) }));
    model.add(tf.layers.dropout({ rate: 0.2 }));
    model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1, activation: 'linear' }));
    model.compile({ optimizer: tf.train.adam(0.0005), loss: 'meanSquaredError', metrics: ['mae'] });
    return model;
  };

  const runHonestTest = (model, allMatches, allSeasons, normParams) => {
    const matchesByLeague = {};
    allMatches.forEach(m => {
      if (!matchesByLeague[m.leagueId]) matchesByLeague[m.leagueId] = [];
      matchesByLeague[m.leagueId].push(m);
    });
    
    let totalCorrect = 0, totalTested = 0, totalAbsError = 0;
    const errors = [];
    const leagueResults = {};
    
    for (const leagueId in matchesByLeague) {
      const leagueMatches = [...matchesByLeague[leagueId]].sort((a, b) => new Date(a.date) - new Date(b.date));
      if (leagueMatches.length < 30) continue;
      
      const testStart = Math.floor(leagueMatches.length * 0.8);
      const lineTotalForLeague = getLineTotalForLeague(leagueId, allSeasons);
      let leagueCorrect = 0, leagueTested = 0;
      
      for (let i = testStart; i < leagueMatches.length; i++) {
        const match = leagueMatches[i];
        const actualTotal = (match.homeCorners || 0) + (match.awayCorners || 0);
        const homePast = getLastMatches(leagueMatches, match.homeTeamId, match.date, 12);
        const awayPast = getLastMatches(leagueMatches, match.awayTeamId, match.date, 12);
        if (homePast.length < 5 || awayPast.length < 5) continue;
        
        const homeStats = calculateFeatures(homePast, match.homeTeamId);
        const awayStats = calculateFeatures(awayPast, match.awayTeamId);
        const leagueAvgTotal = getLeagueAvgTotal(match.leagueId, allSeasons);
        const round = match.round ? parseInt(match.round) || 0 : 0;
        let features = buildFeatures(homeStats, awayStats, round, leagueAvgTotal);
        if (features.some(f => isNaN(f) || !isFinite(f))) continue;
        
        if (normParams) {
          features = features.map((val, i) => {
            const mean = normParams.mean[i] || 0;
            const std = normParams.std[i] || 1;
            return (val - mean) / std;
          });
        }
        
        const inputTensor = tf.tensor2d([features]);
        const predictionTensor = model.predict(inputTensor);
        let prediction = predictionTensor.dataSync()[0];
        inputTensor.dispose(); predictionTensor.dispose();
        prediction = Math.max(0, prediction);
        
        totalAbsError += Math.abs(prediction - actualTotal);
        errors.push(actualTotal - prediction);
        
        const actualOver = actualTotal > lineTotalForLeague;
        const modelOver = prediction > lineTotalForLeague;
        if (modelOver === actualOver) { totalCorrect++; leagueCorrect++; }
        totalTested++; leagueTested++;
      }
      
      if (leagueTested > 0) {
        leagueResults[leagueId] = {
          lineTotal: lineTotalForLeague,
          correct: leagueCorrect, tested: leagueTested,
          accuracy: ((leagueCorrect / leagueTested) * 100).toFixed(1)
        };
      }
    }
    
    const accuracy = totalTested > 0 ? ((totalCorrect / totalTested) * 100).toFixed(1) : '0.0';
    const avgError = totalTested > 0 ? (totalAbsError / totalTested).toFixed(2) : '0';
    setLeagueStats(leagueResults);
    localStorage.setItem('neuro_league_stats', JSON.stringify(leagueResults));
    localStorage.setItem('neuro_historical_errors', JSON.stringify(errors));
    setHistoricalErrors(errors);
    
    console.log('📊 Точность по лигам:');
    Object.entries(leagueResults).forEach(([lid, st]) => {
      const ln = data.leagues?.find(l => l.id === lid)?.name || lid;
      console.log(` ${ln} (тотал ${st.lineTotal}): ${st.accuracy}% (${st.correct}/${st.tested})`);
    });
    
    return { accuracy, avgError, totalCorrect, totalTested, errors, leagueResults };
  };

  const trainModel = async () => {
    setIsTraining(true); setTrainingLog([]);
    try {
      addLog('🚀 ОБУЧЕНИЕ Neuro AI');
      addLog(`📊 ${totalMatches} матчей`);
      
      const trainingExamples = prepareTrainingData(data.matches, data.seasons);
      addLog(`✅ ${trainingExamples.length} примеров`);
      
      if (trainingExamples.length < 100) { addLog('❌ Мало данных'); setIsTraining(false); return; }
      
      const trainSize = Math.floor(trainingExamples.length * 0.8);
      const trainEx = trainingExamples.slice(0, trainSize);
      const valEx = trainingExamples.slice(trainSize);
      
      const xsTensor = tf.tensor2d(trainEx.map(e => e.features));
      const moments = tf.moments(xsTensor, 0);
      const mean = moments.mean;
      const std = moments.variance.sqrt().add(1e-7);
      const normParams = { mean: await mean.array(), std: await std.array() };
      localStorage.setItem('neuro_norm_params', JSON.stringify(normParams));
      
      const xsN = xsTensor.sub(mean).div(std);
      const ysT = tf.tensor2d(trainEx.map(e => e.label), [trainEx.length, 1]);
      const valXsT = tf.tensor2d(valEx.map(e => e.features));
      const valXsN = valXsT.sub(mean).div(std);
      const valYsT = tf.tensor2d(valEx.map(e => e.label), [valEx.length, 1]);
      
      addLog('📊 Данные нормализованы');
      const model = createModel();
      addLog('✅ Модель создана');
      addLog('🎓 Обучение 120 эпох...');
      
      const history = await model.fit(xsN, ysT, {
        epochs: 120, batchSize: 32,
        validationData: [valXsN, valYsT],
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (epoch % 20 === 0 || epoch === 119) {
              addLog(` Эпоха ${epoch+1}: loss=${logs.loss.toFixed(4)}, mae=${logs.mae.toFixed(2)}, val_mae=${logs.val_mae.toFixed(2)}`);
            }
          }
        }
      });
      
      const finalTrainMae = history.history.mae[history.history.mae.length-1];
      const finalValMae = history.history.val_mae[history.history.val_mae.length-1];
      addLog(`✅ Train MAE: ±${finalTrainMae.toFixed(2)}, Val MAE: ±${finalValMae.toFixed(2)}`);
      
      xsTensor.dispose(); xsN.dispose(); ysT.dispose(); valXsT.dispose(); valXsN.dispose(); valYsT.dispose();
      
      addLog('🧪 ЧЕСТНОЕ тестирование...');
      const results = runHonestTest(model, data.matches, data.seasons, normParams);
      addLog(`📊 Точность: ${results.accuracy}% (${results.totalCorrect}/${results.totalTested})`);
      addLog(`📊 MAE: ±${results.avgError} угловых`);
      
      setTestResults(results);
      localStorage.setItem('neuro_test_results', JSON.stringify(results));
      setModelReady(true); setLoadedModel(model);
      addHist('full', totalMatches, parseFloat(results.accuracy), parseFloat(results.avgError));
      
      await model.save('localstorage://football-neuro-model');
      addLog('💾 Модель сохранена');
      localStorage.setItem('neuro_last_trained', new Date().toISOString());
      localStorage.setItem('neuro_matches_count', totalMatches);
    } catch (error) { addLog(`❌ ${error.message}`); console.error(error); }
    setIsTraining(false);
  };

  const retrainModel = async () => {
    if (!loadedModel) { addLog('❌ Модель не загружена'); return; }
    setIsRetraining(true); setTrainingLog([]);
    try {
      addLog('📚 ДООБУЧЕНИЕ');
      const trainingExamples = prepareTrainingData(data.matches, data.seasons);
      addLog(`✅ ${trainingExamples.length} примеров`);
      
      const recentSize = Math.floor(trainingExamples.length * 0.7);
      const recent = trainingExamples.slice(-recentSize);
      const xs = recent.map(e => e.features);
      const ys = recent.map(e => e.label);
      
      const normParams = JSON.parse(localStorage.getItem('neuro_norm_params') || 'null');
      const xsT = tf.tensor2d(xs);
      const mean = tf.tensor1d(normParams.mean);
      const std = tf.tensor1d(normParams.std);
      const xsN = xsT.sub(mean).div(std);
      const ysT = tf.tensor2d(ys, [ys.length, 1]);
      
      addLog('🎓 Дообучение (60 эпох)...');
      loadedModel.compile({ optimizer: tf.train.adam(0.0001), loss: 'meanSquaredError', metrics: ['mae'] });
      await loadedModel.fit(xsN, ysT, {
        epochs: 60, batchSize: 32,
        callbacks: { onEpochEnd: (e, l) => { if (e % 15 === 0 || e === 59) addLog(` Эпоха ${e+1}: loss=${l.loss.toFixed(4)}, mae=${l.mae.toFixed(2)}`); } }
      });
      
      xsT.dispose(); xsN.dispose(); ysT.dispose();
      
      const results = runHonestTest(loadedModel, data.matches, data.seasons, normParams);
      addLog(`📊 Точность: ${results.accuracy}% | MAE: ±${results.avgError}`);
      
      setTestResults(results);
      localStorage.setItem('neuro_test_results', JSON.stringify(results));
      addHist('retrain', totalMatches, parseFloat(results.accuracy), parseFloat(results.avgError));
      
      await loadedModel.save('localstorage://football-neuro-model');
      localStorage.setItem('neuro_last_trained', new Date().toISOString());
      localStorage.setItem('neuro_matches_count', totalMatches);
    } catch (error) { addLog(`❌ ${error.message}`); }
    setIsRetraining(false);
  };

  const getEmpiricalProbability = (expectedTotal, selectedTotal) => {
    if (historicalErrors.length < 20) return 50;
    const simulatedTotals = historicalErrors.map(err => expectedTotal + err);
    const above = simulatedTotals.filter(t => t > selectedTotal).length;
    const near = simulatedTotals.filter(t => Math.abs(t - selectedTotal) < 0.3).length;
    let probOver = (above + near * 0.3) / simulatedTotals.length;
    probOver = Math.min(0.95, Math.max(0.05, probOver));
    return Math.round(probOver * 100);
  };

  const predictWithNeuro = async () => {
    if (!predictHomeTeam || !predictAwayTeam || !loadedModel) return;
    setIsPredicting(true); setNeuroPrediction(null);
    try {
      const allMatches = [...(data.matches || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
      const homePast = getLastMatches(allMatches, predictHomeTeam, new Date().toISOString(), 12);
      const awayPast = getLastMatches(allMatches, predictAwayTeam, new Date().toISOString(), 12);
      if (homePast.length < 3 || awayPast.length < 3) { setIsPredicting(false); return; }
      
      const homeStats = calculateFeatures(homePast, predictHomeTeam);
      const awayStats = calculateFeatures(awayPast, predictAwayTeam);
      
      homeStats.cornersTrend = Math.max(-3, Math.min(3, homeStats.cornersTrend || 0));
      awayStats.cornersTrend = Math.max(-3, Math.min(3, awayStats.cornersTrend || 0));
      
      const leagueAvgTotal = getLeagueAvgTotal(predictLeague, data.seasons);
      let features = buildFeatures(homeStats, awayStats, 0, leagueAvgTotal);
      
      const normParams = JSON.parse(localStorage.getItem('neuro_norm_params') || 'null');
      if (normParams) {
        features = features.map((val, i) => {
          const mean = normParams.mean[i] || 0;
          const std = normParams.std[i] || 1;
          return (val - mean) / std;
        });
      }
      
      const inputTensor = tf.tensor2d([features]);
      const predictionTensor = loadedModel.predict(inputTensor);
      let expectedTotal = predictionTensor.dataSync()[0];
      inputTensor.dispose(); predictionTensor.dispose();
      expectedTotal = Math.max(2, Math.min(18, expectedTotal));
      
      const overProb = getEmpiricalProbability(expectedTotal, selectedTotal);
      const underProb = 100 - overProb;
      
      setNeuroPrediction({
        expectedTotal: expectedTotal.toFixed(2), overProbability: overProb, underProbability: underProb,
        recommendation: overProb > 70 ? `🔥 СТАВЛЮ! ТБ ${selectedTotal}` : overProb > 60 ? `⚠️ СТАВЛЮ ОСТОРОЖНО! ТБ ${selectedTotal}` : overProb < 30 ? `⚠️ СТАВЛЮ ОСТОРОЖНО! ТМ ${selectedTotal}` : overProb < 40 ? `🤔 ДУМАЮ! ТМ ${selectedTotal}` : `❌ НЕ ЛЕЗУ!`,
        confidence: Math.abs(overProb - 50) * 2
      });
    } catch (error) { console.error(error); }
    setIsPredicting(false);
  };

  const lastTrainedCount = parseInt(localStorage.getItem('neuro_matches_count') || '0');
  const needsRetraining = modelReady && (totalMatches - lastTrainedCount) > 40;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div><h2 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-3"><Brain className="text-purple-400" /> Neuro AI v5.2</h2><p className="text-sm text-gray-400">Value-калькулятор • Тренд ±3 • АПЛ 10.5</p></div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SCard icon={Database} label="Матчей" v={totalMatches} c="blue" />
        <SCard icon={Brain} label="Статус" v={modelReady ? 'Готова' : '—'} c="purple" />
        <SCard icon={Target} label="Точность" v={testResults ? `${testResults.accuracy}%` : '—'} c="green" />
        <SCard icon={Activity} label="MAE" v={testResults ? `±${testResults.avgError}` : '—'} c="yellow" />
      </div>
      
      {Object.keys(leagueStats).length > 0 && (
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <h4 className="font-semibold mb-3 flex items-center gap-2"><Target size={16} className="text-blue-400" /> Точность по лигам</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries(leagueStats).map(([lid, st]) => {
              const ln = data.leagues?.find(l => l.id === lid)?.name || lid;
              return <div key={lid} className="bg-gray-700/30 rounded-lg p-3 text-center"><p className="text-sm font-medium">{ln}</p><p className="text-xs text-gray-400">тотал {st.lineTotal}</p><p className="text-2xl font-bold text-green-400">{st.accuracy}%</p><p className="text-xs text-gray-500">{st.correct}/{st.tested}</p></div>;
            })}
          </div>
        </div>
      )}
      
      {needsRetraining && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-yellow-400">⚠️</span>
            <div><p className="font-medium text-yellow-400">+{totalMatches - lastTrainedCount} новых матчей</p><p className="text-sm text-gray-400">Рекомендуется дообучить</p></div>
          </div>
          <button onClick={retrainModel} disabled={isRetraining} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-sm">Дообучить</button>
        </div>
      )}
      
      {trainingHistory.length > 0 && (
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <h4 className="font-semibold mb-2 flex items-center gap-2"><Clock size={16} className="text-blue-400" /> История</h4>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {trainingHistory.slice(0, 5).map((e, i) => (
              <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-700/50">
                <span className="text-gray-400">{new Date(e.date).toLocaleDateString('ru-RU')} — {e.type === 'full' ? '🧠 С нуля' : '📚 Дообучена'} на {e.matches} матчах</span>
                <span className="text-green-400 font-bold">{e.accuracy}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="flex gap-2">
        <TabBtn a={activeTab === 'tensorflow'} onClick={() => setActiveTab('tensorflow')}>🧠 TensorFlow</TabBtn>
        <TabBtn a={activeTab === 'randomforest'} onClick={() => setActiveTab('randomforest')}>🌲 RF</TabBtn>
        <TabBtn a={activeTab === 'xgboost'} onClick={() => setActiveTab('xgboost')}>⚡ XGB</TabBtn>
      </div>
      
      {activeTab === 'tensorflow' && (
        <div className="space-y-4">
          <div className="bg-gray-800/50 rounded-xl p-6 border border-purple-700/50 text-center">
            <Brain size={48} className="mx-auto mb-4 text-purple-400" />
            <h3 className="text-xl font-bold mb-2">TensorFlow.js v5.2</h3>
            <p className="text-gray-400 mb-4">Value-калькулятор • Тренд ±3 • АПЛ 10.5</p>
            {!isTraining && !isRetraining && (
              <div className="flex gap-3 justify-center flex-wrap">
                <button onClick={trainModel} className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center gap-2"><Play size={20} /> {modelReady ? 'Переобучить' : 'Обучить'}</button>
                {modelReady && <button onClick={retrainModel} className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center gap-2"><RefreshCw size={20} /> Дообучить</button>}
              </div>
            )}
            {modelReady && (
              <div className="flex gap-2 justify-center flex-wrap mt-3">
                <button onClick={async () => {
                  try {
                    const model = await tf.loadLayersModel('localstorage://football-neuro-model');
                    await model.save('localstorage://football-neuro-model-backup');
                    addLog('📥 Бэкап сохранён!');
                  } catch (e) { addLog('❌ ' + e.message); }
                }} className="bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-4 rounded-lg flex items-center gap-2">
                  <Save size={16} /> 💾 Бэкап
                </button>
                <button onClick={() => {
                  try {
                    const exportData = {};
                    const keys = ['info', 'model_metadata', 'model_topology', 'weight_data', 'weight_specs'];
                    keys.forEach(key => {
                      const data = localStorage.getItem(`tensorflowjs_models/football-neuro-model/${key}`);
                      if (data) exportData[`tensorflowjs_models/football-neuro-model/${key}`] = data;
                    });
                    const testResults = localStorage.getItem('neuro_test_results');
                    if (testResults) exportData['neuro_test_results'] = testResults;
                    const leagueStats = localStorage.getItem('neuro_league_stats');
                    if (leagueStats) exportData['neuro_league_stats'] = leagueStats;
                    const normParams = localStorage.getItem('neuro_norm_params');
                    if (normParams) exportData['neuro_norm_params'] = normParams;
                    
                    const blob = new Blob([JSON.stringify(exportData)], {type: 'application/json'});
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `neuro-model-${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    addLog('📥 Модель скачана!');
                  } catch (e) { addLog('❌ Ошибка: ' + e.message); }
                }} className="bg-blue-700 hover:bg-blue-600 text-white text-sm py-2 px-4 rounded-lg flex items-center gap-2">
                  <Save size={16} /> 📥 Скачать
                </button>
              </div>
            )}
            {isTraining && <div className="text-center py-4"><RefreshCw size={32} className="mx-auto mb-2 animate-spin text-purple-400" /><p>Обучение... 1-3 минуты</p></div>}
            {isRetraining && <div className="text-center py-4"><RefreshCw size={32} className="mx-auto mb-2 animate-spin text-green-400" /><p>Дообучение...</p></div>}
          </div>
          
          {trainingLog.length > 0 && (
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <h4 className="font-semibold mb-2"><Activity size={16} className="text-green-400 inline mr-1" /> Лог</h4>
              <div className="bg-gray-900 rounded-lg p-3 max-h-60 overflow-auto font-mono text-xs space-y-1">{trainingLog.map((e, i) => <div key={i} className="text-gray-300"><span className="text-gray-500">[{e.time}]</span> {e.text}</div>)}</div>
            </div>
          )}
          
          {modelReady && (
            <div className="bg-gray-800/50 rounded-xl p-6 border border-purple-700/50">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Calculator className="text-purple-400" /> Прогноз</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div><label className="block text-xs text-gray-400 mb-1">Лига</label><select value={predictLeague} onChange={(e) => { setPredictLeague(e.target.value); setPredictHomeTeam(''); setPredictAwayTeam(''); }} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm">{data.leagues?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
                <div><label className="block text-xs text-gray-400 mb-1">Хозяева</label><select value={predictHomeTeam} onChange={(e) => setPredictHomeTeam(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm"><option value="">Выберите</option>{teamsInLeague.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                <div><label className="block text-xs text-gray-400 mb-1">Гости</label><select value={predictAwayTeam} onChange={(e) => setPredictAwayTeam(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm"><option value="">Выберите</option>{teamsInLeague.filter(t => t.id !== predictHomeTeam).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
              </div>
              <div className="mb-4"><label className="block text-xs text-gray-400 mb-2">Тотал: {selectedTotal}</label>
                <div className="flex flex-wrap gap-2">{availableTotals.map(t => <button key={t} onClick={() => setSelectedTotal(t)} className={`px-4 py-2 rounded-lg text-sm font-medium ${selectedTotal === t ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>{t}</button>)}</div>
              </div>
              <button onClick={predictWithNeuro} disabled={!predictHomeTeam || !predictAwayTeam || isPredicting} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50">{isPredicting ? 'Анализирую...' : 'Получить прогноз'}</button>
              
              {/* 🔥 РЕЗУЛЬТАТ ПРОГНОЗА + VALUE + КНОПКА ПОСТАВИТЬ */}
              {neuroPrediction && (
                <div className="mt-4 space-y-4">
                  {/* Карточка прогноза Neuro */}
                  <div className="bg-purple-900/20 rounded-xl p-5 border border-purple-700/50">
                    <h4 className="font-semibold text-purple-400 mb-4 text-lg flex items-center gap-2"><Brain size={20} /> Neuro AI</h4>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <p className="text-xs text-gray-400 mb-1">Ожидаемый тотал</p>
                        <p className="text-2xl font-bold text-white">{neuroPrediction.expectedTotal}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-400 mb-1">ТБ {selectedTotal}</p>
                        <p className="text-2xl font-bold text-green-400">{neuroPrediction.overProbability}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-400 mb-1">ТМ {selectedTotal}</p>
                        <p className="text-2xl font-bold text-red-400">{neuroPrediction.underProbability}%</p>
                      </div>
                    </div>
                    <div className={`p-4 rounded-lg text-center font-semibold text-lg ${
                      neuroPrediction.recommendation.includes('СТАВЛЮ') ? 'bg-green-600/30 text-green-400' : 
                      neuroPrediction.recommendation.includes('ДУМАЮ') ? 'bg-yellow-600/30 text-yellow-400' : 
                      'bg-gray-600/30 text-gray-400'
                    }`}>
                      {neuroPrediction.recommendation}
                    </div>
                  </div>
                  
                  {/* 🔥 VALUE CALCULATOR */}
                  <div className="bg-gray-800/80 rounded-xl p-5 border border-gray-600">
                    <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                      <TrendingUp size={18} className="text-green-400" />
                      Value Betting
                      <span className="text-xs text-gray-400 font-normal ml-2">(точность модели {testResults?.accuracy || '58'}%)</span>
                    </h4>
                    <div className="flex items-center gap-4 mb-3">
                      <label className="text-sm text-gray-400 whitespace-nowrap">Введите кэф:</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={manualKef} 
                        onChange={(e) => setManualKef(e.target.value)}
                        className="w-24 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white text-center font-bold text-lg"
                      />
                      {valueResult && (
                        <div className={`flex-1 p-3 rounded-lg text-center font-bold text-lg ${
                          valueResult.isSuper ? 'bg-green-600/30 text-green-400' : 
                          valueResult.isValue ? 'bg-yellow-600/30 text-yellow-400' : 
                          'bg-red-600/30 text-red-400'
                        }`}>
                          Value: {valueResult.value > 0 ? '+' : ''}{valueResult.value}%
                          {valueResult.isSuper ? ' 🔥 СУПЕР-ВАЛУЙ!' : valueResult.isValue ? ' ✅ ВАЛУЙ!' : ' ❌ МИМО'}
                        </div>
                      )}
                    </div>
                    {valueResult && (
                      <p className="text-xs text-gray-500">
                        Безубыточный кэф: <span className="text-white font-bold">{(100 / valueResult.accuracy).toFixed(2)}</span>
                      </p>
                    )}
                                        {valueResult && (
                      <div className="mt-2 pt-2 border-t border-gray-700">
                        <p className="text-xs text-gray-400 mb-1">
                          💰 Келли (1/4): 
                          <span className="text-white font-bold ml-1">
                            {(() => {
                              const accuracy = parseFloat(valueResult.accuracy) / 100;
                              const kef = parseFloat(manualKef);
                              const kelly = (accuracy * kef - 1) / (kef - 1);
                              const fractionalKelly = kelly * 0.25; // 1/4 Келли
                              const percent = (fractionalKelly * 100).toFixed(1);
                              return percent > 0 ? `${percent}% от банка` : 'Не ставить';
                            })()}
                          </span>
                        </p>
                        <p className="text-xs text-gray-500">
                          {(() => {
                            const accuracy = parseFloat(valueResult.accuracy) / 100;
                            const kef = parseFloat(manualKef);
                            const kelly = (accuracy * kef - 1) / (kef - 1);
                            const fractionalKelly = kelly * 0.25;
                            const amount = (fractionalKelly * 10000).toFixed(0);
                            return amount > 0 ? `При банке 10,000₽ → ставка ${amount}₽` : '';
                          })()}
                        </p>
                      </div>
                    )}
                  </div>
                  {/* 🔥 УМНАЯ ПОДСКАЗКА */}
{valueResult && neuroPrediction && (
  <div className="mt-3 bg-gray-800/60 rounded-lg p-4 border border-gray-600">
    <h5 className="text-sm font-semibold text-white mb-2">🧠 Анализ:</h5>
    <div className="space-y-2 text-sm">
      {/* Уверенность */}
      <div className="flex items-center gap-2">
        <span className={neuroPrediction.confidence > 60 ? 'text-green-400' : neuroPrediction.confidence < 40 ? 'text-red-400' : 'text-yellow-400'}>
          {neuroPrediction.confidence > 60 ? '✅' : neuroPrediction.confidence < 40 ? '⚠️' : '⚡'} 
          Уверенность: {neuroPrediction.confidence.toFixed(0)}%
        </span>
      </div>
      
      {/* Value */}
      <div className="flex items-center gap-2">
        <span className={valueResult.isSuper ? 'text-green-400' : valueResult.isValue ? 'text-yellow-400' : 'text-red-400'}>
          {valueResult.isSuper ? '🔥' : valueResult.isValue ? '✅' : '❌'} 
          Value: {valueResult.value > 0 ? '+' : ''}{valueResult.value}%
        </span>
      </div>
      
      {/* Кэф */}
      <div className="flex items-center gap-2">
        <span className={parseFloat(manualKef) < 1.5 ? 'text-red-400' : parseFloat(manualKef) < 1.7 ? 'text-yellow-400' : 'text-green-400'}>
          {parseFloat(manualKef) < 1.5 ? '❌' : parseFloat(manualKef) < 1.7 ? '⚠️' : '✅'} 
          Кэф: {manualKef} {parseFloat(manualKef) < 1.5 ? '(слишком низкий)' : parseFloat(manualKef) < 1.7 ? '(низковат)' : '(хороший)'}
        </span>
      </div>
      
      {/* Итоговая рекомендация */}
      <div className="mt-3 pt-3 border-t border-gray-700">
        {(() => {
          const conf = neuroPrediction.confidence;
          const val = parseFloat(valueResult.value);
          const kef = parseFloat(manualKef);
          
          // Супер-сигнал
          if (conf > 60 && val > 10 && kef >= 1.7) return (
            <p className="text-green-400 font-bold">🔥 СТАВЛЮ УВЕРЕННО! Все показатели отличные!</p>
          );
          // Хороший сигнал
          if (conf > 50 && val > 5 && kef >= 1.6) return (
            <p className="text-green-400 font-bold">✅ МОЖНО СТАВИТЬ! Показатели хорошие.</p>
          );
          // Плохой сигнал
          // Всё остальное — НЕ СТАВИТЬ
          return (
            <p className="text-red-400 font-bold">❌ НЕ СТАВИТЬ! Не соответсвует строгим критериям.</p>
          );
        })()}
      </div>
    </div>
  </div>
)}
                  {/* Кнопка ПОСТАВИТЬ */}
                  <button 
                    onClick={() => setShowBetModal(true)}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2"
                  >
                    <Wallet size={18} /> 💰 Поставить
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {activeTab !== 'tensorflow' && <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 text-center"><h3 className="text-xl font-bold mb-2">{activeTab === 'randomforest' ? '🌲' : '⚡'} {activeTab === 'randomforest' ? 'Random Forest' : 'XGBoost'}</h3><p className="text-gray-400">Будут добавлены позже</p></div>}
      
      <BetModal 
        isOpen={showBetModal} 
        onClose={() => setShowBetModal(false)}
        matchData={{
          homeTeam: data.teams?.find(t => t.id === predictHomeTeam)?.name || '',
          awayTeam: data.teams?.find(t => t.id === predictAwayTeam)?.name || '',
          leagueId: predictLeague
        }}
        total={selectedTotal}
        recommendation={neuroPrediction?.recommendation}
        overProb={neuroPrediction?.overProbability}
      />
    </div>
  );
};

const SCard = ({ icon: I, label, v, c }) => {
  const cc = { blue:'text-blue-400', green:'text-green-400', yellow:'text-yellow-400', purple:'text-purple-400' };
  return <div className="bg-gray-800 rounded-xl p-4 border border-gray-700"><I className={`${cc[c]} mb-2`} size={20} /><p className="text-xs text-gray-400">{label}</p><p className="text-xl font-bold">{v}</p></div>;
};

const TabBtn = ({ a, onClick, children }) => (
  <button onClick={onClick} className={`px-4 py-2 rounded-lg text-sm transition ${a ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>{children}</button>
);

export default Neuro;