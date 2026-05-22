export function extractMentions(value: string) {
  return Array.from(new Set(value.match(/@([a-zA-Z0-9_]{3,30})/g)?.map((mention) => mention.slice(1).toLowerCase()) ?? []));
}
