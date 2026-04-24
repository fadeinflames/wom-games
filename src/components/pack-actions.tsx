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

  async function handleDelete() {
    if (!confirm(`Удалить сценарий «${title}»?`)) return;
    setBusy(true);
    await fetch(`/api/scenarios/${scenarioId}`, { method: "DELETE" });
    router.refresh();
    setBusy(false);
  }

  return (
    <button
      onClick={handleDelete}
      disabled={busy}
      className="text-xs text-zinc-500 hover:text-red-400 transition disabled:opacity-50"
      title="Удалить сценарий"
    >
      {busy ? "..." : "✕"}
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
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!confirm(`Удалить pack «${title}» и все его сценарии? Это нельзя отменить.`)) return;
    setBusy(true);
    await fetch(`/api/packs/${packId}`, { method: "DELETE" });
    window.location.href = "/dashboard";
  }

  return (
    <button
      onClick={handleDelete}
      disabled={busy}
      className="btn text-red-400 border-red-500/30 hover:border-red-400/60 hover:bg-red-500/10"
    >
      {busy ? "Удаление..." : "Удалить pack"}
    </button>
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
