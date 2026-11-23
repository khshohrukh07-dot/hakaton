import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  Database,
  Download,
  Edit3,
  History,
  Lock,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sliders,
  Trash2,
  X,
} from 'lucide-react';
import {
  EVENT_TYPE_LABELS,
  ROLE_PERMISSIONS,
} from '../data/demoScenario';
import {
  AnalysisRules,
  AppState,
  AuditEntry,
  DataQualityIssue,
  FloodEvent,
  HydroPost,
  RolePermissions,
  ScenarioConfig,
  UserRole,
} from '../types/hydro';
import { EventStatusIndicator, RiskIndicator } from './StatusIndicator';

interface AdminPanelViewProps {
  state: AppState;
  permissions: RolePermissions;
  dataIssues: DataQualityIssue[];
  onChangeRole: (role: UserRole) => void;
  onUpdatePost: (id: string, patch: Partial<HydroPost>) => void;
  onAddPost: (post: Omit<HydroPost, 'id' | 'lastUpdated'>) => void;
  onUpdateRules: (rules: AnalysisRules) => void;
  onReviewEvent: (
    eventId: string,
    status: 'confirmed' | 'rejected',
    comment: string,
  ) => void;
  onDeleteScenario: (id: string) => void;
  onEditObject: (objectId: string) => void;
  onExportCsv: () => void;
  onExportJson: () => void;
  onExportHtml: () => void;
  onResetDemo: () => void;
}

