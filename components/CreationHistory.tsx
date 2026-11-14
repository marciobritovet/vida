/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import {
  ClockIcon,
  ArrowRightIcon,
  DocumentIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';

export interface Creation {
  id: string;
  name: string;
  prompt?: string;
  html: string;
  originalImage?: string;
  timestamp: Date;
}

interface CreationHistoryProps {
  history: Creation[];
  onSelect: (creation: Creation) => void;
}

export const CreationHistory: React.FC<CreationHistoryProps> = ({ history, onSelect }) => {
  if (history.length === 0) return null;

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex items-center space-x-3 mb-3 px-2">
        <ClockIcon className="w-4 h-4 text-indigo-300/70" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-indigo-200/70">Arquivo</h2>
        <div className="h-px flex-1 bg-white/10"></div>
      </div>

      {/* Horizontal Scroll Container for Compact Layout */}
      <div className="flex overflow-x-auto space-x-4 pb-2 px-2 scrollbar-hide">
        {history.map((item) => {
          const isPdf = item.originalImage?.startsWith('data:application/pdf');

          return (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              className="group flex-shrink-0 relative flex flex-col text-left w-52 h-28 bg-[#1d1154]/65 hover:bg-[#27186d]/85 backdrop-blur-md border border-white/15 hover:border-[#fbbf24]/60 rounded-xl transition-all duration-200 overflow-hidden shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fbbf24]"
            >
              <div className="p-4 flex flex-col h-full w-full">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-full bg-[#241566] group-hover:bg-[#311d85] flex items-center justify-center transition-colors border border-white/15">
                    {isPdf ? (
                      <DocumentIcon className="w-4 h-4 text-[#38bdf8]" />
                    ) : item.originalImage ? (
                      <PhotoIcon className="w-4 h-4 text-[#fbbf24]" />
                    ) : (
                      <DocumentIcon className="w-4 h-4 text-indigo-200" />
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-indigo-200/70 group-hover:text-white tabular-nums">
                    {item.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="mt-auto">
                  <div className="text-[11px] text-[#38bdf8]/90 truncate mb-0.5">App Interativo</div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-medium text-white truncate">
                      {item.name}
                    </h3>
                    <ArrowRightIcon className="w-3.5 h-3.5 text-[#fbbf24] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};