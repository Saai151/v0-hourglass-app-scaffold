/**
 * Hourglass Type Definitions
 * 
 * This file contains all TypeScript interfaces and types for the Hourglass app.
 * These types mirror the database schema and are used throughout the application.
 */

// ==========================================
// ENUMS
// ==========================================

export type ProviderType = 'gmail' | 'google_calendar' | 'slack' | 'whatsapp'

export type ConnectionStatus = 'connected' | 'disconnected' | 'error' | 'pending'

export type AuditVerdict = 'keep' | 'shorten' | 'asyncify' | 'delegate' | 'cancel' | 'needs_context'

export type AuditStatus = 'pending' | 'approved' | 'rejected' | 'executed' | 'expired'

export type ApprovalChannel = 'web' | 'whatsapp' | 'slack'

export type ExecutionStatus = 'pending' | 'success' | 'failed'

export type DeliveryChannel = 'web' | 'whatsapp'

export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'responded'

export type MeetingDocumentType = 'transcript' | 'notes'

export type MeetingChatRole = 'system' | 'user' | 'assistant'

export type MeetingChatScope = 'single_meeting' | 'cross_meeting'

// ==========================================
// DATABASE MODELS
// ==========================================

export interface Profile {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  whatsapp_number: string | null
  timezone: string
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export interface UserPreferences {
  id: string
  user_id: string
  never_touch_external_meetings: boolean
  never_touch_investor_meetings: boolean
  only_suggest_never_execute: boolean
  quiet_hours_start: string | null
  quiet_hours_end: string | null
  created_at: string
  updated_at: string
}

export interface ConnectedAccount {
  id: string
  user_id: string
  provider: ProviderType
  account_email: string | null
  external_user_id: string | null
  status: ConnectionStatus
  access_token: string | null
  refresh_token: string | null
  token_expires_at: string | null
  scopes: string[]
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Attendee {
  email: string
  name?: string
  response_status?: 'accepted' | 'declined' | 'tentative' | 'needsAction'
  optional?: boolean
}

export interface CalendarEvent {
  id: string
  user_id: string
  provider_event_id: string
  title: string
  description: string | null
  organizer_email: string | null
  attendees: Attendee[]
  start_time: string
  end_time: string
  meeting_url: string | null
  is_external: boolean
  raw_payload: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface MeetingContext {
  id: string
  user_id: string
  calendar_event_id: string
  email_summary: string | null
  slack_summary: string | null
  agenda_detected: boolean
  decision_owner: string | null
  context_json: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface MeetingDocument {
  id: string
  user_id: string
  calendar_event_id: string
  title: string
  document_type: MeetingDocumentType
  content: string
  source_metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface MeetingChunk {
  id: string
  user_id: string
  calendar_event_id: string
  meeting_document_id: string
  chunk_index: number
  content: string
  search_text: string
  source_label: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface MeetingSummary {
  id: string
  user_id: string
  calendar_event_id: string
  summary: string
  decisions: string[]
  action_items: string[]
  open_questions: string[]
  participants: string[]
  source_document_ids: string[]
  search_text: string
  created_at: string
  updated_at: string
}

export interface MeetingChatThread {
  id: string
  user_id: string
  title: string
  scope: MeetingChatScope
  calendar_event_id: string | null
  created_at: string
  updated_at: string
}

export interface MeetingChatMessage {
  id: string
  thread_id: string
  user_id: string
  role: MeetingChatRole
  content: string
  citations: MeetingCitation[]
  retrieval_context: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface MeetingCitation {
  type: 'summary' | 'chunk'
  meeting_id: string
  meeting_title: string
  document_id?: string
  document_title?: string
  excerpt: string
}

export interface ProposedAction {
  type: 'shorten' | 'cancel' | 'delegate' | 'convert_async' | 'send_email' | 'send_slack' | 'create_focus_block'
  description: string
  params?: Record<string, unknown>
}

export interface MeetingAudit {
  id: string
  user_id: string
  calendar_event_id: string
  verdict: AuditVerdict
  confidence: number | null
  rationale: string | null
  risks: string[]
  approval_message: string | null
  draft_email: string | null
  draft_slack_message: string | null
  draft_whatsapp_message: string | null
  proposed_actions: ProposedAction[]
  status: AuditStatus
  approved_via: ApprovalChannel | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

export interface Execution {
  id: string
  meeting_audit_id: string
  action_type: string
  status: ExecutionStatus
  provider_response: Record<string, unknown>
  error_message: string | null
  executed_at: string | null
  created_at: string
  updated_at: string
}

export interface ApprovalRequest {
  id: string
  user_id: string
  meeting_audit_id: string
  channel: DeliveryChannel
  message_body: string
  delivery_status: DeliveryStatus
  response_text: string | null
  created_at: string
  updated_at: string
}

// ==========================================
// JOINED / ENRICHED TYPES
// ==========================================

export interface MeetingAuditWithEvent extends MeetingAudit {
  calendar_event: CalendarEvent
  meeting_context?: MeetingContext
}

export interface CalendarEventWithAudit extends CalendarEvent {
  latest_audit?: MeetingAudit
  meeting_context?: MeetingContext
}

export interface MeetingDocumentWithEvent extends MeetingDocument {
  calendar_event: CalendarEvent
}

export interface MeetingSummaryWithEvent extends MeetingSummary {
  calendar_event: CalendarEvent
}

export interface MeetingChatMessageWithThread extends MeetingChatMessage {
  thread: MeetingChatThread
}

export interface MeetingChatThreadWithMessages extends MeetingChatThread {
  calendar_event?: CalendarEvent | null
  messages: MeetingChatMessage[]
}

// ==========================================
// API REQUEST/RESPONSE TYPES
// ==========================================

export interface OnboardingData {
  full_name: string
  email: string
  phone: string
  whatsapp_number: string
  timezone: string
  never_touch_external_meetings: boolean
  never_touch_investor_meetings: boolean
  only_suggest_never_execute: boolean
  quiet_hours_start: string | null
  quiet_hours_end: string | null
}

export interface IntegrationConnectRequest {
  provider: ProviderType
  redirect_uri: string
}

export interface IntegrationConnectResponse {
  auth_url: string
}

export interface IntegrationCallbackRequest {
  code: string
  state?: string
}

export interface AuditRunRequest {
  event_ids?: string[]
  force_reaudit?: boolean
}

export interface AuditRunResponse {
  audits_created: number
  audits: MeetingAudit[]
}

export interface MeetingDocumentUpsertRequest {
  title?: string
  document_type: MeetingDocumentType
  content: string
  source_metadata?: Record<string, unknown>
}

export interface MeetingDocumentUpsertResponse {
  document: MeetingDocument
  summary: MeetingSummary
  chunk_count: number
}

export interface MeetingChatRequest {
  message: string
  thread_id?: string
  meeting_id?: string
}

export interface MeetingChatResponse {
  thread: MeetingChatThread
  message: MeetingChatMessage
}

export interface ApprovalResponse {
  action: 'approve' | 'reject'
  audit_id: string
  channel: ApprovalChannel
}

export interface WhatsAppWebhookPayload {
  from: string
  body: string
  message_id: string
  timestamp: string
}

// ==========================================
// UI STATE TYPES
// ==========================================

export type InboxFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'executed'

export interface IntegrationCardConfig {
  provider: ProviderType
  name: string
  description: string
  icon: string
  scopes: string[]
}
