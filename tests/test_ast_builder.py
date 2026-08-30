"""
Unit tests for the AST Intermediate Representation and ASTBuilder module (/ast).
Verifies:
- ASTNode dataclass structure: (node_type, children, properties, semantic_role)
- to_dict() method serialization for debugging and tree inspection
- ASTBuilder mapping tokens to a nested hierarchy (Section > Heading + Subtitle + ButtonGroup > Button, etc.)
- Semantic role inference (hero_section, site_header, hero_title, primary_cta, feature_card, etc.)
- Convenience builder methods: build_ast_from_tokens and build_ast_tree
"""
import pytest
from typing import Dict, Any

from ast.nodes import ASTNode, AstNode
from ast.ast_builder import ASTBuilder, build_ast_from_tokens, build_ast_tree
from parser.component_tokenizer import ComponentTokenizer, TokenType, tokenize_figma_document

# Sample Figma JSON fixture representing a nested Hero Section
HERO_FIXTURE: Dict[str, Any] = {
    "document": {
        "id": "0:0",
        "name": "Landing Page Document",
        "type": "DOCUMENT",
        "children": [
            {
                "id": "0:1",
                "name": "Desktop Canvas",
                "type": "CANVAS",
                "children": [
                    {
                        "id": "1:10",
                        "name": "Site Header Navbar",
                        "type": "FRAME",
                        "layoutMode": "HORIZONTAL",
                        "children": [
                            {
                                "id": "1:11",
                                "name": "Company Logo Vector",
                                "type": "VECTOR",
                                "fills": [{"type": "SOLID"}],
                                "children": [],
                            },
                            {
                                "id": "1:12",
                                "name": "Sign In CTA Button",
                                "type": "FRAME",
                                "layoutMode": "HORIZONTAL",
                                "cornerRadius": 8,
                                "children": [
                                    {
                                        "id": "1:13",
                                        "name": "Button Text",
                                        "type": "TEXT",
                                        "characters": "Sign In",
                                        "style": {"fontSize": 14, "fontWeight": 600},
                                    }
                                ],
                            },
                        ],
                    },
                    {
                        "id": "1:20",
                        "name": "Hero Section Container",
                        "type": "FRAME",
                        "layoutMode": "VERTICAL",
                        "paddingTop": 80,
                        "paddingBottom": 80,
                        "paddingLeft": 48,
                        "paddingRight": 48,
                        "children": [
                            {
                                "id": "1:21",
                                "name": "Hero Main Heading H1",
                                "type": "TEXT",
                                "characters": "Accelerate WordPress Theme Development",
                                "style": {"fontSize": 48, "fontWeight": 700},
                            },
                            {
                                "id": "1:22",
                                "name": "Hero Subtitle Description",
                                "type": "TEXT",
                                "characters": "Transform AutoLayout frames directly into clean PHP templates.",
                                "style": {"fontSize": 18, "fontWeight": 400},
                            },
                            {
                                "id": "1:23",
                                "name": "Hero CTA Action Buttons",
                                "type": "FRAME",
                                "layoutMode": "HORIZONTAL",
                                "itemSpacing": 16,
                                "children": [
                                    {
                                        "id": "1:24",
                                        "name": "Primary Start CTA Button",
                                        "type": "FRAME",
                                        "layoutMode": "HORIZONTAL",
                                        "cornerRadius": 10,
                                        "children": [
                                            {
                                                "id": "1:25",
                                                "name": "CTA Label",
                                                "type": "TEXT",
                                                "characters": "Get Started",
                                                "style": {"fontSize": 16, "fontWeight": 600},
                                            }
                                        ],
                                    },
                                    {
                                        "id": "1:26",
                                        "name": "Secondary Demo Button",
                                        "type": "FRAME",
                                        "layoutMode": "HORIZONTAL",
                                        "cornerRadius": 10,
                                        "children": [
                                            {
                                                "id": "1:27",
                                                "name": "Demo Label",
                                                "type": "TEXT",
                                                "characters": "View Live Demo",
                                                "style": {"fontSize": 16, "fontWeight": 500},
                                            }
                                        ],
                                    },
                                ],
                            },
                            {
                                "id": "1:28",
                                "name": "Feature Highlight Card",
                                "type": "FRAME",
                                "layoutMode": "VERTICAL",
                                "cornerRadius": 16,
                                "fills": [{"type": "SOLID"}],
                                "children": [
                                    {
                                        "id": "1:29",
                                        "name": "Feature Icon Vector",
                                        "type": "VECTOR",
                                        "children": [],
                                    },
                                    {
                                        "id": "1:30",
                                        "name": "Feature Card Heading H3",
                                        "type": "TEXT",
                                        "characters": "Instant PHP AST",
                                        "style": {"fontSize": 20, "fontWeight": 600},
                                    },
                                    {
                                        "id": "1:31",
                                        "name": "Feature Description Copy",
                                        "type": "TEXT",
                                        "characters": "Full Gutenberg block theme compatibility.",
                                        "style": {"fontSize": 14, "fontWeight": 400},
                                    },
                                ],
                            },
                        ],
                    },
                ],
            }
        ],
    }
}


def test_ast_node_fields_and_to_dict():
    """Verifies ASTNode dataclass initialization and to_dict() serialization."""
    child_node = ASTNode(
        node_type="BUTTON",
        semantic_role="primary_cta",
        properties={"id": "btn_1", "name": "Click Me", "cornerRadius": 8},
        children=[]
    )
    parent_node = ASTNode(
        node_type="CONTAINER",
        semantic_role="hero_section",
        properties={"id": "hero_1", "layoutMode": "VERTICAL"},
        children=[child_node]
    )

    serialized = parent_node.to_dict()

    assert serialized["node_type"] == "CONTAINER"
    assert serialized["semantic_role"] == "hero_section"
    assert serialized["properties"]["id"] == "hero_1"
    assert len(serialized["children"]) == 1

    child_dict = serialized["children"][0]
    assert child_dict["node_type"] == "BUTTON"
    assert child_dict["semantic_role"] == "primary_cta"
    assert child_dict["properties"]["cornerRadius"] == 8
    assert child_dict["children"] == []


