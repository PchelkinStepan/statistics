import { useParams, Link } from 'react-router-dom';
import { getData, getLeagueTable } from '../data/store';

const LeagueTable = () => {
  const { leagueId } = useParams();
  const data = getData();
  const leagues = data.leagues;
  const currentLeague = leagues.find(l => l.id === leagueId) || leagues[0];
  const table = getLeagueTable(currentLeague?.id || 'apl');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Турнирная таблица</h2>
        <div className="flex space-x-2">
          {leagues.map(league => (
            <Link
              key={league.id}
              to={`/table/${league.id}`}
              className={`px-4 py-2 rounded-lg transition ${
                league.id === currentLeague?.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {league.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr className="text-left text-sm text-gray-300">
              <th className="py-4 px-6">#</th>
              <th className="py-4 px-6">Команда</th>
              <th className="py-4 px-6 text-center">И</th>
              <th className="py-4 px-6 text-center">В</th>
              <th className="py-4 px-6 text-center">Н</th>
              <th className="py-4 px-6 text-center">П</th>
              <th className="py-4 px-6 text-center">ГЗ</th>
              <th className="py-4 px-6 text-center">ГП</th>
              <th className="py-4 px-6 text-center">±</th>
              <th className="py-4 px-6 text-center font-semibold">О</th>
            </tr>
          </thead>
          <tbody>
            {table.map((team, index) => (
              <tr key={team.id} className="border-t border-gray-700 hover:bg-gray-750">
                <td className="py-4 px-6 text-gray-400">{index + 1}</td>
                <td className="py-4 px-6 font-medium">{team.name}</td>
                <td className="py-4 px-6 text-center">{team.played}</td>
                <td className="py-4 px-6 text-center">{team.wins}</td>
                <td className="py-4 px-6 text-center">{team.draws}</td>
                <td className="py-4 px-6 text-center">{team.losses}</td>
                <td className="py-4 px-6 text-center">{team.goalsFor}</td>
                <td className="py-4 px-6 text-center">{team.goalsAgainst}</td>
                <td className="py-4 px-6 text-center">{team.goalDiff}</td>
                <td className="py-4 px-6 text-center font-bold">{team.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeagueTable;