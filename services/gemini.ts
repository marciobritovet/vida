/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AppCategory = 'auto' | 'dashboard' | 'tool' | 'game' | 'editorial';
export type AppVisualStyle = 'auto' | 'indigo' | 'modern' | 'editorial' | 'retro' | 'compact';

export interface BringToLifeResult {
  html: string;
}

export interface BringToLifeOptions {
  category?: AppCategory;
  visualStyle?: AppVisualStyle;
  highContrast?: boolean;
  currentHtml?: string;
  refinementInstruction?: string;
}

async function postApi<T>(url: string, payload: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || `Falha na requisição (HTTP ${response.status}).`);
  }
  return data as T;
}

export async function bringToLife(
  prompt: string,
  fileBase64?: string,
  mimeType?: string,
  options?: BringToLifeOptions
): Promise<BringToLifeResult> {
  return postApi<BringToLifeResult>('/api/bring-to-life', {
    prompt,
    fileBase64,
    mimeType,
    category: options?.category ?? 'auto',
    visualStyle: options?.visualStyle ?? 'auto',
    highContrast: options?.highContrast ?? false,
    currentHtml: options?.currentHtml,
    refinementInstruction: options?.refinementInstruction,
  });
}