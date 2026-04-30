import { SCENARIOS } from "../prisma/seed-scenarios";
import { buildRoundActions } from "../src/lib/game";

type ScenarioAction = {
  id?: string;
  cat?: string;
  label?: string;
  response?: string;
  priority?: number;
};

type ScenarioEvent = {
  t?: number;
  type?: string;
  title?: string;
  body?: string;
};

type GmScript = {
  pressure?: Array<{ at?: number; who?: string; msg?: string }>;
  checkpoints?: Array<{ step?: string; triggers?: string[] }>;
  beats?: Array<{ at?: number; tip?: string }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asActions(value: unknown): ScenarioAction[] {
  return Array.isArray(value) ? (value as ScenarioAction[]) : [];
}

function asEvents(value: unknown): ScenarioEvent[] {
  return Array.isArray(value) ? (value as ScenarioEvent[]) : [];
}

function asGmScript(value: unknown): GmScript {
  return isRecord(value) ? (value as GmScript) : {};
}

const errors: string[] = [];
const seenIds = new Set<string>();
const seenTitles = new Set<string>();

for (const scenario of SCENARIOS) {
  const label = `[${scenario.position.toString().padStart(2, "0")}] ${scenario.title}`;
  const context = scenario.contextJson;
  const events = asEvents(scenario.eventsJson);
  const hints = Array.isArray(scenario.hintsJson) ? scenario.hintsJson : [];
  const actions = asActions(scenario.actionsJson);
  const gmScript = asGmScript(scenario.gmScriptJson);
  const actionIds = new Set<string>();
  const scenarioDuration = typeof scenario.durationMin === "number" ? scenario.durationMin : 0;

  if (seenIds.has(scenario.id)) errors.push(`${label}: duplicate id ${scenario.id}`);
  seenIds.add(scenario.id);

  if (seenTitles.has(scenario.title)) errors.push(`${label}: duplicate title`);
  seenTitles.add(scenario.title);

  if (scenario.position < 1 || scenario.position > SCENARIOS.length) {
    errors.push(`${label}: position is outside 1..${SCENARIOS.length}`);
  }

  if (!["JUNIOR", "MIDDLE", "SENIOR"].includes(scenario.difficulty)) {
    errors.push(`${label}: invalid difficulty ${scenario.difficulty}`);
  }

  if (scenario.durationMin < 10 || scenario.durationMin > 45) {
    errors.push(`${label}: duration should be 10..45 minutes for game flow`);
  }

  if (!isRecord(context)) {
    errors.push(`${label}: contextJson must be an object`);
  } else {
    for (const key of ["infra", "services", "setup", "time"]) {
      if (!(key in context)) errors.push(`${label}: contextJson missing ${key}`);
    }
  }

  if (events.length < 5) errors.push(`${label}: expected at least 5 timeline events`);
  let previousT = -1;
  let hasMidgameEvent = false;
  for (const event of events) {
    if (typeof event.t !== "number") errors.push(`${label}: event missing numeric t`);
    if (typeof event.t === "number" && event.t < previousT) {
      errors.push(`${label}: eventsJson is not sorted by t`);
    }
    if (typeof event.t === "number" && event.t > 0 && event.t <= scenarioDuration) {
      hasMidgameEvent = true;
    }
    previousT = typeof event.t === "number" ? event.t : previousT;
    if (!event.title || !event.body) errors.push(`${label}: event missing title/body`);
  }
  if (!hasMidgameEvent) errors.push(`${label}: expected at least one timeline event after t=0`);

  if (hints.length < 2) errors.push(`${label}: expected at least 2 hints`);
  if (actions.length < 4) errors.push(`${label}: expected at least 4 actions`);

  for (const action of actions) {
    if (!action.id) {
      errors.push(`${label}: action missing id`);
      continue;
    }
    if (actionIds.has(action.id)) errors.push(`${label}: duplicate action id ${action.id}`);
    actionIds.add(action.id);
    if (!action.cat || !action.label || !action.response) {
      errors.push(`${label}: action ${action.id} missing cat/label/response`);
    }
  }

  const hasPriorityAction = actions.some((action) => action.priority === 1);
  if (!hasPriorityAction) errors.push(`${label}: expected at least one priority action`);

  const checkpoints = Array.isArray(gmScript.checkpoints) ? gmScript.checkpoints : [];
  if (!checkpoints.length) errors.push(`${label}: gmScriptJson.checkpoints is empty`);
  for (const checkpoint of checkpoints) {
    if (!checkpoint.step) errors.push(`${label}: checkpoint missing step`);
    for (const trigger of checkpoint.triggers ?? []) {
      if (!actionIds.has(trigger)) {
        errors.push(`${label}: checkpoint trigger ${trigger} has no matching action`);
      }
    }
  }

  const pressure = Array.isArray(gmScript.pressure) ? gmScript.pressure : [];
  for (const item of pressure) {
    if (typeof item.at !== "number" || !item.who || !item.msg) {
      errors.push(`${label}: pressure item missing at/who/msg`);
    }
    if (typeof item.at === "number" && item.at > scenario.durationMin) {
      errors.push(`${label}: pressure item at=${item.at} exceeds duration ${scenario.durationMin}`);
    }
  }

  const beats = Array.isArray(gmScript.beats) ? gmScript.beats : [];
  for (const beat of beats) {
    if (typeof beat.at !== "number" || !beat.tip) {
      errors.push(`${label}: beat missing at/tip`);
    }
    if (typeof beat.at === "number" && beat.at > scenario.durationMin) {
      errors.push(`${label}: beat at=${beat.at} exceeds duration ${scenario.durationMin}`);
    }
  }

  const phaseMenus = [
    buildRoundActions(scenario, 1).map((action) => action.key),
    buildRoundActions(scenario, 4).map((action) => action.key),
    buildRoundActions(scenario, 7).map((action) => action.key),
    buildRoundActions(scenario, 10).map((action) => action.key),
  ];
  for (const [index, menu] of phaseMenus.entries()) {
    if (menu.length !== 4) errors.push(`${label}: phase menu ${index + 1} should expose 4 actions`);
    if (new Set(menu).size !== menu.length) errors.push(`${label}: phase menu ${index + 1} has duplicate actions`);
  }

  const menuSignatures = phaseMenus.map((menu) => menu.join("|"));
  if (new Set(menuSignatures).size < 3) {
    errors.push(`${label}: phase action menus are too repetitive`);
  }
}

const positions = SCENARIOS.map((scenario) => scenario.position).sort((a, b) => a - b);
for (let index = 0; index < positions.length; index += 1) {
  if (positions[index] !== index + 1) {
    errors.push(`positions are not contiguous at ${index + 1}; got ${positions[index]}`);
  }
}

if (errors.length) {
  console.error(`Scenario validation failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Validated ${SCENARIOS.length} scenarios.`);
