import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LanguageProvider } from './i18n/LanguageContext.tsx'
import { BrandingProvider } from './context/BrandingContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <BrandingProvider>
        <App />
      </BrandingProvider>
    </LanguageProvider>
  </StrictMode>,
)
