import { useState, useEffect } from 'react';
import './index.css';
import DatePicker from 'react-datepicker';
import { format } from 'date-fns';
import Sidebar from './components/Sidebar';
import MapCard from './components/MapCard';
import FavoritesList from './components/FavoritesList';

const API_URL = import.meta.env.VITE_API_URL;
const RESULTADOS_POR_PAGINA = 12;

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
    if (savedTheme) return savedTheme === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [loading, setLoading] = useState(false);
  const [ordenarPor, setOrdenarPor] = useState('precio');
  const [zona, setZona] = useState('');
  const [distancia, setDistancia] = useState('');
  const [userCoords, setUserCoords] = useState(null);
  const [favoritos, setFavoritos] = useState([]);
  const [mostrarMenu, setMostrarMenu] = useState(false);
  const [disponibilidadFavoritos, setDisponibilidadFavoritos] = useState({});
  const [loadingFavoritos, setLoadingFavoritos] = useState(true);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [paginaActual, setPaginaActual] = useState(1);
  const [mostrarFiltrosAvanzados, setMostrarFiltrosAvanzados] = useState(false);

  const presupuestoTotal = presupuesto * personas;
  const filtrosAvanzadosActivos = !!(club || zona || distancia);

  const toggleFavorito = (item) => {
    const existe = favoritos.some(
      f => f.club === item.club && f.start_time === item.start_time && f.price === item.price
    );
    const nuevos = existe
      ? favoritos.filter(f => !(f.club === item.club && f.start_time === item.start_time && f.price === item.price))
      : [...favoritos, item];
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
      setResultados(data.opciones || []);
      setPaginaActual(1);
      if (Notification.permission === 'granted') {
        new Notification(`Se encontraron ${(data.opciones || []).length} opciones`);
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(p => {
          if (p === 'granted') new Notification(`Se encontraron ${(data.opciones || []).length} opciones`);
        });
      }
    } catch (error) {
      console.error('Error al buscar:', error);
    } finally {
      setLoading(false);
    }
  };

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
          disponibilidad[`${fav.club}-${fav.start_time}-${fav.price}`] = opcionesDisponibles.some(
            opt => opt.club === fav.club && opt.start_time === fav.start_time && opt.price === fav.price
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
      try {
        const res = await fetch(`${API_URL}/clubes`);
        const data = await res.json();
        setClubesDisponibles(data);
      } catch (error) {
        console.error('Error fetching clubs:', error);
      }
    };
    const cargarFavoritos = () => {
      const favs = localStorage.getItem('favoritos');
      if (favs) {
        try {
          setFavoritos(JSON.parse(favs));
        } catch (error) {
          console.error('Error parsing favorites:', error);
        }
      }
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => console.log('No se pudo obtener la ubicacion'),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }
    obtenerClubes();
    cargarFavoritos();
    verificarDisponibilidadFavoritos();
    const timer = setTimeout(() => setIsLoadingLocation(false), 1000);
    return () => clearTimeout(timer);
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
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
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
        return distanciaEntre(userCoords.lat, userCoords.lon, info.lat, info.lon) <= Number(distancia);
      });
    }
    const parsePrecio = (p) => {
      if (p == null) return 0;
      if (typeof p === 'number') return p;
      const str = String(p).replace(/ MXN/gi, '');
      return parseFloat(str) || 0;
    };
    const parseHora = (t) => {
      if (!t || typeof t !== 'string') return 0;
      const parts = t.split(':').map(Number);
      const [h = 0, m = 0] = parts;
      return h * 60 + m;
    };

    if (ordenarPor === 'horario') {
      base.sort((a, b) => parseHora(a.start_time) - parseHora(b.start_time));
    } else if (ordenarPor === 'distancia' && userCoords) {
      base.sort((a, b) => {
        const infoA = clubesDisponibles.find(c => c.name === a.club);
        const infoB = clubesDisponibles.find(c => c.name === b.club);
        if (!infoA || !infoB) return 0;
        return distanciaEntre(userCoords.lat, userCoords.lon, infoA.lat, infoA.lon) -
          distanciaEntre(userCoords.lat, userCoords.lon, infoB.lat, infoB.lon);
      });
    } else {
      base.sort((a, b) => {
        const pA = parsePrecio(a.price);
        const pB = parsePrecio(b.price);
        if (pA !== pB) return pA - pB;
        return (a.start_time || '').localeCompare(b.start_time || '');
      });
    }
    return base;
  })();

  const totalPaginas = Math.max(1, Math.ceil(resultadosFiltrados.length / RESULTADOS_POR_PAGINA));
  const inicio = (paginaActual - 1) * RESULTADOS_POR_PAGINA;
  const resultadosPaginados = resultadosFiltrados.slice(inicio, inicio + RESULTADOS_POR_PAGINA);

  useEffect(() => {
    setPaginaActual(1);
  }, [club, zona, distancia, ordenarPor, resultados.length]);

  const inputBase = `
    w-full px-3 py-2.5 rounded-lg text-sm
    border transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500
    dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100
    bg-white border-slate-300 text-slate-900
  `.trim().replace(/\s+/g, ' ');

  const labelBase = 'block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5';

  return (
    <div className={`
      min-h-screen flex transition-colors duration-300
      ${modoOscuro ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}
    `}>
      <div className="flex flex-1 min-w-0">
        <main className="flex-1 min-w-0 flex flex-col">
          <header className={`
            sticky top-0 z-40 flex items-center justify-between px-3 sm:px-4 lg:px-8 py-3 sm:py-4
            border-b backdrop-blur-sm
            ${modoOscuro ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'}
          `}>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMostrarMenu(!mostrarMenu)}
                className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Best Padel</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">Buscador de canchas</p>
              </div>
            </div>
          </header>

          <div className="flex-1 p-3 sm:p-4 lg:p-8 overflow-auto">
            <div className="max-w-4xl mx-auto space-y-6">
              <section className={`
                rounded-xl border p-4 sm:p-6
                ${modoOscuro ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}
              `}>
                <h2 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 sm:mb-6">Parametros de busqueda</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  <div>
                    <label className={labelBase}>Fecha</label>
                    <DatePicker
                      selected={fecha}
                      onChange={(d) => setFecha(d)}
                      className={inputBase}
                      dateFormat="yyyy-MM-dd"
                    />
                  </div>
                  <div>
                    <label className={labelBase}>Hora minima</label>
                    <DatePicker
                      selected={horaMinima}
                      onChange={(t) => setHoraMinima(t)}
                      showTimeSelect
                      showTimeSelectOnly
                      timeIntervals={15}
                      timeCaption="Hora"
                      dateFormat="HH:mm"
                      className={inputBase}
                    />
                  </div>
                  <div>
                    <label className={labelBase}>Hora maxima</label>
                    <DatePicker
                      selected={horaMaxima}
                      onChange={(t) => setHoraMaxima(t)}
                      showTimeSelect
                      showTimeSelectOnly
                      timeIntervals={15}
                      timeCaption="Hora"
                      dateFormat="HH:mm"
                      className={inputBase}
                    />
                  </div>
                  <div>
                    <label className={labelBase}>Duracion</label>
                    <select value={duracion} onChange={(e) => setDuracion(Number(e.target.value))} className={inputBase}>
                      <option value={30}>30 min</option>
                      <option value={60}>60 min</option>
                      <option value={90}>90 min</option>
                      <option value={120}>120 min</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelBase}>Presupuesto por persona (MXN)</label>
                    <input
                      type="number"
                      value={presupuesto}
                      onChange={(e) => setPresupuesto(Number(e.target.value))}
                      className={inputBase}
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Total: {presupuestoTotal} MXN</p>
                  </div>
                  <div>
                    <label className={labelBase}>Personas</label>
                    <input
                      type="number"
                      value={personas}
                      onChange={(e) => setPersonas(Number(e.target.value))}
                      className={inputBase}
                    />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-1">
                    <label className={labelBase}>Ordenar por</label>
                    <div className="flex gap-2 flex-wrap">
                      {['precio', 'horario', 'distancia'].map((t) => (
                        <button
                          key={t}
                          onClick={() => setOrdenarPor(t)}
                          className={`
                            px-3 py-2 rounded-lg text-sm font-medium transition-colors
                            ${ordenarPor === t
                              ? 'bg-emerald-600 text-white'
                              : modoOscuro
                                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }
                          `}
                        >
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-full">
                    <button
                      type="button"
                      onClick={() => setMostrarFiltrosAvanzados(v => !v)}
                      className={`
                        w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm
                        border transition-colors
                        ${mostrarFiltrosAvanzados || filtrosAvanzadosActivos
                          ? 'border-emerald-500/50 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }
                      `}
                    >
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        Filtros avanzados
                        {filtrosAvanzadosActivos && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                            Activos
                          </span>
                        )}
                      </span>
                      <svg
                        className={`w-5 h-5 transition-transform ${mostrarFiltrosAvanzados ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {mostrarFiltrosAvanzados && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className={labelBase}>Club</label>
                          <select value={club} onChange={(e) => setClub(e.target.value)} className={inputBase}>
                            <option value="">Todos</option>
                            {clubesDisponibles.map((c, i) => (
                              <option key={i} value={c.name}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className={labelBase}>Zona</label>
                          <select value={zona} onChange={(e) => setZona(e.target.value)} className={inputBase}>
                            <option value="">Todas</option>
                            {[...new Set(clubesDisponibles.map(c => c.zone))].map((z, i) => (
                              <option key={i} value={z}>{z}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className={labelBase}>Distancia max (km)</label>
                          <input
                            type="number"
                            value={distancia}
                            onChange={(e) => setDistancia(e.target.value)}
                            placeholder="Ej: 5"
                            className={inputBase}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={buscar}
                  disabled={loading}
                  className="mt-4 sm:mt-6 w-full sm:w-auto px-8 py-3 rounded-lg font-medium bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-70 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Buscando...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Buscar
                    </>
                  )}
                </button>
              </section>

              <section className={`
                rounded-xl border overflow-hidden
                ${modoOscuro ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}
              `}>
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                    Resultados
                    {resultadosFiltrados.length > 0 && (
                      <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400">
                        ({resultadosFiltrados.length} encontrados)
                      </span>
                    )}
                  </h2>
                </div>
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  {resultadosFiltrados.length === 0 ? (
                    <div className="py-16 text-center text-slate-500 dark:text-slate-400">
                      <svg className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <p>No hay resultados. Define parametros y busca.</p>
                    </div>
                  ) : (
                    resultadosPaginados.map((r, idx) => {
                      const esFav = favoritos.some(f => f.club === r.club && f.start_time === r.start_time && f.price === r.price);
                      const clubInfo = clubesDisponibles.find(c => c.name === r.club);
                      const dist = userCoords && clubInfo
                        ? Math.round(distanciaEntre(userCoords.lat, userCoords.lon, clubInfo.lat, clubInfo.lon) * 10) / 10
                        : null;
                      return (
                        <div
                          key={`${r.club}-${r.start_time}-${r.price}`}
                          className={`
                            flex items-center justify-between gap-4 px-6 py-4
                            hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors
                          `}
                        >
                          <div className="flex-1 min-w-0">
                            <a
                              href={r.link || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline truncate block"
                            >
                              {r.club}
                            </a>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-slate-600 dark:text-slate-400">
                              <span>{r.start_time} ({r.duration} min)</span>
                              <span className="font-medium text-emerald-600 dark:text-emerald-400">{r.price}</span>
                              <span>{r.pricePerPerson} por persona</span>
                              {dist !== null && <span>{dist} km</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {r.link && (
                              <a
                                href={r.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-500"
                              >
                                Reservar
                              </a>
                            )}
                            <button
                              onClick={() => toggleFavorito(r)}
                              className={`p-2 rounded-lg transition-colors ${
                                esFav ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'
                              }`}
                              aria-label={esFav ? 'Quitar favorito' : 'Agregar favorito'}
                            >
                              <svg className="w-5 h-5" fill={esFav ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                {resultadosFiltrados.length > RESULTADOS_POR_PAGINA && (
                  <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Mostrando {inicio + 1}-{Math.min(inicio + RESULTADOS_POR_PAGINA, resultadosFiltrados.length)} de {resultadosFiltrados.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                        disabled={paginaActual <= 1}
                        className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label="Pagina anterior"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <span className="px-3 py-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                        {paginaActual} / {totalPaginas}
                      </span>
                      <button
                        onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                        disabled={paginaActual >= totalPaginas}
                        className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label="Pagina siguiente"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        </main>

        <Sidebar
          modoOscuro={modoOscuro}
          setModoOscuro={setModoOscuro}
          mostrarMenu={mostrarMenu}
          setMostrarMenu={setMostrarMenu}
        >
          <MapCard
            userCoords={userCoords}
            clubesDisponibles={clubesDisponibles}
            isLoadingLocation={isLoadingLocation}
          />
          <FavoritesList
            favoritos={favoritos}
            clubesDisponibles={clubesDisponibles}
            userCoords={userCoords}
            distanciaEntre={distanciaEntre}
            disponibilidadFavoritos={disponibilidadFavoritos}
            loadingFavoritos={loadingFavoritos}
            toggleFavorito={toggleFavorito}
            modoOscuro={modoOscuro}
          />
        </Sidebar>
      </div>

      {mostrarMenu && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setMostrarMenu(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export default App;
