import { OrderSide, type TokenId } from '@polymarket/bindings';
import { AssetType } from '@polymarket/bindings/clob';
import type { EvmAddress } from '@polymarket/types';
import type { BaseSecureClient } from '../../clients';
import { fetchBalanceAllowance } from '../account';

export type ResolveCurrentAllowanceParams = {
  spenderAddress: EvmAddress;
  side: OrderSide;
  tokenId: TokenId;
};

/* @internal */
export async function resolveCurrentAllowance(
  client: BaseSecureClient,
  params: ResolveCurrentAllowanceParams,
): Promise<bigint> {
  const assetType =
    params.side === OrderSide.BUY
      ? AssetType.COLLATERAL
      : AssetType.CONDITIONAL;
  const { allowances } = await fetchBalanceAllowance(
    client,
    params.side === OrderSide.BUY
      ? {
          assetType,
        }
      : {
          assetType,
          tokenId: params.tokenId,
        },
  );

  return resolveAllowanceAmount(allowances, params.spenderAddress);
}

function resolveAllowanceAmount(
  allowances: Record<EvmAddress, bigint>,
  spender: EvmAddress,
): bigint {
  const match = Object.entries(allowances).find(
    ([key]) => key.toLowerCase() === spender.toLowerCase(),
  );

  return match?.[1] ?? 0n;
}
