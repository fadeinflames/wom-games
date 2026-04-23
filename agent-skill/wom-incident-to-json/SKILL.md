# WOM Incident To JSON

Convert incident descriptions, markdown runbooks, and rough notes into import-ready JSON for WOM Platform.

## Output Contract

- Always output **valid JSON**.
- Root object must match [`schemas/wom.scenario.v1.json`](/Users/mgusev/git/wom-platform/schemas/wom.scenario.v1.json).
- Use uppercase enum for difficulty: `JUNIOR`, `MIDDLE`, `SENIOR`.
- Keep `durationMin` realistic: `15-30` for typical training rounds.

## Prompt Template For Agent

When the user says: "Сделай JSON для импорта в WOM", produce:

1. `scenarios[]` with one object per incident.
2. Fill:
   - `title`: short incident name
   - `summary`: one-sentence game framing
   - `type`: stack area, e.g. `DNS, NetworkPolicy`
   - `difficulty`: inferred from blast radius and ambiguity
   - `durationMin`: expected game length
   - `contextJson`: infra/services/setup/time
   - `eventsJson`: timeline-style events with `t`, `type`, `title`, `body`
   - `hintsJson`: coaching hints
   - `actionsJson`: candidate player actions
   - `gmScriptJson`: optional pressure/checkpoints/beats

## Example

```json
{
  "scenarios": [
    {
      "title": "Потерянные в DNS",
      "summary": "Сервис периодически не резолвит внутренние имена.",
      "type": "DNS, CoreDNS",
      "difficulty": "MIDDLE",
      "durationMin": 20,
      "contextJson": {
        "infra": "Kubernetes 1.34",
        "services": ["frontend", "backend", "coredns"],
        "setup": "После сетевого hardening появились интервальные timeout.",
        "time": "Четверг, 11:00"
      },
      "eventsJson": [],
      "hintsJson": [],
      "actionsJson": [],
      "gmScriptJson": null
    }
  ]
}
```
