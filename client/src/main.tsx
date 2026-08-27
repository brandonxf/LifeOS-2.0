import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'react-hot-toast';
import { setDefaultOptions } from 'date-fns';
import { es } from 'date-fns/locale';
import App from './App';
import { BiometricGate } from './components/BiometricGate';
import { ConfirmDialogHost } from './components/ConfirmDialogHost';
import { SplashGate } from './components/SplashGate';

// Localiza todas las fechas (date-fns) a español.
setDefaultOptions({ locale: es });
import { queryClient } from './lib/queryClient';
import { initWidgetSync } from './lib/widgetSync';
import './index.css';

initWidgetSync(queryClient);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="life-os-theme">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <SplashGate>
            <BiometricGate>
              <App />
            </BiometricGate>
          </SplashGate>
          <ConfirmDialogHost />
          <Toaster
            position="bottom-right"
            toastOptions={{
              className:
                '!bg-ink-850 !text-slate-100 !border !border-white/10 !rounded-xl !text-sm',
            }}
          />
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
