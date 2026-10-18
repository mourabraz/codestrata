// Usage: node src/export-flow.ts <repo-root> <out.json>
// Extracts the links a request flow needs that are not plain calls in the code (a first rehearsal of the GraphQL layer):
//   - schema field ↔ resolver entry (typed GQL*Resolvers maps), with the lines of each entry
//   - persisted operation → schema fields it selects
//   - the HTTP entry point (graphqlEndpoint of the GraphQL server)
//   - DataLoader indirection: method → loader.load → what the batch function calls
//   - exits: RestClient.get / GraphQLClient.request calls, their path or operation, and which API client they use
// Symbol ids match export-usage.ts: "<file>#<Name>" or "<file>#<Class>.<member>".
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative, resolve } from 'node:path';
import ts from 'typescript';
import { listSourceFiles } from './files.ts';

const root = resolve(process.argv[2]);
const out = resolve(process.argv[3]);
const files = listSourceFiles(root).filter((f) => f.kind !== 'declaration' && f.kind !== 'test');
const configPath = ts.findConfigFile(root, ts.sys.fileExists) ?? join(root, 'tsconfig.json');
const parsed = ts.getParsedCommandLineOfConfigFile(configPath, { ignoreDeprecations: '6.0' }, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} });
const program = ts.createProgram({ rootNames: files.map((f) => f.path), options: { ...parsed?.options, noEmit: true, skipLibCheck: true, ignoreDeprecations: '6.0' } });
const checker = program.getTypeChecker();
const own = new Set(files.map((f) => f.path));
const rel = (sf: ts.SourceFile) => relative(root, sf.fileName);
/** "<file>#Class.member" → "<file>#Class" (file paths contain dots, so split after the '#'). */
const classOf = (id: string) => {
  const [file, name = ''] = id.split('#');
  return `${file}#${name.split('.')[0]}`;
};
const lineOf = (node: ts.Node) => node.getSourceFile().getLineAndCharacterOfPosition(node.getStart()).line + 1;
const endLineOf = (node: ts.Node) => node.getSourceFile().getLineAndCharacterOfPosition(node.getEnd()).line + 1;

/** Id of the declaration enclosing `node`, in the same scheme as export-usage.ts. */
function enclosingId(node: ts.Node): string | null {
  let current: ts.Node | undefined = node;
  let member: string | null = null;
  while (current) {
    if ((ts.isMethodDeclaration(current) || ts.isPropertyDeclaration(current)) && ts.isIdentifier(current.name) && ts.isClassDeclaration(current.parent)) {
      member = current.name.text;
    }
    if (ts.isSourceFile(current.parent ?? current)) {
      const sf = current.getSourceFile();
      if (ts.isFunctionDeclaration(current) && current.name) return `${rel(sf)}#${current.name.text}`;
      if (ts.isClassDeclaration(current) && current.name) return `${rel(sf)}#${current.name.text}${member ? `.${member}` : ''}`;
      if (ts.isVariableStatement(current)) {
        const decl = current.declarationList.declarations.find((d) => d.pos <= node.pos && node.end <= d.end) ?? current.declarationList.declarations[0];
        return ts.isIdentifier(decl.name) ? `${rel(sf)}#${decl.name.text}` : null;
      }
      return null;
    }
    current = current.parent;
  }
  return null;
}

function declarationId(symbol: ts.Symbol | undefined): string | null {
  if (!symbol) return null;
  if (symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
  const decl = symbol.declarations?.[0];
  if (!decl || !own.has(decl.getSourceFile().fileName)) return null;
  return enclosingId(decl.name ?? decl);
}

const resolverFields: { type: string; field: string; file: string; line: number; endLine: number }[] = [];
const loaders: { owner: string; field: string; file: string; line: number; targets: string[]; users: string[]; exits: number[] }[] = [];
const exits: { from: string | null; via: 'call' | 'loader'; kind: 'rest' | 'graphql'; method: string; path: string; client: string | null; clientVia: string; file: string; line: number }[] = [];
const serviceClient = new Map<string, string>(); // class id -> clients key
const clientNames = new Map<string, string>(); // clients key -> client name
const entries: { method: string; path: string; file: string; line: number; app: string }[] = [];

const stringArg = (node: ts.Expression | undefined): string | null => {
  if (!node) return null;
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isIdentifier(node)) {
    const decl = checker.getSymbolAtLocation(node)?.declarations?.[0];
    if (decl && ts.isVariableDeclaration(decl) && decl.initializer && ts.isNoSubstitutionTemplateLiteral(decl.initializer)) return decl.initializer.text;
    if (decl && ts.isVariableDeclaration(decl) && decl.initializer && ts.isTemplateExpression(decl.initializer)) return decl.initializer.head.text + decl.initializer.templateSpans.map((s) => s.literal.text).join('');
    let symbol = checker.getSymbolAtLocation(node);
    if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
    const d = symbol?.declarations?.[0];
    if (d && ts.isVariableDeclaration(d) && d.initializer && ts.isTemplateExpression(d.initializer)) return d.initializer.head.text + d.initializer.templateSpans.map((s) => s.literal.text).join('');
  }
  return null;
};
const nameProp = (obj: ts.Expression | undefined, key: string): string | null => {
  if (!obj || !ts.isObjectLiteralExpression(obj)) return null;
  for (const p of obj.properties) if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === key && ts.isStringLiteralLike(p.initializer)) return p.initializer.text;
  return null;
};
const isHttpClientMember = (expr: ts.PropertyAccessExpression, method: string) => {
  if (expr.name.text !== method) return false;
  const decl = checker.getSymbolAtLocation(expr.name)?.declarations?.[0];
  return !!decl && decl.getSourceFile().fileName.includes('http-client');
};

