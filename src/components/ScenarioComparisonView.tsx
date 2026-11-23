import React from 'react';
import { ArrowRight, GitCompare } from 'lucide-react';
import { ScenarioConfig, ScenarioSummary } from '../types/hydro';

interface ScenarioComparisonViewProps {
  allScenarios: ScenarioConfig[];
  compareIds: [string, string, string];
  compareSummaries: [ScenarioSummary, ScenarioSummary, ScenarioSummary];
  onChangeCompareSlot: (slotIndex: 0 | 1 | 2, scenarioId: string) => void;
  onActivateScenario: (scenarioId: string) => void;
}

export const ScenarioComparisonView: React.FC<ScenarioComparisonViewProps> = ({
  allScenarios,
  compareIds,
  compareSummaries,
  onChangeCompareSlot,
  onActivateScenario,
}) => {
  const maxFloodedObjects = Math.max(1, ...compareSummaries.map((s) => s.floodedObjects));
  const maxAreaHa = Math.max(1, ...compareSummaries.map((s) => s.floodedAreaHa));
  const maxHouseholds = Math.max(1, ...compareSummaries.map((s) => s.floodedHouseholds));

  const [s1, s2, s3] = compareSummaries;
  const delta12Obj = s2.floodedObjects - s1.floodedObjects;
  const delta23Obj = s3.floodedObjects - s2.floodedObjects;
  const delta12Ha = s2.floodedAreaHa - s1.floodedAreaHa;
  const delta23Ha = s3.floodedAreaHa - s2.floodedAreaHa;
  const delta12Hh = s2.floodedHouseholds - s1.floodedHouseholds;
  const delta23Hh = s3.floodedHouseholds - s2.floodedHouseholds;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900 inline-flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-sky-600" />
              <span>Сравнение трёх сценариев паводкового развития</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Сопоставление базового, повышенного и экстремального (или защитного) сценариев по объектам, площади и домохозяйствам.
            </p>
          </div>
        </div>

        {/* Селекторы 3 слотов */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {([0, 1, 2] as const).map((slotIdx) => {
            const summary = compareSummaries[slotIdx];
            const labels = ['Сценарий A', 'Сценарий B', 'Сценарий C'];
            return (
              <div
                key={slotIdx}
                className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold text-slate-700">
                      {labels[slotIdx]}
                    </span>
                    <button
                      type="button"
                      onClick={() => onActivateScenario(compareIds[slotIdx])}
                      className="text-[11px] font-medium text-sky-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Открыть на карте</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <select
                    value={compareIds[slotIdx]}
                    onChange={(e) => onChangeCompareSlot(slotIdx, e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    {allScenarios.map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                    {summary.scenario.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-3 gap-2 text-center font-mono">
                  <div>
                    <div className="text-[10px] text-slate-500 font-sans">Затоплено</div>
                    <div className="text-sm font-bold text-red-700 tabular-nums">
                      {summary.floodedObjects} об.
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-sans">Площадь</div>
                    <div className="text-sm font-bold text-slate-900 tabular-nums">
                      {summary.floodedAreaHa.toFixed(1)} га
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-sans">Домохоз.</div>
                    <div className="text-sm font-bold text-slate-900 tabular-nums">
                      {summary.floodedHouseholds}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Визуальное сравнение показателей */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {[
          {
            title: 'Затопляемые объекты (шт.)',
            max: maxFloodedObjects,
            color: 'bg-red-600',
            values: compareSummaries.map((s) => ({
              label: s.scenario.name,
              val: s.floodedObjects,
              display: `${s.floodedObjects} об. (+${s.threatenedObjects} угр.)`,
            })),
          },
          {
            title: 'Площадь затопления (га)',
            max: maxAreaHa,
            color: 'bg-sky-600',
            values: compareSummaries.map((s) => ({
              label: s.scenario.name,
              val: s.floodedAreaHa,
              display: `${s.floodedAreaHa.toFixed(2)} га`,
            })),
          },
          {
            title: 'Агрегировано домохозяйств',
            max: maxHouseholds,
            color: 'bg-amber-600',
            values: compareSummaries.map((s) => ({
              label: s.scenario.name,
              val: s.floodedHouseholds,
              display: `${s.floodedHouseholds} д/х (~${s.floodedResidents} чел.)`,
            })),
          },
        ].map((chart) => (
          <div
            key={chart.title}
            className="bg-white border border-slate-200 rounded-xl p-5"
          >
            <h3 className="text-sm font-semibold text-slate-900 mb-4">
              {chart.title}
            </h3>
            <div className="space-y-4">
              {chart.values.map((item, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between text-xs mb-1 gap-2">
                    <span className="text-slate-600 truncate">{item.label}</span>
                    <span className="font-mono font-semibold text-slate-900 whitespace-nowrap tabular-nums">
                      {item.display}
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${chart.color} rounded-full transition-all duration-300`}
                      style={{
                        width: `${Math.min(100, Math.round((item.val / chart.max) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Сравнительная таблица метрик и дельт */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">
            Сводная матрица сравнения и прироста рисков
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            Δ(B−A): {delta12Obj >= 0 ? '+' : ''}{delta12Obj} об., {delta12Ha >= 0 ? '+' : ''}{delta12Ha.toFixed(1)} га, {delta12Hh >= 0 ? '+' : ''}{delta12Hh} д/х
            {' · '}
            Δ(C−B): {delta23Obj >= 0 ? '+' : ''}{delta23Obj} об., {delta23Ha >= 0 ? '+' : ''}{delta23Ha.toFixed(1)} га, {delta23Hh >= 0 ? '+' : ''}{delta23Hh} д/х
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="text-left px-4 py-3 font-semibold">Показатель</th>
                <th className="text-right px-4 py-3 font-semibold">Сценарий A</th>
                <th className="text-right px-4 py-3 font-semibold">Сценарий B</th>
                <th className="text-right px-4 py-3 font-semibold">Сценарий C</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
              <tr>
                <td className="px-4 py-2.5 font-sans font-medium text-slate-800">
                  Сдвиг уровня воды (ΔH)
                </td>
                {compareSummaries.map((s, i) => (
                  <td key={i} className="px-4 py-2.5 text-right font-semibold text-sky-700">
                    {s.scenario.waterDeltaM >= 0 ? '+' : ''}{s.scenario.waterDeltaM.toFixed(2)} м
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-sans font-medium text-slate-800">
                  Инженерная защита (дамбы / расчистка)
                </td>
                {compareSummaries.map((s, i) => (
                  <td key={i} className="px-4 py-2.5 text-right text-slate-700">
                    +{s.scenario.leveeMitigationM.toFixed(1)} м / -{s.scenario.channelClearingBonusM.toFixed(2)} м
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-sans font-medium text-slate-800">
                  Затоплено объектов
                </td>
                {compareSummaries.map((s, i) => (
                  <td key={i} className="px-4 py-2.5 text-right font-semibold text-red-700">
                    {s.floodedObjects}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-sans font-medium text-slate-800">
                  В буферной зоне угрозы
                </td>
                {compareSummaries.map((s, i) => (
                  <td key={i} className="px-4 py-2.5 text-right text-amber-700">
                    {s.threatenedObjects}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-sans font-medium text-slate-800">
                  Площадь затопления (га / м²)
                </td>
                {compareSummaries.map((s, i) => (
                  <td key={i} className="px-4 py-2.5 text-right text-slate-900">
                    {s.floodedAreaHa.toFixed(2)} га ({s.floodedAreaSqM.toLocaleString('ru-RU')} м²)
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-sans font-medium text-slate-800">
                  Затронуто домохозяйств (затоплено / угроза)
                </td>
                {compareSummaries.map((s, i) => (
                  <td key={i} className="px-4 py-2.5 text-right font-semibold text-slate-900">
                    {s.floodedHouseholds} / +{s.threatenedHouseholds}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-sans font-medium text-slate-800">
                  Жителей в зоне затопления
                </td>
                {compareSummaries.map((s, i) => (
                  <td key={i} className="px-4 py-2.5 text-right text-slate-900">
                    {s.floodedResidents} чел.
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-sans font-medium text-slate-800">
                  Максимальная глубина затопления
                </td>
                {compareSummaries.map((s, i) => (
                  <td key={i} className="px-4 py-2.5 text-right text-slate-900">
                    {s.maxDepthM.toFixed(2)} м
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
