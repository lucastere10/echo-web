# Echo

Aplicação web monolítica para transcrição de áudio com IA. Envie arquivos de áudio, transcreva com o Whisper da OpenAI e copie ou baixe o resultado em TXT ou Markdown.

## Stack

- [Bun](https://bun.sh) — runtime e gerenciador de pacotes
- [TanStack Start](https://tanstack.com/start) + [TanStack Router](https://tanstack.com/router)
- TypeScript
- Tailwind CSS v4
- OpenAI Whisper (API)
- Google OAuth (somente administrador)
- Armazenamento em JSON (`data/`), sem banco de dados

## Como funciona

### Administrador

- Entra com **Google OAuth** (apenas o e-mail definido em `ADMIN_EMAIL`)
- Acessa **Admin** para gerar links de convite
- Compartilha links no formato `{APP_URL}/invite/{token}`
- Também pode transcrever áudio normalmente

### Usuários convidados

- Abrem o link de convite e **ganham acesso imediatamente** — sem Google OAuth
- A sessão fica vinculada ao token do convite
- Podem enviar arquivos dentro dos limites definidos no convite

### Visitantes

- Na home, podem usar **Entrar com Google** (somente o admin consegue autenticar)
- No header, podem usar **Solicitar acesso** para enviar um e-mail de interesse ao administrador

## Desenvolvimento local

### Pré-requisitos

- [Bun](https://bun.sh) instalado

### Instalação

```bash
bun install
cp .env.example .env
```

Preencha o `.env`:

| Variável | Descrição |
|----------|-----------|
| `ADMIN_EMAIL` | E-mail Google do administrador |
| `GOOGLE_CLIENT_ID` | Client ID do Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Client Secret do Google Cloud Console |
| `OPENAI_API_KEY` | Chave da API OpenAI (somente servidor) |
| `SESSION_SECRET` | String longa e aleatória para criptografar sessões |
| `APP_URL` | URL pública da aplicação (ex.: `http://localhost:3000`) |

Variáveis opcionais (com defaults):

| Variável | Default | Descrição |
|----------|---------|-----------|
| `MAX_FILES_PER_UPLOAD` | `10` | Máximo de arquivos por envio |
| `INVITE_EXPIRATION_HOURS` | `24` | Validade do convite em horas |
| `MAX_FILE_SIZE_MB` | `25` | Tamanho máximo por arquivo |
| `MAX_CONCURRENT_JOBS` | `2` | Transcrições simultâneas no servidor |
| `RATE_LIMIT_PER_MINUTE` | `30` | Limite de requisições por IP/minuto |

### Google OAuth

No Google Cloud Console, configure a URI de redirect autorizada:

```
{APP_URL}/auth/callback
```

Exemplo local: `http://localhost:3000/auth/callback`

### Executar

```bash
bun run dev
```

A aplicação sobe em `http://localhost:3000`.

### Scripts

| Comando | Descrição |
|---------|-----------|
| `bun run dev` | Servidor de desenvolvimento |
| `bun run build` | Build de produção (saída em `.output/`) |
| `bun run preview` | Preview do build |
| `bun run test` | Testes |
| `bun run lint` | ESLint |
| `bun run format` | Prettier + ESLint fix |

## Formatos de áudio suportados

`mp3`, `wav`, `m4a`, `mp4`, `webm`, `ogg`

## Privacidade

Os arquivos de áudio ficam apenas em memória durante o processamento e **não são gravados em disco**.

Convites e solicitações de acesso são persistidos em `data/` (JSON).

## Produção

### Build manual

```bash
bun run build
node .output/server/index.mjs
```

O servidor escuta na porta definida por `PORT` (padrão `3000`; Cloud Run usa `8080`).

### Docker

```bash
docker build -t echo-web .
docker run -p 8080:8080 --env-file .env echo-web
```

O `Dockerfile` usa multi-stage build (Bun para compilar, Node Alpine para executar).

### Deploy no GCP (Cloud Build + Cloud Run)

O repositório inclui [`cloudbuild.yaml`](cloudbuild.yaml) para pipeline automático via trigger no Git:

1. Build da imagem Docker
2. Push para Artifact Registry
3. Deploy no Cloud Run

#### Pré-requisitos (uma vez)

```bash
# Ativar APIs
gcloud services enable cloudbuild.googleapis.com run.googleapis.com artifactregistry.googleapis.com

# Criar repositório de imagens
gcloud artifacts repositories create echo \
  --repository-format=docker \
  --location=southamerica-east1

# Permissões do Cloud Build para deploy
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud iam service-accounts add-iam-policy-binding \
  ${PROJECT_NUMBER}-compute@developer.gserviceaccount.com \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

#### Trigger no repositório Git

Crie um trigger apontando para a branch `main` (ou a desejada) com o arquivo `cloudbuild.yaml` na raiz.

Ajuste as substituições no `cloudbuild.yaml` conforme seu projeto:

- `_DEPLOY_REGION` — região do Cloud Run
- `_SERVICE_NAME` — nome do serviço
- `_APP_URL` — URL pública do Cloud Run após o primeiro deploy
- Variáveis sensíveis (`GOOGLE_CLIENT_SECRET`, `OPENAI_API_KEY`, `SESSION_SECRET`) — prefira Secret Manager em produção

#### Variáveis obrigatórias no Cloud Run

```
ADMIN_EMAIL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
OPENAI_API_KEY
SESSION_SECRET
APP_URL
```

> **Importante:** `APP_URL` deve ser a URL pública real do serviço (ex.: `https://echo-web-xxxxx.run.app`) para OAuth e links de convite funcionarem.

#### Persistência de dados

Convites e solicitações de acesso ficam em `data/` dentro do container. Em redeploys do Cloud Run, esse diretório é efêmero. Para produção estável, monte um volume persistente ou migre para armazenamento externo.

## Estrutura do projeto

```
src/
  components/     # UI (header, upload, fila, toasts, etc.)
  lib/            # Auth, storage, OpenAI, rate limit
  routes/         # Páginas e API (TanStack Router)
  server/         # Server functions
data/             # Convites e solicitações de acesso (gitignored)
public/           # Assets estáticos
```

## Licença

Projeto privado.
