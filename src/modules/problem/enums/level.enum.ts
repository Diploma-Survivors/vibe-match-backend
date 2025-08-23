export enum Level {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export const LevelLabel: Record<Level, string> = {
  [Level.EASY]: 'Dễ',
  [Level.MEDIUM]: 'Trung bình',
  [Level.HARD]: 'Khó',
};
