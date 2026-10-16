# Groove Back

**Your physio picks the moves. The song does the counting. Your league cheers you on. All you have to do is show up.**

A music game built around physiotherapy. Each session is made from the player's own prescribed exercises: reps, sets and pace set by their physio. The part of the body being treated does the exact exercise on the beat, and the rest of the body adds a little dance. Players earn **100 points for every planned session they finish**, never for speed, range or extra reps.

The design review, rule book, scoring spec, testing plan and implementation notes are in **[DESIGN.md](DESIGN.md)**.

## Play it

```
npm install
npm run dev
```

Open http://localhost:5173 in Chrome. Follow-along mode needs nothing else. For the optional camera tips, stand about 2 m back. The pose model downloads the first time you use it.

`npm run build` makes a single shareable file at `dist/index.html`. A copy is kept as `groove-back.html`, which you can double-click to open.

## Controls during a session

| Key | Action |
| --- | --- |
| Space or Esc | Pause or resume |
| L | Lite on or off (always allowed, full points) |
| H | That hurt: pauses straight away, offers Lite or a safe stop, logs it for the physio |
| ← / → | Restart the current move / skip to the next move |

## What's in it

- **Home:** today's session, days on plan, weekly ring and dots, Quick Picks, Groove Together, cheers.
- **Sessions:** the prescribed routine, duration, music and scene choice, dance intensity (capped by the physio), Lite, camera tips and a practice run.
- **Check-in:** a 10-second traffic light. Green is the full routine, amber is Lite and slower, red is Gentle Groove (breathing and watch-and-imagine).
- **Session player:**
  - The move list and a big coach demo in an illustrated scene.
  - A rep or timer ring with the move name, cue and what's next.
  - The current track, plus restart, pause and skip.
  - A 3-2-1 countdown at the start.
- **Completion:** points, moves done, the weekly ring, streak, badges, crew contribution and a pain-after check for the physio.
- **Progress:** week, month and all time, a sessions chart, a weekly summary against your first week, milestones, history, and a separate physio-only pain trend.
- **League:** Groove Together crew goal, each member's progress against their own plan, an optional fair ranking, cheers, Cheer Chain and an activity feed.
- **Music and Scenes:** 10 original tracks synthesised live, always played at the plan's pace, with 8-second previews; 5 scenes.
- **Badges:** 14 participation badges, most of which unlock avatar accessories.
- **Profile:** ranks and unlocks, avatar (skin tone, outfit, accessories), the physio's plan (read-only), and settings for accessibility, privacy, notifications (prototype) and playtest tools.
- **Physio view (demo):** edit exercises, reps or seconds, sets, sessions per week and day, suggested days, pace, the dance-intensity cap and the standing option.

The league crew, the physio account and notifications are simulated in this prototype and labelled as such. Progress is saved in this browser only.

## Files

- `src/state.js`: every rule: points, caps, streak, badges, ranks, league, weekly summary
- `src/song.js`: the Routine Builder (plan → song)
- `src/play.js`: the session player
- `src/scene.js`: the illustrated scenes
- `src/content.js`: poses, exercises, plans, tracks, scenes, badges, crew
- `src/audio.js`: the synthesised band
- `src/figure.js`: the coach and avatars
- `src/tracker.js`: camera pose tracking (optional)
- `src/main.js`: every other screen
- `src/style.css`: the light theme
