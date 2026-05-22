'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, UploadCloud, Trash2 } from 'lucide-react'
import { useAppStore } from '@/stores/app-store'
import { apiRequest, backendBaseUrl, type BackendPost } from '@/lib/api'
import { toast } from 'sonner'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm']
const MAX_FILE_SIZE_MB = 50

export type OptimisticPostDraft = {
  title: string
  content: string
  mediaUrl?: string
}

const uploadFile = (file: File, onProgress: (progress: number) => void) => {
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const formData = new FormData()
    formData.append('file', file)
    formData.append('kind', 'POST')

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentage = Math.round((e.loaded * 100) / e.total)
        onProgress(percentage)
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText)
          if (res.success && res.data?.url) {
            resolve(res.data.url)
          } else {
            reject(new Error(res.message || 'Upload failed'))
          }
        } catch {
          reject(new Error('Invalid response from server'))
        }
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`))
      }
    })

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')))
    xhr.addEventListener('abort', () => reject(new Error('Upload aborted')))

    const backendUrl = backendBaseUrl()
    xhr.open('POST', `${backendUrl}/api/media`)
    xhr.withCredentials = true
    xhr.send(formData)
  })
}

type CreatePostModalProps = {
  onOptimisticPost?: (draft: OptimisticPostDraft) => string | undefined
  onCreated?: (post: BackendPost, optimisticId?: string) => void
  onCreateFailed?: (optimisticId?: string) => void
}

export function CreatePostModal({ onOptimisticPost, onCreated, onCreateFailed }: CreatePostModalProps) {
  const createPostOpen = useAppStore((state) => state.createPostOpen)
  const setCreatePostOpen = useAppStore((state) => state.setCreatePostOpen)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isPosting, setIsPosting] = useState(false)

  // Media state
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleClose = () => {
    setCreatePostOpen(false)
    setTimeout(() => {
      setTitle('')
      setContent('')
      removeAttachment()
      setIsPosting(false)
    }, 200)
  }

  const validateFile = (selectedFile: File) => {
    const isImage = ALLOWED_IMAGE_TYPES.includes(selectedFile.type)
    const isVideo = ALLOWED_VIDEO_TYPES.includes(selectedFile.type)
    
    if (!isImage && !isVideo) {
      toast.error('Invalid file format', {
        description: 'Please upload JPG, PNG, WEBP, GIF, MP4, or WEBM.',
      })
      return false
    }

    const fileSizeMB = selectedFile.size / (1024 * 1024)
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      toast.error('File too large', {
        description: `File size exceeds the ${MAX_FILE_SIZE_MB}MB limit.`,
      })
      return false
    }

    return true
  }

  const processSelectedFile = async (selectedFile: File) => {
    if (!validateFile(selectedFile)) return

    removeAttachment()

    setFile(selectedFile)
    setPreviewUrl(URL.createObjectURL(selectedFile))
    setIsUploading(true)
    setUploadProgress(0)

    try {
      const uploadedUrl = await uploadFile(selectedFile, (progress) => {
        setUploadProgress(progress)
      })
      setMediaUrl(uploadedUrl)
      toast.success('Media uploaded successfully')
    } catch (err) {
      toast.error('Media upload failed', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
      removeAttachment()
    } finally {
      setIsUploading(false)
      setUploadProgress(null)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0]
      await processSelectedFile(selectedFile)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      await processSelectedFile(selectedFile)
    }
  }

  const removeAttachment = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setFile(null)
    setMediaUrl(null)
    setPreviewUrl(null)
    setUploadProgress(null)
    setIsUploading(false)
  }

  const handlePost = async () => {
    if (!isFormValid || isPosting) return
    setIsPosting(true)
    const titleValue = title.trim()
    const contentValue = content.trim()
    let optimisticId: string | undefined

    try {
      let postType: 'TEXT' | 'IMAGE' | 'MEDIA' = 'TEXT'
      if (mediaUrl) {
        const isVideo = file && ALLOWED_VIDEO_TYPES.includes(file.type)
        postType = isVideo ? 'MEDIA' : 'IMAGE'
      }

      optimisticId = onOptimisticPost?.({
        title: titleValue,
        content: contentValue,
        mediaUrl: mediaUrl || undefined,
      })
      handleClose()

      const response = await apiRequest<BackendPost>('/api/posts', {
        method: 'POST',
        body: JSON.stringify({
          title: titleValue,
          content: contentValue,
          type: postType,
          mediaUrl: mediaUrl || undefined,
        }),
      })
      toast.success('Thread published')
      onCreated?.(response.data, optimisticId)
    } catch (error) {
      onCreateFailed?.(optimisticId)
      toast.error('Could not publish thread', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
      setIsPosting(false)
    }
  }

  const isFormValid = title.trim().length >= 3 && content.trim().length > 0 && !isUploading

  return (
    <AnimatePresence>
      {createPostOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="w-full max-w-lg max-h-[85vh] overflow-y-auto pointer-events-auto rounded-lg"
              style={{
                background: '#151515',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 h-12 flex-shrink-0"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              >
                <h2
                  className="font-display font-semibold text-sm"
                  style={{ color: '#F5F5F5' }}
                >
                  New thread
                </h2>
                <button
                  onClick={handleClose}
                  className="flex items-center justify-center w-7 h-7 rounded cursor-pointer transition-colors duration-150"
                  style={{ color: '#555555' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = '#888888'
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = '#555555'
                  }}
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                {/* Title */}
                <div>
                  <label
                    className="block text-[10px] font-medium uppercase tracking-wider mb-1.5"
                    style={{ color: '#555555' }}
                  >
                    Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="What's happening?"
                    className="w-full px-3 py-2 rounded-md text-sm outline-none transition-colors"
                    style={{
                      background: '#1A1A1A',
                      border: '1px solid rgba(255,255,255,0.06)',
                      color: '#F5F5F5',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(199,255,63,0.3)'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                    }}
                    maxLength={300}
                  />
                </div>

                {/* Content */}
                <div>
                  <label
                    className="block text-[10px] font-medium uppercase tracking-wider mb-1.5"
                    style={{ color: '#555555' }}
                  >
                    Content
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Share your thoughts..."
                    rows={5}
                    className="w-full px-3 py-2 rounded-md text-sm outline-none transition-colors resize-none min-h-[120px]"
                    style={{
                      background: '#1A1A1A',
                      border: '1px solid rgba(255,255,255,0.06)',
                      color: '#F5F5F5',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(199,255,63,0.3)'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                    }}
                  />
                </div>

                {/* Media Attachment Area */}
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`relative rounded-md border border-dashed transition-all duration-200 p-4 text-center flex flex-col items-center justify-center min-h-[120px] ${
                    dragActive
                      ? 'border-[#C7FF3F] bg-[#C7FF3F]/[0.02]'
                      : 'border-white/[0.08] hover:border-white/[0.15] bg-[#1A1A1A]'
                  }`}
                >
                  {previewUrl ? (
                    <div className="relative w-full rounded overflow-hidden group/preview bg-black/[0.2]">
                      {file && ALLOWED_VIDEO_TYPES.includes(file.type) ? (
                        <video
                          src={previewUrl}
                          className="w-full max-h-56 object-contain mx-auto"
                          controls
                          muted
                        />
                      ) : (
                        <img
                          src={previewUrl}
                          alt="Attachment preview"
                          className="w-full max-h-56 object-contain mx-auto"
                        />
                      )}
                      
                      {isUploading && uploadProgress !== null && (
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-4">
                          <span className="text-xs font-semibold text-[#F5F5F5] mb-2">Uploading ({uploadProgress}%)</span>
                          <div className="w-48 bg-white/10 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full bg-[#C7FF3F] transition-all duration-150"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {!isUploading && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeAttachment()
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-red-500/80 text-white cursor-pointer transition-colors duration-150 shadow-md"
                          title="Remove media"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <label className="w-full cursor-pointer flex flex-col items-center justify-center gap-2 py-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/[0.04] text-tertiary">
                        <UploadCloud size={20} />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-[#F5F5F5]">
                          Drag & drop or <span className="text-[#C7FF3F] underline">browse</span>
                        </p>
                        <p className="text-[10px]" style={{ color: '#555555' }}>
                          Supports JPG, PNG, WEBP, GIF, MP4, WEBM (max 50MB)
                        </p>
                      </div>
                      <input
                        type="file"
                        onChange={handleFileChange}
                        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div
                className="flex items-center justify-end gap-3 px-5 h-12 flex-shrink-0"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
              >
                <button
                  onClick={handleClose}
                  className="px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors"
                  style={{ color: '#888888' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = '#F5F5F5'
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = '#888888'
                  }}
                >
                  Cancel
                </button>
                <motion.button
                  onClick={handlePost}
                  disabled={!isFormValid || isPosting}
                  className="px-4 py-1.5 rounded text-xs font-medium cursor-pointer transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
                  style={{
                    background: isFormValid ? '#C7FF3F' : '#1A1A1A',
                    color: isFormValid ? '#0D0D0D' : '#555555',
                  }}
                  whileHover={isFormValid && !isPosting ? { opacity: 0.9 } : {}}
                  whileTap={isFormValid && !isPosting ? { scale: 0.97 } : {}}
                >
                  {isPosting ? 'Posting...' : 'Post'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
