/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  ArrowDownTrayIcon,
  DocumentArrowDownIcon,
  PlusIcon,
  ViewColumnsIcon,
  DocumentIcon,
  CodeBracketIcon,
  EyeIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  PaperAirplaneIcon,
  XMarkIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { Creation } from './CreationHistory';

const HOST_LS_PREFIX = '__ais_ls_bring_any_idea_to_life:';
const HOST_SS_PREFIX = '__ais_ss_bring_any_idea_to_life:';

function readNamespacedStorage(storage: Storage | undefined, prefix: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!storage) return out;
  try {
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k && k.startsWith(prefix)) {
        const val = storage.getItem(k);
        if (val !== null) {
          out[k.slice(prefix.length)] = val;
        }
      }
    }
  } catch (err) {
    console.error('Failed reading host storage snapshot:', err);
  }
  return out;
}

function applyNamespacedStorageOp(
  storage: Storage | undefined,
  prefix: string,
  op: string,
  key?: unknown,
  value?: unknown
) {
  if (!storage) return;
  try {
    if (
      op === 'set' &&
      typeof key === 'string' &&
      key.length <= 512 &&
      typeof value === 'string' &&
      value.length <= 524288
    ) {
      storage.setItem(prefix + key, value);
    } else if (op === 'remove' && typeof key === 'string' && key.length <= 512) {
      storage.removeItem(prefix + key);
    } else if (op === 'clear') {
      const toRemove: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (k && k.startsWith(prefix)) toRemove.push(k);
      }
      for (const k of toRemove) storage.removeItem(k);
    }
  } catch (err) {
    console.error('Failed syncing host storage:', err);
  }
}

function handlePreviewStorageMessage(event: MessageEvent, allowedWindow?: Window | null): boolean {
  const data = event.data;
  if (!data || data.__aisHostStorageSync !== true) return false;
  if (allowedWindow !== undefined) {
    if (!allowedWindow || event.source !== allowedWindow) return false;
  } else if (!event.source || event.source === window) {
    return false;
  }
  if (event.origin !== 'null' && event.origin !== window.location.origin) return false;
  const target = data.area === 'session' ? window.sessionStorage : window.localStorage;
  const prefix = data.area === 'session' ? HOST_SS_PREFIX : HOST_LS_PREFIX;
  applyNamespacedStorageOp(target, prefix, String(data.op || ''), data.key, data.value);
  return true;
}

