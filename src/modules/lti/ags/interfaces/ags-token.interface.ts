export interface AgsAccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export interface AgsTokenCache {
  token: string;
  expiresAt: number;
}

