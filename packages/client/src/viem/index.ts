import { expectEvmAddress, expectSignature } from '@polymarket/types';
import type { Account, WalletClient } from 'viem';
import type { AuthenticationWorkflow } from '../authentication';
import type { SecureClient } from '../clients';

function getAccount(walletClient: WalletClient): Account | `0x${string}` {
  const account = walletClient.account;

  if (account) {
    return account;
  }

  throw new Error('Expected a WalletClient with a hoisted account.');
}

export function authenticateWith(walletClient: WalletClient) {
  const account = getAccount(walletClient);
  const address = expectEvmAddress(
    typeof account === 'string' ? account : account.address,
  );

  return async function authenticate(
    workflow: AuthenticationWorkflow,
  ): Promise<SecureClient> {
    let result = await workflow.next();

    while (!result.done) {
      try {
        switch (result.value.kind) {
          case 'requestAddress':
            result = await workflow.next(address);
            break;
          case 'signTypedData':
            result = await workflow.next(
              expectSignature(
                await walletClient.signTypedData({
                  account,
                  ...(result.value.payload as Omit<
                    Parameters<WalletClient['signTypedData']>[0],
                    'account'
                  >),
                }),
              ),
            );
            break;
        }
      } catch (error) {
        result = await workflow.throw(error);
      }
    }

    return result.value;
  };
}
