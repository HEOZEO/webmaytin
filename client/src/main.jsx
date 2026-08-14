import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { runLegacyUrlMigration } from './utils/legacyMigration'

// Run once before React mounts: replace any legacy image URLs (Unsplash,
// placeholder.com, etc.) cached in localStorage with the local fallback.
// Without this, returning users would still see broken images until they
// manually clear site data.
runLegacyUrlMigration()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
