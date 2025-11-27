const UNSAFE_TAGS = /<\/?(script|style|iframe|object|embed|form|input)[^>]*>/gi;

export function sanitizeCopy(input: string): string {
  return input.replace(UNSAFE_TAGS, "");
}
