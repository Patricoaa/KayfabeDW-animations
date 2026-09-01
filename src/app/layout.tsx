import type {Metadata} from 'next';
import {DM_Sans, Inter, JetBrains_Mono, Playfair_Display, Space_Grotesk} from 'next/font/google';
import {Providers} from '@/components/ui/providers';
import '../../styles/global.css';

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const inter = Inter({
  variable: '--font-inter',
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

const playfair = Playfair_Display({
  variable: '--font-playfair-display',
  subsets: ['latin'],
  weight: ['400', '600', '700'],
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
      className={`dark antialiased ${dmSans.variable} ${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} ${playfair.variable}`}
    >
      <body className="bg-background text-primary font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
