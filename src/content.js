// Everything the game is made of: poses, moves, injuries, levels, songs, emojis, the league.

// ---------------------------------------------------------------- poses
// Front-facing coach. Angles in degrees: 0 = limb points down, 90 = screen right, 180 = up.
// lSh/rSh = upper arm, lEl/rEl = forearm relative to upper arm, lTh/rTh = thigh, lKn/rKn = shin relative.
// drop = hips lower (squat) or rise (negative, on toes). lean = trunk tilt. head = head tilt.
const base = { lean: 0, lSh: -12, lEl: -4, rSh: 12, rEl: 4, lTh: -4, lKn: 0, rTh: 4, rKn: 0, drop: 0, head: 0 };
const p = (o) => ({ ...base, ...o });
export const POSES = {
  rest: p({}),
  vUp: p({ lSh: -150, lEl: 0, rSh: 150, rEl: 0 }),
  reachUp: p({ lSh: -168, lEl: 0, rSh: 168, rEl: 0 }),
  clapTop: p({ lSh: -165, lEl: 40, rSh: 165, rEl: -40 }),
  out: p({ lSh: -90, lEl: 0, rSh: 90, rEl: 0, lTh: -6, rTh: 6 }),
  flex: p({ lSh: -95, lEl: -80, rSh: 95, rEl: 80, lTh: -6, rTh: 6 }),
  pointR: p({ lean: -6, lSh: -25, lEl: -10, rSh: 125, rEl: 0, rTh: 6, head: 6 }),
  pointL: p({ lean: 6, lSh: -125, lEl: 0, rSh: 25, rEl: 10, lTh: -6, head: -6 }),
  swayL: p({ lean: 9, lSh: -40, lEl: -30, rSh: 40, rEl: 30, lTh: -8, rTh: 2, head: -8 }),
  swayR: p({ lean: -9, lSh: -40, lEl: -30, rSh: 40, rEl: 30, lTh: -2, rTh: 8, head: 8 }),
  waveL: p({ lean: 4, lSh: -140, lEl: -25, rSh: 40, rEl: 60, lTh: -6, head: -5 }),
  waveR: p({ lean: -4, lSh: -40, lEl: -60, rSh: 140, rEl: 25, rTh: 6, head: 5 }),
  heart: p({ lSh: -30, lEl: 120, rSh: 30, rEl: -120 }),
  shimmy: p({ lSh: -165, lEl: 10, rSh: 165, rEl: -10, lTh: -10, lKn: 10, rTh: 10, rKn: -10, drop: 8 }),
  floatOut: p({ lSh: -48, lEl: -10, rSh: 48, rEl: 10 }),
  floatIn: p({ lSh: -18, lEl: -30, rSh: 18, rEl: 30 }),
  crossClap: p({ lSh: -60, lEl: 75, rSh: 60, rEl: -75 }),
  // legs
  squat: p({ lSh: -60, lEl: -60, rSh: 60, rEl: 60, lTh: -32, lKn: 52, rTh: 32, rKn: -52, drop: 46 }),
  halfSquat: p({ lSh: -62, lEl: -10, rSh: 62, rEl: 10, lTh: -24, lKn: 40, rTh: 24, rKn: -40, drop: 34 }),
  stepR: p({ lean: -4, rTh: 40, rKn: -80, head: 4 }),
  stepL: p({ lean: 4, lTh: -40, lKn: 80, head: -4 }),
  calfUp: p({ drop: -24, lSh: -28, lEl: -20, rSh: 28, rEl: 20 }),
  balanceR: p({ rTh: 34, rKn: -95, lSh: -80, rSh: 80 }),
  balanceL: p({ lTh: -34, lKn: 95, lSh: -80, rSh: 80 }),
  legExtR: p({ rTh: 10, rKn: -75 }),
  legExtL: p({ lTh: -10, lKn: 75 }),
  heelSlideR: p({ rTh: 20, rKn: -35 }),
  heelSlideL: p({ lTh: -20, lKn: 35 }),
  toeTapR: p({ rTh: 14, rKn: -25 }),
  sideStepR: p({ lTh: -10, rTh: 28, lean: -6, lSh: -40, rSh: 60 }),
  sideStepL: p({ lTh: -28, rTh: 10, lean: 6, lSh: -60, rSh: 40 }),
  // trunk / neck
  tiltF: p({ drop: 6, lean: 0, head: 0, lSh: -20, rSh: 20 }),
  tiltB: p({ drop: -4, lean: 0, lSh: -8, rSh: 8 }),
  leanL: p({ lean: 12, head: -6 }),
  leanR: p({ lean: -12, head: 6 }),
  headL: p({ head: -24 }),
  headR: p({ head: 24 }),
  headTiltL: p({ head: -38, lSh: -16, rSh: 16 }),
  headTiltR: p({ head: 38, lSh: -16, rSh: 16 }),
  // side-to-side exercises: big, clear and easy for the camera to read from the front
  sideLegR: p({ lean: -9, lSh: -55, lEl: -10, rSh: 55, rEl: 10, lTh: -2, rTh: 40, rKn: -4, head: 4 }),
  sideLegL: p({ lean: 9, lSh: -55, lEl: -10, rSh: 55, rEl: 10, lTh: -40, lKn: 4, rTh: 2, head: -4 }),
  sideBendL: p({ lean: -20, lSh: -18, lEl: -6, rSh: 168, rEl: -28, head: -10 }),
  sideBendR: p({ lean: 20, lSh: -168, lEl: 28, rSh: 18, rEl: 6, head: 10 }),
  stepWideR: p({ lean: -6, lSh: -70, rSh: 70, lTh: -8, rTh: 30, rKn: -6 }),
  stepWideL: p({ lean: 6, lSh: -70, rSh: 70, lTh: -30, lKn: 6, rTh: 8 }),
  birdL: p({ lSh: -165, lEl: 0, rTh: 30, rKn: -20 }),
  birdR: p({ rSh: 165, rEl: 0, lTh: -30, lKn: 20 }),
  pendL: p({ lean: 6, lSh: -32, lEl: 0 }),
  pendR: p({ lean: 6, lSh: 8, lEl: 0 }),
  raiseOut: p({ lSh: -88, lEl: 0, rSh: 88, rEl: 0 }),
  raiseHalf: p({ lSh: -58, lEl: 0, rSh: 58, rEl: 0 }),
  wallUp: p({ lSh: -150, lEl: 10, rSh: 150, rEl: -10 }),
  wallDown: p({ lSh: -95, lEl: -70, rSh: 95, rEl: 70 }),
};
export const LIMBS = {
  arms: ['lSh', 'lEl', 'rSh', 'rEl'],
  legs: ['lTh', 'lKn', 'rTh', 'rKn', 'drop'],
  trunk: ['lean'],
  head: ['head'],
};

