import React, { useState } from 'react';
import {
  BookmarkPlus,
  Info,
  RotateCcw,
  Sliders,
  Sparkles,
  Waves,
} from 'lucide-react';
import {
  AnalysisRules,
  HydroPost,
  RolePermissions,
  ScenarioConfig,
  ScenarioSummary,
} from '../types/hydro';
import { FloodStatusIndicator, RiskIndicator } from './StatusIndicator';

interface ScenarioCalculatorViewProps {
  summary: ScenarioSummary;
  scenarios: ScenarioConfig[];
  activeScenarioId: string;
  customScenario: ScenarioConfig;
  posts: HydroPost[];
  rules: AnalysisRules;
  permissions: RolePermissions;
  onSelectScenario: (id: string) => void;
  onUpdateCustomScenario: (updater: (prev: ScenarioConfig) => ScenarioConfig) => void;
  onSaveNewScenario: (name: string, description: string) => void;
  onSelectObjectOnMap: (objectId: string) => void;
  onAskAiExplainScenario: () => void;
}

export const ScenarioCalculatorView: React.FC<ScenarioCalculatorViewProps> = ({
  summary,
  scenarios,
  activeScenarioId,
  customScenario,
  posts,
  rules,
  permissions,
  onSelectScenario,
  onUpdateCustomScenario,
  onSaveNewScenario,
  onSelectObjectOnMap,
  onAskAiExplainScenario,
}) => {
  const [showPostOverrides, setShowPostOverrides] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [saveError, setSaveError] = useState('');

  const activeConfig = summary.scenario;

  const ensureCustomAndUpdate = (fn: (prev: ScenarioConfig) => ScenarioConfig) => {
    onUpdateCustomScenario((prev) => {
      const base = activeScenarioId === 'sc-custom' ? prev : {
        ...activeConfig,
        id: 'sc-custom',
        name: 'Пользовательский расчёт',
        isPreset: false,
        postOverrides: { ...activeConfig.postOverrides },
      };
      return fn(base);
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim().length < 3) {
      setSaveError('Введите название сценария (минимум 3 символа).');
      return;
    }
    onSaveNewScenario(
      newName.trim(),
      newDesc.trim() || 'Сохранённый пользовательский сценарий анализа.',
    );
    setNewName('');
    setNewDesc('');
    setSaveError('');
    setShowSaveForm(false);
  };

  const impactedAssessments = summary.assessments
    .filter((a) => a.floodStatus !== 'safe')
    .sort((a, b) => b.floodDepthM - a.floodDepthM);

  return (
    <div className="space-y-6">
      {/* Выбор пресета или пользовательского расчёта */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Сценарный калькулятор паводкового воздействия
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Изменение уровня воды и инженерных мероприятий мгновенно пересчитывает затопление, площадь земель и домохозяйства.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onAskAiExplainScenario}
              className="px-3 py-2 text-xs font-medium bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Объяснить сценарий (AI)</span>
            </button>
            {permissions.canSaveScenario && (
              <button
                type="button"
                onClick={() => setShowSaveForm((v) => !v)}
                className="px-3 py-2 text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>Сохранить сценарий</span>
              </button>
            )}
          </div>
        </div>

        {/* Кнопки пресетов */}
        <div className="mt-4 flex flex-wrap gap-2">
          {scenarios.map((sc) => (
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
              {sc.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onSelectScenario('sc-custom')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
              activeScenarioId === 'sc-custom'
                ? 'bg-sky-600 text-white border-sky-600'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Пользовательский ({customScenario.waterDeltaM >= 0 ? '+' : ''}
            {customScenario.waterDeltaM.toFixed(1)} м)
          </button>
        </div>

        {showSaveForm && (
          <form
            onSubmit={handleSave}
            className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3"
          >
            <div className="text-xs font-semibold text-slate-800">
              Сохранение текущих параметров как отдельного сценария
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  Название сценария *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Напр.: Прорыв затора +2.2 м с дамбой"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  Комментарий / допущения
                </label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Краткое описание условий"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
            {saveError && <p className="text-xs text-red-600">{saveError}</p>}
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-medium bg-sky-600 text-white rounded-lg hover:bg-sky-700 cursor-pointer"
              >
                Сохранить в список
              </button>
              <button
                type="button"
                onClick={() => setShowSaveForm(false)}
                className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                Отмена
              </button>
            </div>
          </form>
        )}

        {/* Ползунки моделирования */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Сдвиг уровня воды */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-800 inline-flex items-center gap-1.5">
                <Waves className="w-4 h-4 text-sky-600" />
                Подъём / спад уровня воды (ΔH)
              </label>
              <span className="font-mono text-sm font-bold text-sky-700 tabular-nums">
                {activeConfig.waterDeltaM >= 0 ? '+' : ''}
                {activeConfig.waterDeltaM.toFixed(2)} м
              </span>
            </div>
            <input
              type="range"
              min={-1.0}
              max={4.5}
              step={0.1}
              value={activeConfig.waterDeltaM}
              onChange={(e) => {
                const val = Number(e.target.value);
                ensureCustomAndUpdate((p) => ({ ...p, waterDeltaM: val }));
              }}
              className="w-full mt-3 accent-sky-600 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] font-mono text-slate-500 mt-1">
              <span>-1.0 м</span>
              <span>0.0 м (текущий)</span>
              <span>+4.5 м</span>
            </div>
          </div>

          {/* Временные дамбы */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-800">
                Временная дамба / обвалование
              </label>
              <span className="font-mono text-sm font-bold text-emerald-700 tabular-nums">
                +{activeConfig.leveeMitigationM.toFixed(2)} м
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={2.5}
              step={0.1}
              value={activeConfig.leveeMitigationM}
              onChange={(e) => {
                const val = Number(e.target.value);
                ensureCustomAndUpdate((p) => ({ ...p, leveeMitigationM: val }));
              }}
              className="w-full mt-3 accent-emerald-600 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-500 mt-1">
              <span>Эффективность: {Math.round(rules.leveeEfficiency * 100)}%</span>
              <span className="font-mono">макс. +2.5 м</span>
            </div>
          </div>

          {/* Расчистка русла / регулирование сброса */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-800">
                Снижение подпора (расчистка/сброс)
              </label>
              <span className="font-mono text-sm font-bold text-slate-800 tabular-nums">
                -{activeConfig.channelClearingBonusM.toFixed(2)} м
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1.2}
              step={0.05}
              value={activeConfig.channelClearingBonusM}
              onChange={(e) => {
                const val = Number(e.target.value);
                ensureCustomAndUpdate((p) => ({
                  ...p,
                  channelClearingBonusM: val,
                }));
              }}
              className="w-full mt-3 accent-slate-700 cursor-pointer"
            />
            <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1">
              <span>Снижает уровень во всех створах</span>
              <button
                type="button"
                onClick={() =>
                  ensureCustomAndUpdate((p) => ({
                    ...p,
                    waterDeltaM: 0.4,
                    leveeMitigationM: 0,
                    channelClearingBonusM: 0,
                    postOverrides: {},
                  }))
                }
                className="inline-flex items-center gap-1 text-sky-700 hover:underline cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Сбросить
              </button>
            </div>
          </div>
        </div>

        {/* Тонкая настройка по гидропостам */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowPostOverrides((v) => !v)}
            className="text-xs font-medium text-slate-700 hover:text-slate-900 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>
              {showPostOverrides
                ? 'Скрыть индивидуальные поправки по гидропостам'
                : 'Настроить локальные поправки (заторы) по 6 гидропостам'}
            </span>
          </button>

          {showPostOverrides && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {posts.map((post) => {
                const override = activeConfig.postOverrides[post.id] ?? 0;
                const effective = summary.postLevels.find((pl) => pl.post.id === post.id);
                return (
                  <div
                    key={post.id}
                    className="p-3 border border-slate-200 rounded-lg bg-white text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">
                        {post.code} {post.name}
                      </span>
                      <span className="font-mono font-semibold text-sky-700">
                        {effective?.effectiveLevelM.toFixed(2)} м
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-slate-500 whitespace-nowrap">Поправка:</span>
                      <input
                        type="range"
                        min={-1.5}
                        max={2.0}
                        step={0.1}
                        value={override}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          ensureCustomAndUpdate((p) => ({
                            ...p,
                            postOverrides: { ...p.postOverrides, [post.id]: val },
                          }));
                        }}
                        className="flex-1 accent-sky-600 cursor-pointer"
                      />
                      <span className="font-mono w-14 text-right">
                        {override >= 0 ? '+' : ''}
                        {override.toFixed(1)} м
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Основные расчётные показатели */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Затоплено объектов</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-red-700">
              {summary.floodedObjects}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              из {summary.totalObjects} · угроза: {summary.threatenedObjects}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Макс. глубина: <span className="font-mono font-semibold">{summary.maxDepthM.toFixed(2)} м</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Площадь затопляемых земель</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {summary.floodedAreaHa.toFixed(2)} га
            </span>
            <span className="text-xs text-slate-500 font-mono">
              ({summary.floodedAreaSqKm.toFixed(2)} км²)
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-mono">
            {summary.floodedAreaSqM.toLocaleString('ru-RU')} м² · угроза +{summary.threatenedAreaHa.toFixed(1)} га
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Агрегировано домохозяйств</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {summary.floodedHouseholds}
            </span>
            <span className="text-xs text-amber-700 font-mono">
              +{summary.threatenedHouseholds} в зоне угрозы
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Жителей в зоне затопления: <span className="font-mono font-semibold">{summary.floodedResidents} чел.</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Объекты критического / высокого риска</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-amber-700">
              {summary.criticalRiskObjects + summary.highRiskObjects}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              ({summary.criticalRiskObjects} крит. / {summary.highRiskObjects} выс.)
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Буфер угрозы: <span className="font-mono">{rules.threatBufferM.toFixed(2)} м</span>
          </div>
        </div>
      </div>

      {/* Разбивка площадей и домохозяйств по типам объектов */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">
              Распределение площадей и домохозяйств по категориям
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="text-left px-4 py-2.5 font-semibold">Категория</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Затоплено</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Угроза</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Площадь (га)</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Домохозяйства</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.byType.map((row) => (
                  <tr key={row.type} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-800">
                      {row.label}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-red-700 font-semibold">
                      {row.floodedCount} / {row.totalCount}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-amber-700">
                      {row.threatenedCount}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-900">
                      {(row.floodedAreaSqM / 10000).toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-900">
                      {row.floodedHouseholds}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Состояние гидропостов */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">
              Расчётные уровни воды на гидрологических постах
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="text-left px-4 py-2.5 font-semibold">Пост</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Уровень (м)</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Порог ОЯ</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Режим</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.postLevels.map(({ post, effectiveLevelM, status }) => {
                  const label =
                    status === 'critical'
                      ? 'Критический перелив'
                      : status === 'dangerous'
                        ? 'Опасное явление (ОЯ)'
                        : status === 'adverse'
                          ? 'Неблагоприятное (НЯ)'
                          : 'В пределах нормы';
                  const color =
                    status === 'critical'
                      ? 'text-red-700 font-semibold'
                      : status === 'dangerous'
                        ? 'text-orange-700 font-semibold'
                        : status === 'adverse'
                          ? 'text-amber-700 font-semibold'
                          : 'text-emerald-700';
                  return (
                    <tr key={post.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-slate-800">
                        <span className="font-mono font-semibold">{post.code}</span> · {post.name}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {effectiveLevelM.toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-500">
                        {post.dangerousLevelM.toFixed(2)}
                      </td>
                      <td className={`px-4 py-2.5 ${color}`}>{label}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Список затронутых объектов в данном сценарии */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-4">
          <h3 className="text-sm font-semibold text-slate-900">
            Детализация воздействия по объектам ({impactedAssessments.length} затронуто / в угрозе)
          </h3>
          <span className="text-xs text-slate-500">
            Клик по строке открывает объект на карте
          </span>
        </div>
        {impactedAssessments.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            При текущих параметрах сценария все 48+ объектов находятся выше расчётного уровня воды и вне буферной зоны угрозы.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold">Объект</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Статус</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Риск</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Уровень / Защита</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Глубина (м)</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Площадь (га)</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Д/Х</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {impactedAssessments.map((a) => (
                  <tr
                    key={a.object.id}
                    onClick={() => onSelectObjectOnMap(a.object.id)}
                    className="hover:bg-sky-50/50 cursor-pointer"
                  >
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-slate-900">
                        <span className="font-mono text-slate-500 mr-1.5">{a.object.code}</span>
                        {a.object.name}
                      </div>
                      <div className="text-[11px] text-slate-500">{a.object.settlement}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <FloodStatusIndicator status={a.floodStatus} />
                    </td>
                    <td className="px-4 py-2.5">
                      <RiskIndicator level={a.riskLevel} />
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-700">
                      {a.effectiveWaterLevelM.toFixed(2)} / {a.effectiveProtectionElevationM.toFixed(2)}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right font-mono tabular-nums font-semibold ${
                        a.floodDepthM > 0 ? 'text-red-700' : 'text-amber-700'
                      }`}
                    >
                      {a.floodDepthM > 0 ? `+${a.floodDepthM.toFixed(2)}` : a.floodDepthM.toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-700">
                      {(a.object.areaSqM / 10000).toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-900">
                      {a.object.households}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Прозрачное объяснение допущений модели */}
      <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 flex items-start gap-3">
        <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-800">Методика и допущения модели: </span>
          расчётная отметка воды по каждому объекту вычисляется от текущего уровня опорного гидропоста + заданный сдвиг ΔH − эффект расчистки русла. Сравнение выполняется с эффективной отметкой защиты объекта (отметка рельефа + локальный цоколь + временная дамба × коэффициент эффективности {Math.round(rules.leveeEfficiency * 100)}% + гидравлический уклон). Инструмент предназначен для сценарного анализа и инженерного планирования.
        </div>
      </div>
    </div>
  );
};
