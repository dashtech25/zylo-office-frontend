export interface PageMeta {
  total: number;
  limit: number;
  offset: number;
}

export interface Page<T> {
  data: T[];
  meta: PageMeta;
}
