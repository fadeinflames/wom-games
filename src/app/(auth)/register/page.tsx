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
    <div className="space-y-4">
      <AuthForm mode="register" />
      <p className="text-center text-sm text-zinc-400">
        Уже есть аккаунт? <Link href="/login" className="text-amber-400 hover:underline">Войти</Link>
      </p>
    </div>
  );
}
