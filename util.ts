
export type NestedArray<T> = (T | NestedArray<T>)[];
export type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any ? A : never;
export type PropType<TObj, TProp extends keyof TObj> = TObj[TProp];

export const sleep = (msec: number) => new Promise(resolve => setTimeout(resolve, msec));
export const range = (len: number): undefined[] => [...Array(len)];
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

// export const origRandom = Math.random;
// export const setSeed = function me(s: number) {
//   random.use(seedrandom(`${s}`))
//   Math.random = () => random.float();
//   return me;
// };
