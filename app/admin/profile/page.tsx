'use client'

/**
 * Profile Page
 *
 * Displays current user profile information for admin/teacher users.
 * Shows session details, role, and account information.
 * For LTI/outsider users, shows previous login sessions.
 */

import { User, Mail, Shield, Clock, Calendar, ArrowLeft, ExternalLink, History, Monitor, Globe } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '../components/layout'
import { Card, CardContent, CardHeader, CardTitle, Badge, LoadingState } from '../components'
import { useCurrentUser, useUserSessions } from '../hooks'
import type { UserLoginSession } from '../hooks/useAdminQueries'

// =============================================================================
// Helper Functions
// =============================================================================

function formatDate(timestamp: number | null): string {
  if (!timestamp) return 'Never'
  return new Date(timestamp).toLocaleString()
}

function formatDateString(dateString: string): string {
  return new Date(dateString).toLocaleString()
}

function getRoleBadgeVariant(role: string): 'success' | 'info' | 'purple' {
  switch (role) {
    case 'admin':
      return 'purple'
    case 'teacher':
      return 'info'
    default:
      return 'success'
  }
}

function getSessionTypeBadgeVariant(type: string): 'success' | 'info' | 'warning' {
  switch (type) {
    case 'lti':
      return 'success'
    case 'admin':
      return 'purple' as 'warning'
    default:
      return 'info'
  }
}

function getStatusBadgeVariant(status: string): 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'active':
      return 'success'
    case 'expired':
      return 'danger'
    default:
      return 'warning'
  }
}

function parseUserAgent(userAgent: string | null): string {
  if (!userAgent) return 'Unknown'

  // Simple browser detection
  if (userAgent.includes('Chrome')) return 'Chrome'
  if (userAgent.includes('Firefox')) return 'Firefox'
  if (userAgent.includes('Safari')) return 'Safari'
  if (userAgent.includes('Edge')) return 'Edge'
  return 'Browser'
}

// =============================================================================
// Profile Info Row Component
// =============================================================================

interface ProfileRowProps {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}

function ProfileRow({ icon, label, value }: ProfileRowProps) {
  return (
    <div className="flex items-start gap-4 py-3 border-b theme-border last:border-b-0">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg theme-bg-secondary flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm theme-text-muted">{label}</p>
        <div className="font-medium theme-text-primary">{value}</div>
      </div>
    </div>
  )
}

// =============================================================================
// Session History Card Component
// =============================================================================

interface SessionHistoryCardProps {
  session: UserLoginSession
  isCurrent: boolean
}

