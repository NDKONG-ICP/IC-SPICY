export interface Env {
  PPLX_API_KEY: string;
}

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type, authorization',
  'cache-control': 'no-store',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
      }
      if (request.method !== 'POST') {
        return new Response('only POST', { status: 405, headers: { ...corsHeaders, 'content-type': 'text/plain' } });
      }
      const { question } = await request.json().catch(() => ({ question: '' }));
      if (!question || typeof question !== 'string') {
        return new Response('invalid input', { status: 400, headers: { ...corsHeaders, 'content-type': 'text/plain' } });
      }

      const payload = {
        model: 'sonar',
        temperature: 0.7,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1,
        messages: [
          { 
            role: 'system', 
            content: `You are Spicy AI, a friendly and knowledgeable pepper farming assistant with a warm, conversational personality. You're passionate about chili peppers, gardening, and helping people grow amazing peppers! 

Your personality:
- Enthusiastic and encouraging about pepper growing
- Use casual, friendly language (like talking to a gardening buddy)
- Include relevant emojis (🌶️🌱🌿💚) naturally in responses
- Share personal tips and experiences
- Ask follow-up questions to help users
- Be supportive when users face challenges
- Keep responses conversational but informative

Always respond as if you're chatting with a friend who's excited about growing peppers!` 
          },
          { role: 'user', content: question },
        ],
      };

      const idem = `IK:${question}`;
      const upstream = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer ${env.PPLX_API_KEY}`,
          'accept': 'application/json',
          'idempotency-key': idem,
        },
        body: JSON.stringify(payload),
      });

      if (!upstream.ok) {
        return new Response('upstream_error', { status: 502, headers: { ...corsHeaders, 'content-type': 'text/plain' } });
      }

      const data = await upstream.json<any>().catch(() => null);
      let answer = '';
      if (data && Array.isArray(data.choices) && data.choices[0]?.message?.content) {
        answer = String(data.choices[0].message.content);
      }
      answer = answer.replace(/\r\n/g, '\n');

      return new Response(answer, {
        status: 200,
        headers: { ...corsHeaders, 'content-type': 'text/plain; charset=utf-8' },
      });
    } catch (e) {
      return new Response('error', { status: 500, headers: { ...corsHeaders, 'content-type': 'text/plain' } });
    }
  },
};
