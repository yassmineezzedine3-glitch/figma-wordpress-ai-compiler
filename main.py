"""
figma-wordpress-compiler: End-to-End Compiler Pipeline CLI & Core Orchestrator
Chains the full compiler pipeline:
1. figma_client.get_file_structure(file_key) -> raw Figma JSON
2. component_tokenizer.tokenize(document) -> Token list
3. ast_builder.build(tokens, document) -> ASTNode tree
4. content_enricher.enrich(ast_root) -> AI-enriched ASTNode tree
5. theme_generator.generate(ast_root) -> WordPress theme files dict
Writes compiled theme files to /output/{theme_name}/
"""
import os
import sys
import json
import argparse
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional

# Core compiler imports
import parser.figma_client as figma_client
import parser.component_tokenizer as component_tokenizer
import ast.ast_builder as ast_builder
import ai_layer.content_enricher as content_enricher
import codegen.theme_generator as theme_generator

from parser.figma_client import FigmaClient, get_file_structure, FigmaAPIError
from parser.component_tokenizer import ComponentTokenizer, tokenize_figma_document, tokenize
from ast.ast_builder import ASTBuilder, build_ast_from_tokens, build
from ast.nodes import ASTNode
from ai_layer.content_enricher import ContentEnricher, enrich_ast_content, enrich
from codegen.theme_generator import WordPressThemeGenerator, generate_theme_from_ast, generate

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("figma-wordpress-compiler")


