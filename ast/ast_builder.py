"""
figma-wordpress-compiler: AST Builder Module
Constructs a hierarchical ASTNode tree from the token list produced by component_tokenizer.py
and the original Figma document hierarchy.
"""
from typing import Dict, Any, List, Optional, Union
from ast.nodes import ASTNode
from parser.component_tokenizer import (
    Token,
    TokenType,
    ComponentTokenizer,
    tokenize_figma_document,
)


class ASTBuilder:
    """
    Builder that maps flat/hierarchical Figma tokens into a nested ASTNode intermediate representation.
    Preserves exact structural layout (e.g., Section -> [Heading, Subtitle, ButtonGroup -> [Buttons], Cards]).
    """

    def __init__(self, tokenizer: Optional[ComponentTokenizer] = None):
        self.tokenizer = tokenizer or ComponentTokenizer()

    def build_from_tokens(
        self,
        tokens: List[Token],
        document_root: Dict[str, Any]
    ) -> ASTNode:
        """
        Builds a nested ASTNode tree by correlating the provided Token list with the Figma document structure.
        """
        token_map: Dict[str, Token] = {str(t.figma_node_id): t for t in tokens}
        
        # Unwrap outer {"document": ...} if needed
        root_node = document_root.get("document", document_root) if isinstance(document_root, dict) else {}
        return self._build_node_recursive(root_node, token_map)

    def build_tree(self, document_root: Dict[str, Any], tokens: Optional[List[Token]] = None) -> ASTNode:
        """
        Convenience builder: if tokens are not provided, generates them using ComponentTokenizer
        and builds the nested ASTNode tree.
        """
        if tokens is None:
            tokens = self.tokenizer.tokenize(document_root)
        return self.build_from_tokens(tokens, document_root)

    def _build_node_recursive(
        self,
        figma_node: Dict[str, Any],
        token_map: Dict[str, Token],
        parent_role: Optional[str] = None
    ) -> ASTNode:
        if not isinstance(figma_node, dict):
            return ASTNode(node_type="CONTAINER", semantic_role="unknown")

        node_id = str(figma_node.get("id", "0:0"))
        node_name = str(figma_node.get("name", "Unnamed Node"))
        node_type_str = str(figma_node.get("type", "FRAME")).upper()

        # Look up pre-classified token, or fallback to classifying dynamically
        token = token_map.get(node_id)
        if token:
            node_type = token.type.value if isinstance(token.type, TokenType) else str(token.type)
            raw_props = dict(token.raw_properties)
        else:
            classified_type = self.tokenizer.classify_node(figma_node)
            node_type = classified_type.value if isinstance(classified_type, TokenType) else str(classified_type)
            raw_props = self.tokenizer._extract_raw_properties(figma_node)

        # Merge base attributes into properties dictionary
        properties: Dict[str, Any] = {
            "id": node_id,
            "figma_node_id": node_id,
            "name": node_name,
            "type": node_type_str,
            **raw_props,
        }

        # Infer context-aware semantic role
        semantic_role = self._infer_semantic_role(figma_node, node_type, parent_role)

        ast_node = ASTNode(
            node_type=node_type,
            properties=properties,
            semantic_role=semantic_role,
            children=[]
        )

        # Recursively construct child ASTNodes
        raw_children = figma_node.get("children", [])
        if isinstance(raw_children, list):
            for child_raw in raw_children:
                if isinstance(child_raw, dict):
                    child_ast = self._build_node_recursive(
                        child_raw,
                        token_map,
                        parent_role=semantic_role
                    )
                    ast_node.children.append(child_ast)

        return ast_node

    def _infer_semantic_role(
        self,
        node: Dict[str, Any],
        node_type: str,
        parent_role: Optional[str]
    ) -> str:
        """
        Infers semantic role based on node type, naming semantics, and parent context.
        """
        name_lower = str(node.get("name", "")).lower()

        # Section / Container level roles
        if "hero" in name_lower and ("section" in name_lower or "container" in name_lower or "banner" in name_lower):
            return "hero_section"
        if "header" in name_lower or "navbar" in name_lower or "topbar" in name_lower:
            return "site_header"
        if "nav" in name_lower or node_type == "NAV":
            return "navigation_menu"
        if "footer" in name_lower:
            return "site_footer"

        # Content element roles
        if node_type == "HEADING":
            if parent_role == "hero_section" or "hero" in name_lower or "main" in name_lower or "h1" in name_lower:
                return "hero_title"
            if "section" in name_lower:
                return "section_title"
            if parent_role in ("card", "feature_card", "pricing_card") or "card" in name_lower:
                return "card_title"
            return "section_title"

        if node_type == "BUTTON":
            if "primary" in name_lower or "start" in name_lower or "sign" in name_lower or "cta" in name_lower:
                return "primary_cta"
            if "secondary" in name_lower or "outline" in name_lower or "demo" in name_lower:
                return "secondary_cta"
            return "button"

        if node_type == "CARD":
            if "feature" in name_lower:
                return "feature_card"
            if "pricing" in name_lower:
                return "pricing_card"
            return "card"

        if node_type == "IMAGE":
            if "logo" in name_lower:
                return "site_logo"
            if "icon" in name_lower:
                return "feature_icon"
            if "hero" in name_lower or "mockup" in name_lower or "banner" in name_lower:
                return "hero_image"
            return "media_graphic"

        if node_type == "TEXT_BLOCK":
            if parent_role == "hero_section" or "subtitle" in name_lower or "desc" in name_lower:
                return "hero_subtitle"
            return "body_text"

        if "button" in name_lower or "cta" in name_lower or "btn" in name_lower:
            return "button_group"

        return "container"


def build_ast_from_tokens(
    tokens: List[Token],
    document_root: Dict[str, Any]
) -> ASTNode:
    """
    Convenience function: builds an ASTNode tree from tokens and document tree.
    """
    builder = ASTBuilder()
    return builder.build_from_tokens(tokens, document_root)


def build_ast_tree(document_root: Dict[str, Any]) -> ASTNode:
    """
    Convenience function: tokenizes the document and constructs the nested ASTNode tree.
    """
    builder = ASTBuilder()
    return builder.build_tree(document_root)


def build(
    tokens_or_doc: Union[List[Token], Dict[str, Any]],
    document_root: Optional[Dict[str, Any]] = None,
) -> ASTNode:
    """
    Direct function alias that builds an AST tree.
    Supports either (tokens, document_root) or (document_root, tokens).
    """
    builder = ASTBuilder()
    if isinstance(tokens_or_doc, list):
        return builder.build_from_tokens(tokens_or_doc, document_root or {})
    elif isinstance(tokens_or_doc, dict):
        if isinstance(document_root, list):
            return builder.build_from_tokens(document_root, tokens_or_doc)
        return builder.build_tree(tokens_or_doc)
    return ASTNode(node_type="CONTAINER", semantic_role="unknown")
