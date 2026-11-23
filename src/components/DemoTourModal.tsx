import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Presentation, X } from 'lucide-react';
import { AppSection } from '../types/hydro';

interface DemoTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (section: AppSection) => void;
  onSelectScenario: (id: string) => void;
  onOpenAiAudit: () => void;
}

const STEPS = [
  {
    title: '1. Интерактивная карта и динамика паводка',
    section: 'overview' as AppSection,
    scenarioId: 'sc-elevated',
    description:
      'Покажите жюри Притобольский демонстрационный участок: 6 гидропостов, 48 уязвимых объектов с разными формами маркеров и изолинии рельефа. Передвиньте ползунок ΔH и покажите, как полигон затопления расширяется, а 4 ключевых KPI мгновенно пересчитываются.',
  },
  {
    title: '2. Сценарный калькулятор и инженерные меры',
    section: 'calculator' as AppSection,
    scenarioId: 'sc-extreme',
    description:
      'Перейдите в калькулятор при экстремальном пике (+2.8 м), покажите автоматический расчёт площади затопляемых земель (га / м²) и агрегированного числа домохозяйств. Затем добавьте временную дамбу (+1.1 м) и расчистку русла (-0.35 м), чтобы продемонстрировать снижение ущерба.',
  },
  {
    title: '3. Сравнение трёх сценариев бок о бок',
    section: 'comparison' as AppSection,
    scenarioId: 'sc-elevated',
    description:
      'Откройте матрицу сравнения трёх сценариев (Базовый, Повышенный, Экстремальный или Защитный). Покажите разницу Δ по количеству объектов, гектарам затопления и домохозяйствам.',
  },
  {
    title: '4. Реестр объектов, проверка данных и AI-ассистент',
    section: 'objects' as AppSection,
    scenarioId: 'sc-elevated',
    description:
      'В реестре 48 синтетических объектов, включая 2 записи с намеренными дефектами (нулевая площадь, отметка ниже нуля поста). Запустите AI-ассистента для выявления аномалий и объяснения причин присвоения категории риска.',
  },
  {
    title: '5. Полевые события, фотофиксация и Админ-панель',
    section: 'admin' as AppSection,
    scenarioId: 'sc-elevated',
    description:
      'Продемонстрируйте журнал событий с координатами и фотографиями, переключение ролей (Администратор / Специалист / Наблюдатель), подтверждение нарушений, настройку порогов риска, офлайн-режим и экспорт отчёта в CSV/HTML.',
  },
];

export const DemoTourModal: React.FC<DemoTourModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onSelectScenario,
  onOpenAiAudit,
}) => {
  const [stepIdx, setStepIdx] = useState(0);

  if (!isOpen) return null;

  const step = STEPS[stepIdx];

  const handleGoToStep = (idx: number) => {
    const target = STEPS[idx];
    setStepIdx(idx);
    onSelectScenario(target.scenarioId);
    onNavigate(target.section);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl max-w-xl w-full shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Presentation className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-semibold text-slate-900">
              Сценарий демонстрации для Hackathon 2026
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-1.5">
            {STEPS.map((s, idx) => (
              <button
                key={s.title}
                type="button"
                onClick={() => handleGoToStep(idx)}
                className={`flex-1 h-2 rounded-full transition-colors cursor-pointer ${
                  idx === stepIdx
                    ? 'bg-sky-600'
                    : idx < stepIdx
                      ? 'bg-sky-200'
                      : 'bg-slate-200'
                }`}
                title={s.title}
              />
            ))}
          </div>

          <div>
            <div className="text-xs font-mono text-sky-700">
              Шаг {stepIdx + 1} из {STEPS.length}
            </div>
            <h4 className="text-base font-semibold text-slate-900 mt-1">
              {step.title}
            </h4>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              {step.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleGoToStep(stepIdx)}
                className="px-3 py-2 text-xs font-medium bg-sky-600 text-white rounded-lg hover:bg-sky-700 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>Перейти в этот раздел</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              {stepIdx === 3 && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAiAudit();
                  }}
                  className="px-3 py-2 text-xs font-medium bg-slate-100 text-slate-800 rounded-lg hover:bg-slate-200 cursor-pointer"
                >
                  Запустить AI-аудит
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {stepIdx > 0 && (
                <button
                  type="button"
                  onClick={() => handleGoToStep(stepIdx - 1)}
                  className="px-3 py-2 text-xs font-medium bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Назад
                </button>
              )}
              {stepIdx < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={() => handleGoToStep(stepIdx + 1)}
                  className="px-3 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  Следующий шаг
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-2 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 inline-flex items-center gap-1 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Завершить тур</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
