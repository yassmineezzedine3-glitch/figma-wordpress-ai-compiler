import React, { useState, useMemo } from 'react';
import {
  Download,
  FileCode,
  Package,
  Layers,
  Archive,
  Check,
  Copy,
  Sparkles,
  Eye,
  Settings,
  Flame,
  LayoutTemplate,
  Box,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  Code2,
} from 'lucide-react';
import { ASTNode } from '../types/compiler';
import { ThemeGenerator, GeneratedThemeFile, CustomPostTypeMeta } from '../utils/themeGenerator';
import { ThemePreviewModal } from './ThemePreviewModal';

interface WordPressExportViewProps {
  astRoot?: ASTNode | null;
  themeName?: string;
  themeSlug?: string;
}

export const WordPressExportView: React.FC<WordPressExportViewProps> = ({
  astRoot = null,
  themeName = 'Portfolio Pro Theme',
  themeSlug = 'portfolio-pro',
}) => {
  const [activeFormat, setActiveFormat] = useState<'classic' | 'fse' | 'all'>('classic');
  const [selectedFileIdx, setSelectedFileIdx] = useState<number>(0);
  const [isZipping, setIsZipping] = useState(false);
  const [zipSuccessFormat, setZipSuccessFormat] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);

  // Generate all files dynamically from the current AST
  const allFiles: GeneratedThemeFile[] = useMemo(() => {
    return ThemeGenerator.generateAllThemeFiles(astRoot, themeSlug, themeName);
  }, [astRoot, themeSlug, themeName]);

  const cpts: CustomPostTypeMeta[] = useMemo(() => {
    return ThemeGenerator.extractCustomPostTypes(astRoot);
  }, [astRoot]);

  // Filter files by the active format tab
  const formatFiles = useMemo(() => {
    if (activeFormat === 'classic') {
      return allFiles.filter((f) => f.category === 'classic');
    } else if (activeFormat === 'fse') {
      return allFiles.filter((f) => f.category === 'fse');
    } else {
      return allFiles;
    }
  }, [allFiles, activeFormat]);

  const currentFile = formatFiles[selectedFileIdx] || formatFiles[0] || allFiles[0];

  const handleCopyCode = () => {
    if (currentFile) {
      navigator.clipboard.writeText(currentFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadZip = async (format: 'all' | 'classic' | 'fse') => {
    try {
      setIsZipping(true);
      await ThemeGenerator.bundleAndDownloadZip(astRoot, format, themeSlug, themeName);
      setZipSuccessFormat(format);
      setTimeout(() => setZipSuccessFormat(null), 3000);
    } catch (err) {
      console.error('Failed to generate theme ZIP bundle:', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 text-slate-100">
      {/* Top Banner & Action Controls */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Package className="w-4 h-4" />
            </span>
            <h1 className="text-base font-bold text-slate-100">
              WordPress Theme Compiler & Export
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
              Flat ZIP Root • Instant WP Theme Detection
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Packages fully rendered WordPress files (processed through the compiler engine) placed flat at the root of the ZIP archive.
          </p>
        </div>

        {/* Live Preview & Bundle .zip Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPreviewModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 hover:text-white text-xs font-semibold border border-indigo-500/40 shadow-sm transition cursor-pointer"
            title="Open Live Iframe Preview of the Generated WordPress Theme"
          >
            <Eye className="w-4 h-4 text-indigo-400" />
            <span>Live Theme Preview</span>
          </button>

          <div className="dropdown relative group">
            <button
              onClick={() => handleDownloadZip('all')}
              disabled={isZipping}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md hover:shadow-indigo-500/20 transition cursor-pointer disabled:opacity-50"
              title="Download Rendered Theme ZIP (.zip) with style.css and templates flat at the root"
            >
              <Archive className="w-4 h-4" />
              <span>{isZipping ? 'Bundling ZIP...' : 'Download Theme ZIP (.zip)'}</span>
              <Download className="w-3.5 h-3.5 opacity-80" />
            </button>
          </div>

          <button
            onClick={() => handleDownloadZip('classic')}
            disabled={isZipping}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition cursor-pointer disabled:opacity-50"
            title="Download Classic PHP Theme (style.css, functions.php, page-template.php, header.php, footer.php, index.php)"
          >
            <FileCode className="w-3.5 h-3.5 text-amber-400" />
            <span>Classic PHP</span>
          </button>

          <button
            onClick={() => handleDownloadZip('fse')}
            disabled={isZipping}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition cursor-pointer disabled:opacity-50"
            title="Download Full Site Editing Theme (style.css, theme.json, templates/, parts/)"
          >
            <Box className="w-3.5 h-3.5 text-sky-400" />
            <span>FSE Block Theme</span>
          </button>
        </div>
      </div>

      {/* Success Notification Bar */}
      {zipSuccessFormat && (
        <div className="bg-emerald-950/80 border-b border-emerald-800/80 px-4 py-2 flex items-center justify-between text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Successfully generated rendered ZIP archive:{' '}
              <strong>
                {zipSuccessFormat === 'all'
                  ? `${themeSlug}.zip`
                  : zipSuccessFormat === 'classic'
                  ? `${themeSlug}-classic.zip`
                  : `${themeSlug}-fse.zip`}
              </strong>{' '}
              with <code className="bg-emerald-900/60 px-1 py-0.5 rounded text-[11px]">style.css</code> flat at root!
            </span>
          </div>
          <span className="text-[10px] text-emerald-400/80 font-mono">Ready for WordPress /wp-content/themes/</span>
        </div>
      )}

      {/* Format Switcher & Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 border-b border-slate-800/60 bg-slate-900/30">
        {/* Classic PHP Card */}
        <div
          onClick={() => {
            setActiveFormat('classic');
            setSelectedFileIdx(0);
          }}
          className={`p-3.5 rounded-xl border transition cursor-pointer flex items-start justify-between ${
            activeFormat === 'classic'
              ? 'bg-amber-950/20 border-amber-500/40 shadow-sm'
              : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <div>
            <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-xs">
              <FileCode className="w-4 h-4" />
              <span>Classic PHP Templates</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-snug">
              Rendered PHP templates (`page-template.php`), `functions.php` with CPT hooks, `header.php`, `footer.php`, `index.php`.
            </p>
            <div className="mt-2 text-[10px] font-mono text-amber-300/80">
              6 Rendered Files • Flat ZIP Root
            </div>
          </div>
          <div className="w-2 h-2 rounded-full bg-amber-400 mt-1" />
        </div>

        {/* FSE Block Theme Card */}
        <div
          onClick={() => {
            setActiveFormat('fse');
            setSelectedFileIdx(0);
          }}
          className={`p-3.5 rounded-xl border transition cursor-pointer flex items-start justify-between ${
            activeFormat === 'fse'
              ? 'bg-sky-950/20 border-sky-500/40 shadow-sm'
              : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <div>
            <div className="flex items-center gap-1.5 text-sky-400 font-semibold text-xs">
              <Box className="w-4 h-4" />
              <span>Full Site Editing (FSE)</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-snug">
              Rendered block theme with `theme.json` v3, HTML block templates (`templates/`), and template parts (`parts/`).
            </p>
            <div className="mt-2 text-[10px] font-mono text-sky-300/80">
              5 Block Parts • Gutenberg Ready
            </div>
          </div>
          <div className="w-2 h-2 rounded-full bg-sky-400 mt-1" />
        </div>

        {/* Complete Theme Package Card */}
        <div
          onClick={() => {
            setActiveFormat('all');
            setSelectedFileIdx(0);
          }}
          className={`p-3.5 rounded-xl border transition cursor-pointer flex items-start justify-between ${
            activeFormat === 'all'
              ? 'bg-indigo-950/20 border-indigo-500/40 shadow-sm'
              : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <div>
            <div className="flex items-center gap-1.5 text-indigo-400 font-semibold text-xs">
              <Package className="w-4 h-4" />
              <span>All Rendered Theme Files</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-snug">
              Complete set of processed output files (`style.css`, `functions.php`, `page-template.php`, `theme.json`, etc.) ready for deployment.
            </p>
            <div className="mt-2 text-[10px] font-mono text-indigo-300/80">
              11 Rendered Files • Zero .j2 Source Files
            </div>
          </div>
          <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1" />
        </div>
      </div>

      {/* Main Workspace Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: File Tree & CPT Registry */}
        <div className="w-72 border-r border-slate-800 bg-slate-900/40 flex flex-col justify-between shrink-0 overflow-y-auto">
          <div className="p-3 space-y-4">
            {/* File List for Active Format */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 mb-2 flex items-center justify-between">
                <span>{activeFormat.toUpperCase()} Files</span>
                <span className="font-mono text-slate-400">({formatFiles.length})</span>
              </div>
              <div className="space-y-1">
                {formatFiles.map((file, idx) => (
                  <button
                    key={file.filename}
                    onClick={() => setSelectedFileIdx(idx)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono transition cursor-pointer text-left ${
                      selectedFileIdx === idx
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileCode className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{file.filename}</span>
                    </div>
                    <span className="text-[10px] uppercase font-sans font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {file.language}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Detected Custom Post Types Section */}
            <div className="pt-2 border-t border-slate-800/60">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 mb-2 flex items-center justify-between">
                <span>Detected Post Types</span>
                <span className="font-mono text-emerald-400">({cpts.length})</span>
              </div>
              <div className="space-y-2">
                {cpts.map((cpt) => (
                  <div
                    key={cpt.slug}
                    className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{cpt.singular_name}</span>
                      <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                        {cpt.slug}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <span className="text-slate-500">Icon:</span>
                      <span className="font-mono text-[10px] text-slate-300">{cpt.menu_icon}</span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Supports: {cpt.supports.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Info Box */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/40 text-xs space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Theme Bundle Details</span>
            </div>
            <div className="text-[11px] text-slate-400 leading-tight">
              ZIP contains valid WordPress headers, GPL license metadata, and full hierarchy templates.
            </div>
          </div>
        </div>

        {/* Right Code Viewer */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
          {/* File Tab Header */}
          <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold text-indigo-300">
                {currentFile?.filename}
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                ({currentFile?.content?.split('\n').length || 0} lines)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPreviewModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition cursor-pointer"
                title="Preview this theme layout in live browser iframe"
              >
                <Eye className="w-3.5 h-3.5 text-indigo-400" />
                <span>Live Preview</span>
              </button>

              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium transition cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Code Text Area */}
          <div className="flex-1 overflow-auto p-4">
            <pre className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed">
              <code>{currentFile?.content}</code>
            </pre>
          </div>
        </div>
      </div>

      {/* Live Iframe Theme Preview Modal */}
      <ThemePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        astRoot={astRoot}
        themeName={themeName}
        themeSlug={themeSlug}
      />
    </div>
  );
};
