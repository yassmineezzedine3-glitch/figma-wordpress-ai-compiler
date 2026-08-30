"""
figma-wordpress-compiler: Abstract Syntax Tree (AST) Intermediate Representation
Defines the ASTNode dataclass with node_type, children, properties, and semantic_role.
"""
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any


@dataclass
class ASTNode:
    """
    Intermediate representation (IR) node for Figma-to-WordPress compilation.
    
    Attributes:
        node_type: Semantic or structural token type ('CONTAINER', 'SECTION', 'HEADING', 'BUTTON', 'IMAGE', 'NAV', 'CARD', 'TEXT_BLOCK').
        children: Nested list of child ASTNode instances representing DOM/template hierarchy.
        properties: Dictionary of extracted visual, layout, and style metrics (Figma attributes, layoutMode, padding, fills, typography).
        semantic_role: Optional inferred contextual semantic role ('site_header', 'hero_section', 'hero_title', 'primary_cta', 'feature_card').
    """
    node_type: str
    children: List['ASTNode'] = field(default_factory=list)
    properties: Dict[str, Any] = field(default_factory=dict)
    semantic_role: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """
        Serializes the ASTNode and its recursive children into a dictionary
        for debugging, logging, and JSON inspection.
        """
        return {
            "node_type": self.node_type,
            "semantic_role": self.semantic_role,
            "properties": self.properties,
            "children": [child.to_dict() for child in self.children],
        }

    # Backward compatibility helpers and property accessors
    @property
    def id(self) -> str:
        return str(self.properties.get("id", self.properties.get("figma_node_id", "")))

    @property
    def name(self) -> str:
        return str(self.properties.get("name", ""))

    @property
    def tag(self) -> str:
        return str(self.properties.get("tag", "div"))


# Alias for backward compatibility
AstNode = ASTNode


@dataclass
class HeaderNode(ASTNode):
    node_type: str = "NAV"
    semantic_role: Optional[str] = "site_header"


@dataclass
class SectionNode(ASTNode):
    node_type: str = "CONTAINER"
    semantic_role: Optional[str] = "section"


@dataclass
class HeadingNode(ASTNode):
    node_type: str = "HEADING"
    semantic_role: Optional[str] = "heading"


@dataclass
class ButtonNode(ASTNode):
    node_type: str = "BUTTON"
    semantic_role: Optional[str] = "button"


@dataclass
class DynamicLoopNode(ASTNode):
    node_type: str = "CONTAINER"
    semantic_role: Optional[str] = "dynamic_post_loop"


@dataclass
class PhpHookNode(ASTNode):
    node_type: str = "HOOK"
    semantic_role: Optional[str] = "php_hook"