function safeJsonForInlineScript(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function buildHostStorageShimScript(initialHighContrast = false): string {
  const initialLs = typeof window !== 'undefined' ? readNamespacedStorage(window.localStorage, HOST_LS_PREFIX) : {};
  const initialSs = typeof window !== 'undefined' ? readNamespacedStorage(window.sessionStorage, HOST_SS_PREFIX) : {};
  const seedJson = safeJsonForInlineScript({ ls: initialLs, ss: initialSs, hc: Boolean(initialHighContrast) });
  return `<script>(function(){
  var seed = ${seedJson};
  function makeStorage(area, initObj) {
    var map = new Map(Object.entries(initObj || {}));
    function sync(op, key, value) {
      try {
        window.parent.postMessage({ __aisHostStorageSync: true, area: area, op: op, key: key, value: value }, "*");
      } catch (e) {}
    }
    var api = {
      getItem: function(k) { k = String(k); return map.has(k) ? map.get(k) : null; },
      setItem: function(k, v) { k = String(k); v = String(v); map.set(k, v); sync("set", k, v); },
      removeItem: function(k) { k = String(k); if (map.delete(k)) sync("remove", k); },
      clear: function() { map.clear(); sync("clear"); },
      key: function(i) { var keys = Array.from(map.keys()); return (i >= 0 && i < keys.length) ? keys[i] : null; }
    };
    Object.defineProperty(api, "length", { get: function() { return map.size; }, enumerable: false, configurable: true });
    return new Proxy(api, {
      get: function(target, prop) {
        if (prop in target) {
          var v = target[prop];
          return typeof v === "function" ? v.bind(target) : v;
        }
        if (typeof prop === "string" && map.has(prop)) return map.get(prop);
        return undefined;
      },
      set: function(target, prop, value) {
        if (typeof prop === "string" && !(prop in target)) {
          target.setItem(prop, value);
          return true;
        }
        return false;
      },
      deleteProperty: function(target, prop) {
        if (typeof prop === "string" && map.has(prop)) {
          target.removeItem(prop);
          return true;
        }
        return true;
      },
      has: function(target, prop) {
        return (prop in target) || (typeof prop === "string" && map.has(prop));
      },
      ownKeys: function() { return Array.from(map.keys()); },
      getOwnPropertyDescriptor: function(_target, prop) {
        if (typeof prop === "string" && map.has(prop)) {
          return { value: map.get(prop), writable: true, enumerable: true, configurable: true };
        }
        return undefined;
      }
    });
  }
  try {
    var ls = makeStorage("local", seed.ls);
    var ss = makeStorage("session", seed.ss);
    Object.defineProperty(window, "localStorage", { configurable: true, enumerable: true, get: function() { return ls; } });
    Object.defineProperty(window, "sessionStorage", { configurable: true, enumerable: true, get: function() { return ss; } });
  } catch (e) {}
  try {
    var cookieJar = "";
    Object.defineProperty(document, "cookie", {
      configurable: true,
      enumerable: true,
      get: function() { return cookieJar; },
      set: function(v) { cookieJar = String(v || "").split(";")[0]; }
    });
  } catch (e) {}

  var hcCss = [
    'html[data-ais-high-contrast="true"], html[data-ais-high-contrast="true"] body { background: #000000 !important; color: #ffffff !important; }',
    'html[data-ais-high-contrast="true"] h1, html[data-ais-high-contrast="true"] h2, html[data-ais-high-contrast="true"] h3, html[data-ais-high-contrast="true"] h4, html[data-ais-high-contrast="true"] p, html[data-ais-high-contrast="true"] label, html[data-ais-high-contrast="true"] li, html[data-ais-high-contrast="true"] td, html[data-ais-high-contrast="true"] th, html[data-ais-high-contrast="true"] .meta, html[data-ais-high-contrast="true"] .status-row, html[data-ais-high-contrast="true"] .top-bar { color: #ffffff !important; opacity: 1 !important; }',
    'html[data-ais-high-contrast="true"] a { color: #fde047 !important; text-decoration: underline !important; }',
    'html[data-ais-high-contrast="true"] button, html[data-ais-high-contrast="true"] input, html[data-ais-high-contrast="true"] select, html[data-ais-high-contrast="true"] textarea { border: 2px solid #ffffff !important; box-shadow: none !important; }',
    'html[data-ais-high-contrast="true"] button { background-color: #141414 !important; color: #ffffff !important; }',
    'html[data-ais-high-contrast="true"] button.active, html[data-ais-high-contrast="true"] button.pressed, html[data-ais-high-contrast="true"] button.reset { background-color: #fde047 !important; color: #000000 !important; border-color: #ffffff !important; }',
    'html[data-ais-high-contrast="true"] input, html[data-ais-high-contrast="true"] select, html[data-ais-high-contrast="true"] textarea { background-color: #000000 !important; color: #ffffff !important; }',
    'html[data-ais-high-contrast="true"] .card, html[data-ais-high-contrast="true"] .sidebar, html[data-ais-high-contrast="true"] .deck, html[data-ais-high-contrast="true"] .board, html[data-ais-high-contrast="true"] pre { background: #000000 !important; border: 2px solid #ffffff !important; }',
    'html[data-ais-high-contrast="true"] *:focus-visible { outline: 3px solid #fde047 !important; outline-offset: 2px !important; }'
  ].join('\\n');

  function ensureHcStyle() {
    if (document.getElementById("__ais-high-contrast-style")) return;
    var style = document.createElement("style");
    style.id = "__ais-high-contrast-style";
    style.textContent = hcCss;
    (document.head || document.documentElement).appendChild(style);
  }

  function applyHighContrast(enabled) {
    ensureHcStyle();
    if (enabled) {
      document.documentElement.setAttribute("data-ais-high-contrast", "true");
    } else {
      document.documentElement.removeAttribute("data-ais-high-contrast");
    }
  }

  applyHighContrast(!!seed.hc);
  window.addEventListener("message", function(ev) {
    if (ev && ev.data && ev.data.__aisHighContrastSync === true) {
      applyHighContrast(!!ev.data.enabled);
    }
  });
})();<\/script>`;
}

function injectShimIntoHtml(html: string, shimScript: string): string {
  if (/<head\b[^>]*>/i.test(html)) {
    return html.replace(/<head\b[^>]*>/i, (m) => m + shimScript);
  }
  if (/<html\b[^>]*>/i.test(html)) {
    return html.replace(/<html\b[^>]*>/i, (m) => m + '<head>' + shimScript + '</head>');
  }
  return shimScript + html;
}

function buildSandboxedSrcDoc(html: string, highContrast = false): string {
  if (!html) return '';
  return injectShimIntoHtml(html, buildHostStorageShimScript(highContrast));
}

interface LivePreviewProps {
  creation: Creation | null;
  isLoading: boolean;
  loadingMode?: 'create' | 'refine';
  isFocused: boolean;
  highContrast?: boolean;
  onOpenSettings?: () => void;
  onReset: () => void;
  onRefine?: (instruction: string) => void;
}

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

const LoadingStep = ({ text, active, completed }: { text: string; active: boolean; completed: boolean }) => (
  <div
    className={`flex items-center space-x-3 transition-all duration-500 ${
      active || completed ? 'opacity-100 translate-x-0' : 'opacity-30 translate-x-4'
    }`}
  >
    <div
      className={`w-4 h-4 flex items-center justify-center ${
        completed ? 'text-green-400' : active ? 'text-blue-400' : 'text-zinc-700'
      }`}
    >
      {completed ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : active ? (
        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
      ) : (
        <div className="w-1.5 h-1.5 bg-zinc-700 rounded-full"></div>
      )}
    </div>
    <span
      className={`font-mono text-xs tracking-wide uppercase ${
        active ? 'text-zinc-200' : completed ? 'text-zinc-400 line-through' : 'text-zinc-600'
      }`}
    >
      {text}
    </span>
  </div>
);

const PdfRenderer = ({ dataUrl }: { dataUrl: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderPdf = async () => {
      if (!window.pdfjsLib) {
        setError('Biblioteca de PDF não inicializada');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const loadingTask = window.pdfjsLib.getDocument(dataUrl);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        const viewport = page.getViewport({ scale: 2.0 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport }).promise;
        setLoading(false);
      } catch (err) {
        console.error('Erro ao renderizar PDF:', err);
        setError('Não foi possível renderizar a pré-visualização do PDF.');
        setLoading(false);
      }
    };

    renderPdf();
  }, [dataUrl]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500 p-6 text-center">
        <DocumentIcon className="w-12 h-12 mb-3 opacity-50 text-red-400" />
        <p className="text-sm mb-2 text-red-400/80">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={`max-w-full max-h-full object-contain shadow-xl border border-zinc-800/50 rounded transition-opacity duration-500 ${
          loading ? 'opacity-0' : 'opacity-100'
        }`}
      />
    </div>
  );
};

