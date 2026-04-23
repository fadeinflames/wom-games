"use client";

import { useState } from "react";

const CONTEXT_HINT = JSON.stringify(
  {
    infra: "Kubernetes 1.34",
    services: ["api", "postgres"],
    setup: "Что произошло перед инцидентом",
    time: "Пятница, 17:30",
  },
  null,
  2,
);

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <span className="block text-xs font-medium uppercase tracking-widest text-zinc-500">{label}</span>
      {children}
      {hint && <span className="block text-xs text-zinc-600 leading-relaxed">{hint}</span>}
    </div>
  );
}

export function CreateScenarioForm({ packId }: { packId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(false);
    setLoading(true);
    const fd = new FormData(e.currentTarget);

    let payload;
    try {
      payload = {
        packId,
        title: String(fd.get("title") || ""),
        summary: String(fd.get("summary") || ""),
        type: String(fd.get("type") || ""),
        difficulty: String(fd.get("difficulty") || "MIDDLE"),
        durationMin: Number(fd.get("durationMin") || 20),
        contextJson: JSON.parse(String(fd.get("contextJson") || "{}")),
        eventsJson: JSON.parse(String(fd.get("eventsJson") || "[]")),
        hintsJson: JSON.parse(String(fd.get("hintsJson") || "[]")),
        actionsJson: JSON.parse(String(fd.get("actionsJson") || "[]")),
        gmScriptJson: JSON.parse(String(fd.get("gmScriptJson") || "null")),
      };
    } catch {
      setError("Один из JSON-блоков невалидный — проверь скобки и запятые.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Не удалось создать сценарий");
        return;
      }
      setOk(true);
      (e.target as HTMLFormElement).reset();
      setTimeout(() => window.location.reload(), 800);
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <div>
        <h3 className="font-[var(--font-display)] text-xl font-bold">Добавить сценарий</h3>
        <p className="mt-0.5 text-xs text-zinc-500">Вручную — или используй JSON-импорт справа для массовой загрузки.</p>
      </div>

      <Field label="Название">
        <input className="field" name="title" placeholder="Полный диск на ноде Kubernetes" required minLength={3} />
      </Field>

      <Field label="Краткое описание" hint="Одно предложение — summary в карточке сценария.">
        <textarea className="field min-h-16" name="summary" placeholder="MySQL-под падает из-за заполнения PVC бинарными логами." required minLength={10} />
      </Field>

      <Field label="Тип инцидента" hint="Стек и ключевые слова для сортировки, напр. «Disk space, PVC expansion».">
        <input className="field" name="type" placeholder="DNS, NetworkPolicy" required minLength={3} />
      </Field>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Сложность">
          <select className="field" name="difficulty" defaultValue="MIDDLE">
            <option value="JUNIOR">JUNIOR</option>
            <option value="MIDDLE">MIDDLE</option>
            <option value="SENIOR">SENIOR</option>
          </select>
        </Field>
        <Field label="Длительность (мин)">
          <input className="field" type="number" min={5} max={180} name="durationMin" defaultValue={20} />
        </Field>
      </div>

      <Field
        label="contextJson — контекст инфраструктуры"
        hint="Объект: infra, services[], setup, time. Показывается игрокам в начале."
      >
        <textarea className="field min-h-28 font-mono text-xs" name="contextJson" defaultValue={CONTEXT_HINT} />
      </Field>

      <Field
        label="eventsJson — таймлайн событий"
        hint='Массив объектов: [{ "t": 0, "type": "msg", "title": "...", "body": "..." }]. Можно оставить [].'
      >
        <textarea className="field min-h-20 font-mono text-xs" name="eventsJson" defaultValue="[]" />
      </Field>

      <Field
        label="hintsJson — подсказки ведущего"
        hint='Массив: [{ "when": "...", "gm": "...", "team": "..." }]. Можно оставить [].'
      >
        <textarea className="field min-h-20 font-mono text-xs" name="hintsJson" defaultValue="[]" />
      </Field>

      <Field
        label="actionsJson — действия игроков"
        hint='Массив: [{ "id": "...", "cat": "check", "label": "...", "response": "..." }]. Можно оставить [].'
      >
        <textarea className="field min-h-20 font-mono text-xs" name="actionsJson" defaultValue="[]" />
      </Field>

      <Field
        label="gmScriptJson — скрипт ведущего (необязательно)"
        hint="Объект с заметками и чекпоинтами для GM. Оставь null если не нужно."
      >
        <textarea className="field min-h-16 font-mono text-xs" name="gmScriptJson" defaultValue="null" />
      </Field>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {ok && <p className="text-sm text-emerald-400">✅ Сценарий добавлен!</p>}

      <button className="btn btn-primary" disabled={loading}>
        {loading ? "Добавляем…" : "Добавить сценарий"}
      </button>
    </form>
  );
}
