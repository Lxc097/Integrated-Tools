export function estimateTokens(text) {
  return Math.max(0, Math.ceil(text.trim().length / 3.6));
}
