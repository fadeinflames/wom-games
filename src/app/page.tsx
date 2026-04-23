import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

const HOW_TO_PLAY = [
  {
    step: "01",
    title: "Зарегистрируйся или войди",
    body: "Создай аккаунт — email + пароль. Никакого OAuth, никаких внешних зависимостей. Или войди под demo / demo1234, чтобы попробовать сразу.",
    tag: "AUTH",
  },
  {
    step: "02",
    title: "Открой или создай game pack",
    body: 'Перейди в галерею — там уже есть публичный Starter Pack. Или создай свой pack в "Мои игры" и наполни его сценариями вручную или через JSON-импорт.',
    tag: "SETUP",
  },
  {
    step: "03",
    title: "Режим ведущего: выбери кейсы",
    body: "В Leader Console отметь, какие сценарии участвуют в сегодняшней сессии. Можно оставить все или выбрать под уровень команды.",
    tag: "GM",
  },
  {
    step: "04",
    title: "Крути колесо — получай инцидент",
    body: "Нажми «Крутить колесо 🎰» — колесо случайно выбирает сценарий. Команда видит название и summary инцидента. Таймер пошёл.",
    tag: "SPIN",
  },
  {
    step: "05",
    title: "Выбирай действия и снижай панику",
    body: "Каждый раунд — 4 варианта действий (DBG / COM / OPS / IC). Выбор влияет на Panic level, Service Health и Score. Игра — 10 раундов.",
    tag: "PLAY",
  },
  {
    step: "06",
    title: "Режим игрока: соло-тренировка",
    body: "Для самостоятельной отработки. Сценарии идут по очереди, panic растёт с каждым раундом. В конце — ранг: On-call / IC / Master SRE.",
    tag: "SOLO",
  },
] as const;

