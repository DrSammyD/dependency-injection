/// <reference path="../dist/aurelia-dependency-injection.d.ts" />
import './setup';
import { Container } from '../dist/aurelia-dependency-injection';
import { transient, singleton } from '../dist/aurelia-dependency-injection';
import { decorators } from 'aurelia-metadata';

describe('registration', () => {
  it('configures singleton via decorators helper (ES5/6)', () => {
    const Logger = decorators(singleton()).on(class { });

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
    const app1 = container.get(App1);
    const app2 = container.get(App2);

    expect(app1.logger).toBe(app2.logger);
  });

  it('configures transient (non singleton) via metadata method (ES5/6)', () => {
    const Logger = decorators(transient()).on(class { });

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
    const app1 = container.get(App1);
    const app2 = container.get(App2);

    expect(app1.logger).not.toBe(app2.logger);
  });

  it('uses base metadata method (ES5/6) when derived does not specify', () => {
    const LoggerBase = decorators(transient()).on(class { });

    class Logger extends LoggerBase {

    }

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
    const app1 = container.get(App1);
    const app2 = container.get(App2);

    expect(app1.logger).not.toBe(app2.logger);
  });

  it('overrides base metadata method (ES5/6) with derived configuration', () => {
    const LoggerBase = decorators(singleton()).on(class { });
    const Logger = decorators(transient()).on(class extends LoggerBase { });

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
    const app1 = container.get(App1);
    const app2 = container.get(App2);

    expect(app1.logger).not.toBe(app2.logger);
  });

  it('doesn\'t get hidden when a super class adds metadata which doesn\'t include the base registration type', () => {
    const LoggerBase = decorators(transient()).on(class { });

    class Logger extends LoggerBase {
    }

    //@ts-ignore
    Reflect.defineMetadata('something', 'test', Logger);

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
    const app1 = container.get(App1);
    const app2 = container.get(App2);

    expect(app1.logger).not.toBe(app2.logger);
  });
});

