import * as Tone from 'tone';
import { createBGM, setSeed, playSE, Presets, resetSE, stopBGM, resetBGM, playBGM } from '../index';
import { logger } from '../logger';

logger.set(logger.LEVEL.FULL);

async function initUi() {
  const rand = <HTMLButtonElement>document.getElementById("random");
  const seed = <HTMLInputElement>document.getElementById("seed");
  const playBtn = <HTMLButtonElement>document.getElementById("play");
  const select = <HTMLButtonElement>document.getElementById("select");
  const stop = <HTMLButtonElement>document.getElementById("stop");

  const play = () => {
    playBGM("0");
  };

  const create = () => {
    setSeed(Number(seed.value));
    createBGM("0", 8,3);
  }
  
  playBtn.onclick = () => { 
    play();
  }
  
  rand.onclick = () => {
    seed.value = Math.floor(Math.random() * 9999999).toString();
    
    resetBGM();
    create();
    play();
  };

  select.onclick = () => {
    setSeed(Number(seed.value));
    playSE(Presets.Select);
  }
  
  stop.onclick = () => {
    stopBGM("0");
    resetSE();
  }

  seed.onblur = () => {
    create();
  }

  // 初回
  create();
}

window.onload = async () => {
  initUi();
}