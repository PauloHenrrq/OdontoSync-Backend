// ============================================================
// OdontoSync — Mail Utility
// Configuração do transporter com envio via API HTTP Brevo e Fallback Ethereal
// ============================================================

import nodemailer from 'nodemailer';

interface SendMailParams {
  to: string;
  subject: string;
  html: string;
}

let etherealTransporter: nodemailer.Transporter | null = null;

async function getEtherealTransporter() {
  if (etherealTransporter) return etherealTransporter;

  try {
    const testAccount = await nodemailer.createTestAccount();
    etherealTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  } catch (error) {
    etherealTransporter = nodemailer.createTransport({
      jsonTransport: true
    });
  }

  return etherealTransporter;
}

export async function sendMail({ to, subject, html }: SendMailParams) {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || 'OdontoSync <noreply@odontosync.com.br>';

  // Extrair nome e e-mail do formato "Nome <email@dominio.com>"
  const fromNameMatch = from.match(/^([^<]+)/);
  const fromEmailMatch = from.match(/<([^>]+)>/);
  const fromName = fromNameMatch ? fromNameMatch[1].trim() : 'OdontoSync';
  const fromEmail = fromEmailMatch ? fromEmailMatch[1].trim() : 'noreply@odontosync.com.br';

  // Se a senha for uma chave de API Brevo (começa com xsmtpsib- ou xkeysib-), envia via HTTP API
  const isBrevoApi = pass && (pass.startsWith('xsmtpsib-') || pass.startsWith('xkeysib-') || pass.startsWith('api-'));

  if (isBrevoApi) {
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': pass,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: fromName,
            email: fromEmail,
          },
          to: [
            {
              email: to,
            },
          ],
          subject,
          htmlContent: html,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`A API da Brevo retornou erro ${response.status}: ${errText}`);
      }

      const data = await response.json() as { messageId: string };
      return data;
    } catch (error) {
      // Falha na API Brevo — tenta fallback abaixo
    }
  }

  // Fallback SMTP Clássico (se configurado com outro serviço e não for Brevo)
  if (host && port && user && pass && !isBrevoApi) {
    const classicTransporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465,
      auth: {
        user,
        pass,
      },
    });

    const info = await classicTransporter.sendMail({
      from,
      to,
      subject,
      html,
    });
    return info;
  }

  // Fallback Sandbox Ethereal
  const ethereal = await getEtherealTransporter();
  const info = await ethereal.sendMail({
    from,
    to,
    subject,
    html,
  });

  return info;
}
