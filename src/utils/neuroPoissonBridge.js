import * as tf from '@tensorflow/tfjs';
import { getData, poissonOverProbabilityPct } from '../data/store';
import {
  getLastMatches,
  calculateFeatures,
  buildFeatures,
  getLeagueAvgTotal,
} from '../components/models/neuroFeatures';

function empiricalOverPct(expectedTotal, selectedTotal, historicalErrors) {
  if (!historicalErrors?.length || historicalErrors.length < 20) {
    const lambda = Math.max(0.35, expectedTotal);
    return Math.round(poissonOverProbabilityPct(lambda, selectedTotal));
  }
  const simulatedTotals = historicalErrors.map((err) => expectedTotal + err);
  const above = simulatedTotals.filter((t) => t > selectedTotal).length;
  const near = simulatedTotals.filter((t) => Math.abs(t - selectedTotal) < 0.3).length;
  let probOver = (above + near * 0.3) / simulatedTotals.length;
  probOver = Math.min(0.95, Math.max(0.05, probOver));
  return Math.round(probOver * 100);
}

/**
 * Прогноз тотала угловых из сохранённой TensorFlow-модели (как на вкладке Neuro).
 * Доли хозяев/гостей масштабируются от ожиданий Пуассона при том же суммарном тотале от нейросети.
 */
export async function fetchNeuroCornersForecast({
  homeTeamId,
  awayTeamId,
  leagueId,
  seasons,
  selectedTotal,
  poissonHome,
  poissonAway,
}) {
  let models;
  try {
    models = await tf.io.listModels();
  } catch {
    return null;
  }
  if (!models['localstorage://football-neuro-model']) return null;

  try {
    const model = await tf.loadLayersModel('localstorage://football-neuro-model');
    model.compile({ optimizer: tf.train.adam(0.001), loss: 'meanSquaredError', metrics: ['mae'] });

    const data = getData();
    const allMatches = [...(data.matches || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
    const homePast = getLastMatches(allMatches, homeTeamId, new Date().toISOString(), 12);
    const awayPast = getLastMatches(allMatches, awayTeamId, new Date().toISOString(), 12);
    if (homePast.length < 3 || awayPast.length < 3) return null;

    let homeStats = calculateFeatures(homePast, homeTeamId);
    let awayStats = calculateFeatures(awayPast, awayTeamId);
    homeStats.cornersTrend = Math.max(-3, Math.min(3, homeStats.cornersTrend || 0));
    awayStats.cornersTrend = Math.max(-3, Math.min(3, awayStats.cornersTrend || 0));

    const leagueAvgTotal = getLeagueAvgTotal(leagueId, seasons);
    let features = buildFeatures(homeStats, awayStats, 0, leagueAvgTotal);

    const normParams = JSON.parse(localStorage.getItem('neuro_norm_params') || 'null');
    if (normParams) {
      features = features.map((val, i) => {
        const mn = normParams.mean[i] || 0;
        const sd = normParams.std[i] || 1;
        return (val - mn) / sd;
      });
    }

    const inputTensor = tf.tensor2d([features]);
    const predictionTensor = model.predict(inputTensor);
    let expectedTotal = predictionTensor.dataSync()[0];
    inputTensor.dispose();
    predictionTensor.dispose();
    expectedTotal = Math.max(2, Math.min(18, expectedTotal));

    const historicalErrors = JSON.parse(localStorage.getItem('neuro_historical_errors') || '[]');
    const overProb = empiricalOverPct(expectedTotal, selectedTotal, historicalErrors);
    const underProb = 100 - overProb;

    const sum = poissonHome + poissonAway;
    const ratio = sum > 0 ? poissonHome / sum : 0.52;
    const homeN = expectedTotal * ratio;
    const awayN = expectedTotal - homeN;

    let recommendation = `🧠 Neuro: близко к ${selectedTotal} (${overProb}% ТБ)`;
    if (overProb > 70) recommendation = `🔥 Neuro: ТБ ${selectedTotal} (${overProb}%)`;
    else if (overProb > 58) recommendation = `⚠️ Neuro: склонность к ТБ ${selectedTotal} (${overProb}%)`;
    else if (overProb < 32) recommendation = `🔥 Neuro: ТМ ${selectedTotal} (${underProb}%)`;
    else if (overProb < 42) recommendation = `⚠️ Neuro: склонность к ТМ ${selectedTotal} (${underProb}%)`;

    return {
      totalExpected: expectedTotal.toFixed(2),
      homeExpected: homeN.toFixed(2),
      awayExpected: awayN.toFixed(2),
      totalProbability: overProb,
      underProbability: underProb,
      recommendation,
    };
  } catch {
    return null;
  }
}
