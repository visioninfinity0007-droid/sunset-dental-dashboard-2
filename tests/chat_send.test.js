import { expect, test, vi } from 'vitest';
import { POST } from '../src/app/api/chat/[slug]/send/route';

// Mock the modules
vi.mock('next/headers', () => ({
  cookies: () => ({ get: vi.fn() }),
}));

vi.mock('@/lib/supabaseServer', () => {
  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }),
    },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };
  return { createClient: () => supabase };
});

test('Chat POST /send returns 503 if instance is disconnected', async () => {
  const { createClient } = await import('@/lib/supabaseServer');
  const supabase = createClient();
  
  // Setup mocks
  supabase.single.mockImplementationOnce(() => Promise.resolve({ data: { id: 'tenant-123' }, error: null })); // tenant
  supabase.single.mockImplementationOnce(() => Promise.resolve({ 
    data: { evolution_instance_name: 'test-inst', evolution_status: 'disconnected' }, 
    error: null 
  })); // instance
  
  const req = new Request('http://localhost/api/chat/test-slug/send', {
    method: 'POST',
    body: JSON.stringify({ phone: '1234567890', message: 'Hello', instanceId: 'inst-123' })
  });
  
  const res = await POST(req, { params: { slug: 'test-slug' } });
  
  expect(res.status).toBe(503);
  const data = await res.json();
  expect(data.error).toBe('WhatsApp instance is not connected. Reconnect from the Channels page.');
});
