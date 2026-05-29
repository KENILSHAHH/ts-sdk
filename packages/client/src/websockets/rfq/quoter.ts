import {
  OrderSide,
  type PositionId,
  PositiveDecimalNumberSchema,
  toBaseUnits,
} from '@polymarket/bindings';
import type { ApiKeyCreds } from '@polymarket/bindings/clob';
import { SignatureType } from '@polymarket/bindings/clob';
import {
  RfqConfirmationDecision,
  type RfqConfirmationRequest,
  RfqDirection,
  type RfqExecutionUpdate,
  type RfqId,
  type RfqQuoteId,
  type RfqQuoteRequest,
  RfqQuoterInboundMessageSchema,
  type RfqQuoterOutboundMessage,
  type RfqSignedOrder,
} from '@polymarket/bindings/rfq';
import {
  type Erc1271Signature,
  type EvmAddress,
  type EvmSignature,
  expectErc1271Signature,
  expectHexString,
  type HexString,
  setNonBlockingTimeout,
} from '@polymarket/types';
import { type Pushable, pushable } from 'it-pushable';
import { AbiParameters, Bytes, Hash } from 'ox';
import { z } from 'zod';
import { decimalPlaces, parseAmount } from '../../actions/orders/math';
import type {
  RfqConfirmationAck,
  RfqConfirmationRequestEvent,
  RfqEvent,
  RfqExecutionUpdateEvent,
  RfqQuoteAck,
  RfqQuoteRequestEvent,
  RfqQuoteResponse,
  RfqSession,
} from '../../actions/rfq';
import {
  SigningError,
  TimeoutError,
  TransportError,
  UserInputError,
} from '../../errors';
import { parseUserInput } from '../../input';
import type { Signer, TypedDataPayload } from '../../types';
import type { AccountIdentity } from '../../wallet';
import { toSignatureType } from '../../wallet';
import { WebSocketConnection } from '../lifecycle';

const AUTH_TIMEOUT_MS = 30_000;
const ACK_TIMEOUT_MS = 30_000;
const BYTES32_ZERO =
  '0x0000000000000000000000000000000000000000000000000000000000000000' satisfies HexString;
const ORDER_TYPE_STRING =
  'Order(uint256 salt,address maker,address signer,uint256 tokenId,uint256 makerAmount,uint256 takerAmount,uint8 side,uint8 signatureType,uint256 timestamp,bytes32 metadata,bytes32 builder)';
const ORDER_TYPE_HASH = Hash.keccak256(Bytes.fromString(ORDER_TYPE_STRING), {
  as: 'Hex',
});
const DOMAIN_TYPE_HASH = Hash.keccak256(
  Bytes.fromString(
    'EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)',
  ),
  { as: 'Hex' },
);
const PROTOCOL_NAME = 'Polymarket CTF Exchange';
const PROTOCOL_VERSION = '3';
const PROTOCOL_NAME_HASH = Hash.keccak256(Bytes.fromString(PROTOCOL_NAME), {
  as: 'Hex',
});
const PROTOCOL_VERSION_HASH = Hash.keccak256(
  Bytes.fromString(PROTOCOL_VERSION),
  { as: 'Hex' },
);
const DEPOSIT_WALLET_DOMAIN_NAME = 'DepositWallet';
const DEPOSIT_WALLET_DOMAIN_VERSION = '1';
const EIP712_DOMAIN = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
] as const;
const ORDER_STRUCTURE = [
  { name: 'salt', type: 'uint256' },
  { name: 'maker', type: 'address' },
  { name: 'signer', type: 'address' },
  { name: 'tokenId', type: 'uint256' },
  { name: 'makerAmount', type: 'uint256' },
  { name: 'takerAmount', type: 'uint256' },
  { name: 'side', type: 'uint8' },
  { name: 'signatureType', type: 'uint8' },
  { name: 'timestamp', type: 'uint256' },
  { name: 'metadata', type: 'bytes32' },
  { name: 'builder', type: 'bytes32' },
] as const;
const TYPED_DATA_SIGN_STRUCTURE = [
  { name: 'contents', type: 'Order' },
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
  { name: 'salt', type: 'bytes32' },
] as const;

