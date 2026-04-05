import { z } from 'zod';

export enum WalletTypeKind {
  EOA = 0,
  POLY_PROXY = 1,
  POLY_GNOSIS_SAFE = 2,
}

export const WalletTypeSchema = z.object({
  type: z.enum(WalletTypeKind),
  typeName: z.enum(['EOA', 'POLY_PROXY', 'POLY_GNOSIS_SAFE']),
});

export type WalletType = z.infer<typeof WalletTypeSchema>;
