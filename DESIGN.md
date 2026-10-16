# Groove Back: design review, rules and prototype plan

> **Your physio picks the moves. The song does the counting. Your league cheers you on. All you have to do is show up.**

This document covers the six deliverables from the brief:

1. **Game audit** of the version that existed before this revision
2. **Revised rule book**
3. **Scoring and progression specification**, with worked examples
4. **Interface redesign notes**
5. **Prototype testing plan**
6. **Implementation summary**: what works, what is mocked, what needs real services

Where the brief and the request conflicted, the request won: the brief asked for a deep purple background, but the visual direction requested white with `#8AD6D1`, `#359FA0`, `#FFF0C5` and `#FF8C52`, so the interface uses those (§4).

---

## 1. Game audit (the previous version)

### What already worked and was kept

| Strength | Why it's worth keeping |
| --- | --- |
| **The core idea.** Core (the prescribed move) plus Flair (dance for the rest of the body) on the beat. | It turns an exercise into choreography without changing the dose. |
| **A music engine that is also the clock.** The synthesised band schedules every beat, and the coach's pose comes from beat time. | Reps can be counted by the song instead of by the player. |
| **Safety features.** A 10-second check-in with traffic lights (green, amber Lite, red Gentle Groove), a Lite toggle, a "That hurt" stop that is logged, avatar-only social, and emoji-only messages. | These are the right instincts for a rehab product. |
| **Camera pose tracking**, with gentle coaching cues ("smaller is fine"). | Useful as optional feedback. |
| **Cosmetic rewards** (hats and trails). | Low-risk motivation. |

### Weaknesses, missing rules and design risks

| # | Problem | Why it matters | Severity |
| --- | --- | --- | --- |
| A1 | **Scoring was driven by movement accuracy.** Every 8-count earned 0–3★ for timing, steadiness and form. Stars fed XP, the stage-clear rules (2★ average on 3 days), the Level-Up Song (2.5★) and the league rank. | The brief says accuracy, speed and range must not be the main factor in the score. Camera form scoring is unreliable and isn't adjusted to each person's own range. | Critical |
| A2 | **The player controlled clinical progression.** The player asked for a level-up after a high-star song, and a simulated physio "approved" it automatically after 9 seconds. The dance-difficulty dial also rose by itself when stars were high. | This is exercise progression without real physio approval, and the fake approval could be mistaken for a real one. | Critical |
| A3 | **Tap mode could be exploited.** Tapping the rhythm, without moving at all, earned 3★. Teammate-judge mode trusted any number typed in. | Scores could be earned without exercising. | High |
| A4 | **Competition on raw performance.** League tiers promoted the top 3 by XP, and XP included stars. Dance Duels compared raw scores across different injuries. The feed showed other players' star ratings. | This invites overexertion and makes people with harder recoveries feel inferior. | High |
| A5 | **Too many overlapping systems:** XP, stars, combos, a Groove meter, a "Share half" meter, quests, boss HP, a league goal, parties, duels, stages, levels, outfits, cosmetics and badges. | A new player couldn't tell how to make progress. | High |
| A6 | **Two currencies, and league XP gated behind social actions.** The session counted for rehab, but league XP only "banked" once a share meter reached 80% (posting a clip, cheering, planning). | Confusing, and social pressure was attached to rehab credit. | Medium |
| A7 | **No weekly plan, reps or durations.** A prescription was a trio of moves per level. Reps were a side-effect of song length, and a "Short songs" playtest toggle silently changed the dose. | The physio couldn't prescribe reps, and the game could change the dose. | High |
| A8 | **The streak broke on unscheduled days.** It counted consecutive calendar days, and rest needed an explicit tap. | Unscheduled rest was punished, which creates streak anxiety. | Medium |
| A9 | **Music and scenes were tied to the rehab level.** A Level 1 player was stuck with one lo-fi track at 60 BPM for weeks. | Repetitive, so players lose interest. | Medium |
| A10 | **Simulated players weren't labelled in the interface** (only in the README). | Simulated activity looked like real people. | Medium |
| A11 | **Accessibility gaps.** Dark-only theme, 11px text in places, no text-size, motion or sound settings, and some meaning carried by colour alone. | Fails the "readable and accessible controls" requirement. | Medium |
| A12 | **Unclear session completion.** There was no rule for when a stopped song counts. | Unclear rules lead to disputes and exploits. | Medium |

