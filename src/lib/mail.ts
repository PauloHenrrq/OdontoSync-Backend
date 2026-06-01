// ============================================================
// OdontoSync — Mail Utility
// Configuração do transporter Nodemailer com Fallback Ethereal
// ============================================================

import nodemailer from 'nodemailer';

interface SendMailParams {
  to: string;
  subject: string;
  html: string;
}

let transporter: nodemailer.Transporter | null = null;
let isEthereal = false;

async function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && port && user && pass) {
    // Configuração SMTP real
    transporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465,
      auth: {
        user,
        pass,
      },
    });
    isEthereal = false;
    console.log(`\n--- [MAIL CONFIG] Transmissor SMTP Real configurado ---`);
  } else {
    // Fallback resiliente: Ethereal Mail para sandbox local
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      isEthereal = true;
      console.log(`\n--- [MAIL CONFIG] Usando conta de teste do Ethereal Mail ---`);
      console.log(`User: ${testAccount.user}`);
      console.log(`Pass: ${testAccount.pass}`);
      console.log(`-----------------------------------------------------------\n`);
    } catch (error) {
      console.error('Falha ao inicializar Ethereal Mail, usando transportador JSON:', error);
      // Fallback em caso de falha externa ao gerar conta: criamos um transporter json
      transporter = nodemailer.createTransport({
        jsonTransport: true
      });
    }
  }

  return transporter;
}

export async function sendMail({ to, subject, html }: SendMailParams) {
  const mailTransporter = await getTransporter();
  const from = process.env.SMTP_FROM || 'OdontoSync <noreply@odontosync.com.br>';

  const info = await mailTransporter.sendMail({
    from,
    to,
    subject,
    html,
  });

  if (isEthereal) {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`\n--- [E-MAIL ENVIADO (TESTE)] ---`);
    console.log(`Para: ${to}`);
    console.log(`Assunto: ${subject}`);
    console.log(`URL de Visualização Ethereal: ${previewUrl}`);
    console.log(`---------------------------------\n`);
  } else {
    console.log(`E-mail real enviado com sucesso para ${to}. MessageId: ${info.messageId}`);
  }

  return info;
}
