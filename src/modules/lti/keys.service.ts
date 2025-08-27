import { Injectable, OnModuleInit } from '@nestjs/common';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import * as jose from 'jose';

@Injectable()
export class KeysService implements OnModuleInit {
  private privateKey: string;
  private publicKey: string;
  private jwk: jose.JWK;

  async onModuleInit() {
    const privateKeyPath = resolve(__dirname, '../../../private.key');
    const publicKeyPath = resolve(__dirname, '../../../public.key');

    if (!existsSync(privateKeyPath) || !existsSync(publicKeyPath)) {
      await this.generateKeys(privateKeyPath, publicKeyPath);
    }

    this.privateKey = readFileSync(privateKeyPath, 'utf8');
    this.publicKey = readFileSync(publicKeyPath, 'utf8');
    this.jwk = JSON.parse(
      readFileSync(resolve(__dirname, '../../../public.json'), 'utf8'),
    ) as jose.JWK;
  }

  private async generateKeys(
    privateKeyPath: string,
    publicKeyPath: string,
  ): Promise<void> {
    const { publicKey, privateKey } = await jose.generateKeyPair('RS256');

    const spki = await jose.exportSPKI(publicKey);
    const pkcs8 = await jose.exportPKCS8(privateKey);
    const jwk = await jose.exportJWK(publicKey);

    writeFileSync(publicKeyPath, spki);
    writeFileSync(privateKeyPath, pkcs8);
    writeFileSync(
      resolve(__dirname, '../../../public.json'),
      JSON.stringify(jwk),
    );
  }

  public getJwks(): jose.JSONWebKeySet {
    return {
      keys: [
        {
          kid: this.jwk.kid,
          alg: this.jwk.alg,
          kty: this.jwk.kty,
          use: this.jwk.use,
          n: this.jwk.n,
          e: this.jwk.e,
        },
      ],
    };
  }

  public getPrivateKey(): string {
    return this.privateKey;
  }

  public getPublicKey(): string {
    return this.publicKey;
  }
}
