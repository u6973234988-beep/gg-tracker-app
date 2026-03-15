import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/database';
import { type NextRequest, NextResponse } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
      'https://rtjhmcuihwfqxbnefqur.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0amhtY3VpaHdmcXhibmVmcXVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1OTk5ODIsImV4cCI6MjA4OTE3NTk4Mn0.jvAX-enuCoXArFaySz4QYLlyuG7_BTfe8w2u1pWmKos',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: any) {
          cookiesToSet.forEach(({ name, value, options }: any) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Refresh session se esiste
  await supabase.auth.getUser();

  return response;
}
