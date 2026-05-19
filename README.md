# 🦷 OdontoSync — API do Backend

Bem-vindo à API do backend independente do **OdontoSync**, um sistema moderno de gestão de clínicas odontológicas. Esta aplicação foi construída como uma API RESTful de alta performance utilizando Fastify, TypeScript e Prisma ORM, conectada a um banco de dados PostgreSQL hospedado em nuvem no Neon DB.

---

## 🛠️ Tecnologias Utilizadas

- **Runtime & Linguagem:** Node.js (TSX) & TypeScript (Modo Estrito / Strict Mode)
- **Framework Web:** [Fastify](https://fastify.dev/) (Framework web de alta performance e baixo overhead)
- **Banco de Dados & ORM:** PostgreSQL & [Prisma ORM](https://www.prisma.io/)
- **Segurança:** JSON Web Tokens (JWT) & Middleware CORS do Fastify
- **Ferramentas de Desenvolvimento:** TSX (TypeScript Execute) & Modo de Observação (watch mode)

---

## 📂 Estrutura de Diretórios

```text
Backend/
├── prisma/
│   ├── schema.prisma       # Modelos de dados e configurações do Prisma
│   └── migrations/         # Histórico de migrações SQL
├── src/
│   ├── lib/
│   │   └── prisma.ts       # Instância centralizada do Prisma Client
│   ├── modules/            # Módulos divididos por domínio de negócio
│   │   ├── appointments/   # Criação, listagem e atualização de status de consultas
│   │   ├── auth/           # Endpoints de autenticação e middlewares de RBAC
│   │   ├── clinic/         # Regras e configurações da clínica
│   │   └── patients/       # Contas de pacientes e busca de dados
│   ├── types/
│   │   └── fastify.d.ts    # Extensão de tipos do Fastify (Usuário logado via JWT)
│   ├── seed.ts             # Script completo de semeadura do banco com dados de teste
│   └── server.ts           # Inicialização do servidor, CORS, JWT e registro de rotas
├── .env.example            # Exemplo de configuração de variáveis de ambiente
├── .gitignore              # Arquivos e pastas locais ignorados pelo Git
├── package.json            # Scripts do NPM e lista de dependências
└── tsconfig.json           # Configurações estritas do TypeScript
```

---

## ⚙️ Instalação & Configuração

### 1. Pré-requisitos
Certifique-se de ter o [Node.js](https://nodejs.org/) (v18+) e o `npm` instalados em sua máquina.

### 2. Instalar Dependências
Navegue até o diretório do backend e execute:
```bash
npm install
```

### 3. Configurar Variáveis de Ambiente
Crie um arquivo `.env` na raiz do diretório `Backend/` duplicando o arquivo `.env.example`:
```bash
cp .env.example .env
```
Abra o arquivo `.env` criado e insira a string de conexão do seu Neon DB e a chave secreta do JWT:
```env
DATABASE_URL="postgresql://<usuario>:<senha>@<host-neon>/odontosync?sslmode=require"
JWT_SECRET="sua-chave-secreta-jwt-super-segura"
```

---

## 🚀 Comandos & Operações de Banco de Dados

### Servidor de Desenvolvimento
Inicie o servidor da API com recarga automática ao alterar arquivos:
```bash
npm run dev
```
A API estará rodando em `http://localhost:3333`.

### Sincronizar o Banco de Dados
Envie a estrutura do schema Prisma diretamente para o seu banco Neon DB:
```bash
npx prisma db push
```
Ou para gerar e rodar arquivos de migrações estruturadas:
```bash
npx prisma migrate dev --name <nome-da-migracao>
```

### Semear o Banco de Dados (Seed)
Popule o seu banco na nuvem com configurações da clínica, especialidades, contas administrativas, pacientes de teste e consultas estruturadas:
```bash
npx ts-node src/seed.ts
```

---

## 🔒 Segurança & Boas Práticas

1. **Controle de Acesso Baseado em Papéis (RBAC):** Rotas confidenciais e administrativas (como modificação da clínica e listagem completa de agendamentos) são estritamente protegidas pelo middleware `requireAdmin`.
2. **Proteção de Variáveis Locais:** O arquivo `.env` está configurado no `.gitignore` para impedir que senhas e chaves reais vazem no controle de versão.
3. **Exclusão Lógica (Soft Delete):** Conforme as regras da clínica, os dados não são deletados fisicamente do banco de dados, sendo controlados através da coluna `status` (Ex: `CANCELLED`, `ABSENT`).
