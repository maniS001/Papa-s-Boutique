import { getStore } from '@netlify/blobs'
import crypto from 'node:crypto'

const PRODUCTS_KEY = 'catalogue.json'
const store = () => getStore({ name: 'boutique-data', consistency: 'strong' })
const imageStore = () => getStore({ name: 'boutique-images', consistency: 'strong' })
const seedProducts = [
  { id: 'rose-midi', slug: 'rose-garden-midi', name: 'Rose Garden Midi', collection: 'Summer Edit', price: 4890, description: 'A softly structured midi dress in a rose garden print, finished with a square neckline and a flowing skirt.', sizes: ['XS', 'S', 'M', 'L'], colours: ['Rose', 'Ivory'], stock: { XS: 3, S: 7, M: 5, L: 2 }, image: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=1000&q=85', featured: true, published: true },
  { id: 'saffron-silk', slug: 'saffron-silk-slip', name: 'Saffron Silk Slip', collection: 'Occasion', price: 7290, description: 'An elegant bias-cut satin slip dress with a low back and delicate adjustable straps.', sizes: ['S', 'M', 'L'], colours: ['Saffron'], stock: { S: 4, M: 6, L: 3 }, image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=1000&q=85', featured: true, published: true },
  { id: 'linen-wrap', slug: 'linen-wrap-dress', name: 'Linen Wrap Dress', collection: 'Everyday Ease', price: 3990, description: 'Breathable linen with a flattering adjustable wrap waist for effortless days out.', sizes: ['XS', 'S', 'M', 'L', 'XL'], colours: ['Oat', 'Terracotta'], stock: { XS: 4, S: 8, M: 8, L: 4, XL: 2 }, image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=85', featured: false, published: true },
]
const ALLOWED_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' }
const MAX_IMAGE_BYTES = 8 * 1024 * 1024 // 8 MB
const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    ...headers
  }
})
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
  // AI Token Verification Endpoint
  if (path === 'admin/ai/verify-token' && method === 'POST') {
    const body = await requestBody(request)
    const rawToken = body?.token || body?.hfToken || process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN || process.env.GEMINI_API_KEY || ''
    const cleanToken = rawToken.trim().replace(/^Bearer\s+/i, '').replace(/^['"]|['"]$/g, '')
    const provider = body?.provider || (cleanToken.startsWith('AIza') ? 'gemini' : 'hf')

    if (!cleanToken) {
      return json({ ok: false, error: 'Token is empty. Please enter an API token.' }, 400)
    }

    try {
      if (provider === 'gemini') {
        const testRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${cleanToken}`)
        if (testRes.ok) {
          const mData = await testRes.json()
          const valid = (mData.models || [])
            .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
            .map((m) => (m.name || '').replace(/^models\//, ''))
          const flashModel = valid.find((m) => m.includes('2.5-flash') || m.includes('2.0-flash')) || valid[0] || 'gemini-2.5-flash'
          return json({
            ok: true,
            provider: 'gemini',
            message: `Connected to Google Gemini Vision! Active model: ${flashModel}`
          })
        }
        const errText = await testRes.text()
        return json({ ok: false, error: 'Invalid Google Gemini API Key. Please check your key at https://aistudio.google.com/app/apikey' }, 401)
      } else {
        const testRes = await fetch('https://huggingface.co/api/whoami-v2', {
          headers: { 'Authorization': `Bearer ${cleanToken}` }
        })
        if (!testRes.ok) {
          return json({
            ok: false,
            error: 'Hugging Face rejected this token (401: Invalid username or password).\n\nPlease verify your token at https://huggingface.co/settings/tokens.'
          }, 401)
        }
        const data = await testRes.json()
        const username = data.name || data.fullname || 'Hugging Face User'

        // Check if token has permission to call Inference Providers
        try {
          const inferCheck = await fetch('https://router.huggingface.co/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${cleanToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'Qwen/Qwen2.5-VL-72B-Instruct',
              messages: [{ role: 'user', content: 'hello' }],
              max_tokens: 1
            })
          })

          if (inferCheck.status === 403) {
            return json({
              ok: false,
              error: `Token authenticated as @${username}, but is missing "Inference Providers" permission!\n\nTo fix:\n1. Go to https://huggingface.co/settings/tokens\n2. Edit this token (or click "Create new token")\n3. Check the box: "Make calls to Inference Providers" (or select "Read" under User Permissions)\n4. Save and paste the updated token.`
            }, 403)
          }
        } catch {}

        return json({
          ok: true,
          provider: 'hf',
          username: username,
          message: `Connected as @${username}! Hugging Face Vision AI is ready.`
        })
      }
    } catch (err) {
      return json({ ok: false, error: 'Could not reach API: ' + (err.message || String(err)) }, 500)
    }
  }

  // Automatic Batch Analysis & Dress Grouping Endpoint
  if (path === 'admin/ai/batch-analyze' && method === 'POST') {
    const body = await requestBody(request)
    const items = Array.isArray(body?.items) ? body.items : []
    if (!items.length) {
      return json({ error: 'No photos provided for batch analysis.' }, 400)
    }

    const rawToken = body?.token || body?.hfToken || process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN || process.env.GEMINI_API_KEY || ''
    const cleanToken = rawToken.trim().replace(/^Bearer\s+/i, '').replace(/^['"]|['"]$/g, '')
    const provider = body?.provider || (cleanToken.startsWith('AIza') ? 'gemini' : 'hf')
    const model = body?.model || (provider === 'gemini' ? 'gemini-2.5-flash' : 'Qwen/Qwen2.5-VL-72B-Instruct')

    if (!cleanToken) {
      return json({ error: 'API token is required for auto-analysis.' }, 400)
    }

    try {
      if (provider === 'gemini') {
        // Multi-image batch grouping via Google Gemini Vision
        let discoveredModels = []
        try {
          const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${cleanToken}`)
          if (listRes.ok) {
            const listData = await listRes.json()
            const valid = (listData.models || [])
              .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
              .map((m) => (m.name || '').replace(/^models\//, ''))
              .filter((name) => name.toLowerCase().includes('gemini'))

            const preferred = [
              'gemini-2.5-flash',
              'gemini-2.0-flash',
              'gemini-2.5-flash-latest',
              'gemini-2.0-flash-001',
              'gemini-2.0-flash-exp',
              'gemini-1.5-flash-latest',
              'gemini-1.5-flash',
              'gemini-2.5-pro',
              'gemini-2.0-pro-exp',
              'gemini-1.5-pro'
            ]
            discoveredModels = valid.sort((a, b) => {
              const idxA = preferred.indexOf(a)
              const idxB = preferred.indexOf(b)
              if (idxA !== -1 && idxB !== -1) return idxA - idxB
              if (idxA !== -1) return -1
              if (idxB !== -1) return 1
              return a.localeCompare(b)
            })
          }
        } catch (e) {
          console.warn('Gemini ListModels query failed:', e.message)
        }

        const requestedModel = (body?.model || 'gemini-2.5-flash').replace(/^models\//, '')
        const candidateModels = Array.from(new Set([
          requestedModel,
          ...discoveredModels,
          'gemini-2.5-flash',
          'gemini-2.0-flash',
          'gemini-2.5-flash-latest',
          'gemini-2.0-flash-001',
          'gemini-1.5-flash-latest',
          'gemini-1.5-flash',
          'gemini-2.5-pro'
        ].filter(Boolean)))

        const promptText = `You are an expert fashion inventory cataloguer for "PAPA'S BOUTIQUE".
I am providing photos of boutique dresses. Each photo is numbered in order.
Carefully examine and compare all photos to organize our store inventory according to these 3 STRICT RULES:

1. MULTIPLE POSES OF THE SAME DRESS (ONE COLOR):
   - If multiple photos show the EXACT SAME dress in the same color (e.g. front angle, back angle, model pose, detail shot):
   - Group all these photos into ONE single product!
   - "colours": ["Color Name"] (ONLY ONE color).
   - "colorVariants": [] (empty array, because there are NO separate color variants).
   - "imageIndices": list of the 1-based indices of these photos (e.g. [1, 2]).

2. SAME DRESS DESIGN IN MULTIPLE COLORS:
   - If photos show the EXACT SAME dress cut, neckline, fabric, and embroidery pattern, but in DIFFERENT colors (e.g. one in Maroon and one in Mustard):
   - Group them into ONE single product with the same dress title and description!
   - "colours": ["Maroon", "Mustard"].
   - "colorVariants": [
       { "colour": "Maroon", "imageIndices": [1] },
       { "colour": "Mustard", "imageIndices": [2] }
     ].
   - "imageIndices": list of all photo indices for this dress.

3. DIFFERENT DRESS DESIGNS:
   - If dresses have DIFFERENT prints, DIFFERENT cuts, DIFFERENT necklines, or DIFFERENT fabrics:
   - Strictly output as SEPARATE products! NEVER combine different dress styles.

Return ONLY a valid JSON array of products:
[
  {
    "name": "Attractive Product Title (e.g. Zari Embroidered Chanderi Kurti)",
    "collection": "Category (Choose ONLY one: Kurtis, Leggings, Dupatta, Sarees, Occasion, Everyday Ease)",
    "description": "2-3 attractive sentences describing the fabric, neckline, sleeves, embroidery, and styling tips.",
    "colours": ["Color 1"],
    "colorVariants": [],
    "imageIndices": [1, 2]
  }
]`

        const parts = [{ text: promptText }]
        for (let i = 0; i < items.length; i++) {
          const it = items[i]
          const cleanB64 = it.base64?.includes(',') ? it.base64.split(',')[1] : (it.base64 || '')
          parts.push({ text: `\n[Photo ${i + 1}: ${it.name || 'image'}]` })
          parts.push({
            inline_data: {
              mime_type: it.mimeType || 'image/jpeg',
              data: cleanB64
            }
          })
        }

        let parsedList = null
        let lastGeminiErr = null

        for (const candModel of candidateModels) {
          const apiVersions = ['v1beta', 'v1']
          let success = false

          for (const apiVer of apiVersions) {
            try {
              const geminiRes = await fetch(`https://generativelanguage.googleapis.com/${apiVer}/models/${candModel}:generateContent?key=${cleanToken}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts }],
                  generationConfig: {
                    responseMimeType: 'application/json',
                    temperature: 0.1
                  }
                })
              })

              if (geminiRes.ok) {
                const geminiData = await geminiRes.json()
                const rawContent = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || ''
                const cleanJson = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
                try {
                  parsedList = JSON.parse(cleanJson)
                } catch {
                  const m = cleanJson.match(/\[[\s\S]*\]/)
                  if (m) parsedList = JSON.parse(m[0])
                }

                if (parsedList) {
                  success = true
                  break
                }
              } else {
                const errText = await geminiRes.text()
                let parsedErr = errText
                try { parsedErr = JSON.parse(errText).error?.message || errText } catch {}
                lastGeminiErr = `Gemini ${candModel} (${apiVer}): ${parsedErr}`
                console.warn(lastGeminiErr)
              }
            } catch (netErr) {
              lastGeminiErr = `Network error calling ${candModel}: ${netErr.message}`
              console.warn(lastGeminiErr)
            }
          }

          if (success && parsedList) break
        }

        if (!parsedList) {
          throw new Error(`Auto-grouping failed across Gemini models: ${lastGeminiErr || 'Unknown error'}`)
        }

        const finalProducts = (Array.isArray(parsedList) ? parsedList : [parsedList]).map((p) => {
          const indices = Array.isArray(p.imageIndices) ? p.imageIndices : [1]
          const productImages = indices.map((idx) => items[idx - 1]?.url).filter(Boolean)
          const finalVariants = (Array.isArray(p.colorVariants) ? p.colorVariants : []).map((v) => {
            const vIndices = Array.isArray(v.imageIndices) ? v.imageIndices : []
            const vImgs = vIndices.map((idx) => items[idx - 1]?.url).filter(Boolean)
            return {
              colour: v.colour || 'Standard',
              images: vImgs.length ? vImgs : productImages,
              image: vImgs[0] || productImages[0] || ''
            }
          })

          return {
            name: p.name || 'Boutique Dress',
            collection: p.collection || 'Kurtis',
            description: p.description || '',
            colours: Array.isArray(p.colours) ? p.colours : (p.colours ? [p.colours] : []),
            colorVariants: finalVariants,
            images: productImages.length ? productImages : [items[0]?.url || ''],
            image: productImages[0] || items[0]?.url || '',
            buyPrice: '',
            fixedPrice: '',
            price: 0,
            sizes: [],
            stock: {},
            pending: true,
            status: 'PENDING',
            published: false
          }
        })

        return json({ success: true, products: finalProducts })
      } else {
        // Hugging Face: Inspect each image to extract dress signature & intelligently auto-group
        const candidateModels = Array.from(new Set([
          model,
          'Qwen/Qwen2.5-VL-72B-Instruct',
          'deepseek-ai/DeepSeek-V4.1-Flash',
          'google/gemma-3-27b-it',
          'google/gemma-3-4b-it'
        ].filter(Boolean)))

        let activeModel = candidateModels[0]
        const itemSignatures = []

        for (let i = 0; i < items.length; i++) {
          const it = items[i]
          const cleanB64 = it.base64?.includes(',') ? it.base64.split(',')[1] : (it.base64 || '')
          const dataUrl = `data:${it.mimeType || 'image/jpeg'};base64,${cleanB64}`
          const imgUrl = (it.url && it.url.startsWith('http')) ? it.url : dataUrl

          const prompt = `You are a fashion cataloguer for "PAPA'S BOUTIQUE". Inspect this photo and return ONLY a raw JSON object with:
{
  "name": "Attractive Product Title (e.g. Zari Embroidered Silk Kurti)",
  "collection": "Category (Choose ONLY one: Kurtis, Leggings, Dupatta, Sarees, Occasion, Everyday Ease)",
  "description": "2-3 attractive sentences describing the fabric, neckline, sleeves, embroidery, and styling tips.",
  "primaryColor": "Exact Color Name (e.g. Navy Blue, Maroon, Mustard Yellow, Jet Black, Emerald Green)",
  "garmentCut": "Classification (e.g. Straight Kurti, Anarkali, A-line Kurti, Leggings, Silk Dupatta)",
  "patternDesign": "Pattern Style (e.g. Floral Embroidery, Solid Plain, Zari Booti, Bandhani, Geometric)",
  "fabric": "Fabric type (e.g. Rayon, Silk, Cotton, Georgette, Chanderi)"
}`

          let parsed = null
          let lastErr = null
          const modelsToTry = [activeModel, ...candidateModels.filter((m) => m !== activeModel)]

          for (const currentModel of modelsToTry) {
            try {
              const hfRes = await fetch('https://router.huggingface.co/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${cleanToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  model: currentModel,
                  messages: [
                    {
                      role: 'user',
                      content: [
                        { type: 'text', text: prompt },
                        { type: 'image_url', image_url: { url: imgUrl } }
                      ]
                    }
                  ],
                  max_tokens: 350,
                  temperature: 0.1
                })
              })

              if (hfRes.ok) {
                const hfData = await hfRes.json()
                const content = hfData?.choices?.[0]?.message?.content || ''
                const cleanJson = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
                try {
                  parsed = JSON.parse(cleanJson)
                } catch {
                  const m = cleanJson.match(/\{[\s\S]*\}/)
                  if (m) parsed = JSON.parse(m[0])
                }

                if (parsed) {
                  activeModel = currentModel
                  break
                }
              } else {
                const errText = await hfRes.text()
                let parsedErr = errText
                try { parsedErr = JSON.parse(errText).error?.message || JSON.parse(errText).error || errText } catch {}
                lastErr = typeof parsedErr === 'object' ? JSON.stringify(parsedErr) : parsedErr
                console.warn(`HF model ${currentModel} error:`, lastErr)
              }
            } catch (netErr) {
              lastErr = netErr.message
              console.warn(`Network error on ${currentModel}:`, netErr.message)
            }
          }

          if (!parsed) {
            if (i === 0) {
              return json({
                error: `Hugging Face API error: ${lastErr}\n\nPlease check that your token at https://huggingface.co/settings/tokens has "Make calls to Inference Providers" enabled.`
              }, 400)
            }
            parsed = {
              name: `Dress (${it.name.replace(/\.[^.]+$/, '')})`,
              collection: 'Kurtis',
              description: 'Elegant boutique dress crafted with fine detailing.',
              primaryColor: 'Standard',
              garmentCut: 'Kurti',
              patternDesign: it.name,
              fabric: 'Cotton'
            }
          }

          itemSignatures.push({
            item: it,
            data: parsed
          })
        }

        // Automatic Grouping Algorithm:
        // 1. If two photos share same garmentCut + patternDesign + fabric:
        //    - If same primaryColor -> Different poses of same dress! (1 color, 0 variants, multiple photos)
        //    - If different primaryColor -> Same dress in multiple colors! (Grouped with colorVariants)
        // 2. Otherwise -> Strictly separate products!
        const groupedMap = new Map()

        for (const sig of itemSignatures) {
          const d = sig.data || {}
          const cut = (d.garmentCut || 'Kurti').toLowerCase().trim()
          const pattern = (d.patternDesign || d.name || '').toLowerCase().trim()
          const collection = d.collection || 'Kurtis'
          const groupKey = `${collection}::${cut}::${pattern}`

          if (!groupedMap.has(groupKey)) {
            groupedMap.set(groupKey, {
              name: d.name || `Boutique ${cut}`,
              collection: collection,
              description: d.description || 'Thoughtfully chosen silhouette for beautiful moments.',
              photosByColor: new Map()
            })
          }

          const group = groupedMap.get(groupKey)
          const colName = (d.primaryColor || 'Standard').trim()
          if (!group.photosByColor.has(colName)) {
            group.photosByColor.set(colName, [])
          }
          group.photosByColor.get(colName).push(sig.item.url)
        }

        const finalProducts = []
        for (const group of groupedMap.values()) {
          const colorsList = Array.from(group.photosByColor.keys())
          const allImages = Array.from(group.photosByColor.values()).flat()

          if (colorsList.length > 1) {
            // Case B: Same dress in MULTIPLE colors
            const colorVariants = colorsList.map((col) => ({
              colour: col,
              images: group.photosByColor.get(col),
              image: group.photosByColor.get(col)[0] || allImages[0]
            }))

            finalProducts.push({
              name: group.name,
              collection: group.collection,
              description: group.description,
              colours: colorsList,
              colorVariants: colorVariants,
              images: allImages,
              image: allImages[0] || '',
              buyPrice: '',
              fixedPrice: '',
              price: 0,
              sizes: [],
              stock: {},
              pending: true,
              status: 'PENDING',
              published: false
            })
          } else {
            // Case A: Multiple poses of SAME dress in ONE color (no extra variants needed!)
            finalProducts.push({
              name: group.name,
              collection: group.collection,
              description: group.description,
              colours: colorsList,
              colorVariants: [], // Empty! Single color dress with multiple pose photos
              images: allImages,
              image: allImages[0] || '',
              buyPrice: '',
              fixedPrice: '',
              price: 0,
              sizes: [],
              stock: {},
              pending: true,
              status: 'PENDING',
              published: false
            })
          }
        }

        return json({ success: true, products: finalProducts })
      }
    } catch (err) {
      return json({ error: 'Auto-grouping failed: ' + (err.message || String(err)) }, 500)
    }
  }

  // Hugging Face Direct Vision AI Image Analysis (single image fallback)
  if (path === 'admin/ai/analyze-image' && method === 'POST') {
    const body = await requestBody(request)
    const imageBase64 = body?.imageBase64
    const mimeType = body?.mimeType || 'image/jpeg'
    const model = body?.model || 'Qwen/Qwen2.5-VL-72B-Instruct'
    const rawToken = body?.hfToken || process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN || ''
    const token = rawToken.trim().replace(/^Bearer\s+/i, '').replace(/^['"]|['"]$/g, '')

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

      const hfResponse = await fetch('https://router.huggingface.co/v1/chat/completions', {
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
        try { parsedErr = JSON.parse(errText).error?.message || JSON.parse(errText).error || errText } catch {}
        if (typeof parsedErr === 'object') parsedErr = JSON.stringify(parsedErr)
        const tip = '\n\n💡 RECOMMENDED FIX: Switch the AI Vision Provider dropdown to "Google Gemini Vision"! Google AI Studio provides 100% FREE access forever with no credit limits at https://aistudio.google.com/app/apikey.'
        return json({ error: `Hugging Face API error (${hfResponse.status}): ${parsedErr}${tip}` }, hfResponse.status)
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
