'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('fg_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const nextDark = stored ? stored === 'dark' : prefersDark;
    document.documentElement.classList.toggle('dark', nextDark);
    setDark(nextDark);
  }, []);

  function toggleTheme() {
    const nextDark = !dark;
    document.documentElement.classList.toggle('dark', nextDark);
    localStorage.setItem('fg_theme', nextDark ? 'dark' : 'light');
    setDark(nextDark);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={dark ? 'Usar tema claro' : 'Usar tema oscuro'}
      title={dark ? 'Tema claro' : 'Tema oscuro'}
      onClick={toggleTheme}
      className="text-muted-foreground hover:bg-muted"
    >
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}