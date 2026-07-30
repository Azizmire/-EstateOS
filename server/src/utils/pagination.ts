export function parsePagination(query: Record<string, unknown>) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(200, Math.max(1, Number(query.pageSize) || 100));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function paginationResult(itemCount: number, page: number, pageSize: number) {
  return { page, pageSize, hasMore: itemCount === pageSize };
}
