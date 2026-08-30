"""
Unit tests for /ai_layer/content_enricher.py.
Tests mocked responses for:
  - Generating alt text for IMAGE nodes missing descriptions using Claude (claude-sonnet-4-5)
  - Synthesizing SEO-friendly meta description on the root ASTNode
  - Flagging TEXT_BLOCK nodes with placeholder / Lorem Ipsum content
  - Verifying the model passed to API is claude-sonnet-4-5
  - Convenience functions enrich_ast_content and enrich_ast
  - Graceful fallback when API key is absent / offline heuristic enrichment
  - Error handling when Claude API returns 500 error
"""
import json
import pytest
from unittest.mock import patch, MagicMock

from ast.nodes import ASTNode
from ai_layer.content_enricher import (
    ContentEnricher,
    ClaudeAPIError,
    enrich_ast_content,
    enrich_ast,
)


@pytest.fixture
def sample_ast_tree():
    """
    Creates a sample AST tree with:
    - Root CONTAINER
    - Header NAV with Logo IMAGE (missing alt text)
    - Hero Section CONTAINER with:
      - HEADING: 'Next-Gen Cloud Orchestration Platform'
      - TEXT_BLOCK: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' (Placeholder)
      - TEXT_BLOCK: 'Automate deployments and optimize multi-cloud infrastructure with zero friction.' (Real copy)
      - IMAGE: Hero graphic (missing alt text)
    """
    logo_image = ASTNode(
        node_type="IMAGE",
        semantic_role="brand_logo",
        properties={
            "id": "1:101",
            "name": "Brand Logo",
            # missing alt
        },
        children=[],
    )

    hero_heading = ASTNode(
        node_type="HEADING",
        semantic_role="hero_title",
        properties={
            "id": "1:201",
            "name": "Hero Main Heading",
            "characters": "Next-Gen Cloud Orchestration Platform",
            "style": {"fontSize": 48, "fontWeight": 800},
        },
        children=[],
    )

    placeholder_text = ASTNode(
        node_type="TEXT_BLOCK",
        semantic_role="hero_subtitle",
        properties={
            "id": "1:202",
            "name": "Placeholder Subtitle",
            "characters": "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor.",
        },
        children=[],
    )

    real_text = ASTNode(
        node_type="TEXT_BLOCK",
        semantic_role="feature_description",
        properties={
            "id": "1:203",
            "name": "Feature Description",
            "characters": "Automate deployments and optimize multi-cloud infrastructure with zero friction.",
        },
        children=[],
    )

    hero_image = ASTNode(
        node_type="IMAGE",
        semantic_role="featured_image",
        properties={
            "id": "1:204",
            "name": "Hero Dashboard Graphic",
            # missing alt
        },
        children=[],
    )

    hero_section = ASTNode(
        node_type="CONTAINER",
        semantic_role="hero_section",
        properties={"id": "1:200", "name": "Hero Section"},
        children=[hero_heading, placeholder_text, real_text, hero_image],
    )

    header_nav = ASTNode(
        node_type="NAV",
        semantic_role="site_header",
        properties={"id": "1:100", "name": "Header Navigation"},
        children=[logo_image],
    )

    root = ASTNode(
        node_type="CONTAINER",
        semantic_role="page_root",
        properties={"id": "0:1", "name": "CloudOrchestrator Landing Page"},
        children=[header_nav, hero_section],
    )

    return root


def test_content_enricher_initialization_defaults():
    """Verifies default model is claude-sonnet-4-5."""
    enricher = ContentEnricher(api_key="test-key")
    assert enricher.model == "claude-sonnet-4-5"
    assert enricher.api_key == "test-key"
    assert "messages" in enricher.base_url


