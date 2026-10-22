import { constantValue, TYPE_WRAPPERS } from './static-values.mjs';

const JSON_LD_TYPE = 'application/ld+json';

const HELPER = 'jsonLdText';

const unwrap = (node) =>
  node && TYPE_WRAPPERS.has(node.type) ? unwrap(node.expression) : node;

/**
 * Whether an expression is the JSON-LD media type without running anything: a literal, a
 * template with no substitutions, or a `const` holding one.
 */
const isJsonLdType = (context, node, seen = new Set()) => {
  const value = unwrap(node);
  if (!value) return false;
  switch (value.type) {
    case 'JSXExpressionContainer':
      return isJsonLdType(context, value.expression, seen);
    case 'Literal':
      return value.value === JSON_LD_TYPE;
    case 'TemplateLiteral':
      return (
        value.expressions.length === 0 &&
        value.quasis[0].value.cooked === JSON_LD_TYPE
      );
    case 'Identifier':
      if (seen.has(value.name)) return false;
      seen.add(value.name);
      return isJsonLdType(context, constantValue(context, value), seen);
    default:
      return false;
  }
};

const isHelperCall = (node) => {
  const value = unwrap(node);
  return (
    value?.type === 'CallExpression' &&
    value.callee.type === 'Identifier' &&
    value.callee.name === HELPER
  );
};

const propertyNamed = (object, name) =>
  object.properties.find(
    (property) =>
      property.type === 'Property' &&
      !property.computed &&
      ((property.key.type === 'Identifier' && property.key.name === name) ||
        (property.key.type === 'Literal' && property.key.value === name)),
  );

const jsxAttribute = (element, name) =>
  element.attributes.find(
    (attribute) =>
      attribute.type === 'JSXAttribute' &&
      attribute.name.type === 'JSXIdentifier' &&
      attribute.name.name === name,
  );

/**
 * The `__html` a `dangerouslySetInnerHTML={{ __html: … }}` attribute sets, when it is written as
 * an object literal.
 */
const innerHtmlValue = (attribute) => {
  const expression = unwrap(attribute?.value?.expression);
  if (expression?.type !== 'ObjectExpression') return null;
  return propertyNamed(expression, '__html')?.value ?? null;
};

/**
 * A JSON-LD script is written into the page as raw text, and the HTML parser ends a `<script>` at
 * the first `</script` it meets, whatever JSON string it sits in. `JSON.stringify` does not escape
 * `<`, so a meetup title or an organisation name carrying `</script>` closed the script and the
 * rest of the value was read as markup on a public page. `jsonLdText` escapes every `<`, so the
 * only script text a JSON-LD script may carry is a call to it.
 *
 * Two shapes are read: a head entry, an object literal whose `type` is the JSON-LD media type and
 * whose `children` is the text, and a JSX `<script>` of that type, whose text is the `__html` of
 * `dangerouslySetInnerHTML`.
 */
export const jsonLdScriptText = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      unescaped:
        "A JSON-LD script's text must be `jsonLdText(…)` from apps/ui/src/lib/seo-structured-data.ts: `JSON.stringify` leaves `<` as it is, so a value carrying `</script>` ends the script and the rest is read as HTML.",
    },
  },
  create: (context) => ({
    ObjectExpression: (node) => {
      const type = propertyNamed(node, 'type');
      if (!type || !isJsonLdType(context, type.value)) return;
      if (isHelperCall(propertyNamed(node, 'children')?.value)) return;
      context.report({ node, messageId: 'unescaped' });
    },
    JSXOpeningElement: (node) => {
      if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'script')
        return;
      const type = jsxAttribute(node, 'type');
      if (!type || !isJsonLdType(context, type.value)) return;
      const html = innerHtmlValue(
        jsxAttribute(node, 'dangerouslySetInnerHTML'),
      );
      if (isHelperCall(html)) return;
      context.report({ node, messageId: 'unescaped' });
    },
  }),
};
