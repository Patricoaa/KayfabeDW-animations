import type {Metadata} from 'next';
import {DM_Sans, JetBrains_Mono, Space_Grotesk} from 'next/font/google';
import {Providers} from '@/components/ui/providers';
import '../../styles/global.css';

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: 'KayfabeDW Animations',
  description: 'Wrestling statistics video generator',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`dark antialiased ${dmSans.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body className="bg-background text-primary font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
