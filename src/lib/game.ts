import type { Difficulty } from "@prisma/client";

export type ActionVariant = "DBG" | "COM" | "IC" | "OPS";

export type GameAction = {
  key: string;
  title: string;
  body: string;
  result: string;
  variant: ActionVariant;
  impact: number;
};

export type ScenarioLite = {
  id: string;
  title: string;
  summary: string;
  difficulty: Difficulty;
  durationMin: number;
  type: string;
  contextJson?: unknown;
  eventsJson?: unknown;
  actionsJson?: unknown;
};

type PlayerScenarioAction = {
  id?: string;
  cat?: string;
  label?: string;
  response?: string;
  priority?: number;
};

function asActionRecords(value: unknown): PlayerScenarioAction[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => (
      Boolean(item) && typeof item === "object" && !Array.isArray(item)
    ))
    .map((item) => ({
      id: typeof item.id === "string" ? item.id : undefined,
      cat: typeof item.cat === "string" ? item.cat : undefined,
      label: typeof item.label === "string" ? item.label : undefined,
      response: typeof item.response === "string" ? item.response : undefined,
      priority: typeof item.priority === "number" ? item.priority : undefined,
    }))
    .filter((item) => item.label && item.response);
}

export function sanitizeScenarioForPlayer<T extends ScenarioLite>(scenario: T): ScenarioLite {
  return {
    id: scenario.id,
    title: scenario.title,
    summary: scenario.summary,
    difficulty: scenario.difficulty,
    durationMin: scenario.durationMin,
    type: scenario.type,
    contextJson: scenario.contextJson,
    eventsJson: scenario.eventsJson,
    actionsJson: asActionRecords(scenario.actionsJson),
  };
}

export function difficultyColor(diff: Difficulty) {
  if (diff === "JUNIOR") return "text-emerald-400 border-emerald-500/40";
  if (diff === "SENIOR") return "text-red-400 border-red-500/40";
  return "text-amber-400 border-amber-500/40";
}

export function difficultyLabel(diff: Difficulty) {
  if (diff === "JUNIOR") return "Junior";
  if (diff === "SENIOR") return "Senior";
  return "Middle";
}

export function actionBorderClass(variant: ActionVariant) {
  if (variant === "DBG") return "border-emerald-500/40 hover:border-emerald-400";
  if (variant === "COM") return "border-amber-500/40 hover:border-amber-400";
  if (variant === "IC") return "border-violet-500/40 hover:border-violet-400";
  return "border-sky-500/40 hover:border-sky-400";
}

export function panicStatusLabel(panic: number) {
  if (panic < 35) return "Stable";
  if (panic < 65) return "Elevated";
  return "Critical";
}

export function panicStatusColor(panic: number) {
  if (panic < 35) return "text-emerald-400";
  if (panic < 65) return "text-amber-300";
  return "text-red-400";
}

export type IncidentPhase = {
  label: string;
  sublabel: string;
  color: string;
  round: number;
};

export function getIncidentPhase(round: number): IncidentPhase {
  if (round <= 3) return { label: "DETECTION",    sublabel: "Обнаружение и оценка масштаба", color: "text-red-400",     round };
  if (round <= 6) return { label: "INVESTIGATION", sublabel: "Диагностика root cause",        color: "text-amber-400",  round };
  if (round <= 9) return { label: "MITIGATION",   sublabel: "Устранение и workaround",        color: "text-sky-400",    round };
  return            { label: "RECOVERY",           sublabel: "Восстановление сервиса",         color: "text-emerald-400", round };
}

// ---------------------------------------------------------------------------
// Scenario-specific action sets: 5 scenarios × 4 phases × 4 actions
// ---------------------------------------------------------------------------

type ScenarioKey = "configmap" | "dns" | "storage" | "ingress" | "observability";
type PhaseLabel = "DETECTION" | "INVESTIGATION" | "MITIGATION" | "RECOVERY";

