// tslint:disable-next-line:no-reference
/// <reference path="./internal" />
import { metadata } from 'aurelia-metadata';
import { AggregateError } from 'aurelia-pal';
import { resolver, StrategyResolver, Resolver, Strategy } from './resolvers';
import { Invoker } from './invokers';
import {
  DependencyCtorOrFunctor,
  DependencyCtor,
  StringOrDependencyCtor,
  StringOrBase,
  StringOrDependencyCtorOrFunctor
} from './types';

function validateKey(key: any) {
  if (key === null || key === undefined) {
    throw new Error(
      'key/value cannot be null or undefined. Are you trying to inject/register something that doesn\'t exist with DI?'
    );
  }
}
export const _emptyParameters = Object.freeze([]) as [];

metadata.registration = 'aurelia:registration';
metadata.invoker = 'aurelia:invoker';

const resolverDecorates = resolver.decorates;

/**
 * Stores the information needed to invoke a function.
 */
export class InvocationHandler<
  TBase,
  TArgs extends Array<any>,
  TImpl extends StringOrBase<TBase>
  > {
  /**
   * The function to be invoked by this handler.
   */
  public fn: DependencyCtorOrFunctor<TBase, TArgs, TImpl>;

  /**
   * The invoker implementation that will be used to actually invoke the function.
   */
  public invoker: Invoker<TBase, TArgs, TImpl>;

  /**
   * The statically known dependencies of this function invocation.
   */
  public dependencies: TArgs;

  /**
   * Instantiates an InvocationDescription.
   * @param fn The Function described by this description object.
   * @param invoker The strategy for invoking the function.
   * @param dependencies The static dependencies of the function call.
   */
  constructor(
    fn: DependencyCtorOrFunctor<TBase, TArgs, TImpl>,
    invoker: Invoker<TBase, TArgs, TImpl>,
    dependencies: TArgs
  ) {
    this.fn = fn;
    this.invoker = invoker;
    this.dependencies = dependencies;
  }

  /**
   * Invokes the function.
   * @param container The calling container.
   * @param dynamicDependencies Additional dependencies to use during invocation.
   * @return The result of the function invocation.
   */
  public invoke(container: Container, dynamicDependencies?: any[]): any {
    return dynamicDependencies !== undefined
      ? this.invoker.invokeWithDynamicDependencies(
        container,
        this.fn,
        this.dependencies,
        dynamicDependencies
      )
      : this.invoker.invoke(container, this.fn, this.dependencies);
  }
}

/**
 * Used to configure a Container instance.
 */
export interface ContainerConfiguration {
  /**
   * An optional callback which will be called when any function needs an
   * InvocationHandler created (called once per Function).
   */
  onHandlerCreated?: (
    handler: InvocationHandler<any, any, any>
  ) => InvocationHandler<any, any, any>;

  handlers?: Map<any, any>;
}

function invokeWithDynamicDependencies<
  TBase,
  TArgs extends Array<any>,
  TImpl extends StringOrBase<TBase>
>(
  container: Container,
  fn: DependencyCtorOrFunctor<TBase, TArgs, TImpl>,
  staticDependencies: TArgs[number][],
  dynamicDependencies: TArgs[number][]
) {
  let i = staticDependencies.length;
  let args = new Array(i);
  let lookup;

  while (i--) {
    lookup = staticDependencies[i];

    if (lookup === null || lookup === undefined) {
      throw new Error(
        'Constructor Parameter with index ' +
        i +
        ' cannot be null or undefined. Are you trying to inject/register something that doesn\'t exist with DI?'
      );
    } else {
      args[i] = container.get(lookup);
    }
  }

  if (dynamicDependencies !== undefined) {
    args = args.concat(dynamicDependencies);
  }

  return Reflect.construct(fn, args);
}

const classInvoker: Invoker<any, any, any> = {
  invoke(container, Type: DependencyCtor<any, any, any>, deps) {
    const instances = deps.map((dep) => container.get(dep));
    const inst = Object.create(Type.prototype);
    Type.apply(inst, instances);
    return inst;
  },
  invokeWithDynamicDependencies
};
const fallbackInvoker: Invoker<any, any, any> = {
  invoke: invokeWithDynamicDependencies as any,
  invokeWithDynamicDependencies
};

function getDependencies(f) {
  if (!f.hasOwnProperty('inject')) {
    return [];
  }

  if (typeof f.inject === 'function') {
    return f.inject();
  }

  return f.inject;
}

/**
 * A lightweight, extensible dependency injection container.
 */
export class Container {
  /**
   * The global root Container instance. Available if makeGlobal() has been
   * called. Aurelia Framework calls makeGlobal().
   */
  public static instance: Container;

  /**
   * The parent container in the DI hierarchy.
   */
  public parent: Container;

  /**
   * The root container in the DI hierarchy.
   */
  public root: Container;

