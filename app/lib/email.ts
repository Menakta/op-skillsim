/**
 * Email Service using Resend
 *
 * Handles all transactional emails:
 * - Email confirmation for new registrations
 * - Admin notifications for new registrations
 * - User notifications for approval/rejection
 */

import { Resend } from 'resend'
import { SignJWT } from 'jose'
import { logger } from './logger'

// JWT secret for email confirmation tokens
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-min-32-chars'
)

// =============================================================================
// Configuration
// =============================================================================

const resend = new Resend(process.env.RESEND_API_KEY)

// Use Resend's shared domain for development (onboarding@resend.dev)
// For production, set EMAIL_FROM to your verified domain (e.g., noreply@yourdomain.com)
const FROM_EMAIL = process.env.EMAIL_FROM || 'OP Skillsim <onboarding@resend.dev>'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@op-skillsim.com'
const APP_NAME = 'OP Skillsim'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://op-skillsim.com'

// =============================================================================
// Types
// =============================================================================

interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

interface UserInfo {
  email: string
  fullName: string | null
}

// =============================================================================
// Email Templates
// =============================================================================

function getApprovalEmailHtml(user: UserInfo): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #39BEAE 0%, #2EA89A 100%); padding: 10px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">${APP_NAME}</h1>
  </div>

  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
    <h2 style="color: #39BEAE; margin-top: 0;">Your Account Has Been Approved!</h2>

    <p>Hi ${user.fullName || 'there'},</p>

    <p>Great news! Your registration request for ${APP_NAME} has been approved. You can now sign in and start your training.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URL}/login" style="background: #39BEAE; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">Sign In Now</a>
    </div>

    <p>If you have any questions, please don't hesitate to contact us.</p>

    <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
      Best regards,<br>
      The ${APP_NAME} Team
    </p>
  </div>
</body>
</html>
`
}

function getRejectionEmailHtml(user: UserInfo): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #39BEAE 0%, #2EA89A 100%); padding: 10px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">${APP_NAME}</h1>
  </div>

  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
    <h2 style="color: #e74c3c; margin-top: 0;">Registration Request Update</h2>

    <p>Hi ${user.fullName || 'there'},</p>

    <p>We regret to inform you that your registration request for ${APP_NAME} has not been approved at this time.</p>

    <p>If you believe this was made in error or would like more information, please contact the administrator.</p>

    <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
      Best regards,<br>
      The ${APP_NAME} Team
    </p>
  </div>
</body>
</html>
`
}

function getAdminNotificationHtml(user: UserInfo, registrationTime: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #0D1D40 0%, #1a2d5a 100%); padding: 10px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">${APP_NAME} Admin</h1>
  </div>

  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
    <h2 style="color: #0D1D40; margin-top: 0;">New Registration Pending Approval</h2>

    <p>A new user has registered and is awaiting approval:</p>

    <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666; width: 120px;"><strong>Name:</strong></td>
          <td style="padding: 8px 0;">${user.fullName || 'Not provided'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;"><strong>Email:</strong></td>
          <td style="padding: 8px 0;">${user.email}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;"><strong>Registered:</strong></td>
          <td style="padding: 8px 0;">${registrationTime}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URL}/admin/users" style="background: #0D1D40; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">Review in Admin Panel</a>
    </div>

    <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
      This is an automated notification from ${APP_NAME}.
    </p>
  </div>
</body>
</html>
`
}

function getEmailConfirmationHtml(user: UserInfo, confirmationUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #39BEAE 0%, #2EA89A 100%); padding: 10px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">${APP_NAME}</h1>
  </div>

  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
    <h2 style="color: #39BEAE; margin-top: 0;">Confirm Your Email Address</h2>

    <p>Hi ${user.fullName || 'there'},</p>

    <p>Thank you for registering with ${APP_NAME}! To complete your registration and verify your email address, please click the button below:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${confirmationUrl}" style="background: #39BEAE; color: white; padding: 14px 35px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; font-size: 16px;">Confirm Email Address</a>
    </div>

    <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
    <p style="background: #e8e8e8; padding: 10px; border-radius: 5px; word-break: break-all; font-size: 12px; color: #555;">${confirmationUrl}</p>

    <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; color: #856404; font-size: 14px;">
        <strong>Note:</strong> This link will expire in 24 hours. If you didn't create an account with ${APP_NAME}, you can safely ignore this email.
      </p>
    </div>

    <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
      Best regards,<br>
      The ${APP_NAME} Team
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>This is an automated message from ${APP_NAME}. Please do not reply to this email.</p>
  </div>
</body>
</html>
`
}

