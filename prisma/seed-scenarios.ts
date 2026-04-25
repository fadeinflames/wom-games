/**
 * Seed script: import 18 full scenarios from the WOM HTML file into the public starter pack.
 * Upserts existing 5 stubs with rich data, then creates 13 new ones.
 *
 * Run: npx tsx prisma/seed-scenarios.ts
 */
import { PrismaClient, Difficulty } from "@prisma/client";

const prisma = new PrismaClient();
const PACK_ID = "cmwompublicpack0000000000000";

function id(n: number) {
  return `cmwomscenario${String(n).padStart(2, "0")}00000000000`;
}

const SCENARIOS: Array<{
  id: string;
  title: string;
  summary: string;
  type: string;
  difficulty: Difficulty;
  durationMin: number;
  position: number;
  contextJson: object;
  eventsJson: object;
  hintsJson: object;
  actionsJson: object;
  gmScriptJson: object;
}> = [
  // ── 1. Полный диск ────────────────────────────────────────────────
  {
    id: id(1),
    title: "Полный диск",
    summary: "MySQL-под падает из-за заполнения PVC бинарными логами. Нужны быстрый purge и расширение PVC.",
    type: "Disk space, PVC expansion",
    difficulty: Difficulty.JUNIOR,
    durationMin: 18,
    position: 1,
    contextJson: {
      infra: "Kubernetes 1.34 в Yandex Cloud (1 node pool, 3 ноды)",
      services: ["blog-app (WordPress, 1 реплика)", "mysql (StatefulSet 1, PVC 10Gi yc-network-ssd)"],
      setup: "Блог работает 8 месяцев, популярный. StorageClass поддерживает allowVolumeExpansion.",
      time: "Среда, 15:00",
    },
    eventsJson: [
      { t: 0, type: "msg", title: "Контент-менеджер в Slack", body: '> «@devops Не могу опубликовать новую статью! При сохранении — ошибка 500»\n> «Комментарии тоже не добавляются 😰»' },
      { t: 1, type: "event", title: "Смотрим поды", body: "```\n$ kubectl get pods\n\nNAME                        READY  STATUS   RESTARTS  AGE\nblog-app-7c8d9e5f6-a1b2c   1/1    Running  5         2d\nmysql-0                     1/1    Running  0         240d\n```\n\n⚠️ blog-app перезапускался 5 раз." },
      { t: 3, type: "event", title: "Логи blog-app", body: "```\n$ kubectl logs blog-app-7c8d9e5f6-a1b2c --tail=20\n\n[15:02:15] WordPress: Error establishing database connection\n[15:02:15] MySQL Error: Can't create/write to file '/tmp/#sql_1234.MAI'\n            (Errcode: 28)\n[15:02:20] PHP Warning: mysqli_connect(): (HY000/2002): Connection refused\n```\n\n**Errcode: 28** = `ENOSPC` = \"No space left on device\"" },
      { t: 5, type: "event", title: "Логи mysql", body: "```\n$ kubectl logs mysql-0 --tail=15\n\n[ERROR] [MY-000035] Disk is full writing './mysql/binlog.000342'\n        (Errcode: 28)\n[ERROR] [MY-013132] Cannot create file './mysql/temp_table.ibd'\n[Note] Error number 28 means 'No space left on device'\n```" },
      { t: 7, type: "event", title: "Проверяем диск", body: "```\n$ kubectl exec mysql-0 -- df -h /var/lib/mysql\n\nFilesystem   Size  Used  Avail  Use%  Mounted on\n/dev/sda1    10G   10G   0     100%  /var/lib/mysql\n\n$ kubectl exec mysql-0 -- du -sh /var/lib/mysql/*\n5.2G  /var/lib/mysql/mysql\n1.8G  /var/lib/mysql/wordpress\n2.8G  /var/lib/mysql/binlog.*    ← разрослось\n```" },
      { t: 10, type: "event", title: "Быстрый фикс: чистим binlog", body: "```\n$ kubectl exec -it mysql-0 -- mysql -u root -p<PASS>\n\nmysql> SHOW BINARY LOGS;\nmysql> PURGE BINARY LOGS BEFORE DATE_SUB(NOW(), INTERVAL 3 DAY);\n```\n\n2.8G → 300M. Приложение оживает. ✅ Но это временно!" },
      { t: 14, type: "event", title: "Постоянный фикс: expand PVC", body: "```\n$ kubectl get sc yc-network-ssd -o jsonpath='{.allowVolumeExpansion}'\ntrue\n\n$ kubectl patch pvc mysql-data -p \\\n  '{\"spec\":{\"resources\":{\"requests\":{\"storage\":\"30Gi\"}}}}'\n```\n\nЕсли online expansion не поддерживается — `kubectl rollout restart statefulset/mysql`." },
      { t: 17, type: "event", title: "Профилактика", body: "В my.cnf (через ConfigMap + рестарт):\n```\n[mysqld]\nbinlog_expire_logs_seconds = 604800   # 7 дней\nmax_binlog_size = 100M\n```\n\nАлерт: `kubelet_volume_stats_used_bytes / capacity > 0.8` → Warning." },
    ],
    hintsJson: [
      { when: "Не понимает где ошибка", gm: "Смотри логи. Что за код ошибки в MySQL?", chat: "Классика — смотри df -h внутри пода", team: "Errcode: 28 = ENOSPC. Проверь свободное место на диске MySQL." },
      { when: "Не знает как expand PVC", gm: "PVC можно увеличить на лету, если StorageClass это позволяет", chat: "Называется volume expansion — проверь allowVolumeExpansion", team: "kubectl patch pvc <name> -p '{\"spec\":{\"resources\":{\"requests\":{\"storage\":\"30Gi\"}}}}'" },
      { when: "Не знает что binlog виноват", gm: "MySQL что-то пишет на диск кроме самих данных. Смотри /var/lib/mysql/", chat: "У MySQL есть binary log — хранится долго по умолчанию", team: "SHOW BINARY LOGS; PURGE BINARY LOGS BEFORE DATE_SUB(NOW(), INTERVAL 3 DAY);" },
    ],
    actionsJson: [
      { id: "get-pods", cat: "check", label: "kubectl get pods", priority: 1, response: "```\nNAME                        READY  STATUS   RESTARTS  AGE\nblog-app-7c8d9e5f6-a1b2c   1/1    Running  5         2d\nmysql-0                     1/1    Running  0         240d\n```\n\n⚠️ blog-app перезапускался 5 раз. Тревожный звоночек.", gmHint: "Игрок увидит 5 рестартов у blog-app — хороший старт. Должен пойти в логи." },
      { id: "logs-blog", cat: "logs", label: "kubectl logs blog-app-...", priority: 1, response: "```\n[15:02:15] WordPress: Error establishing database connection\n[15:02:15] MySQL Error: Can't create/write to file '/tmp/#sql_1234.MAI' (Errcode: 28)\n[15:02:20] PHP Warning: mysqli_connect(): (HY000/2002): Connection refused\n```", gmHint: "**ГЛАВНЫЙ КЛЮЧ: Errcode 28 = ENOSPC = диск полон.**" },
      { id: "logs-mysql", cat: "logs", label: "kubectl logs mysql-0", priority: 1, response: "```\n[ERROR] [MY-000035] Disk is full writing './mysql/binlog.000342' (Errcode: 28)\n[ERROR] [MY-013132] Cannot create file './mysql/temp_table.ibd'\n[Note] Error number 28 means 'No space left on device'\n```", gmHint: "Прямо сказано: Error 28 = no space. Дальше — df -h или du для локализации." },
      { id: "exec-df", cat: "exec", label: "kubectl exec mysql-0 -- df -h", priority: 1, response: "```\nFilesystem   Size  Used  Avail  Use%  Mounted on\noverlay       50G   12G   38G   24%   /\n/dev/sda1     10G   10G   0     100%  /var/lib/mysql    ← ВОТ ОНО\n```\n\n**/var/lib/mysql заполнен на 100%.** Root cause найден.", gmHint: "Момент истины. После этого игрок должен искать чем именно занят диск — du." },
      { id: "exec-du", cat: "exec", label: "kubectl exec mysql-0 -- du -sh /var/lib/mysql/*", response: "```\n5.2G  /var/lib/mysql/mysql\n1.8G  /var/lib/mysql/wordpress\n2.8G  /var/lib/mysql/binlog.*    ← разрослось!\n300M  /var/lib/mysql/ibdata1\n```\n\n**Binlog файлы занимают 2.8GB.** Их можно почистить.", gmHint: "Ключ к быстрому фиксу: binlog можно purge." },
      { id: "purge-binlog", cat: "fix", label: "PURGE BINARY LOGS BEFORE DATE_SUB(NOW(), INTERVAL 3 DAY)", response: "```\nmysql> PURGE BINARY LOGS BEFORE DATE_SUB(NOW(), INTERVAL 3 DAY);\nQuery OK, 0 rows affected (2.14 sec)\n\n$ kubectl exec mysql-0 -- df -h /var/lib/mysql\n/dev/sda1     10G  7.5G  2.5G   75%  /var/lib/mysql\n```\n\n✅ Освободилось 2.5G. Блог заработал.", gmHint: "Горячий фикс сработал. Но это временное — нужен expand PVC." },
      { id: "patch-pvc", cat: "fix", label: "kubectl patch pvc mysql-data ... storage: 30Gi", priority: 1, response: "```\n$ kubectl patch pvc mysql-data -p \\\n    '{\"spec\":{\"resources\":{\"requests\":{\"storage\":\"30Gi\"}}}}'\npersistentvolumeclaim/mysql-data patched\n\n$ kubectl get pvc mysql-data -w\nmysql-data  Bound   10Gi  →  30Gi\n```\n\n✅ Диск расширен. Постоянный фикс.", gmHint: "Корректный фикс. Игра подходит к финалу." },
      { id: "bad-rm-binlog", cat: "danger", label: "rm -f /var/lib/mysql/binlog.*", response: "❌ **Опасно!** MySQL держит file descriptors — место не освободится. Бинлог-индекс сломается. Правильно: `PURGE BINARY LOGS BEFORE ...`", gmHint: "Учебный момент! Объясни почему rm опасен." },
    ],
    gmScriptJson: {
      pressure: [
        { at: 1, who: "📝 Контент-менеджер", msg: "@devops У меня статья через час! Не могу опубликовать, ошибка 500 😰" },
        { at: 4, who: "📊 PM", msg: "Клиенты пишут в поддержку, уже 15 тикетов за 10 минут" },
        { at: 8, who: "📊 PM", msg: "Аналитика: трафик упал на 60%. Что происходит?" },
        { at: 12, who: "👔 CTO (Telegram)", msg: "Партнёр пишет что блог не работает. Когда починим?" },
        { at: 16, who: "📊 PM", msg: "SLA 99.5%, уже 15 минут простой. Это в отчёт квартала." },
      ],
      checkpoints: [
        { step: "Увидеть рестарты blog-app", triggers: ["get-pods"] },
        { step: "Найти Errcode 28 в логах", triggers: ["logs-blog", "logs-mysql"] },
        { step: "Увидеть 100% заполнения диска (df -h)", triggers: ["exec-df"] },
        { step: "Понять что binlog съел место", triggers: ["exec-du"] },
        { step: "Быстрый фикс: PURGE BINARY LOGS", triggers: ["purge-binlog"] },
        { step: "Постоянный фикс: expand PVC", triggers: ["patch-pvc"] },
      ],
      beats: [
        { at: 0, tip: "🎬 Дай прочитать контекст. Запусти первое событие из timeline." },
        { at: 3, tip: "⏰ Если не пошёл в логи — trigger первого сообщения от контент-менеджера." },
        { at: 7, tip: "🔥 Если уже нашёл Errcode 28 — добавь давления от PM." },
        { at: 12, tip: "💣 Слишком легко? Кинь усложнение «Expand не поддерживается»." },
        { at: 16, tip: "🏁 Если близок к концу — проверь что записал про профилактику (binlog_expire)." },
      ],
    },
  },

  // ── 2. Потерянная конфигурация ────────────────────────────────────
  {
    id: id(2),
    title: "Потерянная конфигурация",
    summary: "ConfigMap обновился, а поды не получили новых env vars. Плюс случайно потеряли Secret при apply.",
    type: "ConfigMap, Secret, env vars",
    difficulty: Difficulty.JUNIOR,
    durationMin: 18,
    position: 2,
    contextJson: {
      infra: "Kubernetes 1.34",
      services: ["web-app (Node.js, 2 реплики)", "postgres", "redis"],
      setup: "Разработчик попросил обновить ConfigMap — добавить API_TIMEOUT=30. Ты применил 5 минут назад.",
      time: "Вторник, 10:00",
    },
    eventsJson: [
      { t: 0, type: "msg", title: "Разработчик в Slack", body: '> «@devops Приложение всё ещё использует старый таймаут! В логах timeout=10, а должно быть 30»' },
      { t: 1, type: "event", title: "Смотрим ConfigMap", body: "```yaml\n$ kubectl get configmap web-app-config -o yaml\n\ndata:\n  API_TIMEOUT: \"30\"          # новое значение\n  DATABASE_HOST: \"postgres\"\n  LOG_LEVEL: \"info\"\n```\n\nConfigMap обновлён корректно. Но приложение использует старое." },
      { t: 2, type: "event", title: "Проверяем env в подах", body: "```\n$ kubectl exec web-app-7d8c9e5f6-a1b2c -- env | grep API_TIMEOUT\nAPI_TIMEOUT=10\n```\n\nПоды живут 3 дня, ConfigMap обновлён 5 минут назад." },
      { t: 4, type: "event", title: "Как ConfigMap подключён", body: "```yaml\n$ kubectl get deploy web-app -o yaml | grep -A5 API_TIMEOUT\n\n- name: API_TIMEOUT\n  valueFrom:\n    configMapKeyRef:\n      name: web-app-config\n      key: API_TIMEOUT\n```\n\n**Ключ:** ConfigMap через `env.valueFrom` НЕ обновляется автоматически. Нужен рестарт." },
      { t: 6, type: "event", title: "Рестарт", body: "```\n$ kubectl rollout restart deployment/web-app\n$ kubectl exec web-app-8e9f0a1b2-h7i8j -- env | grep API_TIMEOUT\nAPI_TIMEOUT=30\n```\n\n✅ Но..." },
      { t: 8, type: "alert", title: "Новая проблема", body: "Разработчик: «Теперь приложение вообще не стартует!»\n```\n$ kubectl logs web-app-8e9f0a1b2-h7i8j\n\n[ERROR] Missing required environment variable: DATABASE_PASSWORD\n[ERROR] Please set DATABASE_PASSWORD in environment\nProcess exited with code 1\n```" },
      { t: 10, type: "event", title: "Где DATABASE_PASSWORD?", body: "```\n$ kubectl get secrets\nNAME              TYPE    DATA  AGE\npostgres-secret   Opaque  2     10d\n```\n\nSecret есть. В Deployment ссылки на него нет." },
      { t: 12, type: "event", title: "Root cause", body: "Разработчик прислал YAML с **весь Deployment**, не только ConfigMap. В нём забыли `DATABASE_PASSWORD` из Secret. Ты применил — перезаписал Deployment, потерял ссылку." },
      { t: 14, type: "event", title: "Фикс", body: "`kubectl edit deployment web-app`, добавляем:\n```yaml\n- name: DATABASE_PASSWORD\n  valueFrom:\n    secretKeyRef:\n      name: postgres-secret\n      key: password\n```\n\nДолгосрочно: GitOps (Argo CD/Flux). Deployment в Git, а не «прилетевший YAML»." },
    ],
    hintsJson: [
      { when: "ConfigMap не применяется", gm: "Как ConfigMap подключён к поду — env или volume?", chat: "Если env — нужен рестарт пода", team: "valueFrom.configMapKeyRef → нужен kubectl rollout restart" },
      { when: "Где искать пароль", gm: "Пароли обычно не в ConfigMap. Где они должны быть?", chat: "kubectl get secrets", team: "kubectl get secret postgres-secret -o yaml" },
      { when: "Как добавить Secret обратно", gm: "edit deployment и secretKeyRef в env", chat: "Есть спецполе в env: secretKeyRef", team: "env: [{name: DATABASE_PASSWORD, valueFrom: {secretKeyRef: {name: postgres-secret, key: password}}}]" },
    ],
    actionsJson: [
      { id: "get-pods", cat: "check", label: "kubectl get pods", priority: 1, response: "Поды живут 3 дня. ConfigMap обновлён 5 минут назад." },
      { id: "get-cm", cat: "check", label: "kubectl get configmap web-app-config -o yaml", priority: 1, response: "```yaml\ndata:\n  API_TIMEOUT: \"30\"  # ← новое значение\n```\nConfigMap обновлён корректно.", gmHint: "ConfigMap правильный — проблема не в нём, а в том что под его не видит." },
      { id: "exec-env", cat: "exec", label: "kubectl exec web-app-... -- env | grep API_TIMEOUT", priority: 1, response: "```\nAPI_TIMEOUT=10\n```\nСтарое значение! ConfigMap обновился, но под видит старое.", gmHint: "Момент истины — под имеет устаревшее значение." },
      { id: "get-deploy", cat: "check", label: "kubectl get deploy web-app -o yaml", priority: 1, response: "```yaml\nenv:\n- name: API_TIMEOUT\n  valueFrom:\n    configMapKeyRef:\n      name: web-app-config\n      key: API_TIMEOUT\n# DATABASE_PASSWORD отсутствует!\n```", gmHint: "env через configMapKeyRef — значит нужен рестарт. Плюс нет DATABASE_PASSWORD." },
      { id: "rollout-restart", cat: "fix", label: "kubectl rollout restart deployment/web-app", priority: 1, response: "deployment.apps/web-app restarted. Жди ~30 сек — новые поды подхватят новый ConfigMap.", gmHint: "Правильный фикс для ConfigMap+env. Но — появится новая проблема." },
      { id: "logs-after", cat: "logs", label: "kubectl logs web-app-... (после рестарта)", priority: 1, response: "```\n[ERROR] Missing required environment variable: DATABASE_PASSWORD\n[ERROR] Please set DATABASE_PASSWORD in environment\nProcess exited with code 1\n```", gmHint: "Разработчик прислал YAML без Secret — игрок перезаписал deployment." },
      { id: "get-secrets", cat: "check", label: "kubectl get secrets", response: "```\nNAME              TYPE    DATA  AGE\npostgres-secret   Opaque  2     10d\n```\nSecret есть. Но в deployment на него нет ссылки.", gmHint: "Secret живой — надо его прокинуть в deployment." },
      { id: "edit-deploy", cat: "fix", label: "kubectl edit deployment web-app", priority: 1, response: "Открывается редактор. Добавить в env:\n```yaml\n- name: DATABASE_PASSWORD\n  valueFrom:\n    secretKeyRef:\n      name: postgres-secret\n      key: password\n```", gmHint: "Правильный фикс. Через 30 сек поды поднимутся." },
    ],
    gmScriptJson: {
      pressure: [
        { at: 1, who: "👨‍💻 Разработчик", msg: "@devops Приложение всё ещё использует старый таймаут! Вы вообще применили?" },
        { at: 5, who: "👨‍💻 Разработчик", msg: "Я вижу в логах timeout=10. Это неправильно!" },
        { at: 10, who: "📊 PM", msg: "Когда новый API будет готов? Встреча через 30 минут." },
        { at: 14, who: "👨‍💻 Разработчик", msg: "Теперь вообще упало! Верните как было!" },
      ],
      checkpoints: [
        { step: "Проверить ConfigMap — он обновлён", triggers: ["get-cm"] },
        { step: "Увидеть что под имеет старое значение env", triggers: ["exec-env"] },
        { step: "Понять — env.configMapKeyRef не обновляется на лету", triggers: ["get-deploy"] },
        { step: "Рестарт подов — rollout restart", triggers: ["rollout-restart"] },
        { step: "Увидеть новую проблему — нет DATABASE_PASSWORD", triggers: ["logs-after"] },
        { step: "Найти что Secret существует", triggers: ["get-secrets"] },
        { step: "Добавить secretKeyRef обратно", triggers: ["edit-deploy"] },
      ],
      beats: [
        { at: 0, tip: "🎬 Представь ситуацию: разработчик прислал YAML, ты применил. Теперь что-то не так." },
        { at: 4, tip: "🔎 Если уперся в «ConfigMap не применился» — намекни смотреть как env подключён." },
        { at: 9, tip: "🔥 После rollout restart — подкинь новую проблему (упало совсем). Это и есть ловушка." },
        { at: 16, tip: "🏁 Обучающий момент: почему YAML на коленке плохо. Подведи к GitOps." },
      ],
    },
  },

  // ── 3. Пятничный деплой ──────────────────────────────────────────
  {
    id: id(3),
    title: "Пятничный деплой",
    summary: "OOMKill после деплоя новой версии с утечкой памяти. Нужен срочный rollback до конца рабочего дня.",
    type: "Каскадный отказ после деплоя, rollback",
    difficulty: Difficulty.MIDDLE,
    durationMin: 20,
    position: 3,
    contextJson: {
      infra: "Kubernetes 1.34, 3 ноды в Yandex Cloud",
      services: ["api-backend (3 реплики, memory limit 1Gi)", "postgres", "redis", "worker (2 реплики)"],
      setup: "Только что задеплоили api-backend v2.1.3. Новая фича — загрузка больших файлов.",
      time: "ПЯТНИЦА, 17:30",
      truth: "[Скрыто от игрока] В v2.1.3 утечка памяти при обработке файловых запросов. OOMKiller убивает под.",
    },
    eventsJson: [
      { t: 0, type: "alert", title: "Первый алерт в PagerDuty", body: "```\n[FIRING] PodCrashLooping\nPod: api-backend-7d5f8c9b4-x8k2p\nRestarts: 3\nTime: 17:32\n```" },
      { t: 2, type: "event", title: "Смотрим поды", body: "```\napi-backend-7d5f8c9b4-x8k2p   0/1    CrashLoopBackOff  3  2m\napi-backend-7d5f8c9b4-m9n4t   1/1    Running           0  2m\napi-backend-7d5f8c9b4-p5q7w   1/1    Running           0  2m\n```" },
      { t: 4, type: "event", title: "Логи упавшего пода", body: "```\n$ kubectl logs api-backend-x8k2p --previous\n\n[INFO] Starting api-backend v2.1.3\n[WARN] Memory usage: 850MB / 1024MB\n[WARN] Memory usage: 980MB / 1024MB\n[ERROR] Signal: killed\n\nLast State:  Terminated\n  Reason:    OOMKilled\n  Exit Code: 137\n```" },
      { t: 5, type: "alert", title: "Каскад усиливается", body: "```\n[FIRING] Второй под тоже CrashLoop: api-backend-m9n4t\n[FIRING] HighErrorRate: 25%\nStatus: 502 Bad Gateway, 503 Service Unavailable\n```\nТретий под получает весь трафик: CPU 95%, memory 990MB." },
      { t: 6, type: "msg", title: "Тимлид в Slack", body: '> 🔥 «@sre У нас серьезные проблемы на проде! Клиенты жалуются массово. Что происходит?»' },
      { t: 8, type: "event", title: "Момент принятия решения", body: "**Неправильные варианты:**\n- ❌ Увеличить memory limit до 2Gi — та же утечка только позже\n- ❌ `kubectl rollout restart` — поможет на 2-3 минуты\n- ❌ Scale up до 5 реплик — новые тоже будут OOM-нуться\n\n**Правильно:** `kubectl rollout undo`" },
      { t: 9, type: "event", title: "Rollback", body: "```\n$ kubectl rollout undo deployment/api-backend\n$ kubectl rollout status deployment/api-backend\n```\n\nЧерез ~45 секунд: все 3 пода на v2.1.2, error rate падает к норме. ✅" },
      { t: 12, type: "event", title: "Пост-инцидент", body: "- Сообщить тимлиду: «Откатил до v2.1.2. В v2.1.3 утечка памяти при загрузке файлов»\n- Bug report разработчикам с логами\n- **Не выкладывать фикс в пятницу вечером.** Понедельник.\n- Runbook: «OOMKill после деплоя → сначала undo, потом разбираемся»" },
    ],
    hintsJson: [
      { when: "Паника, непонятно что делать", gm: "Что изменилось только что? Что произошло перед алертом?", chat: "Правило большого пальца: что недавно менялось — оно и виновато", team: "После деплоя упало → откатывай сначала, разбирайся потом" },
      { when: "Не понимает что это OOM", gm: "Exit Code 137 — это SIGKILL. От кого?", chat: "137 = 128 + 9. Kubernetes OOMKiller", team: "kubectl describe pod → Last State: Terminated, Reason: OOMKilled" },
      { when: "Не знает про rollout undo", gm: "У Deployment есть история ревизий", chat: "kubectl rollout — твой друг сегодня", team: "kubectl rollout history deployment/... && kubectl rollout undo deployment/..." },
    ],
    actionsJson: [
      { id: "get-pods", cat: "check", label: "kubectl get pods", priority: 1, response: "```\napi-backend-7d5f8c9b4-x8k2p   0/1  CrashLoopBackOff  3  2m\napi-backend-7d5f8c9b4-m9n4t   1/1  Running           0  2m\napi-backend-7d5f8c9b4-p5q7w   1/1  Running           0  2m\n```\n⚠ Один под в CrashLoop, два других работают. Деплой был 2 минуты назад.", gmHint: "Паттерн после деплоя: падает один-два пода, остальные пока тянут." },
      { id: "describe-pod", cat: "check", label: "kubectl describe pod api-backend-x8k2p", priority: 1, response: "```\nLast State:  Terminated\n  Reason:    OOMKilled\n  Exit Code: 137\n  Limits:\n    memory:  1Gi\n```\n**Reason: OOMKilled. Exit Code: 137.** Под убит за превышение memory limit.", gmHint: "**Главный факт.** Exit 137 = SIGKILL, OOMKiller. Теперь нужно откатить." },
      { id: "logs-prev", cat: "logs", label: "kubectl logs api-backend-x8k2p --previous", priority: 1, response: "```\n[INFO] Starting api-backend v2.1.3\n[WARN] Memory usage: 850MB / 1024MB\n[WARN] Memory usage: 980MB / 1024MB\n[ERROR] Signal: killed\n```\nMemory грыз до предела на file upload и упал.", gmHint: "Виден рост памяти на загрузке файлов. Утечка в новой фиче v2.1.3." },
      { id: "rollout-history", cat: "check", label: "kubectl rollout history deployment/api-backend", priority: 1, response: "```\nREVISION  CHANGE-CAUSE\n1         image: api-backend:v2.1.2\n2         image: api-backend:v2.1.3   ← сейчас, сломанная\n```", gmHint: "История есть — можно undo одной командой." },
      { id: "rollout-undo", cat: "fix", label: "kubectl rollout undo deployment/api-backend", priority: 1, response: "deployment.apps/api-backend rolled back. Через ~45 секунд все 3 пода на v2.1.2. Error rate падает к норме. ✅", gmHint: "**Правильный фикс.** Быстро, надёжно, прекращает кровотечение." },
      { id: "edit-mem", cat: "danger", label: "kubectl edit deployment (memory 1Gi → 2Gi)", response: "Rolling update запускается. Но утечка остаётся — поды просто упадут позже. Через 5 минут снова OOM, но уже на 2Gi.", gmHint: "**Плохо.** Не лечит причину, откладывает проблему." },
      { id: "scale-up", cat: "danger", label: "kubectl scale deployment api-backend --replicas=5", response: "Создаются новые поды — но тоже с утечкой. Через 2-3 минуты ВСЕ 5 в CrashLoop.", gmHint: "**Плохо.** Умножает проблему. Scale не лечит баги в коде." },
    ],
    gmScriptJson: {
      pressure: [
        { at: 1, who: "🚨 PagerDuty", msg: "[FIRING] PodCrashLooping api-backend-x8k2p, Restarts: 3" },
        { at: 3, who: "🔥 Тимлид", msg: "@sre У нас серьезные проблемы на проде! Клиенты жалуются массово!" },
        { at: 6, who: "📞 Саппорт", msg: "50 клиентов за 10 минут. Что говорить им?" },
        { at: 9, who: "👔 CTO", msg: "Пятница 18:00. Когда починим? У меня дети ждут." },
        { at: 13, who: "📊 PM", msg: "SLA полетел. $500/мин потерь. Мы в отчёте следующего квартала." },
      ],
      checkpoints: [
        { step: "Увидеть CrashLoopBackOff", triggers: ["get-pods"] },
        { step: "Найти OOMKilled + Exit 137", triggers: ["describe-pod"] },
        { step: "Логи: memory grew → killed", triggers: ["logs-prev"] },
        { step: "Проверить rollout history", triggers: ["rollout-history"] },
        { step: "Сделать ROLLOUT UNDO", triggers: ["rollout-undo"] },
      ],
      beats: [
        { at: 0, tip: "🎬 ПЯТНИЦА 17:30. Это главное. Подчёркивай что время поджимает." },
        { at: 3, tip: "🚨 Запусти из timeline второй алерт — каскад пошёл." },
        { at: 6, tip: "🔥 Если игрок пытается увеличить memory — спроси «поможет это на 30 минут, а что потом?»" },
        { at: 9, tip: "⏰ Если застрял — дай подсказку: «что менялось 3 минуты назад?»" },
        { at: 12, tip: "🏁 После undo — обучающий момент: НЕ ДЕПЛОИТЬ ФИКС В ПЯТНИЦУ. Понедельник." },
      ],
    },
  },

  // ── 4. Застрявшие поды ───────────────────────────────────────────
  {
    id: id(4),
    title: "Застрявшие поды",
    summary: "Плановый drain ноды зависает: PDB блокирует eviction, PV прибит к зоне без другой ноды.",
    type: "Node drain, PDB, PV zone affinity",
    difficulty: Difficulty.MIDDLE,
    durationMin: 22,
    position: 4,
    contextJson: {
      infra: "Kubernetes 1.34 в Yandex Cloud, 3 ноды в разных зонах (a/b/d)",
      services: ["database (StatefulSet 3, PVC 50Gi)", "app-backend (Deployment 5)", "monitoring (Prometheus, PVC 100Gi)"],
      setup: "PDB database-pdb: minAvailable 2. Плановое обновление ядра на k8s-node-2.",
      time: "Вторник, 14:00",
    },
    eventsJson: [
      { t: 0, type: "event", title: "Начинаем drain", body: "```\n$ kubectl drain k8s-node-2 --ignore-daemonsets --delete-emptydir-data\n\nnode/k8s-node-2 cordoned\nevicting pod production/app-backend-7c8d9e5f6-a1b2c\nevicting pod production/database-1\n...\n```\n\nПрошло 3 минуты. Процесс висит." },
      { t: 3, type: "event", title: "Кто не эвиктится", body: "```\n$ kubectl get pods -o wide | grep k8s-node-2\n\ndatabase-1     1/1  Running  k8s-node-2\nmonitoring-0   1/1  Running  k8s-node-2\n```" },
      { t: 5, type: "event", title: "PDB блокирует", body: "```\n$ kubectl get pdb -n production\n\nNAME          MIN AVAILABLE  ALLOWED DISRUPTIONS\ndatabase-pdb  2              0\n\nerror when evicting pods/\"database-1\":\nCannot evict pod as it would violate the pod's disruption budget.\n```" },
      { t: 7, type: "event", title: "Плохой вариант — force delete", body: "```\n$ kubectl delete pod database-1 --force --grace-period=0\n\nWarning  FailedScheduling\n  0/3 nodes available: 1 node(s) had volume node affinity conflict\n```" },
      { t: 10, type: "event", title: "Корень зла — zone affinity", body: "```yaml\nnodeAffinity:\n  required:\n    nodeSelectorTerms:\n      - matchExpressions:\n          - key: topology.kubernetes.io/zone\n            values: [ru-central1-b]\n\nk8s-node-1    ru-central1-a\nk8s-node-2    ru-central1-b   ← cordoned!\nk8s-node-3    ru-central1-d\n```\n\nPV живёт в зоне b. Единственная нода в зоне b — та, которую драйним." },
      { t: 12, type: "event", title: "Правильная стратегия", body: "1. `kubectl uncordon k8s-node-2` (откат drain)\n2. Добавить временную ноду в зоне b:\n```\nyc managed-kubernetes node-group create \\\n  --name temp-zone-b \\\n  --location zone=ru-central1-b --fixed-size 1\n```\n3. Когда нода готова — снова `drain k8s-node-2`.\n4. Обновить ядро → uncordon → удалить временную ноду." },
    ],
    hintsJson: [
      { when: "Drain висит", gm: "Проверь PDB для этого сервиса", chat: "kubectl get pdb", team: "PDB блокирует eviction если ALLOWED DISRUPTIONS=0" },
      { when: "Не понял про zone", gm: "PV — не абстракция, это железный диск в конкретной зоне", chat: "Classic: PV прибит к зоне", team: "kubectl get pv -o yaml → nodeAffinity.zone" },
      { when: "Не знает что делать", gm: "Нужна нода в той же зоне. Откуда её взять?", chat: "Добавь временную ноду в нужной AZ", team: "yc managed-kubernetes node-group create --location zone=ru-central1-b" },
    ],
    actionsJson: [
      { id: "drain", cat: "fix", label: "kubectl drain k8s-node-2 --ignore-daemonsets --delete-emptydir-data", priority: 1, response: "node/k8s-node-2 cordoned\nevicting pod production/database-1\n\nerror when evicting pods/\"database-1\":\nCannot evict pod as it would violate the pod's disruption budget.\n\n**Процесс висит.** database-1 не эвиктится.", gmHint: "Хороший старт — покажет конкретную ошибку PDB." },
      { id: "get-pods-wide", cat: "check", label: "kubectl get pods -o wide | grep k8s-node-2", priority: 1, response: "```\ndatabase-1     1/1  Running  k8s-node-2   (10.112.2.45)\nmonitoring-0   1/1  Running  k8s-node-2   (10.112.2.46)\n```\nДва пода застряли на ноде которую драйнишь.", gmHint: "Оба — StatefulSet с PV. Это не случайность." },
      { id: "get-pdb", cat: "check", label: "kubectl get pdb -n production", priority: 1, response: "```\nNAME          MIN AVAILABLE  ALLOWED DISRUPTIONS\ndatabase-pdb  2              0\n```\n**ALLOWED DISRUPTIONS = 0** — значит PDB блокирует любой eviction.", gmHint: "PDB требует minAvailable=2. Во время eviction PDB не даёт упасть." },
      { id: "get-pv", cat: "check", label: "kubectl get pv pvc-def456 -o yaml", priority: 1, response: "```yaml\nnodeAffinity:\n  required:\n    nodeSelectorTerms:\n    - matchExpressions:\n      - key: topology.kubernetes.io/zone\n        operator: In\n        values: [ru-central1-b]\n```\n\n**PV прибит к зоне ru-central1-b.**", gmHint: "**Корень зла.** PV = физический диск в зоне b. Никуда оттуда не денется." },
      { id: "get-nodes-zone", cat: "check", label: "kubectl get nodes -L topology.kubernetes.io/zone", priority: 1, response: "```\nk8s-node-1   Ready                     v1.34.5  ru-central1-a\nk8s-node-2   Ready,SchedulingDisabled  v1.34.5  ru-central1-b   ← единственная в b!\nk8s-node-3   Ready                     v1.34.5  ru-central1-d\n```", gmHint: "Единственная нода в нужной зоне — та которую драйнишь. Переезжать некуда." },
      { id: "uncordon", cat: "fix", label: "kubectl uncordon k8s-node-2", priority: 1, response: "node/k8s-node-2 uncordoned. Нода снова принимает workload.", gmHint: "Первый правильный шаг отката. Потом думать стратегию maintenance." },
      { id: "add-node", cat: "fix", label: "yc managed-kubernetes node-group create --location zone=ru-central1-b --fixed-size 1", priority: 1, response: "done (2m45s)\nname: temp-zone-b\nstate: ACTIVE\n\nЧерез ~3 минуты новая нода в зоне b готова. Теперь можно drain старую.", gmHint: "**Правильная стратегия.** Добавить ноду в ту же зону, дождаться, потом drain старую." },
      { id: "delete-force", cat: "danger", label: "kubectl delete pod database-1 --force --grace-period=0", response: "pod deleted\n\nWarning  FailedScheduling  0/3 nodes available: 1 node(s) had volume node affinity conflict\n\nНовый под в Pending — некуда ехать.", gmHint: "**Плохой путь.** Force delete StatefulSet при problematic PV может привести к data corruption." },
    ],
    gmScriptJson: {
      pressure: [
        { at: 2, who: "👨‍💼 Менеджер", msg: "Плановая работа. Обновление должно закончиться за 30 минут, да?" },
        { at: 6, who: "🚨 PagerDuty", msg: "Drain в процессе 6 минут. Это ожидаемо?" },
        { at: 10, who: "📊 PM", msg: "Команда QA не может запустить тесты — БД недоступна" },
        { at: 15, who: "👔 CTO", msg: "Сколько ещё? У нас окно обслуживания закроется в 15:30." },
      ],
      checkpoints: [
        { step: "Запустить drain", triggers: ["drain"] },
        { step: "Увидеть застрявший pod", triggers: ["get-pods-wide"] },
        { step: "Найти PDB блокировку", triggers: ["get-pdb"] },
        { step: "Проверить PV — zone affinity", triggers: ["get-pv"] },
        { step: "Откатить drain — uncordon", triggers: ["uncordon"] },
        { step: "Добавить временную ноду в ту же зону", triggers: ["add-node"] },
      ],
      beats: [
        { at: 0, tip: "🎬 Плановая работа. Начало спокойное. Игрок делает drain." },
        { at: 5, tip: "⏰ Если видит что висит — хороший знак. Подкинь первый алерт." },
        { at: 8, tip: "🔥 Если хочет force delete — СТОП. Спроси «а PV куда денется?»" },
        { at: 18, tip: "🏁 В финале обсуди: для stateful auto-drain — антипаттерн. Планируй вручную." },
      ],
    },
  },

  // ── 5. Потерянные в DNS ──────────────────────────────────────────
  {
    id: id(5),
    title: "Потерянные в DNS",
    summary: "CoreDNS потерял egress из-за новой NetworkPolicy — DNS мигает: кэш спасает, upstream недоступен.",
    type: "CoreDNS, NetworkPolicy",
    difficulty: Difficulty.MIDDLE,
    durationMin: 20,
    position: 5,
    contextJson: {
      infra: "Kubernetes 1.34, CoreDNS 1.12, NodeLocal DNSCache включён",
      services: ["frontend", "backend-api", "auth-service", "postgres", "external-api-proxy"],
      setup: "Утром в 08:00 сетевая команда применила новую NetworkPolicy для CoreDNS. Тесты прошли.",
      time: "Четверг, 11:00",
    },
    eventsJson: [
      { t: 0, type: "alert", title: "Странные алерты", body: "```\n[FIRING] frontend→backend-api: error rate 60%, connection timeout\n[FIRING] backend-api→auth: \"Name or service not known\" 40%\n[FIRING] external-api-proxy: \"temporary failure in name resolution\" 80%\n```\nВсе поды Running. Но ошибки есть." },
      { t: 2, type: "event", title: "Интересный паттерн", body: "```\n[10:58:12] GET /api/users → backend-api.svc.cluster.local\n[10:58:15] ERROR lookup backend-api: i/o timeout\n[10:59:01] GET /api/orders → SUCCESS 10.96.15.23\n[10:59:18] ERROR lookup backend-api: i/o timeout\n```\n**Иногда работает, иногда нет.**" },
      { t: 5, type: "event", title: "DNS проверка вручную", body: "```\n$ kubectl exec frontend-xxx -- nslookup backend-api.svc.cluster.local\n1-я попытка: ;; connection timed out\n2-я попытка: работает\n3-я попытка: timeout\n```" },
      { t: 8, type: "event", title: "CoreDNS логи", body: "```\n[ERROR] plugin/forward: Forward failed:\n        read udp 10.96.0.10:53->8.8.8.8:53: i/o timeout\n[ERROR] plugin/forward: dial tcp: server misbehaving\n```\nCoreDNS сам не может достучаться до upstream DNS." },
      { t: 11, type: "event", title: "Сравнение: CoreDNS vs обычный под", body: "```\n$ kubectl exec -n kube-system coredns-xxx -- wget -T 5 -O- http://google.com\ntimeout\n\n$ kubectl exec frontend-xxx -- wget -T 5 -O- http://google.com\n<!doctype html>...   ← работает!\n```\nПроблема **специфична** для CoreDNS подов." },
      { t: 13, type: "event", title: "NetworkPolicy найдена", body: "```\n$ kubectl get networkpolicy -n kube-system\nNAME                POD-SELECTOR      AGE\ncoredns-deny-all    k8s-app=kube-dns  3h\n\nAllowing ingress: 53/UDP, 53/TCP from all pods\nAllowing egress:  <none>    ← ВОТ ОНО!\n```\nIngress разрешён, Egress запрещён — CoreDNS не может спросить upstream.\n\n**Почему мигало:** кэш CoreDNS 30с. В кэше = hit. Истекло = upstream → timeout." },
      { t: 16, type: "event", title: "Правильный фикс", body: "Удалить → написать правильную:\n```yaml\npolicyTypes: [Ingress, Egress]\ningress:\n- ports: [{protocol: UDP, port: 53}, {protocol: TCP, port: 53}]\negress:\n- to:\n  - ipBlock: {cidr: 0.0.0.0/0, except: [169.254.169.254/32]}\n  ports: [{protocol: UDP, port: 53}, {protocol: TCP, port: 53}]\n```" },
    ],
    hintsJson: [
      { when: "Не лезет в CoreDNS", gm: "Ошибки DNS — кто у нас DNS в k8s?", chat: "CoreDNS в kube-system", team: "kubectl logs -n kube-system deploy/coredns" },
      { when: "Нестабильность не понимают", gm: "Когда запись в кэше — всё ок. Истекла — timeout. Что блокирует upstream?", chat: "Кэш-эффект. 30с TTL", team: "Смотри plugin/forward: Forward failed в логах" },
      { when: "Не думают про NetworkPolicy", gm: "Утром что-то меняли в сети...", chat: "Проверь NetworkPolicy в kube-system", team: "kubectl get netpol -n kube-system" },
    ],
    actionsJson: [
      { id: "nslookup-svc", cat: "exec", label: "kubectl exec frontend-xxx -- nslookup backend-api.production.svc.cluster.local", priority: 1, response: "```\n1-я: ;; connection timed out\n2-я: Address: 10.96.15.23  (работает)\n3-я: ;; connection timed out\n4-я: Address: 10.96.15.23  (работает)\n```\n**Нестабильно!** Иногда работает, иногда timeout.", gmHint: "Главный симптом — мигание. Значит кэш что-то спасает, а upstream сломан." },
      { id: "coredns-pods", cat: "check", label: "kubectl get pods -n kube-system -l k8s-app=kube-dns", priority: 1, response: "```\ncoredns-7b8c9d5e6-f3g4h   1/1    Running  0  45d\ncoredns-7b8c9d5e6-i5j6k   1/1    Running  0  45d\n```\nПоды живые. Проблема не в них самих.", gmHint: "CoreDNS Running, но работает криво — значит окружение." },
      { id: "coredns-logs", cat: "logs", label: "kubectl logs -n kube-system deploy/coredns --tail=50", priority: 1, response: "```\n[ERROR] plugin/forward: Forward failed: read udp->8.8.8.8:53: i/o timeout\n[ERROR] plugin/forward: dial tcp: server misbehaving\n```", gmHint: "**Ключ.** CoreDNS сам не может достучаться до upstream. Почему?" },
      { id: "coredns-wget", cat: "exec", label: "kubectl exec -n kube-system coredns-xxx -- wget -T 5 -O- http://google.com", priority: 1, response: "wget: download timed out\n\nCoreDNS **не может выйти наружу**.", gmHint: "Сам CoreDNS изолирован. Сравни с обычным подом." },
      { id: "app-wget", cat: "exec", label: "kubectl exec frontend-xxx -- wget -T 5 -O- http://google.com", priority: 1, response: "Connecting to google.com\n<!doctype html>... ✅ Работает! Обычный под ходит наружу.", gmHint: "Значит проблема специфическая для CoreDNS. Что-то ограничило его отдельно." },
      { id: "get-netpol", cat: "check", label: "kubectl get networkpolicy -n kube-system", priority: 1, response: "```\nNAME                POD-SELECTOR      AGE\ncoredns-deny-all    k8s-app=kube-dns  3h\n```\n**Новая политика, 3 часа назад.** Ровно на CoreDNS.", gmHint: "**Вот корень.** Кто её создал? (Сетевая команда утром «для hardening»)." },
      { id: "describe-netpol", cat: "check", label: "kubectl describe netpol coredns-deny-all -n kube-system", priority: 1, response: "```\nAllowing egress: <none>   ← ВСЁ ЗАБЛОКИРОВАНО\nPolicy Types: Ingress, Egress\n```\nCoreDNS не может спросить upstream.", gmHint: "Объясни механизм мигания: cache 30с. В кэше → hit. Истёк → нужен upstream → timeout." },
      { id: "delete-netpol", cat: "fix", label: "kubectl delete networkpolicy coredns-deny-all -n kube-system", priority: 1, response: "networkpolicy deleted. Через 10 секунд nslookup работает стабильно.", gmHint: "Быстрый фикс. Потом поговорить с сетевой командой." },
      { id: "fix-netpol", cat: "fix", label: "kubectl apply -f coredns-policy-fixed.yaml", priority: 1, response: "networkpolicy/coredns-policy created. Разрешает egress 53 UDP/TCP в любой адрес.", gmHint: "Лучший финал — не «удалить», а заменить на правильную." },
      { id: "restart-coredns", cat: "danger", label: "kubectl rollout restart deploy/coredns -n kube-system", response: "deployment.apps/coredns restarted. Новые поды получили те же ограничения — не поможет.", gmHint: "Первый инстинкт — рестарт. Но сеть-то всё ещё закрыта." },
    ],
    gmScriptJson: {
      pressure: [
        { at: 1, who: "🚨 PagerDuty", msg: "frontend→backend error rate 60%, connection timeout" },
        { at: 4, who: "📊 PM", msg: "Клиенты жалуются что приложение то работает, то нет." },
        { at: 8, who: "🔒 Security-team", msg: "Мы утром накатили улучшенные политики. Всё должно быть ок." },
        { at: 13, who: "👔 CTO", msg: "Баги могут быть у Security, но клиент этого не поймёт. Решайте быстро." },
      ],
      checkpoints: [
        { step: "Проверить DNS вручную — увидеть нестабильность", triggers: ["nslookup-svc"] },
        { step: "Логи CoreDNS — forward failed", triggers: ["coredns-logs"] },
        { step: "Сравнить: CoreDNS vs app — где блокируется?", triggers: ["coredns-wget", "app-wget"] },
        { step: "Найти NetworkPolicy на CoreDNS", triggers: ["get-netpol"] },
        { step: "Удалить или поправить политику", triggers: ["delete-netpol", "fix-netpol"] },
      ],
      beats: [
        { at: 0, tip: "🎬 Ключевая фишка — нестабильность. Клиенты видят мигание, инцидент «иногда»." },
        { at: 4, tip: "🔎 Если игрок нашёл паттерн «то работает то нет» — похвали." },
        { at: 9, tip: "🔥 Если полез в логи CoreDNS — покажи forward failed. Главный ключ." },
        { at: 17, tip: "🏁 Обсудите: почему тесты Security прошли? (только внутри cluster, не попробовали внешний DNS)." },
      ],
    },
  },

  // ── 6. Сертификат исчез ──────────────────────────────────────────
  {
    id: id(6),
    title: "Сертификат исчез",
    summary: "LE rate limit исчерпан: cert-manager спамил попытки, т.к. HTTP-01 challenge падал — Gateway не слушает :80.",
    type: "TLS, cert-manager, LE rate limit",
    difficulty: Difficulty.MIDDLE,
    durationMin: 22,
    position: 6,
    contextJson: {
      infra: "Kubernetes 1.34, Gateway API v1.4 + NGINX Gateway Fabric, cert-manager 1.16",
      services: ["shop-frontend", "shop-api", "shop-admin"],
      setup: "Let's Encrypt HTTP-01 через Gateway. Последнее обновление cert — 2 месяца назад. После retirement ingress-nginx кластер на Gateway API.",
      time: "Понедельник, 09:15",
    },
    eventsJson: [
      { t: 0, type: "msg", title: "Утренняя паника", body: '**CEO:** «Сайт не открывается! Ошибка сертификата!»\n\nВ браузере:\n```\nIssuer:  R3 (Let\'s Encrypt)\nExpires: April 18, 2026 (EXPIRED 2 days ago!)\n```' },
      { t: 2, type: "event", title: "Смотрим сертификаты", body: "```\n$ kubectl get certificate -A\nNAMESPACE   NAME                    READY\nproduction  shop-example-com-tls    False\nproduction  api-shop-example-tls    False\nproduction  admin-shop-example-tls  False\n```\nВсе три — `Ready: False`." },
      { t: 4, type: "event", title: "Детали certificate", body: "```\nConditions:\n  Message: Certificate issuance failed:\n    Failed to create order: 429 urn:ietf:params:acme:error:rateLimited:\n    Error creating new order :: too many certificates (5)\n    already issued for this exact set of domains in the last 168 hours\n  \nEvents:\n  Warning  RateLimited  200 events over 2 days\n```\n**Rate limit LE:** 5 сертификатов на домен за 168 часов (7 дней)." },
      { t: 7, type: "event", title: "Почему challenge упал", body: "```\n[error] \"ACME server refused to issue certificate\" error=\"429\"\n[error] \"error processing challenge\"\n  error=\"http-01 self-check failed for domain shop.example.com\"\n```\nСначала challenge падал → cert-manager повторял → исчерпал rate limit." },
      { t: 10, type: "event", title: "Почему HTTP-01 не проходит", body: "```\n$ kubectl get gateway shop-gateway -o yaml | grep -A5 listeners\nlisteners:\n- name: https\n  port: 443\n  protocol: HTTPS\n# ← нет listener на порт 80!\n```\nKто-то убрал HTTP listener. HTTP-01 challenge всегда идёт на :80 → падает." },
      { t: 14, type: "event", title: "Фикс", body: "**Срочно:** переключаемся на DNS-01 challenge (не требует HTTP-порта):\n```yaml\nkind: ClusterIssuer\nspec:\n  acme:\n    solvers:\n    - dns01:\n        route53:\n          region: us-east-1\n          hostedZoneID: Z1234\n```\n\nИли: staging LE для теста, потом prod." },
      { t: 18, type: "event", title: "Долгосрочно", body: "- Вернуть HTTP listener на 80 (хотя бы для ACME /.well-known/)\n- Или перейти на DNS-01 навсегда\n- Алерт на Certificate.Ready=False > 1 час\n- Runbook: rate limit → DNS-01 / staging / коммерческий cert" },
    ],
    hintsJson: [
      { when: "Не знает где смотреть", gm: "Если cert expired — это LE и cert-manager не сработал", chat: "kubectl get certificate -A", team: "Смотри Ready:False, потом describe — там причина" },
      { when: "Не понимает rate limit", gm: "Когда cert-manager видит ошибку — пробует снова. И снова.", chat: "LE даёт 5 успешных на домен в неделю", team: "Используй DNS-01 или LE staging для теста" },
      { when: "Не видит почему challenge fail", gm: "Как LE проверяет что домен твой? По какому порту?", chat: "HTTP-01 всегда на :80", team: "Проверь listeners на Gateway — есть ли HTTP на 80" },
    ],
    actionsJson: [
      { id: "get-cert", cat: "check", label: "kubectl get certificate -A", priority: 1, response: "```\nproduction  shop-example-com-tls    False\nproduction  api-shop-example-tls    False\n```\n**Все Ready: False.**", gmHint: "Все сертификаты лежат — системная проблема." },
      { id: "describe-cert", cat: "check", label: "kubectl describe certificate shop-example-com-tls -n production", priority: 1, response: "```\nMessage: Failed: 429 rateLimited: too many certificates (5) issued in last 168 hours\nEvents: Warning RateLimited 200 events over 2 days\n```", gmHint: "**Ключ.** LE Rate Limit: 5 certs per domain per 168h." },
      { id: "cert-mgr-logs", cat: "logs", label: "kubectl logs -n cert-manager deploy/cert-manager --tail=100", priority: 1, response: "```\n[error] \"ACME server refused\" error=\"429\"\n[error] \"error processing challenge\" error=\"http-01 self-check failed\"\n[error] \"no matching listener for port 80\"\n```\nПервопричина — challenge не работал.", gmHint: "Первопричина — challenge не работал. Надо понять почему." },
      { id: "get-gateway", cat: "check", label: "kubectl get gateway shop-gateway -o yaml | grep -A5 listeners", priority: 1, response: "```yaml\nlisteners:\n- name: https\n  port: 443\n  protocol: HTTPS\n# ← listener для порта 80 ОТСУТСТВУЕТ!\n```\n**Gateway слушает только 443.**", gmHint: "**Корень зла.** Кто-то убрал HTTP listener. Challenge от LE идёт на :80 → дропается." },
      { id: "apply-dns01", cat: "fix", label: "kubectl apply -f clusterissuer-dns01.yaml", priority: 1, response: "clusterissuer.cert-manager.io/letsencrypt-dns01 created. DNS-01 challenge не требует HTTP порта.", gmHint: "Лучший быстрый фикс — переключиться на DNS-01." },
      { id: "add-http-listener", cat: "fix", label: "Добавить HTTP listener на Gateway (port 80)", response: "```yaml\nlisteners:\n- name: http\n  port: 80\n  protocol: HTTP\n```\nТеперь HTTP-01 challenge может дойти.", gmHint: "Правильное долгосрочное решение — вернуть HTTP listener." },
    ],
    gmScriptJson: {
      pressure: [
        { at: 0, who: "👔 CEO", msg: "@sre Сайт не открывается! Ошибка сертификата! ЧТО ПРОИСХОДИТ?!" },
        { at: 2, who: "📞 Support", msg: "Клиенты жалуются: NET::ERR_CERT_AUTHORITY_INVALID. Что им отвечать?" },
        { at: 6, who: "📊 PM", msg: "Продажи встали полностью. $2k/мин теряем." },
        { at: 18, who: "📞 Support", msg: "200 тикетов. Соцсети пишут что сайт мёртв." },
      ],
      checkpoints: [
        { step: "Проверить сертификаты — Ready:False", triggers: ["get-cert"] },
        { step: "Найти rate limit в describe cert", triggers: ["describe-cert"] },
        { step: "Gateway — нет listener на 80", triggers: ["get-gateway"] },
        { step: "Переключиться на DNS-01 или добавить HTTP listener", triggers: ["apply-dns01", "add-http-listener"] },
      ],
      beats: [
        { at: 0, tip: "🎬 Утро понедельника. CEO уже в ярости. Передай это настроение игроку." },
        { at: 3, tip: "🔎 Если игрок видит Ready:False — направляй в describe cert." },
        { at: 7, tip: "🔥 Ключевой момент: rate limit. Почему cert-manager сам себя затопил?" },
        { at: 17, tip: "🏁 Обсудите: как предотвратить? (мониторинг срока cert, алерт за 30 дней, DNS-01 всегда лучше HTTP-01)." },
      ],
    },
  },

  // ── 7. Невидимая сеть ────────────────────────────────────────────
  {
    id: id(7),
    title: "Невидимая сеть",
    summary: "Hardening VPC SecurityGroup заблокировал межзональный трафик. Istio Ambient circuit breaker добил ситуацию.",
    type: "Istio Ambient, VPC SG, каскадный отказ",
    difficulty: Difficulty.SENIOR,
    durationMin: 25,
    position: 7,
    contextJson: {
      infra: "Kubernetes 1.34, 3 ноды в разных зонах (a/b/d), Istio 1.29 Ambient (ztunnel + waypoint)",
      services: ["frontend → api-gateway → order-service → payment-service / notification-service, postgres"],
      setup: "Утром 08:30 сетевая команда применила новую SecurityGroup «для hardening». Канарейка прошла.",
      time: "Четверг, 14:30 (пик)",
    },
    eventsJson: [
      { t: 0, type: "alert", title: "Алерты", body: "```\n[FIRING:3] HighErrorRate order-service: 12% 503\n[FIRING:1] HighLatency payment-service p95: 5.2s (threshold 2s)\n```\n`kubectl get pods` — все Running." },
      { t: 2, type: "event", title: "Логи приложения", body: "**order-service:**\n```\n[WARN] Payment service timeout (3s)\n[ERROR] Payment service unavailable after 3 retries\n```\n**payment-service:** очень мало запросов за минуту. Трафик теряется." },
      { t: 5, type: "event", title: "Ambient mode — нет sidecar!", body: "В Ambient sidecar-ов нет. Правильные источники:\n```\n# ztunnel на ноде отправителя\n$ kubectl logs -n istio-system ds/ztunnel | grep payment\n\n[WARN] inpod: connection refused 10.112.1.23 → 10.112.2.45:8080\n[WARN] inpod: connection timeout to 10.112.2.46:8080\n```" },
      { t: 8, type: "event", title: "Проверка connectivity", body: "```\n# Из order-service прямо по IP payment\n$ curl -m 5 http://10.112.2.45:8080/health\nConnection timeout\n\n# Внутри зоны b (payment к соседу)\n$ curl http://10.112.2.46:8080/health\n200 OK\n```" },
      { t: 11, type: "event", title: "Паттерн", body: "```\norder-service-xxx      10.112.1.23   ru-central1-a\norder-service-yyy      10.112.3.24   ru-central1-d\npayment-service-xxx    10.112.2.45   ru-central1-b\npayment-service-yyy    10.112.2.46   ru-central1-b\n```\nТрафик **не проходит в зону b** из других зон." },
      { t: 13, type: "event", title: "Root cause — SecurityGroup", body: "```\n$ yc vpc security-group get <sg-id>\n\nIngress rules:\n  - allow tcp from same-zone   ← добавлено утром\n  # межзональный ingress — удалён\n```\nСетевики «hardening-и» заблокировали межзональный трафик. На канарейке сервисы в одной зоне — не заметили." },
      { t: 16, type: "event", title: "Быстрый фикс", body: "```\n$ yc vpc security-group update-rules <sg-id> \\\n  --add-rule \"direction=ingress,port=all,protocol=any,v4-cidrs=[10.112.0.0/16]\"\n```\nЧерез 30 секунд связность вернётся." },
      { t: 18, type: "alert", title: "Circuit breaker остался", body: "```\n[FIRING] CircuitBreakerOpen\n\n$ istioctl proxy-config endpoints deploy/order-service-waypoint.production | grep payment\n10.112.2.45:8080    HEALTHY   EJECTED\n10.112.2.46:8080    HEALTHY   EJECTED\n```\nWaypoint пометил endpoints как EJECTED после кучи фейлов." },
      { t: 20, type: "event", title: "Сброс circuit breaker", body: "```\n$ kubectl rollout restart deploy/order-service-waypoint -n production\n```\nЧерез ~30 сек circuit закрыт, endpoint-ы снова в ротации." },
    ],
    hintsJson: [
      { when: "Забыл что Ambient", gm: "Sidecar-а нет. Кто теперь proxy?", chat: "ztunnel на ноде + опционально waypoint", team: "kubectl logs -n istio-system ds/ztunnel" },
      { when: "Не ищет паттерн по зонам", gm: "Где физически живут проблемные поды?", chat: "kubectl get pods -o wide — смотри зоны", team: "В Ambient zone-aware routing — проверь spread" },
      { when: "Не думает про облачный FW", gm: "Istio и NetworkPolicy это application layer. А есть ещё слой...", chat: "VPC SG работает ниже Kubernetes", team: "yc vpc security-group list + get <id>" },
      { when: "Circuit breaker остался", gm: "Правило облачное убрали, но Istio уже запомнил endpoint как плохой", chat: "Outlier detection + ejection", team: "kubectl rollout restart deploy/waypoint" },
    ],
    actionsJson: [
      { id: "get-pods-wide", cat: "check", label: "kubectl get pods -n production -o wide", priority: 1, response: "```\norder-service-xxx      10.112.1.23    ru-central1-a\npayment-service-aaa    10.112.2.45    ru-central1-b   ← обе тут\npayment-service-bbb    10.112.2.46    ru-central1-b\n```", gmHint: "**Оба payment в зоне b.** Скоро всплывёт паттерн." },
      { id: "logs-ztunnel", cat: "logs", label: "kubectl logs -n istio-system ds/ztunnel --tail=50 | grep payment", priority: 1, response: "```\n[WARN] inpod: connection refused 10.112.1.23 → 10.112.2.45:8080\n[WARN] inpod: connection timeout to 10.112.2.46:8080\n```\nztunnel видит — трафик order→payment блокируется на уровне сети.", gmHint: "**Ключевой инсайт.** В Ambient mode ztunnel = sidecar." },
      { id: "curl-debug", cat: "exec", label: "kubectl debug order-service-xxx -it --image=nicolaka/netshoot -- curl -m 5 http://10.112.2.45:8080/health", priority: 1, response: "curl: (28) Connection timed out\n**По IP напрямую — timeout.**", gmHint: "Значит не DNS и не Istio. Это сетевой уровень." },
      { id: "curl-inzone", cat: "exec", label: "kubectl debug payment-service-aaa -it --image=nicolaka/netshoot -- curl http://10.112.2.46:8080/health", response: "200 OK\n{\"status\": \"healthy\"}\n**Внутри зоны b — работает.** Снаружи — нет.", gmHint: "**Подтверждение паттерна.** Трафик блокируется только межзонально." },
      { id: "yc-sg-get", cat: "check", label: "yc vpc security-group get sg-xxx", priority: 1, response: "```\ningress_rules:\n  - allow tcp from same-zone       ← добавлено утром!\n  # ранее было: from_prefix: 10.112.0.0/16 (вся сеть)\n```\n**Root cause.** Правило утром поменяли с «вся сеть» на «только в той же зоне».", gmHint: "**Вот зачем была «канарейка».** Тестировали в одной зоне — не видно было что межзональный трафик сломан." },
      { id: "yc-sg-fix", cat: "fix", label: "yc vpc security-group update-rules sg-xxx --add-rule \"ingress,v4-cidrs=[10.112.0.0/16]\"", priority: 1, response: "done. Через 30 секунд межзональный трафик пойдёт.", gmHint: "Правильный фикс на облачном уровне. Но останется проблема с outlier-ejected endpoints." },
      { id: "restart-waypoint", cat: "fix", label: "kubectl rollout restart deploy/order-service-waypoint -n production", priority: 1, response: "deployment.apps/order-service-waypoint restarted. Через ~30 сек трафик пойдёт штатно.", gmHint: "**Обязательный второй шаг.** Без него даже после фикса сети ошибки будут продолжаться." },
      { id: "istioctl-ep", cat: "check", label: "istioctl proxy-config endpoints deploy/order-service-waypoint.production | grep payment", response: "```\n10.112.2.45:8080    HEALTHY   EJECTED\n10.112.2.46:8080    HEALTHY   EJECTED\n```\n**Оба endpoint выкинуты.** Outlier detection сработал.", gmHint: "Circuit breaker открыт. После фикса сети — всё равно не будет работать пока не сброшен." },
    ],
    gmScriptJson: {
      pressure: [
        { at: 1, who: "🚨 PagerDuty", msg: "HighErrorRate order-service 12% 503" },
        { at: 4, who: "📊 PM", msg: "Заказы не проходят, корзины теряются. Что с платежами?" },
        { at: 9, who: "🔒 Security", msg: "Мы утром hardening выкатили. Прошло через канарейку." },
        { at: 15, who: "💰 Finance", msg: "Мы теряем $10k в минуту. Это критично." },
      ],
      checkpoints: [
        { step: "Найти что оба payment в зоне b", triggers: ["get-pods-wide"] },
        { step: "Ambient: посмотреть ztunnel", triggers: ["logs-ztunnel"] },
        { step: "Попробовать connectivity между зонами", triggers: ["curl-debug", "curl-inzone"] },
        { step: "VPC Security Group — найти правило", triggers: ["yc-sg-get"] },
        { step: "Фикс на облачном уровне", triggers: ["yc-sg-fix"] },
        { step: "Рестарт waypoint для сброса circuit breaker", triggers: ["restart-waypoint"] },
      ],
      beats: [
        { at: 0, tip: "🎬 Senior-сценарий. Требует системного мышления: Istio + облако + zones." },
        { at: 5, tip: "🔎 Если игрок лезет только в логи приложения — намекни что в Ambient нужен ztunnel." },
        { at: 11, tip: "🔥 Паттерн по зонам — главный ключ." },
        { at: 22, tip: "🏁 Обсуди: как Canary не поймал? (тестили в одной зоне, не межзонально)." },
      ],
    },
  },

  // ── 8. Обновление пошло не так ──────────────────────────────────
  {
    id: id(8),
    title: "Обновление пошло не так",
    summary: "Auto-upgrade ночью сломал StatefulSet: PV прибит к зоне, Cassandra деградирует, Kafka теряет партиции.",
    type: "Auto-upgrade, stateful cascade",
    difficulty: Difficulty.SENIOR,
    durationMin: 25,
    position: 8,
    contextJson: {
      infra: "Yandex Managed K8s, 3 node-pool (system-pool×3, app-pool×5, stateful-pool×3)",
      services: ["kafka StatefulSet 3 (RF=3)", "cassandra StatefulSet 5 (RF=3)", "redis-cluster 6", "app-api×10"],
      setup: "Auto-upgrade включён, maintenance window среда 02:00-06:00. Идёт обновление 1.33 → 1.34.",
      time: "Среда, 02:05 (PagerDuty разбудил)",
    },
    eventsJson: [
      { t: 0, type: "alert", title: "PagerDuty", body: "```\n[FIRING] CassandraNodeDown cassandra-2 (3m)\n[FIRING] KafkaUnderReplicatedPartitions 45%\n```\nТы только открыл ноутбук." },
      { t: 2, type: "event", title: "Ноды", body: "```\nstateful-pool-1   NotReady,SchedulingDisabled  v1.33.5  ← draining\nstateful-pool-4   Ready                         v1.34.0  ← new!\n```\nAuto-upgrade запустил rolling: новая v1.34 нода, старая дрейнится." },
      { t: 5, type: "event", title: "Terminating 5 минут", body: "```\ncassandra-2     1/1  Terminating  stateful-pool-1   5d\nkafka-0         1/1  Terminating  stateful-pool-1   10d\n\nWarning  FailedAttachVolume  Volume attached to another node\nWarning  FailedScheduling    0/3 nodes: volume node affinity conflict\n```\nstateful-pool-4 создана в **другой зоне**, PV cassandra-2 прибит к старой." },
      { t: 8, type: "alert", title: "Cassandra саморазрушается", body: "```\n[ERROR] Unable to contact /10.112.2.45 (cassandra-2): timeout\n[WARN] Gossip: marking /10.112.2.45 as DOWN\n```\ncassandra-0/1 запускают repair+compaction — нагружают друг друга." },
      { t: 9, type: "alert", title: "Kafka тоже", body: "```\nPartition 3  Leader: -1  ISR: [1]\nPartition 5  Leader: -1  ISR: [2]\n```\nISR схлопнулись ниже min.insync.replicas=2. Producer получают NotEnoughReplicasException." },
      { t: 13, type: "event", title: "Остановить кровь!", body: "**Сначала:** pause auto-upgrade:\n```\n$ yc managed-kubernetes node-group update \\\n  --id <stateful-pool-id> --auto-upgrade=false\n```\n\n**Вариант A (быстрый):** uncordon + delete Terminating pod → StatefulSet пересоздаст на старой ноде.\n\n**Вариант B (правильный):** добавить ноду в зоне a (версии 1.34)." },
      { t: 17, type: "event", title: "Восстановление Kafka", body: "1. Проверить `kafka-topics --describe` — все брокеры UP\n2. `kafka-preferred-replica-election` — переизбрать лидеров\n3. Мониторить `UnderReplicatedPartitions` → 0" },
      { t: 22, type: "event", title: "Урок", body: "Для StatefulSet с PV auto-upgrade в один шаг — антипаттерн:\n- **Лучше:** добавить новую ноду → дождаться → drain старую\n- **Либо:** отдельный maintenance window для stateful (не авто)\n- **Алерт** на `CassandraNodeDown` > 2 минуты во время maintenance window" },
    ],
    hintsJson: [
      { when: "Не понимает что происходит", gm: "Что было 5 минут назад? PagerDuty разбудил — почему именно сейчас?", chat: "Auto-upgrade по ночам — классика", team: "kubectl get nodes + VERSION колонка" },
      { when: "Паника, трогает всё", gm: "Остановить кровь → потом разбираться. Что ещё может сломаться?", chat: "Pause auto-upgrade первым делом", team: "yc managed-kubernetes node-group update --auto-upgrade=false" },
      { when: "Не знает как вернуть", gm: "Если переехать нельзя — вернуть на место", chat: "uncordon + delete stuck pod", team: "Или временная нода в нужной зоне как в scenario 4" },
    ],
    actionsJson: [
      { id: "get-nodes", cat: "check", label: "kubectl get nodes", priority: 1, response: "```\nstateful-pool-1   NotReady,SchedulingDisabled  v1.33.5   ← draining\nstateful-pool-4   Ready                         v1.34.0   ← новая!\n```\n**Auto-upgrade запустил rolling.** Разные версии — значит процесс не завершён.", gmHint: "**Главный факт:** идёт апгрейд." },
      { id: "get-pods-stuck", cat: "check", label: "kubectl get pods -o wide | grep stateful-pool-1", priority: 1, response: "```\ncassandra-2   1/1  Terminating  stateful-pool-1   5d\nkafka-0       1/1  Terminating  stateful-pool-1   10d\n```\n**Поды в Terminating 5+ минут.** Не могут уйти.", gmHint: "Знакомая ситуация — поды не эвиктятся. Скорее всего PV прибит к зоне." },
      { id: "describe-cassandra", cat: "check", label: "kubectl describe pod cassandra-2", priority: 1, response: "```\nWarning  FailedAttachVolume  Volume attached to another node\nWarning  FailedScheduling   0/3 nodes: volume node affinity conflict\n```\nНовая нода stateful-pool-4 не в той же зоне что PV cassandra-2.", gmHint: "Тот же zone affinity паттерн что в scenario «Застрявшие поды»." },
      { id: "pause-upgrade", cat: "fix", label: "yc managed-kubernetes node-group update --id <stateful-pool-id> --auto-upgrade=false", priority: 1, response: "done. auto_upgrade: false\n**Первый шаг — остановить кровотечение.**", gmHint: "**Приоритет №1.** До разбирательства — остановить auto-upgrade." },
      { id: "uncordon", cat: "fix", label: "kubectl uncordon stateful-pool-1", priority: 1, response: "node/stateful-pool-1 uncordoned. Нода снова принимает нагрузку.", gmHint: "**Вариант A (быстрый).** Вернуть всё как было." },
      { id: "delete-stuck", cat: "fix", label: "kubectl delete pod cassandra-2 --force --grace-period=0", priority: 1, response: "pod force deleted. StatefulSet создаёт новый под на stateful-pool-1 (uncordoned).", gmHint: "После uncordon — force delete чтобы быстрее пересоздалось." },
      { id: "kafka-reelect", cat: "fix", label: "kubectl exec kafka-0 -- kafka-preferred-replica-election --bootstrap-server localhost:9092", response: "Successfully started the preferred replica election. Через минуту ISR восстановится.", gmHint: "Для Kafka нужно руками триггернуть re-election лидеров." },
      { id: "kafka-topics", cat: "exec", label: "kubectl exec kafka-0 -- kafka-topics --describe --bootstrap-server localhost:9092", priority: 1, response: "```\nTopic: payments   UnderReplicated: 8\n    Partition 3  Leader: -1  Replicas: 0,1,2  ISR: [1]\n```\n**8 партиций без лидера.** ISR схлопнулся.", gmHint: "Producer получают NotEnoughReplicasException. Платежи теряются." },
    ],
    gmScriptJson: {
      pressure: [
        { at: 0, who: "🚨 PagerDuty", msg: "CassandraNodeDown cassandra-2 (3m) — ТЫ ТОЛЬКО ЧТО ОТКРЫЛ НОУТ" },
        { at: 3, who: "🚨 PagerDuty", msg: "KafkaUnderReplicatedPartitions 45% — каскад" },
        { at: 7, who: "🚨 PagerDuty", msg: "200 алертов за 10 минут." },
        { at: 12, who: "💰 Finance", msg: "Платежи не проходят. $50k/час." },
        { at: 18, who: "👔 CTO (разбужен)", msg: "Кто утром настраивал auto-upgrade на stateful? СРОЧНО" },
      ],
      checkpoints: [
        { step: "Понять что идёт auto-upgrade", triggers: ["get-nodes"] },
        { step: "Увидеть застрявшие terminating поды", triggers: ["get-pods-stuck"] },
        { step: "Увидеть zone affinity конфликт", triggers: ["describe-cassandra"] },
        { step: "ПЕРВЫЙ ШАГ: pause auto-upgrade", triggers: ["pause-upgrade"] },
        { step: "Вернуть cassandra — uncordon + delete stuck", triggers: ["uncordon", "delete-stuck"] },
        { step: "Kafka re-election лидеров", triggers: ["kafka-reelect"] },
      ],
      beats: [
        { at: 0, tip: "🎬 2 ночи. Тебя разбудил PD. Ты в пижаме. Передай это состояние." },
        { at: 4, tip: "🚨 Сразу много алертов. Главная задача — не паниковать." },
        { at: 7, tip: "🔥 ПРИОРИТЕТ: остановить кровотечение. pause auto-upgrade первым делом." },
        { at: 23, tip: "🏁 Главный урок: auto-upgrade для stateful — антипаттерн." },
      ],
    },
  },

  // ── 9. Сломанные пробы ──────────────────────────────────────────
  {
    id: id(9),
    title: "Сломанные пробы",
    summary: "Readiness/Liveness probe ведут на устаревший путь после релиза — два из трёх подов вываливаются из сервиса.",
    type: "Readiness/Liveness, неудачный rollout",
    difficulty: Difficulty.JUNIOR,
    durationMin: 18,
    position: 9,
    contextJson: {
      infra: "Kubernetes 1.34, Deployment payment-api (3 реплики), Service, Ingress",
      services: ["payment-api (Go, 3 реплики)", "postgres", "redis"],
      setup: "Разработчик добавил новый эндпоинт `/healthz/ready`, а chart обновили 10 минут назад.",
      time: "Понедельник, 11:20",
    },
    eventsJson: [
      { t: 0, type: "alert", title: "Первые жалобы", body: '> «После релиза checkout то работает, то 502»\n\n`kubectl get pods` показывает все 3 новых пода `Running`, но трафик явно теряется.' },
      { t: 2, type: "event", title: "Сервис почти пустой", body: "```\n$ kubectl get endpoints payment-api\nNAME          ENDPOINTS          AGE\npayment-api   10.244.1.12:8080   120d\n```\nИз 3 подов в сервисе остался только один endpoint." },
      { t: 5, type: "event", title: "Смотрим pod", body: "```\nWarning  Unhealthy  Readiness probe failed: HTTP probe failed with statuscode: 404\nNormal   Killing    Container payment-api failed liveness probe, will be restarted\n```\nВ chart пробы смотрят в старый путь `/ready`." },
      { t: 9, type: "event", title: "Почему стало хуже", body: "Rolling update почти завершился: 2 новых пода не готовы, старые уже удалены. Сервис живёт на одном последнем healthy pod." },
      { t: 13, type: "event", title: "Фикс", body: "```yaml\nreadinessProbe:\n  httpGet:\n    path: /healthz/ready\nlivenessProbe:\n  httpGet:\n    path: /healthz/live\n```\nПосле `kubectl rollout restart` endpoints снова становятся `3/3`." },
    ],
    hintsJson: [
      { when: "Смотрит только логи приложения", gm: "Под может Running, но не быть в сервисе. Что отвечает за это?", chat: "Смотри readiness, не только process up/down", team: "kubectl describe pod ... | grep -A5 probe" },
      { when: "Не понимает 502", gm: "Сколько endpoint реально видит Service?", chat: "kubectl get endpoints", team: "Если readiness не проходит, kube-proxy не шлёт трафик в под" },
      { when: "Хочет просто рестартнуть", gm: "Рестарт с той же probe ничего не поменяет", chat: "Надо править spec", team: "kubectl edit deploy/payment-api" },
    ],
    actionsJson: [
      { id: "bp-get-pods", cat: "check", label: "kubectl get pods", priority: 1, response: "```\npayment-api-aaa11   0/1    Running  4  8m\npayment-api-bbb22   0/1    Running  3  8m\npayment-api-ccc33   1/1    Running  0  8m\n```", gmHint: "Поды Running, но не Ready. Хороший заход." },
      { id: "bp-get-ep", cat: "check", label: "kubectl get endpoints payment-api", priority: 1, response: "```\nNAME          ENDPOINTS          AGE\npayment-api   10.244.1.12:8080   120d\n```\nВ сервисе всего один живой endpoint.", gmHint: "Ключевой симптом — именно readiness." },
      { id: "bp-describe", cat: "check", label: "kubectl describe pod payment-api-...", priority: 1, response: "```\nWarning  Unhealthy  Readiness probe failed: HTTP probe failed with statuscode: 404\nWarning  Unhealthy  Liveness probe failed: HTTP probe failed with statuscode: 404\n```\nПроба ходит в несуществующий URL.", gmHint: "Главная улика." },
      { id: "bp-logs", cat: "logs", label: "kubectl logs payment-api-... --tail=20", response: "```\n[INFO] listening on :8080\n[INFO] GET /healthz/ready 200\n[INFO] GET /healthz/live 200\n```\nПриложение живо, просто probes смотрят не туда.", gmHint: "Помогает отличить app bug от deploy bug." },
      { id: "bp-get-deploy", cat: "check", label: "kubectl get deploy payment-api -o yaml | grep -A12 probe", priority: 1, response: "```yaml\nreadinessProbe:\n  httpGet:\n    path: /ready\nlivenessProbe:\n  httpGet:\n    path: /live\n```\nВ spec остались старые пути.", gmHint: "После этого игрок должен править Deployment." },
      { id: "bp-edit", cat: "fix", label: "kubectl edit deployment payment-api", priority: 1, response: "В deployment исправлены пути на `/healthz/ready` и `/healthz/live`. Rolling update начинается.", gmHint: "Правильный фикс." },
      { id: "bp-restart", cat: "fix", label: "kubectl rollout restart deployment/payment-api", response: "deployment.apps/payment-api restarted. После исправления spec новые поды становятся Ready.", gmHint: "Использовать после правки probes." },
      { id: "bp-scale", cat: "danger", label: "kubectl scale deployment payment-api --replicas=6", response: "Появится 6 подов `0/1 Running`. Проблема только масштабируется.", gmHint: "Scale не лечит битую readiness." },
    ],
    gmScriptJson: {
      pressure: [
        { at: 1, who: "💳 PM", msg: "Оплата иногда проходит, иногда нет. Самое неприятное состояние." },
        { at: 6, who: "👨‍💻 Разработчик", msg: "У меня локально всё ок, сервис точно отвечает на /healthz/ready." },
        { at: 12, who: "👔 Руководитель", msg: "Почему после релиза сервис как будто полуживой?" },
      ],
      checkpoints: [
        { step: "Увидеть что pod не Ready", triggers: ["bp-get-pods"] },
        { step: "Проверить endpoints сервиса", triggers: ["bp-get-ep"] },
        { step: "Найти 404 в probe", triggers: ["bp-describe", "bp-get-deploy"] },
        { step: "Исправить Deployment и перезапустить rollout", triggers: ["bp-edit", "bp-restart"] },
      ],
      beats: [
        { at: 0, tip: "🎬 Классический джун-сценарий: app жива, deployment описан неверно." },
        { at: 7, tip: "🔎 Если застрял в логах — мягко направь к readiness/endpoints." },
        { at: 15, tip: "🏁 В финале обсуди разницу между liveness, readiness и startupProbe." },
      ],
    },
  },

  // ── 10. Квота съела релиз ────────────────────────────────────────
  {
    id: id(10),
    title: "Квота съела релиз",
    summary: "ResourceQuota исчерпана, rollout завис. LimitRange запрещает снизить requests ниже минимума.",
    type: "ResourceQuota, LimitRange, failed rollout",
    difficulty: Difficulty.JUNIOR,
    durationMin: 18,
    position: 10,
    contextJson: {
      infra: "Kubernetes namespace production с ResourceQuota и LimitRange",
      services: ["report-api", "worker", "cronjob aggregator"],
      setup: "Команда выкатила новый worker и увеличила requests для report-api.",
      time: "Вторник, 16:10",
    },
    eventsJson: [
      { t: 0, type: "msg", title: "Релиз завис", body: '> «Helm deploy крутится уже 7 минут. Новая версия не поднимается, старые поды частично удалились.»' },
      { t: 3, type: "event", title: "ReplicaSet не создаёт поды", body: "```\nFailedCreate: pods \"report-api-7c4...\" is forbidden:\nexceeded quota: prod-quota, requested: requests.cpu=800m, used: 3900m, limited: 4\n```" },
      { t: 7, type: "event", title: "Вторая ловушка", body: "Даже когда уменьшаешь requests, срабатывает LimitRange:\n```\nminimum cpu usage per Container is 200m\n```\nПросто поставить `50m` нельзя." },
      { t: 12, type: "event", title: "Правильный ход", body: "Нужно либо временно уменьшить количество реплик у менее критичного worker, либо согласованно править quota/requests. Бездумно удалять quota нельзя." },
    ],
    hintsJson: [
      { when: "Думает что проблема в образе", gm: "Смотри Events у ReplicaSet/Deployment", chat: "FailedCreate часто сразу говорит root cause", team: "kubectl describe deploy report-api" },
      { when: "Хочет убрать quota", gm: "Quota поставлена не просто так. Есть ли более безопасный путь?", chat: "Освободи ресурсы временно или согласуй лимиты", team: "Сначала понять кто ест requests в namespace" },
      { when: "Не видит LimitRange", gm: "В namespace может быть не только quota, но и минимальные requests", chat: "kubectl get limitrange", team: "kubectl describe limitrange" },
    ],
    actionsJson: [
      { id: "qt-describe-deploy", cat: "check", label: "kubectl describe deploy report-api", priority: 1, response: "```\nEvents:\n  Warning  FailedCreate  exceeded quota: prod-quota, requested: cpu=800m, used: 3900m, limited: 4\n```", gmHint: "Сразу выводит на quota." },
      { id: "qt-get-quota", cat: "check", label: "kubectl describe resourcequota -n production", priority: 1, response: "```\nName: prod-quota\nrequests.cpu     3900m  4\nrequests.memory  7600Mi 8Gi\npods             27     40\n```", gmHint: "CPU requests почти в потолке." },
      { id: "qt-get-lr", cat: "check", label: "kubectl describe limitrange -n production", priority: 1, response: "```\nType       Resource  Min\nContainer  cpu       200m\nContainer  memory    256Mi\n```", gmHint: "Объясняет почему нельзя просто занизить requests в ноль." },
      { id: "qt-top", cat: "check", label: "kubectl top pod -n production", response: "```\nworker-aaa   40m   180Mi\nworker-bbb   35m   170Mi\n```\nWorker-ы почти ничего не потребляют, но requests у них по 500m.", gmHint: "Помогает найти где высвободить quota." },
      { id: "qt-scale-worker", cat: "fix", label: "kubectl scale deploy worker --replicas=1", priority: 1, response: "deployment.apps/worker scaled. Освобождается 1 CPU requests. Новый rollout report-api проходит.", gmHint: "Хороший временный шаг, если worker менее критичен." },
      { id: "qt-patch-deploy", cat: "fix", label: "kubectl patch deploy report-api ... requests.cpu=400m", response: "После патча requests проходят quota и удовлетворяют LimitRange. Поды создаются.", gmHint: "Допустимо, если приложение реально укладывается." },
      { id: "qt-delete-quota", cat: "danger", label: "kubectl delete resourcequota prod-quota", response: "Quota исчезла, но namespace потерял защиту. Через 20 минут соседний job выбил ноды по CPU.", gmHint: "Хороший антипример: не сносить guardrail без необходимости." },
    ],
    gmScriptJson: {
      pressure: [
        { at: 2, who: "📊 Аналитик", msg: "Новый отчёт нужен до конца дня, релиз горит." },
        { at: 8, who: "🧱 Платформенная команда", msg: "Quota руками удалять нельзя без согласования." },
        { at: 14, who: "👔 Тимлид", msg: "Нужен безопасный workaround, а не ломать namespace." },
      ],
      checkpoints: [
        { step: "Найти FailedCreate с quota", triggers: ["qt-describe-deploy"] },
        { step: "Посмотреть ResourceQuota и LimitRange", triggers: ["qt-get-quota", "qt-get-lr"] },
        { step: "Безопасно освободить ресурсы или уменьшить requests", triggers: ["qt-scale-worker", "qt-patch-deploy"] },
      ],
      beats: [
        { at: 0, tip: "🎬 Сценарий про то, что rollout может ломаться ещё до запуска контейнера." },
        { at: 9, tip: "🔎 Если тянет удалять quota — обсуди зачем она вообще существует." },
        { at: 16, tip: "🏁 В конце можно поговорить про capacity planning в namespace." },
      ],
    },
  },

  // ── 11. Шторм из CronJob ─────────────────────────────────────────
  {
    id: id(11),
    title: "Шторм из CronJob",
    summary: "CronJob с concurrencyPolicy:Allow и коротким интервалом накапливает job-ы, перегружая postgres и API.",
    type: "CronJob, concurrencyPolicy, runaway jobs",
    difficulty: Difficulty.JUNIOR,
    durationMin: 18,
    position: 11,
    contextJson: {
      infra: "Kubernetes 1.34, nightly CronJob, postgres, object storage",
      services: ["nightly-export CronJob", "api", "postgres"],
      setup: "Команда добавила экспорт данных каждые 5 минут вместо одного раза за ночь.",
      time: "Среда, 09:05",
    },
    eventsJson: [
      { t: 0, type: "alert", title: "Нода задыхается", body: "CPU на namespace `batch` подскочил до 95%, API отвечает медленно, postgres перегружен." },
      { t: 4, type: "event", title: "Список job", body: "```\nnightly-export-2891   0/1  Running  23m\nnightly-export-2892   0/1  Running  18m\nnightly-export-2893   0/1  Running  13m\nnightly-export-2894   0/1  Running   8m\nnightly-export-2895   0/1  Running   3m\n```\nКаждая job длится 20+ минут, но новая стартует каждые 5." },
      { t: 8, type: "event", title: "Корень проблемы", body: "В CronJob стоит `concurrencyPolicy: Allow`. Job-ы наезжают друг на друга и одновременно читают тяжёлые данные из postgres." },
      { t: 13, type: "event", title: "Фикс", body: "Нужно остановить новые запуски (`suspend: true`), прибить лишние job/pod-ы и поменять политику на `Forbid` или `Replace`." },
    ],
    hintsJson: [
      { when: "Не смотрит batch объекты", gm: "Проблема может быть не в deployment, а в job-ах", chat: "kubectl get cronjobs,jobs", team: "Batch тоже часть кластера" },
      { when: "Хочет delete pod по одному", gm: "Сначала останови генератор новых проблем", chat: "suspend CronJob", team: "kubectl patch cronjob nightly-export -p {\"spec\":{\"suspend\":true}}" },
      { when: "Не знает какую policy выбрать", gm: "Если предыдущий export не закончился, нужно ли запускать следующий?", chat: "Обычно Forbid", team: "concurrencyPolicy: Forbid" },
    ],
    actionsJson: [
      { id: "cs-get-cj", cat: "check", label: "kubectl get cronjobs,jobs", priority: 1, response: "```\ncronjob/nightly-export   schedule: */5 * * * *   suspend: false\njob/nightly-export-2891  Running 23m\njob/nightly-export-2892  Running 18m\n...\n```", gmHint: "Главный паттерн — jobs копятся." },
      { id: "cs-describe-cj", cat: "check", label: "kubectl describe cronjob nightly-export", priority: 1, response: "```\nSchedule:           */5 * * * *\nConcurrency Policy: Allow\nSuspend:            False\n```", gmHint: "Здесь и скрыта проблема." },
      { id: "cs-logs", cat: "logs", label: "kubectl logs job/nightly-export-2895", response: "```\n[INFO] starting export for 12M rows\n[INFO] still running after 4m...\n```", gmHint: "Показывает что job заведомо длиннее интервала." },
      { id: "cs-suspend", cat: "fix", label: "kubectl patch cronjob nightly-export -p '{\"spec\":{\"suspend\":true}}'", priority: 1, response: "cronjob.batch/nightly-export patched. Новые job больше не создаются.", gmHint: "Первый правильный шаг." },
      { id: "cs-delete-jobs", cat: "fix", label: "kubectl delete job nightly-export-2892 nightly-export-2893 nightly-export-2894 nightly-export-2895", priority: 1, response: "Лишние конкурирующие job удалены. Нагрузка на postgres начинает спадать.", gmHint: "Оставь максимум одну job добежать." },
      { id: "cs-fix-policy", cat: "fix", label: "kubectl edit cronjob nightly-export", priority: 1, response: "CronJob обновлён:\n```yaml\nconcurrencyPolicy: Forbid\nstartingDeadlineSeconds: 120\nsuccessfulJobsHistoryLimit: 1\n```", gmHint: "Правильный постоянный фикс." },
      { id: "cs-delete-pods", cat: "danger", label: "kubectl delete pod -l job-name=nightly-export", response: "Поды удалены, но CronJob и Job controller сразу создают новые. Шторм продолжается.", gmHint: "Нужно бить в источник, не в симптомы." },
    ],
    gmScriptJson: {
      pressure: [
        { at: 2, who: "📈 DBA", msg: "Postgres под 100% CPU. Кто-то читает всё подряд." },
        { at: 9, who: "👨‍💻 Разработчик", msg: "Я просто хотел чаще обновлять отчёт..." },
        { at: 14, who: "👔 Менеджер", msg: "API тоже тормозит, это уже не только batch." },
      ],
      checkpoints: [
        { step: "Увидеть накопившиеся jobs", triggers: ["cs-get-cj"] },
        { step: "Найти concurrencyPolicy: Allow", triggers: ["cs-describe-cj"] },
        { step: "Сначала suspend, потом чистка, потом Forbid", triggers: ["cs-suspend", "cs-delete-jobs", "cs-fix-policy"] },
      ],
      beats: [
        { at: 0, tip: "🎬 Ещё один джун-сценарий: проблема в batch-контроллерах, а не в приложении." },
        { at: 10, tip: "🔥 Если игрок удаляет pod-ы, покажи как их тут же создаёт controller." },
        { at: 16, tip: "🏁 Обсуди разницу между Allow, Forbid и Replace." },
      ],
    },
  },

  // ── 12. Призрачный маршрут ───────────────────────────────────────
  {
    id: id(12),
    title: "Призрачный маршрут",
    summary: "Второй Ingress с wildcard '/' перехватывает API-трафик, клиенты получают HTML вместо JSON.",
    type: "Ingress, host/path routing, canary confusion",
    difficulty: Difficulty.MIDDLE,
    durationMin: 20,
    position: 12,
    contextJson: {
      infra: "NGINX Ingress Controller, external LoadBalancer, два ingress-объекта",
      services: ["shop-frontend", "shop-api", "promo-api"],
      setup: "Маркетинг попросил быстро добавить `/promo`, и команда выкатила новый ingress.",
      time: "Четверг, 12:40",
    },
    eventsJson: [
      { t: 0, type: "alert", title: "Странный трафик", body: "Пользователи ходят на `shop.example.ru/api`, а получают HTML лендинга. Ошибок у API почти нет, но клиенты падают на JSON parse." },
      { t: 4, type: "event", title: "Два ingress на один host", body: "Два Ingress ресурса с одинаковым host `shop.example.ru`. nginx-ingress мерджит правила по `creationTimestamp`; аннотация `nginx.ingress.kubernetes.io/rewrite-target: /` + `pathType: ImplementationSpecific` на promo-ingress переключает путь в regex-режим и перехватывает всё, включая `/api`." },
      { t: 9, type: "event", title: "Симптом", body: "```\n$ curl -H \"Host: shop.example.ru\" https://lb/api/orders\n<html>promo landing</html>\n```\nМаршрут реально уходит не в `shop-api`." },
      { t: 14, type: "event", title: "Фикс", body: "Нужно либо объединить правила в один ingress, либо выставить корректные `pathType: Prefix` и убрать конфликтующий wildcard route." },
    ],
    hintsJson: [
      { when: "Смотрит только поды", gm: "Поды healthy, а ответ не тот. Где может искажаться маршрут?", chat: "Ingress / LB слой", team: "kubectl get ingress -A" },
      { when: "Не проверяет фактический ответ", gm: "Сравни curl с нужным Host header", chat: "Проверь что реально отдаёт балансер", team: "curl -H \"Host: ...\" https://LB/path" },
      { when: "Не думает про pathType и rewrite-target", gm: "Посмотри аннотации promo-ingress — что-то переключает режим матчинга", chat: "rewrite-target включает regex-mode → перехват всего host", team: "kubectl get ingress -A -o yaml | grep -E 'rewrite-target|pathType'" },
    ],
    actionsJson: [
      { id: "wi-get-ing", cat: "check", label: "kubectl get ingress -A", priority: 1, response: "```\nproduction   shop-main    shop.example.ru   /api,/static\nproduction   shop-promo   shop.example.ru   /\n```", gmHint: "Два ingress с одним host." },
      { id: "wi-describe-main", cat: "check", label: "kubectl describe ingress shop-main", priority: 1, response: "```\nRules:\n  Host shop.example.ru\n    /api     shop-api:8080    pathType=Prefix\n    /static  shop-frontend:80 pathType=Prefix\n```", gmHint: "Main ingress нормальный." },
      { id: "wi-describe-promo", cat: "check", label: "kubectl describe ingress shop-promo", priority: 1, response: "```\nRules:\n  Host shop.example.ru\n    /        promo-api:8080   pathType=ImplementationSpecific\nAnnotations:\n  nginx.ingress.kubernetes.io/rewrite-target: /\n```", gmHint: "Конфликтующий маршрут." },
      { id: "wi-curl", cat: "exec", label: "curl -H \"Host: shop.example.ru\" https://lb.example.ru/api/orders", priority: 1, response: "```\nHTTP/2 200\ncontent-type: text/html\n\n<html>promo landing</html>\n```", gmHint: "Лучшее подтверждение реального поведения." },
      { id: "wi-edit", cat: "fix", label: "kubectl edit ingress shop-promo", priority: 1, response: "Маршрут изменён на `path: /promo` с `pathType: Prefix`. `/api` снова идёт в `shop-api`.", gmHint: "Один из правильных фиксов." },
      { id: "wi-delete", cat: "fix", label: "kubectl delete ingress shop-promo", response: "Конфликт исчез, API отвечает корректно. Но промо-страница пропала до нормального релиза.", gmHint: "Быстрый откат, если нужен срочный restore." },
      { id: "wi-restart-api", cat: "danger", label: "kubectl rollout restart deployment/shop-api", response: "API перезапущен, но маршрутизация осталась прежней. Пользователи всё ещё получают HTML.", gmHint: "Проблема не в pod-ах." },
    ],
    gmScriptJson: {
      pressure: [
        { at: 2, who: "🛒 Продукт", msg: "Корзина падает в вебе, а promo команда клянётся что ничего не ломала." },
        { at: 8, who: "👨‍💻 Frontend", msg: "JSON.parse exploded: получил HTML вместо API ответа." },
        { at: 15, who: "📣 Маркетинг", msg: "Только не сносите промо совсем, мы купили трафик." },
      ],
      checkpoints: [
        { step: "Посмотреть ingress-объекты", triggers: ["wi-get-ing"] },
        { step: "Найти конфликтующий route", triggers: ["wi-describe-promo"] },
        { step: "Проверить фактический ответ curl-ом", triggers: ["wi-curl"] },
        { step: "Исправить/откатить ingress", triggers: ["wi-edit", "wi-delete"] },
      ],
      beats: [
        { at: 0, tip: "🎬 Middle сценарий: симптомы в приложении, причина в маршрутизации." },
        { at: 10, tip: "🔎 Если игрок застрял в API, направь к ingress и host header." },
        { at: 18, tip: "🏁 В финале обсуди практику: один host — один владелец ingress-правил." },
      ],
    },
  },

  // ── 13. Лживый автоскейлер ───────────────────────────────────────
  {
    id: id(13),
    title: "Лживый автоскейлер",
    summary: "HPA использует aggregated метрику без нормализации по поду — self-amplifying loop разгоняет сервис до max.",
    type: "HPA, плохая метрика, хаотичный скейлинг",
    difficulty: Difficulty.MIDDLE,
    durationMin: 20,
    position: 13,
    contextJson: {
      infra: "Kubernetes HPA на кастомной метрике через Prometheus Adapter",
      services: ["checkout-api", "payment-api", "prometheus-adapter"],
      setup: "Команда перевела HPA checkout-api с CPU на метрику `http_requests_in_flight`.",
      time: "Пятница, 13:15",
    },
    eventsJson: [
      { t: 0, type: "alert", title: "Сервис пилит сам себя", body: "Количество реплик скачет `3 → 20 → 4 → 18`, latency пляшет, узлы перегружены scheduling-ом." },
      { t: 5, type: "event", title: "Метрика оказалась суммой по всему сервису", body: "HPA читает aggregated gauge без деления по pod. Чем больше подов поднимается, тем больше становится метрика, и скейлер ещё сильнее разгоняется." },
      { t: 11, type: "event", title: "Петля обратной связи", body: "Новая схема создала self-amplifying loop: больше подов → больше total in_flight → HPA думает, что нужен ещё scale up." },
      { t: 15, type: "event", title: "Фикс", body: "Нужно временно зафиксировать replicas, отключить HPA или вернуть CPU-based autoscaling, а затем починить запрос в Prometheus Adapter." },
    ],
    hintsJson: [
      { when: "Не смотрит HPA", gm: "Количество реплик само прыгает. Кто это делает?", chat: "kubectl describe hpa", team: "Смотри current vs target metrics" },
      { when: "Не понимает метрику", gm: "Это per-pod метрика или общая по сервису?", chat: "HPA любит нормализованные значения", team: "Проверь запрос adapter-а" },
      { when: "Хочет просто scale down", gm: "Пока HPA включён, он вернёт всё обратно", chat: "Либо freeze replicas, либо отключай HPA", team: "kubectl patch hpa ... min=max=..." },
    ],
    actionsJson: [
      { id: "hl-describe-hpa", cat: "check", label: "kubectl describe hpa checkout-api", priority: 1, response: "```\nMetrics: ( current / target )\n  \"http_requests_in_flight\": 480 / 60\nMin replicas: 3\nMax replicas: 20\nDeployment pods: 18 current / 18 desired\nEvents:\n  SuccessfulRescale  New size: 18; reason: pods metric above target\n```", gmHint: "Главный вход в проблему." },
      { id: "hl-adapter", cat: "check", label: "kubectl logs -n monitoring deploy/prometheus-adapter --tail=20", priority: 1, response: "```\nquery=avg(sum(http_requests_in_flight{app=\"checkout-api\"}))\n```\nЗапрос агрегирует весь сервис сразу. Для pods metric это неверно.", gmHint: "Вот и root cause." },
      { id: "hl-patch-hpa", cat: "fix", label: "kubectl patch hpa checkout-api -p ... minReplicas=6,maxReplicas=6", priority: 1, response: "HPA заморожен на 6 репликах. Thrash прекращается, узлы успокаиваются.", gmHint: "Хороший временный стоп-кран." },
      { id: "hl-rollback-hpa", cat: "fix", label: "kubectl rollout undo deploy/checkout-api && kubectl apply old-hpa.yaml", response: "Сервис вернулся к CPU-based autoscaling. Реплики стабилизировались.", gmHint: "Если старая конфигурация известна — отличный быстрый путь." },
      { id: "hl-edit-query", cat: "fix", label: "Исправить запрос Prometheus Adapter на per-pod метрику", priority: 1, response: "Запрос обновлён на нормализованную pod-метрику. После sync HPA реагирует адекватно.", gmHint: "Долгосрочный фикс." },
      { id: "hl-scale", cat: "danger", label: "kubectl scale deploy checkout-api --replicas=3", response: "Через минуту HPA снова разгонит реплики до 18. Ручной scale не переживает HPA.", gmHint: "Нужно бить по HPA, не по deployment." },
    ],
    gmScriptJson: {
      pressure: [
        { at: 2, who: "💸 FinOps", msg: "Почему кластер внезапно вырос на 8 нод?" },
        { at: 9, who: "👨‍💻 Разработчик", msg: "Мы просто хотели скейлить по более умной метрике..." },
        { at: 16, who: "👔 Тимлид", msg: "Нужен rollback или freeze прямо сейчас." },
      ],
      checkpoints: [
        { step: "Посмотреть HPA current/target", triggers: ["hl-describe-hpa"] },
        { step: "Увидеть неверный adapter query", triggers: ["hl-adapter"] },
        { step: "Заморозить или откатить HPA", triggers: ["hl-patch-hpa", "hl-rollback-hpa"] },
      ],
      beats: [
        { at: 0, tip: "🎬 Отличный middle-сценарий про плохую метрику и самораскручивающуюся петлю." },
        { at: 12, tip: "🔥 Если игрок хочет чинить deployment, напомни что скейлит именно HPA." },
        { at: 18, tip: "🏁 Поговорите про свойства хороших autoscaling-метрик." },
      ],
    },
  },

  // ── 14. Пропавшее хранилище ──────────────────────────────────────
  {
    id: id(14),
    title: "Пропавшее хранилище",
    summary: "Ночная ротация S3 access key сломала ExternalSecret — медиа-загрузки получают 403 InvalidAccessKeyId.",
    type: "Object Storage, credentials, частичный отказ",
    difficulty: Difficulty.MIDDLE,
    durationMin: 20,
    position: 14,
    contextJson: {
      infra: "Kubernetes, S3-compatible object storage, ExternalSecret",
      services: ["media-api", "thumbnail-worker", "postgres"],
      setup: "Ночью security команда ротировала S3 access key.",
      time: "Понедельник, 10:05",
    },
    eventsJson: [
      { t: 0, type: "alert", title: "Загрузка файлов ломается", body: "Новые аватары и вложения не загружаются, но приложение в остальном работает. Пользователи получают 500 только на upload." },
      { t: 4, type: "event", title: "Логи media-api", body: "```\nAccessDenied: InvalidAccessKeyId\nstatus code: 403\n```\nСтарые файлы читаются, новые не записываются." },
      { t: 9, type: "event", title: "Secret не обновился", body: "ExternalSecret в статусе `Error`, потому что роль для чтения из vault тоже поменялась. В кластере лежит устаревший S3 key." },
      { t: 14, type: "event", title: "Фикс", body: "Нужно обновить Secret корректным ключом, перезапустить deployment и отдельно разобраться с ExternalSecret/Vault доступом." },
    ],
    hintsJson: [
      { when: "Смотрит только ingress", gm: "Проблема только на upload. Что отличается от обычного чтения?", chat: "Внешнее хранилище", team: "Логи media-api обычно честно говорят про S3" },
      { when: "Не проверяет secret status", gm: "Если секреты должны подтягиваться автоматически, в каком они состоянии?", chat: "kubectl get externalsecret", team: "kubectl describe externalsecret media-s3" },
      { when: "Хочет чинить код", gm: "403 InvalidAccessKeyId редко про код", chat: "Это чаще креды", team: "kubectl get secret media-s3 -o yaml" },
    ],
    actionsJson: [
      { id: "bg-logs", cat: "logs", label: "kubectl logs deploy/media-api --tail=30", priority: 1, response: "```\n[ERROR] PutObject avatars/123.png failed\nAccessDenied: InvalidAccessKeyId\nstatus code: 403\n```", gmHint: "Ключевая улика." },
      { id: "bg-check-secret", cat: "check", label: "kubectl get externalsecret,secret media-s3", priority: 1, response: "```\nexternalsecret/media-s3   Error  SecretSyncedError\nsecret/media-s3           Opaque  2 keys  45d\n```\nSecret старый, ExternalSecret сломан.", gmHint: "Secret старый, ExternalSecret сломан." },
      { id: "bg-describe-es", cat: "check", label: "kubectl describe externalsecret media-s3", response: "```\nStatus: Error\nMessage: access denied to secret path kv/prod/media-s3\nLast Sync: 45d ago\n```", gmHint: "Показывает вторую часть проблемы." },
      { id: "bg-edit-secret", cat: "fix", label: "kubectl edit secret media-s3", priority: 1, response: "Secret обновлён на новый access key / secret key. Deployment можно перезапускать.", gmHint: "Быстрое восстановление." },
      { id: "bg-restart", cat: "fix", label: "kubectl rollout restart deployment/media-api deployment/thumbnail-worker", priority: 1, response: "Новые поды подхватили свежий secret. Upload снова работает.", gmHint: "После обновления secret через env нужен рестарт." },
      { id: "bg-fix-es", cat: "fix", label: "Починить доступ ExternalSecret к Vault", response: "ExternalSecret снова синхронизируется автоматически. Следующая ротация не сломает прод.", gmHint: "Постоянный фикс." },
      { id: "bg-delete-pod", cat: "danger", label: "kubectl delete pod -l app=media-api", response: "Поды перезапущены, но со старым secret внутри. 403 никуда не делся.", gmHint: "Без обновления секрета рестарт бессмысленен." },
    ],
    gmScriptJson: {
      pressure: [
        { at: 1, who: "📸 Поддержка", msg: "Пользователи не могут обновить аватарки, уже 40 тикетов." },
        { at: 8, who: "🔐 Security", msg: "Да, ключи ротировали ночью. Это же должно было быть прозрачно?" },
        { at: 15, who: "👔 PM", msg: "Нужно быстрое восстановление, постмортем потом." },
      ],
      checkpoints: [
        { step: "Увидеть 403 InvalidAccessKeyId", triggers: ["bg-logs"] },
        { step: "Проверить ExternalSecret и Secret", triggers: ["bg-check-secret", "bg-describe-es"] },
        { step: "Обновить secret и перезапустить поды", triggers: ["bg-edit-secret", "bg-restart"] },
      ],
      beats: [
        { at: 0, tip: "🎬 Сценарий про частичный outage: основное работает, ломается только upload." },
        { at: 10, tip: "🔎 Если игрок фокусируется на коде, верни его к кредам и секретам." },
        { at: 18, tip: "🏁 Обсудите: почему rotation должна тестироваться до продового cutover." },
      ],
    },
  },

  // ── 15. Потоп из логов ───────────────────────────────────────────
  {
    id: id(15),
    title: "Потоп из логов",
    summary: "Debug-режим в сервисе заполняет локальный диск ноды — DiskPressure, eviction, ingress-controller на той же ноде.",
    type: "Node filesystem, container logs, noisy service",
    difficulty: Difficulty.MIDDLE,
    durationMin: 20,
    position: 15,
    contextJson: {
      infra: "Kubernetes на VM, containerd, Loki agent как DaemonSet",
      services: ["recommendation-api", "loki-agent", "node-exporter"],
      setup: "После включения debug-режима recommendation-api пишет гигантские JSON логи на каждую рекомендацию.",
      time: "Среда, 18:20",
    },
    eventsJson: [
      { t: 0, type: "alert", title: "Нода уходит в DiskPressure", body: "Одна нода перешла в `DiskPressure`, на ней начали выселяться поды. PVC при этом в порядке." },
      { t: 4, type: "event", title: "Корень в /var/log/containers", body: "```\n$ du -sh /var/log/containers/* | sort -h | tail\n18G recommendation-api-aaa.log\n17G recommendation-api-bbb.log\n```\nПроблема не в PV, а в локальном диске ноды." },
      { t: 9, type: "event", title: "Loki agent не успевает", body: "Агент отправки логов застрял на backpressure. Логи не отгружаются, а recommendation-api продолжает flood." },
      { t: 14, type: "event", title: "Фикс", body: "Нужно выключить debug, перезапустить noisy pods и временно очистить место безопасным способом через container runtime." },
    ],
    hintsJson: [
      { when: "Смотрит только PVC", gm: "DiskPressure может быть на локальном диске ноды", chat: "Смотри node filesystem, не только volumes", team: "df -h на ноде или kubectl debug node" },
      { when: "Хочет rm логов руками", gm: "С контейнерными логами лучше аккуратно", chat: "Runtime может держать file descriptors", team: "Лучше остановить источник и ротировать корректно" },
      { when: "Не ищет виноватый pod", gm: "Кто пишет больше всех?", chat: "du -sh /var/log/containers", team: "Обычно один шумный сервис" },
    ],
    actionsJson: [
      { id: "lf-describe-node", cat: "check", label: "kubectl describe node k8s-node-2", priority: 1, response: "```\nConditions:\n  DiskPressure   True\nEvents:\n  Warning  EvictionThresholdMet  Attempting to reclaim ephemeral-storage\n```", gmHint: "Показывает тип проблемы." },
      { id: "lf-node-df", cat: "exec", label: "kubectl debug node/k8s-node-2 --image=nicolaka/netshoot -- chroot /host df -h", priority: 1, response: "```\nFilesystem   Size  Used  Avail  Use%  Mounted on\n/dev/sda1     50G   48G   2G    96%  /\n```", gmHint: "Нода реально заполнена." },
      { id: "lf-node-du", cat: "exec", label: "kubectl debug node/k8s-node-2 --image=nicolaka/netshoot -- chroot /host du -sh /var/log/containers/* | sort -h | tail", priority: 1, response: "```\n18G /var/log/containers/recommendation-api-aaa.log\n17G /var/log/containers/recommendation-api-bbb.log\n```", gmHint: "Идентифицирует шумный сервис." },
      { id: "lf-logs-app", cat: "logs", label: "kubectl logs deploy/recommendation-api --tail=5", response: "```\nDEBUG request_id=... payload={ огромный JSON на 200KB }\n```\nКаждый запрос пишет огромный debug blob.", gmHint: "Почему лог разросся." },
      { id: "lf-disable-debug", cat: "fix", label: "kubectl set env deploy/recommendation-api LOG_LEVEL=info", priority: 1, response: "Переменная окружения обновлена. Новые поды перестают flood-ить логи.", gmHint: "Нужно сначала перекрыть источник." },
      { id: "lf-restart", cat: "fix", label: "kubectl rollout restart deployment/recommendation-api", priority: 1, response: "Шумные pod-ы перезапущены, новые файлы логов уже маленькие.", gmHint: "Перезапуск после выключения debug." },
      { id: "lf-reclaim", cat: "fix", label: "kubelet containerLogMaxSize=50Mi + rollout restart", response: "После rollout-restart шумных подов runtime отпускает fd на старые файлы, kubelet ротирует их по containerLogMaxSize/containerLogMaxFiles — место освобождается без рестарта runtime.", gmHint: "Правильный фикс через kubelet config, без killing всех pod-ов на ноде." },
      { id: "lf-restart-runtime", cat: "danger", label: "systemctl restart containerd", response: "🚨 Рестарт containerd убивает ВСЕ контейнеры на ноде — это второй инцидент. Рабочая нагрузка упадёт, kubelet будет пересоздавать всё. Место освободится, но ценой downtime.", gmHint: "Важный антипаттерн — игрок должен увидеть что это опасно." },
      { id: "lf-rm", cat: "danger", label: "rm -f /var/log/containers/recommendation-api-*.log", response: "Файлы исчезли из каталога, но место почти не освободилось: процесс и runtime держат дескрипторы открытыми.", gmHint: "Хороший учебный антипример." },
    ],
    gmScriptJson: {
      pressure: [
        { at: 2, who: "📈 Мониторинг", msg: "NodeDiskPressure + eviction на production node." },
        { at: 10, who: "👨‍💻 Разработчик", msg: "Я включил debug буквально на часик..." },
        { at: 16, who: "👔 On-call lead", msg: "Нужно быстро вернуть ноду в строй, потом уже разбираться." },
      ],
      checkpoints: [
        { step: "Увидеть DiskPressure на ноде", triggers: ["lf-describe-node", "lf-node-df"] },
        { step: "Найти гигантские container logs", triggers: ["lf-node-du"] },
        { step: "Выключить debug и перезапустить noisy app", triggers: ["lf-disable-debug", "lf-restart"] },
        { step: "Освободить место корректно, не rm-ом", triggers: ["lf-reclaim"] },
      ],
      beats: [
        { at: 0, tip: "🎬 Важно отличить PVC/full disk в приложении от node local disk pressure." },
        { at: 11, tip: "🔥 Если игрок хочет rm, объясни про открытые fd." },
        { at: 18, tip: "🏁 Обсуди log sampling, rate limits и sane defaults для debug." },
      ],
    },
  },

  // ── 16. Недостающие права ────────────────────────────────────────
  {
    id: id(16),
    title: "Недостающие права",
    summary: "Security удалила IAM роль у cloud service account — ночной backup-job падает с AccessDenied на KMS.",
    type: "IAM, cloud service account, hidden dependency",
    difficulty: Difficulty.SENIOR,
    durationMin: 22,
    position: 16,
    contextJson: {
      infra: "Kubernetes в облаке, workload identity / cloud service account",
      services: ["backup-controller", "db-backup-job", "object storage", "kms"],
      setup: "Security команда убрала широкую роль у сервисного аккаунта backup-controller.",
      time: "Четверг, 07:30",
    },
    eventsJson: [
      { t: 0, type: "alert", title: "Бэкапы не идут", body: "Ночной backup-job отработал с exit 1. Данных в bucket за сегодня нет. Приложение пока живо, но RPO уже нарушен." },
      { t: 5, type: "event", title: "Логи неоднозначны", body: "```\nAccessDenied: kms.decrypt denied\n```\nСначала кажется что сломан KMS, но на деле проблема в облачной роли workload identity." },
      { t: 10, type: "event", title: "В Kubernetes всё зелёное", body: "Job запускается, pod healthy, secret на месте. Всё ломается только на вызове облачного API." },
      { t: 16, type: "event", title: "Фикс", body: "Нужно вернуть минимально достаточную IAM роль на cloud service account, не скатываясь обратно в admin." },
    ],
    hintsJson: [
      { when: "Смотрит только k8s", gm: "А если внутри кластера всё ок, где ещё может ломаться?", chat: "Облако под Kubernetes тоже имеет права", team: "Смотри cloud IAM и service account binding" },
      { when: "Хочет выдать admin", gm: "Продакшн любит least privilege", chat: "Найди точное недостающее permission", team: "kms.decrypt + storage.write, не больше" },
      { when: "Не связывает с security change", gm: "Что поменялось ночью не в k8s?", chat: "Security / IAM changes", team: "Cloud audit log помогает" },
    ],
    actionsJson: [
      { id: "ei-job", cat: "check", label: "kubectl describe job db-backup-2026-04-21", priority: 1, response: "```\nPods Statuses: 0 Active / 0 Succeeded / 1 Failed\n```", gmHint: "Подтверждает что job не успешна." },
      { id: "ei-logs", cat: "logs", label: "kubectl logs job/db-backup-2026-04-21", priority: 1, response: "```\n[INFO] exporting snapshot\n[INFO] decrypting envelope key via KMS\n[ERROR] AccessDenied: kms.decrypt denied for service account backup-prod\n```", gmHint: "Первый явный сигнал на IAM/KMS." },
      { id: "ei-sa", cat: "check", label: "kubectl get sa backup-controller -o yaml", response: "```yaml\nannotations:\n  iam.cloud.example/service-account: backup-prod@cloud-project\n```", gmHint: "Показывает мостик из k8s в облако." },
      { id: "ei-audit", cat: "check", label: "cloud audit log / yc iam service-account get backup-prod", priority: 1, response: "В audit log: в 02:10 security removed role `kms.keys.encrypterDecrypter` from `backup-prod@cloud-project`.", gmHint: "Настоящий root cause." },
      { id: "ei-fix-role", cat: "fix", label: "Вернуть роли kms.decrypt + storage.write сервисному аккаунту", priority: 1, response: "Роли возвращены на `backup-prod`. Повторный запуск backup-job проходит успешно.", gmHint: "Правильный фикс с least privilege." },
      { id: "ei-rerun", cat: "fix", label: "kubectl create job --from=cronjob/db-backup db-backup-manual", response: "Повторный backup-job стартовал и успешно сохранил снапшот в bucket.", gmHint: "После фикса IAM нужно восполнить пропущенный backup." },
      { id: "ei-admin", cat: "danger", label: "Выдать backup-prod роль admin", response: "Backup поедет, но security команда будет очень недовольна. Избыточные права на prod service account.", gmHint: "Восстановление доступно, но это плохая инженерная практика." },
    ],
    gmScriptJson: {
      pressure: [
        { at: 3, who: "🛡 Security", msg: "Мы ночью чистили IAM. Если что-то сломали, скажите конкретную роль." },
        { at: 11, who: "📦 DBA", msg: "Сегодняшнего бэкапа нет. Это уже нарушение RPO." },
        { at: 18, who: "👔 Руководитель", msg: "Нужен быстрый и аккуратный fix, без admin everywhere." },
      ],
      checkpoints: [
        { step: "Увидеть AccessDenied в job logs", triggers: ["ei-logs"] },
        { step: "Понять связку k8s SA -> cloud SA", triggers: ["ei-sa"] },
        { step: "Найти удалённую IAM роль в audit log", triggers: ["ei-audit"] },
        { step: "Вернуть минимальную роль и перезапустить backup", triggers: ["ei-fix-role", "ei-rerun"] },
      ],
      beats: [
        { at: 0, tip: "🎬 Senior-сценарий: внутри k8s всё зелёное, ломается наружная зависимость." },
        { at: 12, tip: "🔎 Подталкивай к мысли «это может быть не Kubernetes»." },
        { at: 20, tip: "🏁 Обсудите inventory зависимостей service account-ов и change management для IAM." },
      ],
    },
  },

  // ── 17. Слепой мониторинг ────────────────────────────────────────
  {
    id: id(17),
    title: "Слепой мониторинг",
    summary: "remote_write сломан из-за ротации TLS CA — метрики не уходят в центральную систему, алерты молчат.",
    type: "Observability, remote_write, false calm",
    difficulty: Difficulty.SENIOR,
    durationMin: 22,
    position: 17,
    contextJson: {
      infra: "Prometheus, Alertmanager, remote_write в центральный monitoring cluster",
      services: ["prometheus-k8s", "victoriametrics/central TSDB", "alertmanager"],
      setup: "Ночью обновили endpoint remote_write и TLS bundle.",
      time: "Пятница, 09:40",
    },
    eventsJson: [
      { t: 0, type: "alert", title: "Подозрительная тишина", body: "Команда замечает, что утром нет ни одного обычного warning-алерта. Dashboards выглядят слишком пусто." },
      { t: 5, type: "event", title: "Локально метрики есть", body: "Внутри самого Prometheus targets зелёные, scrape идёт. Но в центральной системе новые точки не появляются." },
      { t: 10, type: "event", title: "Растёт очередь remote_write", body: "```\nprometheus_remote_storage_pending_samples 8.2e+07\n```\nTLS handshake fails, но локальные scraping и часть alerting rules ещё работают." },
      { t: 16, type: "event", title: "Фикс", body: "Нужно вернуть корректный CA bundle / endpoint remote_write и убедиться, что backlog начал уходить, а не просто обнулился после рестарта с потерей данных." },
    ],
    hintsJson: [
      { when: "Не видит что проблема в наблюдаемости", gm: "Иногда отсутствие алертов и есть алерт", chat: "Too quiet is suspicious", team: "Проверь health самого monitoring pipeline" },
      { when: "Смотрит только targets", gm: "Scrape может быть ок, а export наружу нет", chat: "remote_write отдельный контур", team: "prometheus_remote_storage_* метрики" },
      { when: "Хочет просто рестартнуть", gm: "А backlog samples куда денется?", chat: "Рестарт без понимания может дропнуть данные", team: "Сначала исправить TLS/endpoint" },
    ],
    actionsJson: [
      { id: "rw-targets", cat: "check", label: "prometheus /targets", priority: 1, response: "Targets mostly green. Scrape идёт нормально.", gmHint: "Показывает что ingest локально жив." },
      { id: "rw-metrics", cat: "check", label: "Проверить prometheus_remote_storage_*", priority: 1, response: "```\nprometheus_remote_storage_pending_samples 8.2e+07\nprometheus_remote_storage_failed_samples_total 4.1e+06\n```", gmHint: "Главный индикатор." },
      { id: "rw-logs", cat: "logs", label: "kubectl logs deploy/prometheus-k8s --tail=40", priority: 1, response: "```\nremote_write: failed to send batch: Post \"https://metrics-central.example.ru/api/v1/write\":\ntls: failed to verify certificate: x509: certificate signed by unknown authority\n```", gmHint: "Корень проблемы почти назван напрямую." },
      { id: "rw-secret", cat: "check", label: "kubectl get secret remote-write-ca -o yaml", response: "Секрет обновлялся ночью. В нём лежит новый CA bundle, но Prometheus ConfigMap всё ещё ссылается на старый secret name.", gmHint: "Вот почему TLS broken." },
      { id: "rw-fix", cat: "fix", label: "Обновить Prometheus remote_write tls_config на новый CA bundle", priority: 1, response: "Конфигурация обновлена. Remote write снова устанавливает TLS-соединение.", gmHint: "Правильный фикс." },
      { id: "rw-watch", cat: "check", label: "Следить за pending_samples и backlog", response: "Pending samples начинают монотонно уменьшаться. Данные догоняют центральную систему.", gmHint: "Важно доказать что pipeline реально восстановился." },
      { id: "rw-restart", cat: "danger", label: "kubectl rollout restart deploy/prometheus-k8s", response: "Prometheus перезапущен. Часть очереди remote_write потеряна, gaps в центральных графиках остались.", gmHint: "Полезный антипример: рестарт не бесплатен." },
    ],
    gmScriptJson: {
      pressure: [
        { at: 2, who: "📉 SRE", msg: "Слишком тихо в алертах. Мне это не нравится." },
        { at: 9, who: "📊 Аналитика", msg: "Дашборды за утро дырявые. Это не норма." },
        { at: 17, who: "👔 Incident lead", msg: "Нужно именно восстановление наблюдаемости, а не косметика." },
      ],
      checkpoints: [
        { step: "Понять что scrape живой", triggers: ["rw-targets"] },
        { step: "Посмотреть remote_write pending/failed", triggers: ["rw-metrics"] },
        { step: "Найти TLS CA mismatch в логах", triggers: ["rw-logs", "rw-secret"] },
        { step: "Исправить конфиг и следить за drain backlog", triggers: ["rw-fix", "rw-watch"] },
      ],
      beats: [
        { at: 0, tip: "🎬 Редкий сценарий: отсутствие симптомов и есть симптом." },
        { at: 11, tip: "🔥 Напоминай что observability pipeline тоже прод." },
        { at: 20, tip: "🏁 После фикса обсудить canary-check на сам remote_write." },
      ],
    },
  },

  // ── 18. Схема ушла вперёд ────────────────────────────────────────
  {
    id: id(18),
    title: "Схема ушла вперёд",
    summary: "DB migration удалила столбец, который ещё читает старый код после rollback — прямая несовместимость схемы.",
    type: "CI/CD, migration, backward incompatibility",
    difficulty: Difficulty.SENIOR,
    durationMin: 24,
    position: 18,
    contextJson: {
      infra: "GitHub Actions, ArgoCD, postgres, blue-green app deployment",
      services: ["billing-api", "billing-worker", "postgres"],
      setup: "Пайплайн сначала применяет DB migration, потом раскатывает приложение. Сегодня rollout нового приложения завис.",
      time: "Вторник, 19:10",
    },
    eventsJson: [
      { t: 0, type: "alert", title: "Половина продакшна умерла", body: "Новая версия billing-api не поднялась, ArgoCD откатывает deployment. Но старая версия тоже начинает сыпать 500 на запись." },
      { t: 6, type: "event", title: "Откат не помогает", body: "Миграция уже успела удалить столбец `invoice.total_cents`, который старая версия приложения ещё читает. Код откатился, схема — нет." },
      { t: 12, type: "event", title: "Диагностика", body: "```\n$ kubectl logs billing-api-old --tail=20\n[ERROR] column \"total_cents\" does not exist\n[ERROR] SELECT invoice_id, total_cents FROM invoices\n```\n\nСтарый код → новая схема → несовместимо." },
      { t: 18, type: "event", title: "Варианты", body: "**A (быстрый, риск):** `ALTER TABLE invoices ADD COLUMN total_cents bigint` — воссоздать столбец временно.\n\n**B (правильный):** Написать reverse migration, вернуть столбец корректно.\n\n**C (на будущее):** Expand-Contract pattern: новый столбец → dual write → migrate data → drop old." },
      { t: 22, type: "event", title: "Урок", body: "Backward-incompatible migrations — антипаттерн. Правило:\n1. Никогда не удалять столбец в той же миграции, в которой переименовываешь\n2. Expand-Contract: сначала добавь новое, потом убери старое\n3. Тестируй rollback до production" },
    ],
    hintsJson: [
      { when: "Не понимает почему откат не помог", gm: "Что откатилось? Код или схема?", chat: "Rollback deployment не откатывает миграции", team: "DB schema живёт отдельно от кода" },
      { when: "Хочет просто перезапустить", gm: "Перезапустить старый код с новой схемой — та же ошибка", chat: "Нужно исправить схему или код", team: "ALTER TABLE добавь столбец обратно временно" },
      { when: "Не знает Expand-Contract", gm: "Есть паттерн для безопасных schema changes", chat: "Expand-Contract: сначала добавь, потом убирай", team: "Никогда не удаляй столбец в той же PR что добавляешь новый" },
    ],
    actionsJson: [
      { id: "sd-logs", cat: "logs", label: "kubectl logs billing-api-... --tail=30", priority: 1, response: "```\n[ERROR] column \"total_cents\" does not exist\n[ERROR] SELECT invoice_id, total_cents FROM invoices\n```", gmHint: "Явная ошибка — столбец исчез." },
      { id: "sd-check-schema", cat: "exec", label: "kubectl exec -it postgres-0 -- psql -c '\\d invoices'", priority: 1, response: "```\ninvoices:\n  id          bigint\n  invoice_id  varchar\n  amount      bigint     ← новый\n  # total_cents отсутствует!\n```\nСтолбец `total_cents` удалён миграцией.", gmHint: "Подтверждает: схема уже изменилась, кода нет." },
      { id: "sd-check-migration", cat: "check", label: "kubectl logs job/billing-migration --tail=20", response: "```\n[INFO] Running migration 2026_04_21_drop_total_cents\n[INFO] ALTER TABLE invoices DROP COLUMN total_cents\n[INFO] Migration complete\n```\nМиграция уже применена — схема изменена безвозвратно.", gmHint: "Видно что именно удалила миграция." },
      { id: "sd-fix-schema", cat: "fix", label: "kubectl exec -it postgres-0 -- psql -c 'ALTER TABLE invoices ADD COLUMN total_cents bigint'", priority: 1, response: "ALTER TABLE. Столбец воссоздан. Старый код снова работает.", gmHint: "Быстрый workaround — вернуть столбец. Старая версия поднимется." },
      { id: "sd-reverse-migration", cat: "fix", label: "Применить reverse migration v2026_04_21_restore_total_cents.sql", priority: 1, response: "```\nALTER TABLE invoices ADD COLUMN total_cents bigint;\nUPDATE invoices SET total_cents = amount WHERE total_cents IS NULL;\n```\nСтолбец восстановлен с данными. Оба приложения работают.", gmHint: "Правильный путь — reverse migration, а не raw DDL." },
      { id: "sd-rollback-deploy", cat: "fix", label: "kubectl rollout undo deployment/billing-api", response: "deployment rolled back. Но старая версия всё равно падает — schema уже изменилась.", gmHint: "Rollback deployment не помогает без фикса схемы." },
      { id: "sd-force-new", cat: "danger", label: "Задеплоить новую версию несмотря на ошибки", response: "Новая версия запускается. Но она работает с amount, а данные в total_cents — теряются или не мигрированы.", gmHint: "Данные в total_cents ещё могут быть важны." },
    ],
    gmScriptJson: {
      pressure: [
        { at: 2, who: "💳 Финансы", msg: "Инвойсы не выставляются. Клиенты не могут оплатить." },
        { at: 8, who: "👨‍💻 Разработчик", msg: "Я откатил деплой, почему всё равно падает?" },
        { at: 15, who: "👔 CTO", msg: "Это схема или код? Нужен чёткий ответ." },
        { at: 20, who: "📊 PM", msg: "Мы теряем продажи. Нужен хоть какой-то workaround." },
      ],
      checkpoints: [
        { step: "Найти ошибку column does not exist", triggers: ["sd-logs"] },
        { step: "Проверить схему БД — столбец исчез", triggers: ["sd-check-schema"] },
        { step: "Найти миграцию которая удалила столбец", triggers: ["sd-check-migration"] },
        { step: "Восстановить столбец — временно или через reverse migration", triggers: ["sd-fix-schema", "sd-reverse-migration"] },
      ],
      beats: [
        { at: 0, tip: "🎬 Senior-сценарий: deploy процесс сломан, и rollback не помогает." },
        { at: 8, tip: "🔎 Если игрок думает что rollback спасёт — пусть попробует. Потом увидит результат." },
        { at: 14, tip: "🔥 Ключевой момент: понять разницу между schema state и app state." },
        { at: 22, tip: "🏁 Обсудите Expand-Contract pattern и тестирование rollback до production." },
      ],
    },
  },
];

async function main() {
  console.log(`Seeding ${SCENARIOS.length} scenarios into pack ${PACK_ID}...`);

  for (const s of SCENARIOS) {
    await prisma.scenario.upsert({
      where: { id: s.id },
      update: {
        title: s.title,
        summary: s.summary,
        type: s.type,
        difficulty: s.difficulty,
        durationMin: s.durationMin,
        position: s.position,
        contextJson: s.contextJson,
        eventsJson: s.eventsJson,
        hintsJson: s.hintsJson,
        actionsJson: s.actionsJson,
        gmScriptJson: s.gmScriptJson,
      },
      create: {
        id: s.id,
        packId: PACK_ID,
        title: s.title,
        summary: s.summary,
        type: s.type,
        difficulty: s.difficulty,
        durationMin: s.durationMin,
        position: s.position,
        contextJson: s.contextJson,
        eventsJson: s.eventsJson,
        hintsJson: s.hintsJson,
        actionsJson: s.actionsJson,
        gmScriptJson: s.gmScriptJson,
      },
    });
    console.log(`  ✓ [${s.position.toString().padStart(2)}] ${s.title}`);
  }

  console.log("\nDone!");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
