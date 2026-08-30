import React, { useState } from 'react';
import { Tag, Play, Code2, Search, Filter, Layers, CheckCircle2 } from 'lucide-react';
import { Token, TokenType } from '../types/compiler';

interface TokenizerPlaygroundProps {
  tokens: Token[];
  figmaJsonStr: string;
  onFigmaJsonChange: (val: string) => void;
  onRunTokenize: () => void;
}

const TOKEN_COLORS: Record<TokenType, { bg: string; text: string; border: string }> = {
  HEADING: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
  BUTTON: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  IMAGE: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  NAV: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20' },
  CARD: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
  TEXT_BLOCK: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
  CONTAINER: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
};

export const TokenizerPlayground: React.FC<TokenizerPlaygroundProps> = ({
  tokens,
  figmaJsonStr,
  onFigmaJsonChange,
  onRunTokenize,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  const filteredTokens = tokens.filter((t) => {
    if (filterType !== 'ALL' && t.type !== filterType) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const name = String(t.raw_properties?.name || '').toLowerCase();
      const id = String(t.figma_node_id || '').toLowerCase();
      return name.includes(q) || id.includes(q);
    }
    return true;
  });

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-950">
      {/* Left Column: Figma JSON input */}
      <div className="w-1/2 border-r border-slate-800 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-semibold text-slate-200">Raw Figma Node JSON</span>
          </div>
          <button
            onClick={onRunTokenize}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition cursor-pointer"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Tokenize</span>
          </button>
        </div>
        <div className="flex-1 p-2 bg-slate-950">
          <textarea
            value={figmaJsonStr}
            onChange={(e) => onFigmaJsonChange(e.target.value)}
            className="w-full h-full p-3 font-mono text-xs text-slate-300 bg-slate-900/70 border border-slate-800 rounded-lg resize-none focus:outline-none focus:border-indigo-500 leading-relaxed"
            spellCheck={false}
          />
        </div>
      </div>

      {/* Right Column: Classified Tokens List */}
      <div className="w-1/2 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-slate-200">
              Classified Tokens ({tokens.length})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-36 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Types</option>
              <option value="HEADING">HEADING</option>
              <option value="BUTTON">BUTTON</option>
              <option value="IMAGE">IMAGE</option>
              <option value="NAV">NAV</option>
              <option value="CARD">CARD</option>
              <option value="TEXT_BLOCK">TEXT_BLOCK</option>
              <option value="CONTAINER">CONTAINER</option>
            </select>
          </div>
        </div>

        {/* Tokens List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredTokens.map((token, idx) => {
            const colors = TOKEN_COLORS[token.type] || TOKEN_COLORS.CONTAINER;
            return (
              <div
                key={`${token.figma_node_id}-${idx}`}
                className="p-3 rounded-lg bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 transition space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${colors.bg} ${colors.text} ${colors.border}`}
                    >
                      {token.type}
                    </span>
                    <span className="text-xs font-medium text-slate-200">
                      {token.raw_properties?.name || 'Unnamed Node'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    ID: {token.figma_node_id}
                  </span>
                </div>

                {token.raw_properties?.characters && (
                  <div className="text-[11px] text-slate-300 bg-slate-950/60 p-2 rounded border border-slate-800/60 font-sans">
                    &ldquo;{token.raw_properties.characters}&rdquo;
                  </div>
                )}

                <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 font-mono pt-1">
                  {token.raw_properties?.layoutMode && (
                    <span>Layout: {token.raw_properties.layoutMode}</span>
                  )}
                  {token.raw_properties?.cornerRadius !== undefined && (
                    <span>Radius: {token.raw_properties.cornerRadius}px</span>
                  )}
                  {token.raw_properties?.post_type && (
                    <span className="text-emerald-400 font-semibold">
                      CPT: {token.raw_properties.post_type}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
