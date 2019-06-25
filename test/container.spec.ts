/// <reference path="../dist/aurelia-dependency-injection.d.ts" />
import './setup';
import { Container } from '../dist/aurelia-dependency-injection';
import { inject } from '../dist/aurelia-dependency-injection';

describe('container', () => {
  it('asserts keys are defined', () => {
    const container = new Container();

    expect(() => container.get(null)).toThrow();
    expect(() => container.get(undefined)).toThrow();

    expect(() => container.registerInstance(null, {})).toThrow();
    expect(() => container.registerInstance(undefined, {})).toThrow();

    expect(() => container.registerSingleton(null)).toThrow();
    expect(() => container.registerSingleton(undefined)).toThrow();

    expect(() => container.registerTransient(null)).toThrow();
    expect(() => container.registerTransient(undefined)).toThrow();

    expect(() => container.autoRegister(null)).toThrow();
    expect(() => container.autoRegister(undefined)).toThrow();

    expect(() => container.autoRegisterAll([null])).toThrow();
    expect(() => container.autoRegisterAll([undefined])).toThrow();

    //@ts-ignore
    expect(() => container.registerHandler(null)).toThrow();
    //@ts-ignore
    expect(() => container.registerHandler(undefined)).toThrow();

    //@ts-ignore
    expect(() => container.hasHandler(null)).toThrow();
    //@ts-ignore
    expect(() => container.hasHandler(undefined)).toThrow();
  });

  it('automatically configures as singleton', () => {
    class Logger { }

    @inject(Logger)
    class App1 {
      constructor(public logger) {
        this.logger = logger;
      }
    }


    @inject(Logger)
    class App2 {
      constructor(public logger) {
        this.logger = logger;
      }
    }


    const container = new Container();
    const app1 = container.get(App1);
    const app2 = container.get(App2);

    expect(app1.logger).toBe(app2.logger);
  });

  it('automatically configures non-functions as instances', () => {
    const someObject = {};

    class App1 {
      constructor(public something) {
        this.something = something;
      }
    }

    inject(someObject)(App1);


    const container = new Container();
    const app1 = container.get(App1);

    expect(app1.something).toBe(someObject);
  });

  it('configures singleton via api', () => {
    class Logger { }

    @inject(Logger)
    class App1 {
      constructor(public logger) {
        this.logger = logger;
      }
    }


    @inject(Logger)
    class App2 {
      constructor(public logger) {
        this.logger = logger;
      }
    }


    const container = new Container();
    container.registerSingleton(Logger, Logger);

    const app1 = container.get(App1);
    const app2 = container.get(App2);

    expect(app1.logger).toBe(app2.logger);
  });

  it('configures transient (non singleton) via api', () => {
    class Logger { }

    class App1 {
      static inject() { return [Logger]; }
      constructor(public logger) {
        this.logger = logger;
      }
    }

    class App2 {
      static inject() { return [Logger]; }
      constructor(public logger) {
        this.logger = logger;
      }
    }

    const container = new Container();
    container.registerTransient(Logger, Logger);

    const app1 = container.get(App1);
    const app2 = container.get(App2);

    expect(app1.logger).not.toBe(app2.logger);
  });

  it('configures instance via api', () => {
    class Logger { }

    class App1 {
      static inject() { return [Logger]; }
      constructor(public logger) {
        this.logger = logger;
      }
    }

    class App2 {
      static inject() { return [Logger]; }
      constructor(public logger) {
        this.logger = logger;
      }
    }

    const container = new Container();
    const instance = new Logger();
    container.registerInstance(Logger, instance);

    const app1 = container.get(App1);
    const app2 = container.get(App2);

    expect(app1.logger).toBe(instance);
    expect(app2.logger).toBe(instance);
  });

  it('configures custom via api', () => {
    class Logger { }

    class App1 {
      static inject() { return [Logger]; }
      constructor(public logger) {
        this.logger = logger;
      }
    }

    class App2 {
      static inject() { return [Logger]; }
      constructor(public logger) {
        this.logger = logger;
      }
    }

    const container = new Container();
    container.registerHandler(Logger, (c) => 'something strange');

    const app1 = container.get(App1);
    const app2 = container.get(App2);

    expect(app1.logger).toEqual('something strange');
    expect(app2.logger).toEqual('something strange');
  });

  it('configures key as service when transient api only provided with key', () => {
    class Logger { }

    const container = new Container();
    container.registerTransient(Logger);

    const logger1 = container.get(Logger);
    const logger2 = container.get(Logger);

    expect(logger1).toEqual(jasmine.any(Logger));
    expect(logger2).toEqual(jasmine.any(Logger));
    expect(logger2).not.toBe(logger1);
  });

  it('configures key as service when singleton api only provided with key', () => {
    class Logger { }

    const container = new Container();
    container.registerSingleton(Logger);

    const logger1 = container.get(Logger);
    const logger2 = container.get(Logger);

    expect(logger1).toEqual(jasmine.any(Logger));
    expect(logger2).toEqual(jasmine.any(Logger));
    expect(logger2).toBe(logger1);
  });

  it('configures concrete singleton via api for abstract dependency', () => {
    class LoggerBase { }
    class Logger extends LoggerBase { }

    class App {
      static inject() { return [LoggerBase]; }
      constructor(public logger) {
        this.logger = logger;
      }
    }

    const container = new Container();
    container.registerSingleton(LoggerBase, Logger);

    const app = container.get(App);

    expect(app.logger).toEqual(jasmine.any(Logger));
  });

  it('configures concrete transient via api for abstract dependency', () => {
    class LoggerBase { }
    class Logger extends LoggerBase { }

    class App {
      static inject() { return [LoggerBase]; }
      constructor(public logger) {
        this.logger = logger;
      }
    }

    const container = new Container();
    container.registerTransient(LoggerBase, Logger);

    const app = container.get(App);

    expect(app.logger).toEqual(jasmine.any(Logger));
  });
});
