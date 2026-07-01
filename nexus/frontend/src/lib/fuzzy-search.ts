/**
 * Fuzzy Search Utility
 * Implements a simple but effective fuzzy matching algorithm
 * Perfect for searching products and customers with typos or partial matches
 */

export interface FuzzyMatch<T> {
  item: T;
  score: number;
}

/**
 * Calculate similarity score between search term and target string (0-1)
 * Uses a combination of:
 * - Character-by-character matching (position-aware)
 * - Word boundary matching (higher priority)
 * - Levenshtein-inspired distance with proximity rewards
 */
export function calculateFuzzyScore(searchTerm: string, target: string): number {
  if (!searchTerm || !target) return 0;

  const search = searchTerm.toLowerCase();
  const text = target.toLowerCase();

  // Exact match gets highest score
  if (text === search) return 1;
  if (text.includes(search)) return 0.95;

  // Word boundary match (search term matches start of a word)
  const words = text.split(/[\s\-_.]/);
  const wordBoundaryBonus = words.some((word) => word.startsWith(search)) ? 0.8 : 0;

  // Character-by-character matching with position awareness
  let matches = 0;
  let lastIndex = -1;
  let proximity = 0;

  for (let i = 0; i < search.length; i++) {
    const charIndex = text.indexOf(search[i], lastIndex + 1);
    if (charIndex === -1) {
      return Math.max(wordBoundaryBonus, matches / search.length * 0.5);
    }
    matches++;
    // Proximity bonus: consecutive characters get higher score
    if (charIndex === lastIndex + 1) {
      proximity += 0.1;
    }
    lastIndex = charIndex;
  }

  // Calculate final score
  const characterScore = matches / search.length; // 0-1: how many chars matched
  const proximityScore = proximity / search.length; // 0-1: how many were consecutive
  const positionScore = 1 - (lastIndex / text.length) * 0.2; // Earlier matches score higher

  const finalScore = characterScore * 0.6 + proximityScore * 0.2 + positionScore * 0.2;
  return Math.max(finalScore, wordBoundaryBonus);
}

/**
 * Fuzzy search for an array of items
 * @param items - Array of items to search through
 * @param searchTerm - The search query
 * @param searchFields - Array of field names to search (can be nested like "customer.name")
 * @param minScore - Minimum score to include in results (0-1, default 0.3)
 * @returns Sorted array of matches with scores
 */
export function fuzzySearch<T>(
  items: T[],
  searchTerm: string,
  searchFields: (keyof T)[],
  minScore = 0.3,
): FuzzyMatch<T>[] {
  if (!searchTerm.trim()) return items.map((item) => ({ item, score: 1 }));

  return items
    .map((item) => {
      const scores = searchFields.map((field) => {
        const value = String(item[field] || "");
        return calculateFuzzyScore(searchTerm, value);
      });
      const maxScore = Math.max(...scores);
      return { item, score: maxScore };
    })
    .filter((match) => match.score >= minScore)
    .sort((a, b) => b.score - a.score);
}

/**
 * Highlight matching characters in text
 * Useful for showing which parts matched the search
 */
export function highlightMatches(text: string, searchTerm: string): string {
  if (!searchTerm) return text;

  const search = searchTerm.toLowerCase();
  const textLower = text.toLowerCase();
  let result = "";
  let matched = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const isMatched = search.includes(textLower[i]);

    if (isMatched && !matched) {
      result += "<mark>";
      matched = true;
    } else if (!isMatched && matched) {
      result += "</mark>";
      matched = false;
    }
    result += char;
  }

  if (matched) result += "</mark>";
  return result;
}

/**
 * Multi-field fuzzy search with weighted scores
 * Useful when different fields have different importance
 */
export function fuzzySearchWeighted<T>(
  items: T[],
  searchTerm: string,
  fieldWeights: Record<keyof T, number>, // Weight 0-1 for each field
  minScore = 0.3,
): FuzzyMatch<T>[] {
  if (!searchTerm.trim()) return items.map((item) => ({ item, score: 1 }));

  return items
    .map((item) => {
      const totalWeight = Object.values(fieldWeights).reduce((a: number, b: any) => a + (typeof b === 'number' ? b : 0), 0);
      let weightedScore = 0;

      Object.entries(fieldWeights).forEach(([field, weight]) => {
        const value = String(item[field as keyof T] || "");
        const score = calculateFuzzyScore(searchTerm, value);
        weightedScore += score * (typeof weight === 'number' ? weight : 0);
      });

      const normalizedScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
      return { item, score: normalizedScore };
    })
    .filter((match) => match.score >= minScore)
    .sort((a, b) => b.score - a.score);
}

/**
 * Levenshtein distance for more accurate matching
 * Slower but more accurate for typo detection
 */
export function levenshteinDistance(a: string, b: string): number {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  const aLen = aLower.length;
  const bLen = bLower.length;

  if (aLen === 0) return bLen;
  if (bLen === 0) return aLen;

  const matrix: number[][] = Array(bLen + 1)
    .fill(null)
    .map(() => Array(aLen + 1).fill(0));

  for (let i = 0; i <= aLen; i++) matrix[0][i] = i;
  for (let j = 0; j <= bLen; j++) matrix[j][0] = j;

  for (let j = 1; j <= bLen; j++) {
    for (let i = 1; i <= aLen; i++) {
      const substitutionCost = aLower[i - 1] === bLower[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + substitutionCost, // substitution
      );
    }
  }

  return matrix[bLen][aLen];
}

/**
 * Convert Levenshtein distance to similarity score (0-1)
 */
export function levenshteinSimilarity(a: string, b: string): number {
  const distance = levenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  return 1 - distance / maxLen;
}

/**
 * Deduplicate search results
 * Useful when same item appears in results with different scores
 */
export function deduplicateResults<T>(
  results: FuzzyMatch<T>[],
  getKey: (item: T) => string,
): FuzzyMatch<T>[] {
  const seen = new Set<string>();
  return results.filter((match) => {
    const key = getKey(match.item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
