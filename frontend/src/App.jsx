import { useState, useEffect } from 'react';
import './index.css';
import DatePicker from 'react-datepicker';
import { format } from 'date-fns';
const API_URL = import.meta.env.VITE_API_URL;


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


  const presupuestoTotal = presupuesto * personas;

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
          personas: Number(personas),
          ordenarPor
        })
      });

      const data = await response.json();
      let opciones = data.opciones || [];
      setResultados(opciones);
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
  }, []);

  const resultadosFiltrados = club
    ? resultados.filter(r => r.club === club)
    : resultados;

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
            <label className="block mb-1 text-style">🔽 Ordenar por:</label>
            <select value={ordenarPor} onChange={e => setOrdenarPor(e.target.value)} className="w-full p-2 border rounded-lg input-style">
              <option value="precio">Precio</option>
              <option value="hora">Horario</option>
            </select>
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
          {resultadosFiltrados.map((r, idx) => (
            <li key={idx} className="bg-white text-black dark:bg-gray-700 border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <div className="text-lg">
                <a
                  href={r.link || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-blue-700 dark:text-blue-300 hover:underline"
                >
                  {r.club}
                </a> —  {r.start_time} ({r.duration} min)
              </div>
              <div className="text-right mt-2 sm:mt-0">
                <p className="font-medium text-green-600">{r.price}</p>
                <p className="text-sm text-gray-600">({r.pricePerPerson} por persona)</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
