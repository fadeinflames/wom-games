import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreateScenarioForm } from "@/components/create-scenario-form";
import { ImportJsonForm } from "@/components/import-json-form";
import { DeletePackButton, DeleteScenarioButton, TogglePublicButton } from "@/components/pack-actions";

type Props = {
  params: Promise<{ packId: string }>;
};

export default async function PackDetailsPage({ params }: Props) {
  const { packId } = await params;
  const user = await getCurrentUser();

  const pack = await prisma.gamePack.findUnique({
    where: { id: packId },
    include: { owner: true, scenarios: { orderBy: { position: "asc" } } },
  });

  if (!pack) {
    notFound();
  }

  const isOwner = user?.id === pack.ownerId;
  if (!isOwner && !pack.isPublic) {
    redirect("/gallery");
  }

  return (
    <div className="space-y-6">
      <section className="card space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
          {pack.isPublic ? "Public" : "Private"} · owner @{pack.owner.username}
        </p>
        <h1 className="font-[var(--font-display)] text-3xl font-bold">{pack.title}</h1>
        <p className="text-zinc-300">{pack.description}</p>
        <div className="flex flex-wrap gap-2">
          <Link href={`/packs/${pack.id}/run`} className="btn btn-primary">Режим ведущего</Link>
          <Link href={`/packs/${pack.id}/play`} className="btn">Режим игрока</Link>
          <Link href="/dashboard" className="btn">К дашборду</Link>
          {isOwner && (
            <>
              <TogglePublicButton packId={pack.id} isPublic={pack.isPublic} />
              <DeletePackButton packId={pack.id} title={pack.title} />
            </>
          )}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {pack.scenarios.map((scenario) => (
          <article key={scenario.id} className="card space-y-2">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                #{scenario.position} · {scenario.difficulty} · {scenario.durationMin} мин
              </p>
              {isOwner && (
                <DeleteScenarioButton scenarioId={scenario.id} title={scenario.title} />
              )}
            </div>
            <h2 className="mt-1 font-[var(--font-display)] text-2xl font-bold">{scenario.title}</h2>
            <p className="text-sm text-zinc-300">{scenario.summary}</p>
            <p className="mt-1 text-xs text-zinc-500">{scenario.type}</p>
          </article>
        ))}
        {!pack.scenarios.length ? (
          <div className="card text-sm text-zinc-400">В pack пока нет сценариев.</div>
        ) : null}
      </section>

      {isOwner ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <CreateScenarioForm packId={pack.id} />
          <ImportJsonForm packId={pack.id} />
        </section>
      ) : null}
    </div>
  );
}
