import { WalletType } from '@polymarket/bindings/gamma';
import {
  expectEvmAddress,
  expectTxHash,
  type HexString,
} from '@polymarket/types';
import { describe, expect, it, vi } from 'vitest';
import {
  erc20ApprovalCall,
  erc1155ApprovalForAllCall,
  MAX_UINT256,
} from '../abis';
import type { BaseSecureClient } from '../clients';
import { production } from '../environments';
import type { EthCallRequest } from '../rpc';
import type { TransactionHandle } from '../types';
import { prepareTradingApprovals } from './approvals';

const FALSE_RESULT = `0x${'0'.repeat(64)}` as HexString;
const TRUE_RESULT = `0x${'0'.repeat(63)}1` as HexString;
const MAX_UINT256_RESULT = `0x${'f'.repeat(64)}` as HexString;
const wallet = expectEvmAddress('0x0000000000000000000000000000000000000001');

describe('prepareTradingApprovals', () => {
  it('includes auto-redeem approval in account setup', async () => {
    const { client } = createClient([
      ...Array<HexString>(5).fill(FALSE_RESULT),
      ...Array<HexString>(6).fill(FALSE_RESULT),
    ]);
    const workflow = await prepareTradingApprovals(client);
    let result = await workflow.next();

    for (let index = 0; index < 10; index += 1) {
      expect(result.done).toBe(false);
      result = await workflow.next(createTransactionHandle());
    }

    expect(result).toEqual({
      done: false,
      value: {
        kind: 'sendErc1155ApprovalForAllTransaction',
        request: {
          chainId: production.chainId,
          ...erc1155ApprovalForAllCall(
            production.conditionalTokens,
            production.autoRedeemOperator,
            true,
          ),
        },
      },
    });
  });

  it('completes without transactions when approvals are already set', async () => {
    const { client, ethCallBatch } = createClient([
      ...Array<HexString>(5).fill(MAX_UINT256_RESULT),
      ...Array<HexString>(6).fill(TRUE_RESULT),
    ]);

    const workflow = await prepareTradingApprovals(client);

    const result = await workflow.next();

    expect(result).toEqual({
      done: true,
      value: undefined,
    });
    expect(ethCallBatch).toHaveBeenCalledTimes(1);
    expect(ethCallBatch.mock.calls[0]?.[0]).toHaveLength(11);
  });

  it('submits only missing approvals', async () => {
    const { client } = createClient([
      FALSE_RESULT,
      ...Array<HexString>(4).fill(MAX_UINT256_RESULT),
      FALSE_RESULT,
      ...Array<HexString>(5).fill(TRUE_RESULT),
    ]);
    const firstHandle = createTransactionHandle();
    const secondHandle = createTransactionHandle();
    const workflow = await prepareTradingApprovals(client);

    let result = await workflow.next();

    expect(result).toEqual({
      done: false,
      value: {
        kind: 'sendErc20ApprovalTransaction',
        request: {
          chainId: production.chainId,
          ...erc20ApprovalCall(
            production.collateralToken,
            production.standardExchange,
            MAX_UINT256,
          ),
        },
      },
    });

    result = await workflow.next(firstHandle);

    expect(result).toEqual({
      done: false,
      value: {
        kind: 'sendErc1155ApprovalForAllTransaction',
        request: {
          chainId: production.chainId,
          ...erc1155ApprovalForAllCall(
            production.conditionalTokens,
            production.standardExchange,
            true,
          ),
        },
      },
    });

    result = await workflow.next(secondHandle);

    expect(result).toEqual({
      done: true,
      value: undefined,
    });
    expect(firstHandle.wait).toHaveBeenCalledTimes(1);
    expect(secondHandle.wait).toHaveBeenCalledTimes(1);
  });
});

function createClient(results: HexString[]) {
  const ethCallBatch = vi.fn(
    async (_calls: readonly EthCallRequest[]): Promise<HexString[]> => results,
  );
  const client = {
    account: { wallet, walletType: WalletType.EOA },
    environment: production,
    rpc: { ethCallBatch },
  } as unknown as BaseSecureClient;

  return { client, ethCallBatch };
}

function createTransactionHandle(): TransactionHandle {
  return {
    transactionHash: null,
    transactionId: null,
    wait: vi.fn(async () => ({
      transactionHash: expectTxHash(
        '0x1111111111111111111111111111111111111111111111111111111111111111',
      ),
      transactionId: null,
    })),
  };
}
