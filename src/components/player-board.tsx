"use client";

import { useMemo, useState } from "react";
import {
  buildRoundActions,
  getIncidentPhase,
  panicStatusColor,
  panicStatusLabel,
  type GameAction,
  type ScenarioLite,
} from "@/lib/game";

const MAX_ROUNDS = 10;

type GamePhase = "playing" | "done";

type ScenarioContext = Record<string, unknown>;
type ScenarioTimelineEvent = { t?: number; type?: string; title?: string; body?: string };
type RichTextPart = { kind: "text" | "code"; value: string };

function asRecord(value: unknown): ScenarioContext {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as ScenarioContext)
    : {};
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function splitRichText(value: string): RichTextPart[] {
  const parts: RichTextPart[] = [];
  const fencePattern = /```(?:[a-zA-Z0-9_-]+)?\n?([\s\S]*?)```/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = fencePattern.exec(value)) !== null) {
    if (match.index > cursor) {
      parts.push({ kind: "text", value: value.slice(cursor, match.index) });
    }
    parts.push({ kind: "code", value: match[1].trim() });
    cursor = match.index + match[0].length;
  }

  if (cursor < value.length) {
    parts.push({ kind: "text", value: value.slice(cursor) });
  }

  return parts.length ? parts : [{ kind: "text", value }];
}

