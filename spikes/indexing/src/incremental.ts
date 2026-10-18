// Usage: node --max-old-space-size=N src/incremental.ts <repo-root> <file-to-edit (relative)> [--tsconfig <file>]
// Measures a cold program build, then a rebuild after editing one file (reusing the old program),
// then re-resolving the calls of the edited file only.
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import ts from 'typescript';
import { listSourceFiles, mb } from './files.ts';

const root = resolve(process.argv[2]);
const edited = join(root, process.argv[3]);
const tsconfigIndex = process.argv.indexOf('--tsconfig');
const tsconfigPath = tsconfigIndex > 0 ? join(root, process.argv[tsconfigIndex + 1]) : join(root, 'tsconfig.json');

const parsed = ts.getParsedCommandLineOfConfigFile(tsconfigPath, { ignoreDeprecations: '6.0' }, {
  ...ts.sys,
  onUnRecoverableConfigFileDiagnostic: () => {},
});
const options: ts.CompilerOptions = { ...parsed?.options, noEmit: true, skipLibCheck: true, ignoreDeprecations: '6.0' };
const rootNames = listSourceFiles(root).filter((f) => f.kind !== 'declaration').map((f) => f.path);

// Host with a source-file cache and an in-memory override for the edited file, like an editor or watcher would have.
const overrides = new Map<string, string>();
const cache = new Map<string, ts.SourceFile>();
const host = ts.createCompilerHost(options);
const originalGetSourceFile = host.getSourceFile.bind(host);
host.getSourceFile = (fileName, languageVersion, onError, shouldCreate) => {
  const override = overrides.get(fileName);
  if (override !== undefined) return ts.createSourceFile(fileName, override, languageVersion, true);
  let sourceFile = cache.get(fileName);
  if (!sourceFile) {
    sourceFile = originalGetSourceFile(fileName, languageVersion, onError, shouldCreate);
    if (sourceFile) cache.set(fileName, sourceFile);
  }
  return sourceFile;
};
const originalReadFile = host.readFile.bind(host);
host.readFile = (fileName) => overrides.get(fileName) ?? originalReadFile(fileName);

function resolveCallsIn(program: ts.Program, fileName: string): number {
  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(fileName);
  let resolved = 0;
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const callee = ts.isPropertyAccessExpression(node.expression) ? node.expression.name : node.expression;
      if (checker.getSymbolAtLocation(callee)?.declarations?.length) resolved++;
    }
    ts.forEachChild(node, visit);
  };
  if (sourceFile) visit(sourceFile);
  return resolved;
}

const time = <T>(fn: () => T): [T, number] => {
  const start = performance.now();
  const result = fn();
  return [result, Math.round(performance.now() - start)];
};

const [cold, coldMs] = time(() => ts.createProgram({ rootNames, options, host }));
const [coldCalls, coldResolveMs] = time(() => resolveCallsIn(cold, edited));

// Edit: append a new exported function that calls into the file's own imports (body-only change keeps structure).
overrides.set(edited, `${readFileSync(edited, 'utf8')}\nexport function __spikeEdit() { return 42; }\n`);
const [warm, warmMs] = time(() => ts.createProgram({ rootNames, options, host, oldProgram: cold }));
const [warmCalls, warmResolveMs] = time(() => resolveCallsIn(warm, edited));

console.log(
  JSON.stringify(
    {
      root,
      edited: process.argv[3],
      programFiles: warm.getSourceFiles().length,
      structureReused: ['Not', 'SafeModules', 'Completely'][(warm as unknown as { structureIsReused: number }).structureIsReused] ?? 'unknown',
      coldMs: { createProgram: coldMs, resolveCallsInFile: coldResolveMs, calls: coldCalls },
      afterEditMs: { createProgram: warmMs, resolveCallsInFile: warmResolveMs, calls: warmCalls },
      rssMB: mb(process.memoryUsage().rss),
    },
    null,
    2,
  ),
);
