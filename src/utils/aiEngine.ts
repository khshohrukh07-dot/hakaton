import { OBJECT_TYPE_LABELS, RISK_LEVEL_LABELS } from '../data/demoScenario';
import {
  AnalysisRules,
  DataQualityIssue,
  HydroPost,
  ObjectAssessment,
  ObjectType,
  ScenarioSummary,
  VulnerableObject,
} from '../types/hydro';
import { auditDataQuality } from './hydroEngine';

export type AiTaskType =
  | 'explain_scenario'
  | 'audit_data'
  | 'explain_object_risk'
  | 'suggest_card'
  | 'generate_report'
  | 'custom_question';

export interface AiAssistResponse {
  reply: string;
  source: 'gemini' | 'local-rules';
  model?: string;
}

export function suggestObjectCardDefaults(
  type: ObjectType,
  post: HydroPost | undefined,
): Partial<VulnerableObject> {
  const baseElev = post ? post.zeroElevationM + 4.3 : 96.5;
  switch (type) {
    case 'residential':
      return {
        elevationM: Number((baseElev - 0.2).toFixed(1)),
        areaSqM: 24000,
        households: 30,
        residents: 95,
        protectionHeightM: 0.2,
        condition: 'satisfactory',
      };
    case 'social':
      return {
        elevationM: Number((baseElev + 1.0).toFixed(1)),
        areaSqM: 6500,
        households: 0,
        residents: 140,
        protectionHeightM: 0.4,
        condition: 'good',
      };
    case 'infrastructure':
      return {
        elevationM: Number((baseElev + 0.1).toFixed(1)),
        areaSqM: 4200,
        households: 0,
        residents: 10,
        protectionHeightM: 0.45,
        condition: 'satisfactory',
      };
    case 'industrial':
      return {
        elevationM: Number((baseElev - 0.4).toFixed(1)),
        areaSqM: 18500,
        households: 0,
        residents: 18,
        protectionHeightM: 0.15,
        condition: 'satisfactory',
      };
    case 'hydrotechnical':
      return {
        elevationM: Number((baseElev + 0.3).toFixed(1)),
        areaSqM: 3500,
        households: 0,
        residents: 2,
        protectionHeightM: 0.85,
        condition: 'good',
      };
  }
}

