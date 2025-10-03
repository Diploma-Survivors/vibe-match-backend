export interface CursorPaginated<T> {
  edges: {
    node: T;
    cursor: string;
  }[];
  pageInfos: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
  };
  totalCount: number;
}
