import { AnyComponentContext } from '../contexts/AnyComponentContext';
import { ButtonContext } from '../contexts/ButtonContext';
import { SelectContext } from '../contexts/SelectContext';

export type ComponentHandler = (ctx: AnyComponentContext) => Promise<unknown>;

export type ButtonHandler = (ctx: ButtonContext) => Promise<unknown>;
export type SelectHandler = (ctx: SelectContext) => Promise<unknown>;

