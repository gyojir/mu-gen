import * as jsfx from "loov-jsfx";
import * as Tone from 'tone';
import random from 'random';
import seedrandom from 'seedrandom';
import { isArray } from "tone";

type NestedArray<T> = (T | NestedArray<T>)[];

const sleep = (msec: number) => new Promise(resolve => setTimeout(resolve, msec));
const ranif = (p: number) => random.float() < p;
const selectRand = <T>(ary: T[]) => ary[random.int(0, ary.length - 1)];
const range = (len: number): undefined[] => [...Array(len)];
const mapAll = <T, R>(ary: NestedArray<T>, fn: (x: T) => R): NestedArray<R> => ary.map(e => isArray(e) ? mapAll<T, R>(e, fn) : fn(e));
const mapAllf = <T, R>(fn: (x: T) => R) => (e: NestedArray<T>) => mapAll(e, fn);
const mod = (x: number, m: number) => x < 0 ? mod(x + m, m) : x % m;
const flatten = <T>(ary: NestedArray<T>) => [].concat(...[ary]) as T[];
const findMax = <T>(fn: (a: T, b: T) => boolean, ary: T[]): [number, T] => {
  if (ary.length == 0) {
    throw new Error("invalid array size");
  }

  let maxI = 0;
  let max = ary[0];
  for (let i = 1; i < ary.length; i++) {
    if (fn(ary[i], max)) {
      maxI = i;
      max = ary[i];
    }
  }
  return [maxI, max];
}

const origRandom = Math.random;
const setSeed = function me(s: number) {
  random.use(seedrandom(`${s}`))
  Math.random = () => random.float();
  return me;
};

const library = {
  // "select": {"Volume":{"Sustain":0.1,"Decay":0.15,"Punch":0.55}},
  "long": { "Volume": { "Sustain": 0.1, "Decay": 0.5, "Punch": 1 } },
  "coin": jsfx.Preset.Coin,
  "explosion": jsfx.Preset.Explosion,
  "select": jsfx.Preset.Select
};

window.onload = async () => {
  initUi();
}

console.log(Tone.Envelope.getDefaults())
console.log(Tone.Sequence.getDefaults())


const chords = [
  [0, 4, 7],          // M
  [0, 3, 7],          // m

  [0, 4, 7, 10],      // 7
  [0, 4, 7, -2],      // 7
  [0, 4, -5, -2],     // 7

  [0, 4, 7, 11],      // M7
  [0, 4, 7, -1],      // M7
  [0, 4, -5, -1],     // M7

  [0, 3, 7, 10],      // m7
  [0, 3, 7, -2],      // m7
  [0, 3, -5, -2],     // m7
];

const scales = [
  [0, 4, 5, 7, 11],       // ニロ抜き
  [0, 2, 4, 5, 7, 9, 11], // ダイアトニックスケール
  [1, 3, 6, 8, 10],       // ペンタトニックスケール
];

// I C:0, II D:2, III E:4, IV F:5, V G:7, VI A:9, VII B:11
enum Note {
  C,
  Cs,
  D,
  Ds,
  E,
  F,
  Fs,
  G,
  Gs,
  A,
  As,
  B,

  End,
};
const majorNotes = [Note.C, Note.D, Note.E, Note.F, Note.G, Note.A, Note.B];

const NoteName = {
  [Note.C]: "C",
  [Note.Cs]: "C#",
  [Note.D]: "D",
  [Note.Ds]: "D#",
  [Note.E]: "E",
  [Note.F]: "F",
  [Note.Fs]: "F#",
  [Note.G]: "G",
  [Note.Gs]: "G#",
  [Note.A]: "A",
  [Note.As]: "A#",
  [Note.B]: "B",
};

const makeRandomProgression = (length: number) => {
  return range(length)
    .map(() => ({ base: selectRand(majorNotes), chord: selectRand(chords) }));
};

