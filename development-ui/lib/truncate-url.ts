export function truncateUrl(url: string) {
  return new URL(url).pathname;
}