// ---------------------------------------------------------------- core moves (prescribed by the physio)
// a/b = the two poses of one rep; cycle = beats per rep ("2 counts up, 2 down" = 4).
// invisible = squeezes/breathing the camera can't see: hold still, tap "felt it".
export const CORE = {
  breathe: { name: 'Breathing', a: 'floatIn', b: 'floatOut', cycle: 8, rest: true, cue: 'In for 4, out for 4' },
  imagine: { name: 'Watch & imagine', a: 'rest', b: 'rest', cycle: 8, imagine: true, cue: 'Watch the coach and picture the move' },
  // knee
  quadSqueeze: { name: 'Quad squeezes', a: 'rest', b: 'rest', cycle: 8, invisible: 'thigh', seated: true, cue: 'Squeeze 4, release 4', lite: 'breathe' },
  heelSlide: { name: 'Heel slides', a: 'rest', b: 'heelSlideR', cycle: 4, seated: true, cue: 'Slide 2, back 2', lite: 'quadSqueeze' },
  legRaise: { name: 'Seated leg raises', a: 'rest', b: 'legExtR', cycle: 4, seated: true, cue: 'Straighten 2, lower 2', lite: 'heelSlide' },
  miniSquat: { name: 'Mini squats', a: 'rest', b: 'halfSquat', cycle: 4, standing: true, cue: 'Down 2, up 2', lite: 'legRaise' },
  stepUp: { name: 'Step-ups', a: 'stepR', b: 'stepL', cycle: 4, standing: true, cue: 'Up, up, down, down', lite: 'miniSquat' },
  calfRaise: { name: 'Calf raises', a: 'rest', b: 'calfUp', cycle: 4, standing: true, cue: 'Rise 2, lower 2', lite: 'miniSquat' },
  balance: { name: 'Single-leg balance', a: 'balanceR', b: 'balanceR', cycle: 8, hold: true, standing: true, cue: 'Hold steady for 8', lite: 'calfRaise' },
  squatDeep: { name: 'Squats', a: 'rest', b: 'squat', cycle: 4, standing: true, cue: 'Down 2, up 2', lite: 'miniSquat' },
  sideLegRaise: { name: 'Side leg raises', seq: ['rest', 'sideLegR', 'rest', 'sideLegL'], cycle: 8, standing: true, each: true, cue: 'Lift out to the side, stand tall', lite: 'sideStep' },
  sideStep: { name: 'Side steps', a: 'sideStepL', b: 'sideStepR', cycle: 2, standing: true, cue: 'Step, touch', lite: 'calfRaise' },
  // shoulder
  pendulum: { name: 'Pendulum swings', a: 'pendL', b: 'pendR', cycle: 4, cue: 'Let it swing, 2 and 2', lite: 'breathe', arm: 'L' },
  stickRaise: { name: 'Stick-assisted raises', a: 'rest', b: 'raiseHalf', cycle: 4, cue: 'Raise 2, lower 2', lite: 'pendulum' },
  wallSlide: { name: 'Wall slides', a: 'wallDown', b: 'wallUp', cycle: 4, cue: 'Slide up 2, down 2', lite: 'stickRaise' },
  sideRaise: { name: 'Side raises', a: 'rest', b: 'raiseOut', cycle: 4, cue: 'Out 2, down 2', lite: 'stickRaise' },
  overhead: { name: 'Overhead reach', a: 'raiseOut', b: 'reachUp', cycle: 4, cue: 'Reach 2, return 2', lite: 'sideRaise' },
  // lower back
  sideBend: { name: 'Side bends', seq: ['rest', 'sideBendL', 'rest', 'sideBendR'], cycle: 8, each: true, cue: 'Reach up and over, both sides', lite: 'seatedSway' },
  pelvicTilt: { name: 'Pelvic tilts', a: 'tiltF', b: 'tiltB', cycle: 4, seated: true, cue: 'Tilt 2, back 2', lite: 'breathe' },
  seatedSway: { name: 'Seated side bends', a: 'leanL', b: 'leanR', cycle: 4, seated: true, cue: 'Lean 2, lean 2', lite: 'pelvicTilt' },
  hinge: { name: 'Hip hinges', a: 'rest', b: 'halfSquat', cycle: 4, standing: true, cue: 'Hinge 2, rise 2', lite: 'seatedSway' },
  birdDog: { name: 'Standing bird-dog', a: 'birdL', b: 'birdR', cycle: 4, standing: true, cue: 'Reach and lift, switch', lite: 'hinge' },
  // ankle
  ankleCircle: { name: 'Ankle circles', a: 'rest', b: 'toeTapR', cycle: 4, seated: true, cue: 'Circle 4', lite: 'breathe' },
  toeTap: { name: 'Toe taps', a: 'rest', b: 'toeTapR', cycle: 2, seated: true, cue: 'Tap, back', lite: 'ankleCircle' },
  // hip
  gluteSqueeze: { name: 'Glute squeezes', a: 'rest', b: 'rest', cycle: 8, invisible: 'hips', seated: true, cue: 'Squeeze 4, release 4', lite: 'breathe' },
  sitToStand: { name: 'Sit-to-stand', a: 'halfSquat', b: 'rest', cycle: 4, standing: true, cue: 'Stand 2, sit 2', lite: 'heelSlide' },
  // neck
  headTilt: { name: 'Head tilts', seq: ['rest', 'headTiltL', 'rest', 'headTiltR'], cycle: 8, seated: true, each: true, cue: 'Ear toward shoulder, both sides', lite: 'chinTuck' },
  stepWide: { name: 'Wide step-outs', seq: ['rest', 'stepWideR', 'rest', 'stepWideL'], cycle: 8, standing: true, each: true, cue: 'Step wide, arms out, back to centre', lite: 'sideStep' },
  chinTuck: { name: 'Chin tucks', a: 'rest', b: 'rest', cycle: 4, invisible: 'neck', seated: true, cue: 'Tuck 2, release 2', lite: 'breathe' },
  headTurn: { name: 'Gentle head turns', a: 'headL', b: 'headR', cycle: 4, seated: true, cue: 'Turn 2, turn 2', lite: 'chinTuck' },
  shoulderRoll: { name: 'Shoulder rolls', a: 'floatIn', b: 'raiseHalf', cycle: 4, cue: 'Roll up 2, down 2', lite: 'chinTuck' },
};

