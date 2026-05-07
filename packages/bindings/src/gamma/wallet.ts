import { z } from 'zod';

export enum WalletType {
  EOA = 0,
  POLY_PROXY = 1,
  GNOSIS_SAFE = 2,
  DEPOSIT_WALLET = 3,
}

export const WalletTypeSchema = z.object({
  type: z.enum(WalletType),
  typeName: z.enum(['EOA', 'POLY_PROXY', 'GNOSIS_SAFE', 'DEPOSIT_WALLET']),
});
