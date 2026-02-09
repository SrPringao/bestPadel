function FavoritesList({
  favoritos,
  clubesDisponibles,
  userCoords,
  distanciaEntre,
  disponibilidadFavoritos,
  loadingFavoritos,
  toggleFavorito,
  modoOscuro
}) {
  return (
    <div className="p-4 flex-1 min-h-0 flex flex-col">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">
        Favoritos ({favoritos.length})
      </h3>
      <div className="flex-1 overflow-y-auto space-y-3">
        {favoritos.length > 0 ? (
          favoritos.map((f, i) => {
            const clubInfo = clubesDisponibles.find(c => c.name === f.club);
            const distanciaAlClub = userCoords && clubInfo
              ? Math.round(distanciaEntre(userCoords.lat, userCoords.lon, clubInfo.lat, clubInfo.lon) * 10) / 10
              : null;
            const estaDisponible = disponibilidadFavoritos[`${f.club}-${f.start_time}-${f.price}`];

            return (
              <div
                key={i}
                className={`
                  rounded-lg p-3 border text-sm transition-colors
                  ${loadingFavoritos
                    ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                    : estaDisponible
                      ? 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      : 'bg-red-50/80 dark:bg-red-900/20 border-red-200 dark:border-red-900/50'
                  }
                `}
              >
                <div className="flex justify-between items-start gap-2">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 truncate flex-1">
                    {f.club}
                  </h4>
                  <div className="flex items-center gap-1 shrink-0">
                    {loadingFavoritos ? (
                      <div className="w-16 h-6 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                    ) : (
                      <>
                        {!estaDisponible ? (
                          <span className="px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded">
                            No disp.
                          </span>
                        ) : f.link && (
                          <a
                            href={f.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-0.5 text-xs font-medium bg-emerald-600 text-white rounded hover:bg-emerald-500"
                          >
                            Reservar
                          </a>
                        )}
                        <button
                          onClick={() => toggleFavorito(f)}
                          className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          aria-label="Quitar favorito"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="mt-2 space-y-0.5 text-slate-600 dark:text-slate-400">
                  <p>{f.start_time} - {f.price}</p>
                  {distanciaAlClub !== null && (
                    <p className="text-xs">{distanciaAlClub} km</p>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
            <svg className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <p>Sin favoritos</p>
            <p className="text-xs mt-1">Guarda canchas desde los resultados</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default FavoritesList;
