/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  ArrowUpTrayIcon,
  CpuChipIcon,
  PaperAirplaneIcon,
  DocumentTextIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { AppCategory, AppVisualStyle } from '../services/gemini';

interface InputAreaProps {
  onGenerateApp: (
    prompt: string,
    file?: File,
    options?: { category: AppCategory; visualStyle: AppVisualStyle }
  ) => void;
  onError?: (message: string) => void;
  isGenerating: boolean;
  disabled?: boolean;
}

const CyclingText = () => {
  const words = [
    'um rascunho de guardanapo',
    'um quadro branco caótico',
    'um mapa de jogo',
    'uma interface futurista',
    'o diagrama de uma máquina',
    'um pergaminho antigo',
  ];
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    let fadeTimeout: ReturnType<typeof setTimeout>;
    const interval = setInterval(() => {
      setFade(false);
      fadeTimeout = setTimeout(() => {
        setIndex((prev) => (prev + 1) % words.length);
        setFade(true);
      }, 500);
    }, 3000);
    return () => {
      clearInterval(interval);
      clearTimeout(fadeTimeout);
    };
  }, [words.length]);

  return (
    <span
      className={`inline-block whitespace-nowrap transition-all duration-500 transform ${
        fade ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-2 blur-sm'
      } text-[#fbbf24] font-semibold pb-1 border-b-2 border-[#38bdf8]/75`}
    >
      {words[index]}
    </span>
  );
};

