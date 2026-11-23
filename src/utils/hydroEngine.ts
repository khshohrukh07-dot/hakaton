import { OBJECT_TYPE_LABELS, RISK_LEVEL_LABELS } from '../data/demoScenario';
import {
  AnalysisRules,
  DataQualityIssue,
  FloodStatus,
  HydroPost,
  ObjectAssessment,
  ObjectType,
  RiskLevel,
  ScenarioConfig,
  ScenarioSummary,
  TypeBreakdown,
  VulnerableObject,
} from '../types/hydro';

export function round2(val: number): number {
  return Math.round(val * 100) / 100;
}

export function round1(val: number): number {
  return Math.round(val * 10) / 10;
}

export function getEffectivePostLevel(
  post: HydroPost,
  scenario: ScenarioConfig,
): number {
  const override = scenario.postOverrides[post.id] ?? 0;
  const raw =
    post.currentWaterLevelM +
    scenario.waterDeltaM +
    override -
    scenario.channelClearingBonusM;
  return round2(Math.max(post.zeroElevationM - 0.5, raw));
}

export function getPostStatus(
  post: HydroPost,
  effectiveLevelM: number,
): 'normal' | 'adverse' | 'dangerous' | 'critical' {
  if (effectiveLevelM >= post.criticalLevelM) return 'critical';
  if (effectiveLevelM >= post.dangerousLevelM) return 'dangerous';
  if (effectiveLevelM >= post.adverseLevelM) return 'adverse';
  return 'normal';
}

export function computeObjectCompleteness(
  obj: VulnerableObject,
  posts: HydroPost[],
): { score: number; anomalies: string[] } {
  const anomalies: string[] = [];
  let checks = 0;
  let passed = 0;

  const check = (ok: boolean, message: string) => {
    checks += 1;
    if (ok) {
      passed += 1;
    } else {
      anomalies.push(message);
    }
  };

  check(obj.name.trim().length >= 3, 'Не указано корректное название объекта');
  check(obj.settlement.trim().length >= 2, 'Не указан населённый пункт или сектор');
  check(
    Number.isFinite(obj.lat) &&
      Number.isFinite(obj.lng) &&
      obj.lat >= 52.5 &&
      obj.lat <= 54.0 &&
      obj.lng >= 62.5 &&
      obj.lng <= 65.0,
    'Координаты выходят за границы модельного бассейна или не заданы',
  );

  const post = posts.find((p) => p.id === obj.postId);
  check(Boolean(post), 'Не привязан опорный гидрологический пост');

  check(
    Number.isFinite(obj.elevationM) &&
      obj.elevationM >= (post ? post.zeroElevationM + 0.5 : 92.0) &&
      obj.elevationM <= 120,
    post
      ? `Подозрительно низкая/некорректная отметка рельефа (${obj.elevationM} м при нуле поста ${post.zeroElevationM} м)`
      : 'Некорректная отметка рельефа',
  );

  check(obj.areaSqM > 0, 'Площадь участка равна 0 м² (не указана)');

  if (obj.type === 'residential') {
    check(
      obj.households > 0,
      'Для жилого объекта указано 0 домохозяйств',
    );
  } else {
    checks += 1;
    passed += 1;
  }

  if (obj.areaSqM > 0 && obj.households > 0) {
    const sqMPerHousehold = obj.areaSqM / obj.households;
    if (sqMPerHousehold < 60) {
      anomalies.push(
        `Аномально высокая плотность застройки: ${Math.round(sqMPerHousehold)} м² на 1 домохозяйство`,
      );
    }
  }

  const score = Math.round((passed / Math.max(1, checks)) * 100);
  return { score, anomalies };
}