const RfqQuoteResponseSchema = z.strictObject({
  price: PositiveDecimalNumberSchema.refine((price) => price < 1, {
    message: 'Price must be less than 1.',
  }),
  size: PositiveDecimalNumberSchema.optional(),
}) satisfies z.ZodType<RfqQuoteResponse>;

type ApiKeyCredsProvider = () => ApiKeyCreds;
type AccountProvider = () => AccountIdentity;
type SignerProvider = () => Signer;

export type RfqQuoterWebSocketManagerOptions = {
  chainId: number;
  exchangeV3: EvmAddress;
  resolveAccount: AccountProvider;
  resolveCredentials: ApiKeyCredsProvider;
  resolveSigner: SignerProvider;
  url: string;
};

type PendingResponse<T> = {
  promise: Promise<T>;
  reject(error: Error): void;
  resolve(value: T): void;
};

export class RfqQuoterWebSocketManager {
  readonly #resolveAccount: AccountProvider;
  readonly #resolveCredentials: ApiKeyCredsProvider;
  readonly #resolveSigner: SignerProvider;
  readonly #chainId: number;
  readonly #exchangeV3: EvmAddress;
  readonly #url: string;
  #session: RfqWebSocketSession | undefined;
  #connectingSession: RfqWebSocketSession | undefined;
  #connecting: Promise<RfqSession> | undefined;

  constructor(options: RfqQuoterWebSocketManagerOptions) {
    this.#chainId = options.chainId;
    this.#exchangeV3 = options.exchangeV3;
    this.#resolveAccount = options.resolveAccount;
    this.#resolveCredentials = options.resolveCredentials;
    this.#resolveSigner = options.resolveSigner;
    this.#url = options.url;
  }

  async connect(): Promise<RfqSession> {
    if (this.#session !== undefined) return this.#session;
    if (this.#connecting !== undefined) return this.#connecting;

    const session = new RfqWebSocketSession({
      account: this.#resolveAccount(),
      chainId: this.#chainId,
      credentials: this.#resolveCredentials(),
      exchangeV3: this.#exchangeV3,
      onClose: () => this.#clearSession(session),
      signer: this.#resolveSigner(),
      url: this.#url,
    });
    this.#connectingSession = session;

    let connecting!: Promise<RfqSession>;
    connecting = (async () => {
      try {
        await session.connect();
        this.#session = session;
        return session;
      } catch (error) {
        await session.close();
        throw error;
      } finally {
        if (this.#connecting === connecting) {
          this.#connecting = undefined;
        }
        if (this.#connectingSession === session) {
          this.#connectingSession = undefined;
        }
      }
    })();

    this.#connecting = connecting;
    return connecting;
  }

  async close(): Promise<void> {
    const session = this.#session;
    const connectingSession = this.#connectingSession;
    const connecting = this.#connecting;

    this.#session = undefined;
    this.#connectingSession = undefined;
    this.#connecting = undefined;

    await Promise.allSettled([
      session?.close(),
      connectingSession?.close(),
      connecting?.catch(() => undefined),
    ]).then(() => undefined);
  }

  #clearSession(session: RfqWebSocketSession): void {
    if (this.#session === session) {
      this.#session = undefined;
    }
    if (this.#connectingSession === session) {
      this.#connectingSession = undefined;
    }
  }
}

type RfqWebSocketSessionOptions = {
  account: AccountIdentity;
  chainId: number;
  credentials: ApiKeyCreds;
  exchangeV3: EvmAddress;
  onClose: () => void;
  signer: Signer;
  url: string;
};

class RfqWebSocketSession implements RfqSession {
  readonly #account: AccountIdentity;
  readonly #chainId: number;
  readonly #credentials: ApiKeyCreds;
  readonly #exchangeV3: EvmAddress;
  readonly #onClose: () => void;
  readonly #signer: Signer;
  readonly #url: string;
  readonly #connection = new WebSocketConnection();
  readonly #queue: Pushable<RfqEvent> = pushable({ objectMode: true });
  readonly #pending = new Map<string, PendingResponse<unknown>[]>();
  #closing: Promise<void> | undefined;
  #auth: PendingResponse<void> | undefined;

