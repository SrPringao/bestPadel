import { useState, useEffect } from 'react';
import './index.css';
import DatePicker from 'react-datepicker';
import { format } from 'date-fns';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
const API_URL = import.meta.env.VITE_API_URL;

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
});


function App() {
  const now = new Date();
  const [fecha, setFecha] = useState(now);
  const [horaMinima, setHoraMinima] = useState(now);
  const [horaMaxima, setHoraMaxima] = useState(now);
  const [duracion, setDuracion] = useState(60);
  const [presupuesto, setPresupuesto] = useState(100);
  const [personas, setPersonas] = useState(4);
  const [club, setClub] = useState('');
  const [resultados, setResultados] = useState([]);
  const [clubesDisponibles, setClubesDisponibles] = useState([]);
  const [modoOscuro, setModoOscuro] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ordenarPor, setOrdenarPor] = useState('precio');
  const [zona, setZona] = useState('');
  const [distancia, setDistancia] = useState('');
  const [userCoords, setUserCoords] = useState(null);
  const [favoritos, setFavoritos] = useState([]);
  const [gruposAbiertos, setGruposAbiertos] = useState({});


  const presupuestoTotal = presupuesto * personas;

  const toggleFavorito = (item) => {
    const existe = favoritos.some(
      f => f.club === item.club && f.start_time === item.start_time && f.price === item.price
    );
    let nuevos;
    if (existe) {
      nuevos = favoritos.filter(
        f => !(f.club === item.club && f.start_time === item.start_time && f.price === item.price)
      );
    } else {
      nuevos = [...favoritos, item];
    }
    setFavoritos(nuevos);
    localStorage.setItem('favoritos', JSON.stringify(nuevos));
  };

  const toggleGrupo = (nombre) => {
    setGruposAbiertos(prev => ({ ...prev, [nombre]: !prev[nombre] }));
  };

  const buscar = async () => {
    setLoading(true);

    const fechaFormateada = format(fecha, 'yyyy-MM-dd');
    const horaFormateada = format(horaMinima, 'HH:mm');
    const horaMaxFormateada = format(horaMaxima, 'HH:mm');

    try {
      const response = await fetch(`${API_URL}/buscar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha: fechaFormateada,
          horaMinima: horaFormateada,
          horaMaxima: horaMaxFormateada,
          duracion: Number(duracion),
          presupuesto: Number(presupuestoTotal),
          personas: Number(personas)
        })
      });

      const data = await response.json();
      let opciones = data.opciones || [];
      setResultados(opciones);
      if (Notification.permission === 'granted') {
        new Notification(`Se encontraron ${opciones.length} opciones`);
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(p => {
          if (p === 'granted') {
            new Notification(`Se encontraron ${opciones.length} opciones`);
          }
        });
      }
    } catch (error) {
      console.error('Error al buscar:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const obtenerClubes = async () => {
      const res = await fetch(`${API_URL}/clubes`);
      const data = await res.json();
      setClubesDisponibles(data);
    };
    obtenerClubes();

    const favs = localStorage.getItem('favoritos');
    if (favs) {
      setFavoritos(JSON.parse(favs));
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      () => {}
    );
  }, []);

  const distanciaEntre = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const resultadosFiltrados = (() => {
    let base = club ? resultados.filter(r => r.club === club) : [...resultados];
    if (zona) {
      base = base.filter(r => {
        const info = clubesDisponibles.find(c => c.name === r.club);
        return info && info.zone === zona;
      });
    }
    if (distancia && userCoords) {
      base = base.filter(r => {
        const info = clubesDisponibles.find(c => c.name === r.club);
        if (!info) return false;
        const d = distanciaEntre(userCoords.lat, userCoords.lon, info.lat, info.lon);
        return d <= Number(distancia);
      });
    }

    if (ordenarPor === 'hora') {
      base.sort((a, b) => a.start_time.localeCompare(b.start_time));
    } else if (ordenarPor === 'distancia' && userCoords) {
      base.sort((a, b) => {
        const infoA = clubesDisponibles.find(c => c.name === a.club);
        const infoB = clubesDisponibles.find(c => c.name === b.club);
        const dA = infoA ? distanciaEntre(userCoords.lat, userCoords.lon, infoA.lat, infoA.lon) : Infinity;
        const dB = infoB ? distanciaEntre(userCoords.lat, userCoords.lon, infoB.lat, infoB.lon) : Infinity;
        return dA - dB;
      });
    } else {
      base.sort((a, b) => {
        const precioA = parseFloat(a.price.replace(' MXN', ''));
        const precioB = parseFloat(b.price.replace(' MXN', ''));
        if (precioA !== precioB) {
          return precioA - precioB;
        }
        return a.start_time.localeCompare(b.start_time);
      });
    }
    return base;
  })();

  const grupos = resultadosFiltrados.reduce((acc, r) => {
    if (!acc[r.club]) {
      const info = clubesDisponibles.find(c => c.name === r.club);
      const dist = info && userCoords ? distanciaEntre(userCoords.lat, userCoords.lon, info.lat, info.lon) : null;
      acc[r.club] = { info: { ...r, distance: dist }, slots: [] };
    }
    acc[r.club].slots.push(r);
    return acc;
  }, {});

  return (
    <div className={`min-h-screen p-4 transition-colors duration-300 ${modoOscuro ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-blue-50 to-gray-100 text-gray-900'}`}>
      <div className="max-w-3xl mx-auto bg-white text-black dark:bg-gray-900 dark:text-white shadow-2xl rounded-2xl p-8 transition-colors duration-300">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-4xl font-extrabold text-blue-700 dark:text-blue-300 text-center w-full">🎾 Buscador de Canchas</h1>
          <div className="flex justify-end mb-4">
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={modoOscuro}
                  onChange={() => setModoOscuro(!modoOscuro)}
                  className="sr-only "
                />
                <div className="w-14 h-8 bg-gray-300 dark:bg-gray-600 rounded-full shadow-inner transition duration-300" />
                <div
                  className={`absolute top-1 left-1 w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 bg-white flex items-center justify-center text-yellow-500 ${modoOscuro ? 'translate-x-6' : ''
                    }`}
                >
                  {modoOscuro ? '🌙' : '☀️'}
                </div>
              </div>
            </label>
          </div>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block mb-1 text-style">📅 Fecha:</label>
            <DatePicker
              selected={fecha}
              onChange={(date) => setFecha(date)}
              className="w-full p-2 border rounded-lg input-style"
              dateFormat="yyyy-MM-dd"
            />
          </div>

          <div>
            <label className="block mb-1 text-style">🕒 Hora mínima:</label>
            <DatePicker
              selected={horaMinima}
              onChange={(time) => setHoraMinima(time)}
              showTimeSelect
              showTimeSelectOnly
              timeIntervals={15}
              timeCaption="Hora"
              dateFormat="hh:mm aa"
              className="w-full p-2 border rounded-lg input-style"
            />
          </div>

          <div>
            <label className="block mb-1 text-style">🕒 Hora máxima:</label>
            <DatePicker
              selected={horaMaxima}
              onChange={(time) => setHoraMaxima(time)}
              showTimeSelect
              showTimeSelectOnly
              timeIntervals={15}
              timeCaption="Hora"
              dateFormat="hh:mm aa"
              className="w-full p-2 border rounded-lg input-style"
            />
          </div>


          <div>
            <label className="block mb-1 text-style">📏 Duración:</label>
            <select value={duracion} onChange={e => setDuracion(e.target.value)} className="w-full p-2 border rounded-lg input-style">
              <option value={30}>30 min</option>
              <option value={60}>60 min</option>
              <option value={90}>90 min</option>
              <option value={120}>120 min</option>
            </select>
          </div>

          <div>
            <label className="block mb-1 text text-style">💰 Presupuesto por persona:</label>
            <input type="number" value={presupuesto} onChange={e => setPresupuesto(e.target.value)} className="w-full p-2 border rounded-lg input-style" />
            <p className="text-sm text-gray-500 mt-1">Total: {presupuestoTotal} MXN</p>
          </div>

          <div>
            <label className="block mb-1 text-style">👥 Número de personas:</label>
            <input type="number" value={personas} onChange={e => setPersonas(e.target.value)} className="w-full p-2 border rounded-lg input-style" />
          </div>

          <div>
            <label className="block mb-1 text-style">🏟️ Filtro por club:</label>
            <select value={club} onChange={e => setClub(e.target.value)} className=" w-full p-2 border rounded-lg input-style">
              <option value="">Todos</option>
              {clubesDisponibles.map((c, i) => (
                <option key={i} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 text-style">Zona:</label>
            <select value={zona} onChange={e => setZona(e.target.value)} className="w-full p-2 border rounded-lg input-style">
              <option value="">Todas</option>
              {[...new Set(clubesDisponibles.map(c => c.zone))].map((z, i) => (
                <option key={i} value={z}>{z}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 text-style">Distancia máxima (km):</label>
            <input type="number" value={distancia} onChange={e => setDistancia(e.target.value)} className="w-full p-2 border rounded-lg input-style" />
          </div>

          <div>
            <label className="block mb-1 text-style text-center">Ordenar por:</label>
            <div className="flex justify-center space-x-2">
              <button
                type="button"
                onClick={() => setOrdenarPor('precio')}
                className={`px-4 py-2 rounded-full border transition-colors ${ordenarPor === 'precio'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-white border-gray-300'}`}
              >
                Precio
              </button>
              <button
                type="button"
                onClick={() => setOrdenarPor('hora')}
                className={`px-4 py-2 rounded-full border transition-colors ${ordenarPor === 'hora'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-white border-gray-300'}`}
              >
                Horario
              </button>
              <button
                type="button"
                onClick={() => setOrdenarPor('distancia')}
                className={`px-4 py-2 rounded-full border transition-colors ${ordenarPor === 'distancia'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-white border-gray-300'}`}
              >
                Cercanía
              </button>
            </div>
          </div>
        </div>



        <button
          onClick={buscar}
          disabled={loading}
          className={`mt-8 w-full flex justify-center items-center gap-2 bg-blue-600 text-white font-semibold py-3 rounded-xl transition ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'
            }`}
        >
          {loading ? (
            <>
              <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-white border-solid" />
              Buscando...
            </>
          ) : (
            <>
              🔍 Buscar
            </>
          )}
        </button>

        <h2 className="mt-10 text-2xl font-bold text-black">Resultados:</h2>
        {resultadosFiltrados.length === 0 && <p className="text-gray-500 mt-2">No se encontraron resultados.</p>}

        <ul className="mt-4 space-y-3">
          {Object.values(grupos).map((g, idx) => (
            <li key={idx} className="bg-white text-black dark:bg-gray-700 border border-gray-200 rounded-xl p-4 shadow-sm">
              <div
                className="flex justify-between items-center cursor-pointer"
                onClick={() => toggleGrupo(g.info.club)}
              >
                <div className="flex-1">
                  <a
                    href={g.info.link || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-blue-700 dark:text-blue-300 hover:underline"
                  >
                    {g.info.club}
                  </a>
                  {g.info.distance && (
                    <span className="text-sm text-gray-600 ml-2">a {g.info.distance.toFixed(1)} km</span>
                  )}
                </div>
                <span className="ml-2">{gruposAbiertos[g.info.club] ? '▾' : '▸'}</span>
              </div>
              {gruposAbiertos[g.info.club] && (
                <ul className="mt-2 space-y-2">
                  {g.slots.map((r, i) => {
                    const esFav = favoritos.some(f => f.club === r.club && f.start_time === r.start_time && f.price === r.price);
                    return (
                      <li key={i} className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-2 rounded">
                        <span>{r.start_time} ({r.duration} min)</span>
                        <div className="flex items-center space-x-2">
                          <button onClick={() => toggleFavorito(r)} className="text-lg">
                            {esFav ? '★' : '☆'}
                          </button>
                          <span className="font-medium text-green-600">{r.price}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          ))}
        </ul>

        {favoritos.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xl font-bold">Favoritos</h3>
            <ul className="mt-2 space-y-2">
              {favoritos.map((f, i) => (
                <li key={i} className="flex justify-between items-center bg-white dark:bg-gray-700 p-2 rounded">
                  <a
                    href={f.link || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 hover:underline"
                  >
                    {f.club} {f.start_time}
                  </a>
                  <span className="mx-2">{f.price}</span>
                  <button onClick={() => toggleFavorito(f)} className="text-lg">✕</button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <MapContainer center={[20.67, -103.38]} zoom={11} className="h-96 mt-8">
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {clubesDisponibles.map((c, i) => (
            <Marker key={i} position={[c.lat, c.lon]}>
              <Popup>{c.name}</Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

export default App;