export function evaluateObject(
  obj: VulnerableObject,
  posts: HydroPost[],
  scenario: ScenarioConfig,
  rules: AnalysisRules,
): ObjectAssessment {
  const post = posts.find((p) => p.id === obj.postId) ?? posts[0];
  const effectiveWaterLevelM = post
    ? getEffectivePostLevel(post, scenario)
    : 96.0 + scenario.waterDeltaM - scenario.channelClearingBonusM;

  // Локальное расстояние до опорного поста вносит небольшое ослабление гидравлического уклона
  const distFactor = post
    ? Math.min(
        0.25,
        Math.hypot(obj.lat - post.lat, obj.lng - post.lng) *
          10 *
          rules.hydraulicSlopeFactor,
      )
    : 0;

  const leveeBonus =
    obj.type === 'hydrotechnical'
      ? scenario.leveeMitigationM * 0.5
      : scenario.leveeMitigationM * rules.leveeEfficiency;

  const effectiveProtectionElevationM = round2(
    obj.elevationM + obj.protectionHeightM + leveeBonus + distFactor,
  );

  const floodDepthM = round2(effectiveWaterLevelM - effectiveProtectionElevationM);

  let floodStatus: FloodStatus = 'safe';
  if (floodDepthM > 0) {
    floodStatus = 'flooded';
  } else if (floodDepthM >= -rules.threatBufferM) {
    floodStatus = 'threatened';
  }

  const reasons: string[] = [];
  const { criticalDepthM, highDepthM, mediumDepthM, criticalTypesPriority } =
    rules.riskThresholds;

  const isCriticalInfraOrSocial =
    obj.type === 'social' ||
    obj.type === 'infrastructure' ||
    (obj.type === 'industrial' && obj.condition === 'worn');

  let riskLevel: RiskLevel = 'low';

  if (floodDepthM >= criticalDepthM) {
    riskLevel = 'critical';
    reasons.push(
      `Расчётная глубина затопления ${floodDepthM.toFixed(2)} м превышает критический порог (${criticalDepthM.toFixed(2)} м).`,
    );
  } else if (floodDepthM >= highDepthM) {
    if (criticalTypesPriority && isCriticalInfraOrSocial) {
      riskLevel = 'critical';
      reasons.push(
        `Глубина затопления ${floodDepthM.toFixed(2)} м (порог высокого риска ${highDepthM.toFixed(2)} м) повышена до «Критический» из-за категории объекта (${OBJECT_TYPE_LABELS[obj.type]}).`,
      );
    } else {
      riskLevel = 'high';
      reasons.push(
        `Расчётная глубина затопления ${floodDepthM.toFixed(2)} м превышает порог высокого риска (${highDepthM.toFixed(2)} м).`,
      );
    }
  } else if (floodDepthM > 0) {
    if (criticalTypesPriority && isCriticalInfraOrSocial) {
      riskLevel = 'high';
      reasons.push(
        `Начальное подтопление (${floodDepthM.toFixed(2)} м) для значимого объекта (${OBJECT_TYPE_LABELS[obj.type]}) повышено до уровня «Высокий».`,
      );
    } else {
      riskLevel = 'medium';
      reasons.push(
        `Зафиксировано поверхностное подтопление ${floodDepthM.toFixed(2)} м (ниже порога ${highDepthM.toFixed(2)} м).`,
      );
    }
  } else if (floodDepthM >= -mediumDepthM) {
    if (criticalTypesPriority && obj.type === 'social' && floodDepthM >= -0.25) {
      riskLevel = 'high';
      reasons.push(
        `До перелива осталось всего ${Math.abs(floodDepthM).toFixed(2)} м — для социального объекта установлен повышенный приоритет.`,
      );
    } else {
      riskLevel = 'medium';
      reasons.push(
        `Объект находится в буферной зоне угрозы: запас высоты составляет ${Math.abs(floodDepthM).toFixed(2)} м (порог буфера ${rules.threatBufferM.toFixed(2)} м).`,
      );
    }
  } else {
    riskLevel = 'low';
    reasons.push(
      `Запас высоты до уровня воды составляет ${Math.abs(floodDepthM).toFixed(2)} м — объект вне зоны затопления.`,
    );
  }

  if (obj.condition === 'worn' && floodStatus !== 'safe') {
    reasons.push('Изношенное состояние конструктива/защиты снижает устойчивость к размыву.');
  }
  if (scenario.leveeMitigationM > 0) {
    reasons.push(
      `Учтена дополнительная защита временными дамбами: +${round2(leveeBonus).toFixed(2)} м (эффективность ${Math.round(rules.leveeEfficiency * 100)}%).`,
    );
  }

  const { score, anomalies } = computeObjectCompleteness(obj, posts);

  return {
    object: obj,
    post,
    effectiveWaterLevelM,
    effectiveProtectionElevationM,
    floodDepthM,
    floodStatus,
    riskLevel,
    riskReasons: reasons,
    completenessScore: score,
    anomalies,
  };
}