  constructor(options: RfqWebSocketSessionOptions) {
    this.#account = options.account;
    this.#chainId = options.chainId;
    this.#credentials = options.credentials;
    this.#exchangeV3 = options.exchangeV3;
    this.#onClose = options.onClose;
    this.#signer = options.signer;
    this.#url = options.url;
  }

  async connect(): Promise<void> {
    const auth = createPending<void>();
    this.#auth = auth;
    const authTimeout = setNonBlockingTimeout(() => {
      auth.reject(new TransportError('RFQ quoter authentication timed out.'));
    }, AUTH_TIMEOUT_MS);

    try {
      await this.#connection.connect({
        onClose: () => this.#handleClose(),
        onError: () => undefined,
        onMessage: (message) => this.#handleMessage(message),
        onOpen: () => this.#sendAuthMessage(),
        url: this.#url,
      });
      await auth.promise;
    } finally {
      clearTimeout(authTimeout);
      this.#auth = undefined;
    }
  }

  async #send(message: RfqQuoterOutboundMessage): Promise<void> {
    if (!this.#connection.send(message)) {
      throw new TransportError('RFQ quoter websocket is not open.');
    }
  }

  async quote(
    request: RfqQuoteRequest,
    response: RfqQuoteResponse,
  ): Promise<RfqQuoteAck> {
    const params = parseUserInput(response, RfqQuoteResponseSchema);
    const quote = await createRfqQuote({
      account: this.#account,
      chainId: this.#chainId,
      exchangeV3: this.#exchangeV3,
      request,
      response: params,
      signer: this.#signer,
    });
    const pending = this.#waitFor<RfqQuoteAck>(
      quoteAckKey(request.rfqId),
      `Timed out waiting for RFQ quote acknowledgement for ${request.rfqId}.`,
    );
    try {
      await this.#send({
        price_e6: quote.priceE6,
        rfq_id: request.rfqId,
        signed_order: quote.signedOrder,
        size_e6: quote.sizeE6,
        type: 'RFQ_QUOTE',
      });
      return await pending;
    } catch (error) {
      this.#removePending(quoteAckKey(request.rfqId), pending);
      throw error;
    }
  }

  async respondToConfirmation(
    rfqId: RfqId,
    quoteId: RfqQuoteId,
    decision: RfqConfirmationDecision,
  ): Promise<RfqConfirmationAck> {
    const key = confirmationAckKey(rfqId, quoteId);
    const pending = this.#waitFor<RfqConfirmationAck>(
      key,
      `Timed out waiting for RFQ confirmation acknowledgement for ${rfqId}.`,
    );
    try {
      await this.#send({
        decision,
        quote_id: quoteId,
        rfq_id: rfqId,
        type: 'RFQ_CONFIRMATION_RESPONSE',
      });
      return await pending;
    } catch (error) {
      this.#removePending(key, pending);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.#closing === undefined) {
      this.#closing = this.#shutdown();
    }
    await this.#closing;
  }

  [Symbol.asyncIterator](): AsyncIterator<RfqEvent> {
    return this.#queue[Symbol.asyncIterator]();
  }

  async #shutdown(): Promise<void> {
    this.#rejectPending(new TransportError('RFQ quoter websocket closed.'));
    this.#queue.end();
    await this.#connection.close();
    this.#onClose();
  }

  #sendAuthMessage(): void {
    this.#connection.send({
      auth: {
        apiKey: this.#credentials.key,
        passphrase: this.#credentials.passphrase,
        secret: this.#credentials.secret,
      },
      identity: {
        maker_address: this.#account.wallet,
        signature_type: toSignatureType(this.#account.walletType),
        signer_address: this.#account.signer,
      },
      type: 'auth',
    });
  }

  #handleMessage(rawMessage: unknown): void {
    const parsed = RfqQuoterInboundMessageSchema.safeParse(rawMessage);
    if (!parsed.success) {
      const error = new TransportError('Invalid RFQ quoter message.', {
        cause: parsed.error,
      });
      this.#rejectPending(error);
      return;
    }

    const message = parsed.data;
    switch (message.type) {
      case 'auth':
        this.#handleAuthMessage(message);
        return;
      case 'quote_request':
        this.#queue.push(toQuoteRequestEvent(this, message));
        return;
      case 'quote_ack':
        this.#resolvePending(quoteAckKey(message.rfqId), toQuoteAck(message));
        return;
      case 'confirmation_request':
        this.#queue.push(toConfirmationRequestEvent(this, message));
        return;
      case 'confirmation_ack':
        this.#resolvePending(
          confirmationAckKey(message.rfqId, message.quoteId),
          toConfirmationAck(message),
        );
        return;
      case 'execution_update':
        this.#queue.push(toExecutionUpdateEvent(message));
        return;
      case 'error':
        return;
    }
  }

  #handleAuthMessage(message: { error?: string; success: boolean }): void {
    if (message.success === true) {
      this.#auth?.resolve(undefined);
      return;
    }
    this.#auth?.reject(
      new TransportError(`RFQ quoter authentication failed: ${message.error}`),
    );
  }

  #handleClose(): void {
    void this.close();
  }

  #waitFor<T>(key: string, timeoutMessage: string): Promise<T> {
    const pending = createPending<T>();
    let promise!: Promise<T>;
    const timeout = setNonBlockingTimeout(() => {
      this.#removePending(key, promise);
      pending.reject(new TimeoutError(timeoutMessage));
    }, ACK_TIMEOUT_MS);
    promise = pending.promise.finally(() => clearTimeout(timeout));
    const entries = this.#pending.get(key) ?? [];
    entries.push({ ...pending, promise } as PendingResponse<unknown>);
    this.#pending.set(key, entries);
    return promise;
  }

  #resolvePending<T>(key: string, value: T): void {
    const entries = this.#pending.get(key);
    const pending = entries?.shift();
    if (pending === undefined) return;
    if (entries !== undefined && entries.length === 0) {
      this.#pending.delete(key);
    }
    pending.resolve(value);
  }

  #removePending<T>(key: string, promise: Promise<T>): void {
    const entries = this.#pending.get(key);
    if (entries === undefined) return;
    const remaining = entries.filter((entry) => entry.promise !== promise);
    if (remaining.length === 0) {
      this.#pending.delete(key);
    } else {
      this.#pending.set(key, remaining);
    }
  }

  #rejectPending(error: Error): void {
    for (const entries of this.#pending.values()) {
      for (const pending of entries) {
        pending.reject(error);
      }
    }
    this.#pending.clear();
  }
}

