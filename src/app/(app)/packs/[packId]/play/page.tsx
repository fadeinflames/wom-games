import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PlayerBoard } from "@/components/player-board";
import { sanitizeScenarioForPlayer } from "@/lib/game";

type Props = {
  params: Promise<{ packId: string }>;
};

export default async function PlayPackPage({ params }: Props) {
  const { packId } = await params;
  const user = await getCurrentUser();

  const pack = await prisma.gamePack.findUnique({
    where: { id: packId },
    include: {
      owner: true,
      scenarios: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          title: true,
          summary: true,
          difficulty: true,
          durationMin: true,
          type: true,
          contextJson: true,
          eventsJson: true,
          actionsJson: true,
        },
      },
    },
  });

  if (!pack) {
    notFound();
  }

  const isOwner = user?.id === pack.ownerId;
  if (!isOwner && !pack.isPublic) {
    redirect("/gallery");
  }

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Player View</p>
          <h1 className="font-[var(--font-display)] text-3xl font-bold">{pack.title}</h1>
          <p className="text-sm text-zinc-400">
            Тренировочный режим игрока в стиле incident quest.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/packs/${pack.id}`} className="btn">К pack</Link>
          {isOwner ? <Link href={`/packs/${pack.id}/run`} className="btn">К ведущему</Link> : null}
        </div>
      </div>
      <PlayerBoard scenarios={pack.scenarios.map(sanitizeScenarioForPlayer)} />
    </div>
  );
}
