export const TYPE_WRAPPERS = new Set([
  'TSAsExpression',
  'TSSatisfiesExpression',
]);

/**
 * What a `const` holds, when an identifier names one. Anything that can be reassigned, or that
 * is not a plain variable, holds nothing a rule can know, so it resolves to nothing.
 */
export const constantValue = (context, identifier) => {
  for (
    let scope = context.sourceCode.getScope(identifier);
    scope;
    scope = scope.upper
  ) {
    const variable = scope.set.get(identifier.name);
    if (!variable) continue;
    const [definition] = variable.defs;
    const isConstant =
      definition?.type === 'Variable' &&
      definition.parent.kind === 'const' &&
      definition.node.id.type === 'Identifier';
    return isConstant ? definition.node.init : null;
  }
  return null;
};