const makeProgressionFromSequence = (sequence: NestedArray<number>[]) => {
  // シーケンスに含まれるノートからコードを選択
  return sequence
    .map(e => Array.from(new Set(flatten(e).filter(e => e !== null))).sort())
    .map(notes => {
      if (notes.length === 0) {
        return ({ base: selectRand(majorNotes), chord: selectRand(chords) });
      }

      // 各ノートを基準とした場合の全てのコードに対する最大の一致を調べる
      const candidates = notes.map(note => {
        const set = new Set(notes.map(n => n - note));                                        // 自身でオフセット
        const intersections = chords.map(chord => new Set(chord.filter(e => (set.has(e)))));  // 積集合
        let [maxI, max] = findMax((a, b) => a.size > b.size, intersections)                    // 一致数の最大値を調べる
        return ({ match: max.size, base: note % Note.End, chord: chords[maxI] });
      });
      let [maxI, max] = findMax((a, b) => a.match > b.match, candidates);
      return ({ match: max.match, base: max.base, chord: max.chord });
    });
};

const selectRandomScale = () => {
  return [({ base: selectRand(majorNotes), chord: selectRand(scales) })];
};

const makeSubNotes = (
  progressionOrScale: { base: number, chord: number[] }[],
  length: number = 4,              // 何小節？
) => {
  const progressionDivide = Math.max(1, Math.floor(progressionOrScale.length / length));
  const subNotes =
    range(length)
      .map(() => range(progressionDivide))
      .map((e, i) => e.map((s, j) => progressionOrScale[(i * progressionDivide + j) % progressionOrScale.length]))
      .map(e => e.map(s => { console.log(`${NoteName[s.base]} ${s.chord}`); return s; }))
      .map(e => e.map(({ base, chord }) => chord.map(c => base + c)));
  return subNotes;
};

const makeSequence = (
  subNotes: number[][][],
  subdivide: number = 1,          // 何分音符？
  skipRatio: number | null = null,
  noChordRatio: number | null = null,
  baseOctave: number = 4,
  offset: number = 0
) => {
  skipRatio = skipRatio !== null ? skipRatio : random.float(0, 0.9);
  noChordRatio = noChordRatio !== null ? noChordRatio : random.float(0, 0.2);

  // const subNotes = 
  //   range(length)
  //   .map(()=> notes.filter(()=> ranif(subNoteRatio)))
  //   .map(e => e.length === 0 ? [selectRand(notes)] : e);


  // const subNotes = 
  //   range(length * progressionDivide)
  //   .map((e,i)=> progression[i % progression.length])
  //   .map(e=> {console.log(`${NoteName[e.base]} ${e.chord}`); return e;})
  //   .map(({base,chord}) => chord.map(c=>base+c));
  // const sequence =
  //   range(length)
  //   .map(() => range(subdivide))                                                                // subdivide
  // .map((e,i) => e.map((s,j) => subNotes[Math.floor((i + (j/subdivide)) * progressionDivide)]))  // 流し込み
  //   .map((e,i) => e.map((s,j) => selectRand(s)))                                                // 流し込み
  //   .map(mapAllf(n => ranif(noChordRatio) ? n + random.int(-2,2) : n))                          // コード外
  //   .map(mapAllf(n => n + offset))                                                              // オフセット
  //   .map(mapAllf(n => ranif(skipRatio) ? null : n));                                          

  let current = random.float(0, 1);
  const randomStep = random.normal(0, 0.2);

  const sequence =
    range(subNotes.length)
      .map(() => range(subdivide))                                                                  // subdivide
      .map((e, i) => e.map((s, j) => subNotes[i][Math.floor((j / subdivide) * subNotes[i].length)]))    // 流し込み
      .map(e => e.map(s => s.sort()))
      .map((e, i) => e.map((s, j) => {
        // if(i == 0) { current = random.float(0,1); }
        current += randomStep();
        const index = mod(Math.floor(current * s.length), s.length);
        const octave = Math.floor(current) * Note.End;
        return s[index] + octave;
      }))                                                                                            // 流し込み
      .map(mapAllf(n => ranif(noChordRatio) ? n + random.int(-2, 2) : n))                            // コード外
      .map(mapAllf(n => n + offset))                                                                // オフセット
      .map(mapAllf(n => n + (baseOctave * Note.End)))
      .map(mapAllf(n => ranif(skipRatio) ? null : n));

  console.log(sequence);
  return sequence;
};

