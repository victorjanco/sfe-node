import { useEffect, useRef, useState } from 'react';
import { apiGet } from '../api/client';
import { Customer } from '../types';

interface Props {
  onSelect: (customer: Customer) => void;
  placeholder?: string;
}

export function CustomerSearch({ onSelect, placeholder = 'Buscar cliente por NIT o nombre' }: Props): JSX.Element {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
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
      apiGet<Customer[]>('/customer/autocomplete_customer', { search: query.trim() })
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

  function select(c: Customer): void {
    onSelect(c);
    setOpen(false);
    setResults([]);
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
          {results.map((c) => (
            <li key={c.id} className="autocomplete-item" onMouseDown={() => select(c)}>
              <span className="autocomplete-code">{c.nit}</span>
              <span>{c.invoiceName || c.name || '—'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}