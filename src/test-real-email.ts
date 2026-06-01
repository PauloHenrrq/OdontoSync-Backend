import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar .env manualmente antes de importar o mail.ts para garantir as variáveis
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      process.env[key] = val;
    }
  });
}

// Importar o utilitário real
import { sendMail } from './lib/mail.js';

async function runTest() {
  console.log('=== TESTANDO ENVIO REAL VIA CLIENTE ODONTOSYNC ===');
  console.log(`Destinatário: paulofera159@gmail.com`);
  console.log('Disparando e-mail de teste...');

  try {
    const result = await sendMail({
      to: 'paulofera159@gmail.com',
      subject: 'Teste de Envio Real via HTTP API — OdontoSync',
      html: `
        <div style="font-family: sans-serif; padding: 25px; max-width: 600px; border: 2px solid #0D9488; border-radius: 8px;">
          <h2 style="color: #0D9488; margin-top: 0;">OdontoSync — Teste de Envio Concluído!</h2>
          <p>Olá Paulo,</p>
          <p>Este é um e-mail real enviado usando a <strong>API HTTP REST da Brevo</strong> via porta segura 443.</p>
          <p>A arquitetura agora está 100% blindada e resiliente a quaisquer firewalls, bloqueios de portas SMTP e certificados SSL!</p>
          <p style="margin-bottom: 0;">Atenciosamente,<br><strong>Equipe OdontoSync</strong></p>
        </div>
      `,
    });
    console.log('\n✅ EXECUÇÃO DO TESTE FINALIZADA COM SUCESSO!');
    console.log('Verifique sua caixa de entrada no e-mail paulofera159@gmail.com!');
  } catch (error) {
    console.error('❌ FALHA NO TESTE:', error);
  }
}

runTest();
