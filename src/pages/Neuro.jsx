import { useState, useEffect, useRef } from 'react';
import { Brain, Zap, TrendingUp, Activity, Database, Target, Play, RefreshCw, BarChart3, Calculator, Home, User, Save, Clock, AlertCircle } from 'lucide-react';
import { getData, getActiveSeason } from '../data/store';
import * as tf from '@tensorflow/tfjs';

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

  const [selectedTotal, setSelectedTotal] = useState(9.5);
  const availableTotals = [6.5, 7.5, 8.5, 9.5, 10.5, 11.5, 12.5];

  const [predictLeague, setPredictLeague] = useState(data.leagues?.[0]?.id || 'rpl');
  const [predictHomeTeam, setPredictHomeTeam] = useState('');
  const [predictAwayTeam, setPredictAwayTeam] = useState('');
  const [neuroPrediction, setNeuroPrediction] = useState(null);
  const [poissonPrediction, setPoissonPrediction] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false);

  const modelLoadedRef = useRef(false);

  const activeSeason = getActiveSeason(predictLeague)?.id;
  const teamsInLeague = data.teams?.filter(t => t.leagueId === predictLeague) || [];

  const getDefaultTotal = (leagueId) => {
    const season = data.seasons?.find(s => s.leagueId === leagueId && s.isActive);
    const avg = season?.avgTotalCorners || 9.5;
    return Math.ceil(avg * 2) / 2;  // 🔧 Округляем ВВЕРХ
};

  useEffect(() => {
    setSelectedTotal(getDefaultTotal(predictLeague));
  }, [predictLeague, data.seasons]);

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
          const savedResults = localStorage.getItem('neuro_test_results');
          if (savedResults) try { setTestResults(JSON.parse(savedResults)); } catch(e) {}
          const savedHistory = localStorage.getItem('neuro_training_history');
          if (savedHistory) try { setTrainingHistory(JSON.parse(savedHistory)); } catch(e) {}
          const savedErrors = localStorage.getItem('neuro_historical_errors');
          if (savedErrors) try { setHistoricalErrors(JSON.parse(savedErrors)); } catch(e) {}
          addLog('✅ Модель загружена из кэша');
        } else {
          addLog('⚡ Модель не найдена. Нажмите "Обучить" для начала.');
        }
      } catch (error) {
        console.error('Ошибка загрузки модели:', error);
        addLog(`❌ Ошибка загрузки модели: ${error.message}`);
      }
    };
    loadSavedModel();
  }, []);

  const addLog = (message) => {
    console.log(message);
    setTrainingLog(prev => [...prev, { time: new Date().toLocaleTimeString(), text: message }]);
  };

  const addToHistory = (type, matchesCount, accuracy, mae) => {
    const entry = { type, date: new Date().toISOString(), matches: matchesCount, accuracy, mae };
    const updatedHistory = [entry, ...trainingHistory].slice(0, 20);
    setTrainingHistory(updatedHistory);
    localStorage.setItem('neuro_training_history', JSON.stringify(updatedHistory));
  };

  // ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

  const safe = (val, fallback = 0) => (val != null && isFinite(val) && !isNaN(val)) ? val : fallback;

  const getLeagueAvgTotal = (leagueId, seasons) => {
    const season = seasons?.find(s => s.leagueId === leagueId && s.isActive);
    return season?.avgTotalCorners || 9.5;
  };

  const getLineTotalForLeague = (leagueId, seasons) => {
    const season = seasons?.find(s => s.leagueId === leagueId && s.isActive);
    const avg = season?.avgTotalCorners || 9.5;
    return Math.ceil(avg * 2) / 2;  // 🔧 Округляем ВВЕРХ
};


  const getLastMatches = (allMatches, teamId, beforeDate, count) => {
    return allMatches
      .filter(m => (m.homeTeamId === teamId || m.awayTeamId === teamId) && m.date < beforeDate)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, count);
  };

  const calculateFeatures = (matches, teamId) => {
    if (matches.length === 0) {
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
    const trend = firstHalfAvg - secondHalfAvg;
    return {
      avgCornersFor: tf / n, avgCornersAgainst: ta / n, cornersTrend: trend,
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

  const prepareTrainingData = (allMatches, teams, seasons) => {
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

  const runHonestTest = (model, allMatches, teams, allSeasons, normParams) => {
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
      leagueResults[leagueId] = {
        lineTotal: lineTotalForLeague,
        correct: leagueCorrect, tested: leagueTested,
        accuracy: leagueTested > 0 ? ((leagueCorrect / leagueTested) * 100).toFixed(1) : '0.0'
      };
    }
    const accuracy = totalTested > 0 ? ((totalCorrect / totalTested) * 100).toFixed(1) : '0.0';
    const avgError = totalTested > 0 ? (totalAbsError / totalTested).toFixed(2) : '0';
    setLeagueStats(leagueResults);
    localStorage.setItem('neuro_historical_errors', JSON.stringify(errors));
    setHistoricalErrors(errors);
    return { accuracy, avgError, totalCorrect, totalTested, errors, leagueResults };
  };

  const trainModel = async () => {
    setIsTraining(true); setTrainingLog([]);
    try {
      addLog('🚀 НАЧАЛО ОБУЧЕНИЯ Neuro AI v5.0');
      addLog(`📊 Данных: ${totalMatches} матчей`);
      const trainingExamples = prepareTrainingData(data.matches, data.teams, data.seasons);
      addLog(`✅ Подготовлено ${trainingExamples.length} примеров`);
      if (trainingExamples.length < 100) { addLog(`❌ Недостаточно данных.`); setIsTraining(false); return; }
      const trainSize = Math.floor(trainingExamples.length * 0.8);
      const trainExamples = trainingExamples.slice(0, trainSize);
      const valExamples = trainingExamples.slice(trainSize);
      const trainXs = trainExamples.map(ex => ex.features);
      const trainYs = trainExamples.map(ex => ex.label);
      const valXs = valExamples.map(ex => ex.features);
      const valYs = valExamples.map(ex => ex.label);
      const xsTensor = tf.tensor2d(trainXs);
      const moments = tf.moments(xsTensor, 0);
      const mean = moments.mean;
      const std = moments.variance.sqrt().add(1e-7);
      const normParams = { mean: await mean.array(), std: await std.array() };
      localStorage.setItem('neuro_norm_params', JSON.stringify(normParams));
      const xsNormalized = xsTensor.sub(mean).div(std);
      const ysTensor = tf.tensor2d(trainYs, [trainYs.length, 1]);
      const valXsTensor = tf.tensor2d(valXs);
      const valXsNormalized = valXsTensor.sub(mean).div(std);
      const valYsTensor = tf.tensor2d(valYs, [valYs.length, 1]);
      addLog('📊 Данные нормализованы');
      const model = createModel();
      addLog('✅ Модель создана (64→32→16)');
      addLog('🎓 Обучение 120 эпох...');
      const history = await model.fit(xsNormalized, ysTensor, {
        epochs: 120, batchSize: 32,
        validationData: [valXsNormalized, valYsTensor],
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (epoch % 20 === 0 || epoch === 119) {
              addLog(` Эпоха ${epoch + 1}: loss=${logs.loss.toFixed(4)}, mae=${logs.mae.toFixed(2)}, val_mae=${logs.val_mae.toFixed(2)}`);
            }
          }
        }
      });
      const finalTrainMae = history.history.mae[history.history.mae.length - 1];
      const finalValMae = history.history.val_mae[history.history.val_mae.length - 1];
      addLog(`✅ Train MAE: ±${finalTrainMae.toFixed(2)}, Val MAE: ±${finalValMae.toFixed(2)}`);
      xsTensor.dispose(); ysTensor.dispose(); xsNormalized.dispose();
      valXsTensor.dispose(); valXsNormalized.dispose(); valYsTensor.dispose();
      addLog('🧪 ЧЕСТНОЕ тестирование...');
      const results = runHonestTest(model, data.matches, data.teams, data.seasons, normParams);
      addLog(`📊 Точность: ${results.accuracy}% (${results.totalCorrect}/${results.totalTested})`);
      addLog(`📊 MAE: ±${results.avgError} угловых`);
      Object.entries(results.leagueResults).forEach(([leagueId, stats]) => {
        const leagueName = data.leagues?.find(l => l.id === leagueId)?.name || leagueId;
        addLog(`📊 ${leagueName} (тотал ${stats.lineTotal}): ${stats.accuracy}%`);
      });
      setTestResults(results);
      localStorage.setItem('neuro_test_results', JSON.stringify(results));
      setModelReady(true); setLoadedModel(model);
      addToHistory('full', totalMatches, parseFloat(results.accuracy), parseFloat(results.avgError));
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
      const trainingExamples = prepareTrainingData(data.matches, data.teams, data.seasons);
      addLog(`✅ ${trainingExamples.length} примеров`);
      const recentSize = Math.floor(trainingExamples.length * 0.7);
      const recentExamples = trainingExamples.slice(-recentSize);
      const xs = recentExamples.map(ex => ex.features);
      const ys = recentExamples.map(ex => ex.label);
      const normParams = JSON.parse(localStorage.getItem('neuro_norm_params') || 'null');
      const xsTensor = tf.tensor2d(xs);
      const mean = tf.tensor1d(normParams.mean);
      const std = tf.tensor1d(normParams.std);
      const xsNormalized = xsTensor.sub(mean).div(std);
      const ysTensor = tf.tensor2d(ys, [ys.length, 1]);
      addLog('🎓 Дообучение (60 эпох)...');
      loadedModel.compile({ optimizer: tf.train.adam(0.0001), loss: 'meanSquaredError', metrics: ['mae'] });
      await loadedModel.fit(xsNormalized, ysTensor, {
        epochs: 60, batchSize: 32,
        callbacks: { onEpochEnd: (e, l) => { if (e % 15 === 0 || e === 59) addLog(` Эпоха ${e+1}: loss=${l.loss.toFixed(4)}, mae=${l.mae.toFixed(2)}`); } }
      });
      xsTensor.dispose(); ysTensor.dispose(); xsNormalized.dispose();
      const results = runHonestTest(loadedModel, data.matches, data.teams, data.seasons, normParams);
      addLog(`📊 Точность: ${results.accuracy}% | MAE: ±${results.avgError}`);
      setTestResults(results);
      localStorage.setItem('neuro_test_results', JSON.stringify(results));
      addToHistory('retrain', totalMatches, parseFloat(results.accuracy), parseFloat(results.avgError));
      await loadedModel.save('localstorage://football-neuro-model');
      addLog('💾 Модель обновлена');
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
      const leagueAvgTotal = getLeagueAvgTotal(predictLeague, data.seasons);
      let features = buildFeatures(homeStats, awayStats, 0, leagueAvgTotal);
      const normParams = JSON.parse(localStorage.getItem('neuro_norm_params') || 'null');
      if (normParams) {
        features = features.map((val, i) => { return (val - (normParams.mean[i] || 0)) / (normParams.std[i] || 1); });
      }
      const inputTensor = tf.tensor2d([features]);
      const predictionTensor = loadedModel.predict(inputTensor);
      let expectedTotal = predictionTensor.dataSync()[0];
      inputTensor.dispose(); predictionTensor.dispose();
      expectedTotal = Math.max(0, expectedTotal);
      const overProb = getEmpiricalProbability(expectedTotal, selectedTotal);
      const underProb = 100 - overProb;
      setNeuroPrediction({
        expectedTotal: expectedTotal.toFixed(2), overProbability: overProb, underProbability: underProb,
        recommendation: overProb > 70 ? `🔥 СТАВЛЮ! ТБ ${selectedTotal}` : overProb > 60 ? `⚠️ СТАВЛЮ ОСТОРОЖНО! ТБ ${selectedTotal}` : overProb < 30 ? `⚠️ СТАВЛЮ ОСТОРОЖНО! ТМ ${selectedTotal}` : overProb < 40 ? `🤔 ДУМАЮ! ТМ ${selectedTotal}` : `❌ НЕ ЛЕЗУ!`,
        confidence: Math.abs(overProb - 50) * 2
      });
      try {
        const { predictMatch } = await import('../data/store');
        const poissonResult = predictMatch(predictHomeTeam, predictAwayTeam, predictLeague, activeSeason, selectedTotal);
        setPoissonPrediction(poissonResult);
      } catch (e) {}
    } catch (error) { console.error(error); }
    setIsPredicting(false);
  };

  const lastTrainedCount = parseInt(localStorage.getItem('neuro_matches_count') || '0');
  const needsRetraining = modelReady && (totalMatches - lastTrainedCount) > 40;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div><h2 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-3"><Brain className="text-purple-400" /> Neuro AI v5.0</h2><p className="text-sm text-gray-400">Динамический тотал • Эмпирическая вероятность • 32 признака</p></div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SCard icon={Database} label="Матчей" v={totalMatches} c="blue" />
        <SCard icon={Brain} label="Статус" v={modelReady ? 'Готова' : '—'} c="purple" />
        <SCard icon={Target} label="Точность" v={testResults ? `${testResults.accuracy}%` : '—'} c="green" />
        <SCard icon={TrendingUp} label="MAE" v={testResults ? `±${testResults.avgError}` : '—'} c="yellow" />
      </div>
      
      {Object.keys(leagueStats).length > 0 && (
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <h4 className="font-semibold mb-3 flex items-center gap-2"><BarChart3 size={16} className="text-blue-400" /> Точность по лигам</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries(leagueStats).map(([lid, st]) => {
              const ln = data.leagues?.find(l => l.id === lid)?.name || lid;
              return <div key={lid} className="bg-gray-700/30 rounded-lg p-3 text-center"><p className="text-sm font-medium text-gray-300">{ln}</p><p className="text-xs text-gray-400">тотал {st.lineTotal}</p><p className="text-2xl font-bold text-green-400">{st.accuracy}%</p><p className="text-xs text-gray-500">{st.correct}/{st.tested}</p></div>;
            })}
          </div>
        </div>
      )}
      
      {needsRetraining && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3"><AlertCircle className="text-yellow-400" size={20} /><div><p className="font-medium text-yellow-400">+{totalMatches - lastTrainedCount} новых матчей</p><p className="text-sm text-gray-400">Рекомендуется дообучить</p></div></div>
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
            <h3 className="text-xl font-bold mb-2">TensorFlow.js v5.0</h3>
            <p className="text-gray-400 mb-4">L2 регуляризация • 32 признака • Эмпирическая вероятность</p>
            {!isTraining && !isRetraining && (
              <div className="flex gap-3 justify-center flex-wrap">
                <button onClick={trainModel} className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center gap-2"><Play size={20} /> {modelReady ? 'Переобучить' : 'Обучить'}</button>
                {modelReady && <button onClick={retrainModel} className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center gap-2"><RefreshCw size={20} /> Дообучить</button>}
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
              
              {(neuroPrediction || poissonPrediction) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {neuroPrediction && (
                    <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-700/50">
                      <h4 className="font-semibold text-purple-400 mb-3"><Brain size={16} className="inline mr-1" /> Neuro</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between"><span>Тотал</span><span className="text-xl font-bold text-white">{neuroPrediction.expectedTotal}</span></div>
                        <div className="flex justify-between"><span>ТБ {selectedTotal}</span><span className="text-lg font-bold text-green-400">{neuroPrediction.overProbability}%</span></div>
                        <div className="flex justify-between"><span>ТМ {selectedTotal}</span><span className="text-lg font-bold text-red-400">{neuroPrediction.underProbability}%</span></div>
                        <div className={`mt-3 p-3 rounded-lg text-center font-semibold ${neuroPrediction.recommendation.includes('СТАВЛЮ') ? 'bg-green-600/30 text-green-400' : neuroPrediction.recommendation.includes('ДУМАЮ') ? 'bg-yellow-600/30 text-yellow-400' : 'bg-gray-600/30 text-gray-400'}`}>{neuroPrediction.recommendation}</div>
                        <div className="text-xs text-gray-500 text-center">Уверенность: {neuroPrediction.confidence.toFixed(0)}%</div>
                      </div>
                    </div>
                  )}
                  {poissonPrediction && (
                    <div className="bg-yellow-900/20 rounded-lg p-4 border border-yellow-700/50">
                      <h4 className="font-semibold text-yellow-400 mb-3"><Calculator size={16} className="inline mr-1" /> Пуассон</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between"><span>Тотал</span><span className="font-semibold">{poissonPrediction.totalExpected}</span></div>
                        <div className="flex justify-between"><span>ТБ {selectedTotal}</span><span className="text-lg font-bold text-green-400">{poissonPrediction.totalProbability}%</span></div>
                        <div className="flex justify-between"><span>ТМ {selectedTotal}</span><span className="text-lg font-bold text-red-400">{poissonPrediction.underProbability}%</span></div>
                        <div className={`mt-3 p-3 rounded-lg text-center text-sm font-semibold ${poissonPrediction.recommendation.includes('СТАВЛЮ') ? 'bg-green-600/30 text-green-400' : poissonPrediction.recommendation.includes('ДУМАЮ') ? 'bg-yellow-600/30 text-yellow-400' : 'bg-gray-600/30 text-gray-400'}`}>{poissonPrediction.recommendation}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {activeTab !== 'tensorflow' && <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 text-center"><h3 className="text-xl font-bold mb-2">{activeTab === 'randomforest' ? '🌲' : '⚡'} {activeTab === 'randomforest' ? 'Random Forest' : 'XGBoost'}</h3><p className="text-gray-400">Будут добавлены позже</p></div>}
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