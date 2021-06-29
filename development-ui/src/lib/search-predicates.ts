export function objectIncludesSearchterm(
  object: Record<string, any>,
  searchTerm: string
): boolean {
  return JSON.stringify(object)
    .toLowerCase()
    .includes(searchTerm.toLowerCase());
}