def test_build_ast_from_tokens_preserves_nested_hierarchy():
    """Verifies that ASTBuilder creates a fully nested tree respecting Figma hierarchy."""
    tokenizer = ComponentTokenizer()
    tokens = tokenizer.tokenize(HERO_FIXTURE)
    
    builder = ASTBuilder(tokenizer=tokenizer)
    root_ast = builder.build_from_tokens(tokens, HERO_FIXTURE)

    assert isinstance(root_ast, ASTNode)
    assert root_ast.node_type == "CONTAINER"
    
    # Root doc -> Canvas
    assert len(root_ast.children) == 1
    canvas_ast = root_ast.children[0]
    assert canvas_ast.properties["name"] == "Desktop Canvas"

    # Canvas has 2 major sections: Site Header and Hero Section
    assert len(canvas_ast.children) == 2
    header_ast, hero_ast = canvas_ast.children[0], canvas_ast.children[1]

    # Verify Site Header
    assert header_ast.node_type in ("NAV", "CONTAINER")
    assert header_ast.semantic_role in ("site_header", "navigation_menu")
    assert len(header_ast.children) == 2  # Logo + Sign In Button

    # Verify Hero Section
    assert hero_ast.node_type == "CONTAINER"
    assert hero_ast.semantic_role == "hero_section"
    assert hero_ast.properties["padding"]["top"] == 80

    # Hero Section Children: Heading, Subtitle, CTA Group, Feature Card
    assert len(hero_ast.children) == 4
    heading_node, subtitle_node, cta_group_node, card_node = hero_ast.children

    # 1. Heading
    assert heading_node.node_type == "HEADING"
    assert heading_node.semantic_role == "hero_title"
    assert heading_node.properties["characters"] == "Accelerate WordPress Theme Development"
    assert heading_node.properties["style"]["fontSize"] == 48

    # 2. Subtitle
    assert subtitle_node.node_type == "TEXT_BLOCK"
    assert subtitle_node.semantic_role == "hero_subtitle"

    # 3. CTA Action Buttons Group
    assert cta_group_node.node_type in ("CONTAINER", "BUTTON")
    assert len(cta_group_node.children) == 2  # Primary + Secondary buttons
    primary_btn = cta_group_node.children[0]
    assert primary_btn.node_type == "BUTTON"
    assert primary_btn.semantic_role == "primary_cta"

    # 4. Feature Card and its nested children (Icon, Title, Description)
    assert card_node.node_type == "CARD"
    assert card_node.semantic_role == "feature_card"
    assert len(card_node.children) == 3
    card_icon, card_title, card_desc = card_node.children
    assert card_icon.node_type == "IMAGE"
    assert card_title.node_type == "HEADING"
    assert card_title.semantic_role == "card_title"
    assert card_desc.node_type == "TEXT_BLOCK"


def test_convenience_build_ast_tree():
    """Verifies build_ast_tree() helper executes end-to-end tokenizer + tree building."""
    ast_root = build_ast_tree(HERO_FIXTURE)
    assert isinstance(ast_root, ASTNode)
    
    # Check that to_dict produces valid nested structure
    tree_dict = ast_root.to_dict()
    assert "node_type" in tree_dict
    assert "children" in tree_dict
    assert len(tree_dict["children"]) > 0


def test_ast_builder_resilience_with_empty_and_unknown_nodes():
    """Verifies that ASTBuilder gracefully handles empty or partially populated structures."""
    builder = ASTBuilder()
    empty_ast = builder.build_tree({})
    assert isinstance(empty_ast, ASTNode)
    assert empty_ast.node_type == "CONTAINER"
    assert empty_ast.children == []


def test_build_alias_and_recursive_to_dict():
    """Verifies build() alias works with tokens and document, and to_dict() works deeply."""
    from ast.ast_builder import build
    from ast.builder import build as builder_build

    tokenizer = ComponentTokenizer()
    tokens = tokenizer.tokenize(HERO_FIXTURE)
    
    # Test build(tokens, doc)
    ast_root = build(tokens, HERO_FIXTURE)
    assert isinstance(ast_root, ASTNode)
    assert ast_root.node_type == "CONTAINER"
    assert len(ast_root.children) > 0

    # Test builder_build re-export
    ast_root_2 = builder_build(tokens, HERO_FIXTURE)
    assert isinstance(ast_root_2, ASTNode)

    # Validate recursive to_dict output
    serialized = ast_root.to_dict()
    assert isinstance(serialized, dict)
    assert "node_type" in serialized
    assert "children" in serialized
    assert isinstance(serialized["children"], list)

    # Check level 1 (Canvas)
    canvas_dict = serialized["children"][0]
    assert canvas_dict["properties"]["name"] == "Desktop Canvas"

    # Check level 2 (Hero Section)
    hero_dict = canvas_dict["children"][1]
    assert hero_dict["semantic_role"] == "hero_section"

    # Check level 3 (CTA Action Buttons Group)
    cta_group_dict = hero_dict["children"][2]
    assert len(cta_group_dict["children"]) == 2

    # Check level 4 (Primary button child)
    primary_btn_dict = cta_group_dict["children"][0]
    assert primary_btn_dict["node_type"] == "BUTTON"
    assert primary_btn_dict["semantic_role"] == "primary_cta"
    assert primary_btn_dict["children"][0]["properties"]["characters"] == "Get Started"