def run_pipeline(
    file_key: Optional[str] = None,
    figma_token: Optional[str] = None,
    claude_api_key: Optional[str] = None,
    theme_name: Optional[str] = None,
    theme_slug: Optional[str] = None,
    output_dir: str = "/output",
    local_file: Optional[str] = None,
    figma_data: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Executes the full Figma-to-WordPress compilation pipeline:
    Figma JSON -> Tokenization -> AST Hierarchy -> Claude AI Enrichment -> WordPress Theme Files -> Disk Output
    
    Args:
        file_key: Figma file key (from URL https://figma.com/file/{file_key}/...).
        figma_token: Figma personal access token (or FIGMA_TOKEN env var).
        claude_api_key: Claude API key for AI enrichment (or ANTHROPIC_API_KEY env var).
        theme_name: Human-readable theme name.
        theme_slug: WordPress theme directory slug.
        output_dir: Destination output root directory.
        local_file: Path to a local Figma JSON file (for testing/offline mode).
        figma_data: In-memory Figma JSON dictionary (if already loaded).

    Returns:
        Dictionary with compilation results, file paths, and AST tree.
    """
    logger.info("=== Starting Figma to WordPress Compilation Pipeline ===")

    # Step 1: Ingest Figma File Structure (figma_client.get_file_structure)
    if figma_data is not None:
        logger.info("Step 1/5: Using in-memory Figma document JSON payload.")
        raw_figma_json = figma_data
    elif local_file:
        logger.info(f"Step 1/5: Loading local Figma JSON fixture from '{local_file}'.")
        with open(local_file, "r", encoding="utf-8") as f:
            raw_figma_json = json.load(f)
    elif file_key:
        logger.info(f"Step 1/5: Fetching file structure for key '{file_key}' via figma_client.")
        raw_figma_json = figma_client.get_file_structure(file_key, token=figma_token)
    else:
        raise ValueError("Must provide either 'file_key', 'local_file', or 'figma_data' to compile.")

    # Determine theme metadata
    doc_name = raw_figma_json.get("name") or "Figma Landing Page"
    resolved_theme_name = theme_name or doc_name
    resolved_theme_slug = (
        theme_slug
        or resolved_theme_name.lower().replace(" ", "-").replace("_", "-").strip("-")
    )

    # Step 2: Tokenize Figma Components (component_tokenizer.tokenize)
    logger.info("Step 2/5: Tokenizing document tree via component_tokenizer.")
    tokens = component_tokenizer.tokenize(raw_figma_json)
    logger.info(f"Classified {len(tokens)} semantic component tokens.")

    # Step 3: Construct Hierarchical AST (ast_builder.build)
    logger.info("Step 3/5: Building nested intermediate representation AST via ast_builder.")
    ast_root = ast_builder.build(tokens, raw_figma_json)

    # Step 4: AI Content Enrichment (content_enricher.enrich)
    logger.info("Step 4/5: Enriching AST with accessibility alt-text, SEO copy, and placeholder flags via Claude AI.")
    enriched_ast = content_enricher.enrich(ast_root, api_key=claude_api_key)

    # Step 5: WordPress Code Generation (theme_generator.generate)
    logger.info(f"Step 5/5: Compiling AST into WordPress theme files for '{resolved_theme_name}'.")
    theme_files = theme_generator.generate(
        ast_root=enriched_ast,
        theme_name=resolved_theme_name,
        theme_slug=resolved_theme_slug,
    )

    # Step 6: Write generated files to target output directory
    target_theme_dir = os.path.join(output_dir, resolved_theme_slug)
    os.makedirs(target_theme_dir, exist_ok=True)

    written_paths: List[str] = []
    for filename, content in theme_files.items():
        file_path = os.path.join(target_theme_dir, filename)
        # Ensure parent subdirectories exist (e.g. template-parts/)
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        written_paths.append(file_path)
        logger.info(f"  -> Generated: {file_path} ({len(content.encode('utf-8'))} bytes)")

    logger.info(f"Successfully generated {len(written_paths)} theme files at '{target_theme_dir}'.")

    return {
        "theme_name": resolved_theme_name,
        "theme_slug": resolved_theme_slug,
        "output_dir": target_theme_dir,
        "files": theme_files,
        "written_files": written_paths,
        "ast_root": enriched_ast,
        "tokens": tokens,
    }


def main():
    """CLI entrypoint."""
    parser = argparse.ArgumentParser(
        description="Compile a Figma design into a production-grade WordPress theme."
    )
    parser.add_argument(
        "file_key",
        nargs="?",
        default=None,
        help="Figma file key (from Figma document URL)",
    )
    parser.add_argument(
        "--file-key",
        "-f",
        dest="flag_file_key",
        default=None,
        help="Figma file key (alternative flag)",
    )
    parser.add_argument(
        "--token",
        "-t",
        default=os.getenv("FIGMA_TOKEN"),
        help="Figma personal access token (defaults to FIGMA_TOKEN env variable)",
    )
    parser.add_argument(
        "--claude-key",
        "-c",
        default=os.getenv("ANTHROPIC_API_KEY") or os.getenv("CLAUDE_API_KEY"),
        help="Claude API key for AI enrichment (defaults to ANTHROPIC_API_KEY)",
    )
    parser.add_argument(
        "--theme-name",
        "-n",
        default=None,
        help="Theme display name (e.g., 'Aura SaaS Theme')",
    )
    parser.add_argument(
        "--theme-slug",
        "-s",
        default=None,
        help="Theme directory slug (e.g., 'aura-saas')",
    )
    parser.add_argument(
        "--output-dir",
        "-o",
        default=os.getenv("OUTPUT_DIR", "/output"),
        help="Output directory base path (defaults to /output)",
    )
    parser.add_argument(
        "--local-file",
        "-l",
        default=None,
        help="Path to local Figma JSON fixture file (bypasses Figma network API)",
    )

    args = parser.parse_args()

    effective_file_key = args.file_key or args.flag_file_key

    if not effective_file_key and not args.local_file:
        parser.error("Please provide a Figma file_key argument or --local-file path.")

    try:
        result = run_pipeline(
            file_key=effective_file_key,
            figma_token=args.token,
            claude_api_key=args.claude_key,
            theme_name=args.theme_name,
            theme_slug=args.theme_slug,
            output_dir=args.output_dir,
            local_file=args.local_file,
        )
        print(f"\n[SUCCESS] WordPress theme compiled successfully!")
        print(f"Destination: {result['output_dir']}")
        print("Generated files:")
        for path in result["written_files"]:
            print(f" - {os.path.basename(path)}")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Compilation pipeline failed: {e}", exc_info=True)
        print(f"\n[ERROR] Compilation failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
