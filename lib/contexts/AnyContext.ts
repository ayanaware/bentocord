import type { BaseContext } from './BaseContext';
import type { InteractionContext } from './InteractionContext';
import type { MessageContext } from './MessageContext';

export type AnyContext = BaseContext | MessageContext | InteractionContext;
