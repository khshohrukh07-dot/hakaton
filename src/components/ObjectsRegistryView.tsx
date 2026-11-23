import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Crosshair,
  Download,
  Edit3,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { OBJECT_TYPE_LABELS } from '../data/demoScenario';
import {
  FloodStatus,
  HydroPost,
  ObjectAssessment,
  ObjectType,
  RiskLevel,
  RolePermissions,
  ScenarioSummary,
  VulnerableObject,
} from '../types/hydro';
import { suggestObjectCardDefaults } from '../utils/aiEngine';
import {
  ObjectValidationErrors,
  validateObjectInput,
} from '../utils/hydroEngine';
import { compressImageFileToDataUrl } from '../utils/imageUtils';
import { FloodEvent } from '../types/hydro';
import { MapPickerModal } from './MapPickerModal';
import { FloodStatusIndicator, RiskIndicator } from './StatusIndicator';

interface ObjectsRegistryViewProps {
  summary: ScenarioSummary;
  posts: HydroPost[];
  events: FloodEvent[];
  permissions: RolePermissions;
  onAddObject: (obj: Omit<VulnerableObject, 'id' | 'updatedAt' | 'updatedBy'>) => void;
  onUpdateObject: (id: string, patch: Partial<VulnerableObject>) => void;
  onDeleteObject: (id: string) => void;
  onLocateOnMap: (objectId: string) => void;
  onAskAiForObject: (objectId: string) => void;
  onExportCsv: () => void;
  editingObjectIdExternal: string | null;
  onClearExternalEdit: () => void;
}

