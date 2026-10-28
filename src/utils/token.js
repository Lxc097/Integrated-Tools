export function estimateTokens(text) {
  const value = typeof text === 'string' ? text : '';
  return Math.max(0, Math.ceil(value.trim().length / 3.6));
}
