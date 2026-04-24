"use client";

import { useCallback, useEffect, useState } from "react";
import { PlayerBoard, type PlayerEvent } from "@/components/player-board";
import type { ScenarioLite } from "@/lib/game";

type Props = {
  code: string;
  initialStatus: string;
  initialScenarioId: string | null;
  scenarios: ScenarioLite[];
};

export function SessionPlayer({ code, initialStatus, initialScenarioId, scenarios }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [scenarioId, setScenarioId] = useState<string | null>(initialScenarioId);
  const [picking, setPicking] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);

  // Keep the player synchronized with the GM while the session is open.
  useEffect(() => {
    if (status === "ended") return;
    const pollSession = async () => {
      try {
        const res = await fetch(`/api/sessions/${code}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          session: { scenarioId: string | null; status: string };
        };
        setStatus(data.session.status);
        if (!scenarioId && data.session.scenarioId) {
          setScenarioId(data.session.scenarioId);
        }
      } catch {
        // ignore
      }
    };
    const initialPoll = setTimeout(pollSession, 0);
    const timer = setInterval(async () => {
      await pollSession();
    }, 2500);
    return () => {
      clearTimeout(initialPoll);
      clearInterval(timer);
    };
  }, [code, scenarioId, status]);

  const sendEvent = useCallback(
    async (event: PlayerEvent) => {
      try {
        const body: Record<string, unknown> = {
          kind: event.kind,
          round: event.kind === "action" || event.kind === "round" || event.kind === "end"
            ? event.round
            : 1,
          phase: event.phase ?? null,
          score: 0,
          panic: 0,
        };
        if (event.kind === "action") {
          body.actionKey = event.action.key;
          body.actionTitle = event.action.title;
          body.actionVariant = event.action.variant;
          body.actionResult = event.action.result;
          body.score = event.score;
          body.panic = event.panic;
        }
        if (event.kind === "end") {
          body.score = event.score;
        }
        await fetch(`/api/sessions/${code}/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } catch {
        // ignore — player can keep playing even if logging fails
      }
    },
    [code],
  );

  async function pickScenario(id: string) {
    setPicking(true);
    setPickError(null);
    try {
      const res = await fetch(`/api/sessions/${code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: id }),
      });
      const data = (await res.json().catch(() => ({}))) as { scenarioId?: string; error?: string };
      if (!res.ok) {
        setPickError(data.error ?? "Не удалось выбрать сценарий");
        return;
      }
      setScenarioId(data.scenarioId ?? id);
      setStatus("active");
    } catch {
      setPickError("Ошибка соединения");
    } finally {
      setPicking(false);
    }
  }

  if (status === "ended") {
    return (
      <div className="card space-y-3 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Сессия</p>
        <h2 className="font-[var(--font-display)] text-2xl font-bold">Игра завершена</h2>
        <p className="text-sm text-zinc-400">Ведущий закрыл эту сессию.</p>
      </div>
    );
  }

  if (!scenarioId) {
    return (
      <div className="card space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-amber-400">Ведущий дал выбор тебе</p>
        <p className="text-sm text-zinc-400">Выбери сценарий — ведущий увидит его и будет вести игру.</p>
        <div className="grid gap-2 md:grid-cols-2">
          {scenarios.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={picking}
              onClick={() => pickScenario(s.id)}
              className="rounded-lg border border-white/10 bg-zinc-950/60 p-3 text-left transition hover:border-amber-400/50 disabled:opacity-60"
            >
              <p className="font-semibold text-zinc-100 leading-snug">{s.title}</p>
              <p className="mt-1 text-xs text-zinc-500">{s.summary}</p>
              <p className="mt-1 text-xs text-zinc-600">{s.type} · {s.durationMin} мин · {s.difficulty}</p>
            </button>
          ))}
        </div>
        {pickError && <p className="text-sm text-red-400">{pickError}</p>}
      </div>
    );
  }

  return (
    <PlayerBoard
      key={scenarioId}
      scenarios={scenarios}
      lockedScenarioId={scenarioId}
      showScenarioPicker={false}
      onEvent={sendEvent}
    />
  );
}
