<div align="center">

<br/>

```
 █████╗ ████████╗██╗      █████╗ ███████╗
██╔══██╗╚══██╔══╝██║     ██╔══██╗██╔════╝
███████║   ██║   ██║     ███████║███████╗
██╔══██║   ██║   ██║     ██╔══██║╚════██║
██║  ██║   ██║   ███████╗██║  ██║███████║
╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚══════╝
```

### **All your Trusted Life Assets, Self-hosted**

*Ecossistema digital self-hosted. Focado em privacidade.*

---

## O que é o ATLAS?

ATLAS é um ecossistema digital **completamente self-hosted**, construído para quem valoriza **soberania e privacidade** sem abrir mão da praticidade. Rode no seu próprio servidor — seja uma VPS, um Raspberry Pi ou qualquer máquina de sua escolha — e tenha controle total sobre os seus dados.

> Não existe uma linha sequer de telemetria, rastreamento ou coleta de dados neste projeto. Tudo aqui é voltado para funcionalidade e privacidade. Zero. Nada.

ATLAS é ideal para **uso pessoal, familiar ou entre amigos** — para quem quer uma soberania digital mínima sem pagar caro por isso.

---

## Módulos

### 🗂️ Atlas Drive

Um gerenciador de arquivos minimalista, rodando inteiramente no seu servidor.

- **Armazenamento ilimitado** — o limite é o disco do seu próprio servidor
- **Upload inteligente por tamanho:**
  - Arquivos **≤ 8MB** → upload direto via *pipe stream* (requisição única)
  - Arquivos **> 8MB** → *multipart upload* gerenciado pelo servidor
- **Edição de arquivos `.txt`** direto no frontend, sem sair do drive
- **Criação de novos `.txt`** com conteúdo escrito antes do upload
- Minimalista, rápido, privado

---

### 🔐 Atlas Vault

Gerenciador de senhas com criptografia própria e sincronização com o servidor.

- Utiliza a estrutura do **PyVault** — um formato de arquivo `.pvt` com JSON interno especifico.
- **Criptografia: XChaCha20-Poly1305** — moderna, segura, resistente
- **Criptografia e descriptografia 100% client-side** — o servidor é "burro" e jamais vê seus segredos
- **Sync com o servidor** — seus vaults ficam salvos na sua conta, sem que você precise gerenciar o arquivo manualmente
- Ao editar um vault, você pode **baixar uma cópia local** no momento exato da edição
- **KDF customizável** — escolha os parâmetros de derivação de chave para sua criptografia
- Interface de vaults na barra lateral: duplo clique para abrir

**Campos disponíveis por segredo:**

| Campo | Descrição |
|---|---|
| `Título` | Nome identificador do segredo |
| `Usuário` | Nome de usuário |
| `Email` | Email vinculado |
| `Senha` | A senha em si |
| `Serviço` | Link ou nome do serviço |
| `Obs` | Campo de texto livre |

---

## Painel de Administração

O painel admin oferece controle total sobre o ecossistema.

### 👥 Gerenciar Usuários
Visualize, edite e remova usuários do sistema. É possível alterar senhas, emails e **hierarquia** (admin ou usuário comum).

### 📋 Pedidos de Criação Pendentes
Novos usuários só entram no sistema com uma **chave secreta** (definida no `.env`). Mesmo com a chave, a criação fica pendente até que um administrador aprove manualmente.

> Isso garante que seu ATLAS permaneça privado — apenas quem você autorizar entra.

### 📜 Audit Logs
Registro completo de eventos do sistema. Rastreie:

- `create_user` — tentativas e criações de usuários
- `update_user` — edições em contas
- `delete_user` — remoções
- `impersonate` — acessos via personificação de conta

---

## Segurança

```
┌─────────────────────────────────────────────────────────┐
│  ATLAS foi construído com segurança em mente desde o início │
└─────────────────────────────────────────────────────────┘
```

