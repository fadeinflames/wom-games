"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const PLACEHOLDER = `{
  "scenarios": [
    {
      "title": "Новый инцидент",
      "summary": "Короткое описание — минимум 10 символов.",
      "type": "DNS, NetworkPolicy",
      "difficulty": "MIDDLE",
      "durationMin": 20,
      "contextJson": {},
      "eventsJson": [],
      "hintsJson": [],
      "actionsJson": [],
      "gmScriptJson": null
    }
  ]
}`;

export function ImportJsonForm({ packId }: { packId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState("");
  const [jsonValid, setJsonValid] = useState<boolean | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    setValue(v);
    if (!v.trim()) { setJsonValid(null); return; }
    try { JSON.parse(v); setJsonValid(true); }
    catch { setJsonValid(false); }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(null);
    const raw = value.trim();
    if (!raw) { setError("Вставь JSON в поле."); return; }

    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      setError("Невалидный JSON — проверь запятые, кавычки и скобки.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId, ...(payload as object) }),
      });
      const data = (await res.json().catch(() => ({}))) as { count?: number; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Импорт не прошёл. Проверь схему JSON.");
        return;
      }
      const n = data.count ?? "?";
      setOk(`Импортировано сценариев: ${n}. Обновляем список.`);
      setValue("");
      setJsonValid(null);
      router.refresh();
    } catch {
      setError("Ошибка соединения. Попробуй ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  const borderColor =
    jsonValid === true
      ? "border-emerald-500/50 focus:border-emerald-400"
      : jsonValid === false
      ? "border-red-500/50 focus:border-red-400"
      : "";

  return (
    <form onSubmit={handleSubmit} className="panel-strong space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="kicker text-cyan-300">Bulk import</p>
          <h3 className="mt-2 font-[var(--font-display)] text-2xl font-bold">Импорт JSON</h3>
          <p className="mt-1 text-xs text-zinc-500">
            POST /api/import · поле <code className="rounded bg-white/10 px-1">scenarios: []</code>
          </p>
        </div>
        {jsonValid === true && (
          <span className="status-pill shrink-0 border-emerald-500/30 text-emerald-400">JSON OK</span>
        )}
        {jsonValid === false && (
          <span className="status-pill shrink-0 border-red-500/30 text-red-400">JSON ERR</span>
        )}
      </div>

      <p className="text-sm text-zinc-400">
        Вставь JSON из Claude или другого агента — один объект с полем <code className="rounded bg-white/10 px-1 text-xs font-mono">scenarios</code>.
        Все сценарии добавятся в pack сразу.
      </p>

      <textarea
        className={`field min-h-56 font-mono text-xs ${borderColor}`}
        name="payload"
        value={value}
        onChange={handleChange}
        placeholder={PLACEHOLDER}
        spellCheck={false}
      />

      {jsonValid === false && (
        <p className="text-xs text-red-400">
          Невалидный JSON — проверь незакрытые скобки, лишние запятые и кавычки.
        </p>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {ok && <p className="text-sm text-emerald-400">{ok}</p>}

      <div className="flex gap-2">
        <button className="btn btn-primary" disabled={loading || jsonValid === false}>
          {loading ? "Импортируем…" : "Импортировать"}
        </button>
        {value && (
          <button
            type="button"
            className="btn"
            onClick={() => { setValue(""); setJsonValid(null); setError(null); setOk(null); }}
          >
            Очистить
          </button>
        )}
      </div>

      <details className="text-xs text-zinc-500">
        <summary className="cursor-pointer hover:text-zinc-300 transition-colors">Минимальный формат JSON</summary>
        <pre className="code-panel mt-2 whitespace-pre-wrap text-zinc-400">{PLACEHOLDER}</pre>
      </details>
    </form>
  );
}