function toQuoteRequestEvent(
  session: RfqWebSocketSession,
  message: RfqQuoteRequest,
): RfqQuoteRequestEvent {
  return {
    ...message,
    quote: (request) => session.quote(message, request),
  };
}

function toConfirmationRequestEvent(
  session: RfqWebSocketSession,
  message: RfqConfirmationRequest,
): RfqConfirmationRequestEvent {
  const rfqId = message.rfqId;
  const quoteId = message.quoteId;
  return {
    ...message,
    confirm: () =>
      session.respondToConfirmation(
        rfqId,
        quoteId,
        RfqConfirmationDecision.Confirm,
      ),
    decline: () =>
      session.respondToConfirmation(
        rfqId,
        quoteId,
        RfqConfirmationDecision.Decline,
      ),
  };
}

function toExecutionUpdateEvent(
  message: RfqExecutionUpdate,
): RfqExecutionUpdateEvent {
  return message;
}

function toQuoteAck(message: {
  quoteId: RfqQuoteId;
  rfqId: RfqId;
}): RfqQuoteAck {
  return {
    quoteId: message.quoteId,
    rfqId: message.rfqId,
  };
}

function toConfirmationAck(message: {
  quoteId: RfqQuoteId;
  rfqId: RfqId;
}): RfqConfirmationAck {
  return {
    quoteId: message.quoteId,
    rfqId: message.rfqId,
  };
}

function quoteAckKey(rfqId: string): string {
  return `ACK_RFQ_QUOTE:${rfqId}`;
}

function confirmationAckKey(rfqId: string, quoteId: string): string {
  return `ACK_RFQ_CONFIRMATION_RESPONSE:${rfqId}:${quoteId}`;
}

type RfqQuoteParams = {
  price: number;
  size?: number;
};

type CreateRfqQuoteParams = {
  account: AccountIdentity;
  chainId: number;
  exchangeV3: EvmAddress;
  request: RfqQuoteRequest;
  response: RfqQuoteParams;
  signer: Signer;
};