export const ObjectsRegistryView: React.FC<ObjectsRegistryViewProps> = ({
  summary,
  posts,
  events,
  permissions,
  onAddObject,
  onUpdateObject,
  onDeleteObject,
  onLocateOnMap,
  onAskAiForObject,
  onExportCsv,
  editingObjectIdExternal,
  onClearExternalEdit,
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | ObjectType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | FloodStatus>('all');
  const [riskFilter, setRiskFilter] = useState<'all' | RiskLevel>('all');
  const [onlyIssues, setOnlyIssues] = useState(false);

  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ObjectAssessment | null>(null);

  const [formState, setFormState] = useState({
    code: '',
    name: '',
    type: 'residential' as ObjectType,
    settlement: 'п. Заречный',
    lat: 53.225,
    lng: 63.61,
    elevationM: 96.8,
    postId: posts[0]?.id ?? 'post-1',
    areaSqM: 22000,
    households: 28,
    residents: 90,
    protectionHeightM: 0.2,
    condition: 'satisfactory' as 'good' | 'satisfactory' | 'worn',
    photoUrl: '',
    notes: '',
  });
  const [errors, setErrors] = useState<ObjectValidationErrors>({});
  const [photoError, setPhotoError] = useState('');

  // Открытие модалки редактирования при переходе с карты или админ-панели
  React.useEffect(() => {
    if (editingObjectIdExternal) {
      const found = summary.assessments.find(
        (a) => a.object.id === editingObjectIdExternal,
      );
      if (found) {
        openEditModal(found.object);
      }
      onClearExternalEdit();
    }
  }, [editingObjectIdExternal]);

  const openCreateModal = () => {
    const nextNum = summary.assessments.length + 1;
    const code = `ОБ-${String(nextNum).padStart(3, '0')}`;
    setFormState({
      code,
      name: '',
      type: 'residential',
      settlement: 'Центральный участок',
      lat: 53.224,
      lng: 63.612,
      elevationM: 96.6,
      postId: posts[1]?.id ?? posts[0]?.id ?? 'post-1',
      areaSqM: 24000,
      households: 30,
      residents: 95,
      protectionHeightM: 0.2,
      condition: 'satisfactory',
      photoUrl: '',
      notes: '',
    });
    setErrors({});
    setPhotoError('');
    setEditingId(null);
    setModalMode('create');
  };

  const openEditModal = (obj: VulnerableObject) => {
    setFormState({
      code: obj.code,
      name: obj.name,
      type: obj.type,
      settlement: obj.settlement,
      lat: obj.lat,
      lng: obj.lng,
      elevationM: obj.elevationM,
      postId: obj.postId,
      areaSqM: obj.areaSqM,
      households: obj.households,
      residents: obj.residents,
      protectionHeightM: obj.protectionHeightM,
      condition: obj.condition,
      photoUrl: obj.photoUrl ?? '',
      notes: obj.notes,
    });
    setErrors({});
    setPhotoError('');
    setEditingId(obj.id);
    setModalMode('edit');
  };

  const handleAiAutoFill = () => {
    const post = posts.find((p) => p.id === formState.postId);
    const suggestion = suggestObjectCardDefaults(formState.type, post);
    setFormState((prev) => ({
      ...prev,
      elevationM: suggestion.elevationM ?? prev.elevationM,
      areaSqM: suggestion.areaSqM ?? prev.areaSqM,
      households: suggestion.households ?? prev.households,
      residents: suggestion.residents ?? prev.residents,
      protectionHeightM: suggestion.protectionHeightM ?? prev.protectionHeightM,
      condition: suggestion.condition ?? prev.condition,
    }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError('');
    try {
      const dataUrl = await compressImageFileToDataUrl(file);
      setFormState((prev) => ({ ...prev, photoUrl: dataUrl }));
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Ошибка загрузки фото.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateObjectInput(formState);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }

    if (modalMode === 'create') {
      onAddObject({
        ...formState,
        photoUrl: formState.photoUrl || undefined,
      });
    } else if (modalMode === 'edit' && editingId) {
      onUpdateObject(editingId, {
        ...formState,
        photoUrl: formState.photoUrl || undefined,
      });
    }
    setModalMode(null);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return summary.assessments.filter((a) => {
      if (typeFilter !== 'all' && a.object.type !== typeFilter) return false;
      if (statusFilter !== 'all' && a.floodStatus !== statusFilter) return false;
      if (riskFilter !== 'all' && a.riskLevel !== riskFilter) return false;
      if (onlyIssues && a.anomalies.length === 0) return false;
      if (q) {
        const hay = `${a.object.code} ${a.object.name} ${a.object.settlement} ${a.post?.code ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [summary.assessments, search, typeFilter, statusFilter, riskFilter, onlyIssues]);

  const filteredAreaHa = filtered.reduce((acc, a) => acc + a.object.areaSqM, 0) / 10000;
  const filteredHouseholds = filtered.reduce((acc, a) => acc + a.object.households, 0);

  return (
    <div className="space-y-5">
      {/* Панель поиска и фильтров */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Реестр уязвимых объектов ({summary.assessments.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Показано: <span className="font-mono font-semibold text-slate-800">{filtered.length}</span> · Площадь выборки: <span className="font-mono font-semibold text-slate-800">{filteredAreaHa.toFixed(2)} га</span> · Домохозяйств: <span className="font-mono font-semibold text-slate-800">{filteredHouseholds}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {permissions.canExportReports && (
              <button
                type="button"
                onClick={onExportCsv}
                className="px-3 py-2 text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Экспорт CSV</span>
              </button>
            )}
            {permissions.canCreateObject && (
              <button
                type="button"
                onClick={openCreateModal}
                className="px-3 py-2 text-xs font-medium bg-sky-600 text-white hover:bg-sky-700 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Добавить объект</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по коду, названию, посёлку..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | ObjectType)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
          >
            <option value="all">Все типы объектов</option>
            {Object.entries(OBJECT_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | FloodStatus)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
          >
            <option value="all">Любой статус затопления</option>
            <option value="flooded">Затоплен</option>
            <option value="threatened">В зоне угрозы</option>
            <option value="safe">Безопасно</option>
          </select>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value as 'all' | RiskLevel)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
          >
            <option value="all">Любой уровень риска</option>
            <option value="critical">Критический риск</option>
            <option value="high">Высокий риск</option>
            <option value="medium">Средний риск</option>
            <option value="low">Низкий риск</option>
          </select>
        </div>

        <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyIssues}
            onChange={(e) => setOnlyIssues(e.target.checked)}
            className="rounded border-slate-300 text-sky-600"
          />
          <span>Показать только объекты с неполными или подозрительными данными</span>
        </label>
      </div>

      {/* Таблица объектов */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            По заданным фильтрам объекты не найдены. Попробуйте сбросить поисковый запрос.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="text-left px-4 py-3 font-semibold">Объект</th>
                  <th className="text-left px-4 py-3 font-semibold">Тип / Сектор</th>
                  <th className="text-right px-4 py-3 font-semibold">Отм. / Вода</th>
                  <th className="text-left px-4 py-3 font-semibold">Статус</th>
                  <th className="text-left px-4 py-3 font-semibold">Риск</th>
                  <th className="text-right px-4 py-3 font-semibold">Площадь</th>
                  <th className="text-right px-4 py-3 font-semibold">Д/Х</th>
                  <th className="text-right px-4 py-3 font-semibold">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((a) => (
                  <tr key={a.object.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-2.5 max-w-xs">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <span className="font-mono text-slate-500">{a.object.code}</span>
                        <span className="truncate">{a.object.name}</span>
                        {a.anomalies.length > 0 && (
                          <span
                            title={a.anomalies.join('\n')}
                            className="text-amber-600 shrink-0"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {a.object.lat.toFixed(4)}, {a.object.lng.toFixed(4)} · полнота {a.completenessScore}%
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="text-slate-800">{OBJECT_TYPE_LABELS[a.object.type]}</div>
                      <div className="text-[11px] text-slate-500">{a.object.settlement}</div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                      <div className="text-slate-900">
                        {a.effectiveProtectionElevationM.toFixed(2)} м
                      </div>
                      <div className="text-[11px] text-sky-700">
                        {a.post?.code}: {a.effectiveWaterLevelM.toFixed(2)} м
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <FloodStatusIndicator status={a.floodStatus} />
                    </td>
                    <td className="px-4 py-2.5">
                      <RiskIndicator level={a.riskLevel} />
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-800">
                      {(a.object.areaSqM / 10000).toFixed(2)} га
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-900">
                      {a.object.households}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onLocateOnMap(a.object.id)}
                          title="Показать на карте"
                          className="p-1.5 text-slate-500 hover:text-sky-700 hover:bg-sky-50 rounded cursor-pointer"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onAskAiForObject(a.object.id)}
                          title="Объяснить риск (AI)"
                          className="p-1.5 text-slate-500 hover:text-sky-700 hover:bg-sky-50 rounded cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                        {permissions.canEditObject && (
                          <button
                            type="button"
                            onClick={() => openEditModal(a.object)}
                            title="Редактировать"
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {permissions.canDeleteObject && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(a)}
                            title="Удалить"
                            className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Модальное окно создания/редактирования объекта */}
      {modalMode && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {modalMode === 'create'
                    ? 'Новый уязвимый объект'
                    : `Редактирование карточки ${formState.code}`}
                </h3>
                <p className="text-xs text-slate-500">
                  Все изменения проверяются валидатором и автоматически сохраняются в локальном хранилище.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between bg-sky-50 border border-sky-200 rounded-lg px-3 py-2">
                <span className="text-sky-900">
                  AI-помощник может подставить типовые значения высоты и площади по выбранному типу и посту.
                </span>
                <button
                  type="button"
                  onClick={handleAiAutoFill}
                  className="px-2.5 py-1 bg-sky-600 text-white rounded-md font-medium hover:bg-sky-700 inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Заполнить типовые</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Код *</label>
                  <input
                    type="text"
                    value={formState.code}
                    onChange={(e) => setFormState({ ...formState, code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-medium text-slate-700 mb-1">
                    Наименование объекта *
                  </label>
                  <input
                    type="text"
                    value={formState.name}
                    onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                    placeholder="Напр.: Жилой квартал «Береговой»"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                  {errors.name && <p className="text-red-600 mt-1">{errors.name}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Тип объекта</label>
                  <select
                    value={formState.type}
                    onChange={(e) =>
                      setFormState({ ...formState, type: e.target.value as ObjectType })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    {Object.entries(OBJECT_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Населённый пункт / сектор *
                  </label>
                  <input
                    type="text"
                    value={formState.settlement}
                    onChange={(e) =>
                      setFormState({ ...formState, settlement: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                  {errors.settlement && (
                    <p className="text-red-600 mt-1">{errors.settlement}</p>
                  )}
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Опорный гидропост
                  </label>
                  <select
                    value={formState.postId}
                    onChange={(e) => setFormState({ ...formState, postId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    {posts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Широта *</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formState.lat}
                    onChange={(e) =>
                      setFormState({ ...formState, lat: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                  {errors.lat && <p className="text-red-600 mt-1">{errors.lat}</p>}
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Долгота *</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formState.lng}
                    onChange={(e) =>
                      setFormState({ ...formState, lng: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                  {errors.lng && <p className="text-red-600 mt-1">{errors.lng}</p>}
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => setMapPickerOpen(true)}
                    className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg font-medium text-slate-800 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                    <span>Выбрать на карте</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Отметка (м БСВ) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formState.elevationM}
                    onChange={(e) =>
                      setFormState({ ...formState, elevationM: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                  {errors.elevationM && (
                    <p className="text-red-600 mt-1">{errors.elevationM}</p>
                  )}
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Лок. защита (м)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={formState.protectionHeightM}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        protectionHeightM: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                  {errors.protectionHeightM && (
                    <p className="text-red-600 mt-1">{errors.protectionHeightM}</p>
                  )}
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Площадь (м²) *
                  </label>
                  <input
                    type="number"
                    step="100"
                    value={formState.areaSqM}
                    onChange={(e) =>
                      setFormState({ ...formState, areaSqM: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                  {errors.areaSqM && (
                    <p className="text-red-600 mt-1">{errors.areaSqM}</p>
                  )}
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Состояние</label>
                  <select
                    value={formState.condition}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        condition: e.target.value as 'good' | 'satisfactory' | 'worn',
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="good">Хорошее</option>
                    <option value="satisfactory">Удовлетворительное</option>
                    <option value="worn">Изношенное</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Домохозяйства (шт.)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={formState.households}
                    onChange={(e) =>
                      setFormState({ ...formState, households: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                  {errors.households && (
                    <p className="text-red-600 mt-1">{errors.households}</p>
                  )}
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Жители / персонал (чел.)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={formState.residents}
                    onChange={(e) =>
                      setFormState({ ...formState, residents: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                  {errors.residents && (
                    <p className="text-red-600 mt-1">{errors.residents}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Примечания</label>
                <textarea
                  rows={2}
                  value={formState.notes}
                  onChange={(e) => setFormState({ ...formState, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Особенности фундамента, подъездных путей, защиты..."
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Фотография объекта (опционально)
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg cursor-pointer inline-flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Загрузить фото</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                  {formState.photoUrl && (
                    <div className="flex items-center gap-2">
                      <img
                        src={formState.photoUrl}
                        alt="Превью объекта"
                        referrerPolicy="no-referrer"
                        className="w-12 h-9 object-cover rounded border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => setFormState({ ...formState, photoUrl: '' })}
                        className="text-red-600 hover:underline cursor-pointer"
                      >
                        Удалить фото
                      </button>
                    </div>
                  )}
                </div>
                {photoError && <p className="text-red-600 mt-1">{photoError}</p>}
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 text-white font-medium rounded-lg hover:bg-sky-700 cursor-pointer"
                >
                  {modalMode === 'create' ? 'Создать объект' : 'Сохранить изменения'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Подтверждение удаления */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-slate-900">
              Подтвердите удаление объекта
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Вы действительно хотите удалить запись{' '}
              <strong className="text-slate-900">
                {deleteTarget.object.code} «{deleteTarget.object.name}»
              </strong>
              ? Действие пересчитает показатели всех сценариев и будет записано в историю изменений.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3.5 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteObject(deleteTarget.object.id);
                  setDeleteTarget(null);
                }}
                className="px-3.5 py-2 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 cursor-pointer"
              >
                Удалить безвозвратно
              </button>
            </div>
          </div>
        </div>
      )}

      <MapPickerModal
        isOpen={mapPickerOpen}
        summary={summary}
        posts={posts}
        events={events}
        onPick={(coords) =>
          setFormState((prev) => ({ ...prev, lat: coords.lat, lng: coords.lng }))
        }
        onClose={() => setMapPickerOpen(false)}
      />
    </div>
  );
};
