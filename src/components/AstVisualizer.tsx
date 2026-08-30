import React, { useState } from 'react';
import { GitFork, ChevronRight, ChevronDown, Layers, Box, Tag, FileText } from 'lucide-react';
import { ASTNode } from '../types/compiler';

interface AstVisualizerProps {
  astRoot: ASTNode | null;
}

const TreeNode: React.FC<{ node: ASTNode; depth: number }> = ({ node, depth }) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;

  return (
    <div className="text-xs font-mono">
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 py-1 px-2 rounded-md hover:bg-slate-800/60 cursor-pointer transition"
        style={{ marginLeft: `${depth * 16}px` }}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          )
        ) : (
          <div className="w-3.5 h-3.5 shrink-0" />
        )}

        <span className="font-bold text-indigo-400">&lt;{node.node_type}&gt;</span>

        {node.semantic_role && (
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">
            role: {node.semantic_role}
          </span>
        )}

        {node.properties?.name && (
          <span className="text-slate-300 font-sans truncate">
            &ldquo;{node.properties.name}&rdquo;
          </span>
        )}

        {node.properties?.characters && (
          <span className="text-slate-400 font-sans text-[11px] truncate max-w-xs">
            - &quot;{node.properties.characters}&quot;
          </span>
        )}

        {node.properties?.post_type && (
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
            CPT: {node.properties.post_type}
          </span>
        )}
      </div>

      {hasChildren && expanded && (
        <div className="border-l border-slate-800 ml-4">
          {node.children.map((child, idx) => (
            <TreeNode key={`${child.properties?.id || idx}-${idx}`} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export const AstVisualizer: React.FC<AstVisualizerProps> = ({ astRoot }) => {
  const [activeView, setActiveView] = useState<'tree' | 'json'>('tree');

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
      {/* Header */}
      <div className="p-3 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitFork className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-semibold text-slate-200">
            AST Intermediate Representation (IR) Tree
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveView('tree')}
            className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${
              activeView === 'tree' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Visual Hierarchy
          </button>
          <button
            onClick={() => setActiveView('json')}
            className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${
              activeView === 'json' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            AST JSON
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {astRoot ? (
          activeView === 'tree' ? (
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
              <TreeNode node={astRoot} depth={0} />
            </div>
          ) : (
            <pre className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
              <code>{JSON.stringify(astRoot, null, 2)}</code>
            </pre>
          )
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs">
            No AST tree generated yet. Run tokenization to compile.
          </div>
        )}
      </div>
    </div>
  );
};
