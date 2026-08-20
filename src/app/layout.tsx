import type {Metadata} from 'next';
import '../../styles/global.css';

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
    <html lang="es" className="dark">
      <body className="bg-zinc-950 text-white antialiased">{children}</body>
    </html>
  );
}