export function evaluateScenario(
  objects: VulnerableObject[],
  posts: HydroPost[],
  scenario: ScenarioConfig,
  rules: AnalysisRules,
): ScenarioSummary {
  const assessments = objects.map((obj) =>
    evaluateObject(obj, posts, scenario, rules),
  );

  let floodedObjects = 0;
  let threatenedObjects = 0;
  let safeObjects = 0;
  let criticalRiskObjects = 0;
  let highRiskObjects = 0;
  let floodedAreaSqM = 0;
  let threatenedAreaSqM = 0;
  let floodedHouseholds = 0;
  let threatenedHouseholds = 0;
  let floodedResidents = 0;
  let threatenedResidents = 0;
  let maxDepthM = 0;
  let depthSum = 0;

  const typeMap: Record<ObjectType, TypeBreakdown> = {
    residential: {
      type: 'residential',
      label: OBJECT_TYPE_LABELS.residential,
      totalCount: 0,
      floodedCount: 0,
      threatenedCount: 0,
      floodedAreaSqM: 0,
      threatenedAreaSqM: 0,
      floodedHouseholds: 0,
      threatenedHouseholds: 0,
    },
    social: {
      type: 'social',
      label: OBJECT_TYPE_LABELS.social,
      totalCount: 0,
      floodedCount: 0,
      threatenedCount: 0,
      floodedAreaSqM: 0,
      threatenedAreaSqM: 0,
      floodedHouseholds: 0,
      threatenedHouseholds: 0,
    },
    infrastructure: {
      type: 'infrastructure',
      label: OBJECT_TYPE_LABELS.infrastructure,
      totalCount: 0,
      floodedCount: 0,
      threatenedCount: 0,
      floodedAreaSqM: 0,
      threatenedAreaSqM: 0,
      floodedHouseholds: 0,
      threatenedHouseholds: 0,
    },
    industrial: {
      type: 'industrial',
      label: OBJECT_TYPE_LABELS.industrial,
      totalCount: 0,
      floodedCount: 0,
      threatenedCount: 0,
      floodedAreaSqM: 0,
      threatenedAreaSqM: 0,
      floodedHouseholds: 0,
      threatenedHouseholds: 0,
    },
    hydrotechnical: {
      type: 'hydrotechnical',
      label: OBJECT_TYPE_LABELS.hydrotechnical,
      totalCount: 0,
      floodedCount: 0,
      threatenedCount: 0,
      floodedAreaSqM: 0,
      threatenedAreaSqM: 0,
      floodedHouseholds: 0,
      threatenedHouseholds: 0,
    },
  };

  for (const a of assessments) {
    const tb = typeMap[a.object.type];
    tb.totalCount += 1;

    if (a.riskLevel === 'critical') criticalRiskObjects += 1;
    if (a.riskLevel === 'high') highRiskObjects += 1;

    if (a.floodStatus === 'flooded') {
      floodedObjects += 1;
      floodedAreaSqM += a.object.areaSqM;
      floodedHouseholds += a.object.households;
      floodedResidents += a.object.residents;
      if (a.floodDepthM > maxDepthM) maxDepthM = a.floodDepthM;
      depthSum += a.floodDepthM;

      tb.floodedCount += 1;
      tb.floodedAreaSqM += a.object.areaSqM;
      tb.floodedHouseholds += a.object.households;
    } else if (a.floodStatus === 'threatened') {
      threatenedObjects += 1;
      threatenedAreaSqM += a.object.areaSqM;
      threatenedHouseholds += a.object.households;
      threatenedResidents += a.object.residents;

      tb.threatenedCount += 1;
      tb.threatenedAreaSqM += a.object.areaSqM;
      tb.threatenedHouseholds += a.object.households;
    } else {
      safeObjects += 1;
    }
  }

  const postLevels = posts.map((post) => {
    const effectiveLevelM = getEffectivePostLevel(post, scenario);
    return {
      post,
      effectiveLevelM,
      status: getPostStatus(post, effectiveLevelM),
    };
  });

  return {
    scenario,
    assessments,
    totalObjects: assessments.length,
    floodedObjects,
    threatenedObjects,
    safeObjects,
    criticalRiskObjects,
    highRiskObjects,
    floodedAreaSqM: Math.round(floodedAreaSqM),
    floodedAreaHa: round2(floodedAreaSqM / 10000),
    floodedAreaSqKm: round2(floodedAreaSqM / 1_000_000),
    threatenedAreaSqM: Math.round(threatenedAreaSqM),
    threatenedAreaHa: round2(threatenedAreaSqM / 10000),
    floodedHouseholds,
    threatenedHouseholds,
    floodedResidents,
    threatenedResidents,
    maxDepthM: round2(maxDepthM),
    avgFloodDepthM: floodedObjects > 0 ? round2(depthSum / floodedObjects) : 0,
    byType: Object.values(typeMap),
    postLevels,
  };
}

