import { Container } from './container';
import { StrategyResolver } from './resolvers';

export type DependencyCtor<
  TBase,
  TImpl extends StringOrBase<TBase>,
  TArgs extends Array<any>
  > = new (...args: TArgs) => TImpl | TBase;

export type DependencyFunctor<
  TBase,
  TArgs extends Array<any>,
  TImpl extends StringOrBase<TBase> = StringOrBase<TBase>
  > = (...args: TArgs) => TImpl | TBase;

export type DependencyCtorOrFunctor<
  TBase,
  TArgs extends Array<any>,
  TImpl extends StringOrBase<TBase> = StringOrBase<TBase>
  > = DependencyCtor<TBase, TImpl, TArgs>
  | DependencyFunctor<TBase, TArgs, TImpl>;

export type StringOrDependencyCtor<
  TBase,
  TImpl extends StringOrBase<TBase>,
  TArgs extends Array<any>
  > = string | DependencyCtor<TBase, TImpl, TArgs>;

export type StringOrDependencyCtorOrFunctor<
  TBase,
  TArgs extends Array<any>,
  TImpl extends StringOrBase<TBase> = StringOrBase<TBase>
  > = DependencyCtor<TBase, TImpl, TArgs>
  | DependencyFunctor<TBase, TArgs, TImpl>
  | string;

export type StringOrBase<TBase> = TBase extends string ? any : TBase;
