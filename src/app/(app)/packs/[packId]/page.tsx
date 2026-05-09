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
    <div className="space-y-8">
      <section className="grid gap-5 border-b border-white/10 pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`status-pill ${pack.isPublic ? "border-emerald-400/40 text-emerald-300" : "text-zinc-500"}`}>
              {pack.isPublic ? "public" : "private"}
            </span>
            <span className="font-mono text-xs text-zinc-500">@{pack.owner.username}</span>
            <span className="font-mono text-xs text-zinc-500">{pack.scenarios.length} сценариев</span>
          </div>
          <h1 className="mt-3 font-[var(--font-display)] text-4xl font-black">{pack.title}</h1>
          <p className="mt-2 max-w-[72ch] text-sm leading-relaxed text-zinc-400">{pack.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/packs/${pack.id}/run`} className="btn btn-primary">Вести сессию</Link>
          <Link href={`/packs/${pack.id}/play`} className="btn">Играть соло</Link>
          <Link href="/dashboard" className="btn">К dashboard</Link>
          {isOwner && <TogglePublicButton packId={pack.id} isPublic={pack.isPublic} />}
          {isOwner && <DeletePackButton packId={pack.id} title={pack.title} />}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <p className="kicker">Scenarios</p>
          <div className="h-px flex-1 bg-white/10" />
        </div>
        {pack.scenarios.length ? (
          pack.scenarios.map((scenario) => (
            <article key={scenario.id} className="panel-strong">
              <div className="grid gap-4 lg:grid-cols-[72px_minmax(0,1fr)_auto] lg:items-start">
                <div className="font-mono text-3xl font-black text-white/10">#{String(scenario.position).padStart(2, "0")}</div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="status-pill text-zinc-400">{scenario.difficulty}</span>
                    <span className="font-mono text-xs text-zinc-500">{scenario.durationMin} мин</span>
                    <span className="font-mono text-xs text-zinc-500">{scenario.type}</span>
                  </div>
                  <h2 className="mt-3 font-[var(--font-display)] text-2xl font-bold">{scenario.title}</h2>
                  <p className="mt-1 max-w-[72ch] text-sm leading-relaxed text-zinc-400">{scenario.summary}</p>
                </div>
              {isOwner && (
                <DeleteScenarioButton scenarioId={scenario.id} title={scenario.title} />
              )}
              </div>
            </article>
          ))
        ) : (
          <div className="panel-strong">
            <p className="kicker">Empty pack</p>
            <h2 className="mt-2 font-[var(--font-display)] text-2xl font-bold">В паке пока нет сценариев</h2>
            <p className="mt-1 text-sm text-zinc-500">Добавь первый вручную или импортируй JSON ниже.</p>
          </div>
        )}
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
