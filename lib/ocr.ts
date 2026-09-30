// ブラウザ内OCR（Tesseract.js, CDN読み込み）の共通ヘルパー。
// 免許証OCR（DriverOcrModal）とメーターOCR（ReportsTab）の両方から利用する。

declare global {
  interface Window {
    Tesseract?: any;
  }
}

const TESSERACT_SRC = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';

export function loadTesseract(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('window is not available'));
      return;
    }
    if (window.Tesseract) {
      resolve(window.Tesseract);
      return;
    }
    const existing = document.querySelector(`script[src="${TESSERACT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Tesseract));
      existing.addEventListener('error', () => reject(new Error('load failed')));
      return;
    }
    const script = document.createElement('script');
    script.src = TESSERACT_SRC;
    script.async = true;
    script.onload = () => resolve(window.Tesseract);
    script.onerror = () => reject(new Error('load failed'));
    document.head.appendChild(script);
  });
}

/**
 * OCRで読み取ったテキストから、走行距離メーター（オドメーター）らしき数値を抽出する。
 * 数字の誤認識（O→0, l/I→1 等）を軽くフィックスした上で、最も桁数の多い
 * 数字の並び（通常5〜6桁）を採用する簡易ヒューリスティック。
 */
export function extractOdometerReading(text: string): number | null {
  const cleaned = text
    .replace(/[oO]/g, '0')
    .replace(/[lI]/g, '1')
    .replace(/[^\d.\n]/g, ' ');
  const matches = cleaned.match(/\d{3,7}(?:\.\d)?/g);
  if (!matches || matches.length === 0) return null;
  const best = matches.reduce((a, b) => (b.replace('.', '').length > a.replace('.', '').length ? b : a));
  const n = Math.round(parseFloat(best));
  return isNaN(n) ? null : n;
}
