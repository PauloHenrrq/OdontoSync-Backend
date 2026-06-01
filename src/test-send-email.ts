// ============================================================
// OdontoSync — Teste de Envio de E-mail Estilizado
// Roda o fluxo completo de renderização e gera o link visual
// ============================================================

import nodemailer from 'nodemailer';
import { getForgotPasswordTemplate } from './lib/emailTemplates.js';

async function runTest() {
  console.log('Inicializando servidor SMTP de teste (Ethereal)...');
  const testAccount = await nodemailer.createTestAccount();

  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  const name = 'Paulo';
  const code = '739412';
  const html = getForgotPasswordTemplate(name, code);

  console.log('Disparando e-mail para paulofera159@gmail.com...');
  const info = await transporter.sendMail({
    from: 'OdontoSync <noreply@odontosync.com.br>',
    to: 'paulofera159@gmail.com',
    subject: 'Recuperação de Senha — OdontoSync',
    html,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  console.log('\n================================================================');
  console.log('🎉 E-MAIL ESTILIZADO DE TESTE GERADO COM SUCESSO!');
  console.log('----------------------------------------------------------------');
  console.log(`Remetente : OdontoSync <noreply@odontosync.com.br>`);
  console.log(`Destinatário: paulofera159@gmail.com`);
  console.log(`Assunto     : Recuperação de Senha — OdontoSync`);
  console.log(`Código OTP  : ${code}`);
  console.log('----------------------------------------------------------------');
  console.log('👉 CLIQUE NO LINK ABAIXO PARA VER O LAYOUT E-MAIL NO NAVEGADOR:');
  console.log(`${previewUrl}`);
  console.log('================================================================\n');
}

runTest().catch((err) => {
  console.error('Erro ao rodar teste de e-mail:', err);
});
