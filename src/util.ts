
export type NestedArray<T> = (T | NestedArray<T>)[];
export type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any ? A : never;
export type PropType<TObj, TProp extends keyof TObj> = TObj[TProp];

export const sleep = (msec: number) => new Promise(resolve => setTimeout(resolve, msec));
export const range = (len: number): number[] => [...Array(len)].map((e,i)=>i);
export const mapAll = <T, R>(ary: NestedArray<T>, fn: (x: T) => R): NestedArray<R> => ary.map(e => Array.isArray(e) ? mapAll<T, R>(e, fn) : fn(e));
export const mapAllf = <T, R>(fn: (x: T) => R) => (e: NestedArray<T>) => mapAll(e, fn);
export const mod = (x: number, m: number): number => x < 0 ? mod(x + m, m) : x % m;
export const flatten = <T>(ary: NestedArray<T>) => [].concat(...[ary]) as T[];
export const findMax = <T>(fn: (a: T, b: T) => boolean, ary: T[]): [number, T] => {
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

export const getHashFromString = (str: string) => {
  let hash = 0;
  const len = str.length;
  for (let i = 0; i < len; i++) {
    const chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return hash;
}

//   |   0   |   1   |   2   |   3   |   4   |   5   |   6   |   7   | (len == 8)
//-> | 0 | 4 | 1 | 5 | 2 | 6 | 3 | 7 | 0 | 4 | 1 | 5 | 2 | 6 | 3 | 7 | (len == 4)
//    ^        ^       ^       ^           ^       ^       ^       ^   match 1/2!
//-> |0|2|4|6|1|3|5|7|0|2|4|6|1|3|5|7|0|2|4|6|1|3|5|7|0|2|4|6|1|3|5|7| (len == 2)
//    ^       ^         ^       ^         ^       ^         ^       ^  match 1/4!
export const swapToCompress = <T>(ary: T[], len: number) => {
  let ret: T[] = [];
  let pos = 0;
  ary.forEach((e,i) => {
    ret[i] = ary[(pos % ary.length) + Math.floor(pos / ary.length)];
    pos += len;
  });
  return ret;
}

// 間引く
export const thinOut = <T>(ary: T[], len: number) => {
  const rate = ary.length / len;
  return range(len)
    .map(e => ary[Math.floor(e * rate)]);
}

export const loopShift = <T>(ary: T[], n: number) => {
  return ary.map((e,i) => ary[(i+n)%ary.length]);
}

// export const origRandom = Math.random;
// export const setSeed = function me(s: number) {
//   random.use(seedrandom(`${s}`))
//   Math.random = () => random.float();
//   return me;
// };