const makeToneSequence = (
  sequence: NestedArray<number>[],
  synth: Tone.PolySynth,
  barTime: Tone.Unit.Time = "1n",  // 一小節の長さ
) => {
  return new Tone.Sequence<number | null>((time, note) => {
    if (note !== null) {
      const n = mod(note, Note.End) as Note;
      const octave = Math.max(Math.floor(note / Note.End), 1);
      const noteName = `${NoteName[n]}${octave}`;
      // console.log(noteName)
      const scheduleTime = Tone.Transport.seconds + Math.max(0, time - Tone.Transport.immediate());
      synth.triggerAttackRelease(noteName, random.float(0.05, 0.1), scheduleTime, random.float(0.5, 1));
    }
  }, sequence, barTime);
}

const synth = new Tone.PolySynth().toDestination();
synth.set({ oscillator: { type: "sawtooth" }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0 } });
const synth2 = new Tone.PolySynth().toDestination();
synth2.set({ oscillator: { type: "fmsine" }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.1 } });

const randomSynth = () => {
  const synth = new Tone.PolySynth().toDestination();
  synth.sync();
  synth.set({
    oscillator: {
      type: selectRand([/*"sine", "fmsine", "amsine", */"sawtooth", "fmsawtooth", "amsawtooth", "square", "fatsquare", "fmtriangle"])
    },
    envelope: {
      attack: random.float(0, 0.05),
      decay: random.float(0, 0.1),
      sustain: random.float(0.1, 1),
      release: random.float(0, 0.5)
    }
  });
  console.log(synth.get().oscillator.type, synth.get().envelope)
  return synth;
}

async function initUi() {

  let buffer: Tone.ToneAudioBuffer;
  {
    const offline = new Tone.OfflineContext(2, 30, 44100);
    const synth = new Tone.PolySynth({ context: offline }).toDestination();
    synth.get().oscillator.type = "amsawtooth";
    synth.triggerAttackRelease(["C4", "E4", "G4"], "16n");
    // const osc = new Tone.Oscillator({context: offline, frequency: 440, type: "sawtooth"}).toDestination();
    // osc.start().stop("16n");
    buffer = await offline.render();
  }

  const keys = new Tone.Players({
    0: buffer
  }).toDestination();

  const change = <HTMLButtonElement>document.getElementById("change");
  const seed = <HTMLInputElement>document.getElementById("seed");
  const set = <HTMLButtonElement>document.getElementById("set");
  change.onclick = () => {
    seed.value = Math.floor(Math.random() * 9999999).toString();
    play();
  };

  let seq: Tone.Sequence<number | null>[] = [];
  let synths: Tone.PolySynth[] = [];
  const play = () => {
    Tone.getContext().resume();
    random.use(seedrandom(seed.value));
    // setSeed(Number(seed.value));
    // const sfx = jsfx.Live(library);
    // sfx.select();

    // synth.triggerAttackRelease("C4", "8n");
    // keys.player(`${0}`).start();



    seq.forEach(e => { e.cancel(); e.clear(); e.stop(); e.dispose(); });
    seq = [];
    synths.forEach(e => { e.dispose(); });
    synths = [];
    Tone.Transport.stop();

    // seq.push(makeSequence(synth, 4, 8, "1n", 0.4, 0.2, null, 2).start(0));

    let baseSequence: NestedArray<number>[];
    {
      const synth = randomSynth();
      synths.push(synth);
      baseSequence = makeSequence(makeSubNotes(selectRandomScale(), 4), 8, null, 0.01, 4, 0);
      seq.push(makeToneSequence(baseSequence, synth).start(0));
    }

    const progression = makeProgressionFromSequence(baseSequence);
    const offset = random.int(0, 0);
    range(2).forEach(() => {
      const synth = randomSynth();
      synths.push(synth);
      seq.push(makeToneSequence(makeSequence(makeSubNotes(progression, 4), 8, null, 0.01, 4, offset), synth).start(0));
    })
    Tone.Transport.start();
    Tone.Transport.bpm.value = 120;
  };
  set.onclick = play;
}
