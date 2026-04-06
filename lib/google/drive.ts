import { google } from 'googleapis'
import type { OAuth2Client } from 'google-auth-library'

interface DriveDoc {
  id: string
  title: string
  mimeType: string
  content: string
  url: string
  modifiedTime: string
}

/**
 * Search Google Drive for documents related to a meeting title.
 * Looks for Google Docs, Sheets, and PDFs whose name matches keywords
 * from the meeting title.
 */
export async function searchMeetingDocs(
  auth: OAuth2Client,
  meetingTitle: string,
  maxResults = 5,
): Promise<DriveDoc[]> {
  const drive = google.drive({ version: 'v3', auth })

  // Extract meaningful keywords (skip short/common words)
  const stopWords = new Set(['the', 'and', 'for', 'with', 'sync', 'meeting', 'call', 'weekly', 'daily', 'standup', 'check-in'])
  const keywords = meetingTitle
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w.toLowerCase()))

  if (keywords.length === 0) return []

  // Build Drive search query: name contains any keyword, is a doc-type file
  const nameQuery = keywords.map((k) => `name contains '${k}'`).join(' or ')
  const mimeQuery = [
    "mimeType = 'application/vnd.google-apps.document'",
    "mimeType = 'application/vnd.google-apps.spreadsheet'",
    "mimeType = 'application/pdf'",
  ].join(' or ')

  const query = `(${nameQuery}) and (${mimeQuery}) and trashed = false`

  const { data } = await drive.files.list({
    q: query,
    pageSize: maxResults,
    fields: 'files(id, name, mimeType, webViewLink, modifiedTime)',
    orderBy: 'modifiedTime desc',
  })

  if (!data.files?.length) return []

  // Fetch content for each doc
  const docs: DriveDoc[] = []
  for (const file of data.files) {
    const content = await exportFileContent(drive, file.id!, file.mimeType!)
    if (content) {
      docs.push({
        id: file.id!,
        title: file.name!,
        mimeType: file.mimeType!,
        content: content.slice(0, 8000), // Cap content length
        url: file.webViewLink || '',
        modifiedTime: file.modifiedTime || '',
      })
    }
  }

  return docs
}

/**
 * Fetch a single Drive file's content by ID.
 * Used to pull content from calendar event attachments.
 */
export async function fetchFileContent(
  auth: OAuth2Client,
  fileId: string,
  mimeType: string,
): Promise<{ title: string; content: string } | null> {
  const drive = google.drive({ version: 'v3', auth })

  try {
    // Get file metadata
    const { data: file } = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType',
    })

    const content = await exportFileContent(drive, fileId, file.mimeType || mimeType)
    if (!content) return null

    return {
      title: file.name || 'Untitled',
      content: content.slice(0, 8000),
    }
  } catch {
    return null
  }
}

/**
 * Export a Google Workspace file as plain text.
 */
async function exportFileContent(
  drive: ReturnType<typeof google.drive>,
  fileId: string,
  mimeType: string,
): Promise<string | null> {
  try {
    if (mimeType === 'application/vnd.google-apps.document') {
      const { data } = await drive.files.export({
        fileId,
        mimeType: 'text/plain',
      })
      return typeof data === 'string' ? data : String(data)
    }

    if (mimeType === 'application/vnd.google-apps.spreadsheet') {
      const { data } = await drive.files.export({
        fileId,
        mimeType: 'text/csv',
      })
      return typeof data === 'string' ? data : String(data)
    }

    // For PDFs and other binary files, skip content extraction
    return null
  } catch {
    return null
  }
}
