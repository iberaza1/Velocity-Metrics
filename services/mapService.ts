export class MapService {
  private static isLoaded = false;

  static async load(): Promise<void> {
    if (this.isLoaded) return;

    if ((window as any).google && (window as any).google.maps) {
      this.isLoaded = true;
      return;
    }

    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        // Check for the base google maps object. 
        // Tracker.tsx will handle specific library imports via importLibrary.
        if ((window as any).google && (window as any).google.maps) {
          this.isLoaded = true;
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
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