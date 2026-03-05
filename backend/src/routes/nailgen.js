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

const COLOR_PROMPTS = {
  'blanco':       'painted in opaque white gel polish',
  'nude':         'painted in nude beige gel polish, skin-tone natural finish',
  'amarillo':     'painted in bright yellow gel polish',
  'naranja':      'painted in vivid orange gel polish',
  'terracota':    'painted in terracotta burnt-orange gel polish',
  'coral':        'painted in coral pink-orange gel polish',
  'rojo':         'painted in deep red gel polish',
  'bordo':        'painted in dark burgundy wine-red gel polish',
  'rosa chicle':  'painted in hot pink fuchsia gel polish',
  'rosa':         'painted in soft pastel pink gel polish',
  'lila':         'painted in lilac lavender gel polish',
  'celeste':      'painted in light sky-blue gel polish',
  'azul':         'painted in cobalt blue gel polish',
  'azul marino':  'painted in deep navy blue gel polish',
  'verde':        'painted in mint green gel polish',
  'verde oscuro': 'painted in dark olive green gel polish',
  'dorado':       'painted in metallic gold gel polish',
  'plateado':     'painted in metallic silver gel polish',
  'negro':        'painted in matte black gel polish',
  'multicolor':   'each individual nail painted a completely different solid color: thumb is red, index finger is blue, middle finger is yellow, ring finger is green, pinky is purple — five distinct solid colors, one per nail, no mixing',
};

const STYLE_PROMPTS = {
  'solido': (colorStr) =>
    `${colorStr}, perfectly smooth opaque gel finish, no patterns, no art, pure single color coverage, high gloss shine`,

  'glitter': (colorStr) =>
    `${colorStr} gel base coat with dense fine glitter particles embedded throughout, ` +
    `uniform glitter coverage on every nail, small packed glitter flakes, sparkly shimmer, glossy gel top coat over glitter`,

  'french': (colorStr) =>
    `french manicure style: ${colorStr} gel polish covering the entire nail bed as base, ` +
    `thin clean white strip painted only on the very tip of each nail, ` +
    `sharp straight white tip line, classic elegant french manicure`,

  'cat eye': (colorStr) =>
    `${colorStr} deep dark gel polish base, cat eye magnetic powder effect: ` +
    `iridescent shifting shimmer concentrated in an oval glow in the center of each nail, ` +
    `the shimmer fades toward the edges leaving the sides darker, ` +
    `fine metallic magnetic microparticles catching light, ` +
    `duochrome iridescent finish that shifts between teal, blue and silver depending on angle, ` +
    `deep dimensional glow, glossy gel top coat, ` +
    `the effect looks like light reflecting inside a gemstone`,
};

const buildStylePrompt = (styleId, colorStr) => {
  const fn = STYLE_PROMPTS[styleId];
  if (!fn) return colorStr;
  return fn(colorStr);
};

const NEGATIVE_PROMPT_BASE =
  'cartoon, illustration, painting, drawing, 3d render, cgi, anime, ' +
  'ugly nails, broken nails, dirty nails, deformed hands, extra fingers, missing fingers, ' +
  'blurry, low quality, watermark, text, logo, out of focus, plastic look, fake nails, acrylic';

const NEGATIVE_PROMPTS = {
  'solido':  NEGATIVE_PROMPT_BASE + ', glitter, sparkle, patterns, art, french tip, cat eye, gradient',
  'glitter': NEGATIVE_PROMPT_BASE + ', solid plain nails, french tip, cat eye, matte finish',
  'french':  NEGATIVE_PROMPT_BASE + ', glitter, sparkle, cat eye, solid color nails, colored tips',
  'cat eye': NEGATIVE_PROMPT_BASE + ', glitter chunks, scattered glitter flakes, french tip, solid plain nails, matte finish, flat color',
};

const buildPrompt = (color, style) => {
  const colorStr  = COLOR_PROMPTS[color] || 'painted in neutral gel polish';
  const styleStr  = buildStylePrompt(style, colorStr);
  const negativePrompt = NEGATIVE_PROMPTS[style] || NEGATIVE_PROMPT_BASE;

  const prompt =
    `Professional beauty photography, extreme close-up macro photo of a woman's hand showing five fingers, ` +
    `fresh gel manicure on perfectly shaped medium oval nails, ${styleStr}, ` +
    `shot in a luxury nail salon, soft even studio lighting, no harsh shadows, ` +
    `Canon 100mm macro lens, razor-sharp nail detail, natural skin texture, ` +
    `photorealistic, 8k resolution`;

  return { prompt, negativePrompt };
};

// POST /api/nailgen — público con rate limit
router.post('/', genLimiter, async (req, res) => {
  const { color, style } = req.body;

  // Validar ANTES de consumir el intento de rate limit
  if (!color || !style) {
    return res.status(400).json({ success: false, error: 'Debés elegir un color y un estilo.' });
  }
  if (!COLOR_PROMPTS[color]) {
    return res.status(400).json({ success: false, error: 'Color no válido.' });
  }
  if (!STYLE_PROMPTS[style]) {
    return res.status(400).json({ success: false, error: 'Estilo no válido.' });
  }

  const apiKey = process.env.REPLICATE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, error: 'API de generación no configurada.' });
  }

  const { prompt, negativePrompt } = buildPrompt(color, style);

  try {
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
          negative_prompt: negativePrompt,
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
      const remaining = parseInt(res.getHeader('RateLimit-Remaining') ?? '0', 10);
      return res.status(500).json({ success: false, error: 'Error al generar el diseño. Intentá de nuevo.', remaining: remaining + 1 });
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
        const remaining = parseInt(res.getHeader('RateLimit-Remaining') ?? '0', 10);
        return res.status(500).json({ success: false, error: 'Error al generar el diseño. Intentá de nuevo.', remaining: remaining + 1 });
      }
    }

    if (!imageUrl) {
      const remaining = parseInt(res.getHeader('RateLimit-Remaining') ?? '0', 10);
      return res.status(504).json({ success: false, error: 'La generación tardó demasiado. Intentá de nuevo.', remaining: remaining + 1 });
    }

    const remaining = parseInt(res.getHeader('RateLimit-Remaining') ?? MAX_GENERATIONS, 10);
    res.json({ success: true, imageUrl, prompt, remaining });

  } catch (err) {
    console.error('Nailgen error:', err.message);
    res.status(500).json({ success: false, error: 'Error de conexión con el generador.' });
  }
});

export default router;