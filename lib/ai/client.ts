import { createGoogleGenerativeAI } from '@ai-sdk/google'

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
})

/**
 * Returns the default model for Hourglass audits.
 * Change the model ID here to swap models across the entire app.
 */
export const auditModel = google('gemini-2.5-flash-lite')

/** Model used by the meeting chat assistant. */
export const chatModel = google('gemini-2.5-flash')
