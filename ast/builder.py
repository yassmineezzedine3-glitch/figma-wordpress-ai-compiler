"""
figma-wordpress-compiler: AST Builder Module
Re-exports ASTBuilder and helper functions from ast_builder.
"""
from ast.ast_builder import (
    ASTBuilder,
    build_ast_from_tokens,
    build_ast_tree,
    build,
)
from ast.nodes import (
    ASTNode,
    AstNode,
    HeaderNode,
    SectionNode,
    HeadingNode,
    ButtonNode,
    DynamicLoopNode,
    PhpHookNode,
)

# Backward-compatible alias
AstBuilder = ASTBuilder

__all__ = [
    "ASTBuilder",
    "AstBuilder",
    "build_ast_from_tokens",
    "build_ast_tree",
    "build",
    "ASTNode",
    "AstNode",
    "HeaderNode",
    "SectionNode",
    "HeadingNode",
    "ButtonNode",
    "DynamicLoopNode",
    "PhpHookNode",
]