const SCENARIO_ACTIONS: Record<ScenarioKey, Record<PhaseLabel, GameAction[]>> = {

  // ── 1. Потерянная конфигурация (ConfigMap / Secret / env vars) ─────────────
  configmap: {
    DETECTION: [
      { key: "a", variant: "DBG", impact: 10,
        title: "Открыть dashboard и проверить аномалии",
        body:   "Grafana/Datadog — найти первую точку деградации.",
        result: "📊 Grafana: error rate вырос с 0.3% до 14% в 14:32. P99 latency: 180ms → 870ms. 3 пода в CrashLoopBackOff. READY: 0/3. Scope чёткий — деградация изолирована в namespace production." },
      { key: "b", variant: "COM", impact: 8,
        title: "Уведомить команду о потенциальном инциденте",
        body:   "Написать в #incidents, обозначить симптомы.",
        result: "📣 Команда собрана в #incidents. On-call откликнулся за 2 мин. Severity P2. Stakeholders уведомлены — ждут апдейт через 15 мин. War room открыт." },
      { key: "c", variant: "OPS", impact: 13,
        title: "Проверить актуальность ConfigMap и Secret в подах",
        body:   "Убедиться, что поды получили последнюю версию конфигурации.",
        result: "🔍 `kubectl exec pod -- env | grep REDIS_URL` — переменная пустая! ConfigMap v2 создан 22 мин назад, но поды не перезапускались. `kubectl describe pod`: env vars примонтированы из старой версии." },
      { key: "d", variant: "IC", impact: 9,
        title: "Объявить инцидент и назначить on-call IC",
        body:   "Формально открыть инцидент и назначить owner.",
        result: "📋 Инцидент #INC-2847 открыт. IC назначен — Senior SRE подключился. Structured response по playbook. Роли распределены, тайминги зафиксированы." },
    ],
    INVESTIGATION: [
      { key: "a", variant: "DBG", impact: 14,
        title: "Изучить логи и трейсы за последний час",
        body:   "Коррелируем ошибки с временными метками инцидента.",
        result: "🔎 Pod logs: `FATAL: connection refused — env REDIS_URL not set`. Сервис крашится при каждом старте. Трейсы: timeout на Redis connection. Подтверждено — env vars не применились после обновления ConfigMap." },
      { key: "b", variant: "COM", impact: 11,
        title: "Синхронизировать статус с stakeholders",
        body:   "ETA, импакт, workaround — обновить всех заинтересованных.",
        result: "📨 Апдейт разослан: «Найдена потенциальная причина — ConfigMap не применился к подам после деплоя. Работаем над фиксом. ETA восстановления: 15 мин. Временный workaround: переключаем ~30% трафика на резервный namespace.»" },
      { key: "c", variant: "OPS", impact: 13,
        title: "Проверить зависимые сервисы и upstream",
        body:   "Убедиться, что проблема не cascading failure.",
        result: "✅ Redis: healthy, PostgreSQL: healthy, API Gateway: healthy. Проблема изолирована только в deployment/app. Upstream сервисы не затронуты — можно применять фикс без риска расширения импакта." },
      { key: "d", variant: "IC", impact: 12,
        title: "Эскалировать до domain expert",
        body:   "Подключить команду с экспертизой по проблемному компоненту.",
        result: "👨‍💻 Platform team подключилась. Подтвердили: при обновлении ConfigMap через `kubectl apply` поды не получают новые env vars без рестарта. При immutable полях — полная замена. Рекомендация: `kubectl rollout restart deployment/app`." },
    ],
    MITIGATION: [
      { key: "a", variant: "DBG", impact: 16,
        title: "Подтвердить root cause и scope импакта",
        body:   "Финализировать гипотезу перед применением фикса.",
        result: "✅ Root cause подтверждён: ConfigMap v2 существует, Deployment не перезапускался — поды держат старые env vars в памяти процесса. Scope: 3/3 реплики. Фикс: `rollout restart`. Риск: нулевой при RollingUpdate стратегии." },
      { key: "b", variant: "COM", impact: 13,
        title: "Обновить статусную страницу для пользователей",
        body:   "Сообщить о прогрессе снаружи, снизить Support-нагрузку.",
        result: "📢 status.company.com обновлён: «Investigating — degraded performance for checkout flow. Our team is applying a fix. ETA: 10 min.» Входящие тикеты в Support снизились на 45%." },
      { key: "c", variant: "OPS", impact: 18,
        title: "Применить rollout restart деплоя",
        body:   "Принудительно перезапустить поды с новым ConfigMap.",
        result: "🚀 `kubectl rollout restart deployment/app -n production`. RollingUpdate: 1/3→2/3→3/3 Running. Error rate: 14%→6%→0.8%. P99: 870ms→190ms. Все 3 поды подхватили новые env vars. REDIS_URL корректный." },
      { key: "d", variant: "IC", impact: 15,
        title: "Скоординировать permanent fix",
        body:   "Параллельно разрабатывать постоянное решение.",
        result: "🔧 Ticket создан: «Добавить в CI pipeline шаг автоматического rollout restart при изменении ConfigMap». Runbook обновлён. Platform team пишет admission webhook для автоматизации." },
    ],
    RECOVERY: [
      { key: "a", variant: "DBG", impact: 20,
        title: "Верифицировать восстановление метрик до baseline",
        body:   "Убедиться что error rate, latency и availability в норме.",
        result: "📈 Метрики в норме: error rate 0.2% (baseline 0.3%), P99 183ms, availability 99.95%. Все 3 поды Running без рестартов 10+ мин. Алерты закрылись автоматически. Мониторим ещё 20 мин." },
      { key: "b", variant: "COM", impact: 18,
        title: "Разослать all-clear и закрыть инцидент",
        body:   "Финальное уведомление: инцидент закрыт, сервис стабилен.",
        result: "✅ All-clear разослан в #incidents и stakeholders: «Инцидент #INC-2847 закрыт. Сервис полностью восстановлен. Длительность: ~38 мин. Импакт: ~35% запросов деградировало. RCA: ConfigMap не применился без rollout restart.»" },
      { key: "c", variant: "OPS", impact: 19,
        title: "Убедиться что все системы стабильны",
        body:   "Проверить смежные сервисы, мониторинг, алерты.",
        result: "🟢 Полная проверка: downstream сервисы ОК, Redis connection pool восстановился, очереди дренированы, кеши консистентны. Новые алерты не появились. Synthetic monitors: 100% success rate." },
      { key: "d", variant: "IC", impact: 17,
        title: "Запланировать post-mortem",
        body:   "Назначить дату и owner для разбора инцидента.",
        result: "📝 Post-mortem запланирован на пятницу 14:00. Owner: Senior SRE. Draft содержит: timeline, root cause, contributing factors. Action items: автоматический rollout restart, CI gate на CM change, alert на CrashLoopBackOff." },
    ],
  },

  // ── 2. Слепой DNS (DNS / CoreDNS / NetworkPolicy) ──────────────────────────
  dns: {
    DETECTION: [
      { key: "a", variant: "DBG", impact: 13,
        title: "Проверить CoreDNS и резолвинг из пода",
        body:   "dig/nslookup внутри пода — убедиться, что DNS отвечает.",
        result: "🔎 `dig kubernetes.default` из пода → timeout 30с. CoreDNS логи: `SERVFAIL for cluster.local`. `kubectl get pods -n kube-system`: 2/3 CoreDNS в CrashLoopBackOff — OOMKilled. DNS failure cluster-wide." },
      { key: "b", variant: "COM", impact: 8,
        title: "Уведомить команду — DNS failure кластера",
        body:   "Написать в #incidents, P1 — затронуто всё service discovery.",
        result: "📣 #incidents: «P1 — DNS resolution failing in cluster. Multiple services can't discover each other. ~60% inter-service calls failing. War room открыт, все SRE on-call подключились.»" },
      { key: "c", variant: "OPS", impact: 12,
        title: "Проверить NetworkPolicy на UDP/53",
        body:   "Новые политики могут блокировать DNS трафик.",
        result: "🔍 `kubectl get networkpolicy -A` — найдена политика `deny-all` в namespace `app`, применённая 58 мин назад. Не содержит egress-правила для UDP/53 к kube-system. DNS запросы от подов блокируются!" },
      { key: "d", variant: "IC", impact: 10,
        title: "Объявить P1 и мобилизовать всю команду",
        body:   "DNS failure = cluster-wide impact, нужна полная мобилизация.",
        result: "📋 P1 объявлен. Все доступные SRE подключились. Network team, Platform team и Dev team уведомлены. Параллельные tracks запущены: NetworkPolicy и CoreDNS OOM расследуются одновременно." },
    ],
    INVESTIGATION: [
      { key: "a", variant: "DBG", impact: 15,
        title: "Изучить логи CoreDNS детально",
        body:   "Определить точную причину SERVFAIL и OOM.",
        result: "🔎 CoreDNS: `plugin/errors: 2 SERVFAIL`. Memory: limit 70Mi, current 68Mi → OOM при пиковой нагрузке. `kubectl describe networkpolicy deny-all`: egress разрешён только TCP/443, UDP/53 к kube-dns заблокирован. Two root causes найдены." },
      { key: "b", variant: "COM", impact: 11,
        title: "Синхронизировать статус — два root cause",
        body:   "Объяснить команде и stakeholders сложность ситуации.",
        result: "📨 «DNS failure: два независимых фактора. 1) NetworkPolicy блокирует UDP/53. 2) CoreDNS OOM при текущих лимитах. Устраняем оба параллельно. ETA: 20 мин. Workaround для критичных сервисов: hostNetwork: true.»" },
      { key: "c", variant: "OPS", impact: 14,
        title: "Проверить изменения за последний час",
        body:   "Найти, кто и когда применил проблемную NetworkPolicy.",
        result: "🔍 `kubectl get events -A --sort-by=.lastTimestamp` — NetworkPolicy `deny-all` создана через Argo CD деплой 62 мин назад. Helm chart версия 2.1.4 → 2.2.0. В changelogs: «Added strict network isolation» — но без DNS exemption." },
      { key: "d", variant: "IC", impact: 13,
        title: "Параллельно эскалировать Network и Platform team",
        body:   "Два root cause — нужны две команды одновременно.",
        result: "👨‍💻 Network team: «Добавим DNS egress в NetworkPolicy template. Patch готов через 5 мин.» Platform team: «CoreDNS memory limit был занижен при миграции. Поднимем до 200Mi и включим VPA.»" },
    ],
    MITIGATION: [
      { key: "a", variant: "DBG", impact: 17,
        title: "Подтвердить оба root cause перед патчем",
        body:   "Финализировать решение и порядок применения фиксов.",
        result: "✅ Root cause 1: NetworkPolicy `deny-all` блокирует UDP/53 — нужен egress для port 53 UDP/TCP к kube-dns. Root cause 2: CoreDNS memory limit 70Mi слишком мал — поднять до 200Mi. Применяем оба фикса параллельно." },
      { key: "b", variant: "COM", impact: 13,
        title: "Обновить статус — применяем фиксы",
        body:   "Сообщить о прогрессе и ожидаемом времени восстановления.",
        result: "📢 «Root cause подтверждён: NetworkPolicy + CoreDNS OOM. Применяем фиксы прямо сейчас. ETA полного восстановления: 10 мин. Временный workaround для критичных сервисов уже применён.»" },
      { key: "c", variant: "OPS", impact: 19,
        title: "Применить NetworkPolicy patch и поднять CoreDNS limits",
        body:   "Одновременно исправить оба фактора деградации.",
        result: "🚀 NetworkPolicy обновлена: добавлен egress для UDP/53 и TCP/53 к namespace kube-system. CoreDNS: memory limit 70Mi→200Mi, `kubectl rollout restart -n kube-system deploy/coredns`. DNS резолвинг восстановлен за 45 сек. Service discovery работает." },
      { key: "d", variant: "IC", impact: 16,
        title: "Фикс в helm chart + блокировка релиза",
        body:   "Не допустить повторного деплоя проблемной версии.",
        result: "🔧 Helm chart 2.2.0 отозван из registry. Hotfix PR создан: DNS egress добавлен в NetworkPolicy template. CI/CD: деплой в prod заблокирован до review. CoreDNS VPA включён для автоскейлинга ресурсов." },
    ],
    RECOVERY: [
      { key: "a", variant: "DBG", impact: 21,
        title: "Верифицировать DNS из всех namespace",
        body:   "Убедиться что резолвинг работает везде, не только в тестах.",
        result: "📈 `dig kubernetes.default` из 5 разных namespace — OK (avg 2ms). CoreDNS поды: 3/3 Running, 0 рестартов 15+ мин, memory usage 45Mi (стабильно). NetworkPolicy: все нужные egress разрешены. SERVFAIL в логах: 0." },
      { key: "b", variant: "COM", impact: 18,
        title: "All-clear — DNS восстановлен",
        body:   "Закрыть P1 и уведомить всю организацию.",
        result: "✅ P1 закрыт: «DNS cluster-wide failure устранён. Всё service discovery работает нормально. Длительность: ~48 мин. Причина: NetworkPolicy без DNS egress + CoreDNS OOM. Детальный post-mortem — в пятницу.»" },
      { key: "c", variant: "OPS", impact: 20,
        title: "Проверить все сервисы после DNS восстановления",
        body:   "Убедиться что нет «жертв» DNS failure в других namespace.",
        result: "🟢 Проверены все 47 Deployments. 3 сервиса требовали ручного рестарта после DNS failure — перезапущены. Все health checks: green. Inter-service latency вернулась к baseline. Event stream чистый." },
      { key: "d", variant: "IC", impact: 17,
        title: "Запланировать post-mortem + action items",
        body:   "Закрыть инцидент и назначить follow-up задачи.",
        result: "📝 Post-mortem запланирован. Draft action items: 1) DNS egress в NetworkPolicy template по умолчанию. 2) CoreDNS autoscaling + VPA. 3) Alert на DNS resolution latency >100ms. 4) NetworkPolicy linting в CI. 5) Runbook обновлён." },
    ],
  },

  // ── 3. Потоп из логов (Node filesystem / logs / storage) ───────────────────
  storage: {
    DETECTION: [
      { key: "a", variant: "DBG", impact: 10,
        title: "Проверить dashboard файловой системы нод",
        body:   "node_filesystem_avail_bytes — найти ноду с DiskPressure.",
        result: "📊 Grafana: `node_filesystem_avail_bytes{mountpoint=\"/\"}` → 0 на worker-03 с 09:47. DiskPressure condition: True. Evicted pods: 7 штук за последние 20 мин. Один сервис пишет логи ~500MB/мин." },
      { key: "b", variant: "COM", impact: 8,
        title: "Уведомить команду — DiskPressure на ноде",
        body:   "Написать в #incidents, обозначить evicted pods.",
        result: "📣 #incidents: «DiskPressure на worker-03. 7 подов evicted: payment-processor × 3, api-gateway × 2, cache-warmer × 2. Частичная деградация payment flow. Severity P2.»" },
      { key: "c", variant: "OPS", impact: 12,
        title: "Найти источник flood логов",
        body:   "du -sh на /var/log/pods — найти «мусорщика».",
        result: "🔍 `du -sh /var/log/pods/*` на worker-03: `payment-processor-7f8d9-xxx: 48GB`. Другие поды: < 100MB. `kubectl logs payment-processor` — дамп каждого HTTP запроса с полным body на уровне DEBUG. LOG_LEVEL=DEBUG в production!" },
      { key: "d", variant: "IC", impact: 9,
        title: "Объявить инцидент и эвакуировать критичные поды",
        body:   "Перенести критичные workloads с проблемной ноды.",
        result: "📋 P2 открыт. `kubectl cordon worker-03` — новые поды не планируются на ноду. Критичные поды перезапущены через `kubectl delete pod` на других нодах. Payment flow частично восстановлен." },
    ],
    INVESTIGATION: [
      { key: "a", variant: "DBG", impact: 14,
        title: "Изучить логи payment-processor",
        body:   "Понять что именно и почему пишется в таком объёме.",
        result: "🔎 Payment-processor логирует каждый HTTP запрос включая полные request/response body, headers и SQL queries на DEBUG уровне. ~60 req/sec × avg 9KB/запрос = 540MB/мин. LOG_LEVEL=DEBUG был включён для дебага 3 дня назад и забыт." },
      { key: "b", variant: "COM", impact: 11,
        title: "Синхронизировать статус — root cause найден",
        body:   "Объяснить причину и план фикса.",
        result: "📨 «Root cause: LOG_LEVEL=DEBUG в production ConfigMap payment-processor. 3 дня накопилось 48GB. Фикс простой: изменить на INFO + очистить логи. ETA: 15 мин. Workaround уже применён — поды на других нодах.»" },
      { key: "c", variant: "OPS", impact: 13,
        title: "Проверить другие ноды и сервисы",
        body:   "Убедиться что DiskPressure не распространяется.",
        result: "🔍 worker-01: 76% disk (норма), worker-02: 69% disk (норма). Только worker-03 критична — 100%. Другие сервисы без LOG_LEVEL=DEBUG. Проблема изолирована. Но worker-01 может достичь 80% через 24 часа при текущем росте." },
      { key: "d", variant: "IC", impact: 12,
        title: "Привлечь dev team — кто включил DEBUG?",
        body:   "Выяснить контекст и предотвратить повтор.",
        result: "👨‍💻 Dev team: «3 дня назад дебажили slow payment issue. LOG_LEVEL=DEBUG поставили через прямое изменение ConfigMap без PR. После фикса бага не вернули на INFO. Мой косяк — исправляю прямо сейчас.»" },
    ],
    MITIGATION: [
      { key: "a", variant: "DBG", impact: 16,
        title: "Подтвердить root cause и план очистки",
        body:   "Оценить объём очистки и риски для running подов.",
        result: "✅ Root cause: LOG_LEVEL=DEBUG в ConfigMap. 48GB на worker-03. План: 1) Изменить ConfigMap LOG_LEVEL=INFO. 2) Rollout restart payment-processor. 3) Очистить старые логи (>1 дня). Риск удаления: минимальный — логи старше 24ч не нужны." },
      { key: "b", variant: "COM", impact: 13,
        title: "Обновить статус — применяем фикс",
        body:   "Сообщить о прогрессе восстановления диска.",
        result: "📢 status page обновлён: «Applying fix for disk space issue on payment processing nodes. Service partially degraded — some requests may be slower. ETA full recovery: 15 min.»" },
      { key: "c", variant: "OPS", impact: 19,
        title: "Изменить LOG_LEVEL + очистить диск",
        body:   "ConfigMap на INFO, rollout restart, чистка логов.",
        result: "🚀 ConfigMap: LOG_LEVEL=INFO. `kubectl rollout restart deployment/payment-processor`. `find /var/log/pods/payment* -mtime +0.1 -delete` — освободили 46GB за 2 мин. DiskPressure: False. Evicted pods перезапустились на worker-03. Диск: 100%→7%." },
      { key: "d", variant: "IC", impact: 15,
        title: "Ввести процесс изменений ConfigMap в prod",
        body:   "Предотвратить ручные изменения без review.",
        result: "🔧 Tickets созданы: 1) Alert на disk usage >70%. 2) Запрет прямых изменений ConfigMap без PR (OPA policy). 3) TTL на DEBUG уровень — автоматически сбрасывается через 4 часа. 4) Log rotation policy для всех namespace." },
    ],
    RECOVERY: [
      { key: "a", variant: "DBG", impact: 20,
        title: "Верифицировать диск и логирование",
        body:   "Убедиться что диск стабилен и логи пишутся нормально.",
        result: "📈 worker-03: disk 7% (было 100%). Log rate payment-processor: 2MB/мин (было 540MB/мин). Все 3 реплики Running 10+ мин без рестартов. LOG_LEVEL=INFO подтверждён через `kubectl exec -- env | grep LOG_LEVEL`." },
      { key: "b", variant: "COM", impact: 18,
        title: "All-clear — DiskPressure устранён",
        body:   "Закрыть инцидент и уведомить всех.",
        result: "✅ «Инцидент закрыт. DiskPressure устранён. Все 7 evicted подов восстановлены. Payment flow работает нормально. Длительность: ~42 мин. Причина: LOG_LEVEL=DEBUG оставлен в production.»" },
      { key: "c", variant: "OPS", impact: 19,
        title: "Проверить все ноды и настроить log rotation",
        body:   "Убедиться что у других нод нет схожей проблемы.",
        result: "🟢 Все 3 worker ноды: disk <80%. Log rotation настроен через logrotate для /var/log/pods — ротация каждые 100MB или 24h, retention 3 дня. `kubectl uncordon worker-03` — нода вернулась в rotation." },
      { key: "d", variant: "IC", impact: 17,
        title: "Post-mortem и превентивные меры",
        body:   "Закрыть инцидент и назначить follow-up задачи.",
        result: "📝 Post-mortem: 3 contributing factors: 1) Нет процесса изменений prod ConfigMap. 2) Нет disk usage alerting. 3) Нет TTL на debug level. Action items выставлены в Jira — owner Dev Lead, срок 2 недели." },
    ],
  },

  // ── 4. Ingress не маршрутизирует (Ingress / Kubernetes / networking) ────────
  ingress: {
    DETECTION: [
      { key: "a", variant: "DBG", impact: 13,
        title: "Проверить ingress маршрутизацию и host rules",
        body:   "curl с Host header — сверить backend и upstream.",
        result: "🔎 `curl -s -o /dev/null -w \"%{http_code}\" -H 'Host: app.example.com' http://ingress-ip` → 503. nginx-ingress controller logs: `no endpoints available for service \"app-v2\"`. Service `app-v2` не существует в namespace — typo!" },
      { key: "b", variant: "COM", impact: 8,
        title: "Уведомить команду — 503 на всём внешнем трафике",
        body:   "Написать в #incidents, обозначить 100% внешний импакт.",
        result: "📣 #incidents: «503 на app.example.com — 100% внешнего трафика недоступно. Ingress не маршрутизирует. P2. Последнее изменение: helm деплой 25 мин назад. On-call и release team подключены.»" },
      { key: "c", variant: "OPS", impact: 12,
        title: "Проверить последние изменения ingress",
        body:   "kubectl describe ingress — что изменилось недавно.",
        result: "🔍 `kubectl describe ingress app -n prod`: backend.service.name = `app-v2`. `kubectl get svc -n prod` — существует `app-svc`, НЕ `app-v2`. Helm values последнего деплоя (25 мин назад): `ingress.service.name: app-v2`. Опечатка в PR #847." },
      { key: "d", variant: "IC", impact: 9,
        title: "Объявить инцидент — 100% external traffic down",
        body:   "Формально открыть, назначить IC и release team.",
        result: "📋 P2 открыт. IC назначен. Release team подключена. Rollback helm release обсуждается. Параллельно оцениваем: patch ingress напрямую vs rollback всего релиза (быстрее — patch)." },
    ],
    INVESTIGATION: [
      { key: "a", variant: "DBG", impact: 15,
        title: "Изучить события ingress controller",
        body:   "kubectl get events — найти точную ошибку роутинга.",
        result: "🔎 `kubectl get events -n prod --field-selector reason=FailedGetEndpoint`: `Error getting endpoints for service \"app-v2\": service not found`. `kubectl get svc -n prod | grep app`: только `app-svc`. Опечатка в serviceName helm values — подтверждено." },
      { key: "b", variant: "COM", impact: 11,
        title: "Синхронизировать статус — root cause найден",
        body:   "Сообщить что фикс прост и быстр.",
        result: "📨 «Root cause найден: опечатка в ingress service name (app-v2 вместо app-svc). Это был последний деплой 25 мин назад. Фикс займёт < 2 мин — патчим ingress напрямую. ETA восстановления: 3 мин.»" },
      { key: "c", variant: "OPS", impact: 13,
        title: "Проверить ingress controller — не он ли сломан",
        body:   "Убедиться что проблема в config, а не в самом контроллере.",
        result: "✅ nginx-ingress controller: running, 0 errors в собственных логах. Другие ingress rules на том же контроллере: работают нормально. Проблема точечная — только один ingress resource с неправильным serviceName. Controller healthy." },
      { key: "d", variant: "IC", impact: 12,
        title: "Найти PR с опечаткой — кто и когда",
        body:   "Понять контекст для предотвращения повтора.",
        result: "👨‍💻 Release team нашла PR #847: «Rename service from app-svc to app-v2 — но rename сервиса так и не был сделан, только values обновились». Автор PR не заметил несоответствие. Code review не поймал — нет validation." },
    ],
    MITIGATION: [
      { key: "a", variant: "DBG", impact: 17,
        title: "Подтвердить: patch ingress быстрее rollback",
        body:   "Оценить риск патча vs полного rollback helm release.",
        result: "✅ Patch ingress resource: ~30 сек, нулевой риск для других компонентов. Rollback helm release: ~3-5 мин, потенциально откатит другие изменения из этого деплоя. Решение: patch ingress напрямую, затем fix в helm chart." },
      { key: "b", variant: "COM", impact: 13,
        title: "Обновить статус — восстановление через 30 сек",
        body:   "Сообщить о немедленном фиксе.",
        result: "📢 «Applying hotfix — ingress configuration patch. Service will be restored in under 1 minute.» status page обновлён. Support team предупреждена — новые тикеты прекратятся." },
      { key: "c", variant: "OPS", impact: 20,
        title: "Patch ingress resource напрямую",
        body:   "kubectl patch — исправить serviceName без rollback.",
        result: "🚀 `kubectl patch ingress app -n prod --type=json -p '[{\"op\":\"replace\",\"path\":\"/spec/rules/0/http/paths/0/backend/service/name\",\"value\":\"app-svc\"}]'`. HTTP 503 → 200 за 15 секунд. Error rate: 100%→0.1%. Весь внешний трафик восстановлен." },
      { key: "d", variant: "IC", impact: 15,
        title: "Fix в helm chart + ingress validation в CI",
        body:   "Не допустить повтора — добавить validation.",
        result: "🔧 Hotfix PR: исправлен serviceName в helm values. CI добавлен шаг: `helm template | kubeval` — validate что все referenced services существуют. Merge в main через 10 мин. Helm release sync запланирован на следующий деплой." },
    ],
    RECOVERY: [
      { key: "a", variant: "DBG", impact: 21,
        title: "Верифицировать все ingress rules",
        body:   "Убедиться что все host rules указывают на существующие сервисы.",
        result: "📈 `kubectl get ingress -A -o json | jq` — проверены все 12 ingress resources. Все serviceName корректны. app.example.com: HTTP 200, avg latency 45ms. Synthetic monitor: 100% success rate последние 10 мин." },
      { key: "b", variant: "COM", impact: 18,
        title: "All-clear — ingress восстановлен",
        body:   "Закрыть инцидент официально.",
        result: "✅ «Инцидент закрыт. Ingress routing восстановлен. Длительность: ~32 мин. Причина: опечатка в helm values при деплое. Fix применён. RCA и превентивные меры — в post-mortem.»" },
      { key: "c", variant: "OPS", impact: 19,
        title: "Проверить весь внешний трафик и SSL",
        body:   "Убедиться что нет других сломанных routes.",
        result: "🟢 Все 12 ingress rules работают. SSL certificates: valid. Rate limiting: active. WAF rules: active. Трафик на baseline уровне. Никаких аномалий в access logs ingress controller." },
      { key: "d", variant: "IC", impact: 17,
        title: "Post-mortem и ingress validation процесс",
        body:   "Закрыть инцидент с action items.",
        result: "📝 Post-mortem запланирован. Key findings: 1) Нет validation что referenced services существуют. 2) Code review пропустил несоответствие. Action items: kubeval в CI, ingress smoke test после деплоя, staging-first policy для ingress changes." },
    ],
  },

  // ── 5. Слепой мониторинг (Observability / remote_write / Prometheus) ────────
  observability: {
    DETECTION: [
      { key: "a", variant: "DBG", impact: 10,
        title: "Проверить состояние Prometheus и remote_write",
        body:   "Grafana пустая — проверить targets и remote_write queue.",
        result: "📊 Grafana: все панели «No data» с 03:17. Prometheus targets: 3/18 UP — остальные scrape failure. remote_write queue: 18 часов backing up, ~2.1M pending samples. Alertmanager: не получает firing alerts. Летим вслепую." },
      { key: "b", variant: "COM", impact: 9,
        title: "Объявить observability blackout — P1",
        body:   "Monitoring failure = мы не видим другие инциденты.",
        result: "📣 #incidents P1: «Monitoring blackout с 03:17. Grafana, alerts, remote_write — всё мертво. Мы не видим состояние production. Все on-call SRE должны активно следить за сервисами вручную до восстановления.»" },
      { key: "c", variant: "OPS", impact: 13,
        title: "Проверить remote_write endpoint и сертификат",
        body:   "Причина может быть в TLS cert или недоступности endpoint.",
        result: "🔍 Prometheus logs: `remote_write: x509: certificate has expired or is not yet valid`. `openssl s_client -connect thanos.internal:19291` → `Verify return code: 10 (certificate has expired)`. Cert expired: вчера в 03:00 UTC. Auto-renewal не сработал." },
      { key: "d", variant: "IC", impact: 10,
        title: "P1 — мобилизовать Platform и SRE team",
        body:   "Monitoring blackout = нужна максимальная скорость.",
        result: "📋 P1 мобилизация. Platform team, SRE Lead и всё on-call подключены. Manual monitoring protocol активирован: каждые 5 мин ручная проверка error rate через direct Prometheus API. Incident bridge открыт." },
    ],
    INVESTIGATION: [
      { key: "a", variant: "DBG", impact: 15,
        title: "Изучить логи cert-manager и renewal job",
        body:   "Понять почему auto-renewal не сработал для remote_write cert.",
        result: "🔎 `kubectl get certificate -n monitoring`: `monitoring-remote-write-tls: False / Expired`. cert-manager logs: `certificate controller: renewal failed: CertificateRequest rejected`. Причина: cert-manager 1.14 изменил API для ACME challenge — renewal job использует deprecated v1alpha2 API." },
      { key: "b", variant: "COM", impact: 11,
        title: "Синхронизировать — root cause найден",
        body:   "Объяснить причину и план восстановления.",
        result: "📨 «Root cause: TLS сертификат для remote_write (Thanos) истёк в 03:00. cert-manager renewal сломан после upgrade 1.13→1.14 (deprecated API). Manual rotation сертификата — 15 мин. 18 часов метрик потеряны для remote storage, локальные Prometheus данные целы.»" },
      { key: "c", variant: "OPS", impact: 14,
        title: "Проверить все сертификаты в кластере",
        body:   "Убедиться что нет других истёкших или скоро истекающих cert.",
        result: "🔍 `kubectl get certificates -A`: 2 expired (remote-write-tls + alertmanager-tls), 3 истекают в течение 7 дней. cert-manager renewal сломан для всех! Нужна срочная ротация всех affected сертификатов и фикс cert-manager." },
      { key: "d", variant: "IC", impact: 13,
        title: "Параллельные tracks: cert rotation + cert-manager fix",
        body:   "Два действия одновременно — rotation сейчас, fix потом.",
        result: "👨‍💻 Platform team разделилась: Track 1 — manual cert rotation для восстановления monitoring прямо сейчас. Track 2 — cert-manager 1.14 migration fix (deprecated API → v1). ETA Track 1: 10 мин. ETA Track 2: 45 мин." },
    ],
    MITIGATION: [
      { key: "a", variant: "DBG", impact: 17,
        title: "Подтвердить scope — сколько сертификатов затронуто",
        body:   "Приоритизировать ротацию по критичности.",
        result: "✅ Критичные (rotate now): remote-write-tls (Prometheus→Thanos), alertmanager-tls. Ротируем оба. Скоро истекают: 3 сертификата в течение 7 дней — ротируем после восстановления cert-manager. cert-manager fix — параллельный track." },
      { key: "b", variant: "COM", impact: 13,
        title: "Обновить статус — восстановление идёт",
        body:   "Сообщить о прогрессе и gap в метриках.",
        result: "📢 «Manual cert rotation в процессе. ETA восстановления monitoring: 10 мин. ВАЖНО: метрики за последние 18 часов потеряны для Thanos (long-term storage). Локальные Prometheus данные (2 недели) — целы. Alerting будет восстановлен вместе с remote_write.»" },
      { key: "c", variant: "OPS", impact: 20,
        title: "Ротировать TLS сертификаты вручную",
        body:   "kubectl delete secret — cert-manager пересоздаст через ACME.",
        result: "🚀 `kubectl delete secret remote-write-tls alertmanager-tls -n monitoring`. cert-manager запустил новые CertificateRequest через Let's Encrypt. Новые сертификаты получены за 40 сек. Prometheus remote_write: reconnecting...OK. Grafana: данные пошли. Alerts: firing нормально." },
      { key: "d", variant: "IC", impact: 16,
        title: "Fix cert-manager + проверка всех remaining certs",
        body:   "Устранить системную причину сломанного renewal.",
        result: "🔧 cert-manager: deprecated v1alpha2 API удалён в 1.14 — обновлены все CertificateRequest manifests на v1. `kubectl rollout restart -n cert-manager`. Тест renewal: OK. Оставшиеся 3 скоро истекающих сертификата ротированы превентивно." },
    ],
    RECOVERY: [
      { key: "a", variant: "DBG", impact: 21,
        title: "Верифицировать полное восстановление observability",
        body:   "Убедиться что все компоненты мониторинга работают.",
        result: "📈 Prometheus: 18/18 targets UP. remote_write: queue drained (было 2.1M pending → 0). Grafana: все панели отображают данные. Alertmanager: receiving alerts, routing работает. cert-manager: все 5 certificates Valid. Observability stack 100%." },
      { key: "b", variant: "COM", impact: 18,
        title: "All-clear — monitoring восстановлен",
        body:   "Закрыть P1 и объяснить gap в метриках.",
        result: "✅ «P1 закрыт. Monitoring полностью восстановлен. Gap метрик: 18 часов в Thanos (long-term). Локальные Prometheus метрики за весь период целы. Длительность: ~55 мин. Причина: cert-manager breaking change в 1.14.»" },
      { key: "c", variant: "OPS", impact: 19,
        title: "Проверить все сертификаты и настроить alerting на expiry",
        body:   "Убедиться что renewal работает и добавить alerting.",
        result: "🟢 Все 14 сертификатов в кластере: Valid. Ближайший expiry: через 89 дней. Добавлен Prometheus alert: `certmanager_certificate_expiration_timestamp_seconds < (time() + 30*24*3600)` — предупреждение за 30 дней. cert-manager health check: OK." },
      { key: "d", variant: "IC", impact: 17,
        title: "Post-mortem — monitoring blindness сценарий",
        body:   "Назначить follow-up и улучшить процессы.",
        result: "📝 Post-mortem запланирован. Critical findings: 1) Нет alerting на cert expiry. 2) cert-manager upgrade не тестировался в staging. 3) Нет runbook для manual cert rotation. Action items: cert expiry alert за 30 дней, cert-manager upgrade testing, weekly cert health report." },
    ],
  },
};

