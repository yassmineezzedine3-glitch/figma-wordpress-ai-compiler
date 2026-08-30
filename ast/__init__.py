"""
figma-wordpress-compiler: AST Intermediate Representation Package
Also bridges Python standard library ast functions to prevent module shadowing.
"""
import os
import sys
import importlib.util

# 1. Bridge Python's standard library `ast` module so `inspect`, `jinja2`, etc. function properly
_stdlib_ast = None
try:
    _stdlib_dir = os.path.dirname(os.__file__)
    _ast_path = os.path.join(_stdlib_dir, 'ast.py')
    if os.path.exists(_ast_path):
        _spec = importlib.util.spec_from_file_location('_real_stdlib_ast', _ast_path)
        if _spec and _spec.loader:
            _stdlib_ast = importlib.util.module_from_spec(_spec)
            _spec.loader.exec_module(_stdlib_ast)
            for _k in dir(_stdlib_ast):
                if not _k.startswith('__'):
                    globals()[_k] = getattr(_stdlib_ast, _k)
except Exception:
    pass

# 2. Custom AST Compiler Exports
_CUSTOM_EXPORTS = {
    "ASTNode",
    "AstNode",
    "HeaderNode",
    "SectionNode",
    "HeadingNode",
    "ButtonNode",
    "DynamicLoopNode",
    "PhpHookNode",
    "ASTBuilder",
    "build_ast_from_tokens",
    "build_ast_tree",
    "build",
}

def __getattr__(name: str):
    if name in {
        "ASTNode",
        "AstNode",
        "HeaderNode",
        "SectionNode",
        "HeadingNode",
        "ButtonNode",
        "DynamicLoopNode",
        "PhpHookNode",
    }:
        import ast.nodes as _nodes
        val = getattr(_nodes, name)
        globals()[name] = val
        return val

    if name in {
        "ASTBuilder",
        "build_ast_from_tokens",
        "build_ast_tree",
        "build",
    }:
        import ast.ast_builder as _ast_builder
        val = getattr(_ast_builder, name)
        globals()[name] = val
        return val

    if _stdlib_ast and hasattr(_stdlib_ast, name):
        return getattr(_stdlib_ast, name)

    raise AttributeError(f"module 'ast' has no attribute '{name}'")

__all__ = [
    "ASTNode",
    "AstNode",
    "HeaderNode",
    "SectionNode",
    "HeadingNode",
    "ButtonNode",
    "DynamicLoopNode",
    "PhpHookNode",
    "ASTBuilder",
    "build_ast_from_tokens",
    "build_ast_tree",
    "build",
]
