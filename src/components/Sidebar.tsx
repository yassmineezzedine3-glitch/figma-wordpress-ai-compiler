import React from 'react';
import {
  Tag,
  GitFork,
  CheckCircle2,
  FileCode2,
  PackageCheck,
  Cpu,
  Folder,
} from 'lucide-react';

export type ActiveTab = 'tokenizer' | 'ast' | 'tests' | 'code' | 'wordpress';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  tokenCount: number;
  testPassCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  tokenCount,
  testPassCount,
}) => {
  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900/60 flex flex-col justify-between shrink-0">
      <div className="p-3 space-y-4">
        {/* Navigation Tabs */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 mb-2">
            Compiler Pipeline
          </div>
          <nav className="space-y-1">
            <button
              onClick={() => onTabChange('tokenizer')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'tokenizer'
                  ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Tag className="w-4 h-4 text-indigo-400" />
                <span>Component Tokenizer</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {tokenCount}
              </span>
            </button>

            <button
              onClick={() => onTabChange('ast')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'ast'
                  ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <GitFork className="w-4 h-4 text-violet-400" />
                <span>AST Intermediate Tree</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">
                IR
              </span>
            </button>

            <button
              onClick={() => onTabChange('tests')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'tests'
                  ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Pytest Suite</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                {testPassCount}/33 pass
              </span>
            </button>

            <button
              onClick={() => onTabChange('code')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'code'
                  ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileCode2 className="w-4 h-4 text-amber-400" />
                <span>Python Source Code</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                .py
              </span>
            </button>

            <button
              onClick={() => onTabChange('wordpress')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'wordpress'
                  ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <PackageCheck className="w-4 h-4 text-sky-400" />
                <span>WordPress Theme Export</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20">
                FSE
              </span>
            </button>
          </nav>
        </div>

        {/* Project Directory Tree */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 mb-2">
            Workspace Files
          </div>
          <div className="px-2 py-2 rounded-lg bg-slate-950/60 border border-slate-800 font-mono text-[11px] space-y-1">
            <div className="flex items-center gap-1.5 text-slate-300 font-medium">
              <Folder className="w-3.5 h-3.5 text-indigo-400" />
              <span>parser/</span>
            </div>
            <div className="flex items-center gap-2 ml-4 text-indigo-300 font-medium">
              <span className="text-slate-600">|_</span> component_tokenizer.py
            </div>
            <div className="flex items-center gap-2 ml-4 text-slate-400">
              <span className="text-slate-600">|_</span> __init__.py
            </div>

            <div className="flex items-center gap-1.5 text-slate-300 font-medium pt-1">
              <Folder className="w-3.5 h-3.5 text-violet-400" />
              <span>ast/</span>
            </div>
            <div className="flex items-center gap-2 ml-4 text-violet-300 font-medium">
              <span className="text-slate-600">|_</span> nodes.py
            </div>
            <div className="flex items-center gap-2 ml-4 text-violet-300 font-medium">
              <span className="text-slate-600">|_</span> ast_builder.py
            </div>
            <div className="flex items-center gap-2 ml-4 text-slate-400">
              <span className="text-slate-600">|_</span> builder.py
            </div>

            <div className="flex items-center gap-1.5 text-slate-300 font-medium pt-1">
              <Folder className="w-3.5 h-3.5 text-emerald-400" />
              <span>tests/</span>
            </div>
            <div className="flex items-center gap-2 ml-4 text-emerald-300 font-medium">
              <span className="text-slate-600">|_</span> test_component_tokenizer.py
            </div>
            <div className="flex items-center gap-2 ml-4 text-emerald-300 font-medium">
              <span className="text-slate-600">|_</span> test_ast_builder.py
            </div>
          </div>
        </div>
      </div>

      {/* Compiler Specs Footer */}
      <div className="p-3 border-t border-slate-800 text-xs">
        <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1 text-[11px]">
              <Cpu className="w-3.5 h-3.5 text-slate-400" />
              Figma AST Engine
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">ONLINE</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-700/50 text-[10px] text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-3 h-3" />
              33/33 passed
            </span>
            <span className="font-mono text-slate-400">Python 3.10+</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