export const InputArea: React.FC<InputAreaProps> = ({
  onGenerateApp,
  onError,
  isGenerating,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [appPrompt, setAppPrompt] = useState('');
  const [category, setCategory] = useState<AppCategory>('auto');
  const [visualStyle, setVisualStyle] = useState<AppVisualStyle>('auto');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndAcceptFile = useCallback(
    (file: File, autoSubmit: boolean) => {
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        if (autoSubmit && !appPrompt.trim()) {
          onGenerateApp('', file, { category, visualStyle });
        } else {
          setSelectedFile(file);
        }
      } else {
        onError?.('Por favor, envie uma imagem ou um arquivo PDF.');
      }
    },
    [appPrompt, category, visualStyle, onError, onGenerateApp]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndAcceptFile(e.target.files[0], true);
      e.target.value = '';
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled || isGenerating) return;
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        validateAndAcceptFile(e.dataTransfer.files[0], true);
      }
    },
    [disabled, isGenerating, validateAndAcceptFile]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!disabled && !isGenerating) {
        setIsDragging(true);
      }
    },
    [disabled, isGenerating]
  );

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleAppSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled || isGenerating) return;
    if (!selectedFile && !appPrompt.trim()) {
      onError?.('Envie uma imagem/PDF ou descreva o aplicativo que deseja criar.');
      return;
    }
    onGenerateApp(appPrompt.trim(), selectedFile || undefined, { category, visualStyle });
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative bg-[#1d1154]/75 backdrop-blur-xl rounded-2xl border transition-all duration-200 p-5 sm:p-6 shadow-[0_20px_50px_rgba(6,2,28,0.6)] ${
          isDragging
            ? 'border-[#fbbf24] bg-[#241566]/85 shadow-[inset_0_0_28px_rgba(251,191,36,0.16)]'
            : 'border-white/15 hover:border-indigo-300/35'
        }`}
      >
        {/* Upload Dropzone Trigger */}
        <div
          onClick={() => !isGenerating && !disabled && fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !isGenerating && !disabled) {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className="flex flex-col items-center justify-center text-center py-6 sm:py-8 px-4 rounded-xl border border-dashed border-indigo-300/30 hover:border-[#fbbf24]/70 bg-[#12083a]/40 cursor-pointer transition-colors"
        >
          <div className="w-14 h-14 rounded-full bg-[#241566] border border-white/15 shadow-lg flex items-center justify-center mb-4">
            {isGenerating ? (
              <CpuChipIcon className="w-6 h-6 text-[#fbbf24] animate-spin-slow" />
            ) : (
              <ArrowUpTrayIcon
                className={`w-6 h-6 transition-transform duration-200 ${
                  isDragging ? '-translate-y-0.5 text-[#fbbf24]' : 'text-white'
                }`}
              />
            )}
          </div>

          <h3 className="font-display flex flex-col items-center justify-center text-xl sm:text-2xl md:text-3xl text-white leading-tight font-bold tracking-tight gap-2">
            <span>Dê vida a</span>
            <div className="h-8 sm:h-10 flex items-center justify-center w-full">
              <CyclingText />
            </div>
          </h3>

          <p className="text-[#38bdf8] text-xs sm:text-sm font-medium mt-2">
            <span className="hidden md:inline">Arraste e solte ou clique para enviar</span>
            <span className="md:hidden">Toque para enviar</span> uma imagem ou PDF
          </p>

          {selectedFile && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-[#241566] border border-white/15 rounded-full text-xs text-white"
            >
              <DocumentTextIcon className="w-4 h-4 text-[#fbbf24] shrink-0" />
              <span className="truncate max-w-[220px]">{selectedFile.name}</span>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="text-indigo-200 hover:text-white"
                aria-label="Remover arquivo selecionado"
              >
                <XMarkIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={handleFileChange}
            disabled={isGenerating || disabled}
          />
        </div>

        {/* Prompt Input + Profile/Style Selectors */}
        <form onSubmit={handleAppSubmit} className="mt-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={appPrompt}
              onChange={(e) => setAppPrompt(e.target.value)}
              placeholder="Descreva sua ideia ou instrução extra (ex.: controle financeiro com gráfico e CSV)..."
              disabled={isGenerating || disabled}
              className="flex-1 bg-[#12083a]/85 border border-indigo-300/25 focus:border-[#fbbf24] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-indigo-200/50 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isGenerating || disabled || (!selectedFile && !appPrompt.trim())}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#ec1163] hover:bg-[#f42573] disabled:bg-[#241566] disabled:text-indigo-300/50 text-white text-sm font-semibold rounded-full shadow-[0_8px_24px_rgba(236,17,99,0.35)] disabled:shadow-none transition-all whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed"
            >
              <span>Criar App</span>
              <PaperAirplaneIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Profile & Visual Style Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <label className="flex items-center justify-between gap-3 text-xs text-indigo-100/80">
              <span className="whitespace-nowrap shrink-0">Tipo de projeto</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as AppCategory)}
                disabled={isGenerating || disabled}
                className="flex-1 max-w-[220px] bg-[#12083a]/85 border border-indigo-300/25 focus:border-[#fbbf24] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
              >
                <option value="auto">Automático (detectar)</option>
                <option value="dashboard">Painel / Gestão</option>
                <option value="tool">Utilitário / Calculadora</option>
                <option value="game">Jogo / Simulador</option>
                <option value="editorial">Guia / Apresentação</option>
              </select>
            </label>

            <label className="flex items-center justify-between gap-3 text-xs text-indigo-100/80">
              <span className="whitespace-nowrap shrink-0">Estilo visual</span>
              <select
                value={visualStyle}
                onChange={(e) => setVisualStyle(e.target.value as AppVisualStyle)}
                disabled={isGenerating || disabled}
                className="flex-1 max-w-[220px] bg-[#12083a]/85 border border-indigo-300/25 focus:border-[#fbbf24] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
              >
                <option value="auto">Automático</option>
                <option value="indigo">Índigo & Glass (Foto)</option>
                <option value="modern">Moderno Limpo</option>
                <option value="editorial">Editorial / Clássico</option>
                <option value="retro">Retrô / Tátil</option>
                <option value="compact">Denso / Compacto</option>
              </select>
            </label>
          </div>
        </form>
      </div>
    </div>
  );
};
