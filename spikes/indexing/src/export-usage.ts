// Usage: node --max-old-space-size=N src/export-usage.ts <repo-root> <out.json> [--include <subdir>]
// Symbol-level usage for the design prototypes: for each declaration (function, class, method, const, type),
// where it is used in production code and in tests, and what it uses.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import ts from 'typescript';
import { listSourceFiles } from './files.ts';

const root = resolve(process.argv[2]);
const out = resolve(process.argv[3]);
const includeIndex = process.argv.indexOf('--include');
const include = includeIndex > 0 ? process.argv[includeIndex + 1] : '';

const projectCache = new Map<string, string>();
function projectOf(file: string): string {
  let dir = dirname(file);
  while (dir.startsWith(root)) {
    const cached = projectCache.get(dir);
    if (cached) return cached;
    for (const manifest of ['package.json', 'project.json']) {
      const path = join(dir, manifest);
      if (existsSync(path)) {
        const name = (JSON.parse(readFileSync(path, 'utf8')) as { name?: string }).name ?? relative(root, dir);
        projectCache.set(dir, name);
        return name;
      }
    }
    if (dir === root) break;
    dir = dirname(dir);
  }
  return '(root)';
}

const files = listSourceFiles(join(root, include)).filter((f) => f.kind !== 'declaration');
const kindOf = new Map(files.map((f) => [f.path, f.kind]));
const configPath = ts.findConfigFile(join(root, include), ts.sys.fileExists) ?? join(root, 'tsconfig.json');
const parsed = ts.getParsedCommandLineOfConfigFile(configPath, { ignoreDeprecations: '6.0' }, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} });
const program = ts.createProgram({
  rootNames: files.map((f) => f.path),
  options: { ...parsed?.options, noEmit: true, skipLibCheck: true, ignoreDeprecations: '6.0' },
});
const checker = program.getTypeChecker();

interface SymbolInfo {
  id: string;
  name: string;
  kind: 'function' | 'class' | 'method' | 'property' | 'const' | 'type' | 'enum';
  file: string;
  project: string;
  line: number;
  exported: boolean;
  generated: boolean;
  usedBy: Map<string, { file: string; line: number; test: boolean; from: string | null }>;
  uses: Set<string>;
}

const symbols = new Map<ts.Node, SymbolInfo>();
const isExported = (node: ts.Node) =>
  ts.canHaveModifiers(node) && (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

function register(node: ts.Node, name: string, kind: SymbolInfo['kind'], sf: ts.SourceFile, exported: boolean) {
  const file = relative(root, sf.fileName);
  symbols.set(node, {
    id: `${file}#${name}`,
    name,
    kind,
    file,
    project: projectOf(sf.fileName),
    line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
    exported,
    generated: kindOf.get(sf.fileName) === 'generated',
    usedBy: new Map(),
    uses: new Set(),
  });
}

// 1. Declarations of interest: top-level declarations and class/object-literal members of production files.
for (const sf of program.getSourceFiles()) {
  const kind = kindOf.get(sf.fileName);
  if (!kind || kind === 'test') continue;
  for (const statement of sf.statements) {
    const exported = isExported(statement);
    if (ts.isFunctionDeclaration(statement) && statement.name) register(statement, statement.name.text, 'function', sf, exported);
    else if (ts.isClassDeclaration(statement) && statement.name) {
      register(statement, statement.name.text, 'class', sf, exported);
      for (const member of statement.members) {
        if ((ts.isMethodDeclaration(member) || ts.isPropertyDeclaration(member)) && member.name && ts.isIdentifier(member.name)) {
          // Private members are included: they are real steps in a request flow.
          register(member, `${statement.name.text}.${member.name.text}`, ts.isMethodDeclaration(member) ? 'method' : 'property', sf, exported);
        }
      }
    } else if (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) register(statement, statement.name.text, 'type', sf, exported);
    else if (ts.isEnumDeclaration(statement)) register(statement, statement.name.text, 'enum', sf, exported);
    else if (ts.isVariableStatement(statement)) {
      for (const decl of statement.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          const isFn = decl.initializer && (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer));
          register(decl, decl.name.text, isFn ? 'function' : 'const', sf, exported);
        }
      }
    }
  }
}

// 2. References: every identifier that resolves to one of those declarations, attributed to the enclosing declaration.
const isImportOrExportName = (node: ts.Node) =>
  ts.isImportSpecifier(node.parent) || ts.isImportClause(node.parent) || ts.isNamespaceImport(node.parent) ||
  ts.isExportSpecifier(node.parent) || ts.isImportEqualsDeclaration(node.parent);

let references = 0;
for (const sf of program.getSourceFiles()) {
  const kind = kindOf.get(sf.fileName);
  if (!kind) continue;
  const test = kind === 'test';
  const enclosing: SymbolInfo[] = [];
  const visit = (node: ts.Node): void => {
    const own = symbols.get(node);
    if (own) enclosing.push(own);
    if (ts.isIdentifier(node) && !isImportOrExportName(node)) {
      const parent = node.parent as ts.Node & { name?: ts.Node };
      const isDeclarationName = parent && parent.name === node && symbols.has(parent);
      if (!isDeclarationName) {
        let symbol = checker.getSymbolAtLocation(node);
        if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
        // A property read through a union (e.g. `modules.map(m => m.typedefs)`) has one declaration per member type.
        const declarations = (symbol?.declarations ?? []).flatMap((d) => {
          const own = symbols.get(d);
          if (own) return [own];
          // Re-exported or aliased declarations: follow them one more step.
          const aliased = ts.isExportSpecifier(d) || ts.isImportSpecifier(d) ? checker.getSymbolAtLocation(d.name) : undefined;
          const resolved = aliased && aliased.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(aliased) : aliased;
          return (resolved?.declarations ?? []).flatMap((rd) => symbols.get(rd) ?? []);
        });
        const from = enclosing.at(-1);
        for (const target of new Set(declarations)) {
          if (target === from) continue;
          const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
          const file = relative(root, sf.fileName);
          target.usedBy.set(`${file}:${line}`, { file, line, test, from: from?.id ?? null });
          if (from && !test) from.uses.add(target.id);
          references++;
        }
      }
    }
    ts.forEachChild(node, visit);
    if (own) enclosing.pop();
  };
  visit(sf);
}

const list = [...symbols.values()].map((s) => {
  const usedBy = [...s.usedBy.values()];
  return {
    id: s.id,
    name: s.name,
    kind: s.kind,
    file: s.file,
    project: s.project,
    line: s.line,
    exported: s.exported,
    generated: s.generated,
    prodUses: usedBy.filter((u) => !u.test).map(({ file, line, from }) => ({ file, line, from })),
    testUses: usedBy.filter((u) => u.test).map(({ file, line }) => ({ file, line })),
    uses: [...s.uses],
  };
});
writeFileSync(out, JSON.stringify({ root: relative(process.cwd(), root), symbols: list }));
const testOnly = list.filter((s) => s.prodUses.length === 0 && s.testUses.length > 0 && !s.generated);
console.log(`${list.length} symbols, ${references} references; used only by tests: ${testOnly.length} -> ${out}`);
console.log('examples:', testOnly.slice(0, 8).map((s) => s.id).join(', '));