---

## 2. Revised rule book

This text is also shown in the game, under Profile → Settings → Rule book, and as six "How to play" slides.

1. **Your session is your physio's plan.** It uses their exercises, reps or durations, sets and pace. A warm-up, short breathers between moves and sets, and a cool-down are added automatically.
2. **Finish a planned session: +100 points.** "Finished" means you played at least **60%** of the routine (skipped parts don't count as played). Lite, amber and Gentle Groove sessions count in full.
3. **Stop because something hurt: +50 points.** This is a *safe stop*. It is logged for your physio, and it still counts toward your week, your streak and the crew goal.
4. **Ending early for any other reason** saves a *partial session*: no points, and no penalty.
5. **Points stop when your plan is done:** at most your plan's sessions per day and per week. Extra sessions are *practice*: 0 points. Extra reps or speed are never measured or rewarded.
6. **Your streak counts days on plan.** A day is on plan if you did a session, logged a rest day, had a red check-in, or it wasn't one of your suggested days. Today never counts against you. One missed suggested day per week is covered automatically by a **Flex Pass**. Your best streak is kept forever.
7. **Badges celebrate milestones** in participation, consistency, safe choices and community. Never performance.
8. **Rank comes from points.** Ranks unlock music, scenes and outfits. They say nothing about recovery.
9. **Groove Together** is your crew's weekly shared goal. Each planned session adds 1, whatever the exercise. The target is 75% of everyone's planned sessions combined.
10. **Rankings are optional.** They are off by default. When switched on, they sort by each person's share of *their own* plan, and nobody is shown as last.
11. **Only your physio changes your exercises,** reps, pace or the highest dance intensity allowed. You can always choose Lite, a lower dance intensity, a rest day or stopping.
12. **Your league sees only your avatar, nickname and participation:** sessions out of your plan, and optionally your days on plan and badges. Never your injury, exercises or pain.

---

## 3. Scoring and progression specification

### 3.1 Session outcomes

| Outcome | Condition | Points | Weekly plan | Streak | Groove Together |
| --- | --- | --- | --- | --- | --- |
| Complete | ≥ 60% of routine beats played (time while paused or skipped doesn't count) | **100** | +1 | day on plan | +1 |
| Safe stop | "That hurt" → "Stop for today" | **50** | +1 | day on plan | +1 |
| Partial | Ended early, under 60%, no pain flag | 0 | — | no effect (today stays open) | — |
| Practice | Daily or weekly plan already met, or a 1-minute practice run | 0 | — | day on plan | — |
| Rest day | "Rest day" button, or rest chosen at check-in | 0 | — | day on plan | — |

**Caps.** Points are only awarded while `sessions today < rx.perDay` **and** `sessions this week < rx.perWeek`. Both numbers are set by the physio. The defaults are 1 per day and 4 per week.

**Why 60%?** It lets someone skip a move that doesn't feel right, or stop near the end, without losing the session. It also stops someone from skipping straight to the end. This value is provisional and should be tested (§5).

**Why 50 for a safe stop?** Stopping for pain must never feel like losing. But a full 100 would make "start, then press That hurt" a shortcut. Halving the points, logging the stop for the physio, and the weekly cap together make that shortcut pointless. Also provisional.

### 3.2 Streak (days on plan)

```
onPlan(day) = session or practice that day
            OR rest day logged
            OR red check-in
            OR day is not one of the plan's suggested days
streak = consecutive onPlan days counting back from today (today skipped if still open),
         one missed suggested day per calendar week forgiven (Flex Pass), stops at the start date
```

### 3.3 Ranks (cosmetic progression)

| Rank | Points | Unlocks |
| --- | --- | --- |
| First Steps | 0 | 4 tracks (Slow Sunrise, Window Seat, Porch Swing, Sunny Steps), Warm Room, Sunny Porch, 3 outfits |
| Warming Up | 300 | Easy Does It, Rise Again, City Rooftop, Seafoam outfit |
| Move Maker | 800 | Rooftop Dhol, Beach Vibes, Berry outfit |
| Rhythm Regular | 1,500 | Baraat Bounce, Night Run, Night Studio, Golden Hour outfit |
| Groove Star | 2,500 | Comeback Remix, Night Run outfit |
| Groove Legend | 4,000 | (title only) |

At 4 sessions a week, a player reaches Warming Up in week 1, Move Maker in week 2, and Rhythm Regular in about week 4. New variety arrives steadily in the first month, when drop-off risk is highest.

### 3.4 Badges

All 14 badges are participation-based. Each one marked † also unlocks an accessory.

| Category | Badges |
| --- | --- |
| **Progress** | First Step (1 session)†, High Five (5)†, Move Maker (10), Dedicated (30)† |
| **Consistency** | Week Warrior (weekly plan met)†, Two Weeks Strong (weekly plan met twice)†, Consistency Star (7 days on plan)†, Rest Respecter (log a rest day)† |
| **Special** | Welcome Back (return after 7+ days away), Body Listener (used Lite, stopped safely, or played an amber or red plan)†, Music Lover (3 genres)†, Scene Setter (3 scenes)† |
| **League** | Team Player (crew hit Groove Together while you took part)†, Cheerleader (10 cheers sent)† |

Rest Respecter, Body Listener and Welcome Back exist on purpose: they reward the safe and kind behaviours that most fitness apps punish.

### 3.5 Groove Together (cooperative)

```
target = round(0.75 × Σ every member's planned sessions this week)
done   = Σ every member's completed or safe-stop planned sessions this week
```

A member with a 3-session plan and a member with a 5-session plan both "complete their part" by doing their own plan. Over-achieving is impossible because sessions beyond the plan don't count. A bonus **Cheer Chain** challenge (25 cheers as a crew) rewards encouragement.

### 3.6 Worked examples

**Example A: a typical week.** The plan is 4 sessions a week, at most 1 a day, suggested on Mon, Wed, Fri and Sat.

| Day | What happened | Points | Week | Streak |
| --- | --- | --- | --- | --- |
| Mon | Completed | +100 | 1/4 | 1 |
| Tue | Nothing (not a suggested day) | 0 | 1/4 | 2 |
| Wed | Amber check-in → Lite routine, completed | +100 | 2/4 | 3 |
| Thu | Nothing (not a suggested day) | 0 | 2/4 | 4 |
| Fri | "That hurt" at minute 2 → safe stop | +50 | 3/4 | 5 |
| Sat | Missed (a suggested day) → Flex Pass | 0 | 3/4 | 6 |
| Sun | Completed | +100 | 4/4 ✓ Week Warrior | 7 ✓ Consistency Star |
| Sun | Played again | 0 (practice) | 4/4 | 7 |

The week total is 350 points, with every outcome kind to the player.

**Example B: trying to farm points.** The player does 3 sessions on Monday. Only the first earns points (`perDay = 1`). The other two are practice and earn 0. Moving faster or doing extra reps is impossible to reward, because reps are counted by the song.

**Example C: skipping.** The player skips every move from the warm-up and played 15% of the routine, so the session is partial and earns 0. If they skip one move out of three and play the rest, they played about 70%, so it's complete and earns 100.

---

## 4. Interface redesign

**Visual direction.** White and warm-cream surfaces, using these colours:

| Colour | Hex | Used for |
| --- | --- | --- |
| Sunset orange | `#FF8C52` | Actions, the active nav item, rewards, rep rings |
| Lagoon teal | `#359FA0` | Completion, the league, calm states |
| Seafoam | `#8AD6D1` | Accents, the rug and progress fills |
| Butter cream | `#FFF0C5` | Highlight cards and ring tracks |

Text uses darkened inks (`#B4501C` orange, `#1F7374` teal, `#1E2A2F` body) so that every pairing passes WCAG AA. The fonts are Bricolage Grotesque for display and Figtree for body text. The layout follows the reference image: rounded cards, a left sidebar on desktop, and a five-tab bottom bar on phones.

**Screens** (each mapped to the brief's list):

| Brief screen | In the game | Notes |
| --- | --- | --- |
| Home | Home | Greeting, today's session hero, days on plan, weekly ring, This Week dots, quote, Quick Picks, Groove Together, cheers received |
| Session setup | Sessions | Routine with targets, duration, pace, dance intensity (capped by the physio), Lite, camera tips, track and scene picker, points rule, practice run |
| Gameplay | Session player | Move list (current one highlighted), big coach demo in a scene, rep or seconds ring, move name and cue, current track with beat dots, next-move card, restart / pause / skip, Lite, That hurt, exit; 3-2-1 countdown first |
| Completion | Completion | Celebration, points count-up, moves done, time, weekly ring, streak, new badges or next milestones, crew contribution, optional pain-after check |
| Progress | Progress | Week / Month / All time; sessions, points, streak; chart; weekly summary against your first week; milestones; history; a separate "For you and your physio" panel |
| League | League | Groove Together hero, crew list against each person's own plan, optional fair ranking, cheers, Cheer Chain, activity feed, "what your league sees" |
| Profile and settings | Profile | Overview and rank ladder; Avatar (skin tone, outfit, accessories); My plan (read-only physio plan); Settings (accessibility, privacy, notifications, help, playtest tools) |
| (extra) | Music + Scenes | 10 original tracks with mood filters and 8-second previews; 5 illustrated scenes |
| (extra) | Badges | Filterable grid with progress and rewards |
| (extra) | Physio view (demo) | Exercises with reps or seconds and sets, sessions per week and per day, suggested days, pace, intensity cap, standing allowed, note |

**Accessibility:**
- **Settings:** larger text, reduce motion (also respects the operating system's setting), high contrast, and a sound toggle.
- **Never audio-only:** every audio cue has an on-screen equivalent, including countdown numbers, breathe and squeeze pills, rep counts and callouts.
- **Never colour-only:** traffic lights always carry text, and badges always carry a name.
- **Controls:** touch targets are at least 40–46px, controls have visible focus rings, and the keyboard shortcuts are Space (pause), L (Lite), H (That hurt) and ←/→ (restart or skip a move).
- **Camera is never required.** It's an optional beta that never affects points.

---

## 5. Prototype testing plan

**Who:** 5–8 adults, ideally people currently doing or recently finishing physiotherapy (recruited through a physio, with consent), plus 2–3 physiotherapists for the clinical-safety review. In a class setting, classmates can play with a mock injury, but label those results as such.

### 5.1 Tasks (think-aloud, no help given)

| # | Task | Success measure |
| --- | --- | --- |
| T1 | From a fresh start, set up and start your first session | Reaches the countdown in under 3 minutes, unaided |
| T2 | Pause, then resume | Finds pause within 5 seconds |
| T3 | Something twinges: tell the game | Uses "That hurt" without prompting |
| T4 | Change the music without changing your exercises | Changes the track; can say the exercises stayed the same |
| T5 | How many points did that session give you, and why? | Says "100 for finishing" (not "for doing it well") |
| T6 | How many sessions have you done this week, against your plan? | Reads the weekly ring or Progress correctly |
| T7 | Encourage someone in your league | Sends a cheer |
| T8 | Where do you see what your physio prescribed? | Finds Profile → My plan, or the Sessions routine |

### 5.2 Questionnaires

- **Comprehension quiz** (5 items, after T1–T8):
  - Does doing extra reps earn more points? *(No)*
  - Does a rest day break your streak? *(No)*
  - What does stopping because it hurt give you? *(50 points, and it still counts)*
  - Who can change your exercises? *(Your physio)*
  - What counts toward the crew goal? *(Planned sessions)*

  Target: 4/5 or better for 80% of participants.
- **Enjoyment:** the Intrinsic Motivation Inventory's interest/enjoyment subscale, plus "Did this feel like a game or an exercise tracker?" on a 1–7 scale.
- **Usability:** System Usability Scale (SUS). Target: 70 or above.
- **Social comfort:** "The league made me feel… (inferior ↔ supported)" on a 1–7 scale, plus open comments.

### 5.3 Replayability: a 7-day diary study

- **Measures:** sessions started and completed against the plan (from the game's own history), days with no return, which features were opened (music, scenes, badges, league), and a 2-minute daily diary ("What brought you back today?").
- **Signal to watch:** whether returns depend on new unlocks (unlock pacing working) or on the crew goal (social loop working).

### 5.4 Safety probes (observed and asked)

- **Does the player ever do extra reps, move faster or replay to "do better"?** Observe and ask. Anything above zero is a design issue.
- **Does anyone continue through reported pain?** Check sessions with `painAfter > 5` that were not stopped.
- **Is any part of the interface read as medical advice or a recovery score?** Ask directly.
- **Physio review:** do the plan controls cover what physios actually prescribe (reps, holds, time, sets, frequency, progression gates)? What's missing?

### 5.5 Parameters to tune from the results

| Parameter | Current value | Tune if… |
| --- | --- | --- |
| Session points | 100 | Players don't find points meaningful |
| Safe-stop points | 50 | Players feel penalised for stopping, or game the stop |
| Completion threshold | 60% | Partials feel unfair, or skipping is common |
| Team target | 75% of combined plan | The goal is never met, or always met too early |
| Rank thresholds | 300 / 800 / 1,500 / 2,500 / 4,000 | Unlocks stall in weeks 2–4 |

---

## 6. Implementation summary

### Changed in this revision

- **Rules engine** (`src/state.js`), rewritten:
  - Points with daily and weekly caps, and complete / safe-stop / partial / practice outcomes.
  - The days-on-plan streak with the weekly Flex Pass.
  - Ranks, unlocks and the 14 badges.
  - Groove Together and Cheer Chain, plus a weekly summary measured against the player's baseline.
  - The physio plan model.
- **Routine builder** (`src/song.js`): builds the song from the plan. Each exercise lasts exactly its reps or seconds, sets get rests between them, warm-up, breathers and cool-down are added, the pace comes from the plan, and Lite, amber and red adaptations are applied.
- **Session player** (`src/play.js`), rewritten in the reference layout: the move list, the coach in a scene, the rep or timer ring, the next move, restart / pause / skip, the 3-2-1 countdown and encouraging callouts. **Star scoring was removed entirely.** The band adds a layer for each move you reach.
- **Scenes** (`src/scene.js`): Warm Room, Sunny Porch, City Rooftop, Beach Vibes and Night Studio.
- **Every screen** (`src/main.js`) and a **new light theme** (`src/style.css`).
- **Coach figure:** skin tones, hair, dark linework that suits a light background, and a visible chair for seated routines.
- **Audio:** track variants by key change, seeking for restart and skip, a master mute, and 8-second previews.
- **Removed:**
  - Stars as score
  - The stage-clear and Level-Up Song progression
  - Player-requested level-ups and the auto-approval
  - The auto-rising difficulty dial
  - Tap and teammate-judge scoring modes
  - Duels, tiers, promotion and relegation
  - The boss, quests, combos and the share-to-bank meter
  - The "Short songs" toggle that changed the dose

### What works now (tested in Chrome)

The full flow works: onboarding → How to play → Home → Sessions → check-in → (camera setup) → countdown → session → completion → Home. Progress, League (cheers, ranking toggle), Music and Scenes (with previews), Badges, Profile and settings, the physio editor, practice runs, partial and safe-stop outcomes, and the phone layouts all work. There were no console errors across these runs.

### Simulated, mocked or labelled in the prototype

| Feature | Status |
| --- | --- |
| League members, their progress, the activity feed, and cheers you receive | **Simulated**, generated deterministically per week. Labelled "Demo crew" in the interface. |
| Physio accounts and approval | **Mocked.** The physio view is a local demo editor inside the patient's app, labelled "demo". |
| Clinic code | **Mocked.** It loads a preset plan for the chosen injury. |
| Notifications | **Settings only.** Nothing is sent, and the interface says so. |
| Music | **Original, synthesised in the browser.** No licensed tracks. |
| Camera tips | **Beta.** On-device MediaPipe pose tracking (downloaded on first use). Gives tips only and never affects points. |
| Data | **Stored in this browser only** (`localStorage`). There is no backend, no sync and no physio dashboard. |

### What needs external services

- **Real physio accounts:** authenticated prescriptions, plan changes pushed to patients, and adherence and pain dashboards.
- **Real leagues:** matchmaking, friend invites, moderation and real-time progress.
- **Reminders:** push notifications or email.
- **Licensed music:** a licensing agreement and a streaming integration, if real songs are wanted.
- **Clinical governance:** exercise content approved by physiotherapists, consent and privacy compliance (for example GDPR, or HIPAA where relevant), and clinical safety review.

### Assumptions where the original rules were incomplete

- **The physio decides the session dose,** including sets and how many sessions per day. The game never changes it, except for the check-in's amber and red adaptations, which only make sessions easier.
- **One session per day by default.** Weekly targets matter more than daily ones for adherence.
- **You can cheer each crew member once a day,** which keeps cheering meaningful rather than spammy.

---

## 7. Revision 3: Just Dance interaction and real exercise movement

**Problem found in playtesting:** the coach barely moved, and sessions felt like watching rather than playing. There were three causes:
- **Static exercises.** The demo knee plan used seated heel slides, quad squeezes and seated leg raises. Seated drawing shrinks leg movement to about 40%, and squeezes don't move anything at all.
- **Barely moving arms.** The default dance intensity was "Gentle" (floating arms).
- **Nothing to react to.** Without per-rep feedback there was no game moment.

**Changes:**

| Area | What changed |
| --- | --- |
| **Exercise library** | Rebuilt around *frontal-plane* moves, which read clearly from the front, both for the coach on screen and the camera: mini squats, side leg raises (alternating sides), calf raises, side bends, wide step-outs, side raises, wall slides, overhead reaches and head tilts. Poses are larger, and two-sided moves hold each side briefly on the beat. The demo plans are standing (Stage 2), with Easy dance intensity by default and Groovy as the physio's cap. |
| **Move track** | Just Dance-style cards slide along the bottom of the stage, one per rep peak (two per rep for two-sided moves). You make the shape as each card crosses the orange line. Gold cards mark the last rep of a set. |
| **Per-rep judgement (camera)** | Each rep peak is scored while it's in its window: from just before the peak to one beat after, so lagging slightly behind the coach is fine. The result is **PERFECT** (≥ 0.76), **GREAT** (≥ 0.6), **GOOD** (≥ 0.42) or **TRY AGAIN**, with stars, a short encouraging line, a combo counter, sounds and confetti on PERFECT. If you're out of view, it says "Step into view" instead of a judgement. |
| **Scoring** | Weights the joints the exercise actually moves (the prescribed part most), plus hip height (for squats and calf raises), trunk lean (for side bends) and head tilt. Tolerances are wide. Hip height uses a standing baseline captured during the warm-up. Checked with a unit test of matched and mismatched poses: matched shapes score 1.00, standing still scores about 0.30, the wrong direction about 0.1–0.5. |
| **Without the camera** | Reps are counted on the line ("1, 2, 3…"). No PERFECT/GOOD is shown, because nothing is sensing the player, and a hint suggests turning the camera on. |
| **Your groove** | Shown on the completion screen: average stars, a tally of each judgement, and the best combo. |

**Rule unchanged:** points still come only from finishing planned sessions (100, or 50 for a safe stop). PERFECT, GOOD and the groove rating are feedback and fun. They never affect points, ranks, badges or the league, so nobody gains anything by pushing range or speed.
