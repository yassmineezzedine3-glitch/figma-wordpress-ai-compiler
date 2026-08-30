"""
Integration tests for the end-to-end Figma-to-WordPress compilation pipeline in main.py.
Chains:
  figma_client.get_file_structure -> component_tokenizer.tokenize -> ast_builder.build -> content_enricher.enrich -> theme_generator.generate
Uses a realistic Figma landing page fixture (Navbar, Hero, Features Grid, Footer)
and asserts that the output directory contains valid WordPress PHP and theme files.
"""
import os
import json
import tempfile
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock

import main
from main import run_pipeline


@pytest.fixture
def realistic_figma_landing_page_json():
    """
    Realistic Figma REST API JSON payload representing a complete landing page:
    - Navbar (Logo image, menu links, CTA button)
    - Hero Section (H1 headline, subtitle, primary/secondary action buttons, hero mockup image)
    - Features Grid (H2 section title, 3 feature cards with icons, H3 titles, descriptions)
    - Footer (Brand info, copyright text)
    """
    return {
        "name": "Novaflow Cloud Platform",
        "lastModified": "2026-08-29T12:00:00Z",
        "thumbnailUrl": "https://figma.com/thumbnails/novaflow.png",
        "version": "1.0.0",
        "document": {
            "id": "0:0",
            "name": "Document",
            "type": "DOCUMENT",
            "children": [
                {
                    "id": "0:1",
                    "name": "Landing Page Canvas",
                    "type": "CANVAS",
                    "children": [
                        {
                            "id": "1:0",
                            "name": "Novaflow Landing Page",
                            "type": "FRAME",
                            "layoutMode": "VERTICAL",
                            "children": [
                                # 1. NAVBAR
                                {
                                    "id": "1:10",
                                    "name": "Navbar Header",
                                    "type": "FRAME",
                                    "layoutMode": "HORIZONTAL",
                                    "children": [
                                        {
                                            "id": "1:11",
                                            "name": "Novaflow Logo",
                                            "type": "RECTANGLE",
                                            "fills": [{"type": "IMAGE", "imageRef": "logo_img_01"}],
                                        },
                                        {
                                            "id": "1:12",
                                            "name": "Nav Brand Text",
                                            "type": "TEXT",
                                            "characters": "Novaflow Cloud",
                                            "style": {"fontSize": 20, "fontWeight": 700},
                                        },
                                        {
                                            "id": "1:13",
                                            "name": "Nav Links Group",
                                            "type": "FRAME",
                                            "layoutMode": "HORIZONTAL",
                                            "children": [
                                                {
                                                    "id": "1:14",
                                                    "name": "Features Link",
                                                    "type": "TEXT",
                                                    "characters": "Features",
                                                },
                                                {
                                                    "id": "1:15",
                                                    "name": "Pricing Link",
                                                    "type": "TEXT",
                                                    "characters": "Pricing",
                                                },
                                                {
                                                    "id": "1:16",
                                                    "name": "Documentation Link",
                                                    "type": "TEXT",
                                                    "characters": "Docs",
                                                },
                                            ],
                                        },
                                        {
                                            "id": "1:17",
                                            "name": "Navbar CTA Button",
                                            "type": "FRAME",
                                            "cornerRadius": 6,
                                            "children": [
                                                {
                                                    "id": "1:18",
                                                    "name": "CTA Text",
                                                    "type": "TEXT",
                                                    "characters": "Get Started",
                                                    "style": {"fontSize": 14, "fontWeight": 600},
                                                }
                                            ],
                                        },
                                    ],
                                },
                                # 2. HERO SECTION
                                {
                                    "id": "1:20",
                                    "name": "Hero Section",
                                    "type": "FRAME",
                                    "layoutMode": "VERTICAL",
                                    "children": [
                                        {
                                            "id": "1:21",
                                            "name": "Hero Main Heading",
                                            "type": "TEXT",
                                            "characters": "Deploy Full-Stack Clouds with Zero Configuration",
                                            "style": {"fontSize": 56, "fontWeight": 800},
                                        },
                                        {
                                            "id": "1:22",
                                            "name": "Hero Subtitle Description",
                                            "type": "TEXT",
                                            "characters": "Automate multi-cloud Kubernetes clusters with AI-powered autoscaling and instant worldwide edge routing.",
                                            "style": {"fontSize": 20, "fontWeight": 400},
                                        },
                                        {
                                            "id": "1:23",
                                            "name": "Hero Button Group",
                                            "type": "FRAME",
                                            "layoutMode": "HORIZONTAL",
                                            "children": [
                                                {
                                                    "id": "1:24",
                                                    "name": "Primary Action CTA Button",
                                                    "type": "FRAME",
                                                    "cornerRadius": 8,
                                                    "children": [
                                                        {
                                                            "id": "1:25",
                                                            "name": "Button Label",
                                                            "type": "TEXT",
                                                            "characters": "Start Free 14-Day Trial",
                                                            "style": {"fontSize": 16, "fontWeight": 700},
                                                        }
                                                    ],
                                                },
                                                {
                                                    "id": "1:26",
                                                    "name": "Secondary Action Button",
                                                    "type": "FRAME",
                                                    "cornerRadius": 8,
                                                    "children": [
                                                        {
                                                            "id": "1:27",
                                                            "name": "Button Label",
                                                            "type": "TEXT",
                                                            "characters": "Book Technical Demo",
                                                            "style": {"fontSize": 16, "fontWeight": 600},
                                                        }
                                                    ],
                                                },
                                            ],
                                        },
                                        {
                                            "id": "1:28",
                                            "name": "Hero Dashboard Mockup Graphic",
                                            "type": "RECTANGLE",
                                            "fills": [{"type": "IMAGE", "imageRef": "hero_mockup_01"}],
                                        },
                                    ],
                                },
                                # 3. FEATURES GRID SECTION
                                {
                                    "id": "1:30",
                                    "name": "Features Grid Section",
                                    "type": "FRAME",
                                    "layoutMode": "VERTICAL",
                                    "children": [
                                        {
                                            "id": "1:31",
                                            "name": "Features Section Title",
                                            "type": "TEXT",
                                            "characters": "Engineered for Extreme Velocity",
                                            "style": {"fontSize": 36, "fontWeight": 700},
                                        },
                                        {
                                            "id": "1:32",
                                            "name": "Features Section Subtitle",
                                            "type": "TEXT",
                                            "characters": "Everything modern infrastructure teams need to ship and scale production workloads.",
                                            "style": {"fontSize": 18, "fontWeight": 400},
                                        },
                                        {
                                            "id": "1:33",
                                            "name": "Features Cards Container",
                                            "type": "FRAME",
                                            "layoutMode": "HORIZONTAL",
                                            "children": [
                                                # Card 1
                                                {
                                                    "id": "1:34",
                                                    "name": "Feature Card Autoscaling",
                                                    "type": "FRAME",
                                                    "layoutMode": "VERTICAL",
                                                    "children": [
                                                        {
                                                            "id": "1:35",
                                                            "name": "Autoscaling Feature Icon",
                                                            "type": "VECTOR",
                                                            "fills": [{"type": "IMAGE", "imageRef": "icon_01"}],
                                                        },
                                                        {
                                                            "id": "1:36",
                                                            "name": "Feature Title",
                                                            "type": "TEXT",
                                                            "characters": "Instant Auto-Scaling",
                                                            "style": {"fontSize": 22, "fontWeight": 600},
                                                        },
                                                        {
                                                            "id": "1:37",
                                                            "name": "Feature Description",
                                                            "type": "TEXT",
                                                            "characters": "Scale from zero to millions of active connections seamlessly with sub-second response times.",
                                                            "style": {"fontSize": 15, "fontWeight": 400},
                                                        },
                                                    ],
                                                },
                                                # Card 2
                                                {
                                                    "id": "1:38",
                                                    "name": "Feature Card Security",
                                                    "type": "FRAME",
                                                    "layoutMode": "VERTICAL",
                                                    "children": [
                                                        {
                                                            "id": "1:39",
                                                            "name": "Security Feature Icon",
                                                            "type": "VECTOR",
                                                            "fills": [{"type": "IMAGE", "imageRef": "icon_02"}],
                                                        },
                                                        {
                                                            "id": "1:40",
                                                            "name": "Feature Title",
                                                            "type": "TEXT",
                                                            "characters": "Zero-Trust Security",
                                                            "style": {"fontSize": 22, "fontWeight": 600},
                                                        },
                                                        {
                                                            "id": "1:41",
                                                            "name": "Feature Description",
                                                            "type": "TEXT",
                                                            "characters": "End-to-end mTLS encryption, automated secrets rotation, and continuous compliance auditing.",
                                                            "style": {"fontSize": 15, "fontWeight": 400},
                                                        },
                                                    ],
                                                },
                                                # Card 3
                                                {
                                                    "id": "1:42",
                                                    "name": "Feature Card Global Edge",
                                                    "type": "FRAME",
                                                    "layoutMode": "VERTICAL",
                                                    "children": [
                                                        {
                                                            "id": "1:43",
                                                            "name": "Global Edge Feature Icon",
                                                            "type": "VECTOR",
                                                            "fills": [{"type": "IMAGE", "imageRef": "icon_03"}],
                                                        },
                                                        {
                                                            "id": "1:44",
                                                            "name": "Feature Title",
                                                            "type": "TEXT",
                                                            "characters": "Global Edge CDN",
                                                            "style": {"fontSize": 22, "fontWeight": 600},
                                                        },
                                                        {
                                                            "id": "1:45",
                                                            "name": "Feature Description",
                                                            "type": "TEXT",
                                                            "characters": "Deploy edge workloads in 300+ point-of-presence zones worldwide for ultra-low latency.",
                                                            "style": {"fontSize": 15, "fontWeight": 400},
                                                        },
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                                # 4. FOOTER
                                {
                                    "id": "1:50",
                                    "name": "Footer Section",
                                    "type": "FRAME",
                                    "layoutMode": "VERTICAL",
                                    "children": [
                                        {
                                            "id": "1:51",
                                            "name": "Footer Brand Copy",
                                            "type": "TEXT",
                                            "characters": "Novaflow Inc. All rights reserved. Built for developers worldwide.",
                                            "style": {"fontSize": 14, "fontWeight": 400},
                                        }
                                    ],
                                },
                            ],
                        }
                    ],
                }
            ],
        },
    }


def test_full_pipeline_integration_with_realistic_landing_page(realistic_figma_landing_page_json, tmp_path):
    """
    Executes the chained compilation pipeline from in-memory fixture through to disk output.
    Verifies all standard WordPress theme files are generated and contain valid PHP/CSS/JSON syntax.
    """
    output_base_dir = str(tmp_path / "output")

    # Run the full pipeline
    result = run_pipeline(
        figma_data=realistic_figma_landing_page_json,
        theme_name="Novaflow Cloud Theme",
        theme_slug="novaflow-cloud",
        output_dir=output_base_dir,
    )

    theme_dir = result["output_dir"]
    assert os.path.exists(theme_dir)
    assert result["theme_slug"] == "novaflow-cloud"

    # Verify all expected files are present in the output folder
    expected_files = [
        "page-template.php",
        "functions.php",
        "style.css",
        "header.php",
        "footer.php",
        "index.php",
        "theme.json",
    ]

    for filename in expected_files:
        file_path = os.path.join(theme_dir, filename)
        assert os.path.isfile(file_path), f"Expected generated file '{filename}' not found in {theme_dir}."
        assert os.path.getsize(file_path) > 0, f"Generated file '{filename}' is unexpectedly empty."

    # 1. Inspect page-template.php
    page_template_path = os.path.join(theme_dir, "page-template.php")
    with open(page_template_path, "r", encoding="utf-8") as f:
        page_tpl_content = f.read()

    assert page_tpl_content.startswith("<?php")
    assert "Template Name: Novaflow Cloud Theme" in page_tpl_content
    assert "get_header();" in page_tpl_content
    assert "get_footer();" in page_tpl_content
    assert "esc_html(" in page_tpl_content
    assert "esc_url(" in page_tpl_content
    assert "home_url(" in page_tpl_content
    # Check that Hero elements rendered
    assert "Deploy Full-Stack Clouds with Zero Configuration" in page_tpl_content
    assert "Start Free 14-Day Trial" in page_tpl_content
    assert "Engineered for Extreme Velocity" in page_tpl_content
    # Check that Feature cards rendered
    assert "Instant Auto-Scaling" in page_tpl_content
    assert "Zero-Trust Security" in page_tpl_content
    assert "Global Edge CDN" in page_tpl_content

    # 2. Inspect functions.php
    functions_php_path = os.path.join(theme_dir, "functions.php")
    with open(functions_php_path, "r", encoding="utf-8") as f:
        functions_content = f.read()

    assert functions_content.startswith("<?php")
    assert "add_action( 'after_setup_theme'" in functions_content
    assert "add_theme_support( 'title-tag' );" in functions_content
    assert "add_theme_support( 'post-thumbnails' );" in functions_content
    assert "register_nav_menus(" in functions_content
    assert "wp_enqueue_scripts" in functions_content
    assert "wp_enqueue_style(" in functions_content

    # 3. Inspect header.php & footer.php
    header_php_path = os.path.join(theme_dir, "header.php")
    with open(header_php_path, "r", encoding="utf-8") as f:
        header_content = f.read()
    assert "wp_head();" in header_content
    assert "wp_body_open();" in header_content
    assert "wp_nav_menu(" in header_content

    footer_php_path = os.path.join(theme_dir, "footer.php")
    with open(footer_php_path, "r", encoding="utf-8") as f:
        footer_content = f.read()
    assert "wp_footer();" in footer_content
    assert "site-footer" in footer_content

    # 4. Inspect style.css
    style_css_path = os.path.join(theme_dir, "style.css")
    with open(style_css_path, "r", encoding="utf-8") as f:
        style_content = f.read()
    assert "Theme Name: Novaflow Cloud Theme" in style_content
    assert "Text Domain: novaflow-cloud" in style_content
    assert "--wp--preset--color--primary:" in style_content

    # 5. Inspect theme.json
    theme_json_path = os.path.join(theme_dir, "theme.json")
    with open(theme_json_path, "r", encoding="utf-8") as f:
        theme_json_data = json.load(f)
    assert theme_json_data["version"] == 3
    assert "settings" in theme_json_data
    assert "palette" in theme_json_data["settings"]["color"]


def test_cli_pipeline_with_local_json_file(realistic_figma_landing_page_json, tmp_path):
    """
    Verifies main.py CLI execution when given a local JSON file path.
    """
    json_fixture_path = str(tmp_path / "landing_fixture.json")
    with open(json_fixture_path, "w", encoding="utf-8") as f:
        json.dump(realistic_figma_landing_page_json, f)

    output_base_dir = str(tmp_path / "cli_output")

    test_args = [
        "main.py",
        "--local-file", json_fixture_path,
        "--theme-name", "CLI Tested Theme",
        "--theme-slug", "cli-tested-theme",
        "--output-dir", output_base_dir,
    ]

    with patch("sys.argv", test_args):
        with pytest.raises(SystemExit) as exc_info:
            main.main()
        assert exc_info.value.code == 0

    expected_theme_dir = os.path.join(output_base_dir, "cli-tested-theme")
    assert os.path.isdir(expected_theme_dir)
    assert os.path.isfile(os.path.join(expected_theme_dir, "page-template.php"))
    assert os.path.isfile(os.path.join(expected_theme_dir, "functions.php"))
    assert os.path.isfile(os.path.join(expected_theme_dir, "style.css"))


@patch("parser.figma_client.FigmaClient.get_file_structure")
def test_cli_pipeline_with_figma_file_key(mock_get_file_structure, realistic_figma_landing_page_json, tmp_path):
    """
    Verifies main.py CLI execution when passed a Figma file_key argument.
    """
    mock_get_file_structure.return_value = realistic_figma_landing_page_json
    output_base_dir = str(tmp_path / "key_output")

    test_args = [
        "main.py",
        "abc123FigmaKey",
        "--token", "figd_mock_test_token_12345",
        "--theme-name", "Figma Key Theme",
        "--theme-slug", "figma-key-theme",
        "--output-dir", output_base_dir,
    ]

    with patch("sys.argv", test_args):
        with pytest.raises(SystemExit) as exc_info:
            main.main()
        assert exc_info.value.code == 0

    mock_get_file_structure.assert_called_once_with("abc123FigmaKey")
    theme_dir = os.path.join(output_base_dir, "figma-key-theme")
    assert os.path.isdir(theme_dir)
    assert os.path.isfile(os.path.join(theme_dir, "page-template.php"))
