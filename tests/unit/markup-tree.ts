/**
 * A tiny, dependency-free reader for React's static markup (renderToStaticMarkup): enough structure
 * for layout-contract tests to ask "which children does this element have" without a DOM.
 */
export type MarkupNode = { tag: string; attrs: string; children: Array<MarkupNode | string> };

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const TAG = /<(\/?)([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;

export function parseMarkup(html: string): MarkupNode {
  const root: MarkupNode = { tag: '#root', attrs: '', children: [] };
  const stack: MarkupNode[] = [root];
  let last = 0;
  for (const match of html.matchAll(TAG)) {
    const [whole, closing, rawTag, attrs, selfClosing] = match;
    const tag = rawTag!.toLowerCase();
    const top = stack.at(-1)!;
    const text = html.slice(last, match.index);
    if (text) top.children.push(text);
    last = match.index! + whole.length;
    if (closing) {
      const index = stack.map(node => node.tag).lastIndexOf(tag);
      if (index > 0) stack.length = index;
      continue;
    }
    const node: MarkupNode = { tag, attrs: attrs ?? '', children: [] };
    top.children.push(node);
    if (!selfClosing && !VOID.has(tag)) stack.push(node);
  }
  const tail = html.slice(last);
  if (tail) stack.at(-1)!.children.push(tail);
  return root;
}

export const classesOf = (node: MarkupNode) => (/\bclass="([^"]*)"/.exec(node.attrs)?.[1] ?? '').split(/\s+/).filter(Boolean);
export const hasClass = (node: MarkupNode, name: string) => classesOf(node).includes(name);
export const attrOf = (node: MarkupNode, name: string) => new RegExp(`\\b${name}="([^"]*)"`).exec(node.attrs)?.[1];
export const elementChildren = (node: MarkupNode) => node.children.filter((child): child is MarkupNode => typeof child !== 'string');

export function findAll(node: MarkupNode, predicate: (node: MarkupNode) => boolean): MarkupNode[] {
  const found: MarkupNode[] = [];
  const walk = (current: MarkupNode) => {
    for (const child of elementChildren(current)) {
      if (predicate(child)) found.push(child);
      walk(child);
    }
  };
  walk(node);
  return found;
}

const ENTITIES: Record<string, string> = { '&quot;': '"', '&#x27;': "'", '&#39;': "'", '&lt;': '<', '&gt;': '>', '&amp;': '&', '&nbsp;': ' ' };
const decode = (text: string) => text.replace(/&(?:quot|#x27|#39|lt|gt|amp|nbsp);/g, entity => ENTITIES[entity] ?? entity);

/** Visible text of a subtree: TeX sources of MathJax islands and screen-reader-only text excluded. */
export function visibleText(node: MarkupNode): string {
  if (hasClass(node, 'sr-only') || hasClass(node, 'mathjax-inline')) return ' ';
  return node.children.map(child => (typeof child === 'string' ? decode(child) : visibleText(child))).join('');
}
