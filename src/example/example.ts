import * as Tone from 'tone';
import { createBGM, setSeed, playSE, Presets, resetSE, stopBGM, resetBGM, playBGM, recordBGM } from '../index';
import { logger } from '../logger';

logger.set(logger.LEVEL.FULL);

async function initUi() {
  const rand = <HTMLButtonElement>document.getElementById("random");
  const seed = <HTMLInputElement>document.getElementById("seed");
  const playBtn = <HTMLButtonElement>document.getElementById("play");
  const select = <HTMLButtonElement>document.getElementById("select");
  const stop = <HTMLButtonElement>document.getElementById("stop");
  const save = <HTMLButtonElement>document.getElementById("save");
  const loop = <HTMLInputElement>document.getElementById("loop");

  const play = () => {
    playBGM("0");
  };

  const create = () => {
    setSeed(Number(seed.value));
    console.log(seed.value);
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
    resetBGM();
    create();
  }

  save.onclick = async () => {
    const recording = await recordBGM("0", Number(loop.value));
    const url = URL.createObjectURL(recording);
    const anchor = document.createElement("a");
    anchor.download = `recording_${seed.value}.webm`;
    anchor.href = url;
    anchor.click();
  }

  // 初回
  create();
}

window.onload = async () => {
  initUi();
}