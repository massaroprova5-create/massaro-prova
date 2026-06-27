const isValidHttpUrl = (value) => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const isVideoUrl = (value) => {
  if (!isValidHttpUrl(value)) return false
  const pathname = new URL(value).pathname
  return /\.(mp4|webm|ogg|mov)$/i.test(pathname)
}

const getYouTubeEmbedUrl = (value) => {
  if (!value) return null
  const normalizedValue = value.trim()
  const maybeUrl = /^[a-zA-Z][a-zA-Z\d+.\-]*:/.test(normalizedValue)
    ? normalizedValue
    : `https://${normalizedValue}`

  try {
    const url = new URL(maybeUrl)
    const hostname = url.hostname.replace(/^www\.|^m\./, '').toLowerCase()
    let videoId = null
    const pathSegments = url.pathname.split('/').filter(Boolean)

    if (hostname === 'youtube.com' || hostname === 'youtube-nocookie.com') {
      if (pathSegments[0] === 'watch') {
        videoId = url.searchParams.get('v')
      } else if (pathSegments[0] === 'shorts' || pathSegments[0] === 'embed' || pathSegments[0] === 'v') {
        videoId = pathSegments[1] || null
      }
    } else if (hostname === 'youtu.be') {
      videoId = pathSegments[0] || null
    }

    if (!videoId) {
      const fallback = url.searchParams.get('v')
      videoId = fallback && fallback.trim() ? fallback : null
    }

    return videoId ? `https://www.youtube.com/embed/${videoId}` : null
  } catch {
    return null
  }
}

const getVimeoEmbedUrl = (value) => {
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
    return null
  }
  return null
}

const tests = [
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://youtu.be/dQw4w9WgXcQ',
  'https://youtube.com/shorts/dQw4w9WgXcQ',
  'https://www.youtube.com/embed/dQw4w9WgXcQ',
  'youtu.be/dQw4w9WgXcQ',
  'youtube.com/watch?v=dQw4w9WgXcQ',
  'https://vimeo.com/123456789',
  'vimeo.com/123456789',
  'https://player.vimeo.com/video/123456789',
  'https://example.com/video.mp4',
  'http://example.com/video.webm',
  'https://example.com/video.mp4?token=abc',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL',
  'https://youtu.be/dQw4w9WgXcQ?t=20',
  'https://vimeo.com/123456789?foo=bar'
]

tests.forEach((url) => {
  console.log('URL:', url)
  console.log('  yt:', getYouTubeEmbedUrl(url))
  console.log('  vimeo:', getVimeoEmbedUrl(url))
  console.log('  direct:', isVideoUrl(url))
  console.log('---')
})
