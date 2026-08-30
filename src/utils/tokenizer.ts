import { Token, TokenType } from '../types/compiler';

export class ClientComponentTokenizer {
  private headingRegex = /(?:^|[_\s\-])(h[1-6]|heading|title|headline|hero_title|section_title)(?:[_\s\-]|$)/i;
  private buttonRegex = /(?:^|[_\s\-])(btn|button|cta|action|badge|pill)(?:[_\s\-]|$)/i;
  private imageRegex = /(?:^|[_\s\-])(img|image|photo|picture|avatar|icon|logo|vector|graphic|illustration|thumbnail|mockup|banner)(?:[_\s\-]|$)/i;
  private navRegex = /(?:^|[_\s\-])(nav|navbar|navigation|menu|topbar|header_nav|header_menu)(?:[_\s\-]|$)/i;
  private cardRegex = /(?:^|[_\s\-])(card|tile|pricing_box|feature_item|testimonial_item|post_card|box)(?:[_\s\-]|$)/i;

  public headingFontThreshold: number = 20.0;

  public classifyNode(node: Record<string, any>): TokenType {
    if (!node || typeof node !== 'object') return 'CONTAINER';

    const nodeType = String(node.type || '').toUpperCase();
    const name = String(node.name || '').trim();

    if (nodeType === 'TEXT') {
      if (this.headingRegex.test(name)) return 'HEADING';
      const style = node.style || {};
      const fontSize = parseFloat(style.fontSize || 0);
      const fontWeight = parseFloat(style.fontWeight || 400);
      if (fontSize >= this.headingFontThreshold) return 'HEADING';
      if (fontSize >= 18 && fontWeight >= 600) return 'HEADING';
      return 'TEXT_BLOCK';
    }

    if (['VECTOR', 'STAR', 'LINE', 'ELLIPSE', 'REGULAR_POLYGON', 'BOOLEAN_OPERATION'].includes(nodeType)) {
      return 'IMAGE';
    }

    const fills = node.fills || [];
    if (Array.isArray(fills) && fills.some((f) => f && String(f.type).toUpperCase() === 'IMAGE')) {
      return 'IMAGE';
    }

    if (this.imageRegex.test(name)) return 'IMAGE';

    if (['FRAME', 'GROUP', 'COMPONENT', 'INSTANCE'].includes(nodeType)) {
      if (this.navRegex.test(name)) return 'NAV';
      const layoutMode = String(node.layoutMode || '').toUpperCase();
      const children = node.children || [];
      if (layoutMode === 'HORIZONTAL' && Array.isArray(children) && children.length >= 3) {
        const textChildren = children.filter((c) => c && c.type === 'TEXT');
        if (textChildren.length >= 2 && (name.toLowerCase().includes('header') || name.toLowerCase().includes('menu'))) {
          return 'NAV';
        }
      }
    }

    if (['FRAME', 'GROUP', 'COMPONENT', 'INSTANCE', 'RECTANGLE'].includes(nodeType)) {
      if (this.buttonRegex.test(name)) return 'BUTTON';
      const cornerRadius = parseFloat(node.cornerRadius || 0);
      const layoutMode = String(node.layoutMode || '').toUpperCase();
      const children = node.children || [];
      if (cornerRadius >= 4 && layoutMode === 'HORIZONTAL' && children.length >= 1 && children.length <= 2) {
        const hasText = children.some((c: Record<string, any>) => c && c.type === 'TEXT');
        if (hasText) return 'BUTTON';
      }
    }

    if (['FRAME', 'GROUP', 'COMPONENT', 'INSTANCE'].includes(nodeType)) {
      if (this.cardRegex.test(name)) return 'CARD';
      const cornerRadius = parseFloat(node.cornerRadius || 0);
      const paddingTop = parseFloat(node.paddingTop || 0);
      const children = node.children || [];
      if (cornerRadius >= 8 && paddingTop > 0 && children.length >= 2) {
        const hasMultipleTypes = new Set(children.map((c: any) => c.type)).size >= 1;
        if (hasMultipleTypes) return 'CARD';
      }
    }

    return 'CONTAINER';
  }

  public tokenize(root: Record<string, any>): Token[] {
    const tokens: Token[] = [];
    this.walk(root, tokens);
    return tokens;
  }

  private walk(node: Record<string, any>, tokens: Token[]) {
    if (!node || typeof node !== 'object') return;

    if (node.document && typeof node.document === 'object' && Object.keys(node).length === 1) {
      this.walk(node.document, tokens);
      return;
    }

    const nodeId = String(node.id || '0:0');
    const tokenType = this.classifyNode(node);

    tokens.push({
      type: tokenType,
      figma_node_id: nodeId,
      raw_properties: {
        id: nodeId,
        name: node.name || '',
        type: node.type || '',
        characters: node.characters,
        style: node.style,
        layoutMode: node.layoutMode,
        cornerRadius: node.cornerRadius,
        paddingTop: node.paddingTop,
        paddingBottom: node.paddingBottom,
        paddingLeft: node.paddingLeft,
        paddingRight: node.paddingRight,
        post_type: node.post_type,
        singular_name: node.singular_name,
        plural_name: node.plural_name,
        menu_icon: node.menu_icon,
      },
    });

    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        this.walk(child, tokens);
      }
    }
  }
}
