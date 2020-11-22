import * as Tone from 'tone';
import * as jsfx from "loov-jsfx";
import { NestedArray, range, flatten, findMax, mod, mapAllf, PropType, getHashFromString, swapToCompress, thinOut, loopShift, sleep } from './util';
import { random } from './random';
import { logger } from './logger';
import { RecursivePartial } from 'tone/build/esm/core/util/Interface';
import { Instrument } from 'tone/build/esm/instrument/Instrument';
import { TimeBaseUnit } from 'tone/build/esm/core/type/TimeBase';

const DefaultBPM = 120;

export const destinationNode = new Tone.Channel();
destinationNode.toDestination();

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
        return ({ match: max.size, base: modNote(note), chord: chords[maxI] });
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
      .map(e => { logger.log(e.map(s => `${NoteName[s.base]} ${s.chord}`)); return e; })
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
  }, sequence, Tone.Time(barTime).toSeconds());
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

// Polyシンセ生成
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

// jsfxシンセ生成
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

// BGM生成
let bgms: { [key: string]: Tone.Sequence<number | null>[]} = {};
let synths: Instrument<any>[] = [];
export const createBGM = (
  key: string,
  length: number = 4,
  accompanimentNumber: number = 2,
  baseOctave: number = 4,
  bpm: number = DefaultBPM,
  noteOffsetRandomness: number = 0,
) => {
  bgms[key] = [];

  random.setSeed(_seed);

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
  const barTime: Tone.Unit.Time = {"1n" : DefaultBPM / bpm};
  const offset = random.int(-noteOffsetRandomness, noteOffsetRandomness);

  let baseSequence: NestedArray<number>[];
  {
    const synth = randomSynth(synthPrams).connect(destinationNode);
    synths.push(synth);
    baseSequence = makeSequence(selectRandomScale(), length, random.select([8,16]), null, 0.01, baseOctave, offset);
    bgms[key].push(makeToneSequence(baseSequence, synth, barTime));
  }

  const progression = makeProgressionFromSequence(baseSequence);
  range(accompanimentNumber).forEach(() => {
    const synth = randomSynth(synthPrams).connect(destinationNode);
    synths.push(synth);
    const len = random.select([2,4,8].filter(e=>e <= length));
    const prog = [...progression].splice(random.int(0, Math.max(0, (length/len) - 1)) * len, len);
    bgms[key].push(makeToneSequence(makeSequence(prog, len, random.select([4,8,16]), null, 0.01, baseOctave, 0), synth, barTime));
  });

  return bgms[key];
};

// BGM再生
export const playBGM = (key: string)=>{
  stopBGM(key);

  const bgm = bgms[key];
  bgm?.forEach(e => e.start());

  Tone.Transport.start();
  Tone.Transport.bpm.value = DefaultBPM;
};

// BGM停止
export const stopBGM = (key: string) => {
  const bgm = bgms[key];
  bgm?.forEach(e => e.stop());
}

// BGM停止
export const stopAllBGM = () => {
  Object.keys(bgms).forEach(key => stopBGM(key));
}

// jsfxサウンド生成
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

// SE再生
let sounds: { [x: string]: Tone.Player } = {};
export function playSE(
  params: Presets,
  volume: number = null,
  name: string = "",
) {
  name = params.toString() + name;
  let sound = sounds[name];
  if (sound !== undefined) {
    volume !== null && (sound.volume.value = volume);
    sound.stop();
    sound.start();
    return;
  }
  random.setSeed(_seed + getHashFromString(name));
  sound = createJsfxSound(presets[params]).toDestination();

  volume !== null && (sound.volume.value = volume);
  sound.start();
}

// BGMリセット
export const resetBGM = () => {
  Object.values(bgms).forEach(e=>e.forEach(e => e.dispose()));
  bgms = {};
  
  synths.forEach(e => { e.dispose(); });
  synths = [];
}

// SEリセット
export const resetSE = () => {
  Object.values(sounds).forEach(e=>e.dispose());
  sounds = {};
}

// 録音
export const recordBGM = async (key: string, loop: number, listen: boolean = true) => {
  const bgm = bgms[key];
  if(bgm === undefined){
    return;
  }

  stopAllBGM();
  
  logger.log("recording start!");

  const recorder = new Tone.Recorder();
  destinationNode.connect(recorder);
  if(!listen) {
    destinationNode.disconnect(Tone.Destination);
  }

  const len = bgm[0].events.length * loop;
  const subdivision = bgm[0].subdivision;
  bgm.forEach(e => e.loop = Math.floor(len / e.events.length));

  recorder.start();
  playBGM(key);
  for (let i = 0; i < len; i++){
    logger.log(`progress: ${Math.floor(100 * i / len)}%`);
    await sleep(subdivision * 1000);
  }
  stopBGM(key);
  await sleep(Tone.getContext().lookAhead * 1000);

  const recording = await recorder.stop();  
  logger.log("recording finish!");

  destinationNode.disconnect(recorder);
  if(!listen) {
    destinationNode.toDestination();
  }

  return recording;
}