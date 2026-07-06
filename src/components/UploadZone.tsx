import { Upload } from 'lucide-react'

type UploadZoneProps = {
  disabled?: boolean
  maxFiles: number
  onFilesSelected: (files: File[]) => void
  validationMessage?: string | null
}

export default function UploadZone({
  disabled = false,
  maxFiles,
  onFilesSelected,
  validationMessage,
}: UploadZoneProps) {
  function handleFiles(fileList: FileList | null) {
    if (!fileList || disabled) return
    onFilesSelected(Array.from(fileList))
  }

  return (
    <div
      className={`echo-dropzone ${disabled ? 'is-disabled' : ''}`}
      onDragOver={(event) => {
        event.preventDefault()
      }}
      onDrop={(event) => {
        event.preventDefault()
        handleFiles(event.dataTransfer.files)
      }}
    >
      <div className="echo-dropzone-inner">
        <div className="echo-dropzone-icon mb-4">
          <Upload size={28} strokeWidth={1.5} />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-[var(--text)]">
          Arraste arquivos de áudio aqui
        </h2>
        <p className="mb-6 text-sm text-[var(--text-muted)]">
          ou escolha arquivos do seu dispositivo (até {maxFiles} por envio)
        </p>
        <label className="echo-button cursor-pointer">
          Escolher arquivos
          <input
            type="file"
            className="sr-only"
            multiple
            disabled={disabled}
            accept=".mp3,.wav,.m4a,.mp4,.webm,.ogg,audio/*"
            onChange={(event) => handleFiles(event.target.files)}
          />
        </label>
        {validationMessage ? (
          <p className="echo-alert-warning mt-4">{validationMessage}</p>
        ) : null}
      </div>
    </div>
  )
}
