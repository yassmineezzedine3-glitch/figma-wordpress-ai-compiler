import os
import sys

# Ensure local 'ast' package is resolvable alongside stdlib ast
import ast as _ast
_local_ast_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'ast'))
if not hasattr(_ast, '__path__'):
    _ast.__path__ = [_local_ast_dir]
elif _local_ast_dir not in _ast.__path__:
    _ast.__path__.append(_local_ast_dir)
