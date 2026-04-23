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
    <div className="space-y-4">
      <AuthForm mode="login" />
      <p className="text-center text-sm text-zinc-400">
        Нет аккаунта? <Link href="/register" className="text-amber-400 hover:underline">Зарегистрироваться</Link>
      </p>
    </div>
  );
}
