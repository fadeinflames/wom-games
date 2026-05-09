"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreatePackForm() {
  const router = useRouter();
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
        setError(data.error ?? "Не удалось создать пак");
        return;
      }

      const body = (await res.json()) as { id: string };
      router.push(`/packs/${body.id}`);
      router.refresh();
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="panel-strong mx-auto w-full max-w-2xl space-y-5">
      <div>
        <p className="kicker">New drill pack</p>
        <h2 className="mt-2 font-[var(--font-display)] text-3xl font-bold">Новый пак сценариев</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Назови набор так, чтобы ведущий сразу понял уровень команды и тему тренировки.
        </p>
      </div>
      <div className="space-y-2">
        <label className="muted-label block" htmlFor="title">Название</label>
        <input id="title" className="field" name="title" placeholder="Kubernetes networking drills" required minLength={3} />
      </div>
      <div className="space-y-2">
        <label className="muted-label block" htmlFor="description">Описание</label>
        <textarea
          id="description"
          className="field min-h-28"
          name="description"
          placeholder="Коротко: какие инциденты внутри, кому подходит и как проводить."
          required
          minLength={10}
        />
      </div>
      <label className="panel flex cursor-pointer items-start gap-3 text-sm text-zinc-300">
        <input type="checkbox" name="isPublic" className="mt-1 accent-amber-400" />
        <span>
          <span className="block font-medium text-zinc-200">Опубликовать в галерее</span>
          <span className="mt-1 block text-xs leading-relaxed text-zinc-500">
            Публичные паки видны другим пользователям и доступны для режима игрока.
          </span>
        </span>
      </label>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <button className="btn btn-primary" disabled={loading}>
        {loading ? "Создаём…" : "Создать"}
      </button>
    </form>
  );
}
