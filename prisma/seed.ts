import bcrypt from "bcryptjs";
import { PrismaClient, Difficulty } from "@prisma/client";

const prisma = new PrismaClient();

const defaultContext = {
  infra: "Kubernetes 1.34",
  services: ["web-app", "postgres", "redis"],
  setup: "Демо контекст для быстрой проверки.",
  time: "Понедельник, 10:00",
};

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 10);

  const demo = await prisma.user.upsert({
    where: { email: "demo@wom.local" },
    update: { passwordHash },
    create: {
      email: "demo@wom.local",
      username: "demo",
      passwordHash,
    },
  });

  const pack = await prisma.gamePack.upsert({
    where: { id: "cmwompublicpack0000000000000" },
    update: {},
    create: {
      id: "cmwompublicpack0000000000000",
      ownerId: demo.id,
      title: "Wheel of Misfortune Starter Pack",
      description: "Публичный стартовый набор для ведущих и игроков.",
      isPublic: true,
    },
  });

  const scenarios = [
    {
      title: "Потерянная конфигурация",
      summary: "ConfigMap обновился, а поды не получили новых env vars.",
      type: "ConfigMap, Secret, env vars",
      difficulty: Difficulty.JUNIOR,
      durationMin: 18,
    },
    {
      title: "Слепой DNS",
      summary: "Сервис периодически не резолвит внутренние имена после сетевого hardening.",
      type: "DNS, CoreDNS, NetworkPolicy",
      difficulty: Difficulty.MIDDLE,
      durationMin: 20,
    },
    {
      title: "Потоп из логов",
      summary: "Нода уходит в DiskPressure из-за flood логов от одного сервиса.",
      type: "Node filesystem, logs, storage",
      difficulty: Difficulty.MIDDLE,
      durationMin: 20,
    },
    {
      title: "Ingress не маршрутизирует",
      summary: "Трафик падает на 503 после смены host rules в ingress-контроллере.",
      type: "Ingress, Kubernetes, networking",
      difficulty: Difficulty.SENIOR,
      durationMin: 25,
    },
    {
      title: "Слепой мониторинг",
      summary: "remote_write отвалился, наблюдаемость пропала, алерты молчат.",
      type: "Observability, remote_write, Prometheus",
      difficulty: Difficulty.SENIOR,
      durationMin: 22,
    },
  ];

  for (let index = 0; index < scenarios.length; index += 1) {
    const item = scenarios[index];
    await prisma.scenario.upsert({
      where: { id: `cmwomscenario${String(index + 1).padStart(2, "0")}00000000000` },
      update: {},
      create: {
        id: `cmwomscenario${String(index + 1).padStart(2, "0")}00000000000`,
        packId: pack.id,
        title: item.title,
        summary: item.summary,
        type: item.type,
        difficulty: item.difficulty,
        durationMin: item.durationMin,
        position: index + 1,
        contextJson: defaultContext,
        eventsJson: [
          { t: 0, type: "alert", title: "Старт инцидента", body: "Система сообщает о проблеме." },
          { t: 5, type: "event", title: "Диагностика", body: "Игрок собирает симптомы." },
          { t: 12, type: "event", title: "Фикс", body: "Команда внедряет исправление." },
        ],
        hintsJson: [
          { when: "Застрял", gm: "Проверь логи и describe", chat: "Смотри события", team: "Начни с симптомов, потом root cause" },
        ],
        actionsJson: [
          {
            id: "get-pods",
            cat: "check",
            label: "kubectl get pods",
            response: "Смотри статус подов и перезапуски.",
          },
        ],
        gmScriptJson: {
          pressure: [{ at: 4, who: "PM", msg: "Нужен быстрый апдейт по статусу." }],
          checkpoints: [{ step: "Собрать базовую диагностику", triggers: ["get-pods"] }],
          beats: [{ at: 0, tip: "Дай игроку 1-2 минуты на самостоятельный анализ." }],
        },
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