// ---------------------------------------------------------------- injuries
// core = which body parts the prescribed move owns. The Flair uses everything else.
// moves[level] = [verse move, chorus signature move, bridge move]
export const INJURIES = {
  knee: { name: 'Knee', detail: 'Ligament tear, replacement', core: ['legs'], moves: {
    1: ['quadSqueeze', 'heelSlide', 'quadSqueeze'], 2: ['heelSlide', 'legRaise', 'quadSqueeze'], 3: ['miniSquat', 'stepUp', 'balance'],
    4: ['calfRaise', 'stepUp', 'balance'], 5: ['squatDeep', 'sideStep', 'balance'] } },
  shoulder: { name: 'Shoulder', detail: 'Frozen shoulder, rotator cuff', core: ['arms'], moves: {
    1: ['pendulum', 'pendulum', 'breathe'], 2: ['pendulum', 'stickRaise', 'breathe'], 3: ['stickRaise', 'wallSlide', 'sideRaise'],
    4: ['wallSlide', 'sideRaise', 'overhead'], 5: ['sideRaise', 'overhead', 'wallSlide'] } },
  back: { name: 'Lower back', detail: 'Strain, disc, chronic pain', core: ['trunk', 'legs'], moves: {
    1: ['pelvicTilt', 'pelvicTilt', 'breathe'], 2: ['pelvicTilt', 'seatedSway', 'breathe'], 3: ['hinge', 'seatedSway', 'birdDog'],
    4: ['hinge', 'birdDog', 'birdDog'], 5: ['squatDeep', 'birdDog', 'hinge'] } },
  ankle: { name: 'Ankle', detail: 'Sprain, fracture', core: ['legs'], moves: {
    1: ['ankleCircle', 'toeTap', 'ankleCircle'], 2: ['toeTap', 'ankleCircle', 'heelSlide'], 3: ['calfRaise', 'toeTap', 'balance'],
    4: ['calfRaise', 'sideStep', 'balance'], 5: ['sideStep', 'calfRaise', 'balance'] } },
  hip: { name: 'Hip', detail: 'Replacement, pain', core: ['legs'], moves: {
    1: ['gluteSqueeze', 'heelSlide', 'gluteSqueeze'], 2: ['heelSlide', 'legRaise', 'gluteSqueeze'], 3: ['sitToStand', 'sideStep', 'balance'],
    4: ['sitToStand', 'stepUp', 'balance'], 5: ['squatDeep', 'sideStep', 'balance'] } },
  neck: { name: 'Neck', detail: 'Strain, stiffness', core: ['head'], moves: {
    1: ['chinTuck', 'headTurn', 'breathe'], 2: ['headTurn', 'shoulderRoll', 'chinTuck'], 3: ['shoulderRoll', 'headTurn', 'chinTuck'],
    4: ['shoulderRoll', 'headTurn', 'chinTuck'], 5: ['shoulderRoll', 'headTurn', 'chinTuck'] } },
};

