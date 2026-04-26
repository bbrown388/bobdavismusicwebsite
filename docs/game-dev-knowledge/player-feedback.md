# Player Feedback Log

Feedback collected from players on all games. I read this at the start of each session and incorporate relevant insights into the next game design or patch decisions.

## How Feedback Gets Here
Games include a feedback button (after game over) that opens a pre-filled email or GitHub issue. Bob reviews and pastes relevant feedback into this file with a game tag and date. Feedback can trigger:
- A patch to the existing game (`/patch game-name`)
- An improvement logged as a lesson for future games

---

## Game 1: On the Road

*No feedback yet.*

---

## Game 2: Lasso Loop

*No feedback yet.*

---

## Lessons Extracted

*Populated after feedback arrives.*

---

## Feedback Widget Spec (for future games)
Each game should include a feedback entry point — ideally a small button in the game-over screen:

```
[Feedback] button → opens mailto or GitHub issue with pre-filled:
  Subject: [Game Name] Feedback
  Body:
    Rating: _/5
    What worked: 
    What didn't work:
    Suggestion:
    Device:
```

The button should use `mailto:` as the primary fallback (works everywhere) and `navigator.share()` as an enhancement where supported.
