import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  ShieldAlert,
  Waves,
  XCircle,
} from 'lucide-react';
import { EVENT_STATUS_LABELS, RISK_LEVEL_LABELS } from '../data/demoScenario';
import { EventStatus, FloodStatus, RiskLevel } from '../types/hydro';

export function RiskIndicator({ level }: { level: RiskLevel }) {
  const config: Record<
    RiskLevel,
    { color: string; Icon: typeof AlertOctagon }
  > = {
    critical: { color: 'text-red-700', Icon: AlertOctagon },
    high: { color: 'text-amber-700', Icon: AlertTriangle },
    medium: { color: 'text-sky-700', Icon: Info },
    low: { color: 'text-emerald-700', Icon: CheckCircle2 },
  };
  const { color, Icon } = config[level];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${color} whitespace-nowrap`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{RISK_LEVEL_LABELS[level]}</span>
    </span>
  );
}

export function FloodStatusIndicator({ status }: { status: FloodStatus }) {
  if (status === 'flooded') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 whitespace-nowrap">
        <Waves className="w-3.5 h-3.5 shrink-0" />
        <span>Затоплен</span>
      </span>
    );
  }
  if (status === 'threatened') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 whitespace-nowrap">
        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
        <span>Угроза</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 whitespace-nowrap">
      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
      <span>Безопасно</span>
    </span>
  );
}

export function EventStatusIndicator({ status }: { status: EventStatus }) {
  if (status === 'confirmed') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>{EVENT_STATUS_LABELS.confirmed}</span>
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 whitespace-nowrap">
        <XCircle className="w-3.5 h-3.5 shrink-0" />
        <span>{EVENT_STATUS_LABELS.rejected}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 whitespace-nowrap">
      <Clock className="w-3.5 h-3.5 shrink-0" />
      <span>{EVENT_STATUS_LABELS.pending}</span>
    </span>
  );
}
