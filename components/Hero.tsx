/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

export const Hero: React.FC = () => {
  return (
    <>
      {/* Organic Fluid Backdrop Shapes inspired by deep indigo/violet/magenta aesthetic */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 hc-hide-decor" aria-hidden="true">
        <div
          className="absolute -top-28 -left-24 w-[460px] h-[460px] rounded-[46%_54%_62%_38%/45%_40%_60%_55%] opacity-45 blur-[2px]"
          style={{
            background: 'radial-gradient(circle at 40% 40%, #5b21b6 0%, #3b18a8 55%, transparent 80%)',
          }}
        />
        <div
          className="absolute -bottom-32 -right-24 w-[520px] h-[520px] rounded-[58%_42%_38%_62%/52%_58%_42%_48%] opacity-40 blur-[2px]"
          style={{
            background: 'radial-gradient(circle at 55% 55%, #ec1163 0%, #9d174d 55%, transparent 82%)',
          }}
        />
        <div
          className="absolute top-1/3 right-[12%] w-[260px] h-[260px] rounded-[42%_58%_55%_45%/55%_45%_55%_45%] opacity-25 blur-xl"
          style={{
            background: 'radial-gradient(circle, #38bdf8 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Hero Text Content */}
      <div className="text-center relative z-10 max-w-4xl mx-auto px-4 pt-6">
        <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white mb-5 leading-[1.08] text-balance">
          Dê vida a{' '}
          <span className="text-[#fbbf24] underline decoration-4 decoration-[#ec1163] underline-offset-4 md:underline-offset-8">
            qualquer coisa
          </span>
          .
        </h1>
        <p className="text-base sm:text-lg text-indigo-100/80 max-w-2xl mx-auto leading-relaxed">
          Transforme rascunhos, imagens, PDFs ou ideias em aplicativos web interativos em segundos.
        </p>
      </div>
    </>
  );
};