function SessionHistoryCard({ session, isCurrent }: SessionHistoryCardProps) {
  return (
    <div className={`p-4 rounded-lg border ${isCurrent ? 'theme-border-brand theme-bg-brand/5' : 'theme-border theme-bg-secondary'}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={getStatusBadgeVariant(session.status)}>
            {session.status}
          </Badge>
          <Badge variant={getSessionTypeBadgeVariant(session.sessionType)}>
            {session.sessionType.toUpperCase()}
          </Badge>
          {isCurrent && (
            <Badge variant="info">Current</Badge>
          )}
        </div>
        <span className="text-xs theme-text-muted whitespace-nowrap">
          {session.loginCount} login{session.loginCount !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-1 text-sm">
        <div className="flex items-center gap-2 theme-text-muted">
          <Calendar className="w-4 h-4" />
          <span>Started: {formatDateString(session.createdAt)}</span>
        </div>
        <div className="flex items-center gap-2 theme-text-muted">
          <Clock className="w-4 h-4" />
          <span>Last active: {formatDateString(session.lastActivity)}</span>
        </div>
        {session.ipAddress && (
          <div className="flex items-center gap-2 theme-text-muted">
            <Globe className="w-4 h-4" />
            <span>{session.ipAddress}</span>
          </div>
        )}
        {session.userAgent && (
          <div className="flex items-center gap-2 theme-text-muted">
            <Monitor className="w-4 h-4" />
            <span>{parseUserAgent(session.userAgent)}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export default function ProfilePage() {
  const router = useRouter()
  const { user, isLoading } = useCurrentUser()
  console.log(user)

  // Fetch previous sessions for LTI/outsider users
  const showSessionHistory = user?.isLti || user?.sessionType === 'lti'
  const { data: sessions, isLoading: sessionsLoading } = useUserSessions(
    showSessionHistory ? user?.email : undefined
  )

  if (isLoading) {
    return (
      <DashboardLayout title="Profile" subtitle="Loading user information...">
        <Card>
          <CardContent>
            <LoadingState message="Loading profile..." />
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }

  if (!user) {
    return (
      <DashboardLayout title="Profile" subtitle="User information">
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center">
              <User className="w-12 h-12 theme-text-muted mb-4" />
              <h3 className="text-lg font-medium theme-text-primary mb-2">Not Signed In</h3>
              <p className="theme-text-muted text-center mb-4">
                You need to be signed in to view your profile.
              </p>
              <button
                onClick={() => router.push('/admin')}
                className="px-4 py-2 rounded-lg theme-btn-primary"
              >
                Go to Dashboard
              </button>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Profile" subtitle="Your account information">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 mb-4 theme-text-muted hover:theme-text-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* User Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Avatar Section */}
            <div className="flex items-center gap-4 mb-6 pb-6 border-b theme-border">
              <div className="w-16 h-16 rounded-full theme-bg-brand flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold theme-text-primary">
                  {user.fullName || 'User'}
                </h2>
                <p className="theme-text-muted">{user.email}</p>
              </div>
            </div>

            {/* Profile Details */}
            <ProfileRow
              icon={<Mail className="w-5 h-5 theme-text-brand" />}
              label="Email Address"
              value={user.email || 'Not provided'}
            />
            <ProfileRow
              icon={<Shield className="w-5 h-5 theme-text-brand" />}
              label="Role"
              value={
                <Badge variant={getRoleBadgeVariant(user.role)}>
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </Badge>
              }
            />
            <ProfileRow
              icon={<User className="w-5 h-5 theme-text-brand" />}
              label="User ID"
              value={<span className="font-mono text-sm">{user.userId || 'N/A'}</span>}
            />
          </CardContent>
        </Card>

        {/* Session Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Current Session</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileRow
              icon={<Shield className="w-5 h-5 theme-text-brand" />}
              label="Session Type"
              value={
                <div className="flex items-center gap-2">
                  <Badge variant={getSessionTypeBadgeVariant(user.sessionType)}>
                    {user.sessionType.toUpperCase()}
                  </Badge>
                  {user.isLti && (
                    <Badge variant="success">LTI Authenticated</Badge>
                  )}
                </div>
              }
            />
            <ProfileRow
              icon={<Calendar className="w-5 h-5 theme-text-brand" />}
              label="Session ID"
              value={
                <span className="font-mono text-sm break-all">
                  {user.sessionId || 'N/A'}
                </span>
              }
            />
            <ProfileRow
              icon={<Clock className="w-5 h-5 theme-text-brand" />}
              label="Session Expires"
              value={formatDate(user.expiresAt)}
            />
            {user.returnUrl && (
              <ProfileRow
                icon={<ExternalLink className="w-5 h-5 theme-text-brand" />}
                label="Return URL"
                value={
                  <a
                    href={user.returnUrl}
                    className="text-sm theme-text-brand hover:underline break-all"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {user.returnUrl}
                  </a>
                }
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Session History - Only for LTI/outsider users */}
      {showSessionHistory && (
        <Card className="mt-4">
          <CardHeader>
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 theme-text-brand" />
              <CardTitle>Session History</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {sessionsLoading ? (
              <LoadingState message="Loading session history..." />
            ) : sessions && sessions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {sessions.map((session) => (
                  <SessionHistoryCard
                    key={session.id}
                    session={session}
                    isCurrent={session.sessionId === user.sessionId}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <History className="w-8 h-8 theme-text-muted mx-auto mb-2" />
                <p className="theme-text-muted">No previous sessions found</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  )
}
