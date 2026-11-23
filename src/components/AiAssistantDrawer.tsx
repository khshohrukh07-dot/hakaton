import React, { useState } from 'react';
import {
  AlertCircle,
  Bot,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  AnalysisRules,
  HydroPost,
  ObjectAssessment,
  ScenarioSummary,
  VulnerableObject,
} from '../types/hydro';
import { AiTaskType, requestAiAssist } from '../utils/aiEngine';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sourceLabel?: string;
}

interface AiAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  offlineMode: boolean;
  aiConfiguredOnServer: boolean;
  summary: ScenarioSummary;
  posts: HydroPost[];
  objects: VulnerableObject[];
  rules: AnalysisRules;
  selectedAssessment: ObjectAssessment | null;
  pendingTaskSignal: { task: AiTaskType; nonce: number } | null;
}

export const AiAssistantDrawer: React.FC<AiAssistantDrawerProps> = ({
  isOpen,
  onClose,
  offlineMode,
  aiConfiguredOnServer,
  summary,
  posts,
  objects,
  rules,
  selectedAssessment,
  pendingTaskSignal,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'assistant',
      text: 'Здравствуйте! Я помогаю анализировать сценарии затопления, проверять полноту карточек объектов, выявлять противоречивые отметки и объяснять причины присвоения категории риска. Я работаю строго по вашим данным и расчётным формулам модели.',
      sourceLabel: 'Справочный модуль',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const runTask = async (task: AiTaskType, promptText: string) => {
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: promptText,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    const res = await requestAiAssist({
      task,
      prompt: promptText,
      offlineMode,
      summary,
      posts,
      objects,
      rules,
      selectedAssessment,
    });

    const assistantMsg: ChatMessage = {
      id: `a-${Date.now()}`,
      role: 'assistant',
      text: res.reply,
      sourceLabel:
        res.source === 'gemini'
          ? 'Gemini 4 Hydrogen (сервер)'
          : 'Локальный модуль правил (автономно)',
    };
    setMessages((prev) => [...prev, assistantMsg]);
    setLoading(false);
  };

  React.useEffect(() => {
    if (!pendingTaskSignal) return;
    if (pendingTaskSignal.task === 'explain_object_risk' && selectedAssessment) {
      runTask(
        'explain_object_risk',
        `Объясни категорию риска и глубину затопления для объекта ${selectedAssessment.object.code} «${selectedAssessment.object.name}».`,
      );
    } else if (pendingTaskSignal.task === 'explain_scenario') {
      runTask(
        'explain_scenario',
        `Объясни простым языком результаты сценария «${summary.scenario.name}».`,
      );
    }
  }, [pendingTaskSignal?.nonce]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput('');
    runTask('custom_question', text);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-white border-l border-slate-200 shadow-2xl flex flex-col">
      {/* Шапка */}
      <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              AI-Ассистент аналитика
            </h3>
            <p className="text-[11px] text-slate-500">
              {offlineMode || !aiConfiguredOnServer
                ? 'Режим: Локальный модуль правил (без сети)'
                : 'Режим: Серверный Gemini + локальная проверка'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMessages(messages.slice(0, 1))}
            title="Очистить историю диалога"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Закрыть панель"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Быстрые действия */}
      <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={loading}
          onClick={() =>
            runTask(
              'explain_scenario',
              `Объясни результаты сценария «${summary.scenario.name}» простым языком.`,
            )
          }
          className="px-2.5 py-1 text-[11px] font-medium bg-white border border-slate-200 hover:bg-sky-50 hover:border-sky-200 text-slate-700 rounded-md cursor-pointer"
        >
          Объяснить сценарий
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() =>
            runTask(
              'audit_data',
              'Проверь полноту базы объектов и найди подозрительные значения.',
            )
          }
          className="px-2.5 py-1 text-[11px] font-medium bg-white border border-slate-200 hover:bg-sky-50 hover:border-sky-200 text-slate-700 rounded-md cursor-pointer"
        >
          Найти аномалии в данных
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() =>
            runTask(
              'generate_report',
              'Сформируй краткий аналитический отчёт по текущему сценарию.',
            )
          }
          className="px-2.5 py-1 text-[11px] font-medium bg-white border border-slate-200 hover:bg-sky-50 hover:border-sky-200 text-slate-700 rounded-md cursor-pointer"
        >
          Краткий отчёт
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() =>
            runTask(
              'suggest_card',
              'Дай рекомендации по заполнению карточки нового объекта.',
            )
          }
          className="px-2.5 py-1 text-[11px] font-medium bg-white border border-slate-200 hover:bg-sky-50 hover:border-sky-200 text-slate-700 rounded-md cursor-pointer"
        >
          Подсказки для карточки
        </button>
        {selectedAssessment && (
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              runTask(
                'explain_object_risk',
                `Почему объект ${selectedAssessment.object.code} получил текущую категорию риска?`,
              )
            }
            className="px-2.5 py-1 text-[11px] font-medium bg-sky-50 border border-sky-200 text-sky-800 rounded-md inline-flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3 h-3" />
            <span>Риск {selectedAssessment.object.code}</span>
          </button>
        )}
      </div>

      {/* Сообщения */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[92%] rounded-xl px-3.5 py-2.5 text-xs whitespace-pre-wrap leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-100 text-slate-800 border border-slate-200'
              }`}
            >
              {msg.text}
            </div>
            {msg.sourceLabel && (
              <span className="text-[10px] text-slate-400 mt-1 px-1">
                {msg.sourceLabel}
              </span>
            )}
          </div>
        ))}
        {loading && (
          <div className="text-xs text-slate-500 italic">
            Формирование аналитического ответа...
          </div>
        )}
      </div>

      {/* Дисклеймер и ввод */}
      <div className="p-3 border-t border-slate-200 bg-white space-y-2">
        <div className="text-[10px] text-slate-500 flex items-start gap-1.5 leading-snug">
          <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <span>
            AI не придумывает гидрологические замеры и не заменяет метеопрогноз. Все выводы строятся на расчётной таблице объектов.
          </span>
        </div>
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Задайте вопрос по объектам или сценарию..."
            className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50 cursor-pointer"
            aria-label="Отправить запрос"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
