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
  const [modoOscuro, setModoOscuro] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [loading, setLoading] = useState(false);
  const [ordenarPor, setOrdenarPor] = useState('precio');
  const [zona, setZona] = useState('');
  const [distancia, setDistancia] = useState('');
  const [userCoords, setUserCoords] = useState(null);
  const [favoritos, setFavoritos] = useState([]);
  const [mostrarFavoritos, setMostrarFavoritos] = useState(false);
  const [mostrarMenu, setMostrarMenu] = useState(false);
  const [disponibilidadFavoritos, setDisponibilidadFavoritos] = useState({});
  const [loadingFavoritos, setLoadingFavoritos] = useState(true);

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
    setLoadingFavoritos(true);
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
      } finally {
        setLoadingFavoritos(false);
      }
    } else {
      setLoadingFavoritos(false);
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

  useEffect(() => {
    document.documentElement.classList.toggle('dark', modoOscuro);
    localStorage.setItem('theme', modoOscuro ? 'dark' : 'light');
  }, [modoOscuro]);

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
    <div className={`
      min-h-screen p-4 transition-colors duration-300
      ${modoOscuro 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100' 
        : 'bg-gradient-to-br from-blue-50 via-white to-blue-50 text-gray-900'
      }
    `}>
      <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto relative">
        {/* Bloque principal */}
        <div className="flex-1">
          <div className={`
            shadow-2xl rounded-2xl p-8 transition-all duration-300
            ${modoOscuro
              ? 'bg-gray-800/50 backdrop-blur-sm border border-gray-700 text-white'
              : 'bg-white/80 backdrop-blur-sm border border-gray-100 text-black'
            }
          `}>
            <div className="flex justify-between items-center mb-6">
              <h1 className={`
                text-4xl font-extrabold text-center w-full flex items-center justify-center gap-3
                ${modoOscuro ? 'text-blue-400' : 'text-blue-600'}
              `}>
                <span className="text-5xl">🎾</span>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400">
                  Buscador de Canchas
                </span>
              </h1>
              <div className="flex items-center gap-4">
                {/* Botón de menú para móvil */}
                <button
                  onClick={() => setMostrarMenu(!mostrarMenu)}
                  className={`
                    lg:hidden p-2 rounded-lg transition-colors
                    ${modoOscuro
                      ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }
                  `}
                  title="Menú"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>

                {/* Toggle de tema */}
                <button
                  onClick={() => setModoOscuro(!modoOscuro)}
                  className={`
                    p-2 rounded-lg transition-all duration-300 transform hover:scale-110
                    ${modoOscuro
                      ? 'bg-gray-700 text-yellow-300 hover:bg-gray-600'
                      : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                    }
                  `}
                  title={modoOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                >
                  {modoOscuro ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Grid de campos de búsqueda */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className={`
                  block text-sm font-medium
                  ${modoOscuro ? 'text-gray-300' : 'text-gray-700'}
                `}>
                  📅 Fecha:
                </label>
                <DatePicker
                  selected={fecha}
                  onChange={(date) => setFecha(date)}
                  className={`
                    w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none
                    transition-all duration-200
                    ${modoOscuro 
                      ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                    }
                  `}
                  dateFormat="yyyy-MM-dd"
                />
              </div>

              <div className="space-y-2">
                <label className={`
                  block text-sm font-medium
                  ${modoOscuro ? 'text-gray-300' : 'text-gray-700'}
                `}>
                  🕒 Hora mínima:
                </label>
                <DatePicker
                  selected={horaMinima}
                  onChange={(time) => setHoraMinima(time)}
                  showTimeSelect
                  showTimeSelectOnly
                  timeIntervals={15}
                  timeCaption="Hora"
                  dateFormat="hh:mm aa"
                  className={`
                    w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none
                    transition-all duration-200
                    ${modoOscuro 
                      ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                    }
                  `}
                />
              </div>

              <div className="space-y-2">
                <label className={`
                  block text-sm font-medium
                  ${modoOscuro ? 'text-gray-300' : 'text-gray-700'}
                `}>
                  🕒 Hora máxima:
                </label>
                <DatePicker
                  selected={horaMaxima}
                  onChange={(time) => setHoraMaxima(time)}
                  showTimeSelect
                  showTimeSelectOnly
                  timeIntervals={15}
                  timeCaption="Hora"
                  dateFormat="hh:mm aa"
                  className={`
                    w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none
                    transition-all duration-200
                    ${modoOscuro 
                      ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                    }
                  `}
                />
              </div>

              <div className="space-y-2">
                <label className={`
                  block text-sm font-medium
                  ${modoOscuro ? 'text-gray-300' : 'text-gray-700'}
                `}>
                  📏 Duración:
                </label>
                <select value={duracion} onChange={e => setDuracion(e.target.value)} className={`
                  w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none
                  transition-all duration-200
                  ${modoOscuro 
                    ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                  }
                `}>
                  <option value={30}>30 min</option>
                  <option value={60}>60 min</option>
                  <option value={90}>90 min</option>
                  <option value={120}>120 min</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className={`
                  block text-sm font-medium
                  ${modoOscuro ? 'text-gray-300' : 'text-gray-700'}
                `}>
                  💰 Presupuesto por persona:
                </label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={presupuesto} 
                    onChange={e => setPresupuesto(e.target.value)}
                    className={`
                      w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none
                      transition-all duration-200
                      ${modoOscuro 
                        ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                      }
                    `}
                  />
                  <p className={`
                    text-sm mt-1
                    ${modoOscuro ? 'text-gray-400' : 'text-gray-500'}
                  `}>
                    Total: <span className="font-medium">{presupuestoTotal} MXN</span>
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className={`
                  block text-sm font-medium
                  ${modoOscuro ? 'text-gray-300' : 'text-gray-700'}
                `}>
                  👥 Número de personas:
                </label>
                <input type="number" value={personas} onChange={e => setPersonas(e.target.value)} className={`
                  w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none
                  transition-all duration-200
                  ${modoOscuro 
                    ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                  }
                `} />
              </div>

              <div className="space-y-2">
                <label className={`
                  block text-sm font-medium
                  ${modoOscuro ? 'text-gray-300' : 'text-gray-700'}
                `}>
                  🏟️ Filtro por club:
                </label>
                <select value={club} onChange={e => setClub(e.target.value)} className={`
                  w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none
                  transition-all duration-200
                  ${modoOscuro 
                    ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                  }
                `}>
                  <option value="">Todos</option>
                  {clubesDisponibles.map((c, i) => (
                    <option key={i} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className={`
                  block text-sm font-medium
                  ${modoOscuro ? 'text-gray-300' : 'text-gray-700'}
                `}>
                  Zona:
                </label>
                <select value={zona} onChange={e => setZona(e.target.value)} className={`
                  w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none
                  transition-all duration-200
                  ${modoOscuro 
                    ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                  }
                `}>
                  <option value="">Todas</option>
                  {[...new Set(clubesDisponibles.map(c => c.zone))].map((z, i) => (
                    <option key={i} value={z}>{z}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 md:col-span-1">
                <label className={`
                  block text-sm font-medium
                  ${modoOscuro ? 'text-gray-300' : 'text-gray-700'}
                `}>
                  Distancia máxima (km):
                </label>
                <input 
                  type="number" 
                  value={distancia} 
                  onChange={e => setDistancia(e.target.value)} 
                  className={`
                    w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none
                    transition-all duration-200
                    ${modoOscuro 
                      ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                    }
                  `} 
                />
              </div>

              <div className="space-y-2 md:col-span-1">
                <label className={`
                  block text-sm font-medium
                  ${modoOscuro ? 'text-gray-300' : 'text-gray-700'}
                `}>
                  Ordenar por:
                </label>
                <div className="flex gap-2">
                  {['precio', 'horario', 'distancia'].map((tipo) => (
                    <button
                      key={tipo}
                      onClick={() => setOrdenarPor(tipo)}
                      className={`
                        flex-1 px-3 py-3 rounded-xl border text-sm transition-all duration-200
                        ${ordenarPor === tipo
                          ? modoOscuro
                            ? 'bg-blue-500 text-white border-blue-600'
                            : 'bg-blue-600 text-white border-blue-600'
                          : modoOscuro
                            ? 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                            : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                        }
                      `}
                    >
                      {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Botón de búsqueda */}
            <button
              onClick={buscar}
              disabled={loading}
              className={`
                mt-8 w-full flex justify-center items-center gap-3 py-4 rounded-xl
                text-lg font-semibold transition-all duration-300
                ${loading
                  ? 'opacity-70 cursor-not-allowed'
                  : modoOscuro
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }
                transform hover:scale-[1.02] active:scale-[0.98]
              `}
            >
              {loading ? (
                <>
                  <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-white border-solid" />
                  Buscando...
                </>
              ) : (
                <>
                  <span className="text-xl">🔍</span>
                  Buscar
                </>
              )}
            </button>

            {/* Resultados */}
            <div className="mt-8">
              <h2 className={`
                text-2xl font-bold mb-4
                ${modoOscuro ? 'text-gray-200' : 'text-gray-800'}
              `}>
                Resultados:
              </h2>
              {resultadosFiltrados.length === 0 ? (
                <div className={`
                  text-center py-8
                  ${modoOscuro ? 'text-gray-400' : 'text-gray-500'}
                `}>
                  <span className="text-4xl block mb-2">🔎</span>
                  <p>No se encontraron resultados.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {resultadosFiltrados.map((r, idx) => {
                    const esFav = favoritos.some(
                      f => f.club === r.club && f.start_time === r.start_time && f.price === r.price
                    );
                    const clubInfo = clubesDisponibles.find(c => c.name === r.club);
                    const distanciaAlClub = userCoords && clubInfo ? 
                      Math.round(distanciaEntre(userCoords.lat, userCoords.lon, clubInfo.lat, clubInfo.lon) * 10) / 10 
                      : null;

                    return (
                      <div 
                        key={idx} 
                        className={`
                          rounded-xl p-4 transition-all duration-200
                          ${modoOscuro
                            ? 'bg-gray-700/50 hover:bg-gray-700'
                            : 'bg-white hover:bg-gray-50'
                          }
                          border
                          ${modoOscuro ? 'border-gray-600' : 'border-gray-200'}
                          hover:shadow-lg
                        `}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <a
                              href={r.link || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`
                                font-semibold text-lg hover:underline
                                ${modoOscuro ? 'text-blue-400' : 'text-blue-600'}
                              `}
                            >
                              {r.club}
                            </a>
                            <div className="mt-2 space-y-1">
                              <p className={`text-sm ${modoOscuro ? 'text-gray-300' : 'text-gray-600'}`}>
                                ⏰ {r.start_time} ({r.duration} min)
                              </p>
                              <p className={`font-medium ${modoOscuro ? 'text-green-400' : 'text-green-600'}`}>
                                {r.price}
                              </p>
                              <p className={`text-sm ${modoOscuro ? 'text-gray-400' : 'text-gray-500'}`}>
                                ({r.pricePerPerson} por persona)
                              </p>
                              {distanciaAlClub !== null && (
                                <p className={`text-sm ${modoOscuro ? 'text-gray-400' : 'text-gray-500'}`}>
                                  📍 {distanciaAlClub} km
                                </p>
                              )}
                            </div>
                          </div>
                          <button 
                            onClick={() => toggleFavorito(r)}
                            className={`
                              text-2xl transition-transform duration-200 hover:scale-110
                              ${esFav ? 'text-yellow-500' : modoOscuro ? 'text-gray-500' : 'text-gray-400'}
                            `}
                          >
                            {esFav ? '★' : '☆'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Panel lateral */}
        <div className={`
          fixed lg:relative lg:w-96
          top-0 right-0 h-full w-80
          transform transition-all duration-300 ease-in-out
          ${mostrarMenu ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
          ${modoOscuro
            ? 'bg-gray-800/50 backdrop-blur-sm border border-gray-700'
            : 'bg-white/80 backdrop-blur-sm border border-gray-100'
          }
          shadow-2xl lg:shadow-xl
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
                        relative rounded-xl p-4 transition-all duration-200
                        ${loadingFavoritos
                          ? 'bg-gray-100 dark:bg-gray-800'
                          : estaDisponible
                            ? modoOscuro
                              ? 'bg-gray-800/50 hover:bg-gray-800/70'
                              : 'bg-white hover:bg-gray-50'
                            : modoOscuro
                              ? 'bg-red-900/20 hover:bg-red-900/30'
                              : 'bg-red-50 hover:bg-red-100/80'
                        }
                        border
                        ${loadingFavoritos
                          ? 'border-gray-200 dark:border-gray-700'
                          : estaDisponible
                            ? modoOscuro
                              ? 'border-gray-700'
                              : 'border-gray-200'
                            : modoOscuro
                              ? 'border-red-800/30'
                              : 'border-red-200'
                        }
                      `}>
                        <div className="flex justify-between items-start mb-1">
                          <h4 className={`
                            font-semibold text-lg
                            ${modoOscuro ? 'text-blue-400' : 'text-blue-600'}
                          `}>
                            {f.club}
                          </h4>
                          <div className="flex items-center gap-2">
                            {loadingFavoritos ? (
                              <div className="w-24 h-8 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
                            ) : (
                              <>
                                {!estaDisponible ? (
                                  <div className={`
                                    px-3 py-1.5 text-sm font-medium
                                    ${modoOscuro
                                      ? 'bg-red-500/90 text-white'
                                      : 'bg-red-500 text-white'
                                    }
                                    rounded-full
                                  `}>
                                    No disponible
                                  </div>
                                ) : f.link && (
                                  <a
                                    href={f.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`
                                      px-3 py-1.5 text-sm font-medium text-white
                                      ${modoOscuro
                                        ? 'bg-green-500/90 hover:bg-green-500'
                                        : 'bg-green-500 hover:bg-green-600'
                                      }
                                      rounded-full transition-colors
                                    `}
                                  >
                                    Reservar
                                  </a>
                                )}
                                <button 
                                  onClick={() => toggleFavorito(f)}
                                  className={`
                                    p-1.5 rounded-full transition-all duration-200 hover:scale-110
                                    ${modoOscuro ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}
                                  `}
                                >
                                  <span className="text-xl text-red-500">✕</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 space-y-1">
                          <p className={`text-sm ${modoOscuro ? 'text-gray-300' : 'text-gray-600'}`}>
                            ⏰ {f.start_time}
                          </p>
                          <p className={`font-medium ${modoOscuro ? 'text-green-400' : 'text-green-600'}`}>
                            {f.price}
                          </p>
                          {distanciaAlClub !== null && (
                            <p className={`text-sm ${modoOscuro ? 'text-gray-400' : 'text-gray-500'}`}>
                              📍 {distanciaAlClub} km
                            </p>
                          )}
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
