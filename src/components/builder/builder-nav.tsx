'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useTheme} from '@/components/ui/theme';
import {Sun, Moon} from 'lucide-react';

const NAV_ITEMS = [
  {href: '/builder', label: 'Builder'},
  {href: '/builder/gallery', label: 'Galería'},
];

export function BuilderNav() {
  const pathname = usePathname();
  const {theme, toggleTheme} = useTheme();

  return (
    <nav className="flex items-center gap-1 text-sm">
      {NAV_ITEMS.map((item, i) => (
        <span key={item.href} className="flex items-center gap-1">
          {i > 0 && <span className="text-zinc-600">/</span>}
          <Link
            href={item.href}
            className={`px-2 py-1 rounded transition-colors ${
              pathname === item.href
                ? 'text-white bg-zinc-800'
                : 'text-zinc-500 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            {item.label}
          </Link>
        </span>
      ))}
      <button
        onClick={toggleTheme}
        className="ml-2 px-2 py-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-800/50 transition-colors"
        aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      >
        {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
      </button>
    </nav>
  );
}
