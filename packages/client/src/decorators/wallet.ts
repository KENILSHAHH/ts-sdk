import type { Prettify } from '@polymarket/types';
import {
  type Erc20ApprovalWorkflow,
  type Erc20TransferWorkflow,
  type Erc1155ApprovalForAllWorkflow,
  type GaslessWalletWorkflow,
  type IsGaslessReadyRequest,
  isGaslessReady,
  type MergePositionsWorkflow,
  type PrepareErc20ApprovalRequest,
  type PrepareErc20TransferRequest,
  type PrepareErc1155ApprovalForAllRequest,
  type PrepareMergePositionsRequest,
  type PrepareRedeemPositionsRequest,
  type PrepareSplitPositionRequest,
  prepareErc20Approval,
  prepareErc20Transfer,
  prepareErc1155ApprovalForAll,
  prepareGaslessWallet,
  prepareMergePositions,
  prepareRedeemPositions,
  prepareSplitPosition,
  prepareTradingApprovals,
  type RedeemPositionsWorkflow,
  type SplitPositionWorkflow,
  type TradingApprovalsWorkflow,
} from '../actions';
import type {
  BaseClient,
  BasePublicClient,
  BaseSecureClient,
} from '../clients';

export type PublicWalletActions = {
  /**
   * Checks whether a wallet is ready for gasless transactions.
   *
   * @throws {@link IsGaslessReadyError}
   * Thrown on failure.
   *
   * @example
   * ```ts
   * const ready = await client.isGaslessReady({
   *   wallet: '0x1234...',
   * });
   * ```
   */
  isGaslessReady(request: IsGaslessReadyRequest): Promise<boolean>;
  /**
   * Starts preparing the wallet for gasless transactions.
   *
   * @throws {@link PrepareGaslessWalletError}
   * Thrown on failure.
   *
   * @example
   * ```ts
   * const handle = await client.prepareGaslessWallet().then(completeWith(wallet));
   *
   * const outcome = await handle.wait();
   *
   * // outcome.transactionHash: TxHash
   * ```
   */
  prepareGaslessWallet(): Promise<GaslessWalletWorkflow>;
};

export type SecureWalletActions = Prettify<
  PublicWalletActions & {
    /**
     * Starts a trading-setup approval workflow.
     *
     * @throws {@link PrepareTradingApprovalsError}
     * Thrown on failure.
     *
     * @example
     * ```ts
     * const handle = await client.prepareTradingApprovals().then(completeWith(wallet));
     *
     * const outcome = await handle.wait();
     *
     * // outcome.transactionHash: TxHash
     * ```
     */
    prepareTradingApprovals(): Promise<TradingApprovalsWorkflow>;
    /**
     * Starts an ERC-20 approval workflow.
     *
     * @throws {@link PrepareErc20ApprovalError}
     * Thrown on failure.
     *
     * @example
     * ```ts
     * const handle = await client.prepareErc20Approval({
     *   amount: 'max',
     *   spenderAddress: '0x1234…',
     *   tokenAddress: '0x5678…',
     * }).then(completeWith(wallet));
     *
     * const outcome = await handle.wait();
     *
     * // outcome.transactionHash: TxHash
     * ```
     */
    prepareErc20Approval(
      request: PrepareErc20ApprovalRequest,
    ): Promise<Erc20ApprovalWorkflow>;
    /**
     * Starts an ERC-1155 approval-for-all workflow.
     *
     * @throws {@link PrepareErc1155ApprovalForAllError}
     * Thrown on failure.
     *
     * @example
     * ```ts
     * const handle = await client.prepareErc1155ApprovalForAll({
     *   operatorAddress: '0x1234…',
     *   tokenAddress: '0x5678…',
     * }).then(completeWith(wallet));
     *
     * const outcome = await handle.wait();
     *
     * // outcome.transactionHash: TxHash
     * ```
     */
    prepareErc1155ApprovalForAll(
      request: PrepareErc1155ApprovalForAllRequest,
    ): Promise<Erc1155ApprovalForAllWorkflow>;
    /**
     * Starts an ERC-20 transfer workflow.
     *
     * @throws {@link PrepareErc20TransferError}
     * Thrown on failure.
     *
     * @example
     * ```ts
     * const handle = await client.prepareErc20Transfer({
     *   amount: 1n,
     *   recipientAddress: client.account.signer,
     *   tokenAddress: client.environment.collateralToken,
     * }).then(completeWith(wallet));
     *
     * const outcome = await handle.wait();
     *
     * // outcome.transactionHash: TxHash
     * ```
     */
    prepareErc20Transfer(
      request: PrepareErc20TransferRequest,
    ): Promise<Erc20TransferWorkflow>;
    /**
     * Starts a split workflow for a market condition.
     *
     * @throws {@link PrepareSplitPositionError}
     * Thrown on failure.
     *
     * @example
     * ```ts
     * const handle = await client.prepareSplitPosition({
     *   amount: 1n,
     *   conditionId:
     *     '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
     * }).then(completeWith(wallet));
     *
     * const outcome = await handle.wait();
     *
     * // outcome.transactionHash: TxHash
     * ```
     */
    prepareSplitPosition(
      request: PrepareSplitPositionRequest,
    ): Promise<SplitPositionWorkflow>;
    /**
     * Starts a workflow to merge complementary positions in a market back into collateral.
     *
     * @throws {@link PrepareMergePositionsError}
     * Thrown on failure.
     *
     * @example
     * ```ts
     * const handle = await client.prepareMergePositions({
     *   amount: 'max',
     *   conditionId:
     *     '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
     * }).then(completeWith(wallet));
     *
     * const outcome = await handle.wait();
     *
     * // outcome.transactionHash: TxHash
     * ```
     */
    prepareMergePositions(
      request: PrepareMergePositionsRequest,
    ): Promise<MergePositionsWorkflow>;
    /**
     * Starts a redemption workflow for resolved positions.
     *
     * @throws {@link PrepareRedeemPositionsError}
     * Thrown on failure.
     *
     * @example
     * ```ts
     * const handle = await client.prepareRedeemPositions({
     *   conditionId:
     *     '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
     * }).then(completeWith(wallet));
     *
     * const outcome = await handle.wait();
     *
     * // outcome.transactionHash: TxHash
     * ```
     */
    prepareRedeemPositions(
      request: PrepareRedeemPositionsRequest,
    ): Promise<RedeemPositionsWorkflow>;
  }
>;

function publicWalletActions(client: BaseClient): PublicWalletActions {
  return {
    isGaslessReady: isGaslessReady.bind(null, client),
    prepareGaslessWallet: prepareGaslessWallet.bind(null, client),
  };
}

export function walletActions(client: BasePublicClient): PublicWalletActions;
export function walletActions(client: BaseSecureClient): SecureWalletActions;
export function walletActions(
  client: BaseClient,
): PublicWalletActions | SecureWalletActions {
  const actions = publicWalletActions(client);

  if (client.isPublicClient()) {
    return actions;
  }

  return {
    ...actions,
    prepareTradingApprovals: prepareTradingApprovals.bind(null, client),
    prepareErc20Approval: prepareErc20Approval.bind(null, client),
    prepareErc1155ApprovalForAll: prepareErc1155ApprovalForAll.bind(
      null,
      client,
    ),
    prepareErc20Transfer: prepareErc20Transfer.bind(null, client),
    prepareSplitPosition: prepareSplitPosition.bind(null, client),
    prepareMergePositions: prepareMergePositions.bind(null, client),
    prepareRedeemPositions: prepareRedeemPositions.bind(null, client),
  };
}
