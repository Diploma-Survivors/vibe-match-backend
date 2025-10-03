export function encodeCursor(data: any): string {
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

export function decodeCursor(cursor: string): any {
  return JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
}
