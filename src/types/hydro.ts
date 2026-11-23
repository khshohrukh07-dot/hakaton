export type UserRole = 'admin' | 'specialist' | 'observer';

export type ObjectType =
  | 'residential'
  | 'social'
  | 'infrastructure'
  | 'industrial'
  | 'hydrotechnical';

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

export type FloodStatus = 'flooded' | 'threatened' | 'safe';

export type EventType =
  | 'flooding'
  | 'levee_check'
  | 'violation'
  | 'ice_jam'
  | 'infrastructure_alert';

export type EventStatus = 'pending' | 'confirmed' | 'rejected';

export type AppSection =
  | 'overview'
  | 'calculator'
  | 'comparison'
  | 'objects'
  | 'events'
  | 'admin';

export interface RolePermissions {
  label: string;
  description: string;
  canCreateObject: boolean;
  canEditObject: boolean;
  canDeleteObject: boolean;
  canSaveScenario: boolean;
  canDeleteScenario: boolean;
  canRegisterEvent: boolean;
  canConfirmViolations: boolean;
  canEditPosts: boolean;
  canEditRules: boolean;
  canExportReports: boolean;
}

export interface HydroPost {
  id: string;
  code: string;
  name: string;
  riverSection: string;
  lat: number;
  lng: number;
  zeroElevationM: number; // Абсолютная отметка нуля поста, м БСВ
  currentWaterLevelM: number; // Базовый уровень воды, м над нулём / м БСВ расчётная
  adverseLevelM: number; // Отметка НЯ (неблагоприятное явление), м БСВ
  dangerousLevelM: number; // Отметка ОЯ (опасное явление), м БСВ
  criticalLevelM: number; // Критический уровень перелива, м БСВ
  lastUpdated: string;
  notes: string;
}

export interface VulnerableObject {
  id: string;
  code: string;
  name: string;
  type: ObjectType;
  settlement: string;
  lat: number;
  lng: number;
  elevationM: number; // Абсолютная отметка площадки/цоколя, м БСВ
  postId: string;
  areaSqM: number; // Площадь участка/объекта, м²
  households: number; // Количество домохозяйств
  residents: number; // Оценочное число жителей/персонала
  protectionHeightM: number; // Локальная защита (цоколь/обвалование), м
  condition: 'good' | 'satisfactory' | 'worn';
  photoUrl?: string;
  notes: string;
  updatedAt: string;
  updatedBy: string;
}

export interface ScenarioConfig {
  id: string;
  name: string;
  description: string;
  isPreset: boolean;
  createdAt: string;
  waterDeltaM: number; // Изменение уровня воды относительно базового, м
  postOverrides: Record<string, number>; // Индивидуальная поправка по посту, м
  leveeMitigationM: number; // Дополнительная высота временных дамб/мешков, м
  channelClearingBonusM: number; // Эффект снижения уровня за счёт расчистки/сброса, м
}

export interface AnalysisRules {
  threatBufferM: number; // Буферная зона угрозы до затопления, м (напр. 0.6)
  hydraulicSlopeFactor: number; // Коэффициент ослабления при удалении от русла (0..0.3)
  leveeEfficiency: number; // Эффективность временных дамб (0.5..1.0)
  riskThresholds: {
    criticalDepthM: number; // Глубина >= порога => Критический
    highDepthM: number; // Глубина >= порога => Высокий
    mediumDepthM: number; // Глубина >= -порога (в зоне угрозы) => Средний
    criticalTypesPriority: boolean; // Повышать категорию риска для соц/инфраструктуры
  };
}

export interface FloodEvent {
  id: string;
  title: string;
  type: EventType;
  severity: RiskLevel;
  status: EventStatus;
  lat: number;
  lng: number;
  objectId?: string;
  postId?: string;
  waterLevelObservedM?: number;
  description: string;
  photoUrl?: string;
  createdAt: string;
  createdBy: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewComment?: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actorRole: UserRole;
  actorName: string;
  action:
    | 'create_object'
    | 'update_object'
    | 'delete_object'
    | 'save_scenario'
    | 'delete_scenario'
    | 'register_event'
    | 'review_event'
    | 'update_post'
    | 'update_rules'
    | 'switch_role'
    | 'reset_demo'
    | 'export_report';
  targetType: string;
  targetName: string;
  details: string;
}

export interface ObjectAssessment {
  object: VulnerableObject;
  post: HydroPost | undefined;
  effectiveWaterLevelM: number;
  effectiveProtectionElevationM: number;
  floodDepthM: number; // > 0 => затоплен; <= 0 => сухой (расстояние до воды)
  floodStatus: FloodStatus;
  riskLevel: RiskLevel;
  riskReasons: string[];
  completenessScore: number; // 0..100
  anomalies: string[];
}

export interface TypeBreakdown {
  type: ObjectType;
  label: string;
  totalCount: number;
  floodedCount: number;
  threatenedCount: number;
  floodedAreaSqM: number;
  threatenedAreaSqM: number;
  floodedHouseholds: number;
  threatenedHouseholds: number;
}

export interface ScenarioSummary {
  scenario: ScenarioConfig;
  assessments: ObjectAssessment[];
  totalObjects: number;
  floodedObjects: number;
  threatenedObjects: number;
  safeObjects: number;
  criticalRiskObjects: number;
  highRiskObjects: number;
  floodedAreaSqM: number;
  floodedAreaHa: number;
  floodedAreaSqKm: number;
  threatenedAreaSqM: number;
  threatenedAreaHa: number;
  floodedHouseholds: number;
  threatenedHouseholds: number;
  floodedResidents: number;
  threatenedResidents: number;
  maxDepthM: number;
  avgFloodDepthM: number;
  byType: TypeBreakdown[];
  postLevels: Array<{
    post: HydroPost;
    effectiveLevelM: number;
    status: 'normal' | 'adverse' | 'dangerous' | 'critical';
  }>;
}

export interface DataQualityIssue {
  id: string;
  objectId: string;
  objectCode: string;
  objectName: string;
  severity: 'error' | 'warning';
  field: string;
  message: string;
  suggestion: string;
}

export interface AppState {
  version: number;
  role: UserRole;
  offlineMode: boolean;
  activeScenarioId: string;
  customScenario: ScenarioConfig;
  compareScenarioIds: [string, string, string];
  posts: HydroPost[];
  objects: VulnerableObject[];
  scenarios: ScenarioConfig[];
  events: FloodEvent[];
  rules: AnalysisRules;
  auditLog: AuditEntry[];
  lastSavedAt: string;
}