// ---------------------------------------------------------------- flair (difficulty dial 0..3)
// Each entry is a 4-pose loop; combo length decides how many of them are used per 8-count.
export const FLAIR_SETS = [
  [['floatIn', 'floatOut'], ['floatOut', 'heart'], ['floatIn', 'crossClap']], // step 0: gentle, arms only, but not the same loop all song
  [['swayL', 'swayR'], ['waveL', 'waveR'], ['floatOut', 'heart']],          // step 1: simple arms
  [['clapTop', 'out'], ['pointR', 'pointL'], ['flex', 'out'], ['waveL', 'waveR']], // step 2: across the body
  [['clapTop', 'crossClap', 'pointR', 'out'], ['vUp', 'flex', 'pointL', 'heart'], ['shimmy', 'out', 'clapTop', 'crossClap']], // step 3: combos
];
export const FLAIR_NAMES = {
  'floatIn,floatOut': 'Arms float with the breath', 'floatIn,crossClap': 'Float and soft clap', 'swayL,swayR': 'Arm swings', 'waveL,waveR': 'Arm waves', 'floatOut,heart': 'Open and to the heart',
  'clapTop,out': 'Clap on the top', 'pointR,pointL': 'Point it out', 'flex,out': 'Flex and open', 'clapTop,crossClap,pointR,out': 'Clap, cross, point, open',
  'vUp,flex,pointL,heart': 'V, flex, point, heart', 'shimmy,out,clapTop,crossClap': 'Shimmy combo',
};

