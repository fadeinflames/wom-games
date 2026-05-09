import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="hidden max-w-xl lg:block">
        <p className="kicker">Control room</p>
        <h2 className="mt-4 font-[var(--font-display)] text-5xl font-black leading-tight">
          Вернись к пакам, сессиям и разбору решений.
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-zinc-400">
          Ведущий готовит сценарии, игроки получают ссылку, а вся тренировка собирается в общий журнал действий.
        </p>
      </section>
      <section className="space-y-4">
        <AuthForm mode="login" />
        <p className="text-center text-sm text-zinc-400">
          Нет аккаунта? <Link href="/register" className="text-link">Зарегистрироваться</Link>
        </p>
      </section>
    </div>
  );
}
