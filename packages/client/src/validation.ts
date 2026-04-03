import type { core, ZodError } from 'zod';

const maxIssuesInMessage = 99;
const identifierRegex = /^[$A-Z_a-z][$\w]*$/;

type UserInputIssue = {
  code: string;
  message: string;
  path: string | null;
};

export type ResponseValidationContext = {
  endpoint: string;
};

/**
 * Formats a `ZodError` into an SDK-oriented input validation message.
 */
export function formatInputZodError(error: ZodError): string {
  const issues = flattenIssues(error.issues);

  if (issues.length === 0) {
    return 'It was not possible to determine a more specific reason.';
  }

  return ['Fix the following issues:', formatIssues(issues)].join('\n');
}

/**
 * Formats a `ZodError` into an SDK-oriented response validation message.
 */
export function formatResponseZodError(
  error: ZodError,
  context: ResponseValidationContext,
): string {
  const issues = flattenIssues(error.issues);

  if (issues.length === 0) {
    return [
      'Received an incompatible API response.',
      `Endpoint: ${context.endpoint}`,
      'This usually means the API response shape changed in a breaking way or the SDK is outdated.',
      'It was not possible to determine a more specific reason.',
    ].join('\n');
  }

  return [
    'Received an incompatible API response.',
    `Endpoint: ${context.endpoint}`,
    'This usually means the API response shape changed in a breaking way or the SDK is outdated.',
    'Fix the following issues:',
    formatIssues(issues),
  ].join('\n');
}

function formatIssues(issues: readonly UserInputIssue[]): string {
  const lines = issues.map((issue) => {
    if (issue.path === null) {
      return `- ${issue.message}`;
    }

    return `- ${issue.path}: ${issue.message}`;
  });

  return lines.join('\n');
}

function flattenIssues(issues: readonly core.$ZodIssue[]): UserInputIssue[] {
  return flattenIssueBranches(issues).slice(0, maxIssuesInMessage);
}

function flattenIssueBranches(
  issues: readonly core.$ZodIssue[],
  pathPrefix: readonly PropertyKey[] = [],
): UserInputIssue[] {
  const flattened = issues.flatMap((issue) => {
    const path = [...pathPrefix, ...issue.path];

    if (issue.code === 'invalid_union') {
      return issue.errors.flatMap((branch) =>
        flattenIssueBranches(branch, path),
      );
    }

    return [
      {
        code: issue.code,
        message: issue.message,
        path: path.length === 0 ? null : formatPath(path),
      } satisfies UserInputIssue,
    ];
  });

  return dedupeIssues(flattened);
}

function dedupeIssues(issues: readonly UserInputIssue[]): UserInputIssue[] {
  const seen = new Set<string>();
  const deduped: UserInputIssue[] = [];

  for (const issue of issues) {
    const key = `${issue.code}:${issue.path ?? ''}:${issue.message}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(issue);
  }

  return deduped.sort(compareIssues);
}

function compareIssues(left: UserInputIssue, right: UserInputIssue): number {
  if (left.path === null && right.path !== null) {
    return -1;
  }

  if (left.path !== null && right.path === null) {
    return 1;
  }

  return (left.path ?? '').localeCompare(right.path ?? '');
}

function formatPath(path: readonly PropertyKey[]): string {
  return path.reduce<string>((result, segment) => {
    if (typeof segment === 'number') {
      return `${result}[${segment.toString()}]`;
    }

    if (typeof segment !== 'string') {
      return result;
    }

    if (segment.includes('"')) {
      return `${result}["${segment.replaceAll('"', '\\"')}"]`;
    }

    if (!identifierRegex.test(segment)) {
      return `${result}["${segment}"]`;
    }

    if (result.length === 0) {
      return segment;
    }

    return `${result}.${segment}`;
  }, '');
}
