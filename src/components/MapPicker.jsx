import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to handle map clicks
function LocationMarker({ onLocationSelect, radius }) {
  const [position, setPosition] = useState(null);

  const map = useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      onLocationSelect({ lat, lng });
    },
  });

  return position === null ? null : (
    <>
      <Marker position={position} />
      <Circle center={position} radius={radius} />
    </>
  );
}

const MapPicker = ({ onLocationSelect, initialLocation = null, radius = 50 }) => {
  const [center, setCenter] = useState([40.7128, -74.0060]); // Default to NYC

  useEffect(() => {
    if (initialLocation) {
      setCenter([initialLocation.lat, initialLocation.lng]);
    }
  }, [initialLocation]);

  return (
    <div style={{ width: '100%', height: '384px', border: '1px solid #d1d5db', borderRadius: '0.5rem', overflow: 'hidden' }}>
      <MapContainer
        center={center}
        zoom={16}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <LocationMarker onLocationSelect={onLocationSelect} radius={radius} />
        {initialLocation && (
          <>
            <Marker position={[initialLocation.lat, initialLocation.lng]} />
            <Circle center={[initialLocation.lat, initialLocation.lng]} radius={radius} />
          </>
        )}
      </MapContainer>
    </div>
  );
};

export default MapPicker;