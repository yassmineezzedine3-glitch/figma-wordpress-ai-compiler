import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { TokenizerPlayground } from './components/TokenizerPlayground';
import { AstVisualizer } from './components/AstVisualizer';
import { PytestRunnerView } from './components/PytestRunnerView';
import { ProjectCodeViewer } from './components/ProjectCodeViewer';
import { WordPressExportView } from './components/WordPressExportView';
import { ThemePreviewModal } from './components/ThemePreviewModal';
import { SAMPLE_PRESETS } from './utils/sampleDesigns';
import { ClientComponentTokenizer } from './utils/tokenizer';
import { ClientASTBuilder } from './utils/astBuilder';
import { ASTNode, Token } from './types/compiler';

export function App() {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(SAMPLE_PRESETS[0].id);
  const [activeTab, setActiveTab] = useState<ActiveTab>('tokenizer');
  const [figmaJsonStr, setFigmaJsonStr] = useState<string>(() =>
    JSON.stringify(SAMPLE_PRESETS[0].figmaData, null, 2)
  );

  const [tokens, setTokens] = useState<Token[]>([]);
  const [astRoot, setAstRoot] = useState<ASTNode | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

  const tokenizer = useMemo(() => new ClientComponentTokenizer(), []);
  const astBuilder = useMemo(() => new ClientASTBuilder(tokenizer), [tokenizer]);

  // Run tokenization whenever preset changes or user triggers run
  const executeTokenization = useCallback(
    (jsonContent: string) => {
      try {
        const parsed = JSON.parse(jsonContent);
        const extractedTokens = tokenizer.tokenize(parsed);
        setTokens(extractedTokens);

        const tree = astBuilder.buildFromTokens(extractedTokens, parsed);
        setAstRoot(tree);
      } catch (err) {
        console.error('Failed to parse Figma JSON:', err);
      }
    },
    [tokenizer, astBuilder]
  );

  // Initial load
  useEffect(() => {
    executeTokenization(figmaJsonStr);
  }, [executeTokenization, figmaJsonStr]);

  // When preset changes
  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = SAMPLE_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      const formatted = JSON.stringify(preset.figmaData, null, 2);
      setFigmaJsonStr(formatted);
      executeTokenization(formatted);
    }
  };

  const selectedPreset = SAMPLE_PRESETS.find((p) => p.id === selectedPresetId);

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100 font-sans antialiased overflow-hidden">
      {/* Top Navigation */}
      <Navbar
        presets={SAMPLE_PRESETS}
        selectedPresetId={selectedPresetId}
        onSelectPreset={handleSelectPreset}
        onRunTokenize={() => executeTokenization(figmaJsonStr)}
        onOpenPreview={() => setIsPreviewOpen(true)}
        tokenCount={tokens.length}
        testPassCount={34}
      />

      {/* Main Studio Body */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tokenCount={tokens.length}
          testPassCount={34}
        />

        <main className="flex-1 flex flex-col overflow-hidden">
          {activeTab === 'tokenizer' && (
            <TokenizerPlayground
              tokens={tokens}
              figmaJsonStr={figmaJsonStr}
              onFigmaJsonChange={setFigmaJsonStr}
              onRunTokenize={() => executeTokenization(figmaJsonStr)}
            />
          )}

          {activeTab === 'ast' && <AstVisualizer astRoot={astRoot} />}

          {activeTab === 'tests' && <PytestRunnerView />}

          {activeTab === 'code' && <ProjectCodeViewer />}

          {activeTab === 'wordpress' && (
            <WordPressExportView
              astRoot={astRoot}
              themeName={selectedPreset?.name || 'Portfolio Pro Theme'}
              themeSlug={selectedPreset?.id || 'portfolio-pro'}
            />
          )}
        </main>
      </div>

      {/* Global Live Theme Preview Modal */}
      <ThemePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        astRoot={astRoot}
        themeName={selectedPreset?.name || 'Portfolio Pro Theme'}
        themeSlug={selectedPreset?.id || 'portfolio-pro'}
      />
    </div>
  );
}

export default App;

