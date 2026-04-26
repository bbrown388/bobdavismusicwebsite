# Retrospective: Honky Tonk (Game 03)

**Date:** 2026-04-26
**Build method:** Subagent-driven development (10 tasks + reviews)

---

## What Went Well

- **Plan code blocks eliminated ambiguity** — every task had complete, copy-paste-ready code. Subagents rarely needed to interpret; they just implemented. Zero NEEDS_CONTEXT escalations.
- **Two-stage review caught real bugs** — 6 bugs caught across 10 tasks: ctx.filter scope, drawStage state leak, feedback mutation-in-draw, shakeIntensity not reset on replay, stopBeat audio tail, startBeat gain race condition. None of these would have been obvious from casual inspection.
- **Combined spec + quality review** — merging both reviews into one agent call (started at Task 4) cut per-task overhead without reducing quality. Keep doing this.
- **Retrospective note-taking during the build** — capturing observations mid-session prevented context loss. The final retrospective was fully informed.
- **Musical coherence baked into the plan** — the beat grid constraint, per-lane gap, and G major chord selection were specified in advance. No post-hoc "it sounds random" fix needed.

---

## What Caused Friction

- **Permission prompts required multiple user interventions** — the allow list started too specific (individual command strings). User had to ask twice before `Bash(*)` / `PowerShell(*)` wildcards were applied. Wasted session time and broke flow.
- **`git log` calls between tasks** — controller ran `git log --oneline -3` to get the base SHA for code quality reviews. Implementers already report their commit SHA. Redundant call every task.
- **Fix commits added noise** — several tasks required a separate fix commit after the review. While this is correct process, the pattern (implement → review → fix → review) could be shortened if the plan pre-empted the known failure modes.
- **Some plan steps were slightly under-specified** — e.g., the plan said "replace the three variable declarations" but there were actually four. Small imprecision caused the implementer to need a self-review catch.

---

## Action Items for Game 04

1. **Start every session by setting `Bash(*)` and `PowerShell(*)` in `.claude/settings.local.json`** — do this before any subagents are dispatched. Do not wait for the user to ask.

2. **Use implementer-reported commit SHA for review** — never run `git log` between tasks. Implementer always reports the SHA; use it directly in the review prompt.

3. **Combine spec + quality into one review agent from Task 1** — the two-agent pattern was adopted mid-session. Start with it.

4. **Pre-empt known failure modes in the plan** — document common pitfalls as explicit checklist steps. For canvas games, include:
   - "Verify ctx.save/restore wraps drawX — state must not leak"
   - "Verify draw functions don't mutate state"
   - "Verify startGame() resets all stateful variables"
   - "Verify audio stop/start don't leave gain at 0"

5. **Count exact variable declarations before writing "replace the N variables"** — plan steps that say N should match the actual count.

6. **Add audio stop/start gain management to the Web Audio pattern in the knowledge base** — the startBeat/stopBeat gain race is a general pattern, not Honky Tonk-specific.

---

## Bugs Caught by Review (worth the overhead)

| Task | Bug | Impact if shipped |
|---|---|---|
| 1 | drawStage leaks ctx.lineWidth/strokeStyle | Subtle rendering artifacts in later tasks |
| 2 | ctx.filter reset inside save/restore (no-op) | Blur bleed into all draws when shake wrap added |
| 4 | shakeIntensity not reset in startGame | Permanent screen shake after first miss on replay |
| 6 | drawFeedbacks mutates state in draw function | Feedbacks not culled if draw called outside playing state |
| 9 | stopBeat leaves pre-scheduled audio playing | Beat bleeds into game over screen |
| 9 | startBeat doesn't reset gain before scheduling | Silent beat or pop on quick replay |

---

## Updated Rules (added to knowledge base)

- `ctx.filter` must be reset AFTER `ctx.restore()`, not inside save block
- Draw functions must be pure — state mutation belongs in update functions
- `startBeat()` must cancel/reset masterGain before scheduling
- `stopBeat()` should ramp gain to 0 to cut pre-scheduled audio tail
- Set `Bash(*)`/`PowerShell(*)` in allow list at session start
