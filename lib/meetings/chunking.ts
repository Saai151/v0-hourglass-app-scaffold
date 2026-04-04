const DEFAULT_CHUNK_SIZE = 1400

function normalizeWhitespace(value: string) {
  return value.replace(/\r\n/g, '\n').replace(/\t/g, ' ').replace(/[ ]{2,}/g, ' ').trim()
}

function splitLongParagraph(paragraph: string, maxLength: number) {
  const parts: string[] = []
  let remaining = paragraph.trim()

  while (remaining.length > maxLength) {
    let cutIndex = remaining.lastIndexOf(' ', maxLength)
    if (cutIndex < Math.floor(maxLength * 0.6)) {
      cutIndex = maxLength
    }

    parts.push(remaining.slice(0, cutIndex).trim())
    remaining = remaining.slice(cutIndex).trim()
  }

  if (remaining.length > 0) {
    parts.push(remaining)
  }

  return parts
}

export function chunkMeetingContent(content: string, maxLength = DEFAULT_CHUNK_SIZE) {
  const normalized = normalizeWhitespace(content)
  if (!normalized) return []

  const paragraphs = normalized
    .split(/\n{2,}/)
    .flatMap((paragraph) => splitLongParagraph(paragraph, maxLength))

  const chunks: string[] = []
  let current = ''

  for (const paragraph of paragraphs) {
    if (!current) {
      current = paragraph
      continue
    }

    const candidate = `${current}\n\n${paragraph}`
    if (candidate.length <= maxLength) {
      current = candidate
      continue
    }

    chunks.push(current)
    current = paragraph
  }

  if (current) {
    chunks.push(current)
  }

  return chunks
}

export function toSearchText(parts: Array<string | null | undefined>) {
  return parts
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function excerptText(content: string, maxLength = 220) {
  const normalized = content.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) {
    return normalized
  }

  return `${normalized.slice(0, maxLength - 1).trim()}...`
}

const STOPWORDS = new Set([
  'about',
  'after',
  'again',
  'also',
  'been',
  'before',
  'being',
  'between',
  'could',
  'from',
  'have',
  'into',
  'just',
  'more',
  'than',
  'that',
  'them',
  'then',
  'there',
  'these',
  'they',
  'this',
  'what',
  'when',
  'where',
  'which',
  'while',
  'with',
  'would',
  'your',
])

export function extractSearchTerms(input: string) {
  return Array.from(
    new Set(
      input
        .toLowerCase()
        .match(/[a-z0-9]+/g)
        ?.filter((token) => token.length > 2 && !STOPWORDS.has(token)) ?? []
    )
  )
}

export function keywordScore(text: string, terms: string[]) {
  if (terms.length === 0) return 0

  const haystack = text.toLowerCase()
  return terms.reduce((score, term) => {
    if (!haystack.includes(term)) return score
    return score + Math.min(3, haystack.split(term).length - 1)
  }, 0)
}