export function auditDataQuality(
  objects: VulnerableObject[],
  posts: HydroPost[],
): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];
  const seenNames = new Map<string, string>();

  for (const obj of objects) {
    const post = posts.find((p) => p.id === obj.postId);

    const normalizedName = obj.name.trim().toLowerCase();
    if (seenNames.has(normalizedName)) {
      issues.push({
        id: `dq-dup-${obj.id}`,
        objectId: obj.id,
        objectCode: obj.code,
        objectName: obj.name,
        severity: 'warning',
        field: 'name',
        message: `Возможное дублирование названия с записью ${seenNames.get(normalizedName)}.`,
        suggestion: 'Уточните уникальное наименование или объедините карточки.',
      });
    } else {
      seenNames.set(normalizedName, obj.code);
    }

    if (obj.areaSqM <= 0) {
      issues.push({
        id: `dq-area-${obj.id}`,
        objectId: obj.id,
        objectCode: obj.code,
        objectName: obj.name,
        severity: 'error',
        field: 'areaSqM',
        message: 'Площадь земельного участка указана как 0 м² — не учитывается в суммарной площади затопления.',
        suggestion: 'Укажите фактическую или кадастровую площадь участка в м².',
      });
    }

    if (!post) {
      issues.push({
        id: `dq-post-${obj.id}`,
        objectId: obj.id,
        objectCode: obj.code,
        objectName: obj.name,
        severity: 'error',
        field: 'postId',
        message: 'Отсутствует привязка к опорному гидропосту.',
        suggestion: 'Выберите ближайший гидрологический пост.',
      });
    } else if (obj.elevationM < post.zeroElevationM + 0.3) {
      issues.push({
        id: `dq-elev-${obj.id}`,
        objectId: obj.id,
        objectCode: obj.code,
        objectName: obj.name,
        severity: 'error',
        field: 'elevationM',
        message: `Отметка рельефа (${obj.elevationM} м) ниже или почти равна нулю поста ${post.code} (${post.zeroElevationM} м).`,
        suggestion: `Проверьте нивелировочную отметку площадки (обычно ${(post.zeroElevationM + 3.2).toFixed(1)}–${(post.zeroElevationM + 6.5).toFixed(1)} м БСВ).`,
      });
    }

    if (obj.type === 'residential' && obj.households <= 0) {
      issues.push({
        id: `dq-hh-${obj.id}`,
        objectId: obj.id,
        objectCode: obj.code,
        objectName: obj.name,
        severity: 'warning',
        field: 'households',
        message: 'Жилой объект имеет 0 домохозяйств — искажает агрегированную оценку населения.',
        suggestion: obj.residents > 0
          ? `Укажите ориентировочно ${Math.max(1, Math.round(obj.residents / 3))} домохозяйств (исходя из ${obj.residents} жителей).`
          : 'Введите количество домохозяйств или измените тип объекта.',
      });
    }

    if (obj.areaSqM > 0 && obj.households > 0 && obj.areaSqM / obj.households < 60) {
      issues.push({
        id: `dq-density-${obj.id}`,
        objectId: obj.id,
        objectCode: obj.code,
        objectName: obj.name,
        severity: 'warning',
        field: 'areaSqM',
        message: `Подозрительно высокая плотность: ${Math.round(obj.areaSqM / obj.households)} м² на домохозяйство.`,
        suggestion: 'Проверьте единицы измерения площади (нужны м², а не га).',
      });
    }

    if (
      !Number.isFinite(obj.lat) ||
      !Number.isFinite(obj.lng) ||
      obj.lat < 52.8 ||
      obj.lat > 53.6 ||
      obj.lng < 63.0 ||
      obj.lng > 64.2
    ) {
      issues.push({
        id: `dq-coords-${obj.id}`,
        objectId: obj.id,
        objectCode: obj.code,
        objectName: obj.name,
        severity: 'error',
        field: 'coordinates',
        message: `Координаты (${obj.lat}, ${obj.lng}) выходят за пределы полигона бассейна.`,
        suggestion: 'Укажите координаты кликом по карте или скорректируйте градусы.',
      });
    }
  }

  return issues;
}

