import * as jsfx from "loov-jsfx";
import * as Tone from 'tone';
import { setSeed } from './random';
import { playBGM } from './index';
import { logger } from './logger';

const library = {
  // "select": {"Volume":{"Sustain":0.1,"Decay":0.15,"Punch":0.55}},
  "long": { "Volume": { "Sustain": 0.1, "Decay": 0.5, "Punch": 1 } },
  "coin": jsfx.Preset.Coin,
  "explosion": jsfx.Preset.Explosion,
  "select": jsfx.Preset.Select
};

logger.set(logger.LEVEL.FULL);
logger.log(Tone.Envelope.getDefaults())
logger.log(Tone.Sequence.getDefaults())

const synth = new Tone.PolySynth().toDestination();
synth.set({ oscillator: { type: "sawtooth" }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0 } });
const synth2 = new Tone.PolySynth().toDestination();
synth2.set({ oscillator: { type: "fmsine" }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.1 } });

async function initUi() {

  let keys: Tone.Players;
  {
    let buffer: Tone.ToneAudioBuffer;
    const offline = new Tone.OfflineContext(2, 30, 44100);
    const synth = new Tone.PolySynth({ context: offline }).toDestination();
    synth.get().oscillator.type = "amsawtooth";
    synth.triggerAttackRelease(["C4", "E4", "G4"], "16n");
    const osc = new Tone.Oscillator({context: offline, frequency: 440, type: "sawtooth"}).toDestination();
    osc.start().stop("16n");
    buffer = await offline.render();
    keys = new Tone.Players({
      0: buffer
    }).toDestination();
  }

  const change = <HTMLButtonElement>document.getElementById("random");
  const seed = <HTMLInputElement>document.getElementById("seed");
  const set = <HTMLButtonElement>document.getElementById("play");
  change.onclick = () => {
    seed.value = Math.floor(Math.random() * 9999999).toString();
    play();
  };

  const play = () => {
    Tone.getContext().resume();
    setSeed(Number(seed.value));
    // const sfx = jsfx.Live(library);
    // sfx.select();

    // synth.triggerAttackRelease("C4", "8n");
    // keys.player(`${0}`).start();

    playBGM();
  };
  set.onclick = play;
}

window.onload = async () => {
  initUi();
}