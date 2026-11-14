/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useRef } from 'react';
import { Hero } from './components/Hero';
import { InputArea } from './components/InputArea';
import { LivePreview } from './components/LivePreview';
import { CreationHistory, Creation } from './components/CreationHistory';
import { bringToLife, AppCategory, AppVisualStyle } from './services/gemini';
import { STARTER_EXAMPLES } from './data/examples';
import { SettingsModal } from './components/SettingsModal';
import { ArrowUpTrayIcon, ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';

const HIGH_CONTRAST_STORAGE_KEY = 'viva_high_contrast';

const App: React.FC = () => {
  const [activeCreation, setActiveCreation] = useState<Creation | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMode, setLoadingMode] = useState<'create' | 'refine'>('create');
  const [history, setHistory] = useState<Creation[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [highContrast, setHighContrast] = useState<boolean>(() => {
    try {
      return localStorage.getItem(HIGH_CONTRAST_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', highContrast);
    if (highContrast) {
      document.documentElement.setAttribute('data-high-contrast', 'true');
    } else {
      document.documentElement.removeAttribute('data-high-contrast');
    }
    try {
      localStorage.setItem(HIGH_CONTRAST_STORAGE_KEY, String(highContrast));
    } catch {
      // Ignore storage errors
    }
  }, [highContrast]);

  // Load history from local storage or use bundled starter examples on mount
  useEffect(() => {
    const saved = localStorage.getItem('gemini_app_history');
    let loadedHistory: Creation[] = [];

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          loadedHistory = parsed
            .filter((item: any) => item && typeof item.html === 'string' && item.html.trim().length > 0)
            .map((item: any) => ({
              ...item,
              timestamp: new Date(item.timestamp || Date.now()),
            }));
        }
      } catch (e) {
        console.error('Erro ao carregar histórico salvo:', e);
      }
    }

    if (loadedHistory.length > 0) {
      setHistory(loadedHistory);
    } else {
      setHistory(STARTER_EXAMPLES);
    }
  }, []);

  // Save history entries to localStorage
  useEffect(() => {
    if (history.length > 0) {
      try {
        localStorage.setItem('gemini_app_history', JSON.stringify(history.slice(0, 20)));
      } catch (e) {
        console.warn('Armazenamento local cheio ou erro ao salvar histórico', e);
      }
    }
  }, [history]);

  // Auto-dismiss error message after 7 seconds
  useEffect(() => {
    if (!errorMessage) return;
    const timer = setTimeout(() => setErrorMessage(null), 7000);
    return () => clearTimeout(timer);
  }, [errorMessage]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Falha ao converter arquivo para base64'));
        }
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleGenerateApp = async (
    promptText: string,
    file?: File,
    options?: { category: AppCategory; visualStyle: AppVisualStyle }
  ) => {
    setErrorMessage(null);
    setLoadingMode('create');
    setIsGenerating(true);
    setActiveCreation(null);

    try {
      let imageBase64: string | undefined;
      let mimeType: string | undefined;

      if (file) {
        imageBase64 = await fileToBase64(file);
        mimeType = file.type.toLowerCase();
      }

      const result = await bringToLife(promptText, imageBase64, mimeType, {
        category: options?.category,
        visualStyle: options?.visualStyle,
        highContrast,
      });

      if (result?.html) {
        const titleFromPrompt = promptText.trim()
          ? promptText.trim().slice(0, 32) + (promptText.trim().length > 32 ? '…' : '')
          : 'Nova Criação';

        const newCreation: Creation = {
          id: crypto.randomUUID(),
          name: file ? file.name : titleFromPrompt,
          prompt: promptText || undefined,
          html: result.html,
          originalImage: imageBase64 && mimeType ? `data:${mimeType};base64,${imageBase64}` : undefined,
          timestamp: new Date(),
        };
        setActiveCreation(newCreation);
        setHistory((prev) => [newCreation, ...prev]);
      }
    } catch (error: any) {
      console.error('Falha ao gerar aplicação:', error);
      setErrorMessage(
        error?.message || 'Algo deu errado ao dar vida ao seu arquivo. Por favor, tente novamente.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefineApp = async (instruction: string) => {
    if (!activeCreation?.html || !instruction.trim()) return;
    const previousCreation = activeCreation;

    setErrorMessage(null);
    setLoadingMode('refine');
    setIsGenerating(true);
    setActiveCreation(null);

    try {
      const result = await bringToLife(previousCreation.prompt || previousCreation.name, undefined, undefined, {
        currentHtml: previousCreation.html,
        refinementInstruction: instruction,
        highContrast,
      });

      if (result?.html) {
        const cleanBaseName = previousCreation.name.replace(/\s*\(Ajustado\)$/i, '');
        const refinedCreation: Creation = {
          id: crypto.randomUUID(),
          name: `${cleanBaseName} (Ajustado)`,
          prompt: instruction,
          html: result.html,
          originalImage: previousCreation.originalImage,
          timestamp: new Date(),
        };
        setActiveCreation(refinedCreation);
        setHistory((prev) => [refinedCreation, ...prev]);
      } else {
        setActiveCreation(previousCreation);
      }
    } catch (error: any) {
      console.error('Falha ao refinar aplicação:', error);
      setErrorMessage(
        error?.message || 'Não foi possível aplicar o ajuste solicitado. Tente novamente.'
      );
      setActiveCreation(previousCreation);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setActiveCreation(null);
    setIsGenerating(false);
  };

  const handleSelectCreation = (creation: Creation) => {
    setErrorMessage(null);
    setActiveCreation(creation);
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const parsed = JSON.parse(json);

        if (parsed.html && parsed.name) {
          const importedCreation: Creation = {
            ...parsed,
            timestamp: new Date(parsed.timestamp || Date.now()),
            id: parsed.id || crypto.randomUUID(),
          };

          setHistory((prev) => {
            const exists = prev.some((c) => c.id === importedCreation.id);
            return exists ? prev : [importedCreation, ...prev];
          });

          setErrorMessage(null);
          setActiveCreation(importedCreation);
        } else {
          setErrorMessage('Formato de arquivo de artefato inválido.');
        }
      } catch (err) {
        console.error('Erro ao importar:', err);
        setErrorMessage('Não foi possível importar a criação.');
      }
      if (importInputRef.current) importInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const isFocused = !!activeCreation || isGenerating;

  return (
    <div className="h-[100dvh] bg-[#100833] bg-indigo-canvas text-zinc-50 selection:bg-[#ec1163]/40 overflow-y-auto overflow-x-hidden relative flex flex-col">
      {/* Inline Error Banner */}
      {errorMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md bg-[#2a0c2e]/95 border border-[#ec1163]/70 text-red-100 px-4 py-3 rounded-xl shadow-xl backdrop-blur-md flex items-start gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-[#fbbf24] shrink-0 mt-0.5" />
          <p className="text-sm flex-1">{errorMessage}</p>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-pink-200 hover:text-white transition-colors"
            aria-label="Fechar aviso"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top-Right Settings Trigger (Home View) */}
      {!isFocused && (
        <div className="fixed top-4 right-4 z-30">
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Abrir configurações de acessibilidade"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#241566]/90 hover:bg-[#311d85] border border-white/15 hover:border-[#fbbf24]/60 text-xs font-medium text-white shadow-lg transition-colors backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fbbf24]"
          >
            <Cog6ToothIcon className="w-4 h-4 text-[#fbbf24] shrink-0" />
            <span>Configurações</span>
            {highContrast && (
              <span className="font-mono text-[10px] text-[#fbbf24]">· Alto Contraste</span>
            )}
          </button>
        </div>
      )}

      {/* Centered Content Container */}
      <div
        className={`
          min-h-full flex flex-col w-full max-w-7xl mx-auto px-4 sm:px-6 relative z-10 
          transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1)
          ${
            isFocused
              ? 'opacity-0 scale-95 blur-sm pointer-events-none h-[100dvh] overflow-hidden'
              : 'opacity-100 scale-100 blur-0'
          }
        `}
      >
        {/* Main Vertical Centering Wrapper */}
        <div className="flex-1 flex flex-col justify-center items-center w-full py-10 md:py-16">
          {/* 1. Hero Section */}
          <div className="w-full mb-8 md:mb-12">
            <Hero />
          </div>

          {/* 2. Input Section */}
          <div className="w-full flex justify-center mb-8">
            <InputArea
              onGenerateApp={handleGenerateApp}
              onError={setErrorMessage}
              isGenerating={isGenerating}
              disabled={isFocused}
            />
          </div>
        </div>

        {/* 3. History Section & Footer - Stays at bottom */}
        <div className="flex-shrink-0 pb-6 w-full mt-auto flex flex-col items-center gap-6">
          <div className="w-full px-2 md:px-0">
            <CreationHistory history={history} onSelect={handleSelectCreation} />
          </div>

          <a
            href="https://x.com/ammaar"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-200/50 hover:text-indigo-100 text-xs font-mono transition-colors pb-2"
          >
            Criado por @ammaar
          </a>
        </div>
      </div>

      {/* Live Preview - Always mounted for smooth transition */}
      <LivePreview
        creation={activeCreation}
        isLoading={isGenerating}
        loadingMode={loadingMode}
        isFocused={isFocused}
        highContrast={highContrast}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onReset={handleReset}
        onRefine={handleRefineApp}
      />

      {/* Settings & Accessibility Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        highContrast={highContrast}
        onToggleHighContrast={setHighContrast}
      />

      {/* Subtle Import Button (Bottom Right) */}
      <div className="fixed bottom-4 right-4 z-30">
        <button
          onClick={handleImportClick}
          className="flex items-center space-x-2 px-3 py-2 rounded-full bg-[#241566]/80 hover:bg-[#311d85] border border-white/15 text-indigo-100 hover:text-white shadow-lg transition-colors"
          title="Importar Artefato"
        >
          <span className="text-xs font-medium hidden sm:inline">
            Importar JSON
          </span>
          <ArrowUpTrayIcon className="w-4 h-4 text-[#38bdf8]" />
        </button>
        <input
          type="file"
          ref={importInputRef}
          onChange={handleImportFile}
          accept=".json"
          className="hidden"
        />
      </div>
    </div>
  );
};

export default App;