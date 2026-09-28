# Echo

Aplicação web monolítica para transcrição de áudio e vídeo com IA. Envie arquivos de reunião (MP4, etc.), transcreva com o `gpt-4o-transcribe` da OpenAI e copie ou baixe o resultado em TXT ou Markdown.

## Stack

- [Bun](https://bun.sh) — runtime e gerenciador de pacotes
- [TanStack Start](https://tanstack.com/start) + [TanStack Router](https://tanstack.com/router)
- TypeScript
- Tailwind CSS v4
- OpenAI Speech-to-Text (`gpt-4o-transcribe`)
- Magic link por e-mail (administrador e lista de acesso)
- Armazenamento em JSON (`data/`), sem banco de dados

## Como funciona

### Administrador

- Entra com **magic link** no e-mail definido em `ADMIN_EMAIL`
- Acessa **Admin** para gerar links de convite
- Compartilha links no formato `{APP_URL}/invite/{token}`
- Também pode transcrever áudio normalmente

### Usuários convidados

- Abrem o link de convite e **ganham acesso imediatamente** — sem magic link
- A sessão fica vinculada ao token do convite
- Podem enviar arquivos dentro dos limites definidos no convite

### Visitantes

- Na home, informam o e-mail e recebem um **magic link** se o endereço for o admin ou estiver em `ALLOWED_EMAILS`
- No header, podem usar **Solicitar acesso** para pedir que o administrador autorize o e-mail

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
| `ADMIN_EMAIL` | E-mail do administrador |
| `OPENAI_API_KEY` | Chave da API OpenAI (somente servidor) |
| `SESSION_SECRET` | String longa e aleatória para criptografar sessões |
| `APP_URL` | URL pública da aplicação (ex.: `http://localhost:3000`) |

Variáveis opcionais (com defaults):

| Variável | Default | Descrição |
|----------|---------|-----------|
| `MAX_FILES_PER_UPLOAD` | `10` | Máximo de arquivos por envio |
| `INVITE_EXPIRATION_HOURS` | `24` | Validade do convite em horas |
| `MAX_FILE_SIZE_MB` | `150` | Tamanho máximo por arquivo no upload |
| `MAX_INSTAGRAM_DURATION_SECONDS` | `180` | Duração máxima para links do Instagram (Beta) |
| `MAX_CONCURRENT_JOBS` | `2` | Transcrições simultâneas no servidor |
| `RATE_LIMIT_PER_MINUTE` | `30` | Limite de requisições por IP/minuto |
| `ALLOWED_EMAILS` | vazio | E-mails adicionais, separados por vírgula, que podem entrar com magic link |
| `RESEND_API_KEY` | vazio | Chave da API Resend para enviar o magic link |
| `RESEND_FROM` | vazio | Remetente verificado no Resend (ex.: `Echo <login@seudominio.com>`) |

### Magic link

Quem informa um e-mail na home recebe a mesma confirmação. O link só é enviado se o endereço for `ADMIN_EMAIL` ou estiver em `ALLOWED_EMAILS`. Ele vale 15 minutos e não fica gravado: a assinatura usa `SESSION_SECRET`.

Em desenvolvimento, sem `RESEND_API_KEY`, o servidor imprime a URL do link no log. Em produção, a chave e o remetente são obrigatórios para o envio funcionar.

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

## Formatos suportados

`mp3`, `wav`, `m4a`, `mp4`, `webm`, `ogg` (áudio e vídeo)

Vídeos (ex.: MP4 de reunião) têm o áudio extraído no servidor antes da transcrição. A API de transcrição da OpenAI aceita no máximo **25 MB por requisição**; arquivos maiores são comprimidos e fatiados automaticamente com **ffmpeg**.

### ffmpeg

Necessário no servidor (e localmente, para arquivos grandes ou vídeo):

- **Docker/Cloud Run:** já incluído na imagem de produção
- **Local:** instale [ffmpeg](https://ffmpeg.org/) e garanta que `ffmpeg` e `ffprobe` estejam no `PATH`

### Instagram (Beta)

É possível colar um link público de Reel ou post do Instagram para transcrição. O recurso é **experimental**: alguns links podem falhar (posts privados, mudanças no Instagram, etc.).

Requisitos adicionais:

- **`yt-dlp`** no `PATH` (Docker/Cloud Run já inclui; localmente: [yt-dlp](https://github.com/yt-dlp/yt-dlp) ou `py -m pip install -U "yt-dlp[default]"`)
- Limites: duração máxima (`MAX_INSTAGRAM_DURATION_SECONDS`, default 3 min) e tamanho (`MAX_FILE_SIZE_MB`)

Stories, perfis e conteúdos privados não são suportados. Prefira o upload de arquivo quando o link falhar.

## Privacidade

Os arquivos enviados **não são persistidos** após o processamento. Durante a transcrição, o servidor pode gravar cópias temporárias em disco (`/tmp`) para conversão com ffmpeg ou download via yt-dlp; esses arquivos são removidos ao final.

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

O `Dockerfile` usa multi-stage build: Bun instala dependências, Node compila e executa (evita adapter Bun.serve no Nitro).

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
- `_RESEND_FROM` — remetente verificado no Resend
- Variáveis sensíveis (`RESEND_API_KEY`, `OPENAI_API_KEY`, `SESSION_SECRET`) — prefira Secret Manager em produção

#### Variáveis obrigatórias no Cloud Run

```
ADMIN_EMAIL
OPENAI_API_KEY
SESSION_SECRET
APP_URL
RESEND_API_KEY
RESEND_FROM
```

`ALLOWED_EMAILS` é opcional; no `cloudbuild.yaml`, separe os e-mails por vírgula normalmente. Antes do primeiro deploy com magic link, crie o secret `echo-resend-api-key` no Secret Manager.

> **Importante:** `APP_URL` deve ser a URL pública real do serviço (ex.: `https://echo-web-xxxxx.run.app`) para o magic link e os links de convite funcionarem.

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