async function createRfqQuote(params: CreateRfqQuoteParams): Promise<{
  priceE6: number;
  signedOrder: RfqSignedOrder;
  sizeE6: number;
}> {
  const priceE6 = decimalToE6(params.response.price, 'RFQ quote price');
  const size = params.response.size ?? Number(params.request.size);
  const sizeE6 = decimalToE6(size, 'RFQ quote size');
  const signedOrder = await signRfqQuoteOrder({
    account: params.account,
    chainId: params.chainId,
    exchangeV3: params.exchangeV3,
    orderPriceE6: orderPriceE6(params.request, priceE6),
    signer: params.signer,
    sizeE6,
    tokenId: quoteOrderTokenId(params.request),
  });

  return { priceE6, signedOrder, sizeE6 };
}

type SignRfqQuoteOrderParams = {
  account: AccountIdentity;
  chainId: number;
  exchangeV3: EvmAddress;
  orderPriceE6: number;
  signer: Signer;
  sizeE6: number;
  tokenId: PositionId;
};

async function signRfqQuoteOrder(
  params: SignRfqQuoteOrderParams,
): Promise<RfqSignedOrder> {
  const signatureType = toSignatureType(params.account.walletType);
  const order: Omit<RfqSignedOrder, 'signature'> = {
    builder: BYTES32_ZERO,
    maker: params.account.wallet,
    makerAmount: toBaseUnits(
      ceilDiv(BigInt(params.orderPriceE6) * BigInt(params.sizeE6), 1_000_000n),
    ),
    metadata: BYTES32_ZERO,
    salt: generateOrderSalt().toString(),
    side: 0,
    signatureType,
    signer: params.account.signer,
    takerAmount: toBaseUnits(String(params.sizeE6)),
    timestamp: Math.floor(Date.now() / 1000).toString(),
    tokenId: params.tokenId,
  };

  let signature: EvmSignature;
  try {
    signature = await params.signer.signTypedData(
      createRfqOrderTypedDataPayload(params.chainId, params.exchangeV3, order),
    );
  } catch (error) {
    throw SigningError.fromError(error, 'Could not sign the RFQ quote order.');
  }

  return {
    ...order,
    signature: createRfqOrderSignature(
      params.chainId,
      params.exchangeV3,
      order,
      signature,
    ),
  };
}

function quoteOrderTokenId(request: RfqQuoteRequest): PositionId {
  return request.direction === RfqDirection.Buy
    ? request.noPositionId
    : request.yesPositionId;
}

function orderPriceE6(request: RfqQuoteRequest, priceE6: number): number {
  return request.direction === RfqDirection.Buy ? 1_000_000 - priceE6 : priceE6;
}

function createRfqOrderTypedDataPayload(
  chainId: number,
  exchangeV3: EvmAddress,
  order: Omit<RfqSignedOrder, 'signature'>,
): TypedDataPayload {
  const orderPayload = createLegacyRfqOrderTypedDataPayload(
    chainId,
    exchangeV3,
    order,
  );

  if (order.signatureType !== SignatureType.POLY_1271) {
    return orderPayload;
  }

  return {
    domain: {
      chainId,
      name: PROTOCOL_NAME,
      verifyingContract: exchangeV3,
      version: PROTOCOL_VERSION,
    },
    message: {
      chainId,
      contents: orderPayload.message,
      name: DEPOSIT_WALLET_DOMAIN_NAME,
      salt: BYTES32_ZERO,
      verifyingContract: order.maker,
      version: DEPOSIT_WALLET_DOMAIN_VERSION,
    },
    primaryType: 'TypedDataSign',
    types: {
      Order: ORDER_STRUCTURE,
      TypedDataSign: TYPED_DATA_SIGN_STRUCTURE,
    },
  };
}

function createLegacyRfqOrderTypedDataPayload(
  chainId: number,
  exchangeV3: EvmAddress,
  order: Omit<RfqSignedOrder, 'signature'>,
): TypedDataPayload {
  return {
    domain: {
      chainId,
      name: PROTOCOL_NAME,
      verifyingContract: exchangeV3,
      version: PROTOCOL_VERSION,
    },
    message: createRfqOrderTypedDataMessage(order),
    primaryType: 'Order',
    types: {
      EIP712Domain: EIP712_DOMAIN,
      Order: ORDER_STRUCTURE,
    },
  };
}

