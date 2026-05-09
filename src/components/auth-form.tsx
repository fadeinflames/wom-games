"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "login" | "register";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const payload =
      mode === "login"
        ? {
            identity: String(formData.get("identity") || ""),
            password: String(formData.get("password") || ""),
          }
        : {
            email: String(formData.get("email") || ""),
            username: String(formData.get("username") || ""),
            password: String(formData.get("password") || ""),
          };

    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Не удалось выполнить запрос. Проверь данные и попробуй ещё раз.");
      setBusy(false);
      return;
    }

    setSuccess(true);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="panel-strong mx-auto w-full max-w-md space-y-5">
      <div>
        <p className="kicker">{mode === "login" ? "Session access" : "New operator"}</p>
        <h1 className="mt-2 font-[var(--font-display)] text-3xl font-bold">
          {mode === "login" ? "Вход в тренировочную" : "Регистрация"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">
          {mode === "login"
            ? "Используй свой аккаунт или demo@wom.local / demo1234 для быстрой проверки."
            : "Аккаунт нужен, чтобы создавать паки, запускать сессии и публиковать сценарии."}
        </p>
      </div>

      {mode === "login" ? (
        <div className="space-y-2">
          <label htmlFor="identity" className="muted-label block">
            Email или username
          </label>
          <input
            id="identity"
            className="field"
            name="identity"
            placeholder="demo@wom.local"
            autoComplete="username"
            required
          />
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <label htmlFor="email" className="muted-label block">
              Email
            </label>
            <input
              id="email"
              className="field"
              type="email"
              name="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="username" className="muted-label block">
              Username
            </label>
            <input
              id="username"
              className="field"
              name="username"
              placeholder="sre_wizard"
              autoComplete="username"
              minLength={3}
              maxLength={32}
              pattern="[a-zA-Z0-9._-]+"
              title="Только буквы, цифры, точки, дефисы и подчёркивания"
              required
            />
            <p className="text-xs text-zinc-500">3-32 символа. Только a-z, 0-9, . - _</p>
          </div>
        </>
      )}

      <div className="space-y-2">
        <label htmlFor="password" className="muted-label block">
          Пароль
        </label>
        <input
          id="password"
          className="field"
          type="password"
          name="password"
          placeholder={mode === "register" ? "Минимум 8 символов" : "Пароль"}
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          minLength={8}
          required
        />
        {mode === "register" && (
          <p className="text-xs text-zinc-500">Минимум 8 символов, максимум 128.</p>
        )}
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {success ? (
        <p className="text-sm text-emerald-300" aria-live="polite">
          {mode === "register" ? "Аккаунт создан. Открываем игры." : "Вход выполнен. Открываем игры."}
        </p>
      ) : null}

      <button className="btn btn-primary w-full" disabled={busy || success}>
        {success
          ? "Переход..."
          : busy
          ? "Подождите..."
          : mode === "login"
          ? "Войти"
          : "Создать аккаунт"}
      </button>
    </form>
  );
}
