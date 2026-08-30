"""
Unit tests for the WordPress Theme Generator module (/codegen/theme_generator.py).
Verifies:
- Generating page-template.php from a small 3-node AST fixture.
- Output contains standard WordPress template tags (get_header, get_footer, esc_html, esc_url, etc.).
- Registering Custom Post Types in functions.php discovered during AST traversal.
- Emitting style.css with standard WordPress theme header comments.
"""
import pytest
from typing import Dict, Any

from ast.nodes import ASTNode
from codegen.theme_generator import (
    WordPressThemeGenerator,
    generate_theme_from_ast,
    generate_template_from_ast,
)


def test_generate_template_from_3_node_ast_fixture():
    """
    Verifies that a 3-node AST fixture (Container -> Heading + Button)
    generates a valid page-template.php with expected WordPress template tags.
    """
    # 1. Heading child node
    heading_node = ASTNode(
        node_type="HEADING",
        semantic_role="hero_title",
        properties={
            "id": "1:2",
            "name": "Hero Title Text",
            "characters": "Elevate Your WordPress Experience",
            "style": {"fontSize": 48, "fontWeight": 700},
        },
        children=[],
    )

    # 2. Button child node
    button_node = ASTNode(
        node_type="BUTTON",
        semantic_role="primary_cta",
        properties={
            "id": "1:3",
            "name": "Primary Action CTA",
            "characters": "Start Free Trial",
            "cornerRadius": 8,
        },
        children=[],
    )

    # 3. Root container node (Parent of Heading and Button -> Total 3 nodes)
    root_container = ASTNode(
        node_type="CONTAINER",
        semantic_role="hero_section",
        properties={
            "id": "1:1",
            "name": "Hero Container Section",
            "layoutMode": "VERTICAL",
        },
        children=[heading_node, button_node],
    )

    # Instantiate WordPressThemeGenerator
    generator = WordPressThemeGenerator(
        ast_root=root_container,
        theme_name="Starlight Theme",
        theme_slug="starlight-theme",
    )

    template_output = generator.generate_page_template(template_name="Hero Landing Page")

    # Verify standard WordPress template tags
    assert "Template Name: Hero Landing Page" in template_output
    assert "get_header();" in template_output
    assert "get_footer();" in template_output
    assert "esc_html(" in template_output
    assert "esc_url(" in template_output
    assert "home_url(" in template_output

    # Verify HTML semantic structure rendered from AST
    assert "<main" in template_output
    assert "</main>" in template_output
    assert "<section" in template_output
    assert "<h1" in template_output
    assert "Elevate Your WordPress Experience" in template_output
    assert "Start Free Trial" in template_output
    assert "btn" in template_output
    assert "btn-primary" in template_output


def test_functions_php_cpt_registration():
    """
    Verifies that Custom Post Types in the AST are extracted and registered
    via register_post_type() in functions.php.
    """
    cpt_card = ASTNode(
        node_type="CARD",
        semantic_role="portfolio_card",
        properties={
            "id": "2:2",
            "name": "Project Card",
        },
        children=[
            ASTNode(
                node_type="HEADING",
                semantic_role="post_title",
                properties={"name": "Title"},
                children=[],
            )
        ],
    )

    # Dynamic loop container defining a CPT
    dynamic_loop_section = ASTNode(
        node_type="CONTAINER",
        semantic_role="dynamic_post_loop",
        properties={
            "id": "2:1",
            "name": "Portfolio Grid",
            "post_type": "portfolio_item",
            "singular_name": "Portfolio Item",
            "plural_name": "Portfolio Items",
            "posts_per_page": 9,
        },
        children=[cpt_card],
    )

    generator = WordPressThemeGenerator(
        ast_root=dynamic_loop_section,
        theme_name="Portfolio Pro",
        theme_slug="portfolio-pro",
    )

    functions_output = generator.generate_functions_php()

    # Verify core theme setup
    assert "add_theme_support( 'title-tag' );" in functions_output
    assert "add_theme_support( 'post-thumbnails' );" in functions_output
    assert "register_nav_menus(" in functions_output
    assert "wp_enqueue_scripts" in functions_output

    # Verify CPT registration
    assert "register_post_type( 'portfolio_item'" in functions_output
    assert "Portfolio Item" in functions_output
    assert "Portfolio Items" in functions_output
    assert "add_action( 'init'," in functions_output