export const LivePreview: React.FC<LivePreviewProps> = ({
  creation,
  isLoading,
  loadingMode = 'create',
  isFocused,
  highContrast = false,
  onOpenSettings,
  onReset,
  onRefine,
}) => {
  const [loadingStep, setLoadingStep] = useState(0);
  const [showSplitView, setShowSplitView] = useState(false);
  const [viewTab, setViewTab] = useState<'preview' | 'code'>('preview');
  const [viewportMode, setViewportMode] = useState<'desktop' | 'mobile'>('desktop');
  const [copiedCode, setCopiedCode] = useState(false);
  const [refineInput, setRefineInput] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      handlePreviewStorageMessage(event, iframeRef.current?.contentWindow);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    if (!copiedCode) return;
    const t = setTimeout(() => setCopiedCode(false), 2000);
    return () => clearTimeout(t);
  }, [copiedCode]);

  // Build srcDoc once per creation change (live high-contrast updates flow via postMessage without resetting iframe state)
  const sandboxedHtml = useMemo(
    () => (creation?.html ? buildSandboxedSrcDoc(creation.html, highContrast) : ''),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [creation?.html]
  );

  // Sync High Contrast changes live into the active iframe
  useEffect(() => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        { __aisHighContrastSync: true, enabled: highContrast },
        '*'
      );
    } catch {
      // Ignore postMessage errors if iframe is not ready
    }
  }, [highContrast, viewTab, viewportMode]);

  useEffect(() => {
    if (isLoading) {
      setLoadingStep(0);
      const interval = setInterval(() => {
        setLoadingStep((prev) => (prev < 3 ? prev + 1 : prev));
      }, 2500);
      return () => clearInterval(interval);
    } else {
      setLoadingStep(0);
    }
  }, [isLoading]);

  useEffect(() => {
    setViewTab('preview');
    setCopiedCode(false);
    if (creation?.originalImage) {
      setShowSplitView(true);
    } else {
      setShowSplitView(false);
    }
  }, [creation]);

  const slugifyName = (name: string) =>
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/gi, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase() || 'aplicativo';

  const handleDownloadHtml = () => {
    if (!creation?.html) return;
    const blob = new Blob([creation.html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slugifyName(creation.name)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    if (!creation) return;
    const dataStr = JSON.stringify(creation, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slugifyName(creation.name)}_artefato.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyCode = async () => {
    if (!creation?.html) return;
    try {
      await navigator.clipboard.writeText(creation.html);
      setCopiedCode(true);
    } catch {
      // Clipboard API fallback
      const textarea = document.createElement('textarea');
      textarea.value = creation.html;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopiedCode(true);
      } finally {
        document.body.removeChild(textarea);
      }
    }
  };

  const handleRefineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onRefine || isLoading || !refineInput.trim()) return;
    const instruction = refineInput.trim();
    setRefineInput('');
    onRefine(instruction);
  };

  const quickRefinements = [
    'Adicionar exportar CSV',
    'Incluir filtros e busca',
    'Adicionar gráfico resumo',
  ];

  const loadingConfig =
    loadingMode === 'refine'
      ? {
          title: 'Refinando Aplicação',
          subtitle: 'Aplicando os ajustes solicitados mantendo o que já funciona...',
          steps: [
            'Lendo estrutura atual',
            'Integrando novas melhorias',
            'Ajustando interface e persistência',
            'Recompilando pré-visualização',
          ],
        }
      : {
          title: 'Construindo Ambiente',
          subtitle: 'Interpretando dados visuais e funcionais...',
          steps: [
            'Analisando entradas',
            'Identificando padrões de interface',
            'Gerando lógica funcional',
            'Compilando pré-visualização',
          ],
        };

  const htmlLinesCount = useMemo(
    () => (creation?.html ? creation.html.split(/\r?\n/).length : 0),
    [creation?.html]
  );

  return (
    <div
      className={`
        fixed z-40 flex flex-col
        rounded-2xl overflow-hidden border border-white/15 bg-[#12083a] shadow-2xl
        transition-all duration-700 cubic-bezier(0.2, 0.8, 0.2, 1)
        ${
          isFocused
            ? 'inset-2 md:inset-4 opacity-100 scale-100'
            : 'top-1/2 left-1/2 w-[90%] h-[60%] -translate-x-1/2 -translate-y-1/2 opacity-0 scale-95 pointer-events-none'
        }
      `}
    >
      {/* Header */}
      <div className="bg-[#170b47] px-3 sm:px-4 py-2.5 flex items-center justify-between border-b border-white/10 shrink-0 gap-3">
        {/* Left: Controls + Title */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex space-x-2 group/controls shrink-0">
            <button
              onClick={onReset}
              className="w-3.5 h-3.5 rounded-full bg-[#ec1163] hover:brightness-110 transition-all flex items-center justify-center focus:outline-none"
              title="Fechar Pré-visualização"
              aria-label="Fechar Pré-visualização"
            >
              <XMarkIcon className="w-2.5 h-2.5 text-white opacity-0 group-hover/controls:opacity-100" />
            </button>
            <div className="w-3.5 h-3.5 rounded-full bg-[#f59e0b]"></div>
            <div className="w-3.5 h-3.5 rounded-full bg-[#4f46e5]"></div>
          </div>

          <div className="flex items-center space-x-2 text-indigo-100 min-w-0">
            <CodeBracketIcon className="w-4 h-4 text-[#fbbf24] shrink-0 hidden sm:block" />
            <span className="text-xs font-mono uppercase tracking-wider truncate">
              {isLoading ? 'Processando...' : creation ? creation.name : 'Pré-visualização'}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0">
          {!isLoading && creation && (
            <>
              {/* Preview | Code Switcher */}
              <div
                role="tablist"
                aria-label="Visualização"
                className="inline-flex items-center bg-[#100833] border border-white/15 rounded-full p-0.5"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewTab === 'preview'}
                  onClick={() => setViewTab('preview')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full transition-colors whitespace-nowrap shrink-0 ${
                    viewTab === 'preview'
                      ? 'bg-[#ec1163] text-white'
                      : 'text-indigo-200/80 hover:text-white'
                  }`}
                >
                  <EyeIcon className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Preview</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewTab === 'code'}
                  onClick={() => setViewTab('code')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full transition-colors whitespace-nowrap shrink-0 ${
                    viewTab === 'code'
                      ? 'bg-[#ec1163] text-white'
                      : 'text-indigo-200/80 hover:text-white'
                  }`}
                >
                  <CodeBracketIcon className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Código</span>
                </button>
              </div>

              {/* Desktop | Mobile Viewport Toggle */}
              {viewTab === 'preview' && (
                <div
                  role="group"
                  aria-label="Tamanho da tela"
                  className="hidden sm:inline-flex items-center bg-[#100833] border border-white/15 rounded-full p-0.5"
                >
                  <button
                    type="button"
                    onClick={() => setViewportMode('desktop')}
                    aria-pressed={viewportMode === 'desktop'}
                    title="Visualização Desktop"
                    aria-label="Visualização Desktop"
                    className={`p-1.5 rounded-full transition-colors ${
                      viewportMode === 'desktop'
                        ? 'bg-[#241566] text-[#fbbf24]'
                        : 'text-indigo-200/70 hover:text-white'
                    }`}
                  >
                    <ComputerDesktopIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewportMode('mobile')}
                    aria-pressed={viewportMode === 'mobile'}
                    title="Visualização Celular (390px)"
                    aria-label="Visualização Celular"
                    className={`p-1.5 rounded-full transition-colors ${
                      viewportMode === 'mobile'
                        ? 'bg-[#241566] text-[#fbbf24]'
                        : 'text-indigo-200/70 hover:text-white'
                    }`}
                  >
                    <DevicePhoneMobileIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {viewTab === 'preview' && creation.originalImage && (
                <button
                  type="button"
                  onClick={() => setShowSplitView(!showSplitView)}
                  title={showSplitView ? 'Mostrar Apenas o App' : 'Comparar com o Original'}
                  aria-label={showSplitView ? 'Mostrar Apenas o App' : 'Comparar com o Original'}
                  className={`p-1.5 rounded-full transition-all ${
                    showSplitView
                      ? 'bg-[#241566] text-[#fbbf24]'
                      : 'text-indigo-200/75 hover:text-white hover:bg-[#241566]'
                  }`}
                >
                  <ViewColumnsIcon className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={handleDownloadHtml}
                title="Baixar arquivo HTML pronto"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-[#241566] hover:bg-[#311d85] border border-white/15 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap shrink-0"
              >
                <ArrowDownTrayIcon className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span className="hidden sm:inline">.HTML</span>
              </button>

              <button
                type="button"
                onClick={handleExportJson}
                title="Exportar Artefato (.JSON)"
                aria-label="Exportar Artefato JSON"
                className="text-indigo-200/75 hover:text-white transition-colors p-1.5 rounded-full hover:bg-[#241566]"
              >
                <DocumentArrowDownIcon className="w-4 h-4" />
              </button>
            </>
          )}

          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              title="Configurações e Acessibilidade"
              aria-label="Configurações e Acessibilidade"
              className={`p-1.5 rounded-full transition-colors ${
                highContrast
                  ? 'bg-[#241566] text-white'
                  : 'text-indigo-200/75 hover:text-white hover:bg-[#241566]'
              }`}
            >
              <Cog6ToothIcon className="w-4 h-4" />
            </button>
          )}

          {!isLoading && creation && (
            <button
              type="button"
              onClick={onReset}
              title="Novo Envio"
              className="flex items-center space-x-1 text-xs font-bold bg-[#fbbf24] text-[#100833] hover:bg-amber-300 px-3.5 py-1.5 rounded-full transition-colors whitespace-nowrap shrink-0"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Novo</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative w-full flex-1 bg-[#100833] flex flex-col overflow-hidden">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 w-full">
            <div className="w-full max-w-md space-y-8">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 mb-6 text-[#fbbf24] animate-spin-slow">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-white font-display font-semibold text-lg tracking-tight">
                  {loadingConfig.title}
                </h3>
                <p className="text-indigo-200/80 text-sm mt-2">{loadingConfig.subtitle}</p>
              </div>

              <div className="w-full h-1.5 bg-[#241566] rounded-full overflow-hidden">
                <div className="h-full bg-[#ec1163] animate-[loading_3s_ease-in-out_infinite] w-1/3"></div>
              </div>

              <div className="border border-white/15 bg-[#170b47]/80 rounded-xl p-4 space-y-3 font-mono text-sm">
                {loadingConfig.steps.map((stepText, idx) => (
                  <LoadingStep
                    key={idx}
                    text={stepText}
                    active={loadingStep === idx}
                    completed={loadingStep > idx}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : creation?.html ? (
          viewTab === 'code' ? (
            <div className="flex-1 flex flex-col overflow-hidden bg-[#100833]">
              <div className="px-4 py-2.5 border-b border-white/10 bg-[#170b47] flex items-center justify-between gap-3 shrink-0">
                <div className="text-xs font-mono text-indigo-200/80 tabular-nums">
                  {htmlLinesCount} linhas · {creation.html.length.toLocaleString('pt-BR')} caracteres
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-[#241566] hover:bg-[#311d85] border border-white/15 text-white rounded-full transition-colors whitespace-nowrap shrink-0"
                  >
                    {copiedCode ? (
                      <>
                        <CheckIcon className="w-3.5 h-3.5 text-[#fbbf24]" />
                        <span>Copiado</span>
                      </>
                    ) : (
                      <>
                        <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                        <span>Copiar HTML</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadHtml}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-[#ec1163] hover:bg-[#f42573] text-white rounded-full transition-colors whitespace-nowrap shrink-0"
                  >
                    <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                    <span>Baixar .HTML</span>
                  </button>
                </div>
              </div>
              <pre className="flex-1 overflow-auto p-4 sm:p-6 text-xs sm:text-sm font-mono text-indigo-100 leading-relaxed whitespace-pre-wrap break-words">
                <code>{creation.html}</code>
              </pre>
            </div>
          ) : (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Split View: Left Panel (Original Image) */}
              {showSplitView && creation.originalImage && (
                <div className="w-full md:w-1/2 h-1/2 md:h-full border-b md:border-b-0 md:border-r border-white/10 bg-[#100833] relative flex flex-col shrink-0">
                  <div className="absolute top-4 left-4 z-10 bg-[#170b47]/90 backdrop-blur text-indigo-200 text-[10px] font-mono uppercase px-2.5 py-1 rounded-full border border-white/15">
                    Fonte de Entrada
                  </div>
                  <div className="w-full h-full p-6 flex items-center justify-center overflow-hidden">
                    {creation.originalImage.startsWith('data:application/pdf') ? (
                      <PdfRenderer dataUrl={creation.originalImage} />
                    ) : (
                      <img
                        src={creation.originalImage}
                        alt="Entrada Original"
                        className="max-w-full max-h-full object-contain shadow-xl border border-white/15 rounded-xl"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* App Preview Panel */}
              <div
                className={`relative h-full transition-all duration-300 ${
                  showSplitView && creation.originalImage
                    ? 'w-full md:w-1/2 h-1/2 md:h-full'
                    : 'w-full'
                } ${
                  viewportMode === 'mobile'
                    ? 'bg-[#100833] flex items-center justify-center p-3 sm:p-5 overflow-auto'
                    : 'bg-white'
                }`}
              >
                <div
                  className={
                    viewportMode === 'mobile'
                      ? 'w-full max-w-[390px] h-full max-h-[820px] bg-white rounded-3xl overflow-hidden border-4 border-[#241566] shadow-[0_20px_50px_rgba(6,2,28,0.7)]'
                      : 'w-full h-full'
                  }
                >
                  <iframe
                    ref={iframeRef}
                    title="Pré-visualização Interativa"
                    srcDoc={sandboxedHtml}
                    className="w-full h-full"
                    sandbox="allow-scripts allow-forms allow-popups allow-modals"
                  />
                </div>
              </div>
            </div>
          )
        ) : null}
      </div>

      {/* Bottom Iterative Refinement Bar */}
      {!isLoading && creation && onRefine && (
        <form
          onSubmit={handleRefineSubmit}
          className="bg-[#170b47] border-t border-white/10 px-3 sm:px-4 py-2.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0"
        >
          <div className="hidden lg:flex items-center gap-1.5 shrink-0">
            {quickRefinements.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setRefineInput(suggestion)}
                className="text-xs text-indigo-100/85 hover:text-white bg-[#241566] hover:bg-[#311d85] border border-white/15 rounded-full px-3 py-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                {suggestion}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={refineInput}
            onChange={(e) => setRefineInput(e.target.value)}
            placeholder="Pedir ajuste neste app (ex.: adicione filtro de busca, gráfico ou exportar CSV)..."
            aria-label="Instrução de refinamento do aplicativo"
            className="flex-1 bg-[#100833] border border-indigo-300/25 focus:border-[#fbbf24] rounded-full px-4 py-1.5 text-xs sm:text-sm text-white placeholder:text-indigo-200/50 focus:outline-none"
          />

          <button
            type="submit"
            disabled={!refineInput.trim()}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 bg-[#ec1163] hover:bg-[#f42573] disabled:bg-[#241566] disabled:text-indigo-300/50 text-white text-xs sm:text-sm font-semibold rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed"
          >
            <span>Aplicar Ajuste</span>
            <PaperAirplaneIcon className="w-3.5 h-3.5" />
          </button>
        </form>
      )}
    </div>
  );
};
