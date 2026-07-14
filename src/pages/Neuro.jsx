import { useState } from 'react';
import { Brain } from 'lucide-react';
import { getData } from '../data/store';
import TensorFlowNeuroTab from '../components/models/TensorFlowNeuroTab';
import RandomForestModel from '../components/models/RandomForestModel';
import XGBoostModel from '../components/models/XGBoostModel';
import ModelsComparison from '../components/models/ModelsComparison';

const Neuro = () => {
  const data = getData();
  const totalMatches = data.matches?.length || 0;
  const [activeTab, setActiveTab] = useState('tensorflow');

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-3">
          <Brain className="text-purple-400" /> Neuro AI v5.2
        </h2>
        <p className="text-sm text-gray-400">
          Три модели в браузере: TensorFlow.js, Random Forest и XGBoost. В базе{' '}
          <span className="text-white font-medium">{totalMatches}</span> матчей.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <TabBtn a={activeTab === 'tensorflow'} onClick={() => setActiveTab('tensorflow')}>
          🧠 TensorFlow
        </TabBtn>
        <TabBtn
          a={activeTab === 'randomforest'}
          onClick={() => setActiveTab('randomforest')}
          activeClass="bg-lime-600 text-gray-950"
        >
          🌲 RF
        </TabBtn>
        <TabBtn
          a={activeTab === 'xgboost'}
          onClick={() => setActiveTab('xgboost')}
          activeClass="bg-emerald-600 text-white"
        >
          ⚡ XGB
        </TabBtn>
        <TabBtn
          a={activeTab === 'comparison'}
          onClick={() => setActiveTab('comparison')}
          activeClass="bg-blue-600 text-white"
        >
          ⚖️ Сравнение
        </TabBtn>
      </div>

      {activeTab === 'tensorflow' && <TensorFlowNeuroTab />}
      {activeTab === 'randomforest' && <RandomForestModel />}
      {activeTab === 'xgboost' && <XGBoostModel />}
      {activeTab === 'comparison' && <ModelsComparison />}
    </div>
  );
};

const TabBtn = ({ a, onClick, children, activeClass }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-4 py-2 rounded-lg text-sm transition ${
      a ? activeClass || 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
    }`}
  >
    {children}
  </button>
);

export default Neuro;
