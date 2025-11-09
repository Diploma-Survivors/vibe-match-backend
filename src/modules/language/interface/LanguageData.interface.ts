/**
 * @description Interface representing language data
 * @see https://ce.judge0.com/#statuses-and-languages-active-and-archived-languages-get
 */
export interface LanguageData {
  id: number;
  name: string;
  is_archived?: boolean;
}
