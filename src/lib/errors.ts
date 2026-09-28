export class AppError extends Error {
  readonly status: number
  readonly userMessage: string

  constructor(status: number, userMessage: string) {
    super(userMessage)
    this.name = 'AppError'
    this.status = status
    this.userMessage = userMessage
  }
}

export function toErrorResponse(error: unknown): Response {
  if (error instanceof AppError) {
    return Response.json({ error: error.userMessage }, { status: error.status })
  }

  console.error(error)
  return Response.json(
    { error: 'Something went wrong. Please try again.' },
    { status: 500 },
  )
}

export const errors = {
  unauthorized: () => new AppError(401, 'Entre para continuar.'),
  forbidden: (message = 'Você não tem acesso a este recurso.') =>
    new AppError(403, message),
  inviteExpired: () =>
    new AppError(410, 'Este convite expirou.'),
  inviteRevoked: () =>
    new AppError(403, 'Este convite foi revogado.'),
  uploadLimitReached: () =>
    new AppError(429, 'Limite de envios deste convite atingido.'),
  fileLimitReached: () =>
    new AppError(429, 'Muitos arquivos neste envio.'),
  rateLimited: () =>
    new AppError(429, 'Muitas requisições. Aguarde um momento.'),
  concurrentJobs: () =>
    new AppError(429, 'Servidor ocupado. Tente novamente em instantes.'),
  fileTooLarge: (maxMb: number) =>
    new AppError(413, `Arquivo muito grande. O máximo é ${maxMb} MB.`),
  unsupportedType: () =>
    new AppError(415, 'Tipo de arquivo não suportado. Use mp3, wav, m4a, mp4, webm ou ogg.'),
  audioPrepareUnavailable: () =>
    new AppError(
      503,
      'Conversão de áudio indisponível no servidor. Instale o ffmpeg ou tente um arquivo menor.',
    ),
  audioPrepareFailed: () =>
    new AppError(
      422,
      'Não foi possível extrair áudio deste arquivo. Verifique se o vídeo contém faixa de áudio.',
    ),
  openAiFailed: () =>
    new AppError(502, 'Falha na transcrição. Tente novamente.'),
  instagramInvalidUrl: () =>
    new AppError(
      400,
      'Link inválido. Use um link público de Reel ou post do Instagram.',
    ),
  instagramPrivateOrUnavailable: () =>
    new AppError(
      403,
      'Este conteúdo parece privado, removido ou indisponível para transcrição.',
    ),
  instagramNoMedia: () =>
    new AppError(
      422,
      'Este post não contém vídeo ou áudio que possa ser transcrito.',
    ),
  instagramTooLong: (maxSeconds: number) =>
    new AppError(
      413,
      `Vídeo muito longo. O máximo para Instagram é ${Math.floor(maxSeconds / 60)} min.`,
    ),
  instagramYtDlpUnavailable: () =>
    new AppError(
      503,
      'Download do Instagram indisponível no servidor. Instale o yt-dlp.',
    ),
  instagramFetchFailed: () =>
    new AppError(
      502,
      'Não foi possível obter o vídeo do Instagram. Tente novamente ou envie o arquivo.',
    ),
}
