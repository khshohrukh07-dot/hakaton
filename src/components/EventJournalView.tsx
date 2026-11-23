import React, { useMemo, useState } from 'react';
import {
  Camera,
  Check,
  Crosshair,
  LocateFixed,
  MapPin,
  Plus,
  Search,
  Upload,
  X,
} from 'lucide-react';
import { EVENT_TYPE_LABELS } from '../data/demoScenario';
import {
  EventStatus,
  EventType,
  FloodEvent,
  HydroPost,
  RiskLevel,
  RolePermissions,
  VulnerableObject,
} from '../types/hydro';
import {
  BUILTIN_DEMO_PHOTOS,
  compressImageFileToDataUrl,
} from '../utils/imageUtils';
import { ScenarioSummary } from '../types/hydro';
import { MapPickerModal } from './MapPickerModal';
import { EventStatusIndicator, RiskIndicator } from './StatusIndicator';

interface EventJournalViewProps {
  summary: ScenarioSummary;
  events: FloodEvent[];
  posts: HydroPost[];
  objects: VulnerableObject[];
  permissions: RolePermissions;
  onAddEvent: (
    evt: Omit<FloodEvent, 'id' | 'status' | 'createdAt' | 'createdBy'>,
  ) => void;
  onReviewEvent: (
    eventId: string,
    status: 'confirmed' | 'rejected',
    comment: string,
  ) => void;
}