  /** @internal */
  public _configuration: ContainerConfiguration;

  /** @internal */
  public _onHandlerCreated: (
    handler: InvocationHandler<any, any, any>
  ) => InvocationHandler<any, any, any>;

  /** @internal */
  public _handlers: Map<any, any>;

  /** @internal */
  public _resolvers: Map<any, any>;

  /**
   * Creates an instance of Container.
   * @param configuration Provides some configuration for the new Container instance.
   */
  constructor(configuration?: ContainerConfiguration) {
    if (configuration === undefined) {
      configuration = {};
    }

    this._configuration = configuration;
    this._onHandlerCreated = configuration.onHandlerCreated;
    this._handlers =
      configuration.handlers || (configuration.handlers = new Map());
    this._resolvers = new Map();
    this.root = this;
    this.parent = null;
  }

  /**
   * Makes this container instance globally reachable through Container.instance.
   */
  public makeGlobal(): Container {
    Container.instance = this;
    return this;
  }

  /**
   * Sets an invocation handler creation callback that will be called when new
   * InvocationsHandlers are created (called once per Function).
   * @param onHandlerCreated The callback to be called when an
   * InvocationsHandler is created.
   */
  public setHandlerCreatedCallback<TBase, TArgs extends Array<any>, TImpl extends StringOrBase<TBase>>(
    onHandlerCreated: (
      handler: InvocationHandler<TBase, TArgs, TImpl>
    ) => InvocationHandler<TBase, TArgs, TImpl>
  ) {
    this._onHandlerCreated = onHandlerCreated;
    this._configuration.onHandlerCreated = onHandlerCreated;
  }

  /**
   * Registers an existing object instance with the container.
   * @param key The key that identifies the dependency at resolution time;
   * usually a constructor function.
   * @param instance The instance that will be resolved when the key is matched.
   * This defaults to the key value when instance is not supplied.
   * @return The resolver that was registered.
   */
  public registerInstance(key: any, instance?: any): Resolver {
    return this.registerResolver(
      key,
      new StrategyResolver(0, instance === undefined ? key : instance)
    );
  }

  /**
   * Registers a type (constructor function) such that the container always
   * returns the same instance for each request.
   * @param key The key that identifies the dependency at resolution time;
   * usually a constructor function.
   * @param fn The constructor function to use when the dependency needs to be
   * instantiated. This defaults to the key value when fn is not supplied.
   * @return The resolver that was registered.
   */
  public registerSingleton<TBase, TArgs extends Array<any>, TImpl extends StringOrBase<TBase>>(
    key: any, fn?: DependencyCtorOrFunctor<TBase, TArgs, TImpl>): Resolver {
    return this.registerResolver(
      key,
      new StrategyResolver(1, fn === undefined ? key : fn)
    );
  }

  /**
   * Registers a type (constructor function) such that the container returns a
   * new instance for each request.
   * @param key The key that identifies the dependency at resolution time;
   * usually a constructor function.
   * @param fn The constructor function to use when the dependency needs to be
   * instantiated. This defaults to the key value when fn is not supplied.
   * @return The resolver that was registered.
   */
  public registerTransient<TBase, TArgs extends Array<any>, TImpl extends StringOrBase<TBase>>(
    key: string, fn: DependencyCtorOrFunctor<TBase, TArgs, TImpl>): Resolver;
  public registerTransient<TBase, TArgs extends Array<any>, TImpl extends StringOrBase<TBase>>(
    key: DependencyCtor<TBase, TImpl, TArgs>, fn?: DependencyCtorOrFunctor<TBase, TArgs, TImpl>): Resolver;
  public registerTransient<TBase, TArgs extends Array<any>, TImpl extends StringOrBase<TBase>>(
    key: StringOrDependencyCtor<TBase, TImpl, TArgs>, fn?: DependencyCtorOrFunctor<TBase, TArgs, TImpl>): Resolver {
    return this.registerResolver(
      key,
      new StrategyResolver(2, fn === undefined ? key as DependencyCtor<TBase, TImpl, TArgs> : fn)
    );
  }

  /**
   * Registers a custom resolution function such that the container calls this
   * function for each request to obtain the instance.
   * @param key The key that identifies the dependency at resolution time;
   * usually a constructor function.
   * @param handler The resolution function to use when the dependency is
   * needed.
   * @return The resolver that was registered.
   */
  public registerHandler<TBase, TImpl extends StringOrBase<TBase>, TArgs extends Array<any>>(
    key: StringOrDependencyCtor<TBase, TImpl, TArgs>,
    handler: (container?: Container, key?: StringOrDependencyCtor<TBase, TImpl, TArgs>, resolver?: Resolver) => any
  ): Resolver {
    return this.registerResolver(
      key,
      new StrategyResolver<TBase, TImpl, TArgs, Strategy.function>(Strategy.function, handler)
    );
  }

