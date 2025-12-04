import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'fs';
import * as jose from 'jose';
import { LtiDeepLinkingJwtPayloadDto } from './dto/lti-deep-linking-response.dto';
import { KeysService } from './keys.service';

jest.mock('fs');
jest.mock('jose');

describe('KeysService', () => {
  let service: KeysService;

  const mockPrivateKey = 'private_key';
  const mockPublicKey = 'public_key';
  const mockJwk: jose.JWK = {
    kid: 'kid',
    alg: 'RS256',
    kty: 'RSA',
    use: 'sig',
    n: 'n',
    e: 'e',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KeysService],
    }).compile();

    service = module.get<KeysService>(KeysService);

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockImplementation((path: string) => {
      if (path.endsWith('private.key')) {
        return mockPrivateKey;
      }
      if (path.endsWith('public.key')) {
        return mockPublicKey;
      }
      if (path.endsWith('public.json')) {
        return JSON.stringify(mockJwk);
      }
      return '';
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should load keys if they exist', async () => {
      await service.onModuleInit();
      expect(fs.readFileSync).toHaveBeenCalledTimes(3);
      expect(service.getPrivateKey()).toBe(mockPrivateKey);
      expect(service.getPublicKey()).toBe(mockPublicKey);
    });

    it('should generate and save keys if they do not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      const generateKeyPairMock = jest
        .spyOn(jose, 'generateKeyPair')
        .mockResolvedValue({
          publicKey: {} as CryptoKey,
          privateKey: {} as CryptoKey,
        });
      const exportSpkiMock = jest
        .spyOn(jose, 'exportSPKI')
        .mockResolvedValue(mockPublicKey);
      const exportPkcs8Mock = jest
        .spyOn(jose, 'exportPKCS8')
        .mockResolvedValue(mockPrivateKey);
      const exportJwkMock = jest
        .spyOn(jose, 'exportJWK')
        .mockResolvedValue(mockJwk);

      const writeFileSyncMock = (fs.writeFileSync as jest.Mock).mockClear();

      await service.onModuleInit();

      expect(generateKeyPairMock).toHaveBeenCalledWith('RS256', {
        extractable: true,
      });
      expect(exportSpkiMock).toHaveBeenCalled();
      expect(exportPkcs8Mock).toHaveBeenCalled();
      expect(exportJwkMock).toHaveBeenCalled();
      expect(writeFileSyncMock).toHaveBeenCalledTimes(3);
    });
  });

  describe('getJwks', () => {
    it('should return jwks', async () => {
      await service.onModuleInit();
      const jwks = service.getJwks();
      expect(jwks).toEqual({
        keys: [
          {
            kid: mockJwk.kid,
            alg: mockJwk.alg,
            kty: mockJwk.kty,
            use: mockJwk.use,
            n: mockJwk.n,
            e: mockJwk.e,
          },
        ],
      });
    });
  });

  describe('getPrivateKey', () => {
    it('should return private key', async () => {
      await service.onModuleInit();
      const privateKey = service.getPrivateKey();
      expect(privateKey).toBe(mockPrivateKey);
    });
  });

  describe('getPublicKey', () => {
    it('should return public key', async () => {
      await service.onModuleInit();
      const publicKey = service.getPublicKey();
      expect(publicKey).toBe(mockPublicKey);
    });
  });

  describe('generateDeepLinkingJwt', () => {
    it('should generate a deep linking jwt', async () => {
      await service.onModuleInit();
      const params = new LtiDeepLinkingJwtPayloadDto({});
      const mockJwt = 'mock_jwt';

      const mockPrivateKeyObject = {} as CryptoKey;
      const importPKCS8Mock = jest
        .spyOn(jose, 'importPKCS8')
        .mockResolvedValue(mockPrivateKeyObject);

      const signMock = jest.fn().mockResolvedValue(mockJwt);
      const setProtectedHeaderMock = jest
        .fn()
        .mockReturnValue({ sign: signMock });

      // Mock the constructor of SignJWT
      const signJwtMock = jest.spyOn(jose, 'SignJWT').mockImplementation(
        () =>
          ({
            setProtectedHeader: setProtectedHeaderMock,
          }) as unknown as jose.SignJWT,
      );

      const jwt = await service.generateDeepLinkingJwt(params);

      expect(importPKCS8Mock).toHaveBeenCalledWith(mockPrivateKey, 'RS256');
      expect(signJwtMock).toHaveBeenCalled();
      expect(setProtectedHeaderMock).toHaveBeenCalledWith({
        alg: 'RS256',
        kid: mockJwk.kid,
      });
      expect(signMock).toHaveBeenCalledWith(mockPrivateKeyObject);
      expect(jwt).toBe(mockJwt);
    });
  });
});
