import React from 'react';
import { Layers, Play, CheckCircle2, Terminal, Code, Eye } from 'lucide-react';
import { SamplePreset } from '../types/compiler';

interface NavbarProps {
  presets: SamplePreset[];
  selectedPresetId: string;
  onSelectPreset: (id: string) => void;
  onRunTokenize: () => void;
  onOpenPreview?: () => void;
  tokenCount: number;
  testPassCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  presets,
  selectedPresetId,
  onSelectPreset,
  onRunTokenize,
  onOpenPreview,
  tokenCount,
  testPassCount,
}) => {
  return (
    <header className="h-14 border-b border-slate-800 bg-slate-900/90 px-4 flex items-center justify-between shrink-0 z-20">
      {/* Brand & Title */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
          <Layers className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-100 tracking-tight">
              Figma &rarr; WordPress AST Compiler
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              v1.0.0
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-none">
            Deterministic token classification, IR generation, and WordPress theme bundling
          </p>
        </div>
      </div>

      {/* Preset Selector & Action Buttons */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Design Preset:</span>
          <select
            value={selectedPresetId}
            onChange={(e) => onSelectPreset(e.target.value)}
            className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {onOpenPreview && (
          <button
            onClick={onOpenPreview}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white border border-slate-700 text-xs font-semibold shadow-sm transition cursor-pointer"
            title="Open Live WordPress Theme Preview Modal"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-400" />
            <span>Live Preview</span>
          </button>
        )}

        <button
          onClick={onRunTokenize}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Re-compile AST</span>
        </button>
      </div>
    </header>
  );
};
