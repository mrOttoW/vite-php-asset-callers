import { DEFAULT_OPTIONS, VITE_PLUGIN_NAME } from './constants';
import type { Plugin, ResolvedConfig } from 'vite';
import { NormalizedOutputOptions, OutputBundle } from 'rollup';
import { merge } from './utils';
import fs from 'fs';
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
  StaticLookup,
} from 'php-parser';

interface Options {
  assetOptions: Record<string, AssetOption>;
  parserOptions?: any;
  phpFiles?: string[];
  debug?: boolean;
}

interface AssetOption {
  path: string;
  extensions: string[];
  caller: string;
  method?: string;
  arg?: Number;
}

/**
 * VitePhpAssetCallers.
 *
 * @param optionsParam
 * @constructor
 */
function VitePhpAssetCallers(optionsParam: Options = { assetOptions: undefined }): Plugin {
  const options: Options = merge(optionsParam, DEFAULT_OPTIONS);
  const emittedAssets = new Set();
  let rootPath: string;
  let rootConfig: ResolvedConfig;
  let fileParsing: string;

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
  const isValidCallerArg = (callerArg: Expression) => {
    return 'value' in callerArg && typeof callerArg.value === 'string';
  };

  /**
   * Check if an asset file matches allowed extensions.
   *
   * @param asset
   * @param assetFile
   * @returns
   */
  const isValidAssetFile = (asset: AssetOption, assetFile: string): boolean => {
    return asset.extensions.some((ext: string) => assetFile.endsWith(`.${ext}`));
  };

  /**
   * Parse a call expression into its components.
   *
   * @param expression
   * @returns
   */
  const parseCallExpression = (expression: Call) => {
    const isClassCall =
      expression.what.kind === 'staticlookup' || expression.what.kind === 'propertylookup' || expression.what.kind === 'call';

    const args: Expression[] = expression.arguments;
    // @ts-ignore types in php-parser are conflicting here.
    const caller = isClassCall ? expression.what.what.name : expression.what.name;
    // @ts-ignore types in php-parser are conflicting here.
    const method = isClassCall ? expression.what.offset.name : null;

    return { caller, args, method };
  };

  /**
   * Process assets for a given caller and its arguments.
   *
   * @param caller
   * @param method
   * @param args
   * @param found
   */
  const findAssetsForCaller = (caller: Node | string, method: string, args: Expression[], found: any[]) => {
    let isAssetCall = false;

    for (const type in options.assetOptions) {
      const asset = options.assetOptions[type];

      if ('method' in asset && method !== null && asset.method !== method) {
        continue;
      }

      if (caller !== asset.caller) {
        continue;
      }

      isAssetCall = true;

      const argIndex = 'arg' in asset ? asset.arg : 0;
      const callerArg = args[String(argIndex)];

      if (!isValidCallerArg(callerArg)) {
        continue;
      }

      const assetFile = callerArg.value;
      if (!isValidAssetFile(asset, assetFile)) {
        continue;
      }

      const assetPath = path.resolve(rootPath, asset.path, assetFile);
      if (!emittedAssets.has(assetPath) && fs.existsSync(assetPath)) {
        emittedAssets.add(assetPath);
        found.push({
          name: assetFile,
          originalFileName: path.join(asset.path, assetFile),
          filePath: assetPath,
        });
      }
    }

    return isAssetCall;
  };

  /**
   * Resolve code body.
   *
   * @param body
   * @param found
   */
  const resolveCodeBody = (body: Block | null, found: string[]) => {
    if (body !== null) {
      resolveCodeBlock(body, found);
    }
  };

  /**
   * Resolve code block.
   *
   * @param block
   * @param found
   */
  const resolveCodeBlock = (block: Block, found: string[]) => {
    if (block && block.children) {
      block.children.forEach((statement: Statement) => resolveStatement(statement, found));
    }
  };

  /**
   * Traverse PHP nodes from parser.
   *
   * @param node
   * @param callback
   */
  const traversePhpNodes = (node, callback) => {
    callback(node);
    if (node.children) {
      node.children.forEach(child => traversePhpNodes(child, callback));
    }
  };

  /**
   * Scan PHP asset callers in source code.
   *
   * @param source
   * @param fileName
   * @param found
   */
  const parsePhpSourceCode = (source: string, fileName: string, found = []) => {
    const parser = new Engine(options.parserOptions);
    const ast: Program = parser.parseCode(source, fileName);

    fileParsing = fileName;

    if (options.debug) {
      rootConfig.logger.info(`${VITE_PLUGIN_NAME}: Parsing ${fileName}`, { timestamp: true });

      if (!ast || !ast.children) {
        throw new Error(`${VITE_PLUGIN_NAME}: AST parsing error in ${fileName}`);
      }
    }

    traversePhpNodes(ast, (node: Node) => resolveNode(node, found));

    return found;
  };

  /**
   * Resolve general node.
   *
   * @param node
   * @param found
   */
  const resolveNode = (node: Node, found: string[]) => {
    resolveDeclaration(node, found);
    resolveStatement(node, found);
    resolveExpression(node, found);
  };

  /**
   * Resolve general declaration.
   *
   * @param declaration
   * @param found
   */
  const resolveDeclaration = (declaration: Node | Declaration, found: string[]) => {
    if (declaration.kind === 'function') {
      resolveFunctionDeclaration(declaration as Function, found);
    }
    if (declaration.kind === 'method') {
      resolveMethodDeclaration(declaration as Method, found);
    }
    if (declaration.kind === 'class') {
      resolveClassDeclaration(declaration as Class, found);
    }
    if (declaration.kind === 'trait') {
      resolveTraitDeclaration(declaration as Trait, found);
    }
  };

  /**
   * Resolve general expression.
   *
   * @param expression
   * @param found
   */
  const resolveExpression = (expression: Node | Expression, found: string[]) => {
    if (expression.kind === 'call') {
      resolveCallExpression(expression as Call, found);
    }
    if (expression.kind === 'assign') {
      resolveAssignExpression(expression as Assign, found);
    }
    if (expression.kind === 'bin') {
      resolveBinOperationExpression(expression as Bin, found);
    }
    if (expression.kind === 'closure') {
      resolveClosureExpression(expression as Closure, found);
    }
    if (expression.kind === 'array') {
      resolveArrayExpression(expression as Array, found);
    }
    if (expression.kind === 'entry') {
      resolveEntryExpression(expression as Entry, found);
    }
  };

  /**
   * Resolve general statement.
   *
   * @param statement
   * @param found
   */
  const resolveStatement = (statement: Node | Statement, found: string[]) => {
    if (statement.kind === 'echo') {
      resolveEchoStatement(statement as Echo, found);
    }
    if (statement.kind === 'return') {
      resolveReturnStatement(statement as Return, found);
    }
    if (statement.kind === 'expressionstatement') {
      resolveExpressionStatement(statement as ExpressionStatement, found);
    }
    if (statement.kind === 'if') {
      resolveIfStatement(statement as If, found);
    }
    if (statement.kind === 'foreach') {
      resolveForeachStatement(statement as Foreach, found);
    }
    if (statement.kind === 'for') {
      resolveForStatement(statement as For, found);
    }
  };

  /**
   * Resolve function declaration.
   *
   * @param declaration
   * @param found
   */
  const resolveFunctionDeclaration = (declaration: Function, found: string[]) => {
    resolveCodeBody(declaration.body, found);
  };

  /**
   * Resolve method declaration.
   *
   * @param declaration
   * @param found
   */
  const resolveMethodDeclaration = (declaration: Method, found: string[]) => {
    resolveCodeBody(declaration.body, found);
  };

  /**
   * Resolve class declaration.
   *
   * @param declaration
   * @param found
   */
  const resolveClassDeclaration = (declaration: Class, found: string[]) => {
    declaration.body.forEach((method: Method) => {
      resolveCodeBody(method.body, found);
    });
  };

  /**
   * Resolve trait declaration.
   *
   * @param declaration
   * @param found
   */
  const resolveTraitDeclaration = (declaration: Trait, found: string[]) => {
    declaration.body.forEach((declaration: Declaration) => resolveDeclaration(declaration, found));
  };

  /**
   * Resolve foreach statement.
   *
   * @param statement
   * @param found
   */
  const resolveForeachStatement = (statement: Foreach, found: string[]) => {
    ['source', 'value'].forEach(key => resolveExpression(statement[key], found));

    if (statement.key !== null) {
      resolveExpression(statement.key, found);
    }

    resolveCodeBody(statement.body, found);
  };

  /**
   * Resolve for statement.
   *
   * @param statement
   * @param found
   */
  const resolveForStatement = (statement: For, found: string[]) => {
    ['init', 'test', 'increment'].forEach(key => {
      statement[key].forEach((expression: Expression) => resolveExpression(expression, found));
    });

    resolveCodeBlock(statement.body, found);
  };

  /**
   * Resolve if statement.
   *
   * @param statement
   * @param found
   */
  const resolveIfStatement = (statement: If, found: string[]) => {
    if (statement.test.kind === 'bin') {
      resolveBinOperationExpression(statement.test as Bin, found);
    }
    if (statement.alternate !== null) {
      if (statement.alternate.kind === 'if') {
        resolveIfStatement(statement.alternate as If, found);
      }
      if (statement.alternate.kind === 'block') {
        resolveCodeBlock(statement.alternate as Block, found);
      }
    }

    resolveCodeBlock(statement.body, found);
  };

  /**
   * Resolve return statement.
   *
   * @param statement
   * @param found
   */
  const resolveReturnStatement = (statement: Return, found: string[]) => {
    if (statement.expr !== null) {
      resolveExpression(statement.expr, found);
    }
  };

  /**
   * Resolve echo statement.
   *
   * @param node
   * @param found
   */
  const resolveEchoStatement = (node: Echo, found: string[]) => {
    node.expressions.forEach((expression: Expression | Call) => resolveExpression(expression, found));
  };

  /**
   * Resolve expression statement.
   *
   * @param statement
   * @param found
   */
  const resolveExpressionStatement = (statement: ExpressionStatement, found: string[]) => {
    resolveExpression(statement.expression, found);
  };

  /**
   * Resolve closure expression.
   *
   * @param expression
   * @param found
   */
  const resolveClosureExpression = (expression: Closure, found: string[]) => {
    resolveCodeBody(expression.body, found);
  };

  /**
   * Resolve bin operation expression.
   *
   * @param operation
   * @param found
   */
  const resolveBinOperationExpression = (operation: Bin, found: string[]) => {
    [operation.left, operation.right].forEach(side => resolveExpression(side, found));
  };

  /**
   * Resolve assign expression.
   *
   * @param expression
   * @param found
   */
  const resolveAssignExpression = (expression: Assign, found: string[]) => {
    [expression.left, expression.right].forEach(side => resolveExpression(side, found));
  };

  /**
   * Resolve array expression.
   *
   * @param expression
   * @param found
   */
  const resolveArrayExpression = (expression: Array, found: string[]) => {
    expression.items.forEach((item: Entry | Expression | Variable) => resolveExpression(item, found));
  };

  /**
   * Resolve entry expression.
   *
   * @param expression
   * @param found
   */
  const resolveEntryExpression = (expression: Entry, found: string[]) => {
    if (expression.key !== null) {
      resolveNode(expression.key, found);
    }

    resolveNode(expression.value, found);
  };

  /**
   * Resolve call expression node.
   *
   * @param expression
   * @param found
   */
  const resolveCallExpression = (expression: Expression | Call, found: string[]) => {
    if (!isCallExpression(expression)) {
      return; // Skip non-call expressions
    }
    const { caller, method, args } = parseCallExpression(expression);

    if (!caller || !args) {
      return; // Skip invalid call expressions
    }

    if (findAssetsForCaller(caller, method, args, found) === false) {
      expression.arguments.forEach((expression: Expression) => resolveExpression(expression, found));
    }
  };

  /**
   * Vite Plugin.
   */
  return {
    name: VITE_PLUGIN_NAME,
    enforce: 'post',
    apply: 'build',

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
      const parseAndEmit = (source: string, fileName: string) => {
        parsePhpSourceCode(source, fileName).forEach(asset => {
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

      for (const phpFile of options.phpFiles) {
        if (fs.existsSync(phpFile)) {
          parseAndEmit(fs.readFileSync(phpFile).toString(), path.basename(phpFile));
        } else {
          throw new Error(`${VITE_PLUGIN_NAME}: ${phpFile} does not exist.`);
        }
      }
    },
  };
}

export { VitePhpAssetCallers };
