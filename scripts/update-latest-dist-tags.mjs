import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dryRun = process.argv.includes('--dry-run');
const packagesDir = join(process.cwd(), 'packages');

for (const packageDir of readdirSync(packagesDir)) {
  const packageJsonPath = join(packagesDir, packageDir, 'package.json');

  if (!existsSync(packageJsonPath)) {
    continue;
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

  if (packageJson.private) {
    continue;
  }

  const packageVersion = `${packageJson.name}@${packageJson.version}`;

  if (dryRun) {
    console.log(`npm dist-tag add ${packageVersion} latest`);
    continue;
  }

  if (!packageJson.version.includes('canary')) {
    throw new Error(
      `Refusing to tag non-canary package version as latest: ${packageVersion}`,
    );
  }

  const result = spawnSync(
    'npm',
    ['dist-tag', 'add', packageVersion, 'latest'],
    {
      stdio: 'inherit',
    },
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
