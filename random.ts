// @ts-ignore workaround
import random from 'random';
import * as randomTypes from 'random';

class RandomImpl {
  x: number = 0;
  y: number = 0;
  z: number = 0;
  w: number = 0;

  get(fromOrTo: number = 1, to: number = null) {
    if (to == null) {
      to = fromOrTo;
      fromOrTo = 0;
    }
    return (this.getToMaxInt() / 0xffffffff) * (to - fromOrTo) + fromOrTo;
  }

  setSeed(
    w: number = null,
    x = 123456789,
    y = 362436069,
    z = 521288629,
    loopCount = 32
  ) {
    this.w = w != null ? w >>> 0 : Math.floor(Math.random() * 0xffffffff) >>> 0;
    this.x = x >>> 0;
    this.y = y >>> 0;
    this.z = z >>> 0;
    for (let i = 0; i < loopCount; i++) {
      this.getToMaxInt();
    }
    return this;
  }

  getToMaxInt() {
    const t = this.x ^ (this.x << 11);
    this.x = this.y;
    this.y = this.z;
    this.z = this.w;
    this.w = (this.w ^ (this.w >>> 19) ^ (t ^ (t >>> 8))) >>> 0;
    return this.w;
  }

  constructor() {
    this.setSeed();
  }
}

const randImpl = new RandomImpl();
const setSeed = (seed: number) => {
  randImpl.setSeed(seed);
  random.use(() => randImpl.get());
}
random.setSeed = setSeed;

export const ranif = (p: number) => random.float() < p;
export const selectRand = <T>(ary: T[]) => ary[random.int(0, ary.length - 1)];

const _random: typeof randomTypes & { setSeed: typeof setSeed } = random;
export { _random as random };