def test_style_css_header_comments():
    """
    Verifies that style.css contains valid WordPress theme header comment metadata.
    """
    dummy_root = ASTNode(node_type="CONTAINER", children=[])
    generator = WordPressThemeGenerator(
        ast_root=dummy_root,
        theme_name="Aurora SaaS Theme",
        theme_slug="aurora-saas",
        author="Compiler Author",
        version="2.1.0",
        description="A sleek modern SaaS WordPress theme.",
    )

    style_output = generator.generate_style_css()

    assert "Theme Name: Aurora SaaS Theme" in style_output
    assert "Author: Compiler Author" in style_output
    assert "Version: 2.1.0" in style_output
    assert "Description: A sleek modern SaaS WordPress theme." in style_output
    assert "Text Domain: aurora-saas" in style_output
    assert "--wp--preset--color--primary:" in style_output


def test_full_theme_bundle_generation():
    """
    Verifies that generate_theme_files() produces a complete set of theme files.
    """
    heading = ASTNode(
        node_type="HEADING",
        semantic_role="hero_title",
        properties={"characters": "Welcome to Full Site Editing"},
    )
    root = ASTNode(node_type="CONTAINER", children=[heading])

    files = generate_theme_from_ast(root, theme_name="Full Theme", theme_slug="full-theme")

    assert "page-template.php" in files
    assert "functions.php" in files
    assert "style.css" in files
    assert "header.php" in files
    assert "footer.php" in files
    assert "index.php" in files
    assert "theme.json" in files

    assert "get_header();" in files["page-template.php"]
    assert "get_footer();" in files["page-template.php"]
    assert "add_theme_support" in files["functions.php"]


def test_classic_vs_fse_export_modes():
    """
    Verifies that classic and FSE exports generate appropriate file sets.
    """
    heading = ASTNode(
        node_type="HEADING",
        semantic_role="hero_title",
        properties={"characters": "Hero Title"},
    )
    root = ASTNode(node_type="CONTAINER", children=[heading])
    generator = WordPressThemeGenerator(
        ast_root=root,
        theme_name="Hybrid Theme",
        theme_slug="hybrid-theme",
    )

    # 1. Classic export mode
    classic_files = generator.generate_theme_files(export_format="classic")
    assert "page-template.php" in classic_files
    assert "functions.php" in classic_files
    assert "header.php" in classic_files
    assert "footer.php" in classic_files
    assert "index.php" in classic_files
    assert "theme.json" not in classic_files

    # 2. FSE export mode
    fse_files = generator.generate_theme_files(export_format="fse")
    assert "theme.json" in fse_files
    assert "style.css" in fse_files
    assert "templates/index.html" in fse_files
    assert "templates/page.html" in fse_files
    assert "parts/header.html" in fse_files
    assert "parts/footer.html" in fse_files
    assert "page-template.php" not in fse_files


def test_export_theme_zip_contains_rendered_files_flat_at_root(tmp_path):
    """
    Verifies that export_theme_zip packages rendered theme files (processed via Jinja2)
    flat at the root of the ZIP with style.css at top level, and contains no raw .j2 templates.
    """
    import zipfile

    heading = ASTNode(
        node_type="HEADING",
        semantic_role="hero_title",
        properties={"characters": "Elevate Your Business"},
    )
    root = ASTNode(node_type="CONTAINER", children=[heading])
    generator = WordPressThemeGenerator(
        ast_root=root,
        theme_name="Nova Portfolio",
        theme_slug="nova-portfolio",
    )

    zip_file_path = str(tmp_path / "nova-portfolio.zip")
    generator.export_theme_zip(zip_file_path, export_format="all")

    with zipfile.ZipFile(zip_file_path, "r") as zf:
        namelist = zf.namelist()

        # 1. Verify style.css is placed FLAT at root for immediate WordPress recognition
        assert "style.css" in namelist
        assert "functions.php" in namelist
        assert "page-template.php" in namelist
        assert "header.php" in namelist
        assert "footer.php" in namelist
        assert "index.php" in namelist
        assert "theme.json" in namelist

        # 2. Verify NO raw .j2 template files and NO codegen/ directory inside zip
        assert not any(name.endswith(".j2") for name in namelist)
        assert not any(name.startswith("codegen/") for name in namelist)

        # 3. Verify content of rendered files in ZIP
        style_content = zf.read("style.css").decode("utf-8")
        assert "Theme Name: Nova Portfolio" in style_content
        assert "Text Domain: nova-portfolio" in style_content

        page_content = zf.read("page-template.php").decode("utf-8")
        assert "get_header();" in page_content
        assert "Elevate Your Business" in page_content
        assert "{{ " not in page_content  # Ensure Jinja2 tags are fully rendered


