'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useTheme} from '@/components/ui/theme';
import {logout} from '@/app/actions/auth';
import {LogOut, Sun, Moon} from 'lucide-react';

const NAV_ITEMS = [
  {href: '/builder', label: 'Builder'},
  {href: '/builder/gallery', label: 'Galería'},
  {href: '/history', label: 'Historial'},
];

export function BuilderNav() {
  const pathname = usePathname();
  const {theme, toggleTheme} = useTheme();

  return (
    <nav className="flex items-center gap-1 text-sm">
      {NAV_ITEMS.map((item, i) => (
        <span key={item.href} className="flex items-center gap-1">
          {i > 0 && <span className="text-muted">/</span>}
          <Link
            href={item.href}
            className={`px-2 py-1 rounded transition-colors ${
              pathname === item.href
                ? 'text-primary bg-card-hover'
                : 'text-muted hover:text-primary hover:bg-card-hover'
            }`}
          >
            {item.label}
          </Link>
        </span>
      ))}
      <span className="flex items-center gap-1">
        <span className="text-muted">/</span>
        <form action={logout}>
          <button
            type="submit"
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-muted hover:text-red-500 hover:bg-card-hover transition-colors"
            aria-label="Cerrar sesión"
          >
            <LogOut size={14} />
          </button>
        </form>
        <button
          onClick={toggleTheme}
          className="ml-1 px-2 py-1 rounded text-muted hover:text-primary hover:bg-card-hover transition-colors"
          aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </span>
    </nav>
  );
}