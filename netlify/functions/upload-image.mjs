import { getStore } from '@netlify/blobs'

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file')
    if (!file) return new Response(JSON.stringify({ error: 'No file' }), { status: 400 })

    // Check size (max 5MB)
    const arrayBuffer = await file.arrayBuffer()
    if (arrayBuffer.byteLength > 5 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'File too large (max 5MB)' }), { status: 400 })
    }

    const ext  = file.name?.split('.').pop()?.toLowerCase() || 'jpg'
    const key  = `recipes/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const store = getStore({ name: 'recipe-images', consistency: 'strong' })
    await store.set(key, Buffer.from(arrayBuffer), {
      metadata: { contentType: file.type || 'image/jpeg' }
    })

    // Build public URL — Netlify Blobs public URL pattern
    const siteUrl = process.env.URL || process.env.DEPLOY_URL || ''
    const url = `${siteUrl}/.netlify/blobs/recipe-images/${key}`

    return new Response(JSON.stringify({ url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('upload-image error:', e)
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}
