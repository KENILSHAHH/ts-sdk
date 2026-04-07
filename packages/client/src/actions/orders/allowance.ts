import { AssetType, OrderSide } from '@polymarket/bindings/clob';
import type { EvmAddress } from '@polymarket/types';
import type { SecureClient } from '../../clients';
import { fetchBalanceAllowance } from '../account';

export type ResolveCurrentAllowanceParams = {
  spenderAddress: EvmAddress;
  side: OrderSide;
  tokenId: string;
};

export async function resolveCurrentAllowance(
  client: SecureClient,
  params: ResolveCurrentAllowanceParams,
): Promise<bigint> {
  const assetType =
    params.side === OrderSide.BUY
      ? AssetType.COLLATERAL
      : AssetType.CONDITIONAL;
  const balanceAllowance = await fetchBalanceAllowance(
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

  return resolveAllowanceAmount(
    balanceAllowance.allowances,
    params.spenderAddress,
  );
}

function resolveAllowanceAmount(
  allowances: Record<string, string>,
  spender: EvmAddress,
): bigint {
  const match = Object.entries(allowances).find(
    ([key]) => key.toLowerCase() === spender.toLowerCase(),
  );

  return BigInt(match?.[1] ?? '0');
}
