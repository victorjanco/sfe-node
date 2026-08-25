import { useEffect, useRef, useState } from 'react';

interface Props {
  id: number;
  kind?: 'factura' | 'nota';
  onClose: () => void;
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function PdfViewer({ id, kind = 'factura', onClose }: Props): JSX.Element {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printType, setPrintType] = useState<'rollo' | 'carta'>('rollo');
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    async function load(): Promise<void> {
      setLoading(true);
      setError(null);
      setUrl(null);
      try {
        const base = kind === 'nota' ? 'notas' : '';
        const res = await fetch(`/api/facturas/${base}/${id}/pdf?printType=${printType}`, {
          headers: getAuthHeaders(),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error((body?.message as string) ?? `Error ${res.status}`);
        }
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setUrl(objectUrl);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error al cargar el PDF');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, kind, printType]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal pdf-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h4>{kind === 'nota' ? 'Nota de Venta' : 'Factura'} #{id}</h4>
          <label className="pdf-type-select">
            Formato:{' '}
            <select value={printType} onChange={(e) => setPrintType(e.target.value as 'rollo' | 'carta')}>
              <option value="rollo">Rollo (ticket)</option>
              <option value="carta">Carta (A4)</option>
            </select>
          </label>
          <button className="btn-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>
        <div className="modal-body pdf-body">
          {loading && <div className="text-center">Generando PDF…</div>}
          {error && (
            <div>
              <p className="error-text">{error}</p>
              <button className="btn" onClick={() => setUrl(null)}>
                Cerrar
              </button>
            </div>
          )}
          {url && (
            <iframe
              ref={iframeRef}
              src={url}
              title="Vista previa"
              className="pdf-iframe"
            />
          )}
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Cerrar
          </button>
          <button
            className="btn btn-primary"
            onClick={() => iframeRef.current?.contentWindow?.print()}
          >
            Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}