// ---------------------------------------------------------------- the physio's plan
// A plan is a short list of exercises with a rep count (or a time), a weekly target, a pace and a
// ceiling on how much dance the player can add. Only the physio view can change it.
// These presets are what the demo clinic code loads for each injury area.
export const PLAN_PRESETS = {
  knee: { title: 'Knee Strength', stage: 'Stage 2 · Building strength', exercises: [{ move: 'miniSquat', reps: 10, sets: 2 }, { move: 'sideLegRaise', reps: 6, sets: 2 }, { move: 'calfRaise', reps: 10, sets: 2 }], bpm: 76 },
  shoulder: { title: 'Shoulder Mobility', stage: 'Stage 2 · Range of motion', exercises: [{ move: 'sideRaise', reps: 10, sets: 2 }, { move: 'wallSlide', reps: 8, sets: 2 }, { move: 'overhead', reps: 8, sets: 2 }], bpm: 70 },
  back: { title: 'Gentle Back Routine', stage: 'Stage 2 · Mobility', exercises: [{ move: 'sideBend', reps: 6, sets: 2 }, { move: 'miniSquat', reps: 8, sets: 2 }, { move: 'stepWide', reps: 6, sets: 2 }], bpm: 70 },
  ankle: { title: 'Ankle Strength', stage: 'Stage 2 · Building strength', exercises: [{ move: 'calfRaise', reps: 12, sets: 2 }, { move: 'sideStep', reps: 16, sets: 2 }, { move: 'miniSquat', reps: 8, sets: 2 }], bpm: 76 },
  hip: { title: 'Hip Strength', stage: 'Stage 2 · Building strength', exercises: [{ move: 'sideLegRaise', reps: 8, sets: 2 }, { move: 'miniSquat', reps: 10, sets: 2 }, { move: 'stepWide', reps: 6, sets: 2 }], bpm: 72 },
  neck: { title: 'Neck & Shoulders', stage: 'Stage 2 · Mobility', exercises: [{ move: 'headTilt', reps: 6, sets: 2 }, { move: 'headTurn', reps: 8, sets: 2 }, { move: 'sideRaise', reps: 8, sets: 2 }], bpm: 64 },
};
export const PACES = [56, 60, 64, 66, 70, 72, 76, 80, 90, 100, 110];
export const INTENSITY = [
  { n: 'Gentle', d: 'Arms float with the music' },
  { n: 'Easy', d: 'Simple arm sways and waves' },
  { n: 'Groovy', d: 'Claps and points across the body' },
  { n: 'Full', d: 'Four-move dance combos' },
];