type AdminTab =
  | 'audit_data'
  | 'violations'
  | 'posts'
  | 'rules'
  | 'scenarios_objects'
  | 'history';

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({
  state,
  permissions,
  dataIssues,
  onChangeRole,
  onUpdatePost,
  onAddPost,
  onUpdateRules,
  onReviewEvent,
  onDeleteScenario,
  onEditObject,
  onExportCsv,
  onExportJson,
  onExportHtml,
  onResetDemo,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('audit_data');
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [postDraft, setPostDraft] = useState<Partial<HydroPost>>({});
  const [showAddPost, setShowAddPost] = useState(false);
  const [newPost, setNewPost] = useState({
    code: `ГП-0${state.posts.length + 1}`,
    name: '',
    riverSection: '',
    lat: 53.21,
    lng: 63.64,
    zeroElevationM: 91.5,
    currentWaterLevelM: 95.0,
    adverseLevelM: 96.0,
    dangerousLevelM: 96.8,
    criticalLevelM: 97.6,
    notes: '',
  });
  const [reviewComment, setReviewComment] = useState<Record<string, string>>({});
  const [confirmReset, setConfirmReset] = useState(false);

  const pendingEvents = state.events.filter((e) => e.status === 'pending');

  const handleSavePost = (id: string) => {
    onUpdatePost(id, {
      ...postDraft,
      lastUpdated: new Date().toISOString().slice(0, 16).replace('T', ' '),
    });
    setEditingPostId(null);
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPost.name.trim().length < 3) return;
    onAddPost(newPost);
    setShowAddPost(false);
    setNewPost({
      ...newPost,
      code: `ГП-0${state.posts.length + 2}`,
      name: '',
      riverSection: '',
      notes: '',
    });
  };

  return (
    <div className="space-y-6">
      {/* Переключатель ролей и матрица доступа */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Административная панель специалиста
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
              Управление гидропостами, правилами сценарного анализа, категориями риска, проверкой данных и подтверждением нарушений. Реализовано демонстрационное переключение ролей поверх готовой ролевой модели прав доступа (RBAC).
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
            {(['admin', 'specialist', 'observer'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onChangeRole(r)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  state.role === r
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {ROLE_PERMISSIONS[r].label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="font-semibold text-slate-900">
              Текущая роль: {permissions.label}.{' '}
            </span>
            <span>{permissions.description}</span>
          </div>
          <div className="font-mono text-[11px] text-slate-500">
            Права: объекты ({permissions.canEditObject ? 'ред.' : 'чтение'}), посты (
            {permissions.canEditPosts ? 'ред.' : 'чтение'}), правила (
            {permissions.canEditRules ? 'ред.' : 'чтение'}), нарушения (
            {permissions.canConfirmViolations ? 'подтв.' : 'просмотр'})
          </div>
        </div>

        {/* Навигация внутри админ-панели */}
        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          {(
            [
              ['audit_data', `Проверка данных (${dataIssues.length})`, AlertTriangle],
              ['violations', `Подтверждение нарушений (${pendingEvents.length})`, ShieldCheck],
              ['posts', `Гидропосты (${state.posts.length})`, Database],
              ['rules', 'Правила и категории риска', Sliders],
              ['scenarios_objects', 'Сценарии и экспорт', Download],
              ['history', `История изменений (${state.auditLog.length})`, History],
            ] as const
          ).map(([tabKey, label, Icon]) => (
            <button
              key={tabKey}
              type="button"
              onClick={() => setActiveTab(tabKey)}
              className={`px-3 py-2 text-xs font-medium rounded-lg border inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === tabKey
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Вкладка 1: Проверка данных */}
      {activeTab === 'audit_data' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Автоматическая проверка качества и полноты данных
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Выявляет пропуски площадей, противоречивые отметки рельефа, нулевые домохозяйства и дубликаты.
              </p>
            </div>
          </div>
          {dataIssues.length === 0 ? (
            <div className="p-8 text-center text-sm text-emerald-700">
              Все записи объектов прошли проверку целостности без ошибок и предупреждений.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {dataIssues.map((iss) => (
                <div
                  key={iss.id}
                  className="p-4 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50"
                >
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex items-center gap-2 text-xs">
                      <span
                        className={`font-semibold ${
                          iss.severity === 'error' ? 'text-red-700' : 'text-amber-700'
                        }`}
                      >
                        {iss.severity === 'error' ? 'Ошибка данных' : 'Предупреждение'}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {iss.objectCode}
                      </span>
                      <span className="font-medium text-slate-900">{iss.objectName}</span>
                    </div>
                    <p className="text-xs text-slate-700">{iss.message}</p>
                    <p className="text-[11px] text-slate-500">
                      Рекомендация: {iss.suggestion}
                    </p>
                  </div>
                  {permissions.canEditObject && (
                    <button
                      type="button"
                      onClick={() => onEditObject(iss.objectId)}
                      className="px-3 py-1.5 text-xs font-medium bg-sky-600 text-white rounded-lg hover:bg-sky-700 inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Исправить карточку</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Вкладка 2: Подтверждение зарегистрированных нарушений и событий */}
      {activeTab === 'violations' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">
              Верификация нарушений и полевых сообщений
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {permissions.canConfirmViolations
                ? 'Подтвердите или отклоните поступившие сообщения инспекторов с указанием резолюции.'
                : 'У вашей роли нет прав на подтверждение нарушений (переключите роль на «Администратор»).'}
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {state.events.map((evt: FloodEvent) => (
              <div key={evt.id} className="p-4 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-900">{evt.title}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-600">{EVENT_TYPE_LABELS[evt.type]}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <RiskIndicator level={evt.severity} />
                    <EventStatusIndicator status={evt.status} />
                  </div>
                </div>
                <p className="text-xs text-slate-600">{evt.description}</p>
                <div className="text-[11px] text-slate-500 font-mono">
                  {evt.createdAt} · Автор: {evt.createdBy} · Координаты: {evt.lat.toFixed(4)}, {evt.lng.toFixed(4)}
                </div>

                {permissions.canConfirmViolations ? (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={reviewComment[evt.id] ?? evt.reviewComment ?? ''}
                      onChange={(e) =>
                        setReviewComment({ ...reviewComment, [evt.id]: e.target.value })
                      }
                      placeholder="Комментарий проверяющего..."
                      className="flex-1 min-w-[220px] px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        onReviewEvent(
                          evt.id,
                          'confirmed',
                          reviewComment[evt.id] || 'Нарушение/событие подтверждено администратором.',
                        )
                      }
                      className="px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Подтвердить</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onReviewEvent(
                          evt.id,
                          'rejected',
                          reviewComment[evt.id] || 'Отклонено при проверке.',
                        )
                      }
                      className="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Отклонить</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-[11px] text-amber-700 inline-flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span>Требуется роль Администратор</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Вкладка 3: Управление гидропостами */}
      {activeTab === 'posts' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Управление гидрологическими постами
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Базовые уровни воды и пороговые отметки НЯ / ОЯ / Критический перелив.
              </p>
            </div>
            {permissions.canEditPosts && (
              <button
                type="button"
                onClick={() => setShowAddPost((v) => !v)}
                className="px-3 py-1.5 text-xs font-medium bg-sky-600 text-white rounded-lg hover:bg-sky-700 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Добавить пост</span>
              </button>
            )}
          </div>

          {showAddPost && permissions.canEditPosts && (
            <form
              onSubmit={handleCreatePost}
              className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs"
            >
              <input
                type="text"
                placeholder="Код (ГП-07)"
                value={newPost.code}
                onChange={(e) => setNewPost({ ...newPost, code: e.target.value })}
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono"
              />
              <input
                type="text"
                placeholder="Название поста *"
                value={newPost.name}
                onChange={(e) => setNewPost({ ...newPost, name: e.target.value })}
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                placeholder="Участок реки"
                value={newPost.riverSection}
                onChange={(e) =>
                  setNewPost({ ...newPost, riverSection: e.target.value })
                }
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg"
              />
              <input
                type="number"
                step="0.1"
                placeholder="Базовый уровень (м)"
                value={newPost.currentWaterLevelM}
                onChange={(e) =>
                  setNewPost({
                    ...newPost,
                    currentWaterLevelM: Number(e.target.value),
                  })
                }
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono"
              />
              <input
                type="number"
                step="0.1"
                placeholder="Порог ОЯ (м)"
                value={newPost.dangerousLevelM}
                onChange={(e) =>
                  setNewPost({
                    ...newPost,
                    dangerousLevelM: Number(e.target.value),
                  })
                }
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 cursor-pointer"
              >
                Создать гидропост
              </button>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="text-left px-4 py-2.5 font-semibold">Пост</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Нуль поста</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Базовый ур.</th>
                  <th className="text-right px-4 py-2.5 font-semibold">НЯ</th>
                  <th className="text-right px-4 py-2.5 font-semibold">ОЯ</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Крит.</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                {state.posts.map((post) => {
                  const isEditing = editingPostId === post.id;
                  return (
                    <tr key={post.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-sans">
                        <div className="font-semibold text-slate-900">
                          <span className="font-mono mr-1.5">{post.code}</span>
                          {post.name}
                        </div>
                        <div className="text-[11px] text-slate-500">{post.riverSection}</div>
                      </td>
                      <td className="px-4 py-2.5 text-right">{post.zeroElevationM.toFixed(1)} м</td>
                      <td className="px-4 py-2.5 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.1"
                            value={postDraft.currentWaterLevelM ?? post.currentWaterLevelM}
                            onChange={(e) =>
                              setPostDraft({
                                ...postDraft,
                                currentWaterLevelM: Number(e.target.value),
                              })
                            }
                            className="w-20 px-2 py-1 border border-sky-400 rounded text-right"
                          />
                        ) : (
                          `${post.currentWaterLevelM.toFixed(2)} м`
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.1"
                            value={postDraft.adverseLevelM ?? post.adverseLevelM}
                            onChange={(e) =>
                              setPostDraft({
                                ...postDraft,
                                adverseLevelM: Number(e.target.value),
                              })
                            }
                            className="w-20 px-2 py-1 border border-sky-400 rounded text-right"
                          />
                        ) : (
                          `${post.adverseLevelM.toFixed(2)} м`
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.1"
                            value={postDraft.dangerousLevelM ?? post.dangerousLevelM}
                            onChange={(e) =>
                              setPostDraft({
                                ...postDraft,
                                dangerousLevelM: Number(e.target.value),
                              })
                            }
                            className="w-20 px-2 py-1 border border-sky-400 rounded text-right"
                          />
                        ) : (
                          `${post.dangerousLevelM.toFixed(2)} м`
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {post.criticalLevelM.toFixed(2)} м
                      </td>
                      <td className="px-4 py-2.5 text-right font-sans">
                        {permissions.canEditPosts ? (
                          isEditing ? (
                            <div className="inline-flex gap-1">
                              <button
                                type="button"
                                onClick={() => handleSavePost(post.id)}
                                className="px-2 py-1 bg-sky-600 text-white rounded text-[11px] cursor-pointer"
                              >
                                Сохранить
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingPostId(null)}
                                className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-[11px] cursor-pointer"
                              >
                                Отмена
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPostId(post.id);
                                setPostDraft(post);
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-[11px] cursor-pointer"
                            >
                              Изменить
                            </button>
                          )
                        ) : (
                          <span className="text-slate-400">Только чтение</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Вкладка 4: Настройка правил сценарного анализа и категорий риска */}
      {activeTab === 'rules' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Правила сценарного анализа и классификации категорий риска
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Изменение параметров мгновенно обновляет расчёты статусов и категорий риска по всем 48+ объектам.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <div className="font-semibold text-slate-900">
                Гидравлические параметры расчёта
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-slate-700">Буферная зона угрозы (м до перелива)</label>
                  <span className="font-mono font-semibold">{state.rules.threatBufferM.toFixed(2)} м</span>
                </div>
                <input
                  type="range"
                  disabled={!permissions.canEditRules}
                  min={0.1}
                  max={1.5}
                  step={0.05}
                  value={state.rules.threatBufferM}
                  onChange={(e) =>
                    onUpdateRules({
                      ...state.rules,
                      threatBufferM: Number(e.target.value),
                    })
                  }
                  className="w-full accent-sky-600"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-slate-700">Эффективность временных дамб (%)</label>
                  <span className="font-mono font-semibold">
                    {Math.round(state.rules.leveeEfficiency * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  disabled={!permissions.canEditRules}
                  min={0.5}
                  max={1.0}
                  step={0.05}
                  value={state.rules.leveeEfficiency}
                  onChange={(e) =>
                    onUpdateRules({
                      ...state.rules,
                      leveeEfficiency: Number(e.target.value),
                    })
                  }
                  className="w-full accent-emerald-600"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-slate-700">Коэффициент гидравлического уклона</label>
                  <span className="font-mono font-semibold">
                    {state.rules.hydraulicSlopeFactor.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  disabled={!permissions.canEditRules}
                  min={0}
                  max={0.25}
                  step={0.01}
                  value={state.rules.hydraulicSlopeFactor}
                  onChange={(e) =>
                    onUpdateRules({
                      ...state.rules,
                      hydraulicSlopeFactor: Number(e.target.value),
                    })
                  }
                  className="w-full accent-slate-700"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <div className="font-semibold text-slate-900">
                Пороги категорий риска
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-slate-700">Порог категории «Критический» (глубина ≥)</label>
                  <span className="font-mono font-semibold text-red-700">
                    {state.rules.riskThresholds.criticalDepthM.toFixed(2)} м
                  </span>
                </div>
                <input
                  type="range"
                  disabled={!permissions.canEditRules}
                  min={0.4}
                  max={2.0}
                  step={0.05}
                  value={state.rules.riskThresholds.criticalDepthM}
                  onChange={(e) =>
                    onUpdateRules({
                      ...state.rules,
                      riskThresholds: {
                        ...state.rules.riskThresholds,
                        criticalDepthM: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full accent-red-600"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-slate-700">Порог категории «Высокий» (глубина ≥)</label>
                  <span className="font-mono font-semibold text-amber-700">
                    {state.rules.riskThresholds.highDepthM.toFixed(2)} м
                  </span>
                </div>
                <input
                  type="range"
                  disabled={!permissions.canEditRules}
                  min={0.05}
                  max={1.0}
                  step={0.05}
                  value={state.rules.riskThresholds.highDepthM}
                  onChange={(e) =>
                    onUpdateRules({
                      ...state.rules,
                      riskThresholds: {
                        ...state.rules.riskThresholds,
                        highDepthM: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full accent-amber-600"
                />
              </div>

              <label className="flex items-center gap-2 pt-2 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!permissions.canEditRules}
                  checked={state.rules.riskThresholds.criticalTypesPriority}
                  onChange={(e) =>
                    onUpdateRules({
                      ...state.rules,
                      riskThresholds: {
                        ...state.rules.riskThresholds,
                        criticalTypesPriority: e.target.checked,
                      },
                    })
                  }
                  className="rounded border-slate-300 text-sky-600"
                />
                <span className="text-slate-700">
                  Повышать категорию риска на 1 ступень для социальных объектов и инфраструктуры энергетики/водоснабжения
                </span>
              </label>

              {!permissions.canEditRules && (
                <p className="text-[11px] text-amber-700 pt-1">
                  Редактирование правил доступно только роли «Администратор».
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Вкладка 5: Управление сценариями, экспорт и сброс демо */}
      {activeTab === 'scenarios_objects' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Сохранённые сценарии ({state.scenarios.length})
            </h3>
            <div className="divide-y divide-slate-100 text-xs">
              {state.scenarios.map((sc: ScenarioConfig) => (
                <div key={sc.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">{sc.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      ΔH: {sc.waterDeltaM >= 0 ? '+' : ''}{sc.waterDeltaM.toFixed(1)}м · Дамба: +{sc.leveeMitigationM.toFixed(1)}м
                    </div>
                  </div>
                  {!sc.isPreset && permissions.canDeleteScenario ? (
                    <button
                      type="button"
                      onClick={() => onDeleteScenario(sc.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                      title="Удалить сценарий"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400">
                      {sc.isPreset ? 'Эталонный' : 'Только админ'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Экспорт отчётов и управление локальным хранилищем
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onExportCsv}
                className="px-3.5 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Экспорт таблицы CSV</span>
              </button>
              <button
                type="button"
                onClick={onExportHtml}
                className="px-3.5 py-2 text-xs font-medium bg-sky-600 text-white rounded-lg hover:bg-sky-700 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Скачать HTML-отчёт</span>
              </button>
              <button
                type="button"
                onClick={onExportJson}
                className="px-3.5 py-2 text-xs font-medium bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Резервная копия JSON</span>
              </button>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <div className="text-xs font-semibold text-slate-800 mb-1">
                Сброс к исходному демо-сценарию Hackathon 2026
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Восстанавливает исходные 48 объектов, 6 постов, 4 сценария и 6 событий в локальном хранилище.
              </p>
              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="px-3.5 py-2 text-xs font-medium bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Сбросить демо-данные</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onResetDemo();
                      setConfirmReset(false);
                    }}
                    className="px-3.5 py-2 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 cursor-pointer"
                  >
                    Подтвердить полный сброс
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="px-3.5 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-700 cursor-pointer"
                  >
                    Отмена
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Вкладка 6: История изменений (Audit Log) */}
      {activeTab === 'history' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">
              Журнал аудита и истории изменений
            </h3>
          </div>
          <div className="overflow-x-auto max-h-[420px]">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold">Время</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Роль / Пользователь</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Объект / Раздел</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Изменение</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.auditLog.map((entry: AuditEntry) => (
                  <tr key={entry.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-mono text-slate-500 whitespace-nowrap">
                      {entry.timestamp}
                    </td>
                    <td className="px-4 py-2.5 text-slate-800 whitespace-nowrap">
                      {entry.actorName}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-900">
                      {entry.targetType}: {entry.targetName}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{entry.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
