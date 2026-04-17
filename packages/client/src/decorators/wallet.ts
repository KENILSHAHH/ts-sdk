import type { Prettify } from '@polymarket/types';
import {
  isGaslessReady,
  prepareErc20Approval,
  prepareErc20Transfer,
  prepareErc1155ApprovalForAll,
  prepareGaslessWallet,
  prepareMergePositions,
  prepareRedeemPositions,
  prepareSplitPosition,
  prepareTradingApprovals,
} from '../actions';
import type { Client, PublicClient, SecureClient } from '../clients';
import {
  type BindActionParameters,
  type BindActionResult,
  bindAction,
} from './shared';

export type PublicWalletActions = {
  /** Checks whether a wallet is ready for gasless transactions. */
  isGaslessReady(
    ...args: BindActionParameters<typeof isGaslessReady>
  ): BindActionResult<typeof isGaslessReady>;
  /** Starts preparing the wallet for gasless transactions. */
  prepareGaslessWallet(
    ...args: BindActionParameters<typeof prepareGaslessWallet>
  ): BindActionResult<typeof prepareGaslessWallet>;
};

export type SecureWalletActions = Prettify<
  PublicWalletActions & {
    /** Starts a trading-setup approval workflow. */
    prepareTradingApprovals(
      ...args: BindActionParameters<typeof prepareTradingApprovals>
    ): BindActionResult<typeof prepareTradingApprovals>;
    /** Starts an ERC-20 approval workflow. */
    prepareErc20Approval(
      ...args: BindActionParameters<typeof prepareErc20Approval>
    ): BindActionResult<typeof prepareErc20Approval>;
    /** Starts an ERC-1155 approval-for-all workflow. */
    prepareErc1155ApprovalForAll(
      ...args: BindActionParameters<typeof prepareErc1155ApprovalForAll>
    ): BindActionResult<typeof prepareErc1155ApprovalForAll>;
    /** Starts an ERC-20 transfer workflow. */
    prepareErc20Transfer(
      ...args: BindActionParameters<typeof prepareErc20Transfer>
    ): BindActionResult<typeof prepareErc20Transfer>;
    /** Starts a split workflow for a market condition. */
    prepareSplitPosition(
      ...args: BindActionParameters<typeof prepareSplitPosition>
    ): BindActionResult<typeof prepareSplitPosition>;
    /** Starts a workflow to merge complementary positions in a market back into collateral. */
    prepareMergePositions(
      ...args: BindActionParameters<typeof prepareMergePositions>
    ): BindActionResult<typeof prepareMergePositions>;
    /** Starts a redemption workflow for resolved positions. */
    prepareRedeemPositions(
      ...args: BindActionParameters<typeof prepareRedeemPositions>
    ): BindActionResult<typeof prepareRedeemPositions>;
  }
>;

function publicWalletActions(client: Client): PublicWalletActions {
  return {
    isGaslessReady: bindAction(client, isGaslessReady),
    prepareGaslessWallet: bindAction(client, prepareGaslessWallet),
  };
}

export function walletActions(client: PublicClient): PublicWalletActions;
export function walletActions(client: SecureClient): SecureWalletActions;
export function walletActions(
  client: Client,
): PublicWalletActions | SecureWalletActions {
  const actions = publicWalletActions(client);

  if (client.isPublicClient()) {
    return actions;
  }

  return {
    ...actions,
    prepareTradingApprovals: bindAction(client, prepareTradingApprovals),
    prepareErc20Approval: bindAction(client, prepareErc20Approval),
    prepareErc1155ApprovalForAll: bindAction(
      client,
      prepareErc1155ApprovalForAll,
    ),
    prepareErc20Transfer: bindAction(client, prepareErc20Transfer),
    prepareSplitPosition: bindAction(client, prepareSplitPosition),
    prepareMergePositions: bindAction(client, prepareMergePositions),
    prepareRedeemPositions: bindAction(client, prepareRedeemPositions),
  };
}
