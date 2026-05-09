import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="hidden max-w-xl lg:block">
        <p className="kicker">Scenario builder</p>
        <h2 className="mt-4 font-[var(--font-display)] text-5xl font-black leading-tight">
          Создай пространство для тренировок команды.
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-zinc-400">
          Публикуй публичные паки, держи приватные сценарии для команды и запускай упражнения без внешних сервисов.
        </p>
      </section>
      <section className="space-y-4">
        <AuthForm mode="register" />
        <p className="text-center text-sm text-zinc-400">
          Уже есть аккаунт? <Link href="/login" className="text-link">Войти</Link>
        </p>
      </section>
    </div>
  );
}
