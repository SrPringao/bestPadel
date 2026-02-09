function Sidebar({
  modoOscuro,
  setModoOscuro,
  mostrarMenu,
  setMostrarMenu,
  children
}) {
  return (
    <aside
      className={`
        fixed lg:relative lg:w-72 xl:w-80
        top-0 right-0 h-full w-80 max-w-[85vw]
        transform transition-all duration-300 ease-in-out z-50
        ${mostrarMenu ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        flex flex-col
        ${modoOscuro
          ? 'bg-slate-900/95 border-slate-700'
          : 'bg-white border-slate-200'
        }
        border-l shadow-xl lg:shadow-none
      `}
    >
      <div className="lg:hidden flex justify-between items-center px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <span className="font-semibold text-slate-700 dark:text-slate-200">Panel</span>
        <button
          onClick={() => setMostrarMenu(false)}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400"
          aria-label="Cerrar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setModoOscuro(!modoOscuro)}
          className={`
            w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
            text-sm font-medium transition-colors
            ${modoOscuro
              ? 'bg-slate-800 text-amber-300 hover:bg-slate-700'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }
          `}
          title={modoOscuro ? 'Modo claro' : 'Modo oscuro'}
        >
          {modoOscuro ? (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Modo claro
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
              Modo oscuro
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
