import { Container } from '../dist/aurelia-dependency-injection';
import { Lazy, All, Optional, Parent, Factory, NewInstance, lazy, all, optional, parent, factory, newInstance } from '../dist/aurelia-dependency-injection';
import { inject, autoinject } from '../dist/aurelia-dependency-injection';
import { decorators } from 'aurelia-metadata';

describe('resolver', () => {
  describe('Custom resolvers', () => {
    describe('Lazy', () => {
      it('provides a function which, when called, will return the instance', () => {
        class Logger { }
        class App1 {
          static inject() { return [Lazy.of(Logger)]; }
          constructor(@lazy(Logger) public getLogger: () => Logger) {
            this.getLogger = getLogger;
          }
        }

        const container = new Container();
        const app1 = container.get(App1);

        const logger = app1.getLogger;

        expect(logger()).toEqual(jasmine.any(Logger));
      });

      it('provides a function which, when called, will return the instance using decorator', () => {
        class Logger { }

        @autoinject
        class App {
          constructor(@lazy(Logger) public getLogger: () => Logger) {
            this.getLogger = getLogger;
          }
        }

        const container = new Container();
        const app = container.get(App);

        const logger = app.getLogger;
        expect(logger()).toEqual(jasmine.any(Logger));
      });
    });

    describe('All', () => {
      it('resolves all matching dependencies as an array of instances', () => {
        class LoggerBase { }

        class VerboseLogger extends LoggerBase { }

        class Logger extends LoggerBase { }

        class App {
          static inject() { return [All.of(LoggerBase)]; }
          constructor(public loggers) {
            this.loggers = loggers;
          }
        }

        const container = new Container();
        container.registerSingleton(LoggerBase, VerboseLogger);
        container.registerTransient(LoggerBase, Logger);
        const app = container.get(App);

        expect(app.loggers).toEqual(jasmine.any(Array));
        expect(app.loggers.length).toBe(2);
        expect(app.loggers[0]).toEqual(jasmine.any(VerboseLogger));
        expect(app.loggers[1]).toEqual(jasmine.any(Logger));
      });

      it('resolves all matching dependencies as an array of instances using decorator', () => {
        class LoggerBase { }

        class VerboseLogger extends LoggerBase { }

        class Logger extends LoggerBase { }

        @autoinject
        class App {
          constructor(@all(LoggerBase) public loggers) {
            this.loggers = loggers;
          }
        }

        const container = new Container();
        container.registerSingleton(LoggerBase, VerboseLogger);
        container.registerTransient(LoggerBase, Logger);
        const app = container.get(App);

        expect(app.loggers).toEqual(jasmine.any(Array));
        expect(app.loggers.length).toBe(2);
        expect(app.loggers[0]).toEqual(jasmine.any(VerboseLogger));
        expect(app.loggers[1]).toEqual(jasmine.any(Logger));
      });
    });

    describe('Optional', () => {
      it('injects the instance if its registered in the container', () => {
        class Logger { }

        class App {
          static inject() { return [Optional.of(Logger)]; }
          constructor(public logger: Logger) {
          }
        }

        const container = new Container();
        container.registerSingleton(Logger, Logger);
        const app = container.get(App);

        expect(app.logger).toEqual(jasmine.any(Logger));
      });

      it('injects the instance if its registered in the container using decorator', () => {
        class Logger { }

        @autoinject
        class App {
          constructor(@optional() public logger?: Logger) {
          }
        }
        const container = new Container();
        container.registerSingleton(Logger, Logger);
        const app = container.get(App);

        expect(app.logger).toEqual(jasmine.any(Logger));
      });

      it('injects null if key is not registered in the container', () => {
        class VerboseLogger { }
        class Logger { }

        class App {
          static inject() { return [Optional.of(Logger)]; }
          constructor(public logger: Logger) {
          }
        }

        const container = new Container();
        container.registerSingleton(VerboseLogger, Logger);
        const app = container.get(App);

        expect(app.logger).toBe(null);
      });

      it('injects null if key is not registered in the container using decorator', () => {
        class VerboseLogger { }
        class Logger { }

        @autoinject
        class App {
          constructor(@optional() public logger: Logger) {
          }
        }

        const container = new Container();
        container.registerSingleton(VerboseLogger, Logger);
        const app = container.get(App);

        expect(app.logger).toBe(null);
      });

      it('injects null if key nor function is registered in the container', () => {
        class VerboseLogger { }
        class Logger { }

        class App {
          static inject() { return [Optional.of(Logger)]; }
          constructor(public logger: Logger) {
          }
        }

        const container = new Container();
        const app = container.get(App);

        expect(app.logger).toBe(null);
      });

      it('doesn\'t check the parent container hierarchy when checkParent is false', () => {
        class Logger { }

        class App {
          static inject() { return [Optional.of(Logger, false)]; }
          constructor(public logger: Logger) {
          }
        }

        const parentContainer = new Container();
        parentContainer.registerSingleton(Logger, Logger);

        const childContainer = parentContainer.createChild();
        childContainer.registerSingleton(App, App);

        const app = childContainer.get(App);

        expect(app.logger).toBe(null);
      });

      it('doesn\'t check the parent container hierarchy when checkParent is false using decorator', () => {
        class Logger { }

        @autoinject
        class App {
          constructor(@optional(false) public logger: Logger) {
          }
        }
        const parentContainer = new Container();
        parentContainer.registerSingleton(Logger, Logger);

        const childContainer = parentContainer.createChild();
        childContainer.registerSingleton(App, App);

        const app = childContainer.get(App);

        expect(app.logger).toBe(null);
      });

      it('checks the parent container hierarchy when checkParent is true or default', () => {
        class Logger { }

        class App {
          static inject() { return [Optional.of(Logger)]; }
          constructor(public logger: Logger) {
          }
        }

        const parentContainer = new Container();
        parentContainer.registerSingleton(Logger, Logger);

        const childContainer = parentContainer.createChild();
        childContainer.registerSingleton(App, App);

        const app = childContainer.get(App);

        expect(app.logger).toEqual(jasmine.any(Logger));
      });

      it('checks the parent container hierarchy when checkParent is true or default using decorator', () => {
        class Logger { }

        @autoinject
        class App {
          constructor(@optional() public logger: Logger) {
          }
        }
        const parentContainer = new Container();
        parentContainer.registerSingleton(Logger, Logger);

        const childContainer = parentContainer.createChild();
        childContainer.registerSingleton(App, App);

        const app = childContainer.get(App);

        expect(app.logger).toEqual(jasmine.any(Logger));
      });
    });

    describe('Parent', () => {
      it('bypasses the current container and injects instance from parent container', () => {
        class Logger { }

        class App {
          static inject() { return [Parent.of(Logger)]; }
          constructor(public logger: Logger) {
          }
        }

        const parentContainer = new Container();
        const parentInstance = new Logger();
        parentContainer.registerInstance(Logger, parentInstance);

        const childContainer = parentContainer.createChild();
        const childInstance = new Logger();
        childContainer.registerInstance(Logger, childInstance);
        childContainer.registerSingleton(App, App);

        const app = childContainer.get(App);

        expect(app.logger).toBe(parentInstance);
      });

      it('bypasses the current container and injects instance from parent container using decorator', () => {
        class Logger { }

        @autoinject
        class App {
          constructor(@parent public logger: Logger) {
          }
        }
        const parentContainer = new Container();
        const parentInstance = new Logger();
        parentContainer.registerInstance(Logger, parentInstance);

        const childContainer = parentContainer.createChild();
        const childInstance = new Logger();
        childContainer.registerInstance(Logger, childInstance);
        childContainer.registerSingleton(App, App);

        const app = childContainer.get(App);

        expect(app.logger).toBe(parentInstance);
      });

      it('returns null when no parent container exists', () => {
        class Logger { }

        class App {
          static inject() { return [Parent.of(Logger)]; }
          constructor(public logger: Logger) {
          }
        }

        const container = new Container();
        const instance = new Logger();
        container.registerInstance(Logger, instance);

        const app = container.get(App);

        expect(app.logger).toBe(null);
      });

      it('returns null when no parent container exists using decorator', () => {
        class Logger { }

        @autoinject
        class App {
          constructor(@parent public logger: Logger) {
          }
        }

        const container = new Container();
        const instance = new Logger();
        container.registerInstance(Logger, instance);

        const app = container.get(App);

        expect(app.logger).toBe(null);
      });
    });

    describe('Factory', () => {
      let container;
      let app;
      let logger;
      let service;
      const data = 'test';

      class Logger { }

      class Service {
        static inject() { return [Factory.of(Logger)]; }
        constructor(public getLogger: Logger, public data) {
          this.getLogger = getLogger;
          this.data = data;
        }
      }

      class App {
        static inject() { return [Factory.of(Service)]; }
        public service: Service;
        constructor(public GetService) {
          this.GetService = GetService;
          this.service = new GetService(data);
        }
      }

      beforeEach(() => {
        container = new Container();
      });

      it('provides a function which, when called, will return the instance', () => {
        app = container.get(App);
        service = app.GetService;
        expect(service()).toEqual(jasmine.any(Service));
      });

      it('passes data in to the constructor as the second argument', () => {
        app = container.get(App);
        expect(app.service.data).toEqual(data);
      });
    });

    describe('Factory decorator', () => {
      let container;
      let app;
      let logger;
      let service;
      const data = 'test';

      class Logger { }

      @autoinject
      class Service {
        constructor(public getLogger: Logger, @factory(data) public data: string) {
          this.getLogger = getLogger;
          this.data = data;
        }
      }

      @autoinject
      class App {
        public service: any;
        constructor(@factory(Service) public GetService: { new(data): Service }) {
          this.GetService = GetService;
          this.service = new GetService(data);
        }
      }

      beforeEach(() => {
        container = new Container();
      });

      it('provides a function which, when called, will return the instance', () => {
        app = container.get(App);
        service = app.GetService;
        expect(service()).toEqual(jasmine.any(Service));
      });

      it('passes data in to the constructor as the second argument', () => {
        app = container.get(App);
        expect(app.service.data).toEqual(data);
      });
    });

    describe('NewInstance', () => {
      class Logger {
        constructor(public dep?) {
          this.dep = dep;
        }
      }

      class Dependency { }

      it('inject a new instance of a dependency, without regard for existing instances in the container', () => {
        class App1 {
          static inject() { return [NewInstance.of(Logger)]; }
          constructor(public logger: Logger) {
          }
        }

        const container = new Container();
        const logger = container.get(Logger);
        const app1 = container.get(App1);

        expect(app1.logger).toEqual(jasmine.any(Logger));
        expect(app1.logger).not.toBe(logger);
      });

      it('decorate to inject a new instance of a dependency', () => {
        @autoinject
        class App1 {
          constructor(@newInstance() public logger: Logger) {
          }
        }

        const container = new Container();
        const logger = container.get(Logger);
        const app1 = container.get(App1);

        expect(app1.logger).toEqual(jasmine.any(Logger));
        expect(app1.logger).not.toBe(logger);
      });

      it('decorate to inject a new instance of a dependency under a new key', () => {
        @autoinject
        class App1 {
          constructor(@newInstance('aKey') public logger: Logger) {
          }
        }

        const container = new Container();
        const logger = container.get<String, Logger>('akey');
        const app1 = container.get(App1);

        expect(app1.logger).toEqual(jasmine.any(Logger));
        expect(app1.logger).not.toEqual(logger);
      });

      it('inject a new instance of a dependency, with instance dynamic dependency', () => {
        class App1 {
          static inject() { return [NewInstance.of(Logger, Dependency)]; }
          constructor(public logger: Logger) {
          }
        }

        const container = new Container();
        const logger = container.get(Logger);
        const app1 = container.get(App1);

        expect(app1.logger).toEqual(jasmine.any(Logger));
        expect(app1.logger).not.toBe(logger);
        expect(app1.logger.dep).toEqual(jasmine.any(Dependency));
      });

      it('decorate to inject a new instance of a dependency, with instance dynamic dependency', () => {
        @autoinject
        class App1 {
          constructor(@newInstance(Logger, Dependency) public logger: Logger) {
          }
        }

        const container = new Container();
        const logger = container.get(Logger);
        const app1 = container.get(App1);

        expect(app1.logger).toEqual(jasmine.any(Logger));
        expect(app1.logger).not.toBe(logger);
        expect(app1.logger.dep).toEqual(jasmine.any(Dependency));
      });

      it('inject a new instance of a dependency, with resolver dynamic dependency', () => {
        class App1 {
          static inject() { return [NewInstance.of(Logger, Lazy.of(Dependency))]; }
          constructor(public logger: Logger) {
          }
        }

        const container = new Container();
        const logger = container.get(Logger);
        const app1 = container.get(App1);

        expect(app1.logger).toEqual(jasmine.any(Logger));
        expect(app1.logger).not.toBe(logger);
        expect(app1.logger.dep()).toEqual(jasmine.any(Dependency));
      });

      it('decorate to inject a new instance of a dependency, with resolver dynamic dependency', () => {
        class App1 {
          constructor(@newInstance(Logger, Lazy.of(Dependency)) public logger: Logger) {
          }
        }

        const container = new Container();
        const logger = container.get(Logger);
        const app1 = container.get(App1);

        expect(app1.logger).toEqual(jasmine.any(Logger));
        expect(app1.logger).not.toBe(logger);
        expect(app1.logger.dep()).toEqual(jasmine.any(Dependency));
      });
    });
  });

  describe('inheritance with parameter decorators', () => {
    class Dependency { }
    class LoggerBase {
      constructor(public dep?) {
        this.dep = dep;
      }
    }
    class VerboseLogger extends LoggerBase { }
    class Logger extends LoggerBase { }
    class Service { }
    class SubService1 { }
    class SubService2 { }

    @autoinject
    class ParentApp {
      constructor(@lazy(Logger) public logger: () => Logger) {
      }
    }

    @autoinject
    class ChildApp extends ParentApp {
      constructor(public service: Service, ...rest) {
        // @ts-ignore
        super(...rest);
        this.service = service;
      }
    }

    @autoinject
    class SubChildApp1 extends ChildApp {
      constructor(@lazy(SubService1) public subService1: () => SubService1, ...rest) {
        // @ts-ignore
        super(...rest);
        this.subService1 = subService1;
      }
    }

    @autoinject
    class SubChildApp2 extends ChildApp {
      constructor(@lazy(SubService2) public subService2: () => SubService2, @newInstance(Service) service: Service, ...rest) {
        // @ts-ignore
        super(service, ...rest);
        this.subService2 = subService2;
      }
    }

    class SubChildApp3 extends ChildApp {
    }

    @autoinject
    class SubChildApp4 extends ChildApp {
      constructor(public logger: () => Logger, public subService1: () => SubService1, public service: Service) {
        super(service, logger);
        this.subService1 = subService1;
      }
    }

    const container = new Container();

    const app1 = container.get(SubChildApp1);
    const app2 = container.get(SubChildApp2);
    const app3 = container.get(SubChildApp3);
    const app4 = container.get(SubChildApp4);

    it('loads dependencies in tree classes', function () {
      expect(app1.subService1()).toEqual(jasmine.any(SubService1));
      expect(app1.service).toEqual(jasmine.any(Service));
      expect(app1.logger()).toEqual(jasmine.any(Logger));
    });

    it('does not effect other child classes with different parameters', function () {
      const app2 = container.get(SubChildApp2);
      const service = container.get(Service);
      expect(app2.subService2()).toEqual(jasmine.any(SubService2));
      expect(app2.service).toEqual(jasmine.any(Service));
      expect(app2.service).not.toBe(service);
      expect(app2.logger()).toEqual(jasmine.any(Logger));
    });

    it('does inherit injection without own autoinject', function () {
      expect(app3.service).toEqual(jasmine.any(Service));
      expect(app3.logger()).toEqual(jasmine.any(Logger));
    });

    it('does allow a changed constructor parameter order', function () {
      expect(app4.subService1()).toEqual(jasmine.any(SubService1));
      expect(app4.service).toEqual(jasmine.any(Service));
      expect(app4.logger()).toEqual(jasmine.any(Logger));
    });
  });

  describe('autoinject', () => {
    it('allows multiple parameter decorators', () => {
      const data = 'test';
      class Dependency { }
      class LoggerBase {
        constructor(public dep?) {
          this.dep = dep;
        }
      }
      class VerboseLogger extends LoggerBase { }
      class Logger extends LoggerBase { }
      class Service { }

      @autoinject
      class MyService {
        constructor(@factory(Logger) public getLogger: { new(data): Logger }, public data) {
          this.getLogger = getLogger;
          this.data = data;
        }
      }

      @autoinject
      class App {
        public service: Service & { data: string };
        constructor(
          @lazy(Logger) public getLogger: () => Logger,
          @all(LoggerBase) public loggers: Logger[],
          @optional() public optionalLogger: Logger,
          @parent public parentLogger: Logger,
          @newInstance(Logger, Dependency) public newLogger: Logger,
          @factory(MyService) public GetService: { new(...args): Service & { data: string } },
          @inject(NewInstance.of(Logger)) public otherNewLogger: Logger) {
          this.getLogger = getLogger;
          this.loggers = loggers;
          this.optionalLogger = optionalLogger;
          this.parentLogger = parentLogger;
          this.newLogger = newLogger;
          this.GetService = GetService;
          this.service = new GetService(data);
          this.otherNewLogger = otherNewLogger;
        }
      }

      const parentContainer = new Container();
      const parentInstance = new Logger();
      parentContainer.registerInstance(Logger, parentInstance);

      const container = parentContainer.createChild();
      const childInstance = new Logger();
      container.registerSingleton(LoggerBase, VerboseLogger);
      container.registerTransient(LoggerBase, Logger);
      container.registerSingleton(Logger, Logger);
      container.registerInstance(Logger, childInstance);
      container.registerSingleton(App, App);

      const app = container.get(App);

      const logger = app.getLogger;
      expect(logger()).toEqual(jasmine.any(Logger));

      expect(app.loggers).toEqual(jasmine.any(Array));
      expect(app.loggers.length).toBe(2);
      expect(app.loggers[0]).toEqual(jasmine.any(VerboseLogger));
      expect(app.loggers[1]).toEqual(jasmine.any(Logger));

      expect(app.optionalLogger).toEqual(jasmine.any(Logger));

      expect(app.parentLogger).toBe(parentInstance);

      expect(app.newLogger).toEqual(jasmine.any(Logger));
      expect(app.newLogger).not.toBe(logger());
      expect(app.newLogger.dep).toEqual(jasmine.any(Dependency));

      const service = app.GetService;
      expect(service).toEqual(jasmine.any(MyService));
      expect(app.service.data).toEqual(data);

      expect(app.otherNewLogger).toEqual(jasmine.any(Logger));
      expect(app.otherNewLogger).not.toBe(logger());
      expect(app.otherNewLogger).not.toBe(app.newLogger);
    });
  });
});
