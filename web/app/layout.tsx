import type { Metadata } from 'next';
import { Providers } from '@/components/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'TokenTrim - Optimize Your AI Prompts, Save Tokens',
  description: 'TokenTrim helps developers write more efficient prompts for AI coding assistants. Reduce token costs by up to 60% while getting better results.',
  keywords: ['AI', 'prompt optimization', 'token savings', 'vibe coding', 'LLM', 'developer tools'],
  authors: [{ name: 'TokenTrim' }],
  openGraph: {
    title: 'TokenTrim - Optimize Your AI Prompts',
    description: 'Reduce token costs by up to 60% while getting better AI results.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-ink-950 text-ink-50 antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}













