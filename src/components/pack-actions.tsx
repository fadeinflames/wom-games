"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteScenarioButton({
  scenarioId,
  title,
}: {
  scenarioId: string;
  title: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleDelete() {
    setBusy(true);
    await fetch(`/api/scenarios/${scenarioId}`, { method: "DELETE" });
    router.refresh();
    setBusy(false);
    setConfirming(false);
  }

  if (confirming) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-zinc-500">Удалить?</span>
        <button
          onClick={handleDelete}
          disabled={busy}
          className="btn btn-danger min-h-8 px-2 py-1 text-xs"
          title={`Удалить сценарий ${title}`}
        >
          {busy ? "..." : "Да"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="btn min-h-8 px-2 py-1 text-xs"
          disabled={busy}
        >
          Нет
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      disabled={busy}
      className="btn btn-danger min-h-8 px-2 py-1 text-xs"
      title="Удалить сценарий"
    >
      Удалить
    </button>
  );
}

export function DeletePackButton({
  packId,
  title,
}: {
  packId: string;
  title: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleDelete() {
    setBusy(true);
    await fetch(`/api/packs/${packId}`, { method: "DELETE" });
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {confirming ? (
        <>
          <button
            onClick={handleDelete}
            disabled={busy}
            className="btn btn-danger"
            title={`Удалить пак ${title}`}
          >
            {busy ? "Удаляем..." : "Удалить навсегда"}
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="btn" disabled={busy}>
            Отмена
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={busy}
          className="btn btn-danger"
        >
          Удалить пак
        </button>
      )}
    </div>
  );
}

export function TogglePublicButton({
  packId,
  isPublic,
}: {
  packId: string;
  isPublic: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleToggle() {
    setBusy(true);
    await fetch(`/api/packs/${packId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic: !isPublic }),
    });
    router.refresh();
    setBusy(false);
  }

  return (
    <button
      onClick={handleToggle}
      disabled={busy}
      className={`btn ${isPublic ? "border-emerald-500/40 text-emerald-400 hover:border-red-400 hover:text-red-400" : "border-zinc-500/40 text-zinc-400 hover:border-emerald-400 hover:text-emerald-400"}`}
    >
      {busy ? "..." : isPublic ? "Скрыть из галереи" : "Опубликовать в галерею"}
    </button>
  );
}
