import React, { useEffect, useMemo, useState } from 'react';
import {
  Bot,
  Calculator,
  Database,
  Download,
  FileWarning,
  GitCompare,
  Map,
  Menu,
  Presentation,
  Shield,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import {
  createInitialDemoState,
  ROLE_PERMISSIONS,
} from './data/demoScenario';
import {
  AnalysisRules,
  AppSection,
  AppState,
  AuditEntry,
  FloodEvent,
  HydroPost,
  ScenarioConfig,
  UserRole,
  VulnerableObject,
} from './types/hydro';
import { auditDataQuality, evaluateScenario } from './utils/hydroEngine';
import {
  exportFullJsonBackup,
  exportHtmlReport,
  exportScenarioCsv,
} from './utils/exportUtils';
import { AiTaskType } from './utils/aiEngine';
import { OverviewDashboard } from './components/OverviewDashboard';
import { ScenarioCalculatorView } from './components/ScenarioCalculatorView';
import { ScenarioComparisonView } from './components/ScenarioComparisonView';
import { ObjectsRegistryView } from './components/ObjectsRegistryView';
import { EventJournalView } from './components/EventJournalView';
import { AdminPanelView } from './components/AdminPanelView';
import { AiAssistantDrawer } from './components/AiAssistantDrawer';
import { DemoTourModal } from './components/DemoTourModal';

const STORAGE_KEY = 'hydroshield_platform_state_v1';

function loadInitialState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialDemoState();
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed || !Array.isArray(parsed.objects) || !Array.isArray(parsed.posts)) {
      return createInitialDemoState();
    }
    return parsed;
  } catch {
    return createInitialDemoState();
  }
}

