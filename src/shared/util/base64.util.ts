export class Base64Util {
  static encodeBase64(data: string): string {
    return Buffer.from(data).toString('base64');
  }

  static decodeBase64(data?: string): string | undefined {
    if (!data) return undefined;
    return Buffer.from(data, 'base64').toString('utf-8');
  }
}