def test_ampersand_no_double_encoding():
    """
    Verifies that theme names and AST text properties containing ampersands (&) or
    already-encoded entities (&amp;) are not double-encoded in WordPress admin headers
    or generated PHP templates.
    """
    heading = ASTNode(
        node_type="HEADING",
        semantic_role="hero_title",
        properties={"characters": "Design & Innovation &amp; Growth"},
    )
    button = ASTNode(
        node_type="BUTTON",
        semantic_role="primary_cta",
        properties={"characters": "Research & Development"},
    )
    root = ASTNode(node_type="CONTAINER", children=[heading, button])

    generator = WordPressThemeGenerator(
        ast_root=root,
        theme_name="SaaS Agency &amp; Portfolio",
        theme_slug="saas-agency-portfolio",
        description="Theme for Design & Innovation",
    )

    style_output = generator.generate_style_css()
    # Theme Name in style.css must have clean unescaped "&"
    assert "Theme Name: SaaS Agency & Portfolio" in style_output
    assert "&amp;" not in style_output

    page_output = generator.generate_page_template(template_name="Agency & Portfolio Template")
    # Template Name comment header must have clean unescaped "&"
    assert "Template Name: Agency & Portfolio Template" in page_output
    # Page template PHP should use esc_html('...') with unescaped literal '&'
    assert "esc_html( 'Design & Innovation & Growth' )" in page_output
    assert "esc_html( 'Research & Development' )" in page_output
    assert "&amp;" not in page_output

    theme_json_output = generator.generate_theme_json()
    assert '"title": "SaaS Agency & Portfolio"' in theme_json_output
    assert "&amp;" not in theme_json_output


def test_front_page_and_home_ast_content_rendering():
    """
    Verifies that front-page.php and home.php render the AST-derived layout directly
    (headings, buttons, images, cards, text blocks) so the activated WordPress theme
    immediately displays the Figma design rather than falling back to sample post loops.
    """
    hero_title = ASTNode(
        node_type="HEADING",
        semantic_role="hero_title",
        properties={"characters": "AI-Powered SaaS Platform", "fontSize": 48},
    )
    hero_subtitle = ASTNode(
        node_type="TEXT_BLOCK",
        semantic_role="hero_subtitle",
        properties={"characters": "Scale your workflow effortlessly with next-generation tooling."},
    )
    cta_btn = ASTNode(
        node_type="BUTTON",
        semantic_role="primary_cta",
        properties={"characters": "Get Started Free"},
    )
    feature_heading = ASTNode(
        node_type="HEADING",
        semantic_role="feature_title",
        properties={"characters": "Core Capabilities", "fontSize": 28},
    )
    feature_card = ASTNode(
        node_type="CARD",
        semantic_role="feature_item",
        children=[
            ASTNode(
                node_type="TEXT_BLOCK",
                properties={"characters": "Real-time sync and automated code generation."},
            )
        ],
    )
    root = ASTNode(
        node_type="CONTAINER",
        children=[hero_title, hero_subtitle, cta_btn, feature_heading, feature_card],
    )

    generator = WordPressThemeGenerator(
        ast_root=root,
        theme_name="SaaS Hero Platform",
        theme_slug="saas-hero-platform",
    )

    # 1. Verify front-page.php
    front_page_php = generator.generate_front_page_php()
    assert "get_header();" in front_page_php
    assert "get_footer();" in front_page_php
    assert "front-page-container" in front_page_php or "site-main" in front_page_php
    assert "AI-Powered SaaS Platform" in front_page_php
    assert "Scale your workflow effortlessly with next-generation tooling." in front_page_php
    assert "Get Started Free" in front_page_php
    assert "Core Capabilities" in front_page_php
    assert "Real-time sync and automated code generation." in front_page_php
    # Ensure default 'Hello world' post loop is NOT used
    assert "have_posts()" not in front_page_php or "dynamic-cpt-section" in front_page_php

    # 2. Verify home.php
    home_php = generator.generate_home_php()
    assert "get_header();" in home_php
    assert "get_footer();" in home_php
    assert "AI-Powered SaaS Platform" in home_php
    assert "Get Started Free" in home_php

    # 3. Verify classic theme files dictionary includes front-page.php and home.php
    classic_files = generator.generate_classic_theme_files()
    assert "front-page.php" in classic_files
    assert "home.php" in classic_files
    assert "page-template.php" in classic_files
    assert "style.css" in classic_files
    assert "functions.php" in classic_files
    assert "header.php" in classic_files
    assert "footer.php" in classic_files
    assert "index.php" in classic_files



