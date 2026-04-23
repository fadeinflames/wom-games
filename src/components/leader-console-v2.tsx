"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { difficultyColor, getIncidentPhase } from "@/lib/game";
import type { Difficulty } from "@prisma/client";

type ScenarioRich = {
  id: string;
  title: string;
  summary: string;
  difficulty: Difficulty;
  durationMin: number;
  type: string;
  hintsJson: unknown;
  gmScriptJson: unknown;
  actionsJson: unknown;
  contextJson: unknown;
  eventsJson: unknown;
};

type RecentSession = {
  id: string;
  code: string;
  status: string;
  createdAt: string;
  scenarioTitle: string | null;
};

type SessionDetail = {
  id: string;
  code: string;
  status: string;
  scenarioId: string | null;
  scenario: ScenarioRich | null;
  events: Array<{
    id: string;
    kind: string;
    round: number;
    phase: string | null;
    actionKey: string | null;
    actionTitle: string | null;
    actionVariant: string | null;
    actionResult: string | null;
    score: number;
    panic: number;
    createdAt: string;
  }>;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

type ScenarioHint = { when?: string; gm?: string; chat?: string; team?: string };
type ScenarioAction = { id?: string; cat?: string; label?: string; response?: string; gmHint?: string };
type ScenarioEvent = { t?: number; type?: string; title?: string; body?: string };
type GmBeat = { at?: number; tip?: string };
type GmPressure = { at?: number; msg?: string; who?: string };
type GmCheckpoint = { step?: string; triggers?: string[] };

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function LeaderConsole({
  packId,
  scenarios,
  recentSessions,
}: {
  packId: string;
  scenarios: ScenarioRich[];
  recentSessions: RecentSession[];
}) {
  const [activeCode, setActiveCode] = useState<string | null>(() => {
    const active = recentSessions.find((s) => s.status !== "ended");
    return active?.code ?? null;
  });
  const [chosenScenarioId, setChosenScenarioId] = useState<string>(scenarios[0]?.id ?? "");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createSession(scenarioId: string | null) {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId, scenarioId }),
      });
      const data = (await res.json().catch(() => ({}))) as { code?: string; error?: string };
      if (!res.ok || !data.code) {
        setError(data.error ?? "Не удалось создать сессию");
        return;
      }
      setActiveCode(data.code);
    } catch {
      setError("Ошибка соединения");
    } finally {
      setCreating(false);
    }
  }

  function spinWheel() {
    if (!scenarios.length) return;
    const random = scenarios[Math.floor(Math.random() * scenarios.length)];
    setChosenScenarioId(random.id);
  }

  if (!activeCode) {
    return (
      <div className="space-y-4">
        <div className="card space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">1. Выбор сценария</p>
            <p className="mt-1 text-sm text-zinc-400">
              Выбери сценарий сам или крутани колесо — игрок получит именно этот инцидент.
            </p>
          </div>

          {scenarios.length === 0 ? (
            <p className="text-sm text-zinc-500">В паке ещё нет сценариев.</p>
          ) : (
            <>
              <div className="grid gap-2 md:grid-cols-2">
                {scenarios.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setChosenScenarioId(s.id)}
                    className={`rounded-lg border p-3 text-left transition ${
                      chosenScenarioId === s.id
                        ? "border-amber-400/80 bg-amber-500/10"
                        : "border-white/10 bg-zinc-950/60 hover:border-amber-400/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-zinc-100 leading-snug">{s.title}</p>
                      <span
                        className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-mono uppercase ${difficultyColor(s.difficulty)}`}
                      >
                        {s.difficulty}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">{s.type} · {s.durationMin} мин</p>
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn" onClick={spinWheel}>
                  🎡 Крутить колесо
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={creating || !chosenScenarioId}
                  onClick={() => createSession(chosenScenarioId || null)}
                >
                  {creating ? "Создаём…" : "Стартовать сессию"}
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={creating}
                  onClick={() => createSession(null)}
                >
                  Дать выбор игроку
                </button>
              </div>
            </>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        {recentSessions.length > 0 && (
          <div className="card space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Последние сессии</p>
            <div className="space-y-2">
              {recentSessions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveCode(s.code)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-zinc-950/60 p-3 text-left hover:border-amber-400/40"
                >
                  <div>
                    <p className="font-mono text-sm text-amber-300">{s.code}</p>
                    <p className="text-xs text-zinc-500" suppressHydrationWarning>
                      {s.scenarioTitle ?? "без сценария"} · {formatTime(s.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`rounded border px-2 py-0.5 text-xs font-mono ${
                      s.status === "ended"
                        ? "border-zinc-600 text-zinc-500"
                        : s.status === "active"
                        ? "border-emerald-500/50 text-emerald-400"
                        : "border-amber-500/50 text-amber-300"
                    }`}
                  >
                    {s.status}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <ActiveSessionPanel
      packId={packId}
      code={activeCode}
      onLeave={() => setActiveCode(null)}
    />
  );
}

function ActiveSessionPanel({
  packId,
  code,
  onLeave,
}: {
  packId: string;
  code: string;
  onLeave: () => void;
}) {
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${code}`, { cache: "no-store" });
      if (!res.ok) {
        setLoadError("Сессия не найдена");
        return;
      }
      const data = (await res.json()) as { session: SessionDetail };
      setSession(data.session);
      setLoadError(null);
    } catch {
      setLoadError("Ошибка соединения");
    }
  }, [code]);

  useEffect(() => {
    fetchSession();
    pollRef.current = setInterval(fetchSession, 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchSession]);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return `/session/${code}`;
    return `${window.location.origin}/session/${code}`;
  }, [code]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  async function endSession() {
    if (!confirm("Завершить сессию? Игрок увидит экран окончания.")) return;
    await fetch(`/api/sessions/${code}`, { method: "DELETE" });
    await fetchSession();
  }

  const scenario = session?.scenario ?? null;
  const events = session?.events ?? [];
  const actionEvents = events.filter((e) => e.kind === "action");
  const lastAction = actionEvents.at(-1) ?? null;
  const currentRoundEvent = events.filter((e) => e.kind === "round").at(-1);
  const currentRound = lastAction?.round ?? currentRoundEvent?.round ?? 1;
  const phaseInfo = getIncidentPhase(currentRound);
  const totalScore = lastAction?.score ?? 0;

  const hints = scenario ? asArray<ScenarioHint>(scenario.hintsJson) : [];
  const gmScript = scenario ? asRecord(scenario.gmScriptJson) : {};
  const scenarioActions = scenario ? asArray<ScenarioAction>(scenario.actionsJson) : [];
  const scenarioEvents = scenario ? asArray<ScenarioEvent>(scenario.eventsJson) : [];
  const context = scenario ? asRecord(scenario.contextJson) : {};

  if (loadError && !session) {
    return (
      <div className="card space-y-3">
        <p className="text-sm text-red-400">{loadError}</p>
        <button className="btn" onClick={onLeave}>← Вернуться к выбору</button>
      </div>
    );
  }

  if (!session) {
    return <div className="card text-sm text-zinc-400">Загружаем сессию…</div>;
  }

  const isEnded = session.status === "ended";

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-[0.2em] text-emerald-400">Код сессии</span>
            <span className="font-mono text-2xl font-bold tracking-widest text-amber-300">{code}</span>
            {isEnded && (
              <span className="rounded border border-zinc-600 px-2 py-0.5 text-xs font-mono text-zinc-500">
                ЗАВЕРШЕНА
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn" onClick={onLeave}>
              ← К выбору
            </button>
            {!isEnded && (
              <button type="button" className="btn" onClick={endSession}>
                Завершить сессию
              </button>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">
            Ссылка для игрока
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap rounded bg-black/40 px-2 py-1 font-mono text-xs text-zinc-200">
              {shareUrl}
            </code>
            <button type="button" className="btn" onClick={copyLink}>
              {copied ? "✓ Скопировано" : "📋 Скопировать"}
            </button>
            <a
              className="btn"
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
            >
              ↗ Открыть
            </a>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Отправь игроку — он откроет страницу и начнёт играть.
          </p>
        </div>
      </div>

      {!scenario && !isEnded && (
        <div className="card space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-400">Ждём выбора сценария</p>
          <p className="text-sm text-zinc-400">
            Сценарий ещё не выбран — игрок выберет его сам, или вернись назад и задай сценарий явно.
          </p>
        </div>
      )}

      {scenario && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-4">
            <div className="card space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs uppercase tracking-[0.2em] text-emerald-400">Активный сценарий</span>
                <span
                  className={`rounded border px-2 py-0.5 text-xs font-mono uppercase ${difficultyColor(scenario.difficulty)}`}
                >
                  {scenario.difficulty}
                </span>
              </div>
              <h2 className="font-[var(--font-display)] text-2xl font-bold">{scenario.title}</h2>
              <p className="text-sm text-zinc-300">{scenario.summary}</p>
              <p className="text-xs text-zinc-500">
                {scenario.type} · {scenario.durationMin} мин
              </p>

              {Object.keys(context).length > 0 && (
                <div className="mt-3 rounded border border-white/10 bg-black/30 p-3 text-xs text-zinc-400 space-y-1">
                  {Object.entries(context).map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <span className="shrink-0 uppercase tracking-widest text-zinc-500">{k}:</span>
                      <span className="text-zinc-300">
                        {Array.isArray(v) ? v.join(", ") : String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">Текущее состояние</span>
                  <span className="rounded border border-white/15 px-2 py-0.5 text-xs text-zinc-300">
                    ROUND {currentRound}/10
                  </span>
                  <span className={`rounded border px-2 py-0.5 text-xs font-mono border-current ${phaseInfo.color}`}>
                    {phaseInfo.label}
                  </span>
                </div>
                <span className="text-sm text-zinc-400">Score игрока: {totalScore}</span>
              </div>
              <p className="text-xs text-zinc-500">{phaseInfo.sublabel}</p>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Живая лента игрока</p>
                {actionEvents.length === 0 ? (
                  <p className="text-sm text-zinc-500">
                    Ждём первое действие игрока…
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[420px] overflow-y-auto">
                    {[...actionEvents].reverse().map((e) => (
                      <div key={e.id} className="rounded-lg border border-white/10 bg-black/40 p-3">
                        <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
                          <span suppressHydrationWarning>
                            R{e.round} · {e.phase} · {formatTime(e.createdAt)}
                          </span>
                          {e.actionVariant && (
                            <span className="rounded border border-white/15 px-1.5 py-0 font-mono">
                              {e.actionVariant}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm font-semibold text-zinc-100">{e.actionTitle}</p>
                        {e.actionResult && (
                          <p className="mt-1 text-xs text-zinc-400 leading-relaxed">{e.actionResult}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="card space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-amber-400">🎯 Шпаргалка ведущего</p>
              <p className="text-xs text-zinc-500">
                Что подсказывать игроку по ходу фазы {phaseInfo.label}.
              </p>
            </div>

            {hints.length > 0 && (
              <div className="card space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Подсказки</p>
                <div className="space-y-2">
                  {hints.map((h, i) => (
                    <div key={i} className="rounded border border-white/10 bg-black/30 p-2 text-xs">
                      {h.when && (
                        <p className="font-semibold text-amber-300">Если: {h.when}</p>
                      )}
                      {h.gm && (
                        <p className="text-zinc-300">
                          <span className="text-zinc-500">GM:</span> {h.gm}
                        </p>
                      )}
                      {h.chat && (
                        <p className="text-zinc-400">
                          <span className="text-zinc-500">Вброс:</span> {h.chat}
                        </p>
                      )}
                      {h.team && (
                        <p className="text-zinc-400">
                          <span className="text-zinc-500">Команде:</span> {h.team}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Object.keys(gmScript).length > 0 && (
              <div className="card space-y-3">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">GM Script</p>

                {asArray<GmBeat>(gmScript.beats).length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-400">Beats (подсказки по раундам)</p>
                    <div className="space-y-1 text-xs">
                      {asArray<GmBeat>(gmScript.beats).map((b, i) => (
                        <div key={i} className="rounded border border-white/10 bg-black/30 p-2">
                          <p className="text-zinc-500 font-mono text-[10px]">R{b.at ?? "?"}</p>
                          <p className="text-zinc-300 leading-snug">{b.tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {asArray<GmPressure>(gmScript.pressure).length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-amber-400">Pressure (давящие инжекты)</p>
                    <div className="space-y-1 text-xs">
                      {asArray<GmPressure>(gmScript.pressure).map((p, i) => (
                        <div key={i} className="rounded border border-white/10 bg-black/30 p-2">
                          <p className="text-zinc-500 font-mono text-[10px]">
                            R{p.at ?? "?"}{p.who ? ` · ${p.who}` : ""}
                          </p>
                          <p className="text-zinc-300 leading-snug">{p.msg}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {asArray<GmCheckpoint>(gmScript.checkpoints).length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-400">Checkpoints (ключевые шаги)</p>
                    <ol className="list-decimal pl-5 space-y-1 text-xs text-zinc-300">
                      {asArray<GmCheckpoint>(gmScript.checkpoints).map((c, i) => (
                        <li key={i}>
                          <p className="leading-snug">{c.step}</p>
                          {Array.isArray(c.triggers) && c.triggers.length > 0 && (
                            <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
                              → {c.triggers.join(", ")}
                            </p>
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {Object.entries(gmScript).filter(([k]) => !["beats", "pressure", "checkpoints"].includes(k)).map(([k, v]) => (
                  <div key={k} className="rounded border border-white/10 bg-black/30 p-2 text-xs">
                    <p className="uppercase tracking-widest text-zinc-500 mb-1 text-[10px]">{k}</p>
                    {Array.isArray(v) ? (
                      <ul className="list-disc pl-4 text-zinc-300 space-y-0.5">
                        {v.map((item, i) => (
                          <li key={i}>{typeof item === "string" ? item : JSON.stringify(item)}</li>
                        ))}
                      </ul>
                    ) : typeof v === "object" && v !== null ? (
                      <pre className="whitespace-pre-wrap text-zinc-300">{JSON.stringify(v, null, 2)}</pre>
                    ) : (
                      <p className="text-zinc-300">{String(v)}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {scenarioEvents.length > 0 && (
              <div className="card space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Таймлайн инцидента</p>
                <div className="space-y-1 text-xs">
                  {scenarioEvents.map((e, i) => (
                    <div key={i} className="rounded border border-white/10 bg-black/30 p-2">
                      <p className="text-zinc-500 font-mono">
                        T+{e.t ?? "?"}м {e.type ? `· ${e.type}` : ""}
                      </p>
                      {e.title && <p className="font-semibold text-zinc-200 leading-snug">{e.title}</p>}
                      {e.body && <p className="text-zinc-400 mt-0.5 leading-relaxed">{e.body}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {scenarioActions.length > 0 && (
              <div className="card space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Правильные действия</p>
                <div className="space-y-1 text-xs">
                  {scenarioActions.map((a, i) => (
                    <div key={i} className="rounded border border-white/10 bg-black/30 p-2">
                      <p className="font-semibold text-zinc-200">
                        {a.cat && <span className="text-zinc-500 mr-1 uppercase">[{a.cat}]</span>}
                        {a.label}
                      </p>
                      {a.response && <p className="text-zinc-400 mt-0.5">{a.response}</p>}
                      {a.gmHint && (
                        <p className="text-amber-300/80 mt-0.5">
                          <span className="text-amber-400/70">GM:</span> {a.gmHint}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="card">
              <Link className="text-xs text-zinc-400 hover:text-zinc-200" href={`/packs/${packId}`}>
                К настройкам pack →
              </Link>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