// Detect which scenario key matches the type string
function detectScenarioKey(type: string): ScenarioKey | null {
  const t = type.toLowerCase();
  if (t.includes("configmap") || t.includes("secret") || t.includes("env")) return "configmap";
  if (t.includes("dns") || t.includes("coredns") || t.includes("networkpolicy")) return "dns";
  if (t.includes("storage") || t.includes("logs") || t.includes("filesystem") || t.includes("disk")) return "storage";
  if (t.includes("ingress")) return "ingress";
  if (t.includes("prometheus") || t.includes("remote_write") || t.includes("observability") || t.includes("grafana")) return "observability";
  return null;
}

// ---------------------------------------------------------------------------
// Generic fallback phase actions
// ---------------------------------------------------------------------------
const GENERIC_PHASE_ACTIONS: Record<PhaseLabel, GameAction[]> = {
  DETECTION: [
    { key: "a", variant: "DBG", impact: 10, title: "Открыть dashboard и проверить аномалии",        body: "Grafana / Datadog — найти первую точку деградации.",                   result: "📊 Dashboard открыт. Виден чёткий spike на графике error rate, совпадает с моментом деплоя. P99 latency выросла в 3–5×. Scope определён — начинаем investigation." },
    { key: "b", variant: "COM", impact: 8,  title: "Уведомить команду о потенциальном инциденте",   body: "Написать в #incidents, обозначить симптомы.",                            result: "📣 Команда собрана. On-call SRE откликнулся за 2 мин. Severity P2. War room открыт в Slack." },
    { key: "c", variant: "OPS", impact: 12, title: "Проверить последние деплои и change-freeze",    body: "Быстро исключить свежий change как root cause.",                         result: "🔍 Последний деплой 15–20 мин назад. Временная корреляция с началом инцидента высокая. Возможный root cause зафиксирован." },
    { key: "d", variant: "IC",  impact: 9,  title: "Объявить инцидент и назначить on-call IC",       body: "Формально открыть инцидент и назначить owner.",                          result: "📋 Инцидент открыт. IC назначен. Structured response по playbook запущен." },
  ],
  INVESTIGATION: [
    { key: "a", variant: "DBG", impact: 14, title: "Изучить логи и трейсы за последний час",         body: "Коррелируем ошибки с временными метками инцидента.",                    result: "🔎 Логи указывают на конкретный компонент. Трейсы показывают timeout. Root cause гипотеза сформирована." },
    { key: "b", variant: "COM", impact: 11, title: "Синхронизировать статус с stakeholders",         body: "ETA, импакт, workaround — обновить всех заинтересованных.",              result: "📨 Апдейт разослан. Stakeholders в курсе. ETA фикса согласован." },
    { key: "c", variant: "OPS", impact: 13, title: "Проверить зависимые сервисы и upstream",         body: "Убедиться, что проблема не cascading failure.",                          result: "✅ Upstream сервисы healthy. Cascading failure исключён. Проблема изолирована." },
    { key: "d", variant: "IC",  impact: 12, title: "Эскалировать до domain expert",                  body: "Подключить команду с экспертизой по проблемному компоненту.",            result: "👨‍💻 Domain expert подключился. Гипотеза подтверждена. Рекомендован конкретный фикс." },
  ],
  MITIGATION: [
    { key: "a", variant: "DBG", impact: 16, title: "Подтвердить root cause и scope импакта",         body: "Финализировать гипотезу перед применением фикса.",                      result: "✅ Root cause подтверждён. Scope зафиксирован. Фикс безопасен для применения." },
    { key: "b", variant: "COM", impact: 13, title: "Обновить статусную страницу для пользователей",  body: "Сообщить о прогрессе снаружи, снизить Support-нагрузку.",                result: "📢 Status page обновлён. Support-нагрузка снизилась на 40%." },
    { key: "c", variant: "OPS", impact: 18, title: "Применить workaround или откатить деплой",       body: "Быстрый rollback / временный фикс для восстановления SLA.",              result: "🚀 Фикс применён. Метрики начали восстанавливаться. Error rate падает." },
    { key: "d", variant: "IC",  impact: 15, title: "Скоординировать parallel track для пермфикса",   body: "Параллельно разрабатывать постоянное решение.",                          result: "🔧 Permanent fix track запущен. Ticket создан. Runbook обновлён." },
  ],
  RECOVERY: [
    { key: "a", variant: "DBG", impact: 20, title: "Верифицировать восстановление метрик до baseline", body: "Убедиться что error rate, latency и availability в норме.",            result: "📈 Все метрики вернулись к baseline. Алерты закрылись автоматически." },
    { key: "b", variant: "COM", impact: 18, title: "Разослать all-clear и закрыть инцидент",          body: "Финальное уведомление: инцидент закрыт, сервис стабилен.",               result: "✅ All-clear разослан. Инцидент официально закрыт." },
    { key: "c", variant: "OPS", impact: 19, title: "Убедиться что все системы стабильны",             body: "Проверить смежные сервисы, мониторинг, алерты.",                         result: "🟢 Все системы стабильны. Новые алерты не появились. Мониторинг чистый." },
    { key: "d", variant: "IC",  impact: 17, title: "Запланировать post-mortem",                       body: "Назначить дату и owner для разбора инцидента.",                          result: "📝 Post-mortem запланирован. Draft с action items готов. Owner назначен." },
  ],
};