export const EventJournalView: React.FC<EventJournalViewProps> = ({
  summary,
  events,
  posts,
  objects,
  permissions,
  onAddEvent,
  onReviewEvent,
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | EventType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | EventStatus>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);

  const [formState, setFormState] = useState({
    title: '',
    type: 'flooding' as EventType,
    severity: 'high' as RiskLevel,
    lat: 53.224,
    lng: 63.61,
    postId: posts[0]?.id ?? '',
    objectId: '',
    waterLevelObservedM: '',
    description: '',
    photoUrl: '',
  });
  const [formError, setFormError] = useState('');
  const [geoStatus, setGeoStatus] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      if (typeFilter !== 'all' && e.type !== typeFilter) return false;
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (q) {
        const hay = `${e.title} ${e.description} ${e.createdBy}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [events, search, typeFilter, statusFilter]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormError('');
    try {
      const dataUrl = await compressImageFileToDataUrl(file);
      setFormState((prev) => ({ ...prev, photoUrl: dataUrl }));
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Не удалось обработать фотографию.',
      );
    }
  };

  const handleDetectGeolocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('Геолокация не поддерживается вашим браузером.');
      return;
    }
    setGeoStatus('Определение координат...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormState((prev) => ({
          ...prev,
          lat: Number(pos.coords.latitude.toFixed(4)),
          lng: Number(pos.coords.longitude.toFixed(4)),
        }));
        setGeoStatus('Координаты получены по GPS/браузеру.');
      },
      () => {
        setGeoStatus('Доступ к геолокации отклонён — выберите точку на карте вручную.');
      },
      { timeout: 6000 },
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formState.title.trim().length < 4) {
      setFormError('Введите заголовок события (минимум 4 символа).');
      return;
    }
    if (formState.description.trim().length < 10) {
      setFormError('Опишите событие подробнее (минимум 10 символов).');
      return;
    }
    if (
      !Number.isFinite(formState.lat) ||
      !Number.isFinite(formState.lng) ||
      formState.lat < -90 ||
      formState.lat > 90
    ) {
      setFormError('Проверьте корректность координат.');
      return;
    }

    const obsLevel = formState.waterLevelObservedM.trim()
      ? Number(formState.waterLevelObservedM)
      : undefined;

    if (obsLevel !== undefined && (!Number.isFinite(obsLevel) || obsLevel < 50 || obsLevel > 5000)) {
      setFormError('Наблюдаемый уровень воды должен быть в диапазоне 50–5000 м.');
      return;
    }

    onAddEvent({
      title: formState.title.trim(),
      type: formState.type,
      severity: formState.severity,
      lat: formState.lat,
      lng: formState.lng,
      postId: formState.postId || undefined,
      objectId: formState.objectId || undefined,
      waterLevelObservedM: obsLevel,
      description: formState.description.trim(),
      photoUrl: formState.photoUrl || undefined,
    });

    setShowCreateModal(false);
    setFormState({
      title: '',
      type: 'flooding',
      severity: 'high',
      lat: 53.224,
      lng: 63.61,
      postId: posts[0]?.id ?? '',
      objectId: '',
      waterLevelObservedM: '',
      description: '',
      photoUrl: '',
    });
    setFormError('');
    setGeoStatus('');
  };

  return (
    <div className="space-y-5">
      {/* Панель управления журналом */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Журнал полевых событий и нарушений ({events.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Регистрация фактов подтопления, осмотров дамб, фотофиксации и нарушений в водоохранной зоне.
            </p>
          </div>
          {permissions.canRegisterEvent && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="px-3.5 py-2 text-xs font-medium bg-sky-600 text-white hover:bg-sky-700 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Зарегистрировать событие</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по событиям, автору..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | EventType)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
          >
            <option value="all">Все типы событий</option>
            {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | EventStatus)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
          >
            <option value="all">Все статусы проверки</option>
            <option value="pending">На проверке</option>
            <option value="confirmed">Подтверждено</option>
            <option value="rejected">Отклонено</option>
          </select>
        </div>
      </div>

      {/* Лента событий */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
          Событий по выбранным фильтрам не найдено.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((evt) => {
            const linkedPost = posts.find((p) => p.id === evt.postId);
            const linkedObject = objects.find((o) => o.id === evt.objectId);
            return (
              <article
                key={evt.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col"
              >
                {evt.photoUrl ? (
                  <div className="h-48 w-full bg-slate-100 overflow-hidden relative">
                    <img
                      src={evt.photoUrl}
                      alt={evt.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-24 w-full bg-slate-50 border-b border-slate-100 flex items-center justify-center text-slate-400 text-xs gap-2">
                    <Camera className="w-4 h-4" />
                    <span>Без фотоприложения</span>
                  </div>
                )}

                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-slate-500">
                        {EVENT_TYPE_LABELS[evt.type]} · <span className="font-mono">{evt.createdAt}</span>
                      </span>
                      <EventStatusIndicator status={evt.status} />
                    </div>

                    <h3 className="text-sm font-semibold text-slate-900 mt-1.5">
                      {evt.title}
                    </h3>

                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                      {evt.description}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 font-mono">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {evt.lat.toFixed(4)}, {evt.lng.toFixed(4)}
                      </span>
                      {linkedPost && <span>Пост: {linkedPost.code}</span>}
                      {linkedObject && <span>Объект: {linkedObject.code}</span>}
                      {evt.waterLevelObservedM !== undefined && (
                        <span className="text-sky-700 font-semibold">
                          Уровень: {evt.waterLevelObservedM.toFixed(2)} м
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-3">
                      <RiskIndicator level={evt.severity} />
                      <span className="text-slate-500 text-[11px]">{evt.createdBy}</span>
                    </div>

                    {permissions.canConfirmViolations && evt.status === 'pending' && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            onReviewEvent(
                              evt.id,
                              'confirmed',
                              'Подтверждено в оперативном журнале.',
                            )
                          }
                          className="px-2.5 py-1 bg-emerald-600 text-white rounded-md text-[11px] font-medium hover:bg-emerald-700 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                          <span>Подтвердить</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onReviewEvent(
                              evt.id,
                              'rejected',
                              'Отклонено после выездной проверки.',
                            )
                          }
                          className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-[11px] font-medium hover:bg-slate-200 cursor-pointer"
                        >
                          Отклонить
                        </button>
                      </div>
                    )}
                  </div>

                  {evt.reviewComment && (
                    <div className="text-[11px] text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                      <span className="font-semibold text-slate-800">Резолюция: </span>
                      {evt.reviewComment}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Модальное окно регистрации события */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Регистрация нового события
                </h3>
                <p className="text-xs text-slate-500">
                  Укажите координаты, описание и приложите фотографию с места.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Заголовок события *
                </label>
                <input
                  type="text"
                  value={formState.title}
                  onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                  placeholder="Напр.: Перелив через дорогу в районе СНТ «Луговое»"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Тип события</label>
                  <select
                    value={formState.type}
                    onChange={(e) =>
                      setFormState({ ...formState, type: e.target.value as EventType })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Серьёзность</label>
                  <select
                    value={formState.severity}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        severity: e.target.value as RiskLevel,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="critical">Критическая</option>
                    <option value="high">Высокая</option>
                    <option value="medium">Средняя</option>
                    <option value="low">Низкая</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Гидропост</label>
                  <select
                    value={formState.postId}
                    onChange={(e) => setFormState({ ...formState, postId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="">Без привязки</option>
                    {posts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Объект</label>
                  <select
                    value={formState.objectId}
                    onChange={(e) =>
                      setFormState({ ...formState, objectId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="">Без привязки</option>
                    {objects.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.code} {o.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Уровень воды (м)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={formState.waterLevelObservedM}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        waterLevelObservedM: e.target.value,
                      })
                    }
                    placeholder="Напр. 96.8"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              {/* Координаты */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-slate-800">Координаты места события</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDetectGeolocation}
                      className="px-2.5 py-1 bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-100 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <LocateFixed className="w-3 h-3" />
                      <span>GPS</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMapPickerOpen(true)}
                      className="px-2.5 py-1 bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-100 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Crosshair className="w-3 h-3" />
                      <span>На карте</span>
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    step="0.0001"
                    value={formState.lat}
                    onChange={(e) =>
                      setFormState({ ...formState, lat: Number(e.target.value) })
                    }
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded font-mono"
                    aria-label="Широта"
                  />
                  <input
                    type="number"
                    step="0.0001"
                    value={formState.lng}
                    onChange={(e) =>
                      setFormState({ ...formState, lng: Number(e.target.value) })
                    }
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded font-mono"
                    aria-label="Долгота"
                  />
                </div>
                {geoStatus && <p className="text-[11px] text-slate-500">{geoStatus}</p>}
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Описание ситуации *
                </label>
                <textarea
                  rows={3}
                  value={formState.description}
                  onChange={(e) =>
                    setFormState({ ...formState, description: e.target.value })
                  }
                  placeholder="Опишите наблюдаемую обстановку, глубину перелива, состояние откосов или характер нарушения..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              {/* Загрузка фотографии или выбор из демо-галереи */}
              <div className="space-y-2">
                <label className="block font-medium text-slate-700">
                  Фотофиксация
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-lg cursor-pointer inline-flex items-center gap-1.5 font-medium">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Загрузить файл с устройства</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                  {BUILTIN_DEMO_PHOTOS.map((photo) => (
                    <button
                      key={photo.url}
                      type="button"
                      onClick={() =>
                        setFormState((prev) => ({ ...prev, photoUrl: photo.url }))
                      }
                      className={`px-2.5 py-1.5 rounded-lg border text-[11px] cursor-pointer ${
                        formState.photoUrl === photo.url
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {photo.label}
                    </button>
                  ))}
                </div>
                {formState.photoUrl && (
                  <div className="flex items-center gap-3 pt-1">
                    <img
                      src={formState.photoUrl}
                      alt="Прикреплённое фото"
                      referrerPolicy="no-referrer"
                      className="w-24 h-16 object-cover rounded-lg border border-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => setFormState({ ...formState, photoUrl: '' })}
                      className="text-red-600 hover:underline cursor-pointer"
                    >
                      Убрать фото
                    </button>
                  </div>
                )}
              </div>

              {formError && <p className="text-red-600 font-medium">{formError}</p>}

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 text-white font-medium rounded-lg hover:bg-sky-700 cursor-pointer"
                >
                  Сохранить событие
                </button>
              </div>
            </form>
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
