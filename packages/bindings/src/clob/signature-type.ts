import { z } from 'zod';

export enum SignatureType {
  EOA = 0,
  POLY_PROXY = 1,
  POLY_GNOSIS_SAFE = 2,
}

export const SignatureTypeSchema = z.enum(SignatureType);
