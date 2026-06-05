import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req) => {
  // 1. CORS - Autoriser les appels depuis ton site GitHub Pages
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    });
  }

  try {
    const { prompt, systemPrompt, model = 'deepseek' } = await req.json();
    
    let apiKey = '';
    let apiUrl = '';
    let body = {};

    if (model === 'deepseek') {
      apiKey = Deno.env.get('DEEPSEEK_API_KEY') || '';
      apiUrl = 'https://api.deepseek.com/chat/completions';
      body = { 
        model: 'deepseek-chat', 
        max_tokens: 1024, // Sécurité anti-gaspillage
        messages: [
          { role: 'system', content: systemPrompt || 'Assistant ColisConnect' }, 
          { role: 'user', content: prompt }
        ] 
      };
    } else if (model === 'kimi') {
      apiKey = Deno.env.get('KIMI_API_KEY') || '';
      apiUrl = 'https://api.moonshot.cn/v1/chat/completions';
      body = { 
        model: 'moonshot-v1-8k', 
        messages: [
          { role: 'system', content: systemPrompt || 'Assistant ColisConnect' }, 
          { role: 'user', content: prompt }
        ] 
      };
    } else if (model === 'gemini') {
        apiKey = Deno.env.get('GEMINI_API_KEY') || '';
        apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
        body = { contents: [{ parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }] };
    }

    if (!apiKey && model !== 'gemini') {
      throw new Error(`La clé pour le modèle ${model} n'est pas configurée dans Supabase.`);
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: (model === 'gemini') ? { 'Content-Type': 'application/json' } : {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});
