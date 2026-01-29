
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Box, IconButton } from '@mui/material';
import { MyLocation as MyLocationIcon } from '@mui/icons-material';

// Leaflet marker icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const circleOptions = {
    color: '#6C63FF',
    fillColor: '#6C63FF',
    fillOpacity: 0.2,
};

// This component centralizes map control logic
const MapController = ({ setSelectedLocation, selectedLocation }) => {
    const map = useMap();

    // Effect to resize map correctly in modal
    useEffect(() => {
        // This is the crucial fix. The timeout ensures that we invalidate the map's size
        // *after* the modal has finished its opening animation. This is a robust way
        // to ensure Leaflet can correctly measure its container.
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 400); // A longer delay to be safe with animations

        return () => clearTimeout(timer);
    }, [map]);

    // Effect to pan the map to the selected location
    useEffect(() => {
        if (selectedLocation) {
            map.flyTo([selectedLocation.lat, selectedLocation.lng], 15);
        }
    }, [selectedLocation, map]);

    // Hook to handle clicks on the map
    useMapEvents({
        click(e) {
            setSelectedLocation(e.latlng);
        },
    });

    return null;
}


const MapPicker = ({ onLocationSelect, radius = 50 }) => {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [initialCenter] = useState([-3.745, -38.523]); // Default center

  // This effect synchronizes the internal state with the parent form state
  useEffect(() => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocation]);


  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const currentLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          // This will trigger the marker update and pan effect in MapController
          setSelectedLocation(currentLocation);
        },
        () => {
          alert("Could not get your location. Please ensure location services are enabled and permission is granted.");
        }
      );
    } else {
        alert("Geolocation is not supported by this browser.");
    }
  };

  return (
    <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
        <MapContainer center={initialCenter} zoom={13} style={mapContainerStyle} >
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            <MapController setSelectedLocation={setSelectedLocation} selectedLocation={selectedLocation} />

            {selectedLocation && (
                <>
                    <Marker position={selectedLocation} />
                    <Circle center={selectedLocation} radius={radius} pathOptions={circleOptions} />
                </>
            )}
        </MapContainer>
        <IconButton
            onClick={handleGetCurrentLocation}
            aria-label="get current location"
            sx={{
                position: 'absolute',
                bottom: 10,
                right: 10,
                zIndex: 1000,
                backgroundColor: 'white',
                color: '#333',
                '&:hover': {
                    backgroundColor: '#f4f4f4',
                },
                padding: '8px'
            }}
        >
            <MyLocationIcon />
        </IconButton>
    </Box>
  );
};

export default MapPicker;
