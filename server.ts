/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

class BoundedMap<K, V> extends Map<K, V> {
  maxEntries: number;
  constructor(maxEntries: number) {
    super();
    this.maxEntries = maxEntries;
  }
  set(key: K, value: V): this {
    if (this.has(key)) {
      this.delete(key);
    } else if (this.size >= this.maxEntries) {
      const oldest = this.keys().next().value;
      if (oldest !== undefined) this.delete(oldest);
    }
    return super.set(key, value);
  }
}


function stripHttpOptions(val: any): any {
  if (!val || typeof val !== "object") return val;
  if (Array.isArray(val)) return val.map(stripHttpOptions);
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(val)) {
    if (
      k === "httpOptions" ||
      k === "http_options" ||
      k === "__proto__" ||
      k === "constructor" ||
      k === "prototype" ||
      k === "cachedContent" ||
      k === "cached_content" ||
      k === "fileSearch" ||
      k === "file_search" ||
      k === "corpora" ||
      k === "semanticRetriever" ||
      k === "semantic_retriever"
    ) continue;
    if ((k === "fileData" || k === "file_data") && v && typeof v === "object") {
      const rawU = (v as any).fileUri ?? (v as any).file_uri;
      const u = typeof rawU === "string" ? rawU.trim() : "";
      if (!/^https:\/\/(?:www\.|m\.)?(?:youtube\.com|youtu\.be)\//i.test(u)) continue;
    }
    out[k] = stripHttpOptions(v);
  }
  return out;
}


const MODEL_UPGRADES: Record<string, string> = {
  "gemini-2.5-flash": "gemini-3-flash-preview",
  "gemini-2.5-pro": "gemini-3.1-pro-preview",
  "gemini-3-pro-preview": "gemini-3.1-pro-preview",
  "gemini-2.0-flash": "gemini-3-flash-preview",
  "gemini-2.0-flash-exp": "gemini-3-flash-preview",
};

const ALLOWED_MODEL_RE = /^(?!.*\.\.)(?:models\/)?(?:gemini-|imagen-|veo-|lyria-|learnlm-|text-embedding-|gemini-embedding-)[a-zA-Z0-9._-]+$/;

function resolveModel(model?: string): string {
  const candidate = !model ? "gemini-3-flash-preview" : MODEL_UPGRADES[model] || model;
  if (!ALLOWED_MODEL_RE.test(candidate)) {
    throw new Error(`Disallowed model: ${candidate}`);
  }
  return candidate;
}

function serializeGenerateContentResponse(r: any) {
  return {
    candidates: r?.candidates,
    promptFeedback: r?.promptFeedback,
    usageMetadata: r?.usageMetadata,
    modelVersion: r?.modelVersion,
    responseId: r?.responseId,
    text: r?.text,
    functionCalls: r?.functionCalls,
    data: r?.data,
    executableCode: r?.executableCode,
    codeExecutionResult: r?.codeExecutionResult,
  };
}

const chats = new BoundedMap<string, any>(200);
const videoOps = new BoundedMap<string, { op: any; ownerKey: string }>(100);

