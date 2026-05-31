import { readFile } from 'node:fs/promises';

const text = await readFile('.env', 'utf8');
for (const line of text.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
  const eq = trimmed.indexOf('=');
  const k = trimmed.slice(0, eq).trim();
  const v = trimmed.slice(eq + 1).trim();
  if (!(k in process.env)) process.env[k] = v;
}

const key = process.env.LLM_API_KEY;
const base = process.env.LLM_BASE_URL;
const model = process.env.LLM_MODEL;
const body = {
  model,
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: 'Reply with JSON only: {"ping":true}' },
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==',
        },
      },
    ],
  }],
  max_tokens: 256,
  temperature: 0.1,
};

const response = await fetch(`${base}/messages`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
  signal: AbortSignal.timeout(120000),
});

const detail = await response.text();
console.log('status', response.status);
console.log(detail.slice(0, 500));
