import { useEffect } from 'react'

type MetaOpts = {
  title?: string
  description?: string
  url?: string
  image?: string
}

export function usePageMeta(opts: MetaOpts) {
  useEffect(() => {
    const baseUrl = (import.meta as any)?.env?.VITE_APP_URL || window.location.origin
    const title = opts.title || 'Learnova - AI Personal Knowledge Companion'
    document.title = title

    const setMeta = (name: string, content?: string) => {
      if (!content) return
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute('name', name)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    }

    setMeta('description', opts.description || 'Transform text into summaries, flashcards, quizzes and ask intelligent questions with Learnova.')
    // Open Graph
    const setOg = (prop: string, content?: string) => {
      if (!content) return
      let el = document.querySelector(`meta[property="og:${prop}"]`) as HTMLMetaElement | null
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute('property', `og:${prop}`)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    }
    setOg('title', title)
    setOg('description', opts.description || '')

    const url = opts.url || baseUrl
    if (url) {
      setOg('url', url)
      // canonical
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
      if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link) }
      link.href = url
    }
    if (opts.image) {
      setOg('image', opts.image)
      let tw = document.querySelector('meta[name="twitter:image"]') as HTMLMetaElement | null
      if (!tw) { tw = document.createElement('meta'); tw.setAttribute('name', 'twitter:image'); document.head.appendChild(tw) }
      tw.setAttribute('content', opts.image)
    }

    return () => {
      // keep it simple: do not remove meta tags on unmount to avoid flicker
    }
  }, [opts.title, opts.description, opts.url, opts.image])
}

export default usePageMeta
