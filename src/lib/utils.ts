import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'agora'
  if (minutes < 60) return `${minutes}m`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export function formatFullDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getAvatarFallback(name?: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\w\u00C0-\u017F]+/g)
  return matches ? matches.map((t) => t.toLowerCase()) : []
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function isImageUrl(value: string): boolean {
  if (!value) return false
  if (value.startsWith('data:image/')) return true
  if (value.startsWith('blob:')) return true
  return isValidHttpUrl(value) && /(\.png|\.jpe?g|\.webp|\.gif|\.avif|\.svg)$/i.test(value)
}

export function isVideoUrl(value: string): boolean {
  if (!isValidHttpUrl(value)) return false
  const pathname = new URL(value).pathname
  return /\.(mp4|webm|ogg|mov)$/i.test(pathname)
}

export function getYouTubeEmbedUrl(value: string): string | null {
  if (!value) return null

  const normalizedValue = value.trim()
  const maybeUrl = /^[a-zA-Z][a-zA-Z\d+.\-]*:/.test(normalizedValue)
    ? normalizedValue
    : `https://${normalizedValue}`

  let videoId: string | null = null

  try {
    const url = new URL(maybeUrl)
    const hostname = url.hostname.replace(/^www\.|^m\./, '').toLowerCase()
    const pathSegments = url.pathname.split('/').filter(Boolean)

    if (hostname === 'youtube.com' || hostname === 'youtube-nocookie.com' || hostname === 'music.youtube.com') {
      if (pathSegments[0] === 'watch') {
        videoId = url.searchParams.get('v')
      } else if (['shorts', 'embed', 'v'].includes(pathSegments[0])) {
        videoId = pathSegments[1] || null
      }
    } else if (hostname === 'youtu.be') {
      videoId = pathSegments[0] || null
    }

    if (!videoId) {
      const fallback = url.searchParams.get('v')
      videoId = fallback && fallback.trim() ? fallback : null
    }
  } catch {
    // Try regex fallback when URL parsing fails.
    const youtubeMatch = normalizedValue.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|shorts\/|embed\/|v\/))([\w-]{11})/i)
    videoId = youtubeMatch ? youtubeMatch[1] : null
  }

  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}`
  }

  return null
}

export function getVimeoEmbedUrl(value: string): string | null {
  if (!value) return null

  const normalizedValue = value.trim()
  const maybeUrl = /^[a-zA-Z][a-zA-Z\d+.\-]*:/.test(normalizedValue)
    ? normalizedValue
    : `https://${normalizedValue}`

  try {
    const url = new URL(maybeUrl)
    const hostname = url.hostname.replace(/^www\./, '').toLowerCase()
    const pathSegments = url.pathname.split('/').filter(Boolean)
    if (hostname === 'vimeo.com' || hostname === 'player.vimeo.com') {
      const id = pathSegments[pathSegments.length - 1] || null
      return id ? `https://player.vimeo.com/video/${id}` : null
    }
  } catch {
    const vimeoMatch = normalizedValue.match(/vimeo\.com\/(?:video\/)?(\d+)/i)
    const id = vimeoMatch ? vimeoMatch[1] : null
    return id ? `https://player.vimeo.com/video/${id}` : null
  }

  return null
}
