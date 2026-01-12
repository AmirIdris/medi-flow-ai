/**
 * Email service for sending verification and password reset emails
 * 
 * Note: This is a basic implementation. In production, you should use
 * a proper email service like SendGrid, Resend, or AWS SES.
 */

const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const EMAIL_FROM = process.env.EMAIL_FROM || "noreply@mediaflow.ai";

/**
 * Send email verification email
 * In production, integrate with an email service provider
 */
export async function sendVerificationEmail(
  email: string,
  token: string
): Promise<void> {
  const verificationUrl = `${APP_URL}/api/auth/verify-email?token=${token}`;
  
  // TODO: Integrate with email service provider
  // For now, log the verification URL (in production, send actual email)
  console.log(`Verification email for ${email}: ${verificationUrl}`);
  
  // Example with a service like Resend:
  // await resend.emails.send({
  //   from: EMAIL_FROM,
  //   to: email,
  //   subject: "Verify your email address",
  //   html: `<p>Click <a href="${verificationUrl}">here</a> to verify your email.</p>`,
  // });
}

/**
 * Send password reset email
 * In production, integrate with an email service provider
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<void> {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;
  
  // TODO: Integrate with email service provider
  // For now, log the reset URL (in production, send actual email)
  console.log(`Password reset email for ${email}: ${resetUrl}`);
  
  // Example with a service like Resend:
  // await resend.emails.send({
  //   from: EMAIL_FROM,
  //   to: email,
  //   subject: "Reset your password",
  //   html: `<p>Click <a href="${resetUrl}">here</a> to reset your password.</p>`,
  // });
}
