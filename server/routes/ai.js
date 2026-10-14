// ============================================================
// AI Routes — /api/ai (Gemini Health Navigator)
// ============================================================

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

const SYSTEM_PROMPT = `You are the Heal in India Health Navigator — a friendly, helpful AI assistant for a healthcare and medical wellness tourism platform in India.

Your role:
- Help users discover Ayurveda, Panchakarma, and modern medical treatments in India
- Explain treatments, conditions, and wellness options in simple, accessible language
- Suggest relevant treatment categories and cities to visit
- Answer general questions about Ayush (AYAM) health systems, wellness tourism, and medical travel to India
- Help users understand what to expect from wellness retreats, detox programs, and traditional therapies

STRICT RULES — NEVER VIOLATE:
1. You are NOT a doctor and do NOT provide medical diagnoses
2. Never recommend specific medications or dosages  
3. For any emergency, ALWAYS say: "Please call emergency services (112 in India) or go to the nearest hospital immediately."
4. Never claim any treatment will cure a serious medical condition
5. Always encourage users to consult qualified healthcare professionals
6. Add disclaimers when discussing health-specific information

You should:
- Be warm, empathetic, and supportive
- Use simple, non-medical language where possible
- Recommend relevant clinic types (Ayurveda, Panchakarma, Integrative, etc.) and cities
- Mention popular treatments like Abhyanga, Shirodhara, Panchakarma when relevant
- Keep responses concise (2-4 paragraphs max)

Platform context:
- India's top wellness cities: Kerala (Kochi, Thrissur), Rishikesh, Goa, Jaipur, Mysuru, Delhi, Mumbai, Bengaluru
- Treatment categories: Ayurveda, Panchakarma, Modern Medicine, Wellness Retreat, Diagnostics, Integrative
- International patients can apply for Ayush Visa for medical wellness tourism`;

const DISCLAIMER = '\n\n---\n*⚠️ This is general wellness information, not medical advice. Please consult a qualified healthcare professional for diagnosis and treatment.*';

async function callGemini(userMessage, history = []) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  if (!apiKey || apiKey === 'your_gemini_api_key') {
    return getMockResponse(userMessage);
  }

  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({
      model,
      systemInstruction: SYSTEM_PROMPT
    });

    const chat = geminiModel.startChat({
      history: history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      }))
    });

    const result = await chat.sendMessage(userMessage);
    return result.response.text() + DISCLAIMER;
  } catch (err) {
    console.error('[Gemini API Error]', err.message);
    return getMockResponse(userMessage);
  }
}

function getMockResponse(message) {
  const lower = message.toLowerCase();

  if (lower.includes('panchakarma')) {
    return `Panchakarma is Ayurveda's classical 5-step detoxification and rejuvenation therapy. The name means "five actions" — referring to Vamana (emesis), Virechana (purgation), Basti (enema), Nasyam (nasal cleansing), and Raktamokshana (blood purification). 

Most people don't need all five procedures — a qualified Vaidya will design your program based on your constitution (Prakriti) and current imbalances.

**Best places for Panchakarma in India:** Kerala (especially Kochi, Thrissur) for authentic classical protocols, Rishikesh for Himalayan settings, and Goa for a beach wellness combination.

A typical program runs 7-21 days and includes dietary guidance, herbal medicines, and gentle yoga.${DISCLAIMER}`;
  }

  if (lower.includes('ayurveda') || lower.includes('ayurvedic')) {
    return `Ayurveda is India's 5,000-year-old system of natural medicine, recognized by the WHO. It's based on the concept of three doshas — Vata, Pitta, and Kapha — and aims to maintain their balance for health and longevity.

On this platform, you'll find verified Ayurveda centers ranging from traditional Vaidyasalas to modern integrative clinics. Popular treatments include Abhyanga (oil massage), Shirodhara (oil stream on forehead), and Kizhi (herbal bolus therapy).

**Recommended starting point:** Book an Ayurvedic consultation (Nadi Pariksha + Prakriti analysis) to understand your constitution before choosing treatments.${DISCLAIMER}`;
  }

  if (lower.includes('visa') || lower.includes('travel') || lower.includes('international')) {
    return `India offers an **Ayush Visa** specifically for international visitors seeking traditional medicine, yoga, and wellness treatments. This is different from a medical visa.

**Key eligibility:** You must have an invitation letter from a NABH/AYUSH-certified clinic or wellness center. Our platform's verified providers can issue such letters.

**Typical workflow:**
1. Choose your clinic and treatment package
2. Request a support letter through the Travel & Visa section
3. Apply for Ayush Visa at your nearest Indian embassy
4. Arrive and begin your wellness journey

Popular wellness states: Kerala (Ayurveda), Uttarakhand (Yoga), Rajasthan (Heritage wellness), Goa (Beach wellness).${DISCLAIMER}`;
  }

  if (lower.includes('anxiety') || lower.includes('stress') || lower.includes('sleep')) {
    return `Ayurveda and integrative wellness offer several well-regarded approaches for stress, anxiety, and sleep issues. Always consult a healthcare professional first for proper evaluation.

**Traditional approaches worth exploring:**
- **Shirodhara** — rhythmic oil stream on the forehead, deeply calming for the nervous system
- **Abhyanga** — daily warm oil massage to pacify Vata (the stress-related dosha)
- **Nasya** — nasal therapy with medicated oils for mental clarity
- **Yoga Nidra** — conscious relaxation technique, often called "yogic sleep"
- **Brahmi and Ashwagandha** — Ayurvedic herbs sometimes used for cognitive support (consult Vaidya for dosing)

Many of our wellness retreats offer 5-21 day stress management programs combining these therapies.${DISCLAIMER}`;
  }

  if (lower.includes('diabetes') || lower.includes('blood sugar')) {
    return `Several Ayurvedic and integrative medicine approaches are studied for metabolic health support alongside conventional diabetes management. **Do not stop or modify any prescribed medications without consulting your doctor.**

Integrative wellness programs may include:
- Dietary guidance following Ayurvedic principles (low-glycemic, cooked foods)
- Yoga and pranayama (breath practices) which may support metabolic health
- Herbal formulations — only under qualified Vaidya supervision
- Panchakarma for systemic cleansing (contraindicated in certain stages — doctor review required)

On our platform, you'll find **Integrative Health Clinics** that combine modern medicine monitoring with Ayurvedic lifestyle approaches.${DISCLAIMER}`;
  }

  // Generic helpful response
  return `Welcome to Heal in India! I'm your AI wellness navigator, here to help you explore India's rich healthcare and wellness traditions.

I can help you with:
- 🌿 **Ayurveda & Panchakarma** — traditional healing systems
- 🏥 **Modern Medicine** — hospitals and specialist clinics
- 🧘 **Wellness Retreats** — yoga, meditation, naturopathy
- 🔬 **Diagnostics** — health checkup packages
- ✈️ **Medical Tourism** — Ayush Visa and travel guidance

What would you like to explore? You can ask me about specific treatments, conditions, or I can help you find the right type of clinic for your needs.${DISCLAIMER}`;
}

