import type { CodeblockPaginator, CodeblockPaginatorItem } from './CodeblockPaginator';
import type { EmbedPaginator, EmbedPaginatorItem } from './EmbedPaginator';
import type { Paginator, PaginatorItem } from './Paginator';

export type AnyPaginator<T> = Paginator<PaginatorItem<T>> | CodeblockPaginator<T> | EmbedPaginator<T>;
export type AnyPaginatorItem<T> = PaginatorItem<T> | CodeblockPaginatorItem<T> | EmbedPaginatorItem<T>;
