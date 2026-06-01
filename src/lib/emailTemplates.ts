// ============================================================
// OdontoSync — Email Templates
// Modelos de e-mail estilizados em HTML de Alta Fidelidade
// ============================================================

export function getForgotPasswordTemplate(name: string, code: string): string {
  const currentYear = new Date().getFullYear();
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperação de Senha — OdontoSync</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background-color: #F9FAFB;
      color: #1F2937;
    }
    .wrapper {
      width: 100%;
      background-color: #F9FAFB;
      padding: 40px 0;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
      border: 1px solid #E5E7EB;
    }
    .header {
      background-color: #0D9488;
      padding: 32px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      color: #FFFFFF;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 8px 0 0 0;
      color: #CCFBF1;
      font-size: 14px;
      font-style: italic;
    }
    .content {
      padding: 40px 32px;
    }
    .content h2 {
      margin-top: 0;
      font-size: 20px;
      font-weight: 600;
      color: #111827;
    }
    .content p {
      font-size: 16px;
      line-height: 24px;
      color: #4B5563;
      margin-bottom: 24px;
    }
    .otp-container {
      background-color: #F0FDF4;
      border: 2px dashed #86EFAC;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      margin: 32px 0;
    }
    .otp-code {
      font-size: 36px;
      font-weight: 800;
      letter-spacing: 6px;
      color: #166534;
      margin: 0;
      padding-left: 6px; /* Balanceia a margem de letra */
    }
    .otp-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #15803D;
      font-weight: 700;
      margin-top: 8px;
    }
    .footer {
      background-color: #F3F4F6;
      padding: 24px 32px;
      text-align: center;
      border-top: 1px solid #E5E7EB;
    }
    .footer p {
      margin: 0 0 8px 0;
      font-size: 12px;
      color: #9CA3AF;
      line-height: 18px;
    }
    .footer a {
      color: #0D9488;
      text-decoration: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>OdontoSync</h1>
        <p>Sempre cuidando do seu sorriso</p>
      </div>
      <div class="content">
        <h2>Olá, ${name}!</h2>
        <p>Recebemos uma solicitação para redefinir a senha da sua conta no aplicativo da clínica OdontoSync. Use o código de verificação abaixo para prosseguir com a redefinição de sua senha segura:</p>
        
        <div class="otp-container">
          <h3 class="otp-code">${code}</h3>
          <div class="otp-label">Código de Segurança OTP</div>
        </div>
        
        <p>Este código é válido por <strong>10 minutos</strong>. Se você não realizou esta solicitação, por favor ignore este e-mail. Nenhuma ação adicional é necessária e sua senha continuará a mesma.</p>
      </div>
      <div class="footer">
        <p>Este é um e-mail automático enviado pelo sistema de segurança da clínica OdontoSync.</p>
        <p>&copy; ${currentYear} OdontoSync. Todos os direitos reservados.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}