export function runLocalRuleBasedAi(params: {
  task: AiTaskType;
  prompt: string;
  summary: ScenarioSummary;
  posts: HydroPost[];
  objects: VulnerableObject[];
  rules: AnalysisRules;
  selectedAssessment?: ObjectAssessment | null;
}): string {
  const { task, prompt, summary, posts, objects, rules, selectedAssessment } =
    params;

  const disclaimer =
    'Примечание: оценка сформирована локальным детерминированным модулем правил по введённым отметкам и не является официальным метеопрогнозом.';

  if (task === 'audit_data') {
    const issues: DataQualityIssue[] = auditDataQuality(objects, posts);
    const avgCompleteness = Math.round(
      summary.assessments.reduce((acc, a) => acc + a.completenessScore, 0) /
        Math.max(1, summary.assessments.length),
    );
    if (issues.length === 0) {
      return `Проверка полноты и целостности (${objects.length} объектов): критических несоответствий не обнаружено. Средняя полнота карточек составляет ${avgCompleteness}%.\n\n${disclaimer}`;
    }
    const lines = issues.slice(0, 8).map(
      (iss, idx) =>
        `${idx + 1}. [${iss.severity === 'error' ? 'Ошибка' : 'Предупреждение'}] ${iss.objectCode} «${iss.objectName}»: ${iss.message} Рекомендация: ${iss.suggestion}`,
    );
    return [
      `Проверка базы данных (${objects.length} объектов, средняя полнота ${avgCompleteness}%): выявлено замечаний — ${issues.length}.`,
      '',
      ...lines,
      '',
      disclaimer,
    ].join('\n');
  }

  if (task === 'explain_object_risk') {
    if (!selectedAssessment) {
      return `Выберите конкретный объект на карте или в реестре, чтобы получить разбор его категории риска.\n\n${disclaimer}`;
    }
    const a = selectedAssessment;
    return [
      `Разбор риска для ${a.object.code} «${a.object.name}» (${OBJECT_TYPE_LABELS[a.object.type]}):`,
      `• Итоговая категория риска: ${RISK_LEVEL_LABELS[a.riskLevel]}`,
      `• Расчётный уровень воды по посту ${a.post?.code ?? '—'}: ${a.effectiveWaterLevelM.toFixed(2)} м БСВ`,
      `• Эффективная отметка защиты объекта: ${a.effectiveProtectionElevationM.toFixed(2)} м БСВ (рельеф ${a.object.elevationM.toFixed(2)} м + локальная защита ${a.object.protectionHeightM.toFixed(2)} м${summary.scenario.leveeMitigationM > 0 ? ` + временная дамба` : ''})`,
      `• Запас / глубина: ${a.floodDepthM > 0 ? `затопление на ${a.floodDepthM.toFixed(2)} м` : `запас высоты ${Math.abs(a.floodDepthM).toFixed(2)} м`}`,
      '',
      'Обоснование по правилам:',
      ...a.riskReasons.map((r) => `- ${r}`),
      a.anomalies.length > 0
        ? `\nОбнаружены замечания по качеству данных:\n${a.anomalies.map((m) => `- ${m}`).join('\n')}`
        : '',
      '',
      disclaimer,
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (task === 'suggest_card') {
    const post = posts[0];
    const defaults = suggestObjectCardDefaults('residential', post);
    return [
      `Рекомендации по заполнению карточки объекта (на примере опорного поста ${post?.code ?? 'ГП-01'}):`,
      `• Жилой сектор: отметка ~${defaults.elevationM} м БСВ, типовая площадь квартала 20 000–35 000 м², 25–45 домохозяйств, защита цоколя 0.15–0.3 м.`,
      `• Социальный объект: отметка на 0.8–1.5 м выше поймы, домохозяйств = 0, жителей/персонала = вместимость здания.`,
      `• Инфраструктура / энергетика: обязательно укажите высоту бетонной стенки или обвалования (0.3–0.6 м).`,
      `• Проверка согласованности: отметка объекта всегда должна быть выше нуля поста (${post?.zeroElevationM ?? 91.5} м).`,
      '',
      disclaimer,
    ].join('\n');
  }

  if (task === 'generate_report') {
    const criticalList = summary.assessments
      .filter((a) => a.riskLevel === 'critical')
      .slice(0, 5)
      .map(
        (a) =>
          `- ${a.object.code} ${a.object.name} (${a.object.settlement}): глубина ${a.floodDepthM > 0 ? `+${a.floodDepthM.toFixed(2)} м` : `${a.floodDepthM.toFixed(2)} м`}`,
      );

    return [
      `КРАТКИЙ АНАЛИТИЧЕСКИЙ ОТЧЁТ (${summary.scenario.name})`,
      `1. Параметры сценария: изменение уровня ${summary.scenario.waterDeltaM >= 0 ? '+' : ''}${summary.scenario.waterDeltaM.toFixed(2)} м; временные дамбы +${summary.scenario.leveeMitigationM.toFixed(2)} м; расчистка русла -${summary.scenario.channelClearingBonusM.toFixed(2)} м.`,
      `2. Масштаб воздействия: затоплено объектов — ${summary.floodedObjects} из ${summary.totalObjects}, в буферной зоне угрозы (${rules.threatBufferM} м) — ${summary.threatenedObjects}.`,
      `3. Территория и население: площадь затопления — ${summary.floodedAreaHa.toFixed(2)} га (${summary.floodedAreaSqM.toLocaleString('ru-RU')} м²); затронуто при затоплении — ${summary.floodedHouseholds} домохозяйств (~${summary.floodedResidents} чел.), дополнительно под угрозой — ${summary.threatenedHouseholds} домохозяйств.`,
      `4. Критические объекты (топ-5):`,
      ...(criticalList.length > 0 ? criticalList : ['- Объекты с критическим риском отсутствуют.']),
      '',
      disclaimer,
    ].join('\n');
  }

  // explain_scenario или custom_question
  const floodedSocial = summary.assessments.filter(
    (a) => a.floodStatus === 'flooded' && a.object.type === 'social',
  ).length;
  const floodedInfra = summary.assessments.filter(
    (a) => a.floodStatus === 'flooded' && a.object.type === 'infrastructure',
  ).length;

  const extra =
    prompt.trim().length > 0 && task === 'custom_question'
      ? `Ответ по запросу «${prompt.trim()}» на основе активного сценария:\n`
      : '';

  return [
    `${extra}В сценарии «${summary.scenario.name}» при сдвиге уровня воды ${summary.scenario.waterDeltaM >= 0 ? '+' : ''}${summary.scenario.waterDeltaM.toFixed(2)} м (с учётом инженерных мер: дамба +${summary.scenario.leveeMitigationM.toFixed(2)} м, расчистка -${summary.scenario.channelClearingBonusM.toFixed(2)} м):`,
    `• В зону прямого затопления попадают ${summary.floodedObjects} объектов общей площадью ${summary.floodedAreaHa.toFixed(2)} га.`,
    `• Затрагивается ${summary.floodedHouseholds} домохозяйств (около ${summary.floodedResidents} человек). Ещё ${summary.threatenedObjects} объектов (${summary.threatenedHouseholds} домохозяйств) находятся в буферной зоне угрозы (${rules.threatBufferM} м до перелива).`,
    `• Из критически значимой инфраструктуры подтоплено: социальных объектов — ${floodedSocial}, инженерно-энергетических — ${floodedInfra}. Максимальная расчётная глубина составляет ${summary.maxDepthM.toFixed(2)} м.`,
    summary.floodedObjects > 0
      ? '• Рекомендуемое действие: смоделируйте в калькуляторе возведение временной дамбы (+0.8…1.2 м) или расчистку русла (-0.3 м), чтобы оценить снижение числа затопляемых домохозяйств.'
      : '• По текущей модели прямого перелива не зафиксировано; контролируйте буферную зону и состояние гидропостов.',
    '',
    disclaimer,
  ].join('\n');
}

export async function requestAiAssist(params: {
  task: AiTaskType;
  prompt: string;
  offlineMode: boolean;
  summary: ScenarioSummary;
  posts: HydroPost[];
  objects: VulnerableObject[];
  rules: AnalysisRules;
  selectedAssessment?: ObjectAssessment | null;
}): Promise<AiAssistResponse> {
  const {
    task,
    prompt,
    offlineMode,
    summary,
    posts,
    objects,
    rules,
    selectedAssessment,
  } = params;

  const localFallback = () => ({
    reply: runLocalRuleBasedAi({
      task,
      prompt,
      summary,
      posts,
      objects,
      rules,
      selectedAssessment,
    }),
    source: 'local-rules' as const,
  });

  if (offlineMode || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return localFallback();
  }

  const issues = auditDataQuality(objects, posts);
  const compactContext = {
    scenario: {
      name: summary.scenario.name,
      waterDeltaM: summary.scenario.waterDeltaM,
      leveeMitigationM: summary.scenario.leveeMitigationM,
      channelClearingBonusM: summary.scenario.channelClearingBonusM,
    },
    metrics: {
      totalObjects: summary.totalObjects,
      floodedObjects: summary.floodedObjects,
      threatenedObjects: summary.threatenedObjects,
      floodedAreaHa: summary.floodedAreaHa,
      floodedHouseholds: summary.floodedHouseholds,
      floodedResidents: summary.floodedResidents,
      maxDepthM: summary.maxDepthM,
    },
    byType: summary.byType.map((b) => ({
      type: b.label,
      floodedCount: b.floodedCount,
      floodedAreaHa: Number((b.floodedAreaSqM / 10000).toFixed(2)),
      floodedHouseholds: b.floodedHouseholds,
    })),
    criticalObjects: summary.assessments
      .filter((a) => a.riskLevel === 'critical' || a.riskLevel === 'high')
      .slice(0, 10)
      .map((a) => ({
        code: a.object.code,
        name: a.object.name,
        type: OBJECT_TYPE_LABELS[a.object.type],
        risk: RISK_LEVEL_LABELS[a.riskLevel],
        floodDepthM: a.floodDepthM,
        households: a.object.households,
        reasons: a.riskReasons,
      })),
    selectedObject: selectedAssessment
      ? {
          code: selectedAssessment.object.code,
          name: selectedAssessment.object.name,
          type: OBJECT_TYPE_LABELS[selectedAssessment.object.type],
          elevationM: selectedAssessment.object.elevationM,
          protectionHeightM: selectedAssessment.object.protectionHeightM,
          effectiveWaterLevelM: selectedAssessment.effectiveWaterLevelM,
          floodDepthM: selectedAssessment.floodDepthM,
          riskLevel: RISK_LEVEL_LABELS[selectedAssessment.riskLevel],
          reasons: selectedAssessment.riskReasons,
          anomalies: selectedAssessment.anomalies,
        }
      : null,
    dataQualityIssues: issues.slice(0, 10),
    rules,
  };

  try {
    const res = await fetch('/api/ai/assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task,
        prompt,
        context: compactContext,
      }),
    });

    if (!res.ok) {
      return localFallback();
    }

    const data = await res.json();
    if (!data?.reply) {
      return localFallback();
    }

    return {
      reply: data.reply,
      source: 'gemini',
      model: data.model,
    };
  } catch {
    return localFallback();
  }
}
