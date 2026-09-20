import { getStore } from '@netlify/blobs'
import crypto from 'node:crypto'

const PRODUCTS_KEY = 'catalogue.json'
const store = () => getStore('boutique-data')
const imageStore = () => getStore({ name: 'boutique-images', consistency: 'strong' })
const seedProducts = [
  { id: 'rose-midi', slug: 'rose-garden-midi', name: 'Rose Garden Midi', collection: 'Summer Edit', price: 4890, description: 'A softly structured midi dress in a rose garden print, finished with a square neckline and a flowing skirt.', sizes: ['XS', 'S', 'M', 'L'], colours: ['Rose', 'Ivory'], stock: { XS: 3, S: 7, M: 5, L: 2 }, image: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=1000&q=85', featured: true, published: true },
  { id: 'saffron-silk', slug: 'saffron-silk-slip', name: 'Saffron Silk Slip', collection: 'Occasion', price: 7290, description: 'An elegant bias-cut satin slip dress with a low back and delicate adjustable straps.', sizes: ['S', 'M', 'L'], colours: ['Saffron'], stock: { S: 4, M: 6, L: 3 }, image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=1000&q=85', featured: true, published: true },
  { id: 'linen-wrap', slug: 'linen-wrap-dress', name: 'Linen Wrap Dress', collection: 'Everyday Ease', price: 3990, description: 'Breathable linen with a flattering adjustable wrap waist for effortless days out.', sizes: ['XS', 'S', 'M', 'L', 'XL'], colours: ['Oat', 'Terracotta'], stock: { XS: 4, S: 8, M: 8, L: 4, XL: 2 }, image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=85', featured: false, published: true },
]
const ALLOWED_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' }
const MAX_IMAGE_BYTES = 8 * 1024 * 1024 // 8 MB
const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } })
const slugify = (value) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
const secret = () => process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD
const sign = (value) => crypto.createHmac('sha256', secret()).update(value).digest('base64url')
const sessionCookie = (request) => request.headers.get('cookie')?.split(';').map((item) => item.trim()).find((item) => item.startsWith('boutique_session='))?.split('=')[1]
const authenticated = (request) => {
  if (!secret()) return false
  const token = sessionCookie(request)
  if (!token) return false
  const [expiry, signature] = token.split('.')
  const expected = sign(expiry)
  return Number(expiry) > Date.now() && signature?.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}
const requireAuth = (request) => authenticated(request) ? null : json({ error: 'Please sign in to manage the boutique.' }, 401)
async function products() { return (await store().get(PRODUCTS_KEY, { type: 'json' })) || seedProducts }
async function saveProducts(items) { await store().setJSON(PRODUCTS_KEY, items) }
async function requestBody(request) { try { return await request.json() } catch { return null } }

export default async (request) => {
  const path = new URL(request.url).pathname.replace(/^.*\/api\/?/, '').replace(/\/$/, '')
  const method = request.method
  if (path === 'auth/login' && method === 'POST') {
    const body = await requestBody(request)
    if (!process.env.ADMIN_PASSWORD || body?.password !== process.env.ADMIN_PASSWORD) return json({ error: 'Incorrect password.' }, 401)
    const expiry = String(Date.now() + 1000 * 60 * 60 * 12)
    return json({ ok: true }, 200, { 'Set-Cookie': `boutique_session=${expiry}.${sign(expiry)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200` })
  }
  if (path === 'auth/logout' && method === 'POST') return json({ ok: true }, 200, { 'Set-Cookie': 'boutique_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0' })
  const catalogue = await products()
  if (path === 'products' && method === 'GET') return json({ products: catalogue.filter((item) => item.published) })
  if (path.startsWith('products/') && method === 'GET') {
    const product = catalogue.find((item) => item.slug === path.split('/')[1] && item.published)
    return product ? json({ product }) : json({ error: 'Dress not found.' }, 404)
  }
  // ── Public image serving ─────────────────────────────────────────────────────
  if (path.startsWith('images/') && method === 'GET') {
    const key = path.slice('images/'.length)
    if (!key) return json({ error: 'Not found.' }, 404)
    const result = await imageStore().getWithMetadata(key, { type: 'arrayBuffer' })
    if (!result || !result.data) return new Response('Image not found.', { status: 404 })
    return new Response(result.data, {
      status: 200,
      headers: {
        'Content-Type': result.metadata?.mimeType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  }
  if (!path.startsWith('admin/')) return json({ error: 'Not found.' }, 404)
  const denied = requireAuth(request)
  if (denied) return denied
  // ── Image upload ────────────────────────────────────────────────────────────
  if (path === 'admin/upload' && method === 'POST') {
    let imageBuffer, mimeType
    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('multipart/form-data')) {
      // Read image from FormData field named "image"
      const formData = await request.formData().catch(() => null)
      if (!formData) return json({ error: 'Could not parse form data.' }, 400)
      const file = formData.get('image')
      if (!file || typeof file === 'string') return json({ error: 'No image file received.' }, 400)
      mimeType = file.type
      imageBuffer = await file.arrayBuffer()
    } else {
      // Fallback: raw binary body with Content-Type: image/*
      mimeType = contentType.split(';')[0].trim()
      imageBuffer = await request.arrayBuffer().catch(() => null)
      if (!imageBuffer) return json({ error: 'Could not read image body.' }, 400)
    }
    const ext = ALLOWED_TYPES[mimeType]
    if (!ext) return json({ error: 'Unsupported image type. Please upload a JPEG, PNG, WebP, GIF, or AVIF.' }, 415)
    if (imageBuffer.byteLength > MAX_IMAGE_BYTES) return json({ error: 'Image is too large (max 8 MB).' }, 413)
    const key = `${crypto.randomUUID()}.${ext}`
    await imageStore().set(key, imageBuffer, { metadata: { mimeType } })
    // Return a URL pointing to our own public image-serving endpoint
    return json({ url: `/api/images/${key}` })
  }
  // ── Products CRUD ────────────────────────────────────────────────────────────
  if (path === 'admin/products' && method === 'GET') return json({ products: catalogue })
  if (path === 'admin/products' && ['POST', 'PUT'].includes(method)) {
    const body = await requestBody(request)
    const imagesList = body?.images?.length ? body.images : (body?.image ? [body.image] : [])
    if (!body?.name || !body?.collection || !Number.isFinite(body.price) || !body?.description || !imagesList.length) return json({ error: 'Please complete all required dress details and add at least one image.' }, 400)
    const primaryImage = imagesList[0]
    const product = { ...body, image: primaryImage, images: imagesList, id: body.id || crypto.randomUUID(), slug: body.slug || slugify(body.name), updatedAt: new Date().toISOString() }
    const duplicate = catalogue.find((item) => item.slug === product.slug && item.id !== product.id)
    if (duplicate) return json({ error: 'Choose a different dress name; this URL already exists.' }, 409)
    const next = method === 'POST' ? [product, ...catalogue] : catalogue.map((item) => item.id === product.id ? product : item)
    await saveProducts(next)
    return json({ product })
  }
  if (path.startsWith('admin/products/') && method === 'DELETE') {
    const id = path.split('/')[2]
    await saveProducts(catalogue.filter((item) => item.id !== id))
    return json({ ok: true })
  }
  return json({ error: 'Not found.' }, 404)
}
