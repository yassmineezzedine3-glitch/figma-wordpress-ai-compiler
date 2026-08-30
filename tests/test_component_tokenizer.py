"""
figma-wordpress-compiler: Test Suite for Component Tokenizer (/tests/test_component_tokenizer.py)

Verifies classification of Figma nodes into:
- HEADING
- BUTTON
- IMAGE
- NAV
- CARD
- TEXT_BLOCK
- CONTAINER
"""
import os
import sys

# Ensure root directory is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    import pytest
    fixture = pytest.fixture
except ImportError:
    fixture = lambda f: f

from typing import Dict, Any, List

from parser.component_tokenizer import (
    TokenType,
    Token,
    ComponentTokenizer,
    tokenize_figma_document,
)


@fixture
def hero_section_document() -> Dict[str, Any]:
    return {
        "document": {
            "id": "0:0",
            "name": "Landing Page Canvas",
            "type": "DOCUMENT",
            "children": [
                {
                    "id": "0:1",
                    "name": "Root Frame",
                    "type": "FRAME",
                    "layoutMode": "VERTICAL",
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
                                },
                                {
                                    "id": "1:12",
                                    "name": "Menu Item 1",
                                    "type": "TEXT",
                                    "characters": "Features",
                                    "style": {"fontSize": 14},
                                },
                                {
                                    "id": "1:13",
                                    "name": "Sign In CTA Button",
                                    "type": "FRAME",
                                    "layoutMode": "HORIZONTAL",
                                    "cornerRadius": 8,
                                    "children": [
                                        {
                                            "id": "1:14",
                                            "name": "Button Label",
                                            "type": "TEXT",
                                            "characters": "Sign In",
                                            "style": {"fontSize": 14, "fontWeight": 600},
                                        }
                                    ],
                                },
                            ],
                        },
                        {
                            "id": "2:1",
                            "name": "Hero Section Container",
                            "type": "FRAME",
                            "layoutMode": "VERTICAL",
                            "paddingTop": 80,
                            "paddingBottom": 80,
                            "children": [
                                {
                                    "id": "2:2",
                                    "name": "Hero Main Heading H1",
                                    "type": "TEXT",
                                    "characters": "Accelerate WordPress Themes with AST",
                                    "style": {"fontSize": 48, "fontWeight": 700},
                                },
                                {
                                    "id": "2:3",
                                    "name": "Hero Subtitle Description",
                                    "type": "TEXT",
                                    "characters": "Generate production Gutenberg block themes directly from Figma AutoLayout frames.",
                                    "style": {"fontSize": 18, "fontWeight": 400},
                                },
                                {
                                    "id": "2:4",
                                    "name": "Hero CTA Button",
                                    "type": "FRAME",
                                    "layoutMode": "HORIZONTAL",
                                    "cornerRadius": 10,
                                    "children": [
                                        {
                                            "id": "2:5",
                                            "name": "CTA Label",
                                            "type": "TEXT",
                                            "characters": "Get Started Free",
                                            "style": {"fontSize": 16, "fontWeight": 600},
                                        }
                                    ],
                                },
                                {
                                    "id": "2:6",
                                    "name": "Hero Product Mockup Image",
                                    "type": "FRAME",
                                    "fills": [{"type": "IMAGE", "scaleMode": "FILL"}],
                                },
                                {
                                    "id": "2:7",
                                    "name": "Feature Highlight Card",
                                    "type": "FRAME",
                                    "layoutMode": "VERTICAL",
                                    "cornerRadius": 16,
                                    "paddingTop": 24,
                                    "paddingBottom": 24,
                                    "children": [
                                        {
                                            "id": "2:8",
                                            "name": "Feature Icon Vector",
                                            "type": "VECTOR",
                                        },
                                        {
                                            "id": "2:9",
                                            "name": "Feature Card Heading H3",
                                            "type": "TEXT",
                                            "characters": "AutoLayout to CSS Flex",
                                            "style": {"fontSize": 22, "fontWeight": 600},
                                        },
                                        {
                                            "id": "2:10",
                                            "name": "Feature Body Copy",
                                            "type": "TEXT",
                                            "characters": "Accurately maps horizontal and vertical flex items.",
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


def test_tokenize_hero_section_returns_all_token_types(hero_section_document=None):
    """Verifies that walking the document emits all 7 token types."""
    if hero_section_document is None:
        hero_section_document = globals()["hero_section_document"]()
    tokenizer = ComponentTokenizer()
    tokens = tokenizer.tokenize(hero_section_document)
    
    token_types = {t.type for t in tokens}
    expected_types = {
        TokenType.HEADING,
        TokenType.BUTTON,
        TokenType.IMAGE,
        TokenType.NAV,
        TokenType.CARD,
        TokenType.TEXT_BLOCK,
        TokenType.CONTAINER,
    }
    assert expected_types.issubset(token_types), f"Missing token types: {expected_types - token_types}"


def test_token_attributes_and_raw_properties(hero_section_document=None):
    """Verifies that Token objects preserve original node id and raw properties."""
    if hero_section_document is None:
        hero_section_document = globals()["hero_section_document"]()
    tokenizer = ComponentTokenizer()
    tokens = tokenizer.tokenize(hero_section_document)
    token_map = {t.figma_node_id: t for t in tokens}

    # Verify heading
    heading_tok = token_map["2:2"]
    assert heading_tok.type == TokenType.HEADING
    assert heading_tok.raw_properties["characters"] == "Accelerate WordPress Themes with AST"
    assert heading_tok.raw_properties["style"]["fontSize"] == 48

    # Verify button
    btn_tok = token_map["2:4"]
    assert btn_tok.type == TokenType.BUTTON
    assert btn_tok.raw_properties["cornerRadius"] == 10
    assert btn_tok.raw_properties["layoutMode"] == "HORIZONTAL"

    # Verify image fill
    img_tok = token_map["2:6"]
    assert img_tok.type == TokenType.IMAGE

    # Verify card
    card_tok = token_map["2:7"]
    assert card_tok.type == TokenType.CARD


def test_convenience_tokenize_function(hero_section_document=None):
    """Verifies module-level convenience function tokenize_figma_document."""
    if hero_section_document is None:
        hero_section_document = globals()["hero_section_document"]()
    tokens = tokenize_figma_document(hero_section_document)
    assert isinstance(tokens, list)
    assert len(tokens) > 0
    assert all(isinstance(t, Token) for t in tokens)


def test_heading_classification_by_font_size_and_name():
    """Checks HEADING classification based on name patterns vs fontSize threshold."""
    tokenizer = ComponentTokenizer(heading_font_threshold=20.0)

    # By regex name
    node1 = {"type": "TEXT", "name": "Section Title", "style": {"fontSize": 14}}
    assert tokenizer.classify_node(node1) == TokenType.HEADING

    # By font size >= threshold
    node2 = {"type": "TEXT", "name": "Some text", "style": {"fontSize": 24}}
    assert tokenizer.classify_node(node2) == TokenType.HEADING

    # Regular body text
    node3 = {"type": "TEXT", "name": "Paragraph", "style": {"fontSize": 15, "fontWeight": 400}}
    assert tokenizer.classify_node(node3) == TokenType.TEXT_BLOCK


def test_button_classification():
    """Checks BUTTON classification on naming patterns and layout heuristics."""
    tokenizer = ComponentTokenizer()

    # By regex name
    btn1 = {"type": "FRAME", "name": "btn-primary", "children": []}
    assert tokenizer.classify_node(btn1) == TokenType.BUTTON

    # By structural heuristic: rounded corner + horizontal layout + text child
    btn2 = {
        "type": "FRAME",
        "name": "Frame 142",
        "cornerRadius": 6,
        "layoutMode": "HORIZONTAL",
        "children": [{"type": "TEXT", "characters": "Submit"}],
    }
    assert tokenizer.classify_node(btn2) == TokenType.BUTTON


def test_image_and_vector_classification():
    """Checks IMAGE classification for vectors, image fills, and naming."""
    tokenizer = ComponentTokenizer()

    vec_node = {"type": "VECTOR", "name": "Vector 1"}
    assert tokenizer.classify_node(vec_node) == TokenType.IMAGE

    img_fill_node = {
        "type": "RECTANGLE",
        "name": "Rectangle 5",
        "fills": [{"type": "IMAGE"}],
    }
    assert tokenizer.classify_node(img_fill_node) == TokenType.IMAGE


def test_nav_and_card_classification():
    """Checks NAV and CARD classifications."""
    tokenizer = ComponentTokenizer()

    nav_node = {"type": "FRAME", "name": "Navbar Container", "children": []}
    assert tokenizer.classify_node(nav_node) == TokenType.NAV

    card_node = {"type": "FRAME", "name": "Pricing Card Item", "children": []}
    assert tokenizer.classify_node(card_node) == TokenType.CARD


if __name__ == "__main__":
    doc = hero_section_document()
    test_tokenize_hero_section_returns_all_token_types(doc)
    test_token_attributes_and_raw_properties(doc)
    test_convenience_tokenize_function(doc)
    test_heading_classification_by_font_size_and_name()
    test_button_classification()
    test_image_and_vector_classification()
    test_nav_and_card_classification()
    print("All 7 test_component_tokenizer tests passed!")
