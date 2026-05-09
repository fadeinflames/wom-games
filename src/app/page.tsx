import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

const INCIDENT_STEPS = [
  {
    step: "01",
    title: "Собери пак",
    body: "Добавь сценарии вручную или импортируй JSON из заметок, runbook и разбора реального инцидента.",
    tag: "setup",
  },
  {
    step: "02",
    title: "Запусти сессию",
    body: "Ведущий выбирает кейс или отдаёт выбор игроку, получает код и ссылку для команды.",
    tag: "gm",
  },
  {
    step: "03",
    title: "Веди расследование",
    body: "Игрок проходит 10 раундов, выбирает действия, а ведущий видит ленту, подсказки и чекпоинты.",
    tag: "play",
  },
  {
    step: "04",
    title: "Разбери решение",
    body: "Score, panic, health и action log превращают тренировку в конкретный debrief, а не разговор по памяти.",
    tag: "review",
  },
] as const;

const SAMPLE_EVENTS = [
  ["T+00", "Alertmanager", "5xx вырос до 18.4%"],
  ["T+05", "Ingress", "часть трафика получает 503"],
  ["T+12", "Rollback", "ошибки падают, p99 ещё высокий"],
] as const;

const IMPORT_SCHEMA = `{
  "scenarios": [
    {
      "title": "Слепой DNS",
      "summary": "Сервис периодически не резолвит внутренние имена.",
      "type": "DNS, CoreDNS, NetworkPolicy",
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

function IncidentPreview() {
  return (
    <div className="panel-strong relative overflow-hidden p-0">
      <div className="border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="muted-label">Live drill</p>
            <h2 className="mt-1 font-[var(--font-display)] text-2xl font-bold">Слепой DNS</h2>
          </div>
          <span className="status-pill border-amber-400/40 text-amber-300">ROUND 04</span>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_230px]">
        <div className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["panic", "42", "amber"],
              ["health", "71.6%", "emerald"],
              ["p99", "486ms", "cyan"],
            ].map(([label, value, tone]) => (
              <div key={label} className="border-t border-white/10 pt-3">
                <p className="muted-label">{label}</p>
                <p
                  className={`mt-1 font-mono text-2xl font-bold ${
                    tone === "amber"
                      ? "text-amber-300"
                      : tone === "emerald"
                      ? "text-emerald-300"
                      : "text-cyan-300"
                  }`}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="panel space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="kicker text-emerald-300">Action window</p>
              <span className="font-mono text-xs text-zinc-500">Detection</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {["Проверить CoreDNS logs", "Сравнить NetworkPolicy", "Объявить статус", "Откатить ingress rule"].map(
                (action, index) => (
                  <div
                    key={action}
                    className={`rounded-md border px-3 py-2 text-sm ${
                      index === 1
                        ? "border-amber-400/50 bg-amber-400/10 text-amber-100"
                        : "border-white/10 bg-white/[0.025] text-zinc-300"
                    }`}
                  >
                    {action}
                  </div>
                ),
              )}
            </div>
          </div>
        </div>

        <aside className="border-t border-white/10 p-4 lg:border-l lg:border-t-0">
          <p className="muted-label">Incident feed</p>
          <div className="mt-3 space-y-3">
            {SAMPLE_EVENTS.map(([time, source, body]) => (
              <div key={time} className="border-l border-white/10 pl-3">
                <p className="font-mono text-[11px] text-amber-300">{time}</p>
                <p className="mt-1 text-sm font-semibold text-zinc-200">{source}</p>
                <p className="text-xs leading-relaxed text-zinc-500">{body}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <div className="space-y-14">
      <section className="grid min-h-[calc(100dvh-9rem)] items-center gap-8 py-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="max-w-2xl">
          <p className="kicker">Open-source SRE training room</p>
          <h1 className="mt-5 font-[var(--font-display)] text-4xl font-black leading-[1.02] md:text-6xl">
            Инциденты, которые можно проиграть до настоящей ночной смены.
          </h1>
          <p className="mt-5 max-w-[64ch] text-lg leading-relaxed text-zinc-300">
            Wheel of Misfortune превращает incident review в живую тренировку: ведущий запускает кейс,
            игрок выбирает действия, а система ведёт panic, service health и историю решений.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            {user ? (
              <>
                <Link href="/dashboard" className="btn btn-primary">Открыть мои игры</Link>
                <Link href="/gallery" className="btn">Взять публичный пак</Link>
              </>
            ) : (
              <>
                <Link href="/register" className="btn btn-primary">Начать тренировку</Link>
                <Link href="/login" className="btn">Войти demo</Link>
                <Link href="/gallery" className="btn">Галерея</Link>
              </>
            )}
          </div>

          <dl className="mt-8 grid max-w-xl grid-cols-3 gap-4 border-t border-white/10 pt-5">
            {[
              ["10", "раундов"],
              ["4", "типа действий"],
              ["2", "режима игры"],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="font-mono text-2xl font-bold text-zinc-100">{value}</dt>
                <dd className="mt-1 text-xs uppercase tracking-[0.14em] text-zinc-500">{label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <IncidentPreview />
      </section>

      <section className="space-y-5">
        <div className="flex items-center gap-3">
          <p className="kicker">Workflow</p>
          <div className="h-px flex-1 bg-white/10" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {INCIDENT_STEPS.map(({ step, title, body, tag }) => (
            <article key={step} className="border-t border-white/10 pt-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-sm text-amber-300">{step}</span>
                <span className="status-pill text-zinc-500">{tag}</span>
              </div>
              <h2 className="mt-4 font-[var(--font-display)] text-xl font-bold">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="panel-strong space-y-4">
          <p className="kicker text-emerald-300">Scenario intake</p>
          <h2 className="font-[var(--font-display)] text-3xl font-bold">Импорт без ручной рутины</h2>
          <p className="max-w-[62ch] text-sm leading-relaxed text-zinc-400">
            В репозитории есть skill для преобразования incident notes в JSON. Он помогает собрать
            контекст, таймлайн, подсказки ведущего и варианты действий, а затем загрузить всё в пак.
          </p>
          <ol className="space-y-2 text-sm text-zinc-300">
            {[
              "Опиши инцидент или вставь runbook.",
              "Попроси агента собрать JSON для WOM.",
              "Импортируй сценарии на странице пака.",
            ].map((item, index) => (
              <li key={item} className="flex gap-3">
                <span className="font-mono text-amber-300">{String(index + 1).padStart(2, "0")}</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="panel-strong space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-xs text-cyan-300">POST /api/import</p>
              <h2 className="mt-1 font-[var(--font-display)] text-2xl font-bold">Минимальный формат</h2>
            </div>
            <span className="status-pill border-cyan-400/30 text-cyan-300">JSON</span>
          </div>
          <pre className="code-panel whitespace-pre-wrap">{IMPORT_SCHEMA}</pre>
          <p className="text-xs leading-relaxed text-zinc-500">
            Полная схема лежит в <code className="rounded bg-white/10 px-1 font-mono text-zinc-300">schemas/wom.scenario.v1.json</code>.
          </p>
        </div>
      </section>

      <section className="panel-strong flex flex-wrap items-center justify-between gap-4 border-amber-400/20 bg-amber-400/[0.045]">
        <div>
          <p className="kicker">Быстрый старт</p>
          <p className="mt-2 text-sm text-zinc-300">
            Для проверки войди под <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs">demo / demo1234</code>,
            открой Starter Pack и запусти режим ведущего.
          </p>
        </div>
        <Link href={user ? "/dashboard" : "/login"} className="btn btn-primary">
          {user ? "Перейти к играм" : "Открыть вход"}
        </Link>
      </section>
    </div>
  );
}