function actionVariantFromCategory(category?: string): ActionVariant {
  const cat = category?.toLowerCase() ?? "";
  if (["logs", "exec", "check", "observe", "inspect"].includes(cat)) return "DBG";
  if (["communicate", "status", "notify", "com"].includes(cat)) return "COM";
  if (["fix", "patch", "rollback", "scale", "restart"].includes(cat)) return "OPS";
  if (["danger", "decision", "incident"].includes(cat)) return "IC";
  return "DBG";
}

function actionImpactFromCategory(category?: string, priority?: number) {
  const cat = category?.toLowerCase() ?? "";
  const base =
    cat === "fix" || cat === "rollback" || cat === "patch" ? 17 :
    cat === "danger" ? 4 :
    cat === "logs" || cat === "exec" || cat === "check" ? 12 :
    10;
  return priority === 1 ? base + 2 : base;
}

function buildScenarioJsonActions(scenario: ScenarioLite, phase: PhaseLabel): GameAction[] {
  const source = asActionRecords(scenario.actionsJson);
  if (!source.length) return [];

  const sorted = source
    .map((action, index) => ({ action, index }))
    .sort((a, b) => (a.action.priority ?? 99) - (b.action.priority ?? 99) || a.index - b.index);

  const phaseCategories: Record<PhaseLabel, string[]> = {
    DETECTION: ["check", "logs", "exec", "observe", "inspect"],
    INVESTIGATION: ["check", "logs", "exec", "observe", "inspect"],
    MITIGATION: ["fix", "patch", "rollback", "restart", "scale", "danger"],
    RECOVERY: ["fix", "patch", "rollback", "restart", "scale", "communicate", "status", "notify"],
  };
  const allowed = phaseCategories[phase];
  const phaseMatches = sorted.filter(({ action }) => (
    allowed.includes(action.cat?.toLowerCase() ?? "")
  ));
  const picked = [
    ...phaseMatches,
    ...sorted.filter(({ action }) => !phaseMatches.some((match) => match.action === action)),
  ].slice(0, 4);

  return picked.map(({ action, index }) => {
    const category = action.cat?.toUpperCase() ?? "ACTION";
    return {
      key: action.id ?? `${category.toLowerCase()}-${index}`,
      title: action.label ?? "Действие",
      body: category,
      result: action.response ?? "Результат действия зафиксирован.",
      variant: actionVariantFromCategory(action.cat),
      impact: actionImpactFromCategory(action.cat, action.priority),
    };
  });
}

export function buildRoundActions(scenario: ScenarioLite, round: number): GameAction[] {
  const phase = getIncidentPhase(round).label as PhaseLabel;
  const scenarioJsonActions = buildScenarioJsonActions(scenario, phase);
  if (scenarioJsonActions.length > 0) {
    return scenarioJsonActions;
  }

  const key = detectScenarioKey(scenario.type);
  const actions = key
    ? SCENARIO_ACTIONS[key][phase]
    : GENERIC_PHASE_ACTIONS[phase];
  return actions.map((a) => ({ ...a }));
}
