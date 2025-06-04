import { useState, useEffect } from 'react';
import './index.css';
import DatePicker from 'react-datepicker';
import { format } from 'date-fns';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
const API_URL = import.meta.env.VITE_API_URL;

// Definir los límites de Guadalajara (aproximados)
const GDL_BOUNDS = [
  [20.53, -103.50], // Esquina suroeste
  [20.80, -103.20]  // Esquina noreste
];

function App() {
  const now = new Date();
  const [fecha, setFecha] = useState(now);
  const [horaMinima, setHoraMinima] = useState(now);
  const [horaMaxima, setHoraMaxima] = useState(() => {
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 45, 0);
    return endOfDay;
  });
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
  const [mostrarFavoritos, setMostrarFavoritos] = useState(false);
  const [mostrarMenu, setMostrarMenu] = useState(false);
  const [disponibilidadFavoritos, setDisponibilidadFavoritos] = useState({});

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

  // Función para verificar disponibilidad de favoritos
  const verificarDisponibilidadFavoritos = async () => {
    const favsFromStorage = localStorage.getItem('favoritos');
    if (favsFromStorage) {
      const favs = JSON.parse(favsFromStorage);
      const fechaHoy = format(new Date(), 'yyyy-MM-dd');
      
      try {
        const response = await fetch(`${API_URL}/buscar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fecha: fechaHoy,
            horaMinima: '00:00',
            horaMaxima: '23:59',
            duracion: 60,
            presupuesto: 100000,
            personas: 4
          })
        });

        const data = await response.json();
        const opcionesDisponibles = data.opciones || [];
        
        const disponibilidad = {};
        favs.forEach(fav => {
          disponibilidad[`${fav.club}-${fav.start_time}-${fav.price}`] = 
            opcionesDisponibles.some(
              opt => opt.club === fav.club && 
                    opt.start_time === fav.start_time && 
                    opt.price === fav.price
            );
        });
        
        setDisponibilidadFavoritos(disponibilidad);
      } catch (error) {
        console.error('Error al verificar disponibilidad:', error);
      }
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

    // Verificar disponibilidad al cargar
    verificarDisponibilidadFavoritos();
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
        if (!infoA || !infoB) return 0;
        const distA = distanciaEntre(userCoords.lat, userCoords.lon, infoA.lat, infoA.lon);
        const distB = distanciaEntre(userCoords.lat, userCoords.lon, infoB.lat, infoB.lon);
        return distA - distB;
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

  return (
    <div className={`min-h-screen p-4 transition-colors duration-300 ${modoOscuro ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-blue-50 to-gray-100 text-gray-900'}`}>
      <div className="flex flex-col lg:flex-row gap-4 max-w-7xl mx-auto relative">
        {/* Bloque principal */}
        <div className="flex-1">
          <div className="bg-white text-black dark:bg-gray-900 dark:text-white shadow-2xl rounded-2xl p-8 transition-colors duration-300">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-4xl font-extrabold text-blue-700 dark:text-blue-300 text-center w-full">🎾 Buscador de Canchas</h1>
              <div className="flex items-center gap-4">
                {/* Botón de menú para móvil */}
                <button
                  onClick={() => setMostrarMenu(!mostrarMenu)}
                  className="lg:hidden text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                  title="Menú"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={modoOscuro}
                      onChange={() => setModoOscuro(!modoOscuro)}
                      className="sr-only"
                    />
                    <div className="w-14 h-8 bg-gray-300 dark:bg-gray-600 rounded-full shadow-inner transition duration-300" />
                    <div
                      className={`absolute top-1 left-1 w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 bg-white flex items-center justify-center text-yellow-500 ${
                        modoOscuro ? 'translate-x-6' : ''
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
                    Distancia
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
              {resultadosFiltrados.map((r, idx) => {
                const esFav = favoritos.some(f => f.club === r.club && f.start_time === r.start_time && f.price === r.price);
                const clubInfo = clubesDisponibles.find(c => c.name === r.club);
                const distanciaAlClub = userCoords && clubInfo ? 
                  Math.round(distanciaEntre(userCoords.lat, userCoords.lon, clubInfo.lat, clubInfo.lon) * 10) / 10 
                  : null;

                return (
                  <li key={idx} className="bg-white text-black dark:bg-gray-700 border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div className="text-lg flex-1">
                      <a
                        href={r.link || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-blue-700 dark:text-blue-300 hover:underline"
                      >
                        {r.club}
                      </a> —  {r.start_time} ({r.duration} min)
                      {distanciaAlClub !== null && (
                        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                          📍 {distanciaAlClub} km
                        </span>
                      )}
                    </div>
                    <button onClick={() => toggleFavorito(r)} className="mr-4 text-xl">
                      {esFav ? '★' : '☆'}
                    </button>
                    <div className="text-right mt-2 sm:mt-0">
                      <p className="font-medium text-green-600">{r.price}</p>
                      <p className="text-sm text-gray-600">({r.pricePerPerson} por persona)</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Panel lateral derecho */}
        <div className={`
          fixed lg:relative lg:w-96
          top-0 right-0 h-full w-80
          transform transition-transform duration-300 ease-in-out
          ${mostrarMenu ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
          bg-white dark:bg-gray-900 shadow-2xl lg:shadow-xl
          z-50 lg:z-0
          rounded-xl
        `}>
          {/* Cabecera del panel lateral (solo móvil) */}
          <div className="lg:hidden flex justify-between items-center p-4 border-b dark:border-gray-700">
            <h2 className="font-semibold text-lg">Menú</h2>
            <button
              onClick={() => setMostrarMenu(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>

          {/* Contenedor del contenido del panel */}
          <div className="h-[calc(100%-56px)] lg:h-full flex flex-col">
            {/* Mapa (1/3 del alto) */}
            <div className="h-[300px] lg:h-[350px] rounded-xl overflow-hidden shadow-xl mx-4 mt-4">
              <MapContainer 
                center={userCoords ? [userCoords.lat, userCoords.lon] : [20.67, -103.38]} 
                zoom={12} 
                className="h-full w-full"
                maxBounds={GDL_BOUNDS}
                minZoom={11}
                maxZoom={18}
                boundsOptions={{ padding: [0, 0] }}
                style={{ background: '#fff' }}
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  bounds={GDL_BOUNDS}
                  noWrap={true}
                />
                {userCoords && (
                  <Marker 
                    position={[userCoords.lat, userCoords.lon]}
                    icon={new L.DivIcon({
                      className: 'custom-div-icon',
                      html: '<div style="background-color: #4299e1; width: 15px; height: 15px; border-radius: 50%; border: 2px solid white;"></div>',
                      iconSize: [15, 15],
                      iconAnchor: [7, 7]
                    })}
                  >
                    <Popup>Tu ubicación actual</Popup>
                  </Marker>
                )}
                {clubesDisponibles.map((c, i) => (
                  <Marker key={i} position={[c.lat, c.lon]}>
                    <Popup>{c.name}</Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            {/* Lista de favoritos */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <h3 className="text-xl font-bold flex items-center my-4">
                <span className="text-yellow-500 mr-2">★</span> 
                Mis Favoritos
              </h3>
              {favoritos.length > 0 ? (
                <div className="space-y-4">
                  {favoritos.map((f, i) => {
                    const clubInfo = clubesDisponibles.find(c => c.name === f.club);
                    const distanciaAlClub = userCoords && clubInfo ? 
                      Math.round(distanciaEntre(userCoords.lat, userCoords.lon, clubInfo.lat, clubInfo.lon) * 10) / 10 
                      : null;
                    const estaDisponible = disponibilidadFavoritos[`${f.club}-${f.start_time}-${f.price}`];

                    return (
                      <div key={i} className={`
                        relative rounded-lg p-4 shadow-sm hover:shadow-md transition-all
                        ${estaDisponible ? 'bg-gray-50 dark:bg-gray-800' : 'bg-red-50 dark:bg-red-900/20'}
                      `}>
                        {!estaDisponible && (
                          <div className="absolute top-2 right-2 text-xs text-red-600 dark:text-red-400 font-medium bg-red-100 dark:bg-red-900/40 px-2 py-1 rounded-full">
                            No disponible
                          </div>
                        )}
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg text-blue-600 dark:text-blue-400">{f.club}</h4>
                            <div className="mt-1 space-y-1">
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                <span className="inline-block w-20">Horario:</span> {f.start_time}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                <span className="inline-block w-20">Precio:</span> {f.price}
                              </p>
                              {distanciaAlClub !== null && (
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                  <span className="inline-block w-20">Distancia:</span> 📍 {distanciaAlClub} km
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 ml-2">
                            <button 
                              onClick={() => toggleFavorito(f)}
                              className="text-red-500 hover:text-red-600 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Eliminar de favoritos"
                            >
                              <span className="text-xl">✕</span>
                            </button>
                            {estaDisponible && f.link && (
                              <a
                                href={f.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-green-500 text-white px-3 py-1 rounded-full text-sm hover:bg-green-600 transition-colors text-center"
                                title="Reservar cancha"
                              >
                                Reservar
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <span className="text-2xl">★</span>
                  <p className="mt-2">No tienes canchas favoritas</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
