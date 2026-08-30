import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  RotateCw,
  Monitor,
  Tablet,
  Smartphone,
  Laptop,
  Download,
  Eye,
  FileCode,
  Package,
  Layers,
  Sparkles,
  ExternalLink,
  Code2,
  CheckCircle2,
  Box,
  Archive,
} from 'lucide-react';
import { ASTNode } from '../types/compiler';
import { ThemeGenerator } from '../utils/themeGenerator';
import {
  compileWordPressThemeToPreviewHtml,
  PreviewTemplateMode,
} from '../utils/themePreviewRenderer';

interface ThemePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  astRoot: ASTNode | null;
  themeName?: string;
  themeSlug?: string;
}

type DeviceViewport = 'desktop' | 'laptop' | 'tablet' | 'mobile';

const VIEWPORT_WIDTHS: Record<DeviceViewport, string> = {
  desktop: '100%',
  laptop: '1024px',
  tablet: '768px',
  mobile: '375px',
};

export const ThemePreviewModal: React.FC<ThemePreviewModalProps> = ({
  isOpen,
  onClose,
  astRoot,
  themeName = 'Portfolio Pro Theme',
  themeSlug = 'portfolio-pro',
}) => {
  const [templateMode, setTemplateMode] = useState<PreviewTemplateMode>('front-page');
  const [viewport, setViewport] = useState<DeviceViewport>('desktop');
  const [zoomScale, setZoomScale] = useState<number>(100);
  const [showHtmlSource, setShowHtmlSource] = useState<boolean>(false);
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Compile the interactive preview HTML
  const previewHtml = useMemo(() => {
    return compileWordPressThemeToPreviewHtml({
      astRoot,
      themeName,
      themeSlug,
      templateMode,
    });
  }, [astRoot, themeName, themeSlug, templateMode]);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleDownload = async (format: 'all' | 'classic' | 'fse' = 'all') => {
    try {
      setIsZipping(true);
      await ThemeGenerator.bundleAndDownloadZip(astRoot, format, themeSlug, themeName);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to bundle theme ZIP:', err);
    } finally {
      setIsZipping(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="theme-preview-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-2 sm:p-4 md:p-6 transition-all duration-200"
    >
      {/* Modal Container */}
      <div
        id="theme-preview-modal-container"
        className={`flex flex-col bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
          isFullscreen
            ? 'w-full h-full rounded-none border-none'
            : 'w-full max-w-7xl h-[92vh]'
        }`}
      >
        {/* Top Control Bar */}
        <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Left Title & Status */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span>Live WordPress Theme Preview</span>
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
                  {themeName}
                </span>
                <span className="hidden sm:inline-flex text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Flat ZIP Root
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Interactive preview compiled directly from AST nodes with live WordPress template structure
              </p>
            </div>
          </div>

          {/* Center Template & Viewport Switchers */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Template Selector */}
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setTemplateMode('front-page')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer text-xs font-medium flex items-center gap-1.5 ${
                  templateMode === 'front-page'
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Front Page (front-page.php) - Primary site homepage"
              >
                <Sparkles className="w-3 h-3" />
                <span>front-page.php</span>
              </button>

              <button
                onClick={() => setTemplateMode('page-template')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer text-xs font-medium flex items-center gap-1.5 ${
                  templateMode === 'page-template'
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Page Template (page-template.php)"
              >
                <FileCode className="w-3 h-3" />
                <span>page-template.php</span>
              </button>

              <button
                onClick={() => setTemplateMode('fse')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer text-xs font-medium flex items-center gap-1.5 ${
                  templateMode === 'fse'
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Full Site Editing (FSE) Block Theme (templates/index.html)"
              >
                <Box className="w-3 h-3" />
                <span>FSE Block Theme</span>
              </button>
            </div>

            {/* Viewport Devices */}
            <div className="hidden lg:flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setViewport('desktop')}
                className={`p-1.5 rounded-md transition cursor-pointer ${
                  viewport === 'desktop'
                    ? 'bg-slate-800 text-indigo-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Desktop View (100%)"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewport('laptop')}
                className={`p-1.5 rounded-md transition cursor-pointer ${
                  viewport === 'laptop'
                    ? 'bg-slate-800 text-indigo-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Laptop View (1024px)"
              >
                <Laptop className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewport('tablet')}
                className={`p-1.5 rounded-md transition cursor-pointer ${
                  viewport === 'tablet'
                    ? 'bg-slate-800 text-indigo-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Tablet View (768px)"
              >
                <Tablet className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewport('mobile')}
                className={`p-1.5 rounded-md transition cursor-pointer ${
                  viewport === 'mobile'
                    ? 'bg-slate-800 text-indigo-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Mobile View (375px)"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2">
            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="Refresh Iframe Preview"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            {/* Toggle HTML Source */}
            <button
              onClick={() => setShowHtmlSource((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
                showHtmlSource
                  ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
              title="Toggle Rendered Preview HTML"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">HTML Source</span>
            </button>

            {/* Direct Download ZIP Button */}
            <button
              onClick={() => handleDownload('all')}
              disabled={isZipping}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md hover:shadow-indigo-500/20 transition cursor-pointer disabled:opacity-50"
              title="Download Theme ZIP"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>{isZipping ? 'Bundling...' : 'Download ZIP'}</span>
              <Download className="w-3 h-3 opacity-80" />
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer hidden md:block"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Preview'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950 hover:text-rose-400 text-slate-400 transition cursor-pointer"
              title="Close Preview (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Download Success Banner */}
        {downloadSuccess && (
          <div className="bg-emerald-950/90 border-b border-emerald-800/80 px-4 py-2 flex items-center justify-between text-xs text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Theme archive <strong>{themeSlug}.zip</strong> generated and downloaded successfully!
              </span>
            </div>
            <span className="text-[10px] text-emerald-400/80 font-mono">Ready for /wp-content/themes/</span>
          </div>
        )}

        {/* Main Canvas Area */}
        <div className="flex-1 flex overflow-hidden bg-slate-950 relative">
          {/* Iframe Viewport Container */}
          <div className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] overflow-auto">
            <div
              className={`h-full flex flex-col bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-2xl transition-all duration-300 ${
                viewport === 'desktop'
                  ? 'w-full'
                  : viewport === 'laptop'
                  ? 'w-[1024px] max-w-full'
                  : viewport === 'tablet'
                  ? 'w-[768px] max-w-full'
                  : 'w-[375px] max-w-full'
              }`}
            >
              {/* Device Frame Header for Mobile/Tablet/Laptop */}
              {viewport !== 'desktop' && (
                <div className="h-6 bg-slate-950 border-b border-slate-800/80 px-3 flex items-center justify-between text-[10px] font-mono text-slate-400 select-none">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-700" />
                    <span>Viewport: {VIEWPORT_WIDTHS[viewport]}</span>
                  </span>
                  <span className="text-slate-500 uppercase">{viewport} Mode</span>
                </div>
              )}

              {/* The Live Iframe */}
              <iframe
                key={refreshKey}
                ref={iframeRef}
                title="WordPress Theme Live Preview"
                srcDoc={previewHtml}
                sandbox="allow-scripts allow-same-origin"
                className="w-full h-full border-none bg-slate-950"
              />
            </div>
          </div>

          {/* HTML Source Code Drawer (if toggled) */}
          {showHtmlSource && (
            <div className="w-96 border-l border-slate-800 bg-slate-900 flex flex-col shrink-0 overflow-hidden shadow-xl z-20">
              <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                <span className="text-xs font-mono font-semibold text-slate-200 flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Rendered Preview HTML</span>
                </span>
                <button
                  onClick={() => setShowHtmlSource(false)}
                  className="text-slate-400 hover:text-slate-200 text-xs"
                >
                  Close
                </button>
              </div>
              <div className="flex-1 overflow-auto p-3">
                <pre className="text-[11px] font-mono text-slate-300 leading-relaxed overflow-x-auto">
                  <code>{previewHtml}</code>
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Status Bar */}
        <div className="px-4 py-2.5 border-t border-slate-800 bg-slate-900/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Compiler Preview</span>
            </span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="hidden sm:inline">
              Active Template: <strong className="text-slate-200 font-mono">{templateMode === 'front-page' ? 'front-page.php' : templateMode === 'fse' ? 'templates/index.html' : 'page-template.php'}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-500 font-mono hidden md:inline">
              Includes Tailwind CDN &amp; WordPress Template Hierarchy
            </span>
            <button
              onClick={() => handleDownload('all')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>Download Full Theme Package (.zip) &rarr;</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