// ---------------------------------------------------------------- game rank (points, cosmetic only)
// Ranks only unlock looks, music and scenes. They say nothing about recovery.
export const RANKS = [
  { name: 'First Steps', pts: 0 }, { name: 'Warming Up', pts: 300 }, { name: 'Move Maker', pts: 800 },
  { name: 'Rhythm Regular', pts: 1500 }, { name: 'Groove Star', pts: 2500 }, { name: 'Groove Legend', pts: 4000 },
];

// ---------------------------------------------------------------- music + scenes
// Every track is synthesised live in the browser by the Groove Back band (audio.js). No licensed music.
// The tempo always comes from the physio's plan: changing the track never changes the exercise pace.
export const GENRES = { lofi: 'Lo-fi', acoustic: 'Acoustic', pop: 'Pop', dhol: 'Bhangra', dance: 'Electro' };
export const MOODS = ['All', 'Chill', 'Happy', 'Energetic', 'World'];
// Music comes in 5 phases of 3 songs. A phase opens at the matching rank (Phase 1 = First Steps), so a new
// player only ever chooses between a few songs. A song plays only once its MP3 is in public/songs/
// (`file`), with its tempo (`bpm`) and the time of its first beat (`first`, seconds) measured from the file.
// Songs without a file are locked placeholders. Licensed songs are for internal playtesting only:
// keep public/songs out of anything you publish (it's in .gitignore).
export const PHASES = [
  { n: 1, name: 'Phase 1', vibe: 'Easy mornings' },
  { n: 2, name: 'Phase 2', vibe: 'Feeling the groove' },
  { n: 3, name: 'Phase 3', vibe: 'Turn it up' },
  { n: 4, name: 'Phase 4', vibe: 'Party mode' },
  { n: 5, name: 'Phase 5', vibe: 'Comeback anthems' },
];
export const TRACKS = [
  { id: 'she-doesnt-mind', phase: 1, title: 'She Doesn’t Mind', artist: 'Sean Paul', genre: 'Dancehall', world: 'pop', file: 'songs/she-doesnt-mind.mp3', bpm: 119.99, first: 0.48, end: 231, hook: 48, cover: ['#FF8C52', '#FFD36B'] },
  { id: 'levitating', phase: 1, title: 'Levitating', artist: 'Dua Lipa ft. DaBaby', genre: 'Disco pop', world: 'dance', file: 'songs/levitating.mp3', bpm: 102.99, first: 0.57, end: 221, hook: 44, cover: ['#9C8CE8', '#E8628F'] },
  { id: 'flowers', phase: 1, title: 'Flowers', artist: 'Miley Cyrus', genre: 'Pop', world: 'pop', cover: ['#FFD9A8', '#E8628F'] },
  { id: 'sugar', phase: 2, title: 'Sugar', artist: 'Maroon 5', genre: 'Pop', world: 'pop', cover: ['#E8628F', '#FFF0C5'] },
  { id: 'cheerleader', phase: 2, title: 'Cheerleader (Felix Jaehn Remix)', artist: 'OMI', genre: 'Tropical', world: 'acoustic', cover: ['#8AD6D1', '#FFD36B'] },
  { id: 'watermelon-sugar', phase: 2, title: 'Watermelon Sugar', artist: 'Harry Styles', genre: 'Pop rock', world: 'acoustic', cover: ['#E8628F', '#8AD6D1'] },
  { id: 'happy', phase: 3, title: 'Happy', artist: 'Pharrell Williams', genre: 'Soul pop', world: 'pop', cover: ['#FFD36B', '#FF8C52'] },
  { id: 'cupid', phase: 3, title: 'Cupid (Twin Ver.)', artist: 'FIFTY FIFTY', genre: 'K-pop', world: 'pop', cover: ['#FFC7DA', '#C6B6FF'] },
  { id: 'cant-stop-the-feeling', phase: 3, title: 'Can’t Stop the Feeling!', artist: 'Justin Timberlake', genre: 'Pop', world: 'pop', cover: ['#FF8C52', '#C6B6FF'] },
  { id: 'kala-chashma', phase: 4, title: 'Kala Chashma', artist: 'Badshah, Neha Kakkar', genre: 'Bhangra pop', world: 'dhol', cover: ['#F2B33D', '#E8692B'] },
  { id: 'london-thumakda', phase: 4, title: 'London Thumakda', artist: 'Labh Janjua, Sonu Kakkar', genre: 'Bollywood', world: 'dhol', cover: ['#FF8C52', '#9C8CE8'] },
  { id: 'dance-monkey', phase: 4, title: 'Dance Monkey', artist: 'Tones and I', genre: 'Pop', world: 'pop', cover: ['#359FA0', '#FFD36B'] },
  { id: 'uptown-funk', phase: 5, title: 'Uptown Funk', artist: 'Mark Ronson ft. Bruno Mars', genre: 'Funk', world: 'dance', cover: ['#2F4858', '#FF8C52'] },
  { id: 'dont-start-now', phase: 5, title: 'Don’t Start Now', artist: 'Dua Lipa', genre: 'Disco pop', world: 'dance', cover: ['#9C8CE8', '#2F4858'] },
  { id: 'shake-it-off', phase: 5, title: 'Shake It Off', artist: 'Taylor Swift', genre: 'Pop', world: 'pop', cover: ['#E8628F', '#FFD36B'] },
].map((t) => ({ ...t, rank: t.phase - 1 }));
export const SCENES = [
  { id: 'room', name: 'Warm Room', d: 'Cosy, calm, plants in the window', rank: 0 },
  { id: 'porch', name: 'Sunny Porch', d: 'Morning light and fresh air', rank: 0 },
  { id: 'rooftop', name: 'City Rooftop', d: 'Golden hour over the skyline', rank: 1 },
  { id: 'beach', name: 'Beach Vibes', d: 'Waves, palms and sea breeze', rank: 2 },
  { id: 'studio', name: 'Night Studio', d: 'Soft neon after dark', rank: 3 },
];