// =============================================================================
// Email Functions
// =============================================================================

/**
 * Send approval notification email to user
 */
export async function sendApprovalEmail(user: UserInfo): Promise<EmailResult> {
  if (!process.env.RESEND_API_KEY) {
    logger.warn('RESEND_API_KEY not configured - skipping approval email')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: user.email,
      subject: `Your ${APP_NAME} Account Has Been Approved!`,
      html: getApprovalEmailHtml(user),
    })

    if (error) {
      logger.error({ error, email: user.email }, 'Failed to send approval email')
      return { success: false, error: error.message }
    }

    logger.info({ messageId: data?.id, email: user.email }, 'Approval email sent')
    return { success: true, messageId: data?.id }
  } catch (error) {
    logger.error({ error, email: user.email }, 'Error sending approval email')
    return { success: false, error: 'Failed to send email' }
  }
}

/**
 * Send rejection notification email to user
 */
export async function sendRejectionEmail(user: UserInfo): Promise<EmailResult> {
  if (!process.env.RESEND_API_KEY) {
    logger.warn('RESEND_API_KEY not configured - skipping rejection email')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: user.email,
      subject: `${APP_NAME} Registration Update`,
      html: getRejectionEmailHtml(user),
    })

    if (error) {
      logger.error({ error, email: user.email }, 'Failed to send rejection email')
      return { success: false, error: error.message }
    }

    logger.info({ messageId: data?.id, email: user.email }, 'Rejection email sent')
    return { success: true, messageId: data?.id }
  } catch (error) {
    logger.error({ error, email: user.email }, 'Error sending rejection email')
    return { success: false, error: 'Failed to send email' }
  }
}

/**
 * Send notification to admin about new registration
 */
export async function sendAdminNotificationEmail(user: UserInfo): Promise<EmailResult> {
  if (!process.env.RESEND_API_KEY) {
    logger.warn('RESEND_API_KEY not configured - skipping admin notification email')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const registrationTime = new Date().toLocaleString('en-NZ', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Pacific/Auckland',
    })

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `[${APP_NAME}] New Registration Pending: ${user.email}`,
      html: getAdminNotificationHtml(user, registrationTime),
    })

    if (error) {
      logger.error({ error, userEmail: user.email }, 'Failed to send admin notification email')
      return { success: false, error: error.message }
    }

    logger.info({ messageId: data?.id, userEmail: user.email }, 'Admin notification email sent')
    return { success: true, messageId: data?.id }
  } catch (error) {
    logger.error({ error, userEmail: user.email }, 'Error sending admin notification email')
    return { success: false, error: 'Failed to send email' }
  }
}

/**
 * Generate a confirmation token for email verification
 * Token expires in 24 hours
 */
export async function generateConfirmationToken(userId: string, email: string): Promise<string> {
  const token = await new SignJWT({ userId, email, type: 'email_confirmation' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET)

  return token
}

/**
 * Send email confirmation to new user
 * Only sends if user's is_confirmed is false
 */
export async function sendEmailConfirmation(
  user: UserInfo & { userId: string }
): Promise<EmailResult> {
  if (!process.env.RESEND_API_KEY) {
    logger.warn('RESEND_API_KEY not configured - skipping confirmation email')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    // Generate confirmation token
    const token = await generateConfirmationToken(user.userId, user.email)

    // Build confirmation URL
    const confirmationUrl = `${APP_URL}/api/auth/confirm-email?token=${encodeURIComponent(token)}`

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: user.email,
      subject: `Confirm your ${APP_NAME} email address`,
      html: getEmailConfirmationHtml(user, confirmationUrl),
    })

    if (error) {
      logger.error({ error, email: user.email }, 'Failed to send confirmation email')
      return { success: false, error: error.message }
    }

    logger.info({ messageId: data?.id, email: user.email }, 'Confirmation email sent')
    return { success: true, messageId: data?.id }
  } catch (error) {
    logger.error({ error, email: user.email }, 'Error sending confirmation email')
    return { success: false, error: 'Failed to send email' }
  }
}
