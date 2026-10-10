import { GOOGLE_MAPS_API_KEY } from '../config';

const SCRIPT_ID = 'google-maps-js';
const LOAD_TIMEOUT_MS = 10000;

const hasMaps = () => !!((window as any).google && (window as any).google.maps && (window as any).google.maps.Map);

export class MapService {
  private static loadPromise: Promise<void> | null = null;

  static load(): Promise<void> {
    if (hasMaps()) return Promise.resolve();
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = new Promise<void>((resolve, reject) => {
      let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.id = SCRIPT_ID;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&v=weekly`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }

      const cleanup = () => {
        clearTimeout(timer);
        script!.removeEventListener('load', onLoad);
        script!.removeEventListener('error', onError);
      };
      const fail = (msg: string) => {
        cleanup();
        // Allow a later retry (e.g. after a network blip)
        script!.remove();
        this.loadPromise = null;
        reject(new Error(msg));
      };
      const onLoad = () => {
        if (hasMaps()) {
          cleanup();
          resolve();
        } else {
          fail('Google Maps script loaded but google.maps is unavailable');
        }
      };
      const onError = () => fail('Google Maps script failed to load');
      const timer = setTimeout(() => (hasMaps() ? (cleanup(), resolve()) : fail('Google Maps load timed out')), LOAD_TIMEOUT_MS);

      script.addEventListener('load', onLoad);
      script.addEventListener('error', onError);
    });

    return this.loadPromise;
  }

  static getDarkMapStyles() {
    return [
      { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#475569' }] },
      { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
      { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
      { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#334155' }] },
      { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
      { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#020617' }] },
      { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#334155' }] }
    ];
  }
}