import * as jsfx from "loov-jsfx";
import * as Tone from 'tone';
import { random } from './random';
import { playBGM, setSeed, createJsfxSynth, createJsfxSound, playSE, Presets, resetSE, stopBGM } from './index';
import { logger } from './logger';

const library = {
  // "select": {"Volume":{"Sustain":0.1,"Decay":0.15,"Punch":0.55}},
  "long": { "Volume": { "Sustain": 0.1, "Decay": 0.5, "Punch": 1 } },
  "coin": jsfx.Preset.Coin,
  "explosion": jsfx.Preset.Explosion,
  "select": jsfx.Preset.Select
};

logger.set(logger.LEVEL.FULL);

async function initUi() {
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
    
    // const sound = createJsfxSound(jsfx.Preset.Coin).toDestination();
    // sound.start();

    playBGM(8,1);    
  };
  set.onclick = play;
}

window.onload = async () => {
  initUi();
}