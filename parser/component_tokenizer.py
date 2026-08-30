"""
figma-wordpress-compiler: Component Tokenizer Module
Walks the Figma document tree and classifies each node into a token type:
HEADING, BUTTON, IMAGE, NAV, CARD, TEXT_BLOCK, CONTAINER
based on node name patterns, types, styles, fills, and children properties.
Returns a flat list of Token objects (type, figma_node_id, raw_properties).
"""
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, Any, List, Optional


class TokenType(str, Enum):
    """Supported semantic token types for Figma AST compilation."""
    HEADING = "HEADING"
    BUTTON = "BUTTON"
    IMAGE = "IMAGE"
    NAV = "NAV"
    CARD = "CARD"
    TEXT_BLOCK = "TEXT_BLOCK"
    CONTAINER = "CONTAINER"


@dataclass
class Token:
    """
    Representation of a classified Figma node token.
    Attributes:
        type: The semantic TokenType classified for this node.
        figma_node_id: The original Figma node ID (e.g. '1:100').
        raw_properties: Dictionary containing the original Figma node attributes and style metadata.
    """
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
    """
    Recursive document tree walker and component classifier.
    Examines node naming patterns, layoutMode, fills, typography styles, and hierarchy.
    """

    # Regex patterns for fast name classification
    HEADING_NAME_REGEX = re.compile(
        r"(^|\b|_|-)(h[1-6]|heading|title|headline|subheading|hero-title|section-title|page-title)($|\b|_|-)",
        re.IGNORECASE,
    )
    BUTTON_NAME_REGEX = re.compile(
        r"(^|\b|_|-)(button|btn|cta|action|submit|primary-btn|secondary-btn|learn-more|get-started)($|\b|_|-)",
        re.IGNORECASE,
    )
    IMAGE_NAME_REGEX = re.compile(
        r"(^|\b|_|-)(image|img|photo|picture|avatar|thumbnail|illustration|icon|graphic|logo|badge|banner-img|hero-image)($|\b|_|-)",
        re.IGNORECASE,
    )
    NAV_NAME_REGEX = re.compile(
        r"(^|\b|_|-)(nav|navbar|navigation|menu|nav-menu|header-nav|nav-links|topbar-nav|nav-list)($|\b|_|-)",
        re.IGNORECASE,
    )
    CARD_NAME_REGEX = re.compile(
        r"(^|\b|_|-)(card|tile|feature-card|pricing-card|blog-card|item-card|testimonial-card|post-card|grid-item)($|\b|_|-)",
        re.IGNORECASE,
    )
    TEXT_BLOCK_NAME_REGEX = re.compile(
        r"(^|\b|_|-)(text|paragraph|body|desc|description|caption|label|subtitle|copy|lead|content)($|\b|_|-)",
        re.IGNORECASE,
    )

    def __init__(self, heading_font_size_threshold: float = 20.0):
        self.heading_font_size_threshold = heading_font_size_threshold

    def tokenize(self, document_root: Dict[str, Any]) -> List[Token]:
        """
        Walks the given Figma document tree and returns a flat list of Token objects.
        """
        tokens: List[Token] = []
        if not document_root or not isinstance(document_root, dict):
            return tokens

        # If passed the outer API payload {"document": ...}, unwrap it
        root_node = document_root.get("document", document_root)
        self._walk_node(root_node, tokens)
        return tokens

    def _walk_node(self, node: Dict[str, Any], tokens: List[Token]) -> None:
        """Recursively visits a node, classifies it into a Token, and walks its children."""
        if not isinstance(node, dict):
            return

        token_type = self.classify_node(node)
        node_id = str(node.get("id", "0:0"))

        # Build raw properties snapshot preserving essential styling and layout context
        raw_properties = self._extract_raw_properties(node)

        tokens.append(
            Token(
                type=token_type,
                figma_node_id=node_id,
                raw_properties=raw_properties,
            )
        )

        # Recursively visit children
        children = node.get("children", [])
        if isinstance(children, list):
            for child in children:
                if isinstance(child, dict):
                    self._walk_node(child, tokens)

    def classify_node(self, node: Dict[str, Any]) -> TokenType:
        """
        Classifies an individual Figma node into a semantic TokenType
        based on type, name patterns, typography styles, fills, and children counts.
        """
        node_type = str(node.get("type", "")).upper()
        node_name = str(node.get("name", "")).strip()
        style = node.get("style", {}) if isinstance(node.get("style"), dict) else {}
        fills = node.get("fills", []) if isinstance(node.get("fills"), list) else []
        children = node.get("children", []) if isinstance(node.get("children"), list) else []
        children_count = len(children)

        has_image_fill = any(
            isinstance(f, dict) and f.get("type") == "IMAGE"
            for f in fills
        )

        # 1. Check for TEXT nodes (HEADING vs TEXT_BLOCK)
        if node_type == "TEXT":
            font_size = float(style.get("fontSize", 0) or 0)
            font_weight = float(style.get("fontWeight", 400) or 400)

            if self.HEADING_NAME_REGEX.search(node_name):
                return TokenType.HEADING
            if font_size >= self.heading_font_size_threshold or (font_size >= 18 and font_weight >= 600):
                return TokenType.HEADING
            return TokenType.TEXT_BLOCK

        # 2. Check for IMAGE
        if has_image_fill:
            return TokenType.IMAGE
        if node_type in ("VECTOR", "STAR", "LINE", "ELLIPSE", "BOOLEAN_OPERATION"):
            # Check if named specifically as button/cta or nav
            if not (self.BUTTON_NAME_REGEX.search(node_name) or self.NAV_NAME_REGEX.search(node_name)):
                return TokenType.IMAGE
        if self.IMAGE_NAME_REGEX.search(node_name) and node_type not in ("DOCUMENT", "CANVAS"):
            if children_count == 0 or node_type in ("RECTANGLE", "VECTOR", "INSTANCE", "FRAME"):
                return TokenType.IMAGE

        # 3. Check for NAV
        if self.NAV_NAME_REGEX.search(node_name):
            return TokenType.NAV

        # 4. Check for BUTTON
        if self.BUTTON_NAME_REGEX.search(node_name):
            return TokenType.BUTTON

        # Structural button detection (Frame with 0-2 children, corner radius/fills, horizontal layout)
        if node_type in ("FRAME", "INSTANCE", "COMPONENT") and children_count <= 2:
            corner_radius = float(node.get("cornerRadius", 0) or 0)
            layout_mode = node.get("layoutMode", "NONE")
            if corner_radius > 2 and layout_mode in ("HORIZONTAL", "VERTICAL"):
                # If child is single text or text + icon
                if children_count == 1 and str(children[0].get("type", "")).upper() == "TEXT":
                    return TokenType.BUTTON
                if self.BUTTON_NAME_REGEX.search(node_name):
                    return TokenType.BUTTON

        # 5. Check for CARD
        if self.CARD_NAME_REGEX.search(node_name) and node_type not in ("DOCUMENT", "CANVAS"):
            return TokenType.CARD

        # Structural card detection: Frame with cornerRadius/fills and multiple children containing text/image
        if node_type in ("FRAME", "INSTANCE", "COMPONENT") and children_count >= 2:
            corner_radius = float(node.get("cornerRadius", 0) or 0)
            has_fills = len(fills) > 0
            if corner_radius >= 4 and has_fills:
                # If name has card-like indicators or contains a mix of media + text
                child_types = [str(c.get("type", "")).upper() for c in children if isinstance(c, dict)]
                if "TEXT" in child_types and ("VECTOR" in child_types or "RECTANGLE" in child_types or "FRAME" in child_types):
                    if self.CARD_NAME_REGEX.search(node_name) or "item" in node_name.lower() or "feature" in node_name.lower():
                        return TokenType.CARD

        # Check for named text block frames/groups
        if self.TEXT_BLOCK_NAME_REGEX.search(node_name) and node_type not in ("CANVAS", "DOCUMENT"):
            return TokenType.TEXT_BLOCK

        # 6. Default to CONTAINER for all container/structural nodes
        return TokenType.CONTAINER

    @staticmethod
    def _extract_raw_properties(node: Dict[str, Any]) -> Dict[str, Any]:
        """Extracts cleaned raw properties dictionary from a Figma node."""
        props: Dict[str, Any] = {
            "name": node.get("name", ""),
            "type": node.get("type", ""),
            "layoutMode": node.get("layoutMode", "NONE"),
            "children_count": len(node.get("children", [])) if isinstance(node.get("children"), list) else 0,
        }

        # Optional style and layout metrics
        if "style" in node and isinstance(node["style"], dict):
            props["style"] = node["style"]
        if "characters" in node:
            props["characters"] = node["characters"]
        if "fills" in node:
            props["fills"] = node["fills"]
        if "cornerRadius" in node:
            props["cornerRadius"] = node["cornerRadius"]
        if "itemSpacing" in node:
            props["itemSpacing"] = node["itemSpacing"]
        if "paddingTop" in node:
            props["padding"] = {
                "top": node.get("paddingTop", 0),
                "right": node.get("paddingRight", 0),
                "bottom": node.get("paddingBottom", 0),
                "left": node.get("paddingLeft", 0),
            }
        return props


def tokenize_figma_document(document_root: Dict[str, Any]) -> List[Token]:
    """
    Convenience function to walk and tokenize a Figma document tree.
    
    Example:
        >>> from parser.component_tokenizer import tokenize_figma_document
        >>> tokens = tokenize_figma_document(doc_json)
        >>> print([t.type.value for t in tokens])
    """
    tokenizer = ComponentTokenizer()
    return tokenizer.tokenize(document_root)


# Direct function alias
tokenize = tokenize_figma_document
