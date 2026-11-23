import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Info,
  Sliders,
  Sparkles,
  Waves,
} from 'lucide-react';
import {
  FloodEvent,
  HydroPost,
  ScenarioConfig,
  ScenarioSummary,
} from '../types/hydro';
import { InteractiveBasinMap } from './InteractiveBasinMap';
import { EventStatusIndicator } from './StatusIndicator';

interface OverviewDashboardProps {
  summary: ScenarioSummary;
  scenarios: ScenarioConfig[];
  activeScenarioId: string;
  posts: HydroPost[];
  events: FloodEvent[];
  selectedObjectId: string | null;
  onSelectObject: (objectId: string | null) => void;
  onEditObject: (objectId: string) => void;
  onAskAiForObject: (objectId: string) => void;
  onSelectScenario: (id: string) => void;
  onQuickWaterDeltaChange: (deltaM: number) => void;
  onOpenCalculator: () => void;
  onOpenEvents: () => void;
  onAskAiExplainScenario: () => void;
  pickCoordinateMode: boolean;
  onPickCoordinate: (coords: { lat: number; lng: number }) => void;
  onCancelPickCoordinate: () => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  summary,
  scenarios,
  activeScenarioId,
  posts,
  events,
  selectedObjectId,
  onSelectObject,
  onEditObject,
  onAskAiForObject,
  onSelectScenario,
  onQuickWaterDeltaChange,
  onOpenCalculator,
  onOpenEvents,
  onAskAiExplainScenario,
  pickCoordinateMode,
  onPickCoordinate,
  onCancelPickCoordinate,
}) => {
  return (
    <div className="space-y-5">
      {/* Панель быстрого переключения сценария и уровня воды над картой */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-700 mr-1">
            Сценарий:
          </span>
          {scenarios.slice(0, 4).map((sc) => (
            <button
              key={sc.id}
              type="button"
              onClick={() => onSelectScenario(sc.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                activeScenarioId === sc.id
                  ? 'bg-sky-600 text-white border-sky-600'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {sc.name.replace(/^Сценарий \d+:\s*/i, '')}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2.5 min-w-[240px]">
            <Waves className="w-4 h-4 text-sky-600 shrink-0" />
            <span className="text-xs text-slate-600 whitespace-nowrap">Уровень ΔH:</span>
            <input
              type="range"
              min={-1.0}
              max={4.5}
              step={0.1}
              value={summary.scenario.waterDeltaM}
              onChange={(e) => onQuickWaterDeltaChange(Number(e.target.value))}
              className="flex-1 accent-sky-600 cursor-pointer"
              aria-label="Сдвиг уровня воды"
            />
            <span className="font-mono text-xs font-bold text-sky-700 w-14 text-right tabular-nums">
              {summary.scenario.waterDeltaM >= 0 ? '+' : ''}
              {summary.scenario.waterDeltaM.toFixed(1)} м
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenCalculator}
            className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Калькулятор</span>
          </button>

          <button
            type="button"
            onClick={onAskAiExplainScenario}
            className="px-3 py-1.5 text-xs font-medium bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Объяснить AI</span>
          </button>
        </div>
      </div>

      {/* 4 ключевых показателя */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Затоплено / под угрозой</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-red-700">
              {summary.floodedObjects}
            </span>
            <span className="text-xs font-mono text-amber-700">
              +{summary.threatenedObjects} в угрозе
            </span>
            <span className="text-xs font-mono text-slate-400">
              из {summary.totalObjects}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Площадь затопления земель</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {summary.floodedAreaHa.toFixed(2)} га
            </span>
            <span className="text-xs font-mono text-slate-500">
              ({summary.floodedAreaSqM.toLocaleString('ru-RU')} м²)
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Домохозяйства и жители</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {summary.floodedHouseholds} д/х
            </span>
            <span className="text-xs font-mono text-slate-500">
              ~{summary.floodedResidents} чел.
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Критический / высокий риск</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-amber-700">
              {summary.criticalRiskObjects + summary.highRiskObjects} об.
            </span>
            <span className="text-xs font-mono text-slate-500">
              макс. глубина {summary.maxDepthM.toFixed(2)} м
            </span>
          </div>
        </div>
      </div>

      {/* Интерактивная карта бассейна (главный визуальный якорь) */}
      <InteractiveBasinMap
        summary={summary}
        posts={posts}
        events={events}
        selectedObjectId={selectedObjectId}
        onSelectObject={onSelectObject}
        onEditObject={onEditObject}
        onAskAiForObject={onAskAiForObject}
        pickCoordinateMode={pickCoordinateMode}
        onPickCoordinate={onPickCoordinate}
        onCancelPickCoordinate={onCancelPickCoordinate}
      />

      {/* Нижний ряд: Гидропосты и Последние события */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Мониторинг гидропостов ({posts.length})
            </h3>
            <span className="text-xs text-slate-500">
              Отметки в м БСВ
            </span>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {summary.postLevels.map(({ post, effectiveLevelM, status }) => {
              const badge =
                status === 'critical'
                  ? 'text-red-700 font-semibold'
                  : status === 'dangerous'
                    ? 'text-orange-700 font-semibold'
                    : status === 'adverse'
                      ? 'text-amber-700 font-semibold'
                      : 'text-emerald-700';
              const text =
                status === 'critical'
                  ? 'Крит. перелив'
                  : status === 'dangerous'
                    ? 'ОЯ достигнуто'
                    : status === 'adverse'
                      ? 'НЯ достигнуто'
                      : 'Норма';
              return (
                <div
                  key={post.id}
                  className="px-4 py-2.5 flex items-center justify-between gap-3"
                >
                  <div>
                    <span className="font-mono font-semibold text-slate-800 mr-1.5">
                      {post.code}
                    </span>
                    <span className="text-slate-900 font-medium">{post.name}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono tabular-nums shrink-0">
                    <span className="font-semibold text-slate-900">
                      {effectiveLevelM.toFixed(2)} м
                    </span>
                    <span className="text-slate-400">/ ОЯ {post.dangerousLevelM.toFixed(1)}</span>
                    <span className={`font-sans ${badge}`}>{text}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Последние события и нарушения
            </h3>
            <button
              type="button"
              onClick={onOpenEvents}
              className="text-xs font-medium text-sky-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Все события ({events.length})</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {events.slice(0, 5).map((evt) => (
              <div
                key={evt.id}
                className="px-4 py-2.5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-medium text-slate-900 truncate">
                    {evt.title}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {evt.createdAt} · {evt.createdBy}
                  </div>
                </div>
                <EventStatusIndicator status={evt.status} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Прозрачная справка о допущениях */}
      <div className="bg-slate-100 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-800">Демонстрационный полигон Hackathon 2026: </span>
          представленные 48 объектов, 6 гидропостов и изолинии являются синтетической моделью речного участка для отработки сценарного анализа зон затопления. Расчёты выполняются локально в реальном времени и не являются официальным метеопрогнозом.
          {summary.assessments.some((a) => a.anomalies.length > 0) && (
            <span className="inline-flex items-center gap-1 text-amber-800 font-medium ml-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              Обнаружены записи с неполными данными — проверьте раздел «Админ-панель → Проверка данных».
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
