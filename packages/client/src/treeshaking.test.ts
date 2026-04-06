import { execFileSync } from 'node:child_process';
import { access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, type InlineConfig } from 'vite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const testFile = fileURLToPath(import.meta.url);
const clientPackageDir = dirname(dirname(testFile));
const workspaceRoot = resolve(clientPackageDir, '../..');

const runtimeBuildTargets = [
  {
    cwd: resolve(workspaceRoot, 'packages/types'),
    args: [
      'exec',
      'tsup',
      'src/index.ts',
      '--no-config',
      '--format',
      'esm',
      '--out-dir',
      'dist',
      '--sourcemap',
      '--clean',
      '--minify',
      '--platform',
      'neutral',
      '--target',
      'esnext',
      '--tsconfig',
      'tsconfig.build.json',
      '--treeshake',
    ],
  },
  {
    cwd: resolve(workspaceRoot, 'packages/bindings'),
    args: [
      'exec',
      'tsup',
      'src/index.ts',
      'src/clob/index.ts',
      'src/data/index.ts',
      'src/gamma/index.ts',
      '--no-config',
      '--format',
      'esm',
      '--out-dir',
      'dist',
      '--sourcemap',
      '--clean',
      '--minify',
      '--platform',
      'neutral',
      '--target',
      'esnext',
      '--tsconfig',
      'tsconfig.build.json',
      '--treeshake',
    ],
  },
];

const tempDirs: string[] = [];

type BundleChunk = {
  type: 'chunk';
  code: string;
};

type BundleOutput = {
  output: Array<
    | BundleChunk
    | {
        type: string;
      }
  >;
};

describe('tree-shaking', () => {
  beforeAll(async () => {
    for (const target of runtimeBuildTargets) {
      execFileSync('pnpm', target.args, {
        cwd: target.cwd,
        stdio: 'pipe',
      });
    }

    await assertClientDistExists();
  }, 120_000);

  afterAll(async () => {
    await Promise.all(
      tempDirs.map((path) => rm(path, { force: true, recursive: true })),
    );
  });

  it('keeps unrelated action code out of the root client bundle', async () => {
    const bundledCode = await bundleEntry(
      "import { createPublicClient } from '@polymarket/client'; globalThis.__proof = createPublicClient;",
    );

    expect(bundledCode).toContain('ClobAuthDomain');
    expect(bundledCode).not.toContain('sports/market-types');
  });

  it('keeps unrelated actions out of a single action bundle', async () => {
    const bundledCode = await bundleEntry(
      "import { listMarkets } from '@polymarket/client/actions'; globalThis.__proof = listMarkets;",
    );

    expect(bundledCode).toContain('umaResolutionStatus');
    expect(bundledCode).not.toContain('ClobAuthDomain');
    expect(bundledCode).not.toContain('auth/derive-api-key');
    expect(bundledCode).not.toContain('sports/market-types');
  });
});

async function bundleEntry(source: string): Promise<string> {
  const entryDir = await mkdtemp(
    resolve(tmpdir(), 'polymarket-client-treeshake-'),
  );
  const entryFile = resolve(entryDir, 'entry.ts');

  tempDirs.push(entryDir);

  await writeFile(entryFile, `${source}\n`, 'utf8');

  const result = await build(
    createBundleConfig(entryFile, resolve(entryDir, 'dist')),
  );
  const outputs = Array.isArray(result) ? result : [result];
  const chunks = outputs.flatMap((output) =>
    isBundleOutput(output) ? collectChunks(output) : [],
  );

  if (chunks.length === 0) {
    throw new Error('Expected bundler output to contain at least one chunk');
  }

  return chunks.map((chunk) => chunk.code).join('\n');
}

function createBundleConfig(entryFile: string, outDir: string): InlineConfig {
  return {
    appType: 'custom',
    configFile: false,
    logLevel: 'silent',
    resolve: {
      alias: [
        aliasEntry(
          /^@polymarket\/client\/actions$/,
          resolve(workspaceRoot, 'packages/client/dist/actions/index.js'),
        ),
        aliasEntry(
          /^@polymarket\/client$/,
          resolve(workspaceRoot, 'packages/client/dist/index.js'),
        ),
        aliasEntry(
          /^@polymarket\/bindings\/clob$/,
          resolve(workspaceRoot, 'packages/bindings/dist/clob/index.js'),
        ),
        aliasEntry(
          /^@polymarket\/bindings\/data$/,
          resolve(workspaceRoot, 'packages/bindings/dist/data/index.js'),
        ),
        aliasEntry(
          /^@polymarket\/bindings\/gamma$/,
          resolve(workspaceRoot, 'packages/bindings/dist/gamma/index.js'),
        ),
        aliasEntry(
          /^@polymarket\/bindings$/,
          resolve(workspaceRoot, 'packages/bindings/dist/index.js'),
        ),
        aliasEntry(
          /^@polymarket\/types$/,
          resolve(workspaceRoot, 'packages/types/dist/index.js'),
        ),
      ],
    },
    build: {
      minify: false,
      outDir,
      rollupOptions: {
        input: entryFile,
        treeshake: true,
      },
      target: 'esnext',
      write: false,
    },
  };
}

function aliasEntry(find: RegExp, replacement: string) {
  return { find, replacement };
}

function collectChunks(output: BundleOutput): BundleChunk[] {
  return output.output.filter(
    (chunk): chunk is BundleChunk => chunk.type === 'chunk',
  );
}

function isBundleOutput(value: unknown): value is BundleOutput {
  return typeof value === 'object' && value !== null && 'output' in value;
}

async function assertClientDistExists(): Promise<void> {
  await Promise.all([
    access(resolve(workspaceRoot, 'packages/client/dist/index.js')),
    access(resolve(workspaceRoot, 'packages/client/dist/actions/index.js')),
  ]).catch(() => {
    throw new Error(
      'Expected packages/client/dist entrypoints to exist before running the tree-shaking proof test.',
    );
  });
}