type RfqOrderTypedDataMessage = {
  builder: HexString;
  maker: EvmAddress;
  makerAmount: bigint;
  metadata: HexString;
  salt: bigint;
  side: number;
  signatureType: SignatureType;
  signer: EvmAddress;
  takerAmount: bigint;
  timestamp: bigint;
  tokenId: bigint;
};

function createRfqOrderTypedDataMessage(
  order: Omit<RfqSignedOrder, 'signature'>,
): RfqOrderTypedDataMessage {
  return {
    builder: order.builder ?? BYTES32_ZERO,
    maker: order.maker,
    makerAmount: BigInt(order.makerAmount),
    metadata: order.metadata ?? BYTES32_ZERO,
    salt: BigInt(order.salt),
    side: OrderSide.BUY === order.side ? 0 : Number(order.side),
    signatureType: order.signatureType,
    signer: order.signer,
    takerAmount: BigInt(order.takerAmount),
    timestamp: BigInt(order.timestamp),
    tokenId: BigInt(order.tokenId),
  };
}

function createRfqOrderSignature(
  chainId: number,
  exchangeV3: EvmAddress,
  order: Omit<RfqSignedOrder, 'signature'>,
  signature: EvmSignature,
): EvmSignature | Erc1271Signature {
  if (order.signatureType !== SignatureType.POLY_1271) {
    return signature;
  }

  const contentsType = Bytes.toHex(Bytes.fromString(ORDER_TYPE_STRING));
  const contentsTypeLength = ORDER_TYPE_STRING.length
    .toString(16)
    .padStart(4, '0');

  return expectErc1271Signature(
    `0x${signature.slice(2)}${createAppDomainSeparator(chainId, exchangeV3).slice(2)}${createOrderContentsHash(order).slice(2)}${contentsType.slice(2)}${contentsTypeLength}`,
  );
}

function createAppDomainSeparator(
  chainId: number,
  exchangeV3: EvmAddress,
): HexString {
  return expectHexString(
    Hash.keccak256(
      AbiParameters.encode(
        [
          { type: 'bytes32' },
          { type: 'bytes32' },
          { type: 'bytes32' },
          { type: 'uint256' },
          { type: 'address' },
        ],
        [
          DOMAIN_TYPE_HASH,
          PROTOCOL_NAME_HASH,
          PROTOCOL_VERSION_HASH,
          BigInt(chainId),
          exchangeV3,
        ],
      ),
      { as: 'Hex' },
    ),
  );
}

function createOrderContentsHash(
  order: Omit<RfqSignedOrder, 'signature'>,
): HexString {
  const message = createRfqOrderTypedDataMessage(order);

  return expectHexString(
    Hash.keccak256(
      AbiParameters.encode(
        [
          { type: 'bytes32' },
          { type: 'uint256' },
          { type: 'address' },
          { type: 'address' },
          { type: 'uint256' },
          { type: 'uint256' },
          { type: 'uint256' },
          { type: 'uint8' },
          { type: 'uint8' },
          { type: 'uint256' },
          { type: 'bytes32' },
          { type: 'bytes32' },
        ],
        [
          ORDER_TYPE_HASH,
          message.salt,
          message.maker,
          message.signer,
          message.tokenId,
          message.makerAmount,
          message.takerAmount,
          message.side,
          message.signatureType,
          message.timestamp,
          message.metadata,
          message.builder,
        ],
      ),
      { as: 'Hex' },
    ),
  );
}

function decimalToE6(value: number, field: string): number {
  if (decimalPlaces(value) > 6) {
    throw new UserInputError(`${field} must have at most 6 decimal places.`);
  }

  const wireValue = parseAmount(value);

  if (wireValue > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new UserInputError(`${field} is too large.`);
  }

  return Number(wireValue);
}

function ceilDiv(numerator: bigint, denominator: bigint): string {
  return ((numerator + denominator - 1n) / denominator).toString();
}

function generateOrderSalt(): bigint {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);

  return BigInt(
    `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`,
  );
}

function createPending<T>(): PendingResponse<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}
