import { z } from 'zod';

export enum WalletType {
  EOA = 0,
  POLY_PROXY = 1,
  POLY_GNOSIS_SAFE = 2,
}

export const WalletTypeSchema = z.object({
  type: z.enum(WalletType),
  typeName: z.enum(['EOA', 'POLY_PROXY', 'POLY_GNOSIS_SAFE']),
});
