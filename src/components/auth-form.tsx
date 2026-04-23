"use client";

import React, { useState } from "react";

type Mode = "login" | "register";

export function AuthForm({ mode }: { mode: Mode }) {
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
      setError(body.error ?? "Request failed");
      setBusy(false);
      return;
    }

    setSuccess(true);
    window.location.href = "/dashboard";
  }

  return (
    <form onSubmit={handleSubmit} className="card mx-auto w-full max-w-md space-y-4">
      <h1 className="font-[var(--font-display)] text-3xl font-bold">
        {mode === "login" ? "Вход" : "Регистрация"}
      </h1>

      {mode === "login" ? (
        <div className="space-y-1">
          <label htmlFor="identity" className="text-xs text-zinc-400 uppercase tracking-widest">
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
          <div className="space-y-1">
            <label htmlFor="email" className="text-xs text-zinc-400 uppercase tracking-widest">
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
          <div className="space-y-1">
            <label htmlFor="username" className="text-xs text-zinc-400 uppercase tracking-widest">
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
            <p className="text-xs text-zinc-500">3–32 символа. Только a-z, 0-9, . - _</p>
          </div>
        </>
      )}

      <div className="space-y-1">
        <label htmlFor="password" className="text-xs text-zinc-400 uppercase tracking-widest">
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
        <p className="text-sm text-emerald-400">
          {mode === "register" ? "Аккаунт создан! Переходим..." : "Вход выполнен! Переходим..."}
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
