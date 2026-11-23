import React from 'react';
import { X } from 'lucide-react';
import { FloodEvent, HydroPost, ScenarioSummary } from '../types/hydro';
import { InteractiveBasinMap } from './InteractiveBasinMap';

interface MapPickerModalProps {
  isOpen: boolean;
  summary: ScenarioSummary;
  posts: HydroPost[];
  events: FloodEvent[];
  onPick: (coords: { lat: number; lng: number }) => void;
  onClose: () => void;
}

export const MapPickerModal: React.FC<MapPickerModalProps> = ({
  isOpen,
  summary,
  posts,
  events,
  onPick,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Выбор координат на карте бассейна
            </h3>
            <p className="text-xs text-slate-500">
              Кликните в нужную точку долины реки, чтобы автоматически подставить широту и долготу.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-3">
          <InteractiveBasinMap
            summary={summary}
            posts={posts}
            events={events}
            selectedObjectId={null}
            onSelectObject={() => {}}
            pickCoordinateMode={true}
            onPickCoordinate={(coords) => {
              onPick(coords);
              onClose();
            }}
            onCancelPickCoordinate={onClose}
            heightClass="h-[420px] sm:h-[480px]"
          />
        </div>
      </div>
    </div>
  );
};
