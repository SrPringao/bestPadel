import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const GDL_BOUNDS = [
  [20.53, -103.50],
  [20.80, -103.20]
];

const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const clubIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapCard({ userCoords, clubesDisponibles, isLoadingLocation }) {
  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">
        Mapa de clubes
      </h3>
      <div className="relative h-64 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
        <MapContainer
          center={[20.67, -103.38]}
          zoom={12}
          className="h-full w-full"
          maxBounds={GDL_BOUNDS}
          minZoom={11}
          maxZoom={18}
          style={{ background: '#1e293b' }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            bounds={GDL_BOUNDS}
            noWrap={true}
          />
          {userCoords && (
            <Marker position={[userCoords.lat, userCoords.lon]} icon={userIcon}>
              <Popup>Tu ubicacion</Popup>
            </Marker>
          )}
          {clubesDisponibles.map((c, i) => (
            <Marker key={i} position={[c.lat, c.lon]} icon={clubIcon}>
              <Popup>
                <div className="font-semibold">{c.name}</div>
                <div className="text-sm text-slate-600">{c.zone}</div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        {isLoadingLocation && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-md bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs shadow-lg border border-slate-200 dark:border-slate-700 flex items-center gap-2">
            <div className="animate-spin h-3.5 w-3.5 border-2 border-emerald-500 rounded-full border-t-transparent" />
            <span>Obteniendo ubicacion...</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default MapCard;
