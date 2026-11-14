/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect } from 'react';
import { XMarkIcon, EyeIcon, CheckIcon } from '@heroicons/react/24/outline';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  highContrast: boolean;
  onToggleHighContrast: (nextValue: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  highContrast,
  onToggleHighContrast,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#170b47] border border-white/20 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 id="settings-modal-title" className="font-display text-lg font-bold text-white">
              Configurações e Acessibilidade
            </h2>
            <p className="text-xs text-indigo-200/75 mt-0.5">
              Ajuste a legibilidade da interface e das criações interativas
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar configurações"
            className="p-2 rounded-full text-indigo-200 hover:text-white hover:bg-[#241566] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fbbf24]"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-[#100833]/90 border border-white/15">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-[#241566] border border-white/15 shrink-0 mt-0.5">
                <EyeIcon className="w-5 h-5 text-[#fbbf24]" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span id="hc-switch-label" className="text-sm font-semibold text-white">
                    Modo de Alto Contraste
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-mono font-semibold ${
                      highContrast ? 'text-[#fbbf24]' : 'text-indigo-200/70'
                    }`}
                  >
                    {highContrast && <CheckIcon className="w-3.5 h-3.5" />}
                    <span>{highContrast ? 'Ativado' : 'Desativado'}</span>
                  </span>
                </div>
                <p id="hc-switch-desc" className="text-xs sm:text-sm text-indigo-100/75 leading-relaxed">
                  Reforça o contraste de textos, bordas e focos de teclado na interface principal e aplica estilos de alta legibilidade dentro das criações interativas.
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={highContrast}
              aria-labelledby="hc-switch-label"
              aria-describedby="hc-switch-desc"
              onClick={() => onToggleHighContrast(!highContrast)}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fbbf24] ${
                highContrast
                  ? 'bg-[#ec1163] border-white'
                  : 'bg-[#241566] border-indigo-300/40 hover:border-white'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                  highContrast ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#100833]/60 border-t border-white/10 flex items-center justify-between gap-3">
          <span className="text-xs text-indigo-200/70">
            Preferência salva automaticamente neste navegador.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs sm:text-sm font-semibold bg-[#ec1163] text-white hover:bg-[#f42573] rounded-full transition-colors whitespace-nowrap shrink-0"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
