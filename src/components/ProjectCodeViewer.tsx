import React, { useState } from 'react';
import { FileCode2, Copy, Check, Terminal } from 'lucide-react';

const PYTHON_FILES: Record<string, { title: string; path: string; code: string }> = {
  'component_tokenizer': {
    title: 'component_tokenizer.py',
    path: '/parser/component_tokenizer.py',
    code: `"""
figma-wordpress-compiler: Component Tokenizer Module (/parser/component_tokenizer.py)

Classifies raw Figma nodes into semantic intermediate token types:
- HEADING: Titles, H1-H6, major section headlines based on name or typography scale
- BUTTON: Call-to-action controls, interactive pill/rounded button frames
- IMAGE: Vector graphics, icons, raster image fills, logos, illustrations
- NAV: Navigation bars, menu item lists, header bars
- CARD: Self-contained cards, feature tiles, pricing boxes
- TEXT_BLOCK: Body paragraphs, descriptions, subtitles, captions, copy
- CONTAINER: Structural frames, sections, canvases, auto-layout wrappers
"""
from dataclasses import dataclass, field
from enum import Enum
import re
from typing import Any, Dict, List, Optional, Set, Union


class TokenType(str, Enum):
    """
    Semantic token types produced by the component tokenizer.
    """
    HEADING = "HEADING"
    BUTTON = "BUTTON"
    IMAGE = "IMAGE"
    NAV = "NAV"
    CARD = "CARD"
    TEXT_BLOCK = "TEXT_BLOCK"
    CONTAINER = "CONTAINER"


@dataclass
class Token:
    type: TokenType
    figma_node_id: str
    raw_properties: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.type.value if isinstance(self.type, TokenType) else str(self.type),
            "figma_node_id": self.figma_node_id,
            "raw_properties": self.raw_properties,
        }


class ComponentTokenizer:
    HEADING_REGEX = re.compile(
        r"(?:^|[_\s\-])(h[1-6]|heading|title|headline|hero_title|section_title)(?:[_\s\-]|$)",
        re.IGNORECASE,
    )
    BUTTON_REGEX = re.compile(
        r"(?:^|[_\s\-])(btn|button|cta|action|badge|pill)(?:[_\s\-]|$)",
        re.IGNORECASE,
    )
    IMAGE_REGEX = re.compile(
        r"(?:^|[_\s\-])(img|image|photo|picture|avatar|icon|logo|vector|graphic|illustration|thumbnail|mockup|banner)(?:[_\s\-]|$)",
        re.IGNORECASE,
    )
    NAV_REGEX = re.compile(
        r"(?:^|[_\s\-])(nav|navbar|navigation|menu|topbar|header_nav|header_menu)(?:[_\s\-]|$)",
        re.IGNORECASE,
    )
    CARD_REGEX = re.compile(
        r"(?:^|[_\s\-])(card|tile|pricing_box|feature_item|testimonial_item|post_card|box)(?:[_\s\-]|$)",
        re.IGNORECASE,
    )

    def __init__(self, heading_font_threshold: float = 20.0):
        self.heading_font_threshold = heading_font_threshold

    def classify_node(self, node: Dict[str, Any]) -> TokenType:
        if not isinstance(node, dict):
            return TokenType.CONTAINER

        node_type = str(node.get("type", "")).upper()
        name = str(node.get("name", "")).strip()

        # 1. TEXT nodes: Either HEADING or TEXT_BLOCK
        if node_type == "TEXT":
            return self._classify_text_node(node, name)

        # 2. IMAGE classification
        if self._is_image_node(node, node_type, name):
            return TokenType.IMAGE

        # 3. NAV classification
        if self._is_nav_node(node, node_type, name):
            return TokenType.NAV

        # 4. BUTTON classification
        if self._is_button_node(node, node_type, name):
            return TokenType.BUTTON

        # 5. CARD classification
        if self._is_card_node(node, node_type, name):
            return TokenType.CARD

        # 6. Default CONTAINER
        return TokenType.CONTAINER

    def _classify_text_node(self, node: Dict[str, Any], name: str) -> TokenType:
        if self.HEADING_REGEX.search(name):
            return TokenType.HEADING

        style = node.get("style", {})
        if isinstance(style, dict):
            font_size = float(style.get("fontSize", 0.0))
            font_weight = float(style.get("fontWeight", 400))

            if font_size >= self.heading_font_threshold:
                return TokenType.HEADING
            if font_size >= 18.0 and font_weight >= 600:
                return TokenType.HEADING

        return TokenType.TEXT_BLOCK

    def _is_image_node(self, node: Dict[str, Any], node_type: str, name: str) -> bool:
        if node_type in {"VECTOR", "STAR", "LINE", "ELLIPSE", "REGULAR_POLYGON", "BOOLEAN_OPERATION"}:
            return True

        fills = node.get("fills", [])
        if isinstance(fills, list):
            for fill in fills:
                if isinstance(fill, dict) and str(fill.get("type", "")).upper() == "IMAGE":
                    return True

        if self.IMAGE_REGEX.search(name):
            return True

        return False

    def _is_nav_node(self, node: Dict[str, Any], node_type: str, name: str) -> bool:
        if node_type not in {"FRAME", "GROUP", "COMPONENT", "INSTANCE"}:
            return False

        if self.NAV_REGEX.search(name):
            return True

        layout_mode = str(node.get("layoutMode", "")).upper()
        children = node.get("children", [])
        if layout_mode == "HORIZONTAL" and isinstance(children, list) and len(children) >= 3:
            text_children = [c for c in children if isinstance(c, dict) and c.get("type") == "TEXT"]
            if len(text_children) >= 2 and ("header" in name.lower() or "menu" in name.lower()):
                return True

        return False

    def _is_button_node(self, node: Dict[str, Any], node_type: str, name: str) -> bool:
        if node_type not in {"FRAME", "GROUP", "COMPONENT", "INSTANCE", "RECTANGLE"}:
            return False

        if self.BUTTON_REGEX.search(name):
            return True

        corner_radius = float(node.get("cornerRadius", 0.0))
        children = node.get("children", [])
        layout_mode = str(node.get("layoutMode", "")).upper()

        if corner_radius >= 4.0 and layout_mode == "HORIZONTAL" and 1 <= len(children) <= 2:
            has_text = any(isinstance(c, dict) and c.get("type") == "TEXT" for c in children)
            if has_text:
                return True

        return False

    def _is_card_node(self, node: Dict[str, Any], node_type: str, name: str) -> bool:
        if node_type not in {"FRAME", "GROUP", "COMPONENT", "INSTANCE"}:
            return False

        if self.CARD_REGEX.search(name):
            return True

        corner_radius = float(node.get("cornerRadius", 0.0))
        padding_top = float(node.get("paddingTop", 0.0))
        children = node.get("children", [])

        if corner_radius >= 8.0 and padding_top > 0 and len(children) >= 2:
            child_types = {str(c.get("type", "")).upper() for c in children if isinstance(c, dict)}
            if "TEXT" in child_types and len(child_types) >= 2:
                return True

        return False

    def tokenize(self, root: Dict[str, Any]) -> List[Token]:
        tokens: List[Token] = []
        self._walk(root, tokens)
        return tokens

    def _walk(self, node: Dict[str, Any], tokens: List[Token]):
        if not isinstance(node, dict):
            return

        if "document" in node and isinstance(node["document"], dict) and len(node) == 1:
            self._walk(node["document"], tokens)
            return

        node_id = str(node.get("id", "0:0"))
        token_type = self.classify_node(node)
        raw_props = self._extract_raw_properties(node)

        tokens.append(
            Token(
                type=token_type,
                figma_node_id=node_id,
                raw_properties=raw_props,
            )
        )

        for child in node.get("children", []):
            if isinstance(child, dict):
                self._walk(child, tokens)


def tokenize_figma_document(doc_tree: Dict[str, Any]) -> List[Token]:
    tokenizer = ComponentTokenizer()
    return tokenizer.tokenize(doc_tree)
`,
  },
  'ast_builder': {
    title: 'ast_builder.py',
    path: '/ast/ast_builder.py',
    code: `"""
figma-wordpress-compiler: AST Builder Module (/ast/ast_builder.py)
Constructs a nested ASTNode tree from tokens produced by component_tokenizer.py.
"""
from typing import Dict, Any, List, Optional
from ast.nodes import ASTNode
from parser.component_tokenizer import (
    Token,
    TokenType,
    ComponentTokenizer,
    tokenize_figma_document,
)

class ASTBuilder:
    def __init__(self, tokenizer: Optional[ComponentTokenizer] = None):
        self.tokenizer = tokenizer or ComponentTokenizer()

    def build_from_tokens(
        self,
        tokens: List[Token],
        document_root: Dict[str, Any]
    ) -> ASTNode:
        token_map: Dict[str, Token] = {str(t.figma_node_id): t for t in tokens}
        root_node = document_root.get("document", document_root) if isinstance(document_root, dict) else {}
        return self._build_node_recursive(root_node, token_map)

    def build_tree(self, document_root: Dict[str, Any], tokens: Optional[List[Token]] = None) -> ASTNode:
        if tokens is None:
            tokens = self.tokenizer.tokenize(document_root)
        return self.build_from_tokens(tokens, document_root)
`,
  },
  'ast_nodes': {
    title: 'nodes.py',
    path: '/ast/nodes.py',
    code: `"""
figma-wordpress-compiler: AST Nodes Module (/ast/nodes.py)
Defines ASTNode with node_type, children, properties, semantic_role, and to_dict().
"""
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any

@dataclass
class ASTNode:
    node_type: str
    children: List['ASTNode'] = field(default_factory=list)
    properties: Dict[str, Any] = field(default_factory=dict)
    semantic_role: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "node_type": self.node_type,
            "semantic_role": self.semantic_role,
            "properties": self.properties,
            "children": [child.to_dict() for child in self.children],
        }
`,
  },
  'test_tokenizer': {
    title: 'test_component_tokenizer.py',
    path: '/tests/test_component_tokenizer.py',
    code: `"""
Tests for ComponentTokenizer: verifies all 7 token types (HEADING, BUTTON, IMAGE, NAV, CARD, TEXT_BLOCK, CONTAINER).
"""
import os, sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from parser.component_tokenizer import (
    TokenType,
    Token,
    ComponentTokenizer,
    tokenize_figma_document,
)

def test_tokenize_hero_section_returns_all_token_types():
    # Emits HEADING, BUTTON, IMAGE, NAV, CARD, TEXT_BLOCK, CONTAINER
    ...
`,
  },
};

export const ProjectCodeViewer: React.FC = () => {
  const [activeKey, setActiveKey] = useState('component_tokenizer');
  const [copied, setCopied] = useState(false);

  const activeFile = PYTHON_FILES[activeKey];

  const handleCopy = () => {
    navigator.clipboard.writeText(activeFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
      {/* File Tab Bar */}
      <div className="p-2 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {Object.entries(PYTHON_FILES).map(([key, f]) => (
            <button
              key={key}
              onClick={() => setActiveKey(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer ${
                activeKey === key
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>{f.title}</span>
            </button>
          ))}
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-3 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs transition cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy Code'}</span>
        </button>
      </div>

      <div className="px-4 py-2 border-b border-slate-800/50 bg-slate-900/20 text-xs font-mono text-slate-400">
        File: <span className="text-indigo-400 font-semibold">{activeFile.path}</span>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <pre className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
          <code>{activeFile.code}</code>
        </pre>
      </div>
    </div>
  );
};
