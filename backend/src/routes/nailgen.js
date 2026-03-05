import { Router } from 'express';
import rateLimit from 'express-rate-limit';

const router = Router();

const MAX_GENERATIONS = 3;

const genLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: MAX_GENERATIONS,
  keyGenerator: (req) => `nailgen:${req.ip}`,
  standardHeaders: true,  // expone RateLimit-Remaining en headers
  legacyHeaders: false,
  message: { success: false, error: 'Límite de generaciones alcanzado. Intentá de nuevo en una hora.', remaining: 0 },
});

// Paleta de colores predefinida
const COLOR_PROMPTS = {
  'rosa':         'soft pink, blush, rose tones',
  'rojo':         'red, deep crimson, cherry red tones',
  'nude':         'nude, beige, skin tone, natural colors',
  'lila':         'lilac, lavender, soft purple tones',
  'blanco':       'white, pearl, ivory, clean tones',
  'negro':        'black, dark, deep noir tones',
  'azul':         'blue, cobalt blue, ocean tones',
  'verde':        'green, mint, sage, emerald tones',
  'dorado':       'gold, metallic gold, champagne tones',
  'multicolor':   'each nail painted a different solid color, one color per nail, rainbow set of nails, colorful manicure',
  'coral':        'coral, peach, warm orange-pink tones',
  'bordo':        'bordeaux, burgundy, deep wine red tones',
  'naranja':      'orange, tangerine, warm vibrant orange',
  'amarillo':     'yellow, sunny yellow, soft lemon tones',
  'celeste':      'light blue, sky blue, baby blue tones',
  'azul marino':  'navy blue, dark blue, deep midnight tones',
  'verde oscuro': 'olive green, dark green, forest green tones',
  'plateado':     'silver, metallic silver, chrome tones',
  'rosa chicle':  'hot pink, fuchsia, vivid magenta tones',
  'terracota':    'terracotta, burnt orange, warm earthy tones',
};

const STYLE_PROMPTS = {
  'minimalista':  'minimalist, clean lines, simple elegant design',
  'nail art':     'detailed nail art, hand painted design, intricate patterns',
  'french':       'french manicure, classic french tip, elegant',
  'glitter':      'glitter, sparkle, shimmer, holographic effect',
  'flores':       'floral design, flowers, botanical, delicate petals',
  'geometrico':   'geometric patterns, lines, shapes, modern abstract',
  'degradado':    'gradient, ombre effect, color fade, blended tones',
  'marmol':       'marble effect, stone texture, elegant veining',
  'animal print': 'animal print, leopard spots, zebra stripes, wild pattern',
  'cromado':      'chrome effect, mirror finish, metallic reflective surface',
};

const NEGATIVE_PROMPT =
  'cartoon, illustration, painting, drawing, 3d render, cgi, anime, ' +
  'ugly nails, broken nails, dirty nails, deformed hands, extra fingers, ' +
  'blurry, low quality, watermark, text, logo, out of focus, plastic look, fake';

const translateToEnglish = async (text) => {
  if (!text) return null;
  try {
    const res = await fetch('https://libretranslate.com/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: 'es',
        target: 'en',
        format: 'text',
        api_key: process.env.LIBRETRANSLATE_API_KEY || '', // opcional en la instancia pública
      }),
    });
    const data = await res.json();
    return data.translatedText || text; // fallback al original si falla
  } catch {
    return text; // fallback silencioso
  }
};

const buildPrompt = (color, style, description) => {
  const colorStr  = COLOR_PROMPTS[color]  || color  || 'neutral tones';
  const styleStr  = STYLE_PROMPTS[style]  || style  || 'elegant design';
  const extraDesc = description ? `, ${description}` : '';

  // Prompt más específico: ancla el realismo fotográfico y el contexto de uñas
  return (
    `Extreme close-up macro photo of a real woman's hand with a fresh professional manicure, ` +
    `perfectly shaped oval nails, ${colorStr}, ${styleStr}${extraDesc}, ` +
    `photographed in a luxury nail salon, soft diffused natural light, ` +
    `canon 100mm macro lens, tack-sharp nail detail, realistic skin texture, ` +
    `photorealistic, 8k resolution, professional beauty photography`
  );
};

// POST /api/nailgen — público con rate limit
router.post('/', genLimiter, async (req, res) => {
  const { color, style, description } = req.body;

  const translatedDescription = await translateToEnglish(description);

  const apiKey = process.env.REPLICATE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, error: 'API de generación no configurada.' });
  }

  const prompt = buildPrompt(color, style, translatedDescription);

  try {
    // flux-dev: más lento que schnell pero notablemente más fotorrealista
    const createRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-dev/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait',
      },
      body: JSON.stringify({
        input: {
          prompt,
          negative_prompt: NEGATIVE_PROMPT,   // flux-dev acepta negative prompt
          num_outputs: 1,
          aspect_ratio: '1:1',
          output_format: 'webp',
          output_quality: 95,                  // subimos de 90 → 95
          num_inference_steps: 28,             // schnell usaba 4; dev necesita 25-50
          guidance_scale: 3.5,                 // valor recomendado para flux-dev
        },
      }),
    });

    const prediction = await createRes.json();

    if (!createRes.ok) {
      console.error('Replicate error:', prediction);
      return res.status(500).json({ success: false, error: 'Error al generar el diseño. Intentá de nuevo.' });
    }

    // Con Prefer: wait, si terminó ya tenemos la URL
    if (prediction.status === 'succeeded' && prediction.output?.[0]) {
      const remaining = parseInt(res.getHeader('RateLimit-Remaining') ?? MAX_GENERATIONS, 10);
      return res.json({ success: true, imageUrl: prediction.output[0], prompt, remaining });
    }

    // Polling — flux-dev puede tardar más que schnell
    const predictionId = prediction.id;
    let imageUrl = null;
    const maxAttempts = 40;          // más intentos para cubrir el tiempo extra

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, 2000));  // 2s entre polls

      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      const poll = await pollRes.json();

      if (poll.status === 'succeeded' && poll.output?.[0]) {
        imageUrl = poll.output[0];
        break;
      }
      if (poll.status === 'failed') {
        return res.status(500).json({ success: false, error: 'Error al generar el diseño. Intentá de nuevo.' });
      }
    }

    if (!imageUrl) {
      return res.status(504).json({ success: false, error: 'La generación tardó demasiado. Intentá de nuevo.' });
    }

    const remaining = parseInt(res.getHeader('RateLimit-Remaining') ?? MAX_GENERATIONS, 10);
    res.json({ success: true, imageUrl, prompt, remaining });

  } catch (err) {
    console.error('Nailgen error:', err.message);
    res.status(500).json({ success: false, error: 'Error de conexión con el generador.' });
  }
});

export default router;