  /**
   * Registers an additional key that serves as an alias to the original DI key.
   * @param originalKey The key that originally identified the dependency; usually a constructor function.
   * @param aliasKey An alternate key which can also be used to resolve the same dependency  as the original.
   * @return The resolver that was registered.
   */
  public registerAlias<TBase, TImpl extends StringOrBase<TBase>, TArgs extends Array<any>>(
    originalKey: StringOrDependencyCtor<TBase, TImpl, TArgs>,
    aliasKey: StringOrDependencyCtor<TBase, TImpl, TArgs>): Resolver {
    return this.registerResolver(
      aliasKey,
      new StrategyResolver(5, originalKey)
    );
  }

  /**
   * Registers a custom resolution function such that the container calls this
   * function for each request to obtain the instance.
   * @param key The key that identifies the dependency at resolution time;
   * usually a constructor function.
   * @param resolver The resolver to use when the dependency is needed.
   * @return The resolver that was registered.
   */
  public registerResolver<TBase, TImpl extends StringOrBase<TBase>, TArgs extends Array<any>>(
    key: StringOrDependencyCtor<TBase, TImpl, TArgs>,
    resolver: Resolver
  ): Resolver {
    validateKey(key);

    const allResolvers = this._resolvers;
    const result = allResolvers.get(key);

    if (result === undefined) {
      allResolvers.set(key, resolver);
    } else if (result.strategy === 4) {
      result.state.push(resolver);
    } else {
      allResolvers.set(key, new StrategyResolver(4, [result, resolver]));
    }

    return resolver;
  }

  /**
   * Registers a type (constructor function) by inspecting its registration
   * annotations. If none are found, then the default singleton registration is
   * used.
   * @param key The key that identifies the dependency at resolution time;
   * usually a constructor function.
   * @param fn The constructor function to use when the dependency needs to be
   * instantiated. This defaults to the key value when fn is not supplied.
   */
  public autoRegister<TBase, TArgs extends Array<any>, TImpl extends StringOrBase<TBase>>(
    key: string, fn: DependencyCtorOrFunctor<TBase, TArgs, TImpl>): Resolver;
  public autoRegister<TBase, TArgs extends Array<any>, TImpl extends StringOrBase<TBase>>(
    key: DependencyCtor<TBase, TImpl, TArgs>, fn?: DependencyCtorOrFunctor<TBase, TArgs, TImpl>): Resolver;
  public autoRegister<TBase, TArgs extends Array<any>, TImpl extends StringOrBase<TBase>>(
    key: StringOrDependencyCtor<TBase, TImpl, TArgs>, fn?: DependencyCtorOrFunctor<TBase, TArgs, TImpl>): Resolver {
    fn = fn === undefined ? key as DependencyCtor<TBase, TImpl, TArgs> : fn;

    if (typeof fn === 'function') {
      const registration = metadata.get(metadata.registration, fn);

      if (registration === undefined) {
        return this.registerResolver(key, new StrategyResolver(1, fn));
      }

      return registration.registerResolver(this, key, fn);
    }

    return this.registerResolver(key, new StrategyResolver(0, fn));
  }

  /**
   * Registers an array of types (constructor functions) by inspecting their
   * registration annotations. If none are found, then the default singleton
   * registration is used.
   * @param fns The constructor function to use when the dependency needs to be instantiated.
   */
  public autoRegisterAll(fns: DependencyCtor<any, any, any>[]): void {
    let i = fns.length;
    while (i--) {
      this.autoRegister<any, any, any>(fns[i]);
    }
  }

  /**
   * Unregisters based on key.
   * @param key The key that identifies the dependency at resolution time; usually a constructor function.
   */
  public unregister(key: any): void {
    this._resolvers.delete(key);
  }

  /**
   * Inspects the container to determine if a particular key has been registred.
   * @param key The key that identifies the dependency at resolution time; usually a constructor function.
   * @param checkParent Indicates whether or not to check the parent container hierarchy.
   * @return Returns true if the key has been registred; false otherwise.
   */
  public hasResolver<TBase, TImpl extends StringOrBase<TBase>, TArgs extends Array<any>>(
    key: StringOrDependencyCtor<TBase, TImpl, TArgs>, checkParent: boolean = false): boolean {
    validateKey(key);

    return (
      this._resolvers.has(key) ||
      (checkParent &&
        this.parent !== null &&
        this.parent.hasResolver(key, checkParent))
    );
  }

  /**
   * Gets the resolver for the particular key, if it has been registered.
   * @param key The key that identifies the dependency at resolution time; usually a constructor function.
   * @return Returns the resolver, if registred, otherwise undefined.
   */
  public getResolver<TBase, TImpl extends StringOrBase<TBase>, TArgs extends Array<any>>(
    key: StringOrDependencyCtorOrFunctor<TBase, TArgs, TImpl>) {
    return this._resolvers.get(key);
  }

