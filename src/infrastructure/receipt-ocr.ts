export interface ReceiptDraft {
  amountVnd: number | null;
  description: string | null;
}

interface VisionSettings {
  enabled: boolean;
  apiKey?: string | undefined;
}

interface VisionTextResponse {
  responses?: Array<{
    fullTextAnnotation?: { text?: unknown };
  }>;
}

const VISION_URL = 'https://vision.googleapis.com/v1/images:annotate';
const MAX_IMAGE_BYTES = 2_200_000;
const MAX_RESPONSE_BYTES = 1_000_000;
const MAX_OCR_TEXT_LENGTH = 100_000;

function imageBytes(mimeType: string, base64: string): Buffer {
  if (mimeType !== 'image/jpeg' && mimeType !== 'image/png') {
    throw new Error('RECEIPT_IMAGE_TYPE_INVALID');
  }
  if (base64.length < 1 || base64.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64)) {
    throw new Error('RECEIPT_IMAGE_SIZE_INVALID');
  }
  const bytes = Buffer.from(base64, 'base64');
  if (bytes.length < 8 || bytes.length > MAX_IMAGE_BYTES) throw new Error('RECEIPT_IMAGE_SIZE_INVALID');
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if ((mimeType === 'image/jpeg' && !isJpeg) || (mimeType === 'image/png' && !isPng)) {
    throw new Error('RECEIPT_IMAGE_TYPE_INVALID');
  }
  return bytes;
}

function parseVndCandidate(value: string): number | null {
  const digits = value.replace(/\D/g, '');
  if (!digits) return null;
  const amount = Number(digits);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

function findAmount(lines: string[]): number | null {
  const totalLabel = /(?:tổng\s*(?:cộng|tiền|thanh toán)?|thanh\s*toán|cần\s*trả|phải\s*trả|grand\s*total|total\s*(?:due|payment|amount)|amount\s*due)/i;
  const number = /(?<!\d)\d{1,3}(?:[.,\s]\d{3})+(?!\d)|(?<!\d)\d{4,}(?!\d)/g;
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (!totalLabel.test(lines[index] ?? '')) continue;
    const sameLine = [...(lines[index] ?? '').matchAll(number)];
    const nextLine = [...(lines[index + 1] ?? '').matchAll(number)];
    const match = sameLine[0]?.[0] ?? nextLine[0]?.[0];
    if (match) return parseVndCandidate(match);
  }
  return null;
}

function safeDescription(lines: string[]): string | null {
  for (const line of lines) {
    const cleaned = line
      .trim()
      .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '')
      .replace(/(?:\+?84|0)(?:[\s().-]*\d){8,10}/g, '')
      .replace(/\b\d{7,}\b/g, '')
      .replace(/\s{2,}/g, ' ')
      .slice(0, 80);
    if (/[A-Za-zÀ-ỹ]/.test(cleaned) && !/(?:tổng|total|thanh toán|ngày|date)/i.test(cleaned)) return cleaned;
  }
  return null;
}

export function parseReceiptText(text: string): ReceiptDraft {
  const lines = text
    .normalize('NFKC')
    .slice(0, MAX_OCR_TEXT_LENGTH)
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
  return { amountVnd: findAmount(lines), description: safeDescription(lines) };
}

async function readBoundedResponse(response: Response): Promise<string> {
  const contentLength = Number(response.headers.get('Content-Length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) throw new Error('RECEIPT_OCR_RESPONSE_TOO_LARGE');
  const reader = response.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error('RECEIPT_OCR_RESPONSE_TOO_LARGE');
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

export async function readReceiptDraft(
  mimeType: string,
  base64: string,
  settings: VisionSettings = {
    enabled: process.env.RECEIPT_OCR_ENABLED === 'true',
    apiKey: process.env.GOOGLE_CLOUD_VISION_API_KEY,
  },
  fetcher: typeof fetch = fetch,
): Promise<ReceiptDraft> {
  if (!settings.enabled || !settings.apiKey) throw new Error('RECEIPT_OCR_UNAVAILABLE');
  const bytes = imageBytes(mimeType, base64);

  const response = await fetcher(VISION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': settings.apiKey,
    },
    body: JSON.stringify({
      requests: [{
        image: { content: bytes.toString('base64') },
        features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
      }],
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error('RECEIPT_OCR_PROVIDER_FAILED');

  let payload: unknown;
  try {
    payload = JSON.parse(await readBoundedResponse(response));
  } catch {
    throw new Error('RECEIPT_OCR_RESPONSE_INVALID');
  }
  if (!payload || typeof payload !== 'object' || !('responses' in payload)) throw new Error('RECEIPT_OCR_RESPONSE_INVALID');
  const first = (payload as VisionTextResponse).responses?.[0];
  const recognizedText = first?.fullTextAnnotation?.text;
  if (typeof recognizedText !== 'string') throw new Error('RECEIPT_OCR_RESPONSE_INVALID');
  return parseReceiptText(recognizedText);
}
