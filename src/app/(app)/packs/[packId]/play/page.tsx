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
    <div className="space-y-5">
      <section className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-5">
        <div>
          <p className="kicker text-emerald-300">Player view</p>
          <h1 className="mt-2 font-[var(--font-display)] text-4xl font-black">{pack.title}</h1>
          <p className="mt-2 max-w-[64ch] text-sm leading-relaxed text-zinc-400">
            Соло-режим для расследования: 10 раундов, выбор действий, score и panic.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/packs/${pack.id}`} className="btn">К паку</Link>
          {isOwner ? <Link href={`/packs/${pack.id}/run`} className="btn">К ведущему</Link> : null}
        </div>
      </section>
      <PlayerBoard scenarios={pack.scenarios.map(sanitizeScenarioForPlayer)} />
    </div>
  );
}
