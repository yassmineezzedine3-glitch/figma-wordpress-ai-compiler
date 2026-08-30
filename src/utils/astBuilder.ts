import { ASTNode, Token } from '../types/compiler';
import { ClientComponentTokenizer } from './tokenizer';

export class ClientASTBuilder {
  constructor(private tokenizer: ClientComponentTokenizer = new ClientComponentTokenizer()) {}

  public buildFromTokens(tokens: Token[], documentRoot: Record<string, any>): ASTNode {
    const tokenMap = new Map<string, Token>();
    for (const t of tokens) {
      tokenMap.set(String(t.figma_node_id), t);
    }

    const rootNode = (documentRoot && documentRoot.document) ? documentRoot.document : (documentRoot || {});
    return this.buildNodeRecursive(rootNode, tokenMap);
  }

  private buildNodeRecursive(node: Record<string, any>, tokenMap: Map<string, Token>): ASTNode {
    if (!node || typeof node !== 'object') {
      return {
        node_type: 'CONTAINER',
        semantic_role: 'generic_container',
        properties: {},
        children: [],
      };
    }

    const nodeId = String(node.id || '0:0');
    const token = tokenMap.get(nodeId);
    const tokenType = token ? token.type : this.tokenizer.classifyNode(node);

    let semanticRole = this.inferSemanticRole(node, tokenType);

    const children: ASTNode[] = [];
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        if (child && typeof child === 'object') {
          children.push(this.buildNodeRecursive(child, tokenMap));
        }
      }
    }

    return {
      node_type: tokenType,
      semantic_role: semanticRole,
      properties: {
        id: nodeId,
        name: node.name || '',
        characters: node.characters || '',
        font_size: node.style?.fontSize,
        font_weight: node.style?.fontWeight,
        layout_mode: node.layoutMode,
        corner_radius: node.cornerRadius,
        padding_top: node.paddingTop,
        post_type: node.post_type,
        singular_name: node.singular_name,
        plural_name: node.plural_name,
        menu_icon: node.menu_icon,
      },
      children,
    };
  }

  private inferSemanticRole(node: Record<string, any>, tokenType: string): string {
    const name = String(node.name || '').toLowerCase();
    if (tokenType === 'HEADING') {
      if (name.includes('hero') || name.includes('main')) return 'hero_title';
      if (name.includes('section')) return 'section_title';
      return 'heading';
    }
    if (tokenType === 'BUTTON') {
      if (name.includes('cta') || name.includes('primary')) return 'primary_cta_button';
      return 'button';
    }
    if (tokenType === 'NAV') return 'header_navigation';
    if (tokenType === 'CARD') return 'feature_card';
    if (node.post_type) return 'dynamic_post_loop';
    return 'container';
  }
}
