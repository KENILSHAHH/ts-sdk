import {
  expectEvmAddress,
  expectSignature,
  invariant,
} from '@polymarket/types';
import type { Account, Chain, Transport, WalletClient } from 'viem';
import type { AuthenticationWorkflow } from '../authentication';
import type { SecureClient } from '../clients';

function isWalletClientWithAccount(
  walletClient: WalletClient,
): walletClient is WalletClient<Transport, Chain, Account> {
  return walletClient.account !== undefined;
}

export function authenticateWith(walletClient: WalletClient) {
  invariant(
    isWalletClientWithAccount(walletClient),
    'Wallet client with account is required',
  );

  const account = walletClient.account;
  const address = expectEvmAddress(
    typeof walletClient.account === 'string'
      ? walletClient.account
      : walletClient.account.address,
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
          case 'signAuthMessage':
            result = await workflow.next(
              expectSignature(
                await walletClient.signTypedData({
                  account,
                  ...result.value.payload,
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
