import {
  EVENT_STATUS_LABELS,
  EVENT_TYPE_LABELS,
  OBJECT_TYPE_LABELS,
  RISK_LEVEL_LABELS,
} from '../data/demoScenario';
import {
  AppState,
  FloodEvent,
  ScenarioSummary,
} from '../types/hydro';

function triggerDownload(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (str.includes(';') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportScenarioCsv(summary: ScenarioSummary) {
  const headers = [
    'Код',
    'Наименование',
    'Тип объекта',
    'Населённый пункт',
    'Гидропост',
    'Широта',
    'Долгота',
    'Отметка рельефа (м)',
    'Уровень защиты (м)',
    'Расч. уровень воды (м)',
    'Глубина затопления (м)',
    'Статус затопления',
    'Категория риска',
    'Площадь (м²)',
    'Площадь (га)',
    'Домохозяйства',
    'Жители',
    'Полнота данных (%)',
  ];

  const statusLabels = {
    flooded: 'Затоплен',
    threatened: 'В зоне угрозы',
    safe: 'Безопасно',
  };

  const rows = summary.assessments.map((a) => [
    a.object.code,
    a.object.name,
    OBJECT_TYPE_LABELS[a.object.type],
    a.object.settlement,
    a.post?.code ?? '',
    a.object.lat.toFixed(4),
    a.object.lng.toFixed(4),
    a.object.elevationM.toFixed(2),
    a.effectiveProtectionElevationM.toFixed(2),
    a.effectiveWaterLevelM.toFixed(2),
    a.floodDepthM.toFixed(2),
    statusLabels[a.floodStatus],
    RISK_LEVEL_LABELS[a.riskLevel],
    a.object.areaSqM,
    (a.object.areaSqM / 10000).toFixed(3),
    a.object.households,
    a.object.residents,
    a.completenessScore,
  ]);

  const csvContent =
    '\uFEFF' +
    [headers, ...rows]
      .map((row) => row.map(escapeCsvCell).join(';'))
      .join('\n');

  const dateStr = new Date().toISOString().slice(0, 10);
  triggerDownload(
    `hydroshield-scenario-${dateStr}.csv`,
    csvContent,
    'text/csv;charset=utf-8;',
  );
}

export function exportFullJsonBackup(state: AppState) {
  const dateStr = new Date().toISOString().slice(0, 10);
  triggerDownload(
    `hydroshield-backup-${dateStr}.json`,
    JSON.stringify(state, null, 2),
    'application/json;charset=utf-8;',
  );
}

export function exportHtmlReport(
  summary: ScenarioSummary,
  compareSummaries: ScenarioSummary[],
  events: FloodEvent[],
) {
  const dateStr = new Date().toLocaleString('ru-RU');
  const floodedRows = summary.assessments
    .filter((a) => a.floodStatus !== 'safe')
    .sort((a, b) => b.floodDepthM - a.floodDepthM)
    .map(
      (a) => `
      <tr>
        <td>${a.object.code}</td>
        <td>${a.object.name}</td>
        <td>${OBJECT_TYPE_LABELS[a.object.type]}</td>
        <td>${a.object.settlement}</td>
        <td style="text-align:right">${a.effectiveWaterLevelM.toFixed(2)}</td>
        <td style="text-align:right">${a.effectiveProtectionElevationM.toFixed(2)}</td>
        <td style="text-align:right;font-weight:600">${a.floodDepthM > 0 ? `+${a.floodDepthM.toFixed(2)}` : a.floodDepthM.toFixed(2)}</td>
        <td>${RISK_LEVEL_LABELS[a.riskLevel]}</td>
        <td style="text-align:right">${(a.object.areaSqM / 10000).toFixed(2)}</td>
        <td style="text-align:right">${a.object.households}</td>
      </tr>`,
    )
    .join('');

  const compareRows = compareSummaries
    .map(
      (cs) => `
      <tr>
        <td><strong>${cs.scenario.name}</strong></td>
        <td style="text-align:right">${cs.scenario.waterDeltaM >= 0 ? '+' : ''}${cs.scenario.waterDeltaM.toFixed(2)} м</td>
        <td style="text-align:right">${cs.floodedObjects}</td>
        <td style="text-align:right">${cs.threatenedObjects}</td>
        <td style="text-align:right">${cs.floodedAreaHa.toFixed(2)} га</td>
        <td style="text-align:right">${cs.floodedHouseholds}</td>
        <td style="text-align:right">${cs.floodedResidents}</td>
      </tr>`,
    )
    .join('');

  const eventsRows = events
    .slice(0, 12)
    .map(
      (e) => `
      <tr>
        <td>${e.createdAt}</td>
        <td>${EVENT_TYPE_LABELS[e.type]}</td>
        <td>${e.title}</td>
        <td>${EVENT_STATUS_LABELS[e.status]}</td>
      </tr>`,
    )
    .join('');

  const html = `<!doctype html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <title>Отчёт «ГидроЩит» — ${summary.scenario.name}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #0f172a; max-width: 1080px; margin: 32px auto; padding: 0 24px; line-height: 1.5; }
    h1, h2 { color: #0f172a; margin-top: 28px; }
    .meta { color: #475569; font-size: 13px; margin-bottom: 20px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 20px 0; }
    .kpi { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; }
    .kpi-label { font-size: 12px; color: #64748b; }
    .kpi-val { font-size: 22px; font-weight: 700; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
    th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; }
    th { background: #f8fafc; font-weight: 600; }
    .note { margin-top: 24px; padding: 12px 16px; background: #f1f5f9; border-radius: 8px; font-size: 12px; color: #475569; }
  </style>
</head>
<body>
  <h1>Аналитический отчёт по сценарному анализу зон затопления</h1>
  <div class="meta">Платформа «ГидроЩит» · Сценарий: <strong>${summary.scenario.name}</strong> · Сформирован: ${dateStr}</div>

  <div class="kpi-grid">
    <div class="kpi"><div class="kpi-label">Затоплено объектов</div><div class="kpi-val">${summary.floodedObjects} / ${summary.totalObjects}</div></div>
    <div class="kpi"><div class="kpi-label">Площадь затопления</div><div class="kpi-val">${summary.floodedAreaHa.toFixed(2)} га</div></div>
    <div class="kpi"><div class="kpi-label">Затронуто домохозяйств</div><div class="kpi-val">${summary.floodedHouseholds}</div></div>
    <div class="kpi"><div class="kpi-label">В зоне угрозы</div><div class="kpi-val">${summary.threatenedObjects} об. (${summary.threatenedHouseholds} д/х)</div></div>
  </div>

  <h2>1. Сравнение трёх выбранных сценариев</h2>
  <table>
    <thead>
      <tr><th>Сценарий</th><th>Сдвиг воды</th><th>Затоплено об.</th><th>В зоне угрозы</th><th>Площадь</th><th>Домохозяйства</th><th>Жители</th></tr>
    </thead>
    <tbody>${compareRows}</tbody>
  </table>

  <h2>2. Объекты в зоне затопления и угрозы</h2>
  <table>
    <thead>
      <tr><th>Код</th><th>Объект</th><th>Тип</th><th>Сектор</th><th>Уровень воды</th><th>Защита</th><th>Глубина</th><th>Риск</th><th>Площадь (га)</th><th>Домохоз.</th></tr>
    </thead>
    <tbody>${floodedRows || '<tr><td colspan="10">В данном сценарии объекты вне зоны затопления и угрозы.</td></tr>'}</tbody>
  </table>

  <h2>3. Журнал полевых событий</h2>
  <table>
    <thead>
      <tr><th>Дата</th><th>Тип</th><th>Событие</th><th>Статус</th></tr>
    </thead>
    <tbody>${eventsRows}</tbody>
  </table>

  <div class="note">
    <strong>Методология и допущения:</strong> расчёт выполнен путём сопоставления модельного уровня воды по опорным гидрологическим постам с абсолютными отметками объектов, их локальной защитой и параметрами инженерных мероприятий. Результаты предназначены для сценарного планирования и не заменяют официальный гидрометеорологический прогноз.
  </div>
</body>
</html>`;

  const fileDate = new Date().toISOString().slice(0, 10);
  triggerDownload(
    `hydroshield-report-${fileDate}.html`,
    html,
    'text/html;charset=utf-8;',
  );
}