// ---------------------------------------------------------------- avatar
export const SKIN = ['#F7D9C0', '#EDBB93', '#D49D72', '#A9704A', '#7A4E31', '#563524'];
export const OUTFITS = [
  { id: 'teal', name: 'Lagoon', color: '#359FA0', glove: '#FF8C52', rank: 0 },
  { id: 'orange', name: 'Sunset', color: '#FF8C52', glove: '#FFD36B', rank: 0 },
  { id: 'lavender', name: 'Lavender', color: '#9C8CE8', glove: '#8AD6D1', rank: 0 },
  { id: 'seafoam', name: 'Seafoam', color: '#6CC5BF', glove: '#FF8C52', rank: 1 },
  { id: 'berry', name: 'Berry', color: '#E8628F', glove: '#FFF0C5', rank: 2 },
  { id: 'gold', name: 'Golden Hour', color: '#F2B33D', glove: '#359FA0', rank: 3 },
  { id: 'night', name: 'Night Run', color: '#2F4858', glove: '#8AD6D1', rank: 4 },
];

// ---------------------------------------------------------------- badges (participation, never performance)
// rule: the stat it counts and how many are needed. cat: the filter it lives under.
export const BADGES = [
  { id: 'first', name: 'First Step', desc: 'Finish your first session', cat: 'Progress', icon: 'shoe', rule: ['sessions', 1] },
  { id: 'five', name: 'High Five', desc: 'Finish 5 sessions', cat: 'Progress', icon: 'hand', rule: ['sessions', 5] },
  { id: 'ten', name: 'Move Maker', desc: 'Finish 10 sessions', cat: 'Progress', icon: 'dumbbell', rule: ['sessions', 10] },
  { id: 'thirty', name: 'Dedicated', desc: 'Finish 30 sessions', cat: 'Progress', icon: 'crown', rule: ['sessions', 30] },
  { id: 'week', name: 'Week Warrior', desc: 'Complete your weekly plan', cat: 'Consistency', icon: 'calendar', rule: ['weeks', 1] },
  { id: 'streak7', name: 'Consistency Star', desc: 'Stay on plan 7 days in a row', cat: 'Consistency', icon: 'flame', rule: ['streak', 7] },
  { id: 'rest', name: 'Rest Respecter', desc: 'Log a rest day', cat: 'Consistency', icon: 'moon', rule: ['rests', 1] },
  { id: 'comeback', name: 'Welcome Back', desc: 'Come back after a week away', cat: 'Special', icon: 'refresh', rule: ['comeback', 1] },
  { id: 'listen', name: 'Body Listener', desc: 'Use Lite or stop safely when you need to', cat: 'Special', icon: 'heart', rule: ['listen', 1] },
  { id: 'variety', name: 'Two Weeks Strong', desc: 'Complete your weekly plan twice', cat: 'Consistency', icon: 'spark', rule: ['weeks', 2] },
  { id: 'music', name: 'Music Lover', desc: 'Move to 3 different genres', cat: 'Special', icon: 'note', rule: ['genres', 3] },
  { id: 'scenes', name: 'Scene Setter', desc: 'Try 3 different scenes', cat: 'Special', icon: 'palette', rule: ['scenes', 3] },
  { id: 'team', name: 'Team Player', desc: 'Help your league reach Groove Together', cat: 'League', icon: 'people', rule: ['team', 1] },
  { id: 'cheer', name: 'Cheerleader', desc: 'Send 10 cheers', cat: 'League', icon: 'megaphone', rule: ['cheers', 10] },
];
// Accessories unlock from badges, so they're earned by showing up.
export const COSMETICS = [
  { id: 'cap', kind: 'hat', name: 'Red cap', badge: 'first' },
  { id: 'beanie', kind: 'hat', name: 'Pom beanie', badge: 'five' },
  { id: 'flower', kind: 'hat', name: 'Flower clip', badge: 'rest' },
  { id: 'headphones', kind: 'hat', name: 'Headphones', badge: 'music' },
  { id: 'bandana', kind: 'hat', name: 'Mint bandana', badge: 'week' },
  { id: 'party', kind: 'hat', name: 'Party hat', badge: 'team' },
  { id: 'halo', kind: 'hat', name: 'Halo', badge: 'listen' },
  { id: 'crown', kind: 'hat', name: 'Gold crown', badge: 'thirty' },
  { id: 'sun', kind: 'trail', name: 'Sun trail', badge: 'streak7' },
  { id: 'mint', kind: 'trail', name: 'Mint trail', badge: 'cheer' },
  { id: 'lilac', kind: 'trail', name: 'Lilac trail', badge: 'variety' },
  { id: 'pink', kind: 'trail', name: 'Pink trail', badge: 'scenes' },
];