function renderInlineText(value: string) {
  const chunks = value.split(/(`[^`]+`)/g).filter(Boolean);
  return chunks.map((chunk, index) => {
    if (chunk.startsWith("`") && chunk.endsWith("`") && chunk.length > 1) {
      return (
        <code key={index} className="rounded bg-white/10 px-1 py-0.5 font-mono text-[0.92em] text-emerald-200">
          {chunk.slice(1, -1)}
        </code>
      );
    }
    return <span key={index}>{chunk}</span>;
  });
}

function RichText({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <div className={compact ? "space-y-1.5" : "space-y-3"}>
      {splitRichText(text).map((part, index) => {
        if (part.kind === "code") {
          return (
            <pre
              key={index}
              className="overflow-x-auto rounded-md border border-emerald-500/20 bg-black/55 p-3 font-mono text-xs leading-relaxed text-emerald-100 whitespace-pre-wrap"
            >
              <code>{part.value}</code>
            </pre>
          );
        }

        return part.value
          .split(/\n{2,}/)
          .map((paragraph) => paragraph.trim())
          .filter(Boolean)
          .map((paragraph, paragraphIndex) => (
            <p key={`${index}-${paragraphIndex}`} className={compact ? "text-xs leading-relaxed" : "text-sm leading-relaxed"}>
              {paragraph.split("\n").map((line, lineIndex) => (
                <span key={lineIndex}>
                  {lineIndex > 0 ? <br /> : null}
                  {renderInlineText(line)}
                </span>
              ))}
            </p>
          ));
      })}
    </div>
  );
}

export type PlayerEvent =
  | { kind: "start"; round: 1; phase: string }
  | {
      kind: "action";
      round: number;
      phase: string;
      action: GameAction;
      score: number;
      panic: number;
    }
  | { kind: "round"; round: number; phase: string }
  | { kind: "end"; round: number; phase: string; score: number };

type Props = {
  scenarios: ScenarioLite[];
  lockedScenarioId?: string | null;
  onEvent?: (event: PlayerEvent) => void;
  showScenarioPicker?: boolean;
};

export function PlayerBoard({
  scenarios,
  lockedScenarioId,
  onEvent,
  showScenarioPicker = true,
}: Props) {
  const [round, setRound] = useState(1);
  const [panic, setPanic] = useState(26);
  const [score, setScore] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [usedKeys, setUsedKeys] = useState<Set<string>>(new Set());
  const [gamePhase, setGamePhase] = useState<GamePhase>("playing");
  const [scenarioIdx, setScenarioIdx] = useState<number | null>(() => {
    if (!lockedScenarioId) return null;
    const idx = scenarios.findIndex((s) => s.id === lockedScenarioId);
    return idx >= 0 ? idx : null;
  });

  const lockedScenario = lockedScenarioId
    ? scenarios.find((item) => item.id === lockedScenarioId) ?? null
    : null;
  const pickedScenario = scenarioIdx !== null ? (scenarios[scenarioIdx] ?? null) : null;
  const scenario = lockedScenarioId ? lockedScenario : pickedScenario;
  const scenarioUnavailable = Boolean(lockedScenarioId && !lockedScenario);
  const elapsedMin = (round - 1) * 5;
  const context = scenario ? asRecord(scenario.contextJson) : {};
  const scenarioEvents = scenario ? asArray<ScenarioTimelineEvent>(scenario.eventsJson) : [];
  const revealedScenarioEvents = scenarioEvents
    .filter((event) => typeof event.t !== "number" || event.t <= elapsedMin)
    .sort((a, b) => (a.t ?? 0) - (b.t ?? 0))
    .slice(-5);
  const visibleScenarioEvents = revealedScenarioEvents.length > 0
    ? revealedScenarioEvents
    : scenarioEvents.slice(0, 1);

  const incidentPhase = getIncidentPhase(round);

  const choices = useMemo(
    () => (scenario ? buildRoundActions(scenario, round) : []),
    [scenario, round],
  );

  const locked = selectedAction !== null;
  const health = Math.max(44, 100 - panic);
  const errorRate = ((100 - health) / 2.1).toFixed(1);
  const p99 = Math.round(150 + panic * 8);

  function applyChoice(choice: ReturnType<typeof buildRoundActions>[number]) {
    if (locked || !scenario || usedKeys.has(choice.key)) return;
    const newScore = score + choice.impact;
    const newPanic = Math.max(5, panic - Math.round(choice.impact / 2));
    setSelectedAction(choice.key);
    setLastResult(choice.result);
    setUsedKeys((prev) => new Set([...prev, choice.key]));
    setScore(newScore);
    setPanic(newPanic);
    setHistory((prev) =>
      [`T+${elapsedMin}м [${incidentPhase.label}] → ${choice.title}`, ...prev].slice(0, 12),
    );
    onEvent?.({
      kind: "action",
      round,
      phase: incidentPhase.label,
      action: choice,
      score: newScore,
      panic: newPanic,
    });
  }

  function nextRound() {
    const nextRoundNum = round + 1;
    setSelectedAction(null);
    setLastResult(null);
    if (round >= MAX_ROUNDS) {
      setGamePhase("done");
      onEvent?.({ kind: "end", round, phase: incidentPhase.label, score });
      return;
    }
    const currentPhaseLabel = incidentPhase.label;
    const nextPhaseLabel = getIncidentPhase(nextRoundNum).label;
    if (currentPhaseLabel !== nextPhaseLabel) {
      setUsedKeys(new Set());
    }
    setRound(nextRoundNum);
    setPanic((prev) => Math.min(95, prev + 5));
    onEvent?.({ kind: "round", round: nextRoundNum, phase: nextPhaseLabel });
  }

  function resetGame() {
    setGamePhase("playing");
    setRound(1);
    setPanic(26);
    setScore(0);
    setHistory([]);
    setSelectedAction(null);
    setLastResult(null);
    setUsedKeys(new Set());
    if (showScenarioPicker && !lockedScenarioId) {
      setScenarioIdx(null);
    }
  }

  if (!scenario && !showScenarioPicker) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/55 p-8 text-center space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-amber-400">
          {scenarioUnavailable ? "Сценарий недоступен" : "Ждём ведущего"}
        </p>
        <p className="text-zinc-300">
          {scenarioUnavailable
            ? "Выбранный сценарий больше не найден в pack. Попроси ведущего создать новую сессию."
            : "Ведущий ещё не выбрал сценарий. Страница обновится автоматически."}
        </p>
      </div>
    );
  }

  if (scenarioIdx === null && showScenarioPicker) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/55 p-6 space-y-5">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">Выбери инцидент</p>
          <p className="mt-1 text-sm text-zinc-400">Один сценарий — 10 раундов расследования от Detection до Recovery.</p>
        </div>
        {scenarios.length === 0 ? (
          <p className="text-zinc-500">В этом паке нет сценариев.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {scenarios.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setScenarioIdx(i)}
                className="rounded-xl border border-white/15 bg-zinc-950/75 p-4 text-left transition hover:border-amber-400/60 hover:bg-zinc-900/80 cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-[var(--font-display)] text-base font-bold text-zinc-100 leading-snug group-hover:text-amber-300 transition-colors">
                    {s.title}
                  </span>
                  <span className={`rounded border px-2 py-0.5 text-xs font-mono shrink-0 ${
                    s.difficulty === "JUNIOR" ? "border-emerald-500/40 text-emerald-400" :
                    s.difficulty === "SENIOR" ? "border-red-500/40 text-red-400" :
                    "border-amber-500/40 text-amber-400"
                  }`}>
                    {s.difficulty}
                  </span>
                </div>
                <p className="text-sm text-zinc-400 leading-snug">{s.summary}</p>
                <p className="mt-2 text-xs text-zinc-600">{s.type} · {s.durationMin} мин</p>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // End-game screen
  if (gamePhase === "done") {
    const rank =
      score >= 150 ? "MASTER SRE" : score >= 100 ? "INCIDENT COMMANDER" : "ON-CALL ENGINEER";
    return (
      <div className="rounded-xl border border-amber-500/30 bg-black/60 p-8 text-center space-y-6">
        <p className="text-xs uppercase tracking-[0.2em] text-amber-400">Инцидент закрыт</p>
        <h2 className="font-[var(--font-display)] text-5xl font-black text-white">{rank}</h2>
        <div className="flex justify-center gap-8 text-sm">
          <div>
            <p className="text-zinc-500 uppercase tracking-widest text-xs">Score</p>
            <p className="text-3xl font-bold text-amber-400">{score}</p>
          </div>
          <div>
            <p className="text-zinc-500 uppercase tracking-widest text-xs">Время</p>
            <p className="text-3xl font-bold text-zinc-200">T+{elapsedMin}м</p>
          </div>
          <div>
            <p className="text-zinc-500 uppercase tracking-widest text-xs">Panic</p>
            <p className={`text-3xl font-bold ${panicStatusColor(panic)}`}>{panic}</p>
          </div>
        </div>
        {history.length > 0 && (
          <div className="text-left space-y-1 max-w-lg mx-auto">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Action log</p>
            {history.map((item, i) => (
              <div key={i} className="text-xs text-zinc-400">{item}</div>
            ))}
          </div>
        )}
        <button type="button" onClick={resetGame} className="btn btn-primary mx-auto">
          Новый инцидент
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/55">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-white/10 px-4 py-3 gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-[var(--font-display)] text-lg font-bold tracking-wide text-emerald-400">
            INCIDENT QUEST / PLAYER
          </span>
          <span className="rounded border border-white/15 px-2 py-1 text-xs text-zinc-300">
            ROUND {round}/{MAX_ROUNDS}
          </span>
          <span className={`rounded border px-2 py-1 text-xs font-mono border-current ${incidentPhase.color}`}>
            {incidentPhase.label}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-400">Score: {score}</span>
          <button type="button" className="btn" onClick={resetGame}>↺ Reset</button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={nextRound}
            disabled={!locked}
          >
            {round >= MAX_ROUNDS ? "Завершить инцидент" : "Следующий шаг →"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Left */}
        <section className="space-y-4">
          {/* Incident card — stays the same throughout */}
          <div className="rounded-xl border border-white/10 bg-zinc-950/80 p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">Активный инцидент</p>
              <span className="text-xs text-zinc-500 font-mono shrink-0">T+{elapsedMin} мин</span>
            </div>
            {scenario ? (
              <div className="mt-3 space-y-2">
                <h2 className="font-[var(--font-display)] text-3xl font-bold">{scenario.title}</h2>
                <p className="text-zinc-300">{scenario.summary}</p>
                <p className="text-sm text-zinc-500">
                  {scenario.type} · {scenario.durationMin} мин · {scenario.difficulty}
                </p>
                {Object.keys(context).length > 0 && (
                  <div className="mt-4 grid gap-2 text-xs text-zinc-400 sm:grid-cols-2">
                    {Object.entries(context).slice(0, 6).map(([key, value]) => (
                      <div key={key} className="rounded-lg border border-white/10 bg-black/30 p-2">
                        <p className="uppercase tracking-widest text-zinc-600">{key}</p>
                        <p className="mt-1 text-zinc-300">
                          {Array.isArray(value) ? value.join(", ") : String(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-3 text-zinc-400">Нет сценариев в этом pack.</p>
            )}
          </div>

          {/* Phase label */}
          {scenario && (
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono uppercase tracking-widest ${incidentPhase.color}`}>
                {incidentPhase.label}
              </span>
              <span className="text-xs text-zinc-500">— {incidentPhase.sublabel}</span>
            </div>
          )}

          {/* Actions — change each phase */}
          {scenario && (
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Выбери действие</p>
              <div className="grid gap-3 md:grid-cols-2">
                {choices.map((choice) => (
                  <button
                    key={choice.key}
                    type="button"
                    className={`rounded-xl border bg-zinc-950/75 p-4 text-left transition border-white/15 ${
                      selectedAction === choice.key
                        ? "ring-1 ring-amber-400 border-amber-400/50"
                        : usedKeys.has(choice.key) && selectedAction !== choice.key
                        ? "opacity-25 cursor-not-allowed line-through decoration-zinc-600"
                        : locked
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:border-amber-300/70 cursor-pointer"
                    }`}
                    onClick={() => applyChoice(choice)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-base font-semibold text-zinc-100 leading-snug">{choice.title}</p>
                      <span className="rounded border border-white/20 px-2 py-0.5 text-xs text-zinc-400 shrink-0">
                        {choice.variant}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-zinc-400">{choice.body}</p>
                  </button>
                ))}
              </div>

              {/* Result card — appears after choice */}
              {lastResult && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-4 space-y-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">Результат</p>
                  <div className="text-zinc-200">
                    <RichText text={lastResult} />
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Right sidebar */}
        <aside className="space-y-4">
          {/* Panic */}
          <div className="rounded-xl border border-white/10 bg-zinc-950/80 p-4">
            <div className="flex items-center justify-between text-sm text-zinc-300">
              <span className="uppercase tracking-[0.2em] text-zinc-500">Panic level</span>
              <span className={panicStatusColor(panic)}>{panicStatusLabel(panic)}</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-zinc-800">
              <div
                className="h-2 rounded-full bg-emerald-400 transition-all"
                style={{ width: `${Math.max(8, 100 - panic)}%` }}
              />
            </div>
          </div>

          {/* Service health */}
          <div className="rounded-xl border border-white/10 bg-zinc-950/80 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Service health</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                <p className="text-xs text-zinc-500">Availability</p>
                <p className="text-2xl font-bold text-emerald-400">{health.toFixed(1)}%</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                <p className="text-xs text-zinc-500">Error rate</p>
                <p className="text-2xl font-bold text-amber-300">{errorRate}%</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                <p className="text-xs text-zinc-500">Orders/min</p>
                <p className="text-2xl font-bold text-sky-300">
                  {Math.max(90, Math.round(390 - panic * 2.3))}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                <p className="text-xs text-zinc-500">P99</p>
                <p className="text-2xl font-bold text-red-300">{p99}ms</p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-xl border border-white/10 bg-zinc-950/80 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Timeline</p>
            <div className="mt-3 space-y-2">
              {visibleScenarioEvents.map((event, i) => (
                <div key={`scenario-${i}`} className="rounded border border-amber-500/15 bg-amber-500/5 p-2 text-xs">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-amber-400">
                    T+{event.t ?? "?"}м {event.type ? `· ${event.type}` : ""}
                  </p>
                  {event.title && <p className="mt-1 font-semibold text-zinc-200">{event.title}</p>}
                  {event.body && (
                    <div className="mt-1 text-zinc-400">
                      <RichText text={event.body} compact />
                    </div>
                  )}
                </div>
              ))}
              {history.map((item, i) => (
                <div key={i} className="rounded border border-white/10 bg-black/30 p-2 text-xs text-zinc-300">
                  {item}
                </div>
              ))}
              {!history.length && !revealedScenarioEvents.length ? (
                <p className="text-sm text-zinc-500">История действий появится здесь.</p>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
