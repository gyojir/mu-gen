import * as Tone from 'tone';
import { playBGM, setSeed, playSE, Presets, resetSE, stopBGM } from '../index';
import { logger } from '../logger';

logger.set(logger.LEVEL.FULL);

async function initUi() {
  const rand = <HTMLButtonElement>document.getElementById("random");
  const seed = <HTMLInputElement>document.getElementById("seed");
  const playBtn = <HTMLButtonElement>document.getElementById("play");
  const select = <HTMLButtonElement>document.getElementById("select");
  const stop = <HTMLButtonElement>document.getElementById("stop");

  const play = () => {
    Tone.getContext().resume();
    setSeed(Number(seed.value));

    playBGM(8,2);    
  };
  
  playBtn.onclick = play;
  
  rand.onclick = () => {
    seed.value = Math.floor(Math.random() * 9999999).toString();
    play();
  };

  select.onclick = () => {
    setSeed(Number(seed.value));
    resetSE();
    playSE(Presets.Select);
  }
  
  stop.onclick = () => {
    stopBGM();
    resetSE();
  }
}

window.onload = async () => {
  initUi();
}