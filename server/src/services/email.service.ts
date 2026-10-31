import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const transporter =
  env.GMAIL_USER && env.GMAIL_APP_PASSWORD
    ? nodemailer.createTransport({
        service: 'gmail',
        auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD },
      })
    : null;

/**
 * Manda el correo de recuperación de contraseña. Nunca lanza: si falla (o no
 * hay credenciales de Gmail configuradas) solo loguea — forgot-password
 * siempre responde "ok" igual, para no revelar si el correo existe.
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  if (!transporter) {
    console.warn('[email] GMAIL_USER/GMAIL_APP_PASSWORD no configurados — no se mandó el correo de recuperación');
    return;
  }

  try {
    await transporter.sendMail({
      from: `Life OS <${env.GMAIL_USER}>`,
      to,
      subject: 'Recupera tu contraseña de Life OS',
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <h1 style="color: #37e779; font-size: 22px; margin: 0 0 16px;">Life OS</h1>
          <p style="color: #111827; font-size: 15px; line-height: 1.5;">
            Pediste restablecer tu contraseña. Toca el botón para elegir una nueva — este link vence en 30 minutos.
          </p>
          <p style="margin: 28px 0;">
            <a href="${resetUrl}" style="background: #37e779; color: #0b0b0b; font-weight: 700; padding: 12px 24px; border-radius: 10px; text-decoration: none; display: inline-block;">
              Elegir nueva contraseña
            </a>
          </p>
          <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">
            Si no fuiste tú, ignora este correo — tu contraseña sigue igual.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error('[email] Falló el envío del correo de recuperación:', err);
  }
}