function nowStamp(): string {
  const d = new Date();
  return `${d.toISOString().slice(0, 10)} ${d.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

export default function App() {
  const [state, setState] = useState<AppState>(() => loadInitialState());
  const [section, setSection] = useState<AppSection>('overview');
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [editingObjectIdExternal, setEditingObjectIdExternal] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [aiSignal, setAiSignal] = useState<{ task: AiTaskType; nonce: number } | null>(null);
  const [aiConfiguredOnServer, setAiConfiguredOnServer] = useState(false);
  const [browserOnline, setBrowserOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [tourOpen, setTourOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Автосохранение в localStorage при каждом изменении
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Если квота localStorage заполнена (например, из-за крупных фото), информируем пользователя
      setToast('Внимание: локальное хранилище переполнено. Удалите старые фото или экспортируйте резервную копию.');
    }
  }, [state]);

  // Отслеживание онлайн/офлайн состояния и доступности AI API
  useEffect(() => {
    const onOnline = () => setBrowserOnline(true);
    const onOffline = () => setBrowserOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setAiConfiguredOnServer(Boolean(d?.aiConfigured)))
      .catch(() => setAiConfiguredOnServer(false));

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => {
      setToast((curr) => (curr === msg ? null : curr));
    }, 3500);
  };

  const permissions = ROLE_PERMISSIONS[state.role];

  const appendAudit = (
    prev: AppState,
    action: AuditEntry['action'],
    targetType: string,
    targetName: string,
    details: string,
  ): AuditEntry[] => {
    const entry: AuditEntry = {
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: nowStamp(),
      actorRole: prev.role,
      actorName: ROLE_PERMISSIONS[prev.role].label,
      action,
      targetType,
      targetName,
      details,
    };
    return [entry, ...prev.auditLog].slice(0, 100);
  };

  const updateState = (updater: (prev: AppState) => AppState) => {
    setState((prev) => ({
      ...updater(prev),
      lastSavedAt: new Date().toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    }));
  };

  const allScenarios = useMemo(
    () => [...state.scenarios, state.customScenario],
    [state.scenarios, state.customScenario],
  );

  const activeScenario = useMemo(
    () =>
      allScenarios.find((s) => s.id === state.activeScenarioId) ??
      state.scenarios[0],
    [allScenarios, state.activeScenarioId, state.scenarios],
  );

  const activeSummary = useMemo(
    () => evaluateScenario(state.objects, state.posts, activeScenario, state.rules),
    [state.objects, state.posts, activeScenario, state.rules],
  );

  const compareSummaries = useMemo(() => {
    const s0 =
      allScenarios.find((s) => s.id === state.compareScenarioIds[0]) ??
      allScenarios[0];
    const s1 =
      allScenarios.find((s) => s.id === state.compareScenarioIds[1]) ??
      allScenarios[1] ??
      allScenarios[0];
    const s2 =
      allScenarios.find((s) => s.id === state.compareScenarioIds[2]) ??
      allScenarios[2] ??
      allScenarios[0];
    return [
      evaluateScenario(state.objects, state.posts, s0, state.rules),
      evaluateScenario(state.objects, state.posts, s1, state.rules),
      evaluateScenario(state.objects, state.posts, s2, state.rules),
    ] as [
      ReturnType<typeof evaluateScenario>,
      ReturnType<typeof evaluateScenario>,
      ReturnType<typeof evaluateScenario>,
    ];
  }, [allScenarios, state.compareScenarioIds, state.objects, state.posts, state.rules]);

  const dataIssues = useMemo(
    () => auditDataQuality(state.objects, state.posts),
    [state.objects, state.posts],
  );

  const selectedAssessment = useMemo(
    () =>
      activeSummary.assessments.find((a) => a.object.id === selectedObjectId) ??
      null,
    [activeSummary.assessments, selectedObjectId],
  );

  // Обработчики доменных действий
  const handleSelectScenario = (id: string) => {
    updateState((prev) => ({ ...prev, activeScenarioId: id }));
  };

  const handleQuickWaterDelta = (deltaM: number) => {
    updateState((prev) => ({
      ...prev,
      activeScenarioId: 'sc-custom',
      customScenario: {
        ...prev.customScenario,
        waterDeltaM: deltaM,
      },
    }));
  };

  const handleUpdateCustomScenario = (
    updater: (prev: ScenarioConfig) => ScenarioConfig,
  ) => {
    updateState((prev) => ({
      ...prev,
      activeScenarioId: 'sc-custom',
      customScenario: updater(prev.customScenario),
    }));
  };

  const handleSaveNewScenario = (name: string, description: string) => {
    const newId = `sc-user-${Date.now()}`;
    updateState((prev) => {
      const source =
        prev.activeScenarioId === 'sc-custom'
          ? prev.customScenario
          : prev.scenarios.find((s) => s.id === prev.activeScenarioId) ??
            prev.customScenario;
      const saved: ScenarioConfig = {
        ...source,
        id: newId,
        name,
        description,
        isPreset: false,
        createdAt: new Date().toISOString().slice(0, 10),
        postOverrides: { ...source.postOverrides },
      };
      return {
        ...prev,
        activeScenarioId: newId,
        scenarios: [...prev.scenarios, saved],
        auditLog: appendAudit(
          prev,
          'save_scenario',
          'Сценарий',
          name,
          `Сохранён сценарий (ΔH ${saved.waterDeltaM >= 0 ? '+' : ''}${saved.waterDeltaM.toFixed(1)} м, дамба +${saved.leveeMitigationM.toFixed(1)} м).`,
        ),
      };
    });
    showToast(`Сценарий «${name}» сохранён.`);
  };

  const handleDeleteScenario = (id: string) => {
    updateState((prev) => {
      const target = prev.scenarios.find((s) => s.id === id);
      const nextScenarios = prev.scenarios.filter((s) => s.id !== id);
      return {
        ...prev,
        scenarios: nextScenarios,
        activeScenarioId:
          prev.activeScenarioId === id
            ? nextScenarios[0]?.id ?? 'sc-custom'
            : prev.activeScenarioId,
        compareScenarioIds: prev.compareScenarioIds.map((cid) =>
          cid === id ? nextScenarios[0]?.id ?? 'sc-custom' : cid,
        ) as [string, string, string],
        auditLog: appendAudit(
          prev,
          'delete_scenario',
          'Сценарий',
          target?.name ?? id,
          'Удалён пользовательский сценарий.',
        ),
      };
    });
    showToast('Сценарий удалён.');
  };

  const handleAddObject = (
    input: Omit<VulnerableObject, 'id' | 'updatedAt' | 'updatedBy'>,
  ) => {
    const newObj: VulnerableObject = {
      ...input,
      id: `obj-${Date.now()}`,
      updatedAt: new Date().toISOString().slice(0, 10),
      updatedBy: ROLE_PERMISSIONS[state.role].label,
    };
    updateState((prev) => ({
      ...prev,
      objects: [newObj, ...prev.objects],
      auditLog: appendAudit(
        prev,
        'create_object',
        'Объект',
        `${newObj.code} ${newObj.name}`,
        `Добавлен новый объект (${newObj.settlement}, отметка ${newObj.elevationM} м).`,
      ),
    }));
    showToast(`Объект ${newObj.code} добавлен и учтён в расчётах.`);
  };

  const handleUpdateObject = (id: string, patch: Partial<VulnerableObject>) => {
    updateState((prev) => {
      const existing = prev.objects.find((o) => o.id === id);
      return {
        ...prev,
        objects: prev.objects.map((o) =>
          o.id === id
            ? {
                ...o,
                ...patch,
                updatedAt: new Date().toISOString().slice(0, 10),
                updatedBy: ROLE_PERMISSIONS[prev.role].label,
              }
            : o,
        ),
        auditLog: appendAudit(
          prev,
          'update_object',
          'Объект',
          `${patch.code ?? existing?.code ?? ''} ${patch.name ?? existing?.name ?? id}`,
          'Обновлены параметры карточки объекта.',
        ),
      };
    });
    showToast('Изменения по объекту сохранены.');
  };

  const handleDeleteObject = (id: string) => {
    updateState((prev) => {
      const existing = prev.objects.find((o) => o.id === id);
      return {
        ...prev,
        objects: prev.objects.filter((o) => o.id !== id),
        auditLog: appendAudit(
          prev,
          'delete_object',
          'Объект',
          `${existing?.code ?? ''} ${existing?.name ?? id}`,
          'Объект удалён из реестра.',
        ),
      };
    });
    if (selectedObjectId === id) setSelectedObjectId(null);
    showToast('Объект удалён из базы.');
  };

  const handleAddEvent = (
    evt: Omit<FloodEvent, 'id' | 'status' | 'createdAt' | 'createdBy'>,
  ) => {
    const newEvt: FloodEvent = {
      ...evt,
      id: `evt-${Date.now()}`,
      status: 'pending',
      createdAt: nowStamp(),
      createdBy: ROLE_PERMISSIONS[state.role].label,
    };
    updateState((prev) => ({
      ...prev,
      events: [newEvt, ...prev.events],
      auditLog: appendAudit(
        prev,
        'register_event',
        'Событие',
        newEvt.title,
        `Зарегистрировано событие (${newEvt.lat.toFixed(4)}, ${newEvt.lng.toFixed(4)}).`,
      ),
    }));
    showToast('Событие зарегистрировано в журнале.');
  };

  const handleReviewEvent = (
    eventId: string,
    status: 'confirmed' | 'rejected',
    comment: string,
  ) => {
    updateState((prev) => {
      const target = prev.events.find((e) => e.id === eventId);
      return {
        ...prev,
        events: prev.events.map((e) =>
          e.id === eventId
            ? {
                ...e,
                status,
                reviewedBy: ROLE_PERMISSIONS[prev.role].label,
                reviewedAt: nowStamp(),
                reviewComment: comment,
              }
            : e,
        ),
        auditLog: appendAudit(
          prev,
          'review_event',
          'Событие',
          target?.title ?? eventId,
          `Статус изменён на «${status === 'confirmed' ? 'Подтверждено' : 'Отклонено'}».`,
        ),
      };
    });
    showToast(
      status === 'confirmed' ? 'Событие/нарушение подтверждено.' : 'Заявка отклонена.',
    );
  };

  const handleUpdatePost = (id: string, patch: Partial<HydroPost>) => {
    updateState((prev) => {
      const target = prev.posts.find((p) => p.id === id);
      return {
        ...prev,
        posts: prev.posts.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        auditLog: appendAudit(
          prev,
          'update_post',
          'Гидропост',
          `${target?.code ?? ''} ${target?.name ?? id}`,
          'Обновлены отметки или пороги гидрологического поста.',
        ),
      };
    });
    showToast('Параметры гидропоста обновлены.');
  };

  const handleAddPost = (postInput: Omit<HydroPost, 'id' | 'lastUpdated'>) => {
    const newPost: HydroPost = {
      ...postInput,
      id: `post-${Date.now()}`,
      lastUpdated: nowStamp(),
    };
    updateState((prev) => ({
      ...prev,
      posts: [...prev.posts, newPost],
      auditLog: appendAudit(
        prev,
        'update_post',
        'Гидропост',
        `${newPost.code} ${newPost.name}`,
        'Добавлен новый гидрологический пост.',
      ),
    }));
    showToast(`Гидропост ${newPost.code} добавлен.`);
  };

  const handleUpdateRules = (rules: AnalysisRules) => {
    updateState((prev) => ({
      ...prev,
      rules,
      auditLog: appendAudit(
        prev,
        'update_rules',
        'Правила анализа',
        'Пороги и коэффициенты',
        `Буфер угрозы ${rules.threatBufferM} м, крит. глубина ${rules.riskThresholds.criticalDepthM} м.`,
      ),
    }));
  };

  const handleChangeRole = (role: UserRole) => {
    updateState((prev) => ({
      ...prev,
      role,
      auditLog: appendAudit(
        prev,
        'switch_role',
        'Доступ',
        ROLE_PERMISSIONS[role].label,
        `Демонстрационное переключение роли на «${ROLE_PERMISSIONS[role].label}».`,
      ),
    }));
    showToast(`Активная роль: ${ROLE_PERMISSIONS[role].label}`);
  };

  const handleResetDemo = () => {
    const fresh = createInitialDemoState();
    setState(fresh);
    setSelectedObjectId(null);
    showToast('Демонстрационная база Hackathon 2026 восстановлена.');
  };

  const openAiWithTask = (task: AiTaskType, objectId?: string) => {
    if (objectId) setSelectedObjectId(objectId);
    setAiDrawerOpen(true);
    setAiSignal({ task, nonce: Date.now() });
  };

  const effectiveOffline = state.offlineMode || !browserOnline;

  const navItems: Array<{
    id: AppSection;
    label: string;
    Icon: typeof Map;
    badge?: number;
  }> = [
    { id: 'overview', label: 'Обзор и карта', Icon: Map },
    { id: 'calculator', label: 'Калькулятор', Icon: Calculator },
    { id: 'comparison', label: 'Сравнение 3', Icon: GitCompare },
    { id: 'objects', label: 'Объекты', Icon: Database, badge: state.objects.length },
    {
      id: 'events',
      label: 'Журнал событий',
      Icon: FileWarning,
      badge: state.events.filter((e) => e.status === 'pending').length || undefined,
    },
    { id: 'admin', label: 'Админ-панель', Icon: Shield },
  ];

  const sectionTitle =
    navItems.find((i) => i.id === section)?.label ?? 'Обзор и карта';

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 text-slate-900">
      {/* Боковая панель (Desktop) */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-slate-900 text-slate-100 border-r border-slate-800 no-print">
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="text-base font-bold tracking-tight text-white">
            ГидроЩит
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Сценарный анализ паводков
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ id, label, Icon, badge }) => {
            const active = section === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSection(id)}
                className={`w-full px-3 py-2.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                  active
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="inline-flex items-center gap-2.5 whitespace-nowrap">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{label}</span>
                </span>
                {badge !== undefined && (
                  <span
                    className={`font-mono text-[11px] tabular-nums ${
                      active ? 'text-sky-100' : 'text-slate-400'
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Инструменты стенда Hackathon 2026 и локального режима */}
        <div className="p-4 border-t border-slate-800 space-y-3 text-xs">
          <button
            type="button"
            onClick={() => setTourOpen(true)}
            className="w-full px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg font-medium inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <Presentation className="w-3.5 h-3.5 text-sky-400" />
            <span>Демо-тур Hackathon 2026</span>
          </button>

          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Автономный режим</span>
              <button
                type="button"
                onClick={() =>
                  updateState((prev) => ({
                    ...prev,
                    offlineMode: !prev.offlineMode,
                  }))
                }
                className={`px-2 py-0.5 rounded font-medium cursor-pointer ${
                  effectiveOffline
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-emerald-500/20 text-emerald-300'
                }`}
              >
                {effectiveOffline ? 'Офлайн' : 'Онлайн'}
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Роль:</span>
              <select
                value={state.role}
                onChange={(e) => handleChangeRole(e.target.value as UserRole)}
                className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1 text-[11px]"
                aria-label="Роль пользователя"
              >
                <option value="admin">Администратор</option>
                <option value="specialist">Специалист</option>
                <option value="observer">Наблюдатель</option>
              </select>
            </div>

            <div className="text-[10px] text-slate-500 font-mono">
              Сохранено локально: {state.lastSavedAt}
            </div>
          </div>
        </div>
      </aside>

      {/* Мобильное выдвижное меню */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden bg-slate-900/60 flex">
          <div className="w-72 bg-slate-900 text-slate-100 flex flex-col h-full p-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <span className="text-base font-bold text-white">ГидроЩит</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 py-4 space-y-1">
              {navItems.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setSection(id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-3 ${
                    section === id
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
            <div className="pt-3 border-t border-slate-800 space-y-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setTourOpen(true);
                }}
                className="w-full px-3 py-2 bg-slate-800 text-white rounded-lg font-medium inline-flex items-center justify-center gap-2"
              >
                <Presentation className="w-4 h-4 text-sky-400" />
                <span>Демо-тур Hackathon 2026</span>
              </button>
              <div className="flex items-center justify-between text-slate-400">
                <span>Роль:</span>
                <select
                  value={state.role}
                  onChange={(e) => handleChangeRole(e.target.value as UserRole)}
                  className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs"
                >
                  <option value="admin">Администратор</option>
                  <option value="specialist">Специалист</option>
                  <option value="observer">Наблюдатель</option>
                </select>
              </div>
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* Основная рабочая область */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Верхняя панель (Top Bar Contract: Заголовок/хлебные крошки — Действие) */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-700 hover:bg-slate-100 rounded-lg"
              aria-label="Открыть меню"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                {sectionTitle}
              </h1>
              <div className="text-[11px] text-slate-500 truncate hidden sm:block">
                Притобольский демонстрационный участок · {activeSummary.scenario.name} ·{' '}
                <span className="inline-flex items-center gap-1">
                  {effectiveOffline ? (
                    <>
                      <WifiOff className="w-3 h-3 text-amber-600" /> Локальный режим
                    </>
                  ) : (
                    <>
                      <Wifi className="w-3 h-3 text-emerald-600" /> Синхронизация с локальной БД
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {permissions.canExportReports && (
              <button
                type="button"
                onClick={() => {
                  exportHtmlReport(activeSummary, compareSummaries, state.events);
                  showToast('HTML-отчёт сформирован и загружен.');
                }}
                className="hidden sm:inline-flex px-3 py-2 text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Отчёт</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setAiDrawerOpen(true)}
              className="px-3.5 py-2 text-xs font-medium bg-sky-600 text-white hover:bg-sky-700 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>AI-Ассистент</span>
            </button>
          </div>
        </header>

        {/* Контент активного раздела */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto">
          {section === 'overview' && (
            <OverviewDashboard
              summary={activeSummary}
              scenarios={allScenarios}
              activeScenarioId={state.activeScenarioId}
              posts={state.posts}
              events={state.events}
              selectedObjectId={selectedObjectId}
              onSelectObject={setSelectedObjectId}
              onEditObject={(id) => {
                setEditingObjectIdExternal(id);
                setSection('objects');
              }}
              onAskAiForObject={(id) => openAiWithTask('explain_object_risk', id)}
              onSelectScenario={handleSelectScenario}
              onQuickWaterDeltaChange={handleQuickWaterDelta}
              onOpenCalculator={() => setSection('calculator')}
              onOpenEvents={() => setSection('events')}
              onAskAiExplainScenario={() => openAiWithTask('explain_scenario')}
              pickCoordinateMode={false}
              onPickCoordinate={() => {}}
              onCancelPickCoordinate={() => {}}
            />
          )}

          {section === 'calculator' && (
            <ScenarioCalculatorView
              summary={activeSummary}
              scenarios={state.scenarios}
              activeScenarioId={state.activeScenarioId}
              customScenario={state.customScenario}
              posts={state.posts}
              rules={state.rules}
              permissions={permissions}
              onSelectScenario={handleSelectScenario}
              onUpdateCustomScenario={handleUpdateCustomScenario}
              onSaveNewScenario={handleSaveNewScenario}
              onSelectObjectOnMap={(id) => {
                setSelectedObjectId(id);
                setSection('overview');
              }}
              onAskAiExplainScenario={() => openAiWithTask('explain_scenario')}
            />
          )}

          {section === 'comparison' && (
            <ScenarioComparisonView
              allScenarios={allScenarios}
              compareIds={state.compareScenarioIds}
              compareSummaries={compareSummaries}
              onChangeCompareSlot={(slotIdx, scenarioId) => {
                updateState((prev) => {
                  const next = [...prev.compareScenarioIds] as [string, string, string];
                  next[slotIdx] = scenarioId;
                  return { ...prev, compareScenarioIds: next };
                });
              }}
              onActivateScenario={(id) => {
                handleSelectScenario(id);
                setSection('overview');
              }}
            />
          )}

          {section === 'objects' && (
            <ObjectsRegistryView
              summary={activeSummary}
              posts={state.posts}
              events={state.events}
              permissions={permissions}
              onAddObject={handleAddObject}
              onUpdateObject={handleUpdateObject}
              onDeleteObject={handleDeleteObject}
              onLocateOnMap={(id) => {
                setSelectedObjectId(id);
                setSection('overview');
              }}
              onAskAiForObject={(id) => openAiWithTask('explain_object_risk', id)}
              onExportCsv={() => {
                exportScenarioCsv(activeSummary);
                showToast('Таблица объектов экспортирована в CSV.');
              }}
              editingObjectIdExternal={editingObjectIdExternal}
              onClearExternalEdit={() => setEditingObjectIdExternal(null)}
            />
          )}

          {section === 'events' && (
            <EventJournalView
              summary={activeSummary}
              events={state.events}
              posts={state.posts}
              objects={state.objects}
              permissions={permissions}
              onAddEvent={handleAddEvent}
              onReviewEvent={handleReviewEvent}
            />
          )}

          {section === 'admin' && (
            <AdminPanelView
              state={state}
              permissions={permissions}
              dataIssues={dataIssues}
              onChangeRole={handleChangeRole}
              onUpdatePost={handleUpdatePost}
              onAddPost={handleAddPost}
              onUpdateRules={handleUpdateRules}
              onReviewEvent={handleReviewEvent}
              onDeleteScenario={handleDeleteScenario}
              onEditObject={(id) => {
                setEditingObjectIdExternal(id);
                setSection('objects');
              }}
              onExportCsv={() => {
                exportScenarioCsv(activeSummary);
                showToast('CSV-таблица выгружена.');
              }}
              onExportJson={() => {
                exportFullJsonBackup(state);
                showToast('Резервная копия JSON сохранена.');
              }}
              onExportHtml={() => {
                exportHtmlReport(activeSummary, compareSummaries, state.events);
                showToast('HTML-отчёт сформирован.');
              }}
              onResetDemo={handleResetDemo}
            />
          )}
        </main>
      </div>

      {/* Выдвижная панель AI-ассистента */}
      <AiAssistantDrawer
        isOpen={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
        offlineMode={effectiveOffline}
        aiConfiguredOnServer={aiConfiguredOnServer}
        summary={activeSummary}
        posts={state.posts}
        objects={state.objects}
        rules={state.rules}
        selectedAssessment={selectedAssessment}
        pendingTaskSignal={aiSignal}
      />

      {/* Модалка пошагового демо-сценария Hackathon 2026 */}
      <DemoTourModal
        isOpen={tourOpen}
        onClose={() => setTourOpen(false)}
        onNavigate={(sec) => setSection(sec)}
        onSelectScenario={handleSelectScenario}
        onOpenAiAudit={() => openAiWithTask('audit_data')}
      />

      {/* Всплывающее уведомление о действии */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 bg-slate-900 text-white text-xs font-medium px-4 py-2.5 rounded-lg shadow-lg max-w-sm">
          {toast}
        </div>
      )}
    </div>
  );
}