for (const sf of program.getSourceFiles()) {
  if (!own.has(sf.fileName)) continue;
  const visit = (node: ts.Node): void => {
    // 1. Resolver maps: `const x: GQLTitleResolvers = { field: ... }` and `const resolvers: GQLResolvers = { Type: { field } }`.
    if (ts.isVariableDeclaration(node) && node.type && ts.isTypeReferenceNode(node.type) && node.initializer && ts.isObjectLiteralExpression(node.initializer)) {
      const typeName = node.type.typeName.getText();
      const match = /^GQL(\w+)Resolvers$/.exec(typeName);
      const addFields = (type: string, obj: ts.ObjectLiteralExpression) => {
        for (const p of obj.properties) {
          if (!(ts.isPropertyAssignment(p) || ts.isMethodDeclaration(p) || ts.isShorthandPropertyAssignment(p)) || !p.name || !ts.isIdentifier(p.name)) continue;
          if (p.name.text === '__resolveType') continue;
          resolverFields.push({ type, field: p.name.text, file: rel(sf), line: lineOf(p), endLine: endLineOf(p) });
        }
      };
      if (typeName === 'GQLResolvers') {
        for (const p of node.initializer.properties) {
          if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && ts.isObjectLiteralExpression(p.initializer)) addFields(p.name.text, p.initializer);
        }
      } else if (match) addFields(match[1], node.initializer);
    }
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      // 3. HTTP entry: createYoga({ graphqlEndpoint: '/api' })
      if (ts.isIdentifier(callee) && callee.text === 'createYoga') {
        const path = nameProp(node.arguments[0], 'graphqlEndpoint');
        entries.push({ method: 'POST', path: path ?? '/graphql', file: rel(sf), line: lineOf(node), app: rel(sf).split('/').slice(0, 2).join('/') });
      }
      // 5. Exits
      if (ts.isPropertyAccessExpression(callee) && (isHttpClientMember(callee, 'get') || isHttpClientMember(callee, 'request'))) {
        const isRest = callee.name.text === 'get';
        let target = stringArg(node.arguments[0]) ?? '?';
        if (!isRest) target = /(query|mutation)\s+(\w+)/.exec(target)?.[2] ?? 'operation';
        let client: string | null = null;
        let clientVia = 'unknown';
        const receiver = callee.expression;
        const recvDecl = ts.isIdentifier(receiver) ? checker.getSymbolAtLocation(receiver)?.declarations?.[0] : undefined;
        if (recvDecl && ts.isVariableDeclaration(recvDecl) && recvDecl.initializer && ts.isCallExpression(recvDecl.initializer)) {
          client = nameProp(recvDecl.initializer.arguments[0], 'name');
          clientVia = 'local client';
        } else if (ts.isPropertyAccessExpression(receiver) && receiver.expression.kind === ts.SyntaxKind.ThisKeyword) {
          client = `field:${receiver.name.text}`;
          clientVia = 'service field';
        } else if (ts.isIdentifier(receiver)) {
          client = 'param';
          clientVia = 'parameter';
        }
        const from = enclosingId(node);
        // Inside a DataLoader batch function, the exit belongs to the loader.
        let inLoader = false;
        for (let p: ts.Node | undefined = node.parent; p; p = p.parent) {
          if (ts.isNewExpression(p) && p.expression.getText() === 'DataLoader') { inLoader = true; break; }
        }
        exits.push({ from, via: inLoader ? 'loader' : 'call', kind: isRest ? 'rest' : 'graphql', method: isRest ? 'GET' : 'query', path: target, client, clientVia, file: rel(sf), line: lineOf(node) });
      }
      // createClients: `catalogApi: createRestClient({ name: 'catalog-api' })`
      if (ts.isIdentifier(callee) && /^create(Rest|GraphQL)Client$/.test(callee.text) && ts.isPropertyAssignment(node.parent) && ts.isIdentifier(node.parent.name)) {
        const name = nameProp(node.arguments[0], 'name');
        if (name) clientNames.set(node.parent.name.text, name);
      }
    }
    // `new PromotionsService(clients.promotionsApi)` → which client a service class gets.
    if (ts.isNewExpression(node) && node.arguments?.[0] && ts.isPropertyAccessExpression(node.arguments[0]) && node.arguments[0].expression.getText() === 'clients') {
      const classId = declarationId(checker.getSymbolAtLocation(node.expression));
      if (classId) serviceClient.set(classId, node.arguments[0].name.text);
    }
    // 4. DataLoader: `this.loader = new DataLoader(async (ids) => { ... })`
    if (ts.isNewExpression(node) && node.expression.getText() === 'DataLoader' && ts.isBinaryExpression(node.parent) && ts.isPropertyAccessExpression(node.parent.left)) {
      const field = node.parent.left.name.text;
      const owner = classOf(enclosingId(node) ?? '?#?');
      const targets = new Set<string>();
      const batch = node.arguments?.[0];
      const walk = (n: ts.Node): void => {
        if (ts.isCallExpression(n)) {
          const nameNode = ts.isPropertyAccessExpression(n.expression) ? n.expression.name : n.expression;
          const id = declarationId(checker.getSymbolAtLocation(nameNode));
          if (id && id !== owner) targets.add(id);
        }
        ts.forEachChild(n, walk);
      };
      if (batch) walk(batch);
      loaders.push({ owner, field, file: rel(sf), line: lineOf(node), targets: [...targets], users: [], exits: [] });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

// Methods that call this.<loader>.load / loadMany use the loader.
for (const sf of program.getSourceFiles()) {
  if (!own.has(sf.fileName)) continue;
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && /^load(Many)?$/.test(node.expression.name.text)) {
      const recv = node.expression.expression;
      if (ts.isPropertyAccessExpression(recv) && recv.expression.kind === ts.SyntaxKind.ThisKeyword) {
        const user = enclosingId(node);
        const loader = loaders.find((l) => l.field === recv.name.text && user && classOf(user) === l.owner);
        if (loader && user) loader.users.push(user);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}
exits.forEach((exit, index) => {
  if (exit.via !== 'loader') return;
  const loader = loaders.find((l) => l.file === exit.file && exit.from && classOf(exit.from) === l.owner);
  loader?.exits.push(index);
});

// Resolve which API each exit talks to: service field → clients key (constructor wiring) → client name.
const callersOf = new Map<string, Set<string>>();
for (const sf of program.getSourceFiles()) {
  if (!own.has(sf.fileName)) continue;
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const nameNode = ts.isPropertyAccessExpression(node.expression) ? node.expression.name : node.expression;
      const id = declarationId(checker.getSymbolAtLocation(nameNode));
      const from = enclosingId(node);
      if (id && from) {
        if (!callersOf.has(id)) callersOf.set(id, new Set());
        callersOf.get(id)!.add(from);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}
const apiOfClass = (classId: string) => {
  const key = serviceClient.get(classId);
  return key ? (clientNames.get(key) ?? key) : null;
};
for (const exit of exits) {
  if (exit.client?.startsWith('field:')) {
    const cls = exit.from ? classOf(exit.from) : '';
    exit.client = apiOfClass(cls) ?? exit.client;
    exit.clientVia = 'heuristic: service field → clients key → createClients name';
  } else if (exit.client === 'param' && exit.from) {
    // A retriever gets the client as a parameter: look at the service classes that call it.
    const classes = [...(callersOf.get(exit.from) ?? [])].map(classOf);
    const api = classes.map(apiOfClass).find(Boolean) ?? null;
    exit.client = api;
    exit.clientVia = 'heuristic: caller service → clients key → createClients name';
  }
}

// 2. Persisted operations → Type.field they select (validated against the printed monolith schema).
const require = createRequire(join(root, 'package.json'));
const graphql = require('graphql') as typeof import('graphql');
const schema = graphql.buildSchema(readFileSync(join(root, 'apps/bff/schema.graphql'), 'utf8'), { assumeValidSDL: true });
const opsDir = join(root, 'apps/bff/persisted-operations');
const operations = readdirSync(opsDir).filter((f) => f.endsWith('.graphql')).map((file) => {
  const doc = graphql.parse(readFileSync(join(opsDir, file), 'utf8'));
  const info = new graphql.TypeInfo(schema);
  const fields: { type: string; field: string; path: string }[] = [];
  const path: string[] = [];
  graphql.visit(doc, graphql.visitWithTypeInfo(info, {
    Field: {
      enter(node) {
        const parent = info.getParentType();
        path.push(node.name.value);
        if (parent && !node.name.value.startsWith('__')) fields.push({ type: parent.name, field: node.name.value, path: path.join('.') });
      },
      leave() { path.pop(); },
    },
  }));
  const name = (doc.definitions[0] as { name?: { value: string } }).name?.value ?? file;
  return { name, file: `apps/bff/persisted-operations/${file}`, fields };
});

writeFileSync(out, JSON.stringify({ entries, operations, resolverFields, loaders, exits, clientNames: Object.fromEntries(clientNames) }, null, 1));
console.log(`entries ${entries.map((e) => `${e.app} ${e.method} ${e.path}`).join(', ')}; ${operations.length} operations; ${resolverFields.length} resolver fields; ${loaders.length} loaders; ${exits.length} exits`);
for (const e of exits) console.log(`  exit ${e.method} ${e.path} → ${e.client} (${e.clientVia}) from ${e.from} [${e.via}]`);
for (const l of loaders) console.log(`  loader ${l.owner}.${l.field}: users ${l.users.join(', ')} → targets ${l.targets.join(', ')} exits ${l.exits}`);
