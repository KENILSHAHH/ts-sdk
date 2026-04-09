import { WalletType } from '@polymarket/bindings/gamma';
import { describe, expect, it } from 'vitest';
import { publicClient } from '../testing';
import { fetchWalletType } from './wallets';

const TEST_USER = '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b';

describe('Wallets', () => {
  describe('fetchWalletType', () => {
    it('fetches the wallet type for an address and signer pair', async () => {
      const result = await fetchWalletType(publicClient, {
        address: TEST_USER,
        signer: TEST_USER,
      });

      expect(result).toBe(WalletType.EOA);
    });
  });
});
