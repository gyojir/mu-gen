import * as Tone from 'tone';
import * as jsfx from "loov-jsfx";
import { NestedArray, range, flatten, findMax, mod, mapAllf, PropType, getHashFromString } from './util';
import { random } from './random';
import { logger } from './logger';
import { RecursivePartial } from 'tone/build/esm/core/util/Interface';
import { Instrument } from 'tone/build/esm/instrument/Instrument';

let _seed = 0;
export const setSeed = (seed: number) => {
  _seed = seed;
}

const modNote = (note: number) => mod(note, Note.End);

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
  [0, 2, 4, 5, 7, 9, 11], // ダイアトニックスケール
  [0, 2, 3, 5, 7, 9, 11], // メロディックマイナースケール
  [1, 3, 6, 8, 10],       // ペンタトニックスケール
  [0, 4, 5, 7, 11],       // ニロ抜き
];

// I C:0, II D:2, III E:4, IV F:5, V G:7, VI A:9, VII B:11
export const enum Note {
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
const MajorNotes = [Note.C, Note.D, Note.E, Note.F, Note.G, Note.A, Note.B];

export const enum Presets {
  Coin,
  Laser,
  Explosion,
  Powerup,
  Hit,
  Jump,
  Select,
  Lucky,
};

const presets = {
  [Presets.Coin]: jsfx.Preset.Coin,
  [Presets.Laser]: jsfx.Preset.Laser,
  [Presets.Explosion]: jsfx.Preset.Explosion,
  [Presets.Powerup]: jsfx.Preset.Powerup,
  [Presets.Hit]: jsfx.Preset.Hit,
  [Presets.Jump]: jsfx.Preset.Jump,
  [Presets.Select]: jsfx.Preset.Select,
  [Presets.Lucky]: jsfx.Preset.Lucky,
};

export const noteNumber = (note: Note, octave: number) => {
  return octave * Note.End + note;
}

export const noteOctave = (note: number) => {
  return Math.max(Math.floor(note / Note.End), -1);
}

export const noteName = (note: number) => {
  const n = modNote(note);
  const octave = noteOctave(note);
  return `${NoteName[n]}${octave}`;
}

// 周波数からノートに変換
// C0 == 0
export const freqToNote = (frequency: number) => {
  return Math.floor(12 * Math.log2(frequency/440) + noteNumber(Note.A,4));
}

// コード進行ランダム生成
export const makeRandomProgression = (length: number) => {
  return range(length)
    .map(() => ({ base: random.select(MajorNotes), chord: random.select(chords) }));
};

// シーケンス(メロディ)に含まれるノートからコードを選択
export const makeProgressionFromSequence = (sequence: NestedArray<number>[]) => {
  return sequence
    .map(e => Array.from(new Set(flatten(e).filter(e => e !== null))).sort())
    .map(notes => {
      if (notes.length === 0) {
        return ({ base: random.select(MajorNotes), chord: random.select(chords) });
      }

      // 各ノートを基準とした場合の全てのコードに対する最大の一致を調べる
      const candidates = notes.map(note => {
        const set = new Set(notes.map(n => modNote(n - note)));                                         // 自身でオフセット
        const intersections = chords.map(chord => new Set(chord.filter(e => (set.has(modNote(e))))));   // 積集合
        let [maxI, max] = findMax((a, b) => a.size > b.size, intersections)                             // 一致数の最大値を調べる
        return ({ match: max.size, base: note % Note.End, chord: chords[maxI] });
      });
      let [maxI, max] = findMax((a, b) => a.match > b.match, candidates);
      return ({ match: max.match, base: max.base, chord: max.chord });
    });
};

// スケール選択
export const selectRandomScale = () => {
  return [({ base: random.select(MajorNotes), chord: random.select(scales) })];
};

// 各小節ごとの使用ノート
export const makeSubNotes = (
  progressionOrScale: { base: number, chord: number[] }[],
  length: number = 4,              // 何小節？
) => {
  const progressionDivide = Math.max(1, Math.floor(progressionOrScale.length / length));
  const subNotes =
    range(length)
      .map(() => range(progressionDivide))
      .map((e, i) => e.map((s, j) => progressionOrScale[(i * progressionDivide + j) % progressionOrScale.length]))
      .map(e => e.map(s => { logger.log(`${NoteName[s.base]} ${s.chord}`); return s; }))
      .map(e => e.map(({ base, chord }) => chord.map(c => base + c)));
  return subNotes;
};

// メロディ生成
export const makeSequence = (
  progressionOrScale: { base: number, chord: number[] }[],
  length: number = 4,                   // 何小節？
  subdivide: number = 1,                // 何分音符？
  skipRatio: number | null = null,      // 無音の割合
  noChordRatio: number | null = null,   // コード外の音を使う割合
  baseOctave: number = 4,               // ベースのオクターブ
  offset: number = 0                    // 全ノートにかけるオフセット
) => {
  skipRatio = skipRatio !== null ? skipRatio : random.float(0, 0.9);
  noChordRatio = noChordRatio !== null ? noChordRatio : random.float(0, 0.2);                            

  const subNotes = makeSubNotes(progressionOrScale, length);

  let current = random.float(0, 1);
  const randomStep = random.normal(0, 0.2);

  const sequence =
    range(length)
      .map(() => range(subdivide))                                                                    // subdivide
      .map((e, i) => e.map((s, j) => subNotes[i][Math.floor((j / subdivide) * subNotes[i].length)]))  // 流し込み
      .map(e => e.map(s => s.sort()))
      .map((e, i) => e.map((s, j) => {
        // if(i == 0) { current = random.float(0,1); }
        current += randomStep();
        const index = mod(Math.floor(current * s.length), s.length);
        const octave = Math.floor(current) * Note.End;
        return s[index] + octave;
      }))                                                                                             // 流し込み
      .map(mapAllf(n => random.ranif(noChordRatio) ? n + random.int(-2, 2) : n))                      // コード外
      .map(mapAllf(n => n + offset))                                                                  // オフセット
      .map(mapAllf(n => n + (baseOctave * Note.End)))
      .map(mapAllf(n => random.ranif(skipRatio) ? null : n));

  logger.log(sequence);
  return sequence;
};

// Tone.jsのイベント生成
export const makeToneSequence = (
  sequence: NestedArray<number>[],
  synth: Instrument<any>,
  barTime: Tone.Unit.Time = "1n",  // 一小節の長さ
) => {
  return new Tone.Sequence<number | null>((time, note) => {
    if (note !== null) {
      const name = noteName(note);
      const scheduleTime = Tone.Transport.seconds + Math.max(0, time - Tone.Transport.immediate());
      synth.triggerAttackRelease(name, random.float(0.05, 0.1), scheduleTime, random.float(0.5, 1));
    }
  }, sequence, barTime);
};

type OmniOscillatorSynthOptions = PropType<RecursivePartial<Tone.SynthOptions>, "oscillator">;
type OmniOscillatorSynthTypes = PropType<OmniOscillatorSynthOptions, "type"> ;

// シンセ生成
export const randomSynth = (params: (OmniOscillatorSynthTypes | Object | Function)[]) => {
  const param = random.select(params);
  if(typeof param === "object" || typeof param === "function"){
      return createJsfxSynth(param);
  }
  return createRandomPolySynth(param);
};

export const createRandomPolySynth = (
  type: OmniOscillatorSynthTypes =  random.select(["sawtooth", "fmsawtooth", "amsawtooth", "square", "fatsquare", "fmtriangle"])
) => {
  const synth = new Tone.PolySynth();
  synth.sync();
  synth.set({
    oscillator: {
      type: type as any
    },
    envelope: {
      attack: random.float(0, 0.05),
      decay: random.float(0, 0.1),
      sustain: random.float(0.1, 1),
      release: random.float(0, 0.5)
    }
  });
  logger.log(synth.get().oscillator.type, synth.get().envelope)
  return synth;
}

export const createJsfxSynth = (param: any) => {
  logger.log(param);
  if(typeof param === "function"){
    random.patch();
    param = param();
    random.unpatch();
  }
  const buffer = jsfx.AudioBuffer(Tone.getContext(), param) as AudioBuffer;
  const synth = new Tone.Sampler({
    urls: {
      [noteName(freqToNote(param.Frequency.Start))]: buffer,
    }
  });
  synth.sync();
  return synth;
}

// BGM再生
let seq: Tone.Sequence<number | null>[] = [];
let synths: Instrument<any>[] = [];
export const playBGM = (
  length: number = 4,
  accompanimentNumber: number = 2,
  baseOctave: number = 4,
  bpm: number = 120,
  noteOffsetRandomness: number = 0,
) => {
  stopBGM();
  random.setSeed(_seed);

  const offset = random.int(-noteOffsetRandomness, noteOffsetRandomness);
  const synthPrams = [
    "sawtooth",
    "fmsawtooth",
    "amsawtooth",
    "square",
    "fatsquare",
    "fmtriangle",
    presets[Presets.Laser],
    presets[Presets.Select],
    presets[Presets.Explosion],
    presets[Presets.Hit],
    presets[Presets.Hit],
  ];

  let baseSequence: NestedArray<number>[];
  {
    const synth = randomSynth(synthPrams).toDestination();
    synths.push(synth);
    baseSequence = makeSequence(selectRandomScale(), length, random.select([8,16]), null, 0.01, baseOctave, offset);
    seq.push(makeToneSequence(baseSequence, synth).start(0));
  }

  const progression = makeProgressionFromSequence(baseSequence);
  range(accompanimentNumber).forEach(() => {
    const synth = randomSynth(synthPrams).toDestination();
    synths.push(synth);
    seq.push(makeToneSequence(makeSequence(progression, random.select([2,4,8].filter(e=>e <= length)), random.select([4,8,16]), null, 0.01, baseOctave, 0), synth).start(0));
  })
  Tone.Transport.stop();
  Tone.Transport.start();
  Tone.Transport.bpm.value = bpm;
};

export const createJsfxSound = (param: Object | Function) => {
  if(typeof param === "function"){
    random.patch();
    param = param();
    random.unpatch();
  }
  logger.log(param)
  const buffer = jsfx.AudioBuffer(Tone.getContext(), param) as AudioBuffer;
  return new Tone.Player(buffer);
}

let sounds: { [x: string]: Tone.Player } = {};
export function playSE(
  params: Presets,
  name: string = "0",
  volume: number = null
) {
  name = params.toString() + name;
  if (sounds[name] !== undefined) {
    volume !== null && (sounds[name].volume = volume as any);
    sounds[name].start();
    return;
  }
  random.setSeed(_seed + getHashFromString(name));
  sounds[name] = createJsfxSound(presets[params]).toDestination();

  volume !== null && (sounds[name].volume = volume as any);
  sounds[name].start();
}

export const stopBGM = () => {
  seq.forEach(e => { e.dispose(); });
  seq = [];
  synths.forEach(e => { e.dispose(); });
  synths = [];
}

export const resetSE = () => {
  Object.values(sounds).forEach(e=>e.dispose());
  sounds = {};
}