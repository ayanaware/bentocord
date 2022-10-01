import type { CodeblockPaginator, CodeblockPaginatorItem } from './CodeblockPaginator';
import type { EmbedPaginator, EmbedPaginatorItem } from './EmbedPaginator';

export type AnyPaginator<T = void> = CodeblockPaginator<T> | EmbedPaginator<T>;
export type AnyPaginatorItem<T = void> = CodeblockPaginatorItem<T> | EmbedPaginatorItem<T>;
