import React, { useEffect, useState } from 'react';
import { resolveImage } from '../utils/imageHelper';
import api from '../services/api';

export default function DebugPage() {
  const [products, setProducts] = useState([]);
  const [loadStates, setLoadStates] = useState({});

  useEffect(() => {
    api.get('/api/products?limit=12')
      .then(r => setProducts(r.data.data || []))
      .catch(e => console.error('debug page: api fail', e));
  }, []);

  const handleImgLoad = (id, w, h) => {
    setLoadStates(prev => ({ ...prev, [id]: { status: 'OK', w, h } }));
  };
  const handleImgError = (id, src) => {
    setLoadStates(prev => ({ ...prev, [id]: { status: 'FAIL', src } }));
  };

  return (
    <div style={{ background: '#020617', color: 'white', minHeight: '100vh', padding: 24 }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>Debug Images</h1>
      <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
        Backend: <code>{window.location.origin}</code> (port 5173). Images served by backend on port 5000.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {products.map(p => {
          const src = resolveImage(p.image_url);
          const state = loadStates[p.id];
          return (
            <div key={p.id} style={{ background: '#1e293b', borderRadius: 12, padding: 12, fontSize: 12 }}>
              <div style={{
                width: '100%', aspectRatio: '16/9',
                background: 'linear-gradient(135deg,#1e293b,#020617)',
                borderRadius: 8, overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 8,
              }}>
                <img
                  src={src}
                  alt={p.name}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }}
                  onLoad={e => handleImgLoad(p.id, e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
                  onError={() => handleImgError(p.id, src)}
                />
              </div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{p.name}</div>
              <div style={{ color: '#64748b', fontSize: 10, wordBreak: 'break-all' }}>raw: {p.image_url}</div>
              <div style={{ color: '#64748b', fontSize: 10, wordBreak: 'break-all' }}>resolved: {src}</div>
              {state && (
                <div style={{
                  marginTop: 6, padding: 4, borderRadius: 4,
                  background: state.status === 'OK' ? '#064e3b' : '#7f1d1d',
                  color: state.status === 'OK' ? '#6ee7b7' : '#fca5a5',
                  fontSize: 10, fontWeight: 700
                }}>
                  {state.status === 'OK' ? `✓ LOADED ${state.w}×${state.h}` : `✗ FAIL: ${state.src}`}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}