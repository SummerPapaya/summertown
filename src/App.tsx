import { Routes, Route } from 'react-router';
import { Toaster } from '@/components/ui/sonner';
import { TownProvider } from '@/lib/town';
import Layout from '@/components/Layout';
import SparkleTrail from '@/components/SparkleTrail';
import ScrollToTop from '@/components/ScrollToTop';
import Home from '@/pages/Home';
import WindbellIsle from '@/pages/WindbellIsle';
import Journal from '@/pages/Journal';
import Visit from '@/pages/Visit';
import AppleAlbum from '@/pages/AppleAlbum';
import AppleAdmin from '@/pages/AppleAdmin';
import TownAdmin from '@/pages/TownAdmin';

export default function App() {
  return (
    <TownProvider>
      <ScrollToTop />
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/windbell-isle" element={<WindbellIsle />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/visit" element={<Visit />} />
          <Route path="/apple-album" element={<AppleAlbum />} />
          <Route path="/apple-admin" element={<AppleAdmin />} />
          <Route path="/town-admin" element={<TownAdmin />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </Layout>
      <Toaster position="bottom-center" />
      <SparkleTrail />
    </TownProvider>
  );
}
