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
  if (path === 'products' && method === 'GET') return json({ products: catalogue.filter((item) => item.published && !item.pending && item.status !== 'PENDING') })
  if (path.startsWith('products/') && method === 'GET') {
    const product = catalogue.find((item) => item.slug === path.split('/')[1] && item.published && !item.pending && item.status !== 'PENDING')
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
    const fixedPrice = Number.isFinite(Number(body?.fixedPrice)) ? Number(body.fixedPrice) : (Number.isFinite(Number(body?.price)) ? Number(body.price) : NaN)
    const buyPrice = Number.isFinite(Number(body?.buyPrice)) ? Number(body.buyPrice) : 0
    if (!body?.name || !body?.collection || !Number.isFinite(fixedPrice) || !body?.description || !imagesList.length) {
      return json({ error: 'Please complete all required dress details, enter Fixed Price, and add at least one image.' }, 400)
    }
    const primaryImage = imagesList[0]
    const isPending = body?.pending !== undefined ? Boolean(body.pending) : (body?.status === 'PENDING')
    const product = {
      ...body,
      price: fixedPrice,
      fixedPrice,
      buyPrice,
      image: primaryImage,
      images: imagesList,
      pending: isPending,
      status: isPending ? 'PENDING' : (body?.status || 'ACTIVE'),
      published: isPending ? false : (body?.published !== undefined ? Boolean(body.published) : true),
      soldCount: Number.isFinite(Number(body?.soldCount)) ? Number(body.soldCount) : 0,
      totalSoldRevenue: Number.isFinite(Number(body?.totalSoldRevenue)) ? Number(body.totalSoldRevenue) : 0,
      sales: Array.isArray(body?.sales) ? body.sales : [],
      id: body.id || crypto.randomUUID(),
      slug: body.slug || slugify(body.name),
      updatedAt: new Date().toISOString()
    }
    const duplicate = catalogue.find((item) => item.slug === product.slug && item.id !== product.id)
    if (duplicate) return json({ error: 'Choose a different dress name; this URL already exists.' }, 409)
    const next = method === 'POST' ? [product, ...catalogue] : catalogue.map((item) => item.id === product.id ? product : item)
    await saveProducts(next)
    return json({ product })
  }
  // ── Bulk Products Creation ──────────────────────────────────────────────────
  if (path === 'admin/products/bulk' && method === 'POST') {
    const body = await requestBody(request)
    const itemsToAdd = Array.isArray(body?.products) ? body.products : []
    if (!itemsToAdd.length) return json({ error: 'No products provided for bulk import.' }, 400)

    const processed = []
    for (const p of itemsToAdd) {
      const imagesList = p?.images?.length ? p.images : (p?.image ? [p.image] : [])
      const fixedPrice = Number.isFinite(Number(p?.fixedPrice)) ? Number(p.fixedPrice) : (Number.isFinite(Number(p?.price)) ? Number(p.price) : 0)
      const buyPrice = Number.isFinite(Number(p?.buyPrice)) ? Number(p.buyPrice) : 0
      const baseSlug = p.slug || slugify(p.name || 'product')
      let slug = baseSlug
      let counter = 1
      while (catalogue.some(existing => existing.slug === slug) || processed.some(existing => existing.slug === slug)) {
        slug = `${baseSlug}-${counter++}`
      }

      let parsedStock = {}
      if (typeof p.stock === 'object' && p.stock !== null && !Array.isArray(p.stock)) {
        parsedStock = p.stock
      } else if (typeof p.stock === 'string') {
        parsedStock = Object.fromEntries(
          p.stock
            .split(',')
            .map((item) => item.trim().split(':'))
            .filter(([k, v]) => k && v !== undefined)
            .map(([k, v]) => [k.trim(), Number(v) || 0])
        )
      } else if (Number.isFinite(Number(p.stock))) {
        parsedStock = { 'Free Size': Number(p.stock) }
      }

      const sizesList = Array.isArray(p.sizes)
        ? p.sizes
        : (typeof p.sizes === 'string'
            ? p.sizes.split(',').map((s) => s.trim()).filter(Boolean)
            : Object.keys(parsedStock).length ? Object.keys(parsedStock) : ['Free Size'])

      const coloursList = Array.isArray(p.colours)
        ? p.colours
        : (typeof p.colours === 'string' ? p.colours.split(',').map((c) => c.trim()).filter(Boolean) : [])

      const isPending = p.pending !== undefined ? Boolean(p.pending) : (p.status === 'PENDING')

      const newProduct = {
        id: p.id || crypto.randomUUID(),
        name: p.name || 'Untitled Dress',
        collection: p.collection || 'Kurtis',
        price: fixedPrice,
        fixedPrice,
        buyPrice,
        description: p.description || '',
        sizes: isPending ? (Array.isArray(p.sizes) ? p.sizes : []) : (sizesList.length ? sizesList : ['Free Size']),
        colours: coloursList,
        colorVariants: Array.isArray(p.colorVariants) ? p.colorVariants : [],
        stock: parsedStock,
        image: imagesList[0] || '',
        images: imagesList,
        featured: Boolean(p.featured),
        pending: isPending,
        status: isPending ? 'PENDING' : (p.status || 'ACTIVE'),
        published: isPending ? false : (p.published !== undefined ? Boolean(p.published) : true),
        soldCount: Number(p.soldCount) || 0,
        totalSoldRevenue: Number(p.totalSoldRevenue) || 0,
        sales: Array.isArray(p.sales) ? p.sales : [],
        slug,
        updatedAt: new Date().toISOString()
      }
      processed.push(newProduct)
    }

    const next = [...processed, ...catalogue]
    await saveProducts(next)
    return json({ count: processed.length, products: processed })
  }
  // Toggle published status
  if (path.startsWith('admin/products/') && path.endsWith('/toggle-publish') && method === 'PATCH') {
    const id = path.split('/')[2]
    const item = catalogue.find((p) => p.id === id)
    if (!item) return json({ error: 'Product not found.' }, 404)
    item.published = !item.published
    item.updatedAt = new Date().toISOString()
    await saveProducts(catalogue)
    return json({ product: item })
  }
  // Record sale
  if (path.startsWith('admin/products/') && path.endsWith('/sell') && method === 'POST') {
    const id = path.split('/')[2]
    const item = catalogue.find((p) => p.id === id)
    if (!item) return json({ error: 'Product not found.' }, 404)
    const body = await requestBody(request)
    const quantity = Number(body?.quantity)
    const soldPrice = Number(body?.soldPrice)
    const size = body?.size || ''
    if (!Number.isFinite(quantity) || quantity <= 0) return json({ error: 'Please provide a valid quantity.' }, 400)
    if (!Number.isFinite(soldPrice) || soldPrice < 0) return json({ error: 'Please provide a valid sold price.' }, 400)

    const currentTotalStock = Object.values(item.stock || {}).reduce((sum, q) => sum + (Number(q) || 0), 0)
    if (quantity > currentTotalStock) {
      return json({ error: `Cannot sell ${quantity} items. Only ${currentTotalStock} currently in stock.` }, 400)
    }

    // Deduct stock: if size provided, deduct from that size; otherwise deduct proportionally or from first available
    const stockCopy = { ...(item.stock || {}) }
    if (size && stockCopy[size] !== undefined) {
      if (stockCopy[size] < quantity) {
        return json({ error: `Only ${stockCopy[size]} available in size ${size}.` }, 400)
      }
      stockCopy[size] = Math.max(0, stockCopy[size] - quantity)
    } else {
      let remainingToDeduct = quantity
      for (const s of Object.keys(stockCopy)) {
        if (remainingToDeduct <= 0) break
        const available = Number(stockCopy[s]) || 0
        const take = Math.min(available, remainingToDeduct)
        stockCopy[s] = available - take
        remainingToDeduct -= take
      }
    }

    const newTotalStock = Object.values(stockCopy).reduce((sum, q) => sum + (Number(q) || 0), 0)
    const autoDisabled = newTotalStock <= 0
    if (autoDisabled) {
      item.published = false
    }

    item.stock = stockCopy
    item.soldCount = (Number(item.soldCount) || 0) + quantity
    item.totalSoldRevenue = (Number(item.totalSoldRevenue) || 0) + (soldPrice * quantity)

    // Deduct stock from specific colorVariant if colour specified
    const colour = body?.colour || ''
    if (colour && Array.isArray(item.colorVariants)) {
      const v = item.colorVariants.find((cv) => cv.colour === colour)
      if (v && v.stock && v.stock[size] !== undefined) {
        v.stock[size] = Math.max(0, (Number(v.stock[size]) || 0) - quantity)
      }
    }

    item.sales = [
      ...(Array.isArray(item.sales) ? item.sales : []),
      {
        quantity,
        soldPrice,
        size: size || 'General',
        colour: colour || '',
        timestamp: new Date().toISOString()
      }
    ]
    item.updatedAt = new Date().toISOString()

    await saveProducts(catalogue)
    return json({
      product: item,
      autoDisabled,
      remainingStock: newTotalStock,
      message: autoDisabled
        ? `Sale recorded. Total stock is now 0. This product has been automatically disabled from the storefront!`
        : `Sale recorded. Remaining stock: ${newTotalStock}.`
    })
  }
  // Discard all pending products
  if (path === 'admin/products/discard-pending' && method === 'POST') {
    const remaining = catalogue.filter((item) => !item.pending && item.status !== 'PENDING')
    const discardedCount = catalogue.length - remaining.length
    await saveProducts(remaining)
    return json({ ok: true, discarded: discardedCount })
  }
  // Hugging Face Direct Vision AI Image Analysis
  if (path === 'admin/ai/analyze-image' && method === 'POST') {
    const body = await requestBody(request)
    const imageBase64 = body?.imageBase64
    const mimeType = body?.mimeType || 'image/jpeg'
    const model = body?.model || 'Qwen/Qwen2.5-VL-72B-Instruct'
    const token = body?.hfToken || process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN

    if (!token) {
      return json({ error: 'Hugging Face API token is required. Please provide a token in the Hugging Face AI settings.' }, 400)
    }
    if (!imageBase64) {
      return json({ error: 'No image data received for analysis.' }, 400)
    }

    const prompt = `You are an expert Indian boutique cataloguer for "PAPA'S BOUTIQUE".
Inspect this dress/clothing photo carefully and return ONLY a valid raw JSON object (strictly NO markdown fences, no conversational text) with these exact keys:
{
  "name": "Attractive Product Title (e.g. Zari Embroidered Silk Kurti)",
  "collection": "Category (Choose ONLY one from: Kurtis, Leggings, Dupatta, Sarees, Occasion, Everyday Ease)",
  "description": "2-3 attractive sentences describing the fabric, neckline, sleeves, embroidery, and styling tips.",
  "colours": ["Primary Color Name"]
}`

    try {
      const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64
      const dataUrl = `data:${mimeType};base64,${cleanBase64}`

      const hfResponse = await fetch('https://router.huggingface.co/hf-inference/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: dataUrl } }
              ]
            }
          ],
          max_tokens: 450,
          temperature: 0.1
        })
      })

      if (!hfResponse.ok) {
        const errText = await hfResponse.text()
        let parsedErr = errText
        try { parsedErr = JSON.parse(errText).error || errText } catch {}
        return json({ error: `Hugging Face API error (${hfResponse.status}): ${typeof parsedErr === 'object' ? JSON.stringify(parsedErr) : parsedErr}` }, hfResponse.status)
      }

      const result = await hfResponse.json()
      const content = result?.choices?.[0]?.message?.content || ''
      const cleanJson = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
      let parsedProduct = {}
      try {
        parsedProduct = JSON.parse(cleanJson)
      } catch {
        const match = cleanJson.match(/\{[\s\S]*\}/)
        if (match) parsedProduct = JSON.parse(match[0])
        else throw new Error('Could not parse AI response into JSON')
      }

      return json({ success: true, product: parsedProduct })
    } catch (err) {
      return json({ error: 'AI analysis failed: ' + (err.message || String(err)) }, 500)
    }
  }
  if (path.startsWith('admin/products/') && method === 'DELETE') {
    const id = path.split('/')[2]
    await saveProducts(catalogue.filter((item) => item.id !== id))
    return json({ ok: true })
  }
  return json({ error: 'Not found.' }, 404)
}
