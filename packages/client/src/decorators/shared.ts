export type BindActionParameters<TAction> = TAction extends (
  client: infer _TClient,
  ...args: infer TArgs
) => infer _TResult
  ? TArgs
  : never;

export type BindActionResult<TAction> = TAction extends (
  client: infer _TClient,
  ...args: infer _TArgs
) => infer TResult
  ? TResult
  : never;

export function bindAction<TClient, TArgs extends readonly unknown[], TResult>(
  client: TClient,
  action: (client: TClient, ...args: TArgs) => TResult,
): (...args: TArgs) => TResult {
  return (...args) => action(client, ...args);
}
