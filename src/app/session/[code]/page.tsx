import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isValidSessionCode } from "@/lib/session-codes";
import { SessionPlayer } from "@/components/session-player";

type Props = {
  params: Promise<{ code: string }>;
};

export const dynamic = "force-dynamic";

export default async function SessionPage({ params }: Props) {
  const { code } = await params;
  if (!isValidSessionCode(code)) notFound();

  const session = await prisma.gameSession.findUnique({
    where: { code },
    select: {
      id: true,
      code: true,
      status: true,
      scenarioId: true,
      pack: {
        select: {
          id: true,
          title: true,
          scenarios: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              title: true,
              summary: true,
              difficulty: true,
              durationMin: true,
              type: true,
            },
          },
        },
      },
    },
  });

  if (!session) notFound();

  if (session.status === "ended") {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="card space-y-3 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Сессия</p>
          <h1 className="font-[var(--font-display)] text-3xl font-bold">Игра завершена</h1>
          <p className="text-sm text-zinc-400">
            Ведущий закрыл эту сессию. Попроси новую ссылку, если хочешь сыграть ещё.
          </p>
          <Link className="btn btn-primary mx-auto w-fit" href="/">← На главную</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      <div className="card space-y-1">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">Session</p>
            <h1 className="font-[var(--font-display)] text-2xl font-bold">{session.pack.title}</h1>
          </div>
          <span className="font-mono text-sm text-amber-300">#{session.code}</span>
        </div>
        <p className="text-sm text-zinc-400">
          Ты играешь в сессии, которую ведёт ведущий. Все твои действия он видит в реальном времени.
        </p>
      </div>

      <SessionPlayer
        code={session.code}
        initialScenarioId={session.scenarioId}
        scenarios={session.pack.scenarios}
      />
    </div>
  );
}
