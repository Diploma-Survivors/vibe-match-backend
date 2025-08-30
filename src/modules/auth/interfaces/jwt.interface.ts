export interface JwtPayload {
  userId: number;
  roles: string[];
  sub: string;
  iss: string;
}