// ---- POST /api/ai/chat ----
router.post('/chat', [
  body('message').trim().isLength({ min: 1, max: 2000 }).withMessage('Message required (max 2000 chars)'),
  body('history').optional().isArray()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { message, history = [] } = req.body;

  // Safety check: filter emergency keywords
  const emergencyKeywords = ['chest pain', 'heart attack', 'stroke', 'unconscious', 'bleeding heavily', 'suicide', 'overdose', 'can\'t breathe'];
  const isEmergency = emergencyKeywords.some(k => message.toLowerCase().includes(k));

  if (isEmergency) {
    return res.json({
      response: '🚨 **This sounds like a medical emergency.** Please call **112** (India Emergency) or go to the nearest hospital immediately. Do not wait for online help in an emergency situation. Your safety is the priority.',
      isEmergency: true
    });
  }

  try {
    const response = await callGemini(message, history.slice(-10)); // Keep last 10 messages for context
    res.json({ response, isEmergency: false });
  } catch (err) {
    console.error('[AI/Chat]', err);
    res.status(500).json({ error: 'AI assistant is temporarily unavailable. Please try again.' });
  }
});

// ---- GET /api/ai/suggestions — Treatment suggestions based on query ----
router.get('/suggestions', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);

  const suggestions = [
    { label: 'Panchakarma Detox', category: 'panchakarma', emoji: '🌿' },
    { label: 'Ayurveda Consultation', category: 'ayurveda', emoji: '🏺' },
    { label: 'Shirodhara', category: 'ayurveda', emoji: '💆' },
    { label: 'Yoga Retreat', category: 'wellness', emoji: '🧘' },
    { label: 'Full Body Health Checkup', category: 'diagnostics', emoji: '🔬' },
    { label: 'Stress Management Program', category: 'wellness', emoji: '🧠' },
    { label: 'Weight Loss Program', category: 'wellness', emoji: '⚖️' },
    { label: 'Diabetes Management', category: 'integrated', emoji: '💉' },
    { label: 'Skin & Beauty Therapies', category: 'ayurveda', emoji: '✨' },
    { label: 'Joint Pain & Arthritis', category: 'ayurveda', emoji: '🦴' },
    { label: 'Cardiac Wellness', category: 'modern_medicine', emoji: '❤️' },
    { label: 'Fertility & Reproductive Health', category: 'integrated', emoji: '🌱' }
  ].filter(s => s.label.toLowerCase().includes(q.toLowerCase())).slice(0, 5);

  res.json(suggestions);
});

module.exports = router;