  /**
   * Resolves a single instance based on the provided key.
   * @param key The key that identifies the object to resolve.
   * @return Returns the resolved instance.
   */
  public get<TBase, TImpl extends StringOrBase<TBase>, TArgs extends Array<any> = Array<any>>(
    key: StringOrDependencyCtor<TBase, TImpl, TArgs>): TImpl;
  public get<TBase, TImpl extends StringOrBase<TBase>, TArgs extends Array<any> = Array<any>>(
    key: typeof Container): Container;
  public get<TBase, TImpl extends StringOrBase<TBase>, TArgs extends Array<any> = Array<any>>(
    key: StringOrDependencyCtor<TBase, TImpl, TArgs> | typeof Container): TImpl | Container {
    validateKey(key);

    if (key === Container) {
      return this;
    }

    if (resolverDecorates(key)) {
      return key.get(this, key);
    }

    const resolver = this._resolvers.get(key);

    if (resolver === undefined) {
      if (this.parent === null) {
        return this.autoRegister(key as DependencyCtor<TBase, TImpl, TArgs>).get(this, key);
      }

      const registration = metadata.get(metadata.registration, key);

      if (registration === undefined) {
        return this.parent._get(key);
      }

      return registration.registerResolver(
        this, key, key as DependencyCtorOrFunctor<TBase, TArgs, TImpl>).get(this, key);
    }

    return resolver.get(this, key);
  }

  public _get(key) {
    const resolver = this._resolvers.get(key);

    if (resolver === undefined) {
      if (this.parent === null) {
        return this.autoRegister(key).get(this, key);
      }

      return this.parent._get(key);
    }

    return resolver.get(this, key);
  }

  /**
   * Resolves all instance registered under the provided key.
   * @param key The key that identifies the objects to resolve.
   * @return Returns an array of the resolved instances.
   */
  public getAll<TBase, TArgs extends Array<any>, TImpl extends StringOrBase<TBase>>(
    key: StringOrDependencyCtor<TBase, TImpl, TArgs>): TImpl[] {
    validateKey(key);

    const resolver = this._resolvers.get(key);

    if (resolver === undefined) {
      if (this.parent === null) {
        return _emptyParameters;
      }

      return this.parent.getAll(key);
    }

    if (resolver.strategy === 4) {
      const state = resolver.state;
      let i = state.length;
      const results = new Array(i);

      while (i--) {
        results[i] = state[i].get(this, key);
      }

      return results;
    }

    return [resolver.get(this, key)];
  }

  /**
   * Creates a new dependency injection container whose parent is the current container.
   * @return Returns a new container instance parented to this.
   */
  public createChild(): Container {
    const child = new Container(this._configuration);
    child.root = this.root;
    child.parent = this;
    return child;
  }

  /**
   * Invokes a function, recursively resolving its dependencies.
   * @param fn The function to invoke with the auto-resolved dependencies.
   * @param dynamicDependencies Additional function dependencies to use during invocation.
   * @return Returns the instance resulting from calling the function.
   */
  public invoke<TBase, TArgs extends Array<any>, TImpl extends StringOrBase<TBase>>(
    fn: DependencyCtorOrFunctor<TBase, TArgs, TImpl>,
    dynamicDependencies?: TArgs[number][]
  ): TImpl {
    try {
      let handler = this._handlers.get(fn);

      if (handler === undefined) {
        handler = this._createInvocationHandler(fn);
        this._handlers.set(fn, handler);
      }

      return handler.invoke(this, dynamicDependencies);
    } catch (e) {
      // @ts-ignore
      throw new AggregateError(
        `Error invoking ${fn.name}. Check the inner error for details.`,
        e,
        true
      );
    }
  }

  public _createInvocationHandler<TBase, TArgs extends Array<any>, TImpl extends StringOrBase<TBase>>(
    fn: DependencyCtorOrFunctor<TBase, TArgs, TImpl> & {
      inject?: any;
    }
  ): InvocationHandler<TBase, TArgs, TImpl> {
    let dependencies;

    if (fn.inject === undefined) {
      dependencies =
        metadata.getOwn(metadata.paramTypes, fn) || _emptyParameters;
    } else {
      dependencies = [];
      let ctor = fn;
      while (typeof ctor === 'function') {
        dependencies.push(...getDependencies(ctor));
        ctor = Object.getPrototypeOf(ctor);
      }
    }

    const invoker = metadata.getOwn(metadata.invoker, fn) ||
    ((dependencies.length > 5) ? classInvoker : fallbackInvoker);

    const handler = new InvocationHandler(fn, invoker, dependencies);
    return this._onHandlerCreated !== undefined
      ? this._onHandlerCreated(handler)
      : handler;
  }
}
