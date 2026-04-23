"use client";

import { useState } from "react";

export function CreatePackForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const payload = {
      title: String(formData.get("title") || ""),
      description: String(formData.get("description") || ""),
      isPublic: formData.get("isPublic") === "on",
    };

    try {
      const res = await fetch("/api/packs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Не удалось создать pack");
        return;
      }

      const body = (await res.json()) as { id: string };
      window.location.href = `/packs/${body.id}`;
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3">
      <h2 className="font-[var(--font-display)] text-2xl font-bold">Новый game pack</h2>
      <input className="field" name="title" placeholder="Название pack (мин. 3 символа)" required minLength={3} />
      <textarea
        className="field min-h-28"
        name="description"
        placeholder="Описание pack (мин. 10 символов)"
        required
        minLength={10}
      />
      <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
        <input type="checkbox" name="isPublic" />
        Публичный pack (виден в галерее)
      </label>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <button className="btn btn-primary" disabled={loading}>
        {loading ? "Создаём…" : "Создать"}
      </button>
    </form>
  );
}