const IMPORT_SCHEMA = `{
  "scenarios": [
    {
      "title": "Потерянные в DNS",
      "summary": "Сервис не резолвит внутренние имена.",
      "type": "DNS, CoreDNS",
      "difficulty": "MIDDLE",
      "durationMin": 20,
      "contextJson": { "infra": "Kubernetes 1.34" },
      "eventsJson": [],
      "hintsJson": [],
      "actionsJson": [],
      "gmScriptJson": null
    }
  ]
}`;

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="card space-y-4">
        <p className="text-xs uppercase tracking-[0.2em] text-amber-400">Open-source SRE game platform</p>
        <h1 className="font-[var(--font-display)] text-4xl font-bold md:text-5xl">
          Incident training,<br className="hidden md:block" /> теперь как настоящая игра.
        </h1>
        <p className="max-w-2xl text-zinc-300">
          Wheel of Misfortune — колесо случайно выбирает инцидент, команда разбирает его в реальном времени.
          Тренируй навыки on-call, управление инцидентами и координацию в SRE-стиле.
        </p>
        <div className="flex flex-wrap gap-3">
          {user ? (
            <>
              <Link href="/dashboard" className="btn btn-primary">Мои игры →</Link>
              <Link href="/gallery" className="btn">Галерея паков</Link>
            </>
          ) : (
            <>
              <Link href="/register" className="btn btn-primary">Зарегистрироваться</Link>
              <Link href="/login" className="btn">Войти</Link>
              <Link href="/gallery" className="btn">Галерея паков</Link>
            </>
          )}
        </div>
      </section>

      {/* How to play */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-400">Как играть</p>
          <div className="flex-1 border-t border-white/10" />
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {HOW_TO_PLAY.map(({ step, title, body, tag }) => (
            <article key={step} className="card space-y-3 group hover:border-white/20 transition-colors">
              <div className="flex items-center justify-between">
                <span className="font-[var(--font-display)] text-3xl font-black text-white/10 group-hover:text-amber-500/30 transition-colors">
                  {step}
                </span>
                <span className="rounded border border-white/15 px-2 py-0.5 text-xs text-zinc-500 font-mono">
                  {tag}
                </span>
              </div>
              <h2 className="font-[var(--font-display)] text-lg font-bold leading-snug">{title}</h2>
              <p className="text-sm text-zinc-400 leading-relaxed">{body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Import scenarios */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-400">Загрузка сценариев</p>
          <div className="flex-1 border-t border-white/10" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Agent skill */}
          <div className="card space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-mono text-emerald-400 mb-1">agent-skill/wom-incident-to-json/SKILL.md</p>
                <h2 className="font-[var(--font-display)] text-xl font-bold">Agent skill для Claude</h2>
              </div>
              <span className="rounded border border-emerald-500/30 px-2 py-0.5 text-xs text-emerald-400 font-mono shrink-0">AI</span>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">
              В репозитории есть готовый агентный скилл для Claude Code.
              Он конвертирует описание любого реального инцидента, runbook или заметки
              в валидный JSON для импорта — автоматически заполняет все поля по контексту.
            </p>
            <div className="space-y-2">
              <p className="text-xs text-zinc-500 uppercase tracking-widest">Как использовать</p>
              <ol className="space-y-1.5 text-sm text-zinc-400">
                <li className="flex gap-2">
                  <span className="text-amber-500 shrink-0">1.</span>
                  <span>Установи <a href="https://claude.ai/code" target="_blank" rel="noopener" className="text-amber-400 hover:underline">Claude Code</a> в своём репозитории</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-500 shrink-0">2.</span>
                  <span>Скопируй <code className="rounded bg-white/10 px-1 text-xs font-mono">agent-skill/wom-incident-to-json/SKILL.md</code> в свой проект</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-500 shrink-0">3.</span>
                  <span>Скажи агенту: <em className="text-zinc-300">«Сделай JSON для импорта в WOM»</em> и опиши инцидент</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-500 shrink-0">4.</span>
                  <span>Вставь результат в форму импорта на странице pack</span>
                </li>
              </ol>
            </div>
          </div>

          {/* Agent skill spoiler */}
          <details className="col-span-full rounded-lg border border-emerald-500/20 bg-emerald-500/5 group">
            <summary className="flex cursor-pointer items-center justify-between gap-3 p-4 text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
              <span className="flex items-center gap-2">
                <span className="font-mono text-xs">📄</span>
                Полный текст SKILL.md — скопируй в свой репозиторий
              </span>
              <span className="text-zinc-500 group-open:rotate-180 transition-transform text-xs">▾</span>
            </summary>
            <pre className="overflow-x-auto border-t border-emerald-500/20 p-4 text-xs text-zinc-300 font-mono leading-relaxed whitespace-pre-wrap">{`# WOM Incident To JSON

Convert incident descriptions, markdown runbooks, and rough notes into import-ready JSON for WOM Platform.

## Output Contract

- Always output **valid JSON**.
- Root object must match \`schemas/wom.scenario.v1.json\`.
- Use uppercase enum for difficulty: \`JUNIOR\`, \`MIDDLE\`, \`SENIOR\`.
- Keep \`durationMin\` realistic: \`15-30\` for typical training rounds.

## Prompt Template For Agent

When the user says: "Сделай JSON для импорта в WOM", produce:

1. \`scenarios[]\` with one object per incident.
2. Fill:
   - \`title\`: short incident name
   - \`summary\`: one-sentence game framing
   - \`type\`: stack area, e.g. \`DNS, NetworkPolicy\`
   - \`difficulty\`: inferred from blast radius and ambiguity
   - \`durationMin\`: expected game length
   - \`contextJson\`: infra/services/setup/time
   - \`eventsJson\`: timeline-style events with \`t\`, \`type\`, \`title\`, \`body\`
   - \`hintsJson\`: coaching hints
   - \`actionsJson\`: candidate player actions
   - \`gmScriptJson\`: optional pressure/checkpoints/beats

## Example

\`\`\`json
{
  "scenarios": [
    {
      "title": "Потерянные в DNS",
      "summary": "Сервис периодически не резолвит внутренние имена.",
      "type": "DNS, CoreDNS",
      "difficulty": "MIDDLE",
      "durationMin": 20,
      "contextJson": {
        "infra": "Kubernetes 1.34",
        "services": ["frontend", "backend", "coredns"],
        "setup": "После сетевого hardening появились интервальные timeout.",
        "time": "Четверг, 11:00"
      },
      "eventsJson": [],
      "hintsJson": [],
      "actionsJson": [],
      "gmScriptJson": null
    }
  ]
}
\`\`\``}</pre>
          </details>

          {/* JSON import format */}
          <div className="card space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-mono text-sky-400 mb-1">POST /api/import</p>
                <h2 className="font-[var(--font-display)] text-xl font-bold">JSON-импорт вручную</h2>
              </div>
              <span className="rounded border border-sky-500/30 px-2 py-0.5 text-xs text-sky-400 font-mono shrink-0">JSON</span>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Открой нужный pack → форма <strong className="text-zinc-200">«Импорт JSON»</strong> внизу страницы.
              Вставь объект с массивом <code className="rounded bg-white/10 px-1 text-xs font-mono">scenarios</code> — все сценарии добавятся сразу.
              Можно импортировать до 100 сценариев за раз.
            </p>
            <div className="space-y-2">
              <p className="text-xs text-zinc-500 uppercase tracking-widest">Минимальный формат</p>
              <pre className="overflow-x-auto rounded-lg bg-black/50 border border-white/10 p-3 text-xs text-zinc-300 font-mono leading-relaxed">
                {IMPORT_SCHEMA}
              </pre>
              <p className="text-xs text-zinc-500">
                Обязательные поля: <code className="text-zinc-400">title</code>, <code className="text-zinc-400">summary</code>, <code className="text-zinc-400">type</code>, <code className="text-zinc-400">difficulty</code>, <code className="text-zinc-400">durationMin</code>.{" "}
                Полная схема — <code className="text-zinc-400">schemas/wom.scenario.v1.json</code> в репозитории.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick tip */}
      <section className="card border-amber-500/20 bg-amber-500/5 space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-amber-400">Быстрый старт</p>
        <p className="text-sm text-zinc-300">
          Хочешь попробовать прямо сейчас?{" "}
          <Link href="/login" className="text-amber-400 hover:underline">Войди</Link>{" "}
          под <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs font-mono">demo / demo1234</code>,
          открой <strong>Starter Pack</strong> в галерее и переключись в{" "}
          <strong>Режим ведущего</strong>. Первый инцидент — через 30 секунд.
        </p>
      </section>
    </div>
  );
}
