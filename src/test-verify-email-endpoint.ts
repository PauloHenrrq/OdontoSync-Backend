import http from 'http';

async function testEndpoint() {
  console.log('=== TESTANDO ENDPOINT VERIFY-EMAIL DO BACKEND LIVE ===');
  console.log('Enviando requisição POST para http://localhost:3333/api/auth/verify-email...');

  const data = JSON.stringify({
    email: 'paulofera159@gmail.com'
  });

  const options = {
    hostname: 'localhost',
    port: 3333,
    path: '/api/auth/verify-email',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      console.log('\n--- RESPOSTA DO SERVIDOR ---');
      console.log(`Status Code: ${res.statusCode}`);
      console.log(`Body: ${body}`);
      console.log('----------------------------\n');
      
      if (res.statusCode === 200) {
        console.log('✅ O endpoint retornou 200 OK com sucesso!');
        console.log('Se o e-mail não chegou na sua caixa principal, cheque a pasta de SPAM/Lixo Eletrônico ou Promoções!');
      } else {
        console.error('❌ O endpoint retornou um status de erro!');
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ ERRO AO CONECTAR NA API DO BACKEND:', error.message);
    console.log('Certifique-se de que o backend está rodando na porta 3333!');
  });

  req.write(data);
  req.end();
}

testEndpoint();
