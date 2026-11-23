import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  app.get('/api/health', (_req, res) => {
    const hasKey = Boolean(
      process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY',
    );
    res.json({
      status: 'ok',
      aiConfigured: hasKey,
      timestamp: new Date().toISOString(),
    });
  });

  app.post('/api/ai/assist', async (req, res) => {
    const ai = getAiClient();
    if (!ai) {
      res.status(503).json({
        code: 'AI_UNAVAILABLE',
        error:
          'Серверный ключ GEMINI_API_KEY не задан. Переключено или доступно выполнение через локальный аналитический модуль на правилах.',
      });
      return;
    }

    const { task, prompt, context } = req.body ?? {};
    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'Параметр prompt обязателен.' });
      return;
    }

    const systemInstruction = [
      'Ты — встроенный инженерно-аналитический ассистент платформы «ГидроЩит» (сценарный анализ зон затопления, Hackathon 2026).',
      'Отвечай строго на русском языке, кратко, структурированно и профессионально.',
      'КРИТИЧЕСКИЕ ПРАВИЛА:',
      '1. Никогда не выдумывай гидрологические измерения, уровни воды, координаты или объекты, которых нет в переданном контексте.',
      '2. Всегда прямо указывай, что сценарный расчёт является инженерной оценкой на основе введённых пороговых отметок и допущений модели, а не официальным метеорологическим прогнозом.',
      '3. Опирайся исключительно на приложенные расчёты, объекты, посты и правила риска.',
      '4. Если данных недостаточно или есть аномалии — явно перечисли их.',
    ].join('\n');

    const userPayload = [
      `Задача: ${typeof task === 'string' ? task : 'general'}`,
      `Запрос пользователя: ${prompt}`,
      context ? `Текущий контекст данных (JSON):\n${JSON.stringify(context, null, 2)}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: userPayload,
        config: {
          systemInstruction,
        },
      });

      const text = response.text?.trim();
      if (!text) {
        res.status(502).json({
          code: 'EMPTY_RESPONSE',
          error: 'Модель вернула пустой ответ. Попробуйте переформулировать запрос.',
        });
        return;
      }

      res.json({
        reply: text,
        model: 'gemini-4-hydrogen',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка обращения к Gemini API';
      console.error('Gemini API error:', message);
      res.status(502).json({
        code: 'UPSTREAM_ERROR',
        error: `Не удалось получить ответ от Gemini API: ${message}`,
      });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HydroShield server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