@patch("requests.post")
def test_enrich_ast_generates_alt_text_meta_description_and_flags_placeholders(mock_post, sample_ast_tree):
    """
    Verifies that ContentEnricher queries Claude with model claude-sonnet-4-5
    and enriches the AST tree with alt text, SEO meta description, and placeholder flags.
    """
    mock_claude_response = {
        "content": [
            {
                "type": "text",
                "text": json.dumps({
                    "meta_description": "Supercharge your infrastructure with CloudOrchestrator - the next-generation multi-cloud automation and orchestration platform.",
                    "image_alt_texts": {
                        "1:101": "CloudOrchestrator official brand logo icon",
                        "1:204": "Interactive cloud infrastructure monitoring dashboard showing performance metrics",
                    },
                    "placeholder_flags": {
                        "1:202": {
                            "is_placeholder": True,
                            "reason": "Contains Latin Lorem Ipsum dummy copy"
                        },
                        "1:203": {
                            "is_placeholder": False,
                            "reason": "Legitimate product feature copy"
                        }
                    }
                })
            }
        ]
    }

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = mock_claude_response
    mock_post.return_value = mock_response

    enricher = ContentEnricher(api_key="sk-ant-test-12345")
    enriched_tree = enricher.enrich(sample_ast_tree)

    # 1. Verify API Call parameters
    assert mock_post.called
    call_kwargs = mock_post.call_args.kwargs
    assert call_kwargs["headers"]["x-api-key"] == "sk-ant-test-12345"
    assert call_kwargs["json"]["model"] == "claude-sonnet-4-5"

    # 2. Verify SEO Meta Description generated on Root ASTNode
    assert "meta_description" in enriched_tree.properties
    assert "CloudOrchestrator" in enriched_tree.properties["meta_description"]
    assert enriched_tree.properties["seo_meta_description"] == enriched_tree.properties["meta_description"]

    # 3. Verify Alt Text generated on IMAGE nodes
    logo_node = sample_ast_tree.children[0].children[0]
    assert logo_node.node_type == "IMAGE"
    assert logo_node.properties["alt"] == "CloudOrchestrator official brand logo icon"
    assert logo_node.properties["alt_text"] == "CloudOrchestrator official brand logo icon"

    hero_img_node = sample_ast_tree.children[1].children[3]
    assert hero_img_node.node_type == "IMAGE"
    assert "dashboard" in hero_img_node.properties["alt"]

    # 4. Verify Placeholder Flags on TEXT_BLOCK nodes
    placeholder_node = sample_ast_tree.children[1].children[1]
    assert placeholder_node.node_type == "TEXT_BLOCK"
    assert placeholder_node.properties["is_placeholder"] is True
    assert "placeholder" in placeholder_node.properties
    assert "Lorem Ipsum" in placeholder_node.properties["placeholder_reason"]

    real_text_node = sample_ast_tree.children[1].children[2]
    assert real_text_node.properties["is_placeholder"] is False


@patch("requests.post")
def test_convenience_enrich_ast_content(mock_post, sample_ast_tree):
    """Verifies the convenience functions enrich_ast_content and enrich_ast."""
    mock_claude_response = {
        "content": [
            {
                "type": "text",
                "text": json.dumps({
                    "meta_description": "Next-Gen Cloud Orchestration Platform for fast multi-cloud scaling.",
                    "image_alt_texts": {
                        "1:101": "Company Logo",
                        "1:204": "Hero graphic illustration",
                    },
                    "placeholder_flags": {
                        "1:202": {"is_placeholder": True, "reason": "Lorem Ipsum dummy text"},
                        "1:203": {"is_placeholder": False, "reason": "Production copy"}
                    }
                })
            }
        ]
    }
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = mock_claude_response
    mock_post.return_value = mock_response

    result = enrich_ast_content(sample_ast_tree, api_key="test-key")
    assert result.properties["meta_description"] == "Next-Gen Cloud Orchestration Platform for fast multi-cloud scaling."

    # Test alias enrich_ast
    result2 = enrich_ast(sample_ast_tree, api_key="test-key")
    assert result2 is not None


def test_fallback_heuristic_enrichment_when_offline(sample_ast_tree):
    """
    Verifies that ContentEnricher gracefully performs deterministic heuristic enrichment
    when no API key is provided and offline.
    """
    enricher = ContentEnricher(api_key="")
    enriched = enricher.enrich(sample_ast_tree)

    # Verify fallback meta description
    assert "meta_description" in enriched.properties
    assert len(enriched.properties["meta_description"]) > 10

    # Verify fallback alt text generated
    logo_node = sample_ast_tree.children[0].children[0]
    assert "alt" in logo_node.properties
    assert logo_node.properties["alt"] != ""

    # Verify fallback placeholder detection via regex
    placeholder_node = sample_ast_tree.children[1].children[1]
    assert placeholder_node.properties["is_placeholder"] is True

    real_text_node = sample_ast_tree.children[1].children[2]
    assert real_text_node.properties["is_placeholder"] is False


@patch("requests.post")
def test_claude_api_error_raised_on_500(mock_post, sample_ast_tree):
    """Verifies ClaudeAPIError is raised on HTTP 500 when API key is provided."""
    mock_response = MagicMock()
    mock_response.status_code = 500
    mock_response.text = "Internal Server Error"
    mock_post.return_value = mock_response

    enricher = ContentEnricher(api_key="valid-key")
    with pytest.raises(ClaudeAPIError) as exc_info:
        enricher.enrich(sample_ast_tree)

    assert "500" in str(exc_info.value)
