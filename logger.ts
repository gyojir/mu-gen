enum LEVEL {
  RUN   = 0,
  ERROR = 1,
  WARN  = 2,
  LOG   = 3,
  INFO  = 4,
  DEBUG = 5,
  FULL  = 5,
}

class Logger {
  readonly LEVEL = LEVEL;

  debug = (...msg: any) => {};
  info  = (...msg: any) => {};
  log   = (...msg: any) => {};
  warn  = (...msg: any) => {};
  error = (...msg: any) => {};

  set(level: LEVEL) {
    this.debug = level >= LEVEL.DEBUG ? console.debug : ()=>{};
    this.info = level >= LEVEL.INFO ? console.info : ()=>{};
    this.log = level >= LEVEL.LOG ? console.log : ()=>{};
    this.warn = level >= LEVEL.WARN ? console.warn : ()=>{};
    this.error = level >= LEVEL.ERROR ? console.error : ()=>{};
  }
}

export const logger = new Logger();