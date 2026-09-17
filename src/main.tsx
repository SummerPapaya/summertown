import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import './index.css';
import { TRPCProvider } from "@/providers/trpc"
import { LanguageProvider, resolveInitialLang } from '@/lib/i18n';
import App from './App.tsx';

/* Wait for the opening language before the first render instead of swapping it
   in afterwards — otherwise a visitor who is not in a Chinese-speaking country
   sees one frame of Chinese and then a reflow. The lookup was kicked off in
   index.html, so by the time this bundle has parsed it is usually resolved
   already; the ceiling in resolveInitialLang() covers the rest. */
void resolveInitialLang().then((initialLang) => {
  /* Set before render so html[lang='zh-CN'] picks the right font metrics for
     the very first paint, not one frame later. */
  document.documentElement.lang = initialLang === 'zh' ? 'zh-CN' : 'en';

  createRoot(document.getElementById('root')!).render(
    <BrowserRouter>
      <TRPCProvider>
        <LanguageProvider initialLang={initialLang}>
          <App />
        </LanguageProvider>
      </TRPCProvider>
    </BrowserRouter>,
  );
});