function getClientKey(req: any): string {
  const raw = req?.headers?.["x-client-id"];
  if (typeof raw === "string" && /^[a-zA-Z0-9_-]{8,128}$/.test(raw.trim())) {
    return `cid:${raw.trim()}`;
  }
  const xffParts = String(req?.headers?.["x-forwarded-for"] || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const xff = xffParts.length >= 2 ? xffParts[xffParts.length - 2] : (xffParts[0] || "");
  return `ip:${xff || req?.ip || req?.socket?.remoteAddress || "unknown"}`;
}

async function startServer() {
  const app = express();
  app.set("trust proxy", 2);
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use((req, _res, next) => {
    if (req.body && typeof req.body === "object") {
      req.body = stripHttpOptions(req.body);
    }
    next();
  });

  for (const dir of ["examples", "assets", "public"]) {
    const dirPath = path.join(process.cwd(), dir);
    if (fs.existsSync(dirPath)) {
      app.use(`/${dir}`, express.static(dirPath));
    }
  }

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  const createGeminiClient = (apiKey: string) =>
    new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

  const formatApiError = (error: any, fallback: string) => {
    const msg = String(error?.message || fallback);
    const status = Number(error?.status || error?.code || 500);
    if (status === 403 || msg.includes("PERMISSION_DENIED") || msg.includes("API_KEY_INVALID")) {
      return {
        status: status === 400 ? 400 : 403,
        message: "Chave de API inválida ou sem permissão. Verifique GEMINI_API_KEY em Settings > Secrets.",
      };
    }
    if (status === 429 || msg.includes("RESOURCE_EXHAUSTED")) {
      return {
        status: 429,
        message: "Limite de uso atingido. Verifique sua cota ou selecione uma chave de API com faturamento em Settings > Secrets.",
      };
    }
    return {
      status: status >= 400 && status < 600 ? status : 500,
      message: msg,
    };
  };

  const CATEGORY_DIRECTIVES: Record<string, string> = {
    dashboard:
      "ARQUITETURA SUGERIDA (Painel / Gestão): Organize em cabeçalho com filtros/busca, grade de indicadores-chave (KPIs com números alinhados), visualização gráfica em SVG/Canvas ou barras de progresso, e tabela/lista gerenciável com ações reais e exportação CSV.",
    tool:
      "ARQUITETURA SUGERIDA (Utilitário / Calculadora): Priorize controles diretos de entrada com atualização instantânea em tempo real, resumo numérico claro, histórico/comparativo de cenários salvos e botão de copiar/exportar resultado.",
    game:
      "ARQUITETURA SUGERIDA (Jogo / Simulador): Inclua regras claras acessíveis, placar/cronômetro ao vivo, níveis ou modos de dificuldade, feedback visual imediato nas ações, botão de reiniciar e recorde salvo localmente.",
    editorial:
      "ARQUITETURA SUGERIDA (Guia / Apresentação): Estruture com navegação clara por seções/abas, busca ou índice interativo, cards informativos bem espaçados, checklist ou progresso de leitura e versão limpa para impressão.",
  };

  const STYLE_DIRECTIVES: Record<string, string> = {
    indigo:
      "ESTILO VISUAL (Índigo Vibrante & Glass): Fundo índigo profundo (#100833 a #1b0e4f) com formas orgânicas suaves em violeta (#4318d1) e magenta (#c8116f), cartões translúcidos com desfoque de vidro (glassmorphism), destaques de texto em dourado (#fbbf24) e ciano (#38bdf8), e botões circulares/arredondados vibrantes em rosa-magenta (#ec1163), âmbar (#f59e0b) e índigo (#4f46e5).",
    modern:
      "ESTILO VISUAL (Moderno Limpo): Superfícies organizadas com bordas finas sutis, ótima hierarquia tipográfica, espaçamento generoso e uma cor de destaque principal bem dosada.",
    editorial:
      "ESTILO VISUAL (Editorial / Clássico): Inspiração em publicação impressa contemporânea, contraste calmo (papel ou grafite), títulos expressivos e leitura confortável.",
    retro:
      "ESTILO VISUAL (Retrô / Tátil): Estética tátil inspirada em hardware clássico ou interfaces analógicas com botões bem definidos, mostradores precisos e alto apelo visual.",
    compact:
      "ESTILO VISUAL (Denso / Compacto): Otimizado para alta produtividade e densidade de dados, tabelas e controles enxutos com máxima clareza em pouca rolagem.",
  };

  const APP_SYSTEM_INSTRUCTION = `You are an expert AI Engineer and Product Designer specializing in "bringing artifacts to life".
Your goal is to take a user's idea, sketch, wireframe, photo, or PDF document and generate a genuinely rich, polished, fully functional single-page HTML/CSS/JavaScript web application.

PRODUCT QUALITY & ENGINEERING DIRECTIVES:
1. Analyze & Abstract:
   - Sketches/Wireframes: Detect buttons, inputs, tables, and layout. Turn them into a cohesive, modern UI.
   - Real-World Photos / Documents: Gamify or build a practical, feature-complete interactive utility around the subject.
2. Realistic Seed Data (PT-BR):
   - Pre-populate lists, tables, charts, or examples with realistic, domain-authentic Brazilian Portuguese sample data so the user can test immediately (NEVER use "Item 1", "Teste", or "Lorem ipsum"). Include a clear "Limpar" or "Restaurar exemplo" action when applicable.
3. Rich Interactivity & Persistence:
   - Include real working controls: instant search/filtering, sorting, dynamic SVG/Canvas charts or visual progress indicators, form validation, and helpful empty states.
   - Automatically persist user changes in localStorage under a unique app key so state survives reloads.
   - When the app handles lists, calculations, budgets, or reports, include a working client-side export button (e.g., download .CSV/.JSON or print stylesheet via @media print).
4. Responsive & Accessible:
   - Must work cleanly on both desktop (1280px+) and mobile (375px+) without horizontal overflow.
   - Include clear labels, keyboard accessibility, and strong focus outlines (:focus-visible).
5. Self-Contained & No External Broken Images:
   - Single HTML file with embedded <style> and <script>. Tailwind CSS via CDN (<script src="https://cdn.tailwindcss.com"></script>) is allowed if helpful.
   - NEVER use <img src="..."> pointing to external image hosts. Use crisp inline SVGs, CSS shapes/gradients, Canvas drawings, or Emojis.
6. Language (PT-BR):
   - Write all visible UI labels, headings, placeholders, tooltips, sample data, and feedback messages in Português do Brasil (pt-BR), unless an uploaded document explicitly demands another language.

RESPONSE FORMAT:
Return ONLY the raw HTML code. Do not wrap it in markdown code blocks (\`\`\`html ... \`\`\`). Start immediately with <!DOCTYPE html>.`;

  app.post("/api/bring-to-life", async (req, res): Promise<any> => {
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) {
        return res.status(503).json({
          error: "Chave de API não configurada. Adicione GEMINI_API_KEY em Settings > Secrets.",
        });
      }

      const {
        prompt,
        fileBase64,
        mimeType,
        category,
        visualStyle,
        highContrast,
        currentHtml,
        refinementInstruction,
      } = req.body || {};
      const ai = createGeminiClient(apiKey);

      const contrastDirective = highContrast
        ? "\n\nACESSIBILIDADE (MODO ALTO CONTRASTE ATIVO): Use paleta de alto contraste WCAG AAA (fundo escuro #000000 com texto #FFFFFF, botões com bordas nítidas de 2px, links sublinhados em #FDE047 e foco visível forte)."
        : "";

      const categoryText =
        typeof category === "string" && CATEGORY_DIRECTIVES[category]
          ? `\n\n${CATEGORY_DIRECTIVES[category]}`
          : "";
      const styleText =
        typeof visualStyle === "string" && STYLE_DIRECTIVES[visualStyle]
          ? `\n\n${STYLE_DIRECTIVES[visualStyle]}`
          : "";

      let parts: any[];

      if (typeof currentHtml === "string" && currentHtml.trim() && typeof refinementInstruction === "string" && refinementInstruction.trim()) {
        const refinePrompt = `Você está aprimorando uma aplicação HTML/CSS/JS já existente.\n\nPEDIDO DE AJUSTE DO USUÁRIO:\n${refinementInstruction.trim()}\n\nREGRAS DE REFINAMENTO:\n- Preserve todas as funcionalidades existentes que continuam fazendo sentido e mantenha a persistência em localStorage.\n- Aplique o ajuste solicitado de forma completa, funcional e polida em Português (PT-BR).\n- Retorne o documento HTML completo e atualizado (começando com <!DOCTYPE html>), sem blocos de markdown.${contrastDirective}\n\nHTML ATUAL:\n${currentHtml}`;
        parts = [{ text: refinePrompt }];
      } else {
        const basePrompt = fileBase64
          ? `${prompt?.trim() ? `Pedido do usuário: ${prompt.trim()}\n\n` : ""}Analise esta imagem/documento. Detecte qual funcionalidade está implícita e crie um aplicativo web interativo rico e completo em Português (PT-BR). IMPORTANTE: NÃO use URLs de imagens externas.`
          : prompt?.trim() || "Crie um aplicativo de demonstração interativo rico em Português (PT-BR).";

        parts = [{ text: `${basePrompt}${categoryText}${styleText}${contrastDirective}` }];
        if (fileBase64 && mimeType) {
          parts.push({
            inlineData: {
              data: fileBase64,
              mimeType,
            },
          });
        }
      }

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: { parts },
        config: {
          systemInstruction: APP_SYSTEM_INSTRUCTION,
        },
      });

      let html = response.text || "";
      html = html.replace(/^```html\s*/i, "").replace(/^```\s*/, "").replace(/```\s*$/, "").trim();
      const docStart = html.search(/<!DOCTYPE html|<html\b/i);
      if (docStart > 0) {
        html = html.slice(docStart).trim();
      }
      if (!html) {
        return res.status(502).json({ error: "A resposta retornou vazia. Tente reformular a instrução." });
      }

      return res.json({ html });
    } catch (error: any) {
      console.error("[Backend] /api/bring-to-life error:", error);
      const formatted = formatApiError(error, "Falha ao gerar a aplicação interativa.");
      return res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post("/api/generate-content", async (req, res): Promise<any> => {
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) {
        return res.status(503).json({
          error: "API key is not configured. Please add your GEMINI_API_KEY in Settings > Secrets.",
        });
      }
      const ai = new GoogleGenAI({ apiKey });
      const params = { ...req.body, model: resolveModel(req.body?.model) };
      const response = await ai.models.generateContent(params);
      return res.json(serializeGenerateContentResponse(response));
    } catch (error: any) {
      console.error("[Backend] /api/generate-content error:", error);
      return res.status(500).json({ error: error.message || "Failed to generate content." });
    }
  });

  app.post("/api/generate-content-stream", async (req, res): Promise<any> => {
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) {
        return res.status(503).json({
          error: "API key is not configured. Please add your GEMINI_API_KEY in Settings > Secrets.",
        });
      }
      const ai = new GoogleGenAI({ apiKey });
      const params = { ...req.body, model: resolveModel(req.body?.model) };
      const stream = await ai.models.generateContentStream(params);
      res.setHeader("Content-Type", "application/x-ndjson");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      for await (const chunk of stream) {
        res.write(JSON.stringify(serializeGenerateContentResponse(chunk)) + "\n");
      }
      res.end();
    } catch (error: any) {
      console.error("[Backend] /api/generate-content-stream error:", error);
      if (!res.headersSent) {
        return res.status(500).json({ error: error.message || "Failed to stream content." });
      }
      res.end();
    }
  });

  app.post("/api/chat-message", async (req, res): Promise<any> => {
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) {
        return res.status(503).json({
          error: "API key is not configured. Please add your GEMINI_API_KEY in Settings > Secrets.",
        });
      }
      const { sessionId, model, config, history, message, msgConfig } = req.body || {};
      const ai = new GoogleGenAI({ apiKey });
      const chatKey = sessionId ? `${getClientKey(req)}:${String(sessionId).slice(0, 128)}` : "";
      let chat = chatKey ? chats.get(chatKey) : undefined;
      if (!chat) {
        chat = ai.chats.create({
          model: resolveModel(model),
          config,
          history,
        });
        if (chatKey) chats.set(chatKey, chat);
      }
      const response = await chat.sendMessage({ message, config: msgConfig });
      return res.json(serializeGenerateContentResponse(response));
    } catch (error: any) {
      console.error("[Backend] /api/chat-message error:", error);
      return res.status(500).json({ error: error.message || "Failed to send chat message." });
    }
  });

  app.post("/api/chat-stream", async (req, res): Promise<any> => {
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) {
        return res.status(503).json({
          error: "API key is not configured. Please add your GEMINI_API_KEY in Settings > Secrets.",
        });
      }
      const { sessionId, model, config, history, message, msgConfig } = req.body || {};
      const ai = new GoogleGenAI({ apiKey });
      const chatKey = sessionId ? `${getClientKey(req)}:${String(sessionId).slice(0, 128)}` : "";
      let chat = chatKey ? chats.get(chatKey) : undefined;
      if (!chat) {
        chat = ai.chats.create({
          model: resolveModel(model),
          config,
          history,
        });
        if (chatKey) chats.set(chatKey, chat);
      }
      const stream = await chat.sendMessageStream({ message, config: msgConfig });
      res.setHeader("Content-Type", "application/x-ndjson");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      for await (const chunk of stream) {
        res.write(JSON.stringify(serializeGenerateContentResponse(chunk)) + "\n");
      }
      res.end();
    } catch (error: any) {
      console.error("[Backend] /api/chat-stream error:", error);
      if (!res.headersSent) {
        return res.status(500).json({ error: error.message || "Failed to stream chat message." });
      }
      res.end();
    }
  });

  app.post("/api/generate-images", async (req, res): Promise<any> => {
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) {
        return res.status(503).json({
          error: "API key is not configured. Please add your GEMINI_API_KEY in Settings > Secrets.",
        });
      }
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateImages({ ...req.body, model: resolveModel(req.body?.model || "imagen-3.0-generate-002") });
      return res.json(response);
    } catch (error: any) {
      console.error("[Backend] /api/generate-images error:", error);
      return res.status(500).json({ error: error.message || "Failed to generate images." });
    }
  });

  app.post("/api/generate-videos", async (req, res): Promise<any> => {
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) {
        return res.status(503).json({
          error: "API key is not configured. Please add your GEMINI_API_KEY in Settings > Secrets.",
        });
      }
      const ai = new GoogleGenAI({ apiKey });
      const body = { ...req.body };
      delete body.video;
      if (body.video && typeof body.video === 'object') { const c = { ...body.video }; delete c.uri; delete c.videoUri; body.video = Object.keys(c).length ? c : undefined; }
      delete body.source;
      body.model = resolveModel(body.model || "veo-3.1-fast-generate-preview");
      const op = await ai.models.generateVideos(body);
      if (op.name) {
        videoOps.set(op.name, { op, ownerKey: getClientKey(req) });
      }
      return res.json({
        name: op.name,
        done: op.done,
        metadata: op.metadata,
        error: op.error,
        response: op.response,
      });
    } catch (error: any) {
      console.error("[Backend] /api/generate-videos error:", error);
      return res.status(500).json({ error: error.message || "Failed to start video generation." });
    }
  });

  app.post("/api/videos-operation", async (req, res): Promise<any> => {
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) {
        return res.status(503).json({
          error: "API key is not configured. Please add your GEMINI_API_KEY in Settings > Secrets.",
        });
      }
      const ai = new GoogleGenAI({ apiKey });
      const opName = req.body?.operation?.name;
      const storedOp = opName ? videoOps.get(opName) : undefined;
      if (!storedOp) {
        return res.status(404).json({ error: "Video operation not found on server." });
      }
      const op = await ai.operations.getVideosOperation({ operation: storedOp.op });
      if (op.name) {
        videoOps.set(op.name, { op, ownerKey: getClientKey(req) });
      }
      const responseCopy = op.response ? JSON.parse(JSON.stringify(op.response)) : undefined;
      if (op.done && responseCopy?.generatedVideos) {
        for (const gv of responseCopy.generatedVideos) {
          if (gv.video?.uri) {
            const b64 = Buffer.from(gv.video.uri, "utf-8").toString("base64url");
            gv.video.uri = `/api/video-download?b64=${b64}`;
          }
        }
      }
      return res.json({
        name: op.name,
        done: op.done,
        metadata: op.metadata,
        error: op.error,
        response: responseCopy,
      });
    } catch (error: any) {
      console.error("[Backend] /api/videos-operation error:", error);
      return res.status(500).json({ error: error.message || "Failed to poll video operation." });
    }
  });

  app.get("/api/video-download", (_req, res) => {
    res.status(404).json({ error: "Video download is not enabled for this applet." });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(["/server.cjs", "/server.cjs.map"], (_req: any, res: any) => res.status(404).end());
    app.use(express.static(distPath));
    app.use((_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Backend] Server running on http://localhost:${PORT}`);
  });
}

startServer();
