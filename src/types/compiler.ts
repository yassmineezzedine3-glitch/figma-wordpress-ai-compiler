export type TokenType =
  | 'HEADING'
  | 'BUTTON'
  | 'IMAGE'
  | 'NAV'
  | 'CARD'
  | 'TEXT_BLOCK'
  | 'CONTAINER';

export interface Token {
  type: TokenType;
  figma_node_id: string;
  raw_properties: Record<string, any>;
}

export interface ASTNode {
  node_type: string;
  semantic_role?: string;
  properties: Record<string, any>;
  children: ASTNode[];
}

export interface TestCase {
  id: string;
  name: string;
  file: string;
  durationMs: number;
  status: 'passed' | 'failed' | 'running';
  details: string;
}

export interface SamplePreset {
  id: string;
  name: string;
  description: string;
  category: string;
  figmaData: Record<string, any>;
}