// ---------------------------------------------------------------- league (simulated in this prototype)
// Crew members share a nickname, an avatar and how many of THEIR OWN planned sessions they've done.
// Never their injury, exercises or pain.
export const CREW = [
  { nick: 'rhea_moves', color: '#E8628F', skin: '#D49D72', plan: 4, adh: 0.95 },
  { nick: 'aarav.k', color: '#359FA0', skin: '#A9704A', plan: 5, adh: 0.8 },
  { nick: 'slowandsteady', color: '#F2B33D', skin: '#F7D9C0', plan: 3, adh: 1 },
  { nick: 'diya_dances', color: '#9C8CE8', skin: '#7A4E31', plan: 4, adh: 0.75 },
  { nick: 'kabir.b', color: '#FF8C52', skin: '#EDBB93', plan: 3, adh: 0.6 },
  { nick: 'sunrise_sam', color: '#6CC5BF', skin: '#563524', plan: 5, adh: 0.7 },
];
export const CHEERS = [
  { e: '👏', text: 'Well done!' }, { e: '💪', text: 'Keep going' }, { e: '❤️', text: 'I’m with you' },
  { e: '🔥', text: 'On a roll' }, { e: '🌱', text: 'Rest well' },
];
export const QUOTES = [
  'Small moves, every day, add up.', 'Your pace is the right pace.', 'Rest is part of the routine.',
  'Showing up is the whole game.', 'Same moves. New groove.', 'Gentle counts. Always.',
];
