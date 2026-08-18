export function getVisiblePageNumbers(totalPages, currentPage) {
  const pageCount = Math.max(1, Number(totalPages) || 1);
  const activePage = Math.min(Math.max(1, Number(currentPage) || 1), pageCount);

  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  if (activePage <= 4) {
    return [1, 2, 3, 4, 5, 'right-ellipsis', pageCount];
  }

  if (activePage >= pageCount - 3) {
    return [1, 'left-ellipsis', pageCount - 4, pageCount - 3, pageCount - 2, pageCount - 1, pageCount];
  }

  return [
    1,
    'left-ellipsis',
    activePage - 1,
    activePage,
    activePage + 1,
    'right-ellipsis',
    pageCount,
  ];
}
