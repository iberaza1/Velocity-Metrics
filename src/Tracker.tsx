import React, { useState, useEffect } from 'react';

const Tracker = () => {
  const [velocity, setVelocity] = useState(0);

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setVelocity((pos.coords.speed || 0) * 3.6), // Convert m/s to km/h
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return (
    <div style={{ textAlign: 'center', padding: '50px', background: '#1a1a1a', color: 'white', minHeight: '100vh' }}>
      <h1>VELOCITY</h1>
      <div style={{ fontSize: '80px', fontWeight: 'bold' }}>{velocity.toFixed(1)}</div>
      <p>KM/H</p>
    </div>
  );
};

export default Tracker;
