const express = require('express');
const axios = require('axios');
const cors = require('cors');
const clubs = require('./clubs');

const app = express();
app.use(cors());
app.use(express.json());

const API_URL = "https://api.playtomic.io/v1/availability";

app.post('/buscar', async (req, res) => {
    const { fecha, horaMinima, duracion, presupuesto, personas } = req.body;
    
    const start_min = `${fecha}T13:00:00`;
    //agregar 1 dia a start_max
    const fechaMax = new Date(fecha);
    fechaMax.setDate(fechaMax.getDate() + 1);
    const start_max = `${fechaMax.toISOString().split('T')[0]}T13:00:00`;



    const resultados = [];

    for (const club of clubs) {
        try {
            const response = await axios.get(API_URL, {
                params: {
                    sport_id: "PADEL",
                    start_min,
                    start_max,
                    tenant_id: club.tenant_id
                }
            });

            const data = response.data;

            //datos recibidos del body
            // console.log('Datos de', club.name, ':', data.length, 'canchas disponibles.');
            // console.log('Fecha:', fecha);
            // console.log('Hora mínima:', horaMinima);
            // console.log('Duración:', duracion);
            // console.log('Presupuesto:', presupuesto);
            // console.log('Personas:', personas);
            // console.log('Start min:', start_min);
            // console.log('Start max:', start_max);
            // console.log('API URL:', API_URL);
            
            console.log('Datos de', club.name, ':', data.length, 'canchas disponibles.');
            if (!Array.isArray(data)) return;

            for (const cancha of data) {
                if (!cancha.slots) continue;

                const slotsFiltrados = cancha.slots.filter(slot => {
                    const [h, m, s] = slot.start_time.split(":");
                    const localHour = (parseInt(h) - 6 + 24) % 24;
                    const horaSlot = `${localHour.toString().padStart(2, '0')}:${m}`;

                    const cumpleHora = horaSlot >= horaMinima;
                    const cumpleDuracion = slot.duration === duracion;
                    const precioNum = parseFloat(slot.price.replace(" MXN", ""));
                    const cumplePrecio = precioNum <= presupuesto;

                    return cumpleHora && cumpleDuracion && cumplePrecio;
                });

                for (const slot of slotsFiltrados) {
                    const [h, m, s] = slot.start_time.split(":");
                    const localHour = (parseInt(h) - 6 + 24) % 24;
                    const horaLocal = `${localHour.toString().padStart(2, '0')}:${m}`;
                    const clubInfo = clubs.find(c => c.name === club.name);

                    resultados.push({
                        club: club.name,
                        link: clubInfo?.link || null,
                        cancha_id: cancha.resource_id,
                        start_time: horaLocal,
                        duration: slot.duration,
                        price: slot.price,
                        pricePerPerson: (parseFloat(slot.price.replace(" MXN", "")) / personas).toFixed(2)
                    });
                }
            }

        } catch (error) {
            console.error(`Error con ${club.name}:`, error.message);
        }
    }

    // ordena por precio y luego por hora
    resultados.sort((a, b) => {
        const precioA = parseFloat(a.price.replace(" MXN", ""));
        const precioB = parseFloat(b.price.replace(" MXN", ""));

        if (precioA !== precioB) {
            return precioA - precioB;
        }

        return a.start_time.localeCompare(b.start_time);
    });

    res.json({ opciones: resultados });
});

app.get('/clubes', (req, res) => {
    res.json(clubs);
  });

app.listen(3001, () => {
    console.log('Servidor corriendo en http://localhost:3001');
});
