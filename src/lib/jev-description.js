const MAX_DESCRIPTION_LENGTH = 500

const CREDENTIAL_LABEL = String.raw`(?:api\s*[-_ ]?\s*key|access\s*[-_ ]?\s*token|refresh\s*[-_ ]?\s*token|private\s*[-_ ]?\s*key|client\s*[-_ ]?\s*secret|session\s*[-_ ]?\s*id|csrf\s*[-_ ]?\s*token|xsrf\s*[-_ ]?\s*token|auth(?:entication)?\s*[-_ ]?\s*token|(?:session|csrf|xsrf|auth(?:entication)?|token|credential|password|secret))`
const CREDENTIAL_MARKER = String.raw`(?:\b${CREDENTIAL_LABEL}\b|(?<![\w])(?:[A-Z][A-Z0-9]*_)*(?:API_KEY|ACCESS_TOKEN|REFRESH_TOKEN|CLIENT_SECRET|PRIVATE_KEY|SESSION_ID|CSRF_TOKEN|XSRF_TOKEN))`
const SENSITIVE_PATTERN = new RegExp(String.raw`\bbearer\s*[:=]?\s*\S+|\bcookie\b|(?<![\w])${CREDENTIAL_MARKER}(?:\s+\S+){0,3}?(?:\s*[:=]\s*|\s+\S+)|\b(?:account(?:\s+number)?|acct|iban|routing(?:\s+number)?|reference|ref|id|code|mã|ma)\s*[:#=]\s*[\w-]{5,}\b|\b[0-9a-f]{8}-[0-9a-f-]{27,}\b|\b\d{1,6}\s+[A-Za-zÀ-ỹ][A-Za-zÀ-ỹ .'-]{1,60},?\s*(?:district|quận|quan|phường|phuong|ward|huyện|huyen|city|thành phố|thanh pho)\s*\d*\b|\b\d{1,6}\s+[\wÀ-ỹ .'-]{1,50}\b(?:street|st\.?|road|rd\.?|avenue|ave\.?|boulevard|blvd\.?|drive|dr\.?|lane|ln\.?|đường|duong|phố|pho)\b`, 'iu')

function hasAmbiguousNaturalCredential(description) {
  const pattern = new RegExp(String.raw`(?<![\w])${CREDENTIAL_MARKER}\s*(?::|=|\b(?:is|was|equals)\b|\s)\s*(?<value>[^,;\n]+)$`, 'iu')
  const value = pattern.exec(description)?.groups?.value?.trim()
  return value !== undefined && /\s/u.test(value)
}
/** Redacts common sensitive markers before untrusted descriptions cross the JEV service boundary. */
/** @param {string} description @returns {string | null} */
export function redactJevDescription(description) {
  if (/\bbearer\s*[:=]?\s*\S+/iu.test(description)) return null
  if (hasAmbiguousNaturalCredential(description)) return null
  const redacted = description
    .replace(/\b(?:cookie|set-cookie)\s*[:=]\s*(?:[A-Za-z][\w-]*\s*=\s*)?[^\s,;]+/giu, '[REDACTED]')
    .replace(new RegExp(String.raw`(?<![\w])${CREDENTIAL_MARKER}\s*(?::|=|\b(?:is|was|equals)\b|\s)\s*[^,;\n]+`, 'giu'), '[REDACTED]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu, '[REDACTED]')
    .replace(/\b(?:\+?\d[\d .()\-]{6,}\d)\b/g, '[REDACTED]')
    .replace(/\b\d{1,6}\s+[A-Za-zÀ-ỹ][A-Za-zÀ-ỹ .'-]{1,60},?\s*(?:district|quận|quan|phường|phuong|ward|huyện|huyen|city|thành phố|thanh pho)\s*\d*\b/giu, '[REDACTED]')
    .replace(/\b\d{1,6}\s+[\wÀ-ỹ .'-]{1,50}\b(?:street|st\.?|road|rd\.?|avenue|ave\.?|boulevard|blvd\.?|drive|dr\.?|lane|ln\.?|đường|duong|phố|pho)\b/giu, '[REDACTED]')
    .replace(/\b(?:id|code|account|acct|iban|routing|reference|ref|mã|ma)\s*[:#=]\s*[\w-]{5,}\b/giu, '[REDACTED]')
    .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/giu, '[REDACTED]')
    .trim()

  if (redacted.length === 0
    || redacted.length > MAX_DESCRIPTION_LENGTH
    || SENSITIVE_PATTERN.test(redacted)) return null
  return redacted
}
