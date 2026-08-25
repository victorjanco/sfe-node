import { useEffect, useRef, useState } from 'react';
import { apiGet } from '../api/client';
import { Product } from '../types';

interface Props {
  onSelect: (product: Product) => void;
  placeholder?: string;
}

export function ProductSearch({ onSelect, placeholder = 'Buscar producto por código o nombre' }: Props): JSX.Element {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      apiGet<Product[]>('/product/autocomplete_product', { search: query.trim() })
        .then((data) => setResults(data))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent): void {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function select(p: Product): void {
    onSelect(p);
    setOpen(false);
    setResults([]);
    setQuery('');
  }

  return (
    <div className="autocomplete" ref={boxRef}>
      <input
        type="text"
        className="input"
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {loading && <div className="autocomplete-hint">Buscando…</div>}
      {open && results.length > 0 && (
        <ul className="autocomplete-list">
          {results.map((p) => (
            <li key={p.id} className="autocomplete-item" onMouseDown={() => select(p)}>
              <span className="autocomplete-code">{p.code}</span>
              <span>{p.tradename}</span>
              <span className="autocomplete-price">Bs {p.sellingPrice}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}