'use client';

import { Search } from 'lucide-react';
import { Input } from '@/shared/ui/input';

interface CategorySearchProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export function CategorySearch({
  searchTerm,
  onSearchChange,
}: CategorySearchProps) {
  return (
    <div className="relative max-w-md">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Buscar categorias..."
        className="pl-10 h-9"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </div>
  );
}
