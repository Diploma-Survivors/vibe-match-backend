/**
 * Language ID constants for Judge0 supported languages
 * @see https://ce.judge0.com/languages
 */
export const LANGUAGE_IDS = {
  MULTI_FILE_PROGRAM: 89,
} as const;

/**
 * Type representing valid language IDs
 */
export type LanguageId = (typeof LANGUAGE_IDS)[keyof typeof LANGUAGE_IDS];

/**
 * Check if a language ID represents a multi-file program
 * @param languageId - The language ID to check
 * @returns True if the language requires multi-file handling
 */
export function isMultiFileProgram(languageId: number): boolean {
  return languageId === LANGUAGE_IDS.MULTI_FILE_PROGRAM;
}
