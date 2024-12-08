import { DEFAULT_OPTIONS, VITE_PLUGIN_NAME } from './constants';
import type { Plugin, ResolvedConfig } from 'vite';
import { NormalizedOutputOptions, OutputBundle } from 'rollup';
import { merge } from './utils';
import fs from 'fs';
import fg from 'fast-glob';
import path from 'path';
import {
  Assign,
  Call,
  Class,
  Echo,
  Engine,
  Expression,
  ExpressionStatement,
  Method,
  Node,
  Program,
  Return,
  Statement,
  If,
  Bin,
  Variable,
  Block,
  Closure,
  Foreach,
  For,
  Declaration,
  Function,
  Trait,
  Array,
  Entry,
  String,
} from 'php-parser';

interface Options {
  extensions?: string[];
  assetPath?: string;
  parserOptions?: any;
  phpFiles?: string[];
  debug?: boolean;
}

interface FoundAsset {
  name: string;
  originalFileName: string;
  filePath: string;
}

/**
 * VitePhpAssetCallers.
 *
 * @param optionsParam
 * @constructor
 */
function VitePhpAssetCallers(optionsParam: Options = {}): Plugin {
  const options: Options = merge(optionsParam, DEFAULT_OPTIONS);
  const foundAssets: Set<FoundAsset> = new Set();
  const emittedAssets: Set<string> = new Set();
  let assetFiles: Set<string>;
  let rootConfig: ResolvedConfig;
  let rootPath: string;
  let fileParsing: string;

  /**
   * Log message.
   *
   * @param msg
   */
  const log = (msg: string) => {
    if (options.debug) {
      rootConfig.logger.info(`${VITE_PLUGIN_NAME}: ${msg}`, { timestamp: true });
    }
  };

  /**
   * Traverse PHP nodes from parser.
   *
   * @param node
   * @param callback
   */
  const traversePhpNodes = (node: Program | Node, callback: (node: Node) => void) => {
    callback(node);

    if ('children' in node) {
      node.children.forEach((node: Node) => traversePhpNodes(node, callback));
    }
  };

  /**
   * Scan PHP asset callers in source code.
   *
   * @param source
   * @param fileName
   */
  const parsePhpSourceCode = (source: string, fileName: string): Set<FoundAsset> => {
    const parser = new Engine(options.parserOptions);
    const ast: Program = parser.parseCode(source, fileName);

    foundAssets.clear();
    fileParsing = fileName;

    if (options.debug) {
      log(`Parsing ${fileName}`);

      if (!ast || !ast.children) {
        throw new Error(`${VITE_PLUGIN_NAME}: AST parsing error in ${fileName}`);
      }
    }

    traversePhpNodes(ast, (node: Node) => resolveNode(node));

    return foundAssets;
  };

  /**
   * Resolve code body.
   *
   * @param body
   */
  const resolveBody = (body: Block | null) => {
    if (body !== null) {
      resolveCodeBlock(body);
    }
  };

  /**
   * Resolve code block.
   *
   * @param block
   */
  const resolveCodeBlock = (block: Block) => {
    if (block && block.children) {
      block.children.forEach((statement: Statement) => resolveStatement(statement));
    }
  };

  /**
   * Resolve general node.
   *
   * @param node
   */
  const resolveNode = (node: Node) => {
    resolveDeclaration(node);
    resolveStatement(node);
    resolveExpression(node);
  };

  /**
   * Resolve general declaration.
   *
   * @param declaration
   */
  const resolveDeclaration = (declaration: Node | Declaration) => {
    if (declaration.kind === 'function') {
      resolveFunctionDeclaration(declaration as Function);
    }
    if (declaration.kind === 'method') {
      resolveMethodDeclaration(declaration as Method);
    }
    if (declaration.kind === 'class') {
      resolveClassDeclaration(declaration as Class);
    }
    if (declaration.kind === 'trait') {
      resolveTraitDeclaration(declaration as Trait);
    }
  };

  /**
   * Resolve general expression.
   *
   * @param expression
   */
  const resolveExpression = (expression: Node | Expression) => {
    if (expression.kind === 'call') {
      resolveCallExpression(expression as Call);
    }
    if (expression.kind === 'assign') {
      resolveAssignExpression(expression as Assign);
    }
    if (expression.kind === 'bin') {
      resolveBinOperationExpression(expression as Bin);
    }
    if (expression.kind === 'closure') {
      resolveClosureExpression(expression as Closure);
    }
    if (expression.kind === 'array') {
      resolveArrayExpression(expression as Array);
    }
    if (expression.kind === 'entry') {
      resolveEntryExpression(expression as Entry);
    }
  };

  /**
   * Resolve general statement.
   *
   * @param statement
   */
  const resolveStatement = (statement: Node | Statement) => {
    if (statement.kind === 'echo') {
      resolveEchoStatement(statement as Echo);
    }
    if (statement.kind === 'return') {
      resolveReturnStatement(statement as Return);
    }
    if (statement.kind === 'expressionstatement') {
      resolveExpressionStatement(statement as ExpressionStatement);
    }
    if (statement.kind === 'if') {
      resolveIfStatement(statement as If);
    }
    if (statement.kind === 'foreach') {
      resolveForeachStatement(statement as Foreach);
    }
    if (statement.kind === 'for') {
      resolveForStatement(statement as For);
    }
  };

  /**
   * Resolve function declaration.
   *
   * @param declaration
   */
  const resolveFunctionDeclaration = (declaration: Function) => {
    resolveBody(declaration.body);
  };

  /**
   * Resolve method declaration.
   *
   * @param declaration
   */
  const resolveMethodDeclaration = (declaration: Method) => {
    resolveBody(declaration.body);
  };

  /**
   * Resolve class declaration.
   *
   * @param declaration
   */
  const resolveClassDeclaration = (declaration: Class) => {
    declaration.body.forEach((method: Method) => {
      resolveBody(method.body);
    });
  };

  /**
   * Resolve trait declaration.
   *
   * @param declaration
   */
  const resolveTraitDeclaration = (declaration: Trait) => {
    declaration.body.forEach((declaration: Declaration) => resolveDeclaration(declaration));
  };

  /**
   * Resolve foreach statement.
   *
   * @param statement
   */
  const resolveForeachStatement = (statement: Foreach) => {
    ['source', 'value'].forEach(key => resolveExpression(statement[key]));

    if (statement.key !== null) {
      resolveExpression(statement.key);
    }

    resolveBody(statement.body);
  };

  /**
   * Resolve for statement.
   *
   * @param statement
   */
  const resolveForStatement = (statement: For) => {
    ['init', 'test', 'increment'].forEach(key => {
      statement[key].forEach((expression: Expression) => resolveExpression(expression));
    });

    resolveCodeBlock(statement.body);
  };

  /**
   * Resolve if statement.
   *
   * @param statement
   */
  const resolveIfStatement = (statement: If) => {
    if (statement.test.kind === 'bin') {
      resolveBinOperationExpression(statement.test as Bin);
    }
    if (statement.alternate !== null) {
      if (statement.alternate.kind === 'if') {
        resolveIfStatement(statement.alternate as If);
      }
      if (statement.alternate.kind === 'block') {
        resolveCodeBlock(statement.alternate as Block);
      }
    }

    resolveCodeBlock(statement.body);
  };

  /**
   * Resolve return statement.
   *
   * @param statement
   */
  const resolveReturnStatement = (statement: Return) => {
    if (statement.expr !== null) {
      resolveExpression(statement.expr);
    }
  };

  /**
   * Resolve echo statement.
   *
   * @param node
   */
  const resolveEchoStatement = (node: Echo) => {
    node.expressions.forEach((expression: Expression | Call) => resolveExpression(expression));
  };

  /**
   * Resolve expression statement.
   *
   * @param statement
   */
  const resolveExpressionStatement = (statement: ExpressionStatement) => {
    resolveExpression(statement.expression);
  };

  /**
   * Resolve closure expression.
   *
   * @param expression
   */
  const resolveClosureExpression = (expression: Closure) => {
    resolveBody(expression.body);
  };

  /**
   * Resolve bin operation expression.
   *
   * @param operation
   */
  const resolveBinOperationExpression = (operation: Bin) => {
    [operation.left, operation.right].forEach(side => resolveExpression(side));
  };

  /**
   * Resolve assign expression.
   *
   * @param expression
   */
  const resolveAssignExpression = (expression: Assign) => {
    [expression.left, expression.right].forEach(side => resolveExpression(side));
  };

  /**
   * Resolve array expression.
   *
   * @param expression
   */
  const resolveArrayExpression = (expression: Array) => {
    expression.items.forEach((item: Entry | Expression | Variable) => resolveExpression(item));
  };

  /**
   * Resolve entry expression.
   *
   * @param expression
   */
  const resolveEntryExpression = (expression: Entry) => {
    if (expression.key !== null) {
      resolveNode(expression.key);
    }

    resolveNode(expression.value);
  };

  /**
   * Resolve call expression node.
   *
   * @param expression
   */
  const resolveCallExpression = (expression: Expression | Call) => {
    if (!isCallExpression(expression)) {
      return; // Skip non-call expressions
    }
    const args: Expression[] = expression.arguments;

    if (!args) {
      return; // Skip invalid call expressions
    }

    //console.log(expression)

    if (findAssetsFromCallerArgs(args) === false) {
      expression.arguments.forEach((expression: Expression) => resolveExpression(expression));
    }
  };

  /**
   * Process assets for a given caller and its arguments.
   *
   * @param args
   */
  const findAssetsFromCallerArgs = (args: Expression[]) => {
    for (const callerArg of args) {
      if (!isValidStringArg(callerArg)) continue;

      const stringArg: String = callerArg as String;
      const assetFile = findMatchingAssetFile(stringArg.value);

      if (assetFile) {
        log(`Matched the following argument: '${stringArg.value}'`);
        queueAssetFileForEmission(assetFile);

        return true;
      }
    }

    return false;
  };

  /**
   * Match a file name or partial path with the full path in the asset files Set.
   *
   * @param {string} partialPath
   * @returns {string|null}
   */
  const findMatchingAssetFile = (partialPath: string): string | null => {
    if (isValidFilePath(partialPath)) {
      for (const fullPath of assetFiles) {
        if (fullPath.endsWith(partialPath)) {
          return fullPath;
        }
      }
    }

    return null;
  };

  /**
   * Que asset file for emit.
   *
   * @param assetFile
   */
  const queueAssetFileForEmission = (assetFile: string) => {
    if (!emittedAssets.has(assetFile) && fs.existsSync(assetFile)) {
      log(`Matched & emitting '${path.basename(assetFile)}'`);
      emittedAssets.add(assetFile);
      foundAssets.add({
        name: path.basename(assetFile),
        originalFileName: assetFile.replace(path.posix.join(rootPath, '/'), ''),
        filePath: assetFile,
      });
    }
  };

  /**
   * Check if an expression is a call expression.
   *
   * @param expression
   * @returns
   */
  const isCallExpression = (expression: Expression | Call): expression is Call => {
    return expression.kind === 'call' && 'what' in expression;
  };

  /**
   * Check if a caller argument is valid.
   *
   * @param callerArg
   * @returns
   */
  const isValidStringArg = (callerArg: Expression) => {
    return 'value' in callerArg && typeof callerArg.value === 'string';
  };

  /**
   * Check if it's a valid file path.
   *
   * @param filePath
   */
  const isValidFilePath = (filePath: string) => {
    const regex = new RegExp(`^(?!/|[A-Za-z]:\\\\)(.*\\.(?:${options.extensions.join('|')}))$`);
    return typeof filePath === 'string' && regex.test(filePath);
  };

  /**
   * Get all asset files from the project.
   */
  const getProjectAssetFiles = async () => {
    const patterns = options.extensions.map(ext => `**/*.${ext}`);
    const absoluteAssetPath = path.join(rootPath, options.assetPath);
    assetFiles = new Set(await fg(patterns, { cwd: absoluteAssetPath, absolute: true }));

    if (options.debug) {
      log(`Will use the following path to search asset files:`);
      log(`${absoluteAssetPath}`);
      for (const fullPath of assetFiles) {
        log(`Found ${fullPath}`);
      }
    }
  };

  /**
   * Vite Plugin.
   */
  return {
    name: VITE_PLUGIN_NAME,
    enforce: 'post',

    /**
     * Get Resolved Config.
     *
     * @param c
     */
    configResolved(c) {
      rootConfig = c;
      rootPath = c.root;
    },

    /**
     * Generate Bundle Hook.
     *
     * @param bundleOptions
     * @param bundle
     */
    async generateBundle(bundleOptions: NormalizedOutputOptions, bundle: OutputBundle) {
      log('Log started..');

      await getProjectAssetFiles();

      const parseAndEmit = (source: string, fileName: string) => {
        parsePhpSourceCode(source, fileName).forEach((asset: FoundAsset) => {
          this.emitFile({
            type: 'asset',
            name: asset.name,
            originalFileName: asset.originalFileName,
            source: fs.readFileSync(asset.filePath),
          });
        });
      };

      for (let module of Object.values(bundle)) {
        if (module.fileName.endsWith('.php') && 'source' in module) {
          parseAndEmit(module.source.toString(), module.fileName);
        }
      }

      for (const phpFile of await fg(options.phpFiles)) {
        if (fs.existsSync(phpFile)) {
          this.addWatchFile(phpFile);
          parseAndEmit(fs.readFileSync(phpFile).toString(), path.basename(phpFile));
        } else {
          this.error(`${VITE_PLUGIN_NAME}: ${phpFile} does not exist.`);
        }
      }
    },
  };
}

export { VitePhpAssetCallers };
