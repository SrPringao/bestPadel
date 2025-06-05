# BestPadel

Este proyecto contiene una aplicación de pádel con frontend en React (Vite) y backend en Node.js (Express).

## Instalación

Desde la raíz del proyecto, ejecuta los siguientes comandos:

```bash
npm install           # Instala las dependencias de la raíz (incluye 'concurrently')
cd frontend && npm install   # Instala dependencias del frontend
cd ../backend && npm install # Instala dependencias del backend
cd ..                # Vuelve a la raíz
```

## Ejecución

Desde la raíz, puedes iniciar **ambos servidores** (frontend y backend) en paralelo con:

```bash
npm run start
```

Esto levantará:
- Frontend en: http://localhost:5173
- Backend en: http://localhost:3000

También puedes correr cada parte por separado:

- **Frontend:**
  ```bash
  cd frontend
  npm run dev
  ```
- **Backend:**
  ```bash
  cd backend
  npm run dev
  ```

---

el proceso despues de un tiempo de inactividad puede tardar de 30-60 segundos

### Troubleshooting

If deployment fails with an error like:

```
npm ERR! code ETARGET
npm ERR! notarget No matching version found for react-leaflet@^4.4.0
```

Edit `frontend/package.json` to use a valid `react-leaflet` version (for example `^4.2.1 `), reinstall dependencies and redeploy.


![image](https://github.com/user-attachments/assets/aabc7dc5-d3e5-4731-9adc-630e1b2ddf59)

https://best-padel.vercel.app/