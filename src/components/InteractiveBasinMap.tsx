import React, { useMemo, useRef, useState } from 'react';
import {
  Crosshair,
  Layers,
  Maximize2,
  Minus,
  Plus,
  Sparkles,
  Edit3,
  X,
  MapPin,
} from 'lucide-react';
import { OBJECT_TYPE_LABELS, RISK_LEVEL_LABELS } from '../data/demoScenario';
import {
  FloodEvent,
  HydroPost,
  ObjectAssessment,
  ScenarioSummary,
} from '../types/hydro';
import { FloodStatusIndicator, RiskIndicator } from './StatusIndicator';

interface InteractiveBasinMapProps {
  summary: ScenarioSummary;
  posts: HydroPost[];
  events: FloodEvent[];
  selectedObjectId: string | null;
  onSelectObject: (objectId: string | null) => void;
  onEditObject?: (objectId: string) => void;
  onAskAiForObject?: (objectId: string) => void;
  pickCoordinateMode?: boolean;
  onPickCoordinate?: (coords: { lat: number; lng: number }) => void;
  onCancelPickCoordinate?: () => void;
  heightClass?: string;
}

const BOUNDS = {
  minLat: 53.178,
  maxLat: 53.26,
  minLng: 63.558,
  maxLng: 63.71,
};

const SVG_W = 1000;
const SVG_H = 620;

function project(lat: number, lng: number): { x: number; y: number } {
  const x =
    ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * (SVG_W - 80) + 40;
  const y =
    SVG_H -
    (((lat - BOUNDS.minLat) / (BOUNDS.maxLat - BOUNDS.minLat)) * (SVG_H - 70) +
      35);
  return { x, y };
}

function unproject(x: number, y: number): { lat: number; lng: number } {
  const lng =
    ((x - 40) / (SVG_W - 80)) * (BOUNDS.maxLng - BOUNDS.minLng) + BOUNDS.minLng;
  const lat =
    ((SVG_H - y - 35) / (SVG_H - 70)) * (BOUNDS.maxLat - BOUNDS.minLat) +
    BOUNDS.minLat;
  return {
    lat: Number(lat.toFixed(4)),
    lng: Number(lng.toFixed(4)),
  };
}

// Центральная линия русла реки (от ГП-01 к ГП-06)
const RIVER_POINTS: Array<[number, number]> = [
  [53.255, 63.562],
  [53.246, 63.575], // ГП-01
  [53.236, 63.59],
  [53.226, 63.606], // ГП-02
  [53.218, 63.621],
  [53.214, 63.634], // ГП-03
  [53.205, 63.646],
  [53.199, 63.654], // ГП-04
  [53.202, 63.668],
  [53.208, 63.679], // ГП-05
  [53.196, 63.688],
  [53.187, 63.696], // ГП-06
  [53.18, 63.707],
];

export const InteractiveBasinMap: React.FC<InteractiveBasinMapProps> = ({
  summary,
  posts,
  events,
  selectedObjectId,
  onSelectObject,
  onEditObject,
  onAskAiForObject,
  pickCoordinateMode = false,
  onPickCoordinate,
  onCancelPickCoordinate,
  heightClass = 'h-[500px] lg:h-[560px]',
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const [layers, setLayers] = useState({
    floodZone: true,
    contours: true,
    posts: true,
    events: true,
    labels: false,
  });

  const riverPath = useMemo(() => {
    const pts = RIVER_POINTS.map(([lat, lng]) => project(lat, lng));
    return pts
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');
  }, []);

  // Динамическая ширина разлива пропорционально росту уровня воды с учётом инженерной защиты
  const effectiveRise = Math.max(
    0,
    summary.scenario.waterDeltaM -
      summary.scenario.channelClearingBonusM -
      summary.scenario.leveeMitigationM * 0.35,
  );
  const floodStrokeWidth = 22 + Math.min(4.2, effectiveRise) * 34;
  const threatStrokeWidth = floodStrokeWidth + 32;

  const selectedAssessment: ObjectAssessment | undefined = useMemo(
    () => summary.assessments.find((a) => a.object.id === selectedObjectId),
    [summary.assessments, selectedObjectId],
  );

  const hoveredAssessment: ObjectAssessment | undefined = useMemo(
    () => summary.assessments.find((a) => a.object.id === hoveredId),
    [summary.assessments, hoveredId],
  );

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    setZoom((z) => Math.min(3.5, Math.max(0.85, Number((z * factor).toFixed(2)))));
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (pickCoordinateMode && svgRef.current && onPickCoordinate) {
      const rect = svgRef.current.getBoundingClientRect();
      const relX = ((e.clientX - rect.left) / rect.width) * SVG_W;
      const relY = ((e.clientY - rect.top) / rect.height) * SVG_H;
      const svgX = (relX - pan.x) / zoom;
      const svgY = (relY - pan.y) / zoom;
      const coords = unproject(svgX, svgY);
      onPickCoordinate(coords);
      return;
    }
    setDragging({
      startX: e.clientX,
      startY: e.clientY,
      origX: pan.x,
      origY: pan.y,
    });
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging) return;
    const dx = e.clientX - dragging.startX;
    const dy = e.clientY - dragging.startY;
    setPan({ x: dragging.origX + dx, y: dragging.origY + dy });
  };

  const handlePointerUp = () => {
    setDragging(null);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const toggleLayer = (key: keyof typeof layers) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
      {/* Панель инструментов карты */}
      <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 whitespace-nowrap">
            <Layers className="w-4 h-4 text-sky-600" />
            Слои карты:
          </span>
          {(
            [
              ['floodZone', 'Зона затопления'],
              ['contours', 'Изолинии рельефа'],
              ['posts', 'Гидропосты'],
              ['events', 'События'],
              ['labels', 'Коды объектов'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleLayer(key)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                layers[key]
                  ? 'bg-sky-50 text-sky-800 border-sky-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3.5, Number((z + 0.25).toFixed(2))))}
            title="Приблизить"
            className="p-1.5 bg-white border border-slate-200 rounded-md text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.85, Number((z - 0.25).toFixed(2))))}
            title="Отдалить"
            className="p-1.5 bg-white border border-slate-200 rounded-md text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={resetView}
            title="Сбросить масштаб"
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Сброс</span>
          </button>
        </div>
      </div>

      {pickCoordinateMode && (
        <div className="px-4 py-2.5 bg-sky-50 border-b border-sky-200 flex items-center justify-between gap-4 text-xs text-sky-900">
          <div className="flex items-center gap-2 font-medium">
            <Crosshair className="w-4 h-4 text-sky-700 shrink-0" />
            <span>Режим выбора координат: кликните в любую точку карты для подстановки широты и долготы.</span>
          </div>
          {onCancelPickCoordinate && (
            <button
              type="button"
              onClick={onCancelPickCoordinate}
              className="px-2.5 py-1 bg-white border border-sky-200 rounded text-sky-800 hover:bg-sky-100 font-medium whitespace-nowrap cursor-pointer"
            >
              Отменить
            </button>
          )}
        </div>
      )}

      {/* Основная область карты */}
      <div className={`relative w-full bg-[#eef2f6] select-none overflow-hidden ${heightClass}`}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className={`w-full h-full ${
            pickCoordinateMode
              ? 'cursor-crosshair'
              : dragging
                ? 'cursor-grabbing'
                : 'cursor-grab'
          }`}
        >
          <defs>
            <pattern id="gisGrid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path
                d="M 50 0 L 0 0 0 50"
                fill="none"
                stroke="#cbd5e1"
                strokeWidth="0.6"
                strokeOpacity="0.45"
              />
            </pattern>
            <linearGradient id="floodGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.34" />
              <stop offset="100%" stopColor="#0369a1" stopOpacity="0.28" />
            </linearGradient>
          </defs>

          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Сетка координат */}
            <rect x="0" y="0" width={SVG_W} height={SVG_H} fill="url(#gisGrid)" />

            {/* Изолинии рельефа поймы и террас */}
            {layers.contours && (
              <g>
                <path
                  d={riverPath}
                  fill="none"
                  stroke="#dbeafe"
                  strokeWidth="220"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.45"
                />
                <path
                  d={riverPath}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="195"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="6 6"
                  opacity="0.25"
                />
                <path
                  d={riverPath}
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="125"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="4 4"
                  opacity="0.25"
                />
                <text x="65" y="130" fontSize="11" fill="#64748b" fontFamily="JetBrains Mono">
                  Терраса 98.0 м БСВ
                </text>
                <text x="190" y="210" fontSize="11" fill="#64748b" fontFamily="JetBrains Mono">
                  Пойма 96.0 м БСВ
                </text>
                <text x="580" y="540" fontSize="11" fill="#64748b" fontFamily="JetBrains Mono">
                  Старица 95.2 м БСВ
                </text>
              </g>
            )}

            {/* Буферная зона угрозы (жёлтый контур) */}
            {layers.floodZone && (
              <path
                d={riverPath}
                fill="none"
                stroke="#f59e0b"
                strokeWidth={threatStrokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.16"
              />
            )}

            {/* Моделируемая зона затопления (динамическая ширина от уровня воды) */}
            {layers.floodZone && (
              <path
                d={riverPath}
                fill="none"
                stroke="url(#floodGrad)"
                strokeWidth={floodStrokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Постоянное русло реки */}
            <path
              d={riverPath}
              fill="none"
              stroke="#0284c7"
              strokeWidth="11"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.85"
            />
            <path
              d={riverPath}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.7"
            />

            {/* Маркеры событий (Журнал событий) */}
            {layers.events &&
              events.map((evt) => {
                const { x, y } = project(evt.lat, evt.lng);
                const color =
                  evt.status === 'pending'
                    ? '#d97706'
                    : evt.status === 'confirmed'
                      ? '#0f172a'
                      : '#64748b';
                return (
                  <g
                    key={evt.id}
                    transform={`translate(${x}, ${y - 14})`}
                    className="pointer-events-none"
                  >
                    <polygon
                      points="0,-7 6,4 -6,4"
                      fill={color}
                      stroke="#ffffff"
                      strokeWidth="1.2"
                    />
                  </g>
                );
              })}

            {/* Гидрологические посты */}
            {layers.posts &&
              summary.postLevels.map(({ post, effectiveLevelM, status }) => {
                const { x, y } = project(post.lat, post.lng);
                const statusFill =
                  status === 'critical'
                    ? '#dc2626'
                    : status === 'dangerous'
                      ? '#ea580c'
                      : status === 'adverse'
                        ? '#d97706'
                        : '#0284c7';
                return (
                  <g key={post.id} transform={`translate(${x}, ${y})`}>
                    <rect
                      x="-26"
                      y="-28"
                      width="52"
                      height="20"
                      rx="4"
                      fill="#0f172a"
                      fillOpacity="0.9"
                    />
                    <text
                      x="0"
                      y="-15"
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="600"
                      fill="#ffffff"
                      fontFamily="JetBrains Mono"
                    >
                      {post.code} {effectiveLevelM.toFixed(1)}м
                    </text>
                    <circle
                      r="7"
                      fill={statusFill}
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                  </g>
                );
              })}

            {/* Уязвимые объекты (48+ точек) */}
            {summary.assessments.map((a) => {
              const { x, y } = project(a.object.lat, a.object.lng);
              const isSelected = a.object.id === selectedObjectId;
              const isHovered = a.object.id === hoveredId;

              const fillColor =
                a.floodStatus === 'flooded'
                  ? '#dc2626'
                  : a.floodStatus === 'threatened'
                    ? '#d97706'
                    : '#16a34a';

              const strokeColor = isSelected ? '#0f172a' : '#ffffff';
              const scale = isSelected || isHovered ? 1.35 : 1;

              return (
                <g
                  key={a.object.id}
                  transform={`translate(${x}, ${y}) scale(${scale})`}
                  onClick={(e) => {
                    if (pickCoordinateMode) return;
                    e.stopPropagation();
                    onSelectObject(a.object.id);
                  }}
                  onMouseEnter={() => setHoveredId(a.object.id)}
                  onMouseLeave={() => setHoveredId((prev) => (prev === a.object.id ? null : prev))}
                  className="cursor-pointer transition-transform duration-150"
                >
                  {isSelected && (
                    <circle
                      r="11"
                      fill="none"
                      stroke="#0f172a"
                      strokeWidth="1.8"
                      strokeDasharray="3 2"
                    />
                  )}

                  {/* Форма маркера зависит от типа объекта (не только цвет!) */}
                  {a.object.type === 'residential' && (
                    <circle r="6" fill={fillColor} stroke={strokeColor} strokeWidth="1.6" />
                  )}
                  {a.object.type === 'social' && (
                    <rect
                      x="-6"
                      y="-6"
                      width="12"
                      height="12"
                      rx="2"
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth="1.6"
                    />
                  )}
                  {a.object.type === 'infrastructure' && (
                    <polygon
                      points="0,-7.5 7.5,0 0,7.5 -7.5,0"
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth="1.6"
                    />
                  )}
                  {a.object.type === 'industrial' && (
                    <polygon
                      points="-6,-5 6,-5 6,5 -6,5"
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth="1.6"
                    />
                  )}
                  {a.object.type === 'hydrotechnical' && (
                    <polygon
                      points="0,-7 6.5,-3 6.5,3 0,7 -6.5,3 -6.5,-3"
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth="1.6"
                    />
                  )}

                  {(layers.labels || isSelected) && (
                    <text
                      x="9"
                      y="3"
                      fontSize="9.5"
                      fontWeight="600"
                      fill="#0f172a"
                      fontFamily="JetBrains Mono"
                      className="pointer-events-none"
                    >
                      {a.object.code}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Плавающая подсказка при наведении */}
        {hoveredAssessment && hoveredAssessment.object.id !== selectedObjectId && (
          <div className="pointer-events-none absolute top-3 left-3 bg-white/95 backdrop-blur border border-slate-200 rounded-lg px-3 py-2 shadow-sm max-w-xs text-xs">
            <div className="font-semibold text-slate-900">
              {hoveredAssessment.object.code} · {hoveredAssessment.object.name}
            </div>
            <div className="text-slate-600 mt-0.5 flex items-center gap-2 font-mono">
              <span>Отм: {hoveredAssessment.object.elevationM.toFixed(1)} м</span>
              <span>·</span>
              <span>
                {hoveredAssessment.floodDepthM > 0
                  ? `Глубина: +${hoveredAssessment.floodDepthM.toFixed(2)} м`
                  : `Запас: ${Math.abs(hoveredAssessment.floodDepthM).toFixed(2)} м`}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-3">
              <FloodStatusIndicator status={hoveredAssessment.floodStatus} />
              <RiskIndicator level={hoveredAssessment.riskLevel} />
            </div>
          </div>
        )}

        {/* Легенда карты (нижний левый угол) */}
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur border border-slate-200 rounded-lg px-3 py-2 text-[11px] text-slate-700 flex flex-wrap items-center gap-x-4 gap-y-1 max-w-[92%]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" />
            Затоплен ({summary.floodedObjects})
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block" />
            Угроза ({summary.threatenedObjects})
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
            Безопасно ({summary.safeObjects})
          </span>
          <span className="text-slate-400">|</span>
          <span>Круг: жильё · Квадрат: соц. · Ромб: инфрастр. · Гексагон: ГТС</span>
        </div>

        {/* Карточка выбранного объекта */}
        {selectedAssessment && !pickCoordinateMode && (
          <div className="absolute top-3 right-3 w-80 max-w-[calc(100%-24px)] bg-white border border-slate-200 rounded-xl shadow-lg p-4 text-xs">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[11px] font-mono text-slate-500">
                  {selectedAssessment.object.code} · {OBJECT_TYPE_LABELS[selectedAssessment.object.type]}
                </div>
                <h4 className="text-sm font-semibold text-slate-900 mt-0.5 leading-snug">
                  {selectedAssessment.object.name}
                </h4>
                <div className="text-slate-500 mt-0.5 inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>{selectedAssessment.object.settlement}</span>
                  <span>·</span>
                  <span className="font-mono">
                    {selectedAssessment.object.lat.toFixed(4)}, {selectedAssessment.object.lng.toFixed(4)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSelectObject(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                aria-label="Закрыть карточку"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
              <FloodStatusIndicator status={selectedAssessment.floodStatus} />
              <RiskIndicator level={selectedAssessment.riskLevel} />
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-2 font-mono text-[11px] bg-slate-50 p-2.5 rounded-lg">
              <div>
                <dt className="text-slate-500 font-sans">Уровень воды ({selectedAssessment.post?.code})</dt>
                <dd className="font-semibold text-slate-900">{selectedAssessment.effectiveWaterLevelM.toFixed(2)} м</dd>
              </div>
              <div>
                <dt className="text-slate-500 font-sans">Отм. + защита</dt>
                <dd className="font-semibold text-slate-900">{selectedAssessment.effectiveProtectionElevationM.toFixed(2)} м</dd>
              </div>
              <div>
                <dt className="text-slate-500 font-sans">Глубина / запас</dt>
                <dd className={`font-semibold ${selectedAssessment.floodDepthM > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                  {selectedAssessment.floodDepthM > 0
                    ? `+${selectedAssessment.floodDepthM.toFixed(2)} м`
                    : `${selectedAssessment.floodDepthM.toFixed(2)} м`}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 font-sans">Площадь / ДХ</dt>
                <dd className="font-semibold text-slate-900">
                  {(selectedAssessment.object.areaSqM / 10000).toFixed(2)} га · {selectedAssessment.object.households} д/х
                </dd>
              </div>
            </dl>

            <div className="mt-2.5 text-[11px] text-slate-600 leading-relaxed">
              {selectedAssessment.riskReasons[0]}
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2">
              {onEditObject && (
                <button
                  type="button"
                  onClick={() => onEditObject(selectedAssessment.object.id)}
                  className="flex-1 px-2.5 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Карточка</span>
                </button>
              )}
              {onAskAiForObject && (
                <button
                  type="button"
                  onClick={() => onAskAiForObject(selectedAssessment.object.id)}
                  className="flex-1 px-2.5 py-1.5 text-xs font-medium bg-sky-600 hover:bg-sky-700 text-white rounded-lg inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI-разбор</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