export interface ObjectValidationErrors {
  name?: string;
  settlement?: string;
  lat?: string;
  lng?: string;
  elevationM?: string;
  areaSqM?: string;
  households?: string;
  residents?: string;
  protectionHeightM?: string;
}

export function validateObjectInput(
  input: Partial<VulnerableObject>,
): ObjectValidationErrors {
  const errors: ObjectValidationErrors = {};
  if (!input.name || input.name.trim().length < 3) {
    errors.name = 'Введите название объекта (минимум 3 символа).';
  }
  if (!input.settlement || input.settlement.trim().length < 2) {
    errors.settlement = 'Укажите населённый пункт или сектор.';
  }
  if (
    input.lat === undefined ||
    !Number.isFinite(input.lat) ||
    input.lat < -90 ||
    input.lat > 90
  ) {
    errors.lat = 'Широта должна быть в диапазоне от -90 до 90.';
  }
  if (
    input.lng === undefined ||
    !Number.isFinite(input.lng) ||
    input.lng < -180 ||
    input.lng > 180
  ) {
    errors.lng = 'Долгота должна быть в диапазоне от -180 до 180.';
  }
  if (
    input.elevationM === undefined ||
    !Number.isFinite(input.elevationM) ||
    input.elevationM < 50 ||
    input.elevationM > 5000
  ) {
    errors.elevationM = 'Укажите корректную абсолютную отметку (50–5000 м БСВ).';
  }
  if (
    input.areaSqM === undefined ||
    !Number.isFinite(input.areaSqM) ||
    input.areaSqM < 0 ||
    input.areaSqM > 50_000_000
  ) {
    errors.areaSqM = 'Площадь не может быть отрицательной (до 50 000 000 м²).';
  }
  if (
    input.households === undefined ||
    !Number.isFinite(input.households) ||
    input.households < 0 ||
    !Number.isInteger(input.households)
  ) {
    errors.households = 'Количество домохозяйств должно быть целым неотрицательным числом.';
  }
  if (
    input.residents === undefined ||
    !Number.isFinite(input.residents) ||
    input.residents < 0 ||
    !Number.isInteger(input.residents)
  ) {
    errors.residents = 'Количество жителей должно быть целым неотрицательным числом.';
  }
  if (
    input.protectionHeightM === undefined ||
    !Number.isFinite(input.protectionHeightM) ||
    input.protectionHeightM < 0 ||
    input.protectionHeightM > 15
  ) {
    errors.protectionHeightM = 'Высота локальной защиты должна быть от 0 до 15 м.';
  }
  return errors;
}

export function formatRiskSummaryBadgeText(level: RiskLevel): string {
  return RISK_LEVEL_LABELS[level];
}