| Recurso | Detalhes |
|---|---|
| **Refresh Tokens** | Autenticação robusta com rotação de tokens |
| **Rate Limiting** | Janela de 30 min · 8 tentativas · ignora requisições bem-sucedidas |
| **Chave secreta de registro** | Apenas quem tem a chave pode *tentar* criar um usuário |
| **Aprovação manual** | Toda criação de conta passa por um admin (se não usada NoPedingKey (mais abaixo)|
| **Criptografia client-side** | O servidor nunca vê o conteúdo dos vaults nem a sua senha.|
| **Audit Logs** | Registro de todos os eventos críticos |
| **Login por email** | Aviso automático de novo login para o email cadastrado |
| **Secret Access (Impersonate)** | Acesso a qualquer conta via ID + chave secreta (use com responsabilidade) |

> ⚠️ **Guarde suas chaves secretas com atenção.** A chave de impersonate permite acesso a qualquer conta do sistema, incluindo admins.

---

## Notificações de Login

O backend envia um **email de aviso** a cada novo login realizado no sistema.

Para ativar esse recurso:
1. Crie um domínio gratuito no [MailerSend](https://www.mailersend.com/)
2. Adicione sua `API_KEY` no `.env`
3. Configure o domínio no seu Cloudflare (ou provedor de túnel preferido)

> Se o email for inválido ou a chave não estiver configurada, o sistema ignora silenciosamente — sem erros críticos.


## 🤖 Notificações via Telegram Bot

Além dos emails de login, o ATLAS suporta notificações em tempo real via **Telegram Bot** — direto na sua DM.

Configure um bot (gratuito e rápido de criar via [@BotFather](https://t.me/botfather)) e receba alertas instantâneos de todos os eventos críticos do sistema:

| Evento | Descrição |
|---|---|
| `create_user` | Novo usuário criado ou tentativa de criação |
| `update_user` | Dados de um usuário foram editados |
| `delete_user` | Um usuário foi removido do sistema |
| `impersonate` | Acesso via Secret Access (personificação de conta) |

Cada notificação chega com detalhes completos do evento — quem, quando e o quê.

### Configuração

```env
KIMI_BOT_TOKEN=   # Token do seu bot (gerado pelo @BotFather)
CHAT_ID_TELEGRAM_ADMIN=      # Seu Chat ID pessoal (você, dono do sistema)
```

> Deixar em branco desativa as notificações silenciosamente — sem erros.
> O bot do Telegram é **totalmente gratuito** para criar e usar, sem domínio nem configuração externa necessária.


---

## Como Rodar

### Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) instalado
- [Git](https://git-scm.com/) instalado
- Um servidor com **SSD recomendado** (especialmente se for usar com família/amigos)

### Passo a Passo

```bash
# 1. Clone o repositório no seu servidor
git clone https://github.com/seu-usuario/atlas.git
cd atlas

# 2. Configure suas variáveis de ambiente
cp .env.example .env
# Edite o .env com suas chaves secretas, API keys e configurações

# 3. Suba o ecossistema
docker compose up -d
```

### Expondo para a internet

O projeto já vem com configurações prontas para **NGINX + Cloudflare Tunnel**.

```bash
# Com cloudflared instalado e configurado:
cloudflared tunnel run atlas
```

> Você pode usar qualquer método de exposição que preferir — o Cloudflare Tunnel é apenas a abordagem padrão recomendada.

---

## Variáveis de Ambiente

```env
# Chave secreta para registro de novos usuários
MAGIC_WORD_CRIAR=

# Chave secreta para criar um usuário com permisão de admin
MAGIC_WORD_ROLE=

# Chave secreta de backdoor para todos os usuários (se quiser, deixar vazia)
CHAVE_IMPERSONATE=

# Chave secreta para criar um usuário DIRETO no sistema sem passar pela pendencia
CHAVE_NOPENDING= 

# MailerSend (opcional — para emails de aviso de login)
EMAILSENDER_API_KEY=

# Outras configurações do sistema
# (consulte o .env.example para a lista completa)
```

---

## Arquitetura

```
ATLAS/
├── frontend/          # Interface web (cliente)
├── backend/           # API (Express.js)
├── nginx              # Configurações de proxy reverso
├── docker-compose.yml # Orquestração dos serviços
└── .env.example       # Template de variáveis de ambiente
```

---

## Roadmap

O ATLAS é um projeto em evolução constante. Funcionalidades planejadas:

- [ ] 📄 Suporte a documentos (visualização e edição)
- [ ] 📧 Serviço de email próprio self-hosted
- [ ] 📦 Download de múltiplos arquivos no Drive
- [ ] E o que mais vier à mente...

---

## Para quem é o ATLAS?

Para quem quer **soberania digital mínima** sem pagar caro.

- ✅ Uso pessoal
- ✅ Uso familiar
- ✅ Uso entre amigos
- ✅ Quem não quer depender de Google Drive, iCloud, LastPass ou similares
- ✅ Quem quer saber exatamente onde seus dados estão

---

## Licença

Este projeto é open-source e distribuído sob a licença [MIT](LICENSE).

---

<div align="center">

*Feito com obsessão por privacidade e controle.*

**ATLAS — seus dados, seu servidor, suas regras.**

</div>
