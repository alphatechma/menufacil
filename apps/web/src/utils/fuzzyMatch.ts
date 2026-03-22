/**
 * Fuzzy match: checks if all characters in `query` appear in order in `target` (subsequence matching).
 * Returns match status, a score, and ranges for highlighting.
 *
 * Scoring:
 * - Consecutive character matches get bonus points
 * - Matches at the start of the string score higher
 * - Earlier matches score higher than later ones
 */
export function fuzzyMatch(
  query: string,
  target: string,
): { match: boolean; score: number; ranges: [number, number][] } {
  if (!query) return { match: true, score: 0, ranges: [] };

  const lowerQuery = query.toLowerCase();
  const lowerTarget = target.toLowerCase();

  // Fast path: exact substring match
  const exactIndex = lowerTarget.indexOf(lowerQuery);
  if (exactIndex !== -1) {
    const score = 100 - exactIndex + lowerQuery.length * 10;
    return {
      match: true,
      score,
      ranges: [[exactIndex, exactIndex + lowerQuery.length - 1]],
    };
  }

  // Subsequence matching
  let queryIdx = 0;
  let score = 0;
  const ranges: [number, number][] = [];
  let rangeStart = -1;
  let prevMatchIdx = -2; // Track consecutive matches
  let consecutiveBonus = 0;

  for (let i = 0; i < lowerTarget.length && queryIdx < lowerQuery.length; i++) {
    if (lowerTarget[i] === lowerQuery[queryIdx]) {
      // Start of match or continuation
      if (prevMatchIdx === i - 1) {
        // Consecutive match
        consecutiveBonus += 5;
      } else {
        // New match segment - close previous range if open
        if (rangeStart !== -1) {
          ranges.push([rangeStart, prevMatchIdx]);
        }
        rangeStart = i;
        consecutiveBonus = 0;
      }

      // Earlier positions score higher
      score += 10 - Math.min(i, 9) + consecutiveBonus;

      // First character match bonus
      if (i === 0) score += 15;

      // Word boundary bonus (after space, hyphen, underscore)
      if (i > 0 && /[\s\-_]/.test(lowerTarget[i - 1])) {
        score += 10;
      }

      prevMatchIdx = i;
      queryIdx++;
    }
  }

  // Close last range
  if (rangeStart !== -1 && queryIdx > 0) {
    ranges.push([rangeStart, prevMatchIdx]);
  }

  const matched = queryIdx === lowerQuery.length;

  return {
    match: matched,
    score: matched ? score : 0,
    ranges: matched ? ranges : [],
  };
}
