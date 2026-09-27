/* 
   ___  _____    ___
  /   ||  _  |  /   | _
 / /| || |/' | / /| |(_)
/ /_| ||  /| |/ /_| |
\_CONEXIÓN INESTABLE| _
    |_/ \___/     |_/(_)

  https://angeldivinopsv.vercel.app/

  Routes Module - Módulo de rutas y mapa interactivo
*/

"use strict";

window.RoutesModule = ((AppUtils) => {
    // ============================================
    // CONSTANTES - Configuración del mapa
    // ============================================
    const LAST_ROUTE_WINDOW_HOURS = 72;
    const MAP_MIN_SCALE = 1;
    const MAP_MAX_SCALE = 4;
    const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

    // ============================================
    // CONSTANTES - Posiciones Reales (Lat, Lng)
    // ============================================
    const CITY_POSITIONS = {
        lima: { lat: -12.0464, lng: -77.0428 },
        la_victoria: { lat: -12.0655, lng: -77.0211 },
        huachipa: { lat: -12.0125, lng: -76.8994 },
        chosica: { lat: -11.9402, lng: -76.7027 },
        corcona: { lat: -11.8986, lng: -76.5416 },
        matucana: { lat: -11.8447, lng: -76.3853 },
        ticlio: { lat: -11.5975, lng: -76.1914 },
        morococha: { lat: -11.5997, lng: -76.1408 },
        oroya: { lat: -11.5175, lng: -75.8981 },
        huancayo: { lat: -12.0651, lng: -75.2048 },
        tunan: { lat: -11.9144, lng: -75.3121 },
        concepcion: { lat: -11.9167, lng: -75.3167 },
        tarma: { lat: -11.4189, lng: -75.6883 },
        carpapata: { lat: -11.3556, lng: -75.5269 },
        junin: { lat: -11.1667, lng: -75.9833 },
        carhuamayo: { lat: -10.9167, lng: -76.0333 },
        huayre: { lat: -10.8667, lng: -76.0667 },
        cerro_de_pasco: { lat: -10.6675, lng: -76.2567 },
        huanuco: { lat: -9.9294, lng: -76.2397 },
        ambo: { lat: -10.1306, lng: -76.2047 },
        la_merced: { lat: -11.0543, lng: -75.3284 },
        san_ramon: { lat: -11.1219, lng: -75.3582 },
        huacho: { lat: -11.1067, lng: -77.6050 },
        huaraz: { lat: -9.5278, lng: -77.5278 },
        san_luis: { lat: -9.0967, lng: -77.3278 },
        cajacay: { lat: -10.1558, lng: -77.4422 },
        trujillo: { lat: -8.1159, lng: -79.0287 },
        chiclayo: { lat: -6.7714, lng: -79.8409 },
        piura: { lat: -5.1945, lng: -80.6328 },
        ayacucho: { lat: -13.1588, lng: -74.2239 },
        ica: { lat: -14.0722, lng: -75.7286 },
        arequipa: { lat: -16.4090, lng: -71.5375 },
        cusco: { lat: -13.5226, lng: -71.9673 },
        puno: { lat: -15.8402, lng: -70.0219 },
        // Sierra central
        jauja: { lat: -11.7758, lng: -75.4997 },
        yauli: { lat: -11.6667, lng: -76.0833 },
        la_oroya: { lat: -11.5175, lng: -75.8981 },
        chupaca: { lat: -12.0561, lng: -75.2878 },
        huancavelica: { lat: -12.7864, lng: -74.9760 },
        pampas: { lat: -12.3964, lng: -74.8683 },
        lircay: { lat: -12.9833, lng: -74.7167 },
        huanta: { lat: -12.9397, lng: -74.2475 },
        satipo: { lat: -11.2522, lng: -74.6386 },
        oxapampa: { lat: -10.5775, lng: -75.4017 },
        villa_rica: { lat: -10.7386, lng: -75.2708 },
        pichanaqui: { lat: -10.9253, lng: -74.8756 },
        tingo_maria: { lat: -9.2950, lng: -75.9961 },
        pucallpa: { lat: -8.3791, lng: -74.5539 },
        canta: { lat: -11.4675, lng: -76.6247 },
        // Costa norte / Ancash
        casma: { lat: -9.4747, lng: -78.3036 },
        chimbote: { lat: -9.0853, lng: -78.5783 },
        nuevo_chimbote: { lat: -9.1297, lng: -78.5275 },
        huarmey: { lat: -10.0681, lng: -78.1522 },
        barranca: { lat: -10.7539, lng: -77.7611 },
        pativilca: { lat: -10.6989, lng: -77.7797 },
        paramonga: { lat: -10.6775, lng: -77.8214 },
        supe: { lat: -10.7964, lng: -77.7133 },
        huaral: { lat: -11.4950, lng: -77.2078 },
        chancay: { lat: -11.5714, lng: -77.2672 },
        conococha: { lat: -10.1236, lng: -77.2833 },
        chiquian: { lat: -10.1486, lng: -77.1569 },
        recuay: { lat: -9.7217, lng: -77.4561 },
        carhuaz: { lat: -9.2819, lng: -77.6453 },
        yungay: { lat: -9.1389, lng: -77.7442 },
        caraz: { lat: -9.0489, lng: -77.8097 },
        pomabamba: { lat: -8.8214, lng: -77.4592 },
        huari: { lat: -9.3475, lng: -77.1714 },
        chavin: { lat: -9.5867, lng: -77.1772 },
        santa: { lat: -8.9772, lng: -78.6192 },
        viru: { lat: -8.4144, lng: -78.7519 },
        chao: { lat: -8.5392, lng: -78.6781 },
        pacasmayo: { lat: -7.4006, lng: -79.5714 },
        chepen: { lat: -7.2272, lng: -79.4297 },
        cajamarca: { lat: -7.1638, lng: -78.5003 },
        lambayeque: { lat: -6.7011, lng: -79.9061 },
        jaen: { lat: -5.7086, lng: -78.8081 },
        chachapoyas: { lat: -6.2317, lng: -77.8690 },
        moyobamba: { lat: -6.0342, lng: -76.9717 },
        tarapoto: { lat: -6.4825, lng: -76.3653 },
        sullana: { lat: -4.9039, lng: -80.6853 },
        talara: { lat: -4.5772, lng: -81.2719 },
        mancora: { lat: -4.1078, lng: -81.0475 },
        tumbes: { lat: -3.5669, lng: -80.4515 },
        // Costa sur / sur andino
        canete: { lat: -13.0775, lng: -76.3872 },
        san_vicente_de_canete: { lat: -13.0775, lng: -76.3872 },
        chincha: { lat: -13.4097, lng: -76.1322 },
        chincha_alta: { lat: -13.4097, lng: -76.1322 },
        pisco: { lat: -13.7103, lng: -76.2031 },
        nazca: { lat: -14.8294, lng: -74.9436 },
        nasca: { lat: -14.8294, lng: -74.9436 },
        palpa: { lat: -14.5339, lng: -75.1856 },
        camana: { lat: -16.6236, lng: -72.7106 },
        chala: { lat: -15.8522, lng: -74.2464 },
        moquegua: { lat: -17.1936, lng: -70.9350 },
        ilo: { lat: -17.6394, lng: -71.3375 },
        tacna: { lat: -18.0146, lng: -70.2536 },
        juliaca: { lat: -15.5000, lng: -70.1333 },
        abancay: { lat: -13.6339, lng: -72.8814 },
        andahuaylas: { lat: -13.6556, lng: -73.3872 },
        puquio: { lat: -14.6964, lng: -74.1242 },
        sicuani: { lat: -14.2694, lng: -71.2261 },
        urubamba: { lat: -13.3047, lng: -72.1161 },
        quillabamba: { lat: -12.8631, lng: -72.6922 },
        puerto_maldonado: { lat: -12.5933, lng: -69.1891 },
        iquitos: { lat: -3.7491, lng: -73.2538 }
    };

    // ============================================
    // CONSTANTES - Alias de ciudades
    // ============================================
    const CITY_ALIASES = {
        lavictoria: "la_victoria",
        oroya_psv: "oroya",
        cerro: "cerro_de_pasco",
        pasco: "cerro_de_pasco",
        cerro_de_pasco_psv: "cerro_de_pasco",
        tingomaria: "tingo_maria",
        canete_psv: "canete",
        chimbote_psv: "chimbote",
        huanuco_psv: "huanuco",
        ambo_psv: "ambo",
        junin_psv: "junin",
        carhuamayo_psv: "carhuamayo",
        carpapata_psv: "carpapata",
        concepcion_psv: "concepcion",
        huancayo_psv: "huancayo",
        tarma_psv: "tarma",
        huayre_psv: "huayre",
        la_merced_psv: "la_merced",
        san_ramon_psv: "san_ramon",
        sanluis: "san_luis",
        san_luis_psv: "san_luis",
        huaraz_psv: "huaraz",
        huacho_psv: "huacho",
        cajacay_psv: "cajacay",
        morococha_psv: "morococha",
        chosica_psv: "chosica",
        corcona_psv: "corcona",
        matucana_psv: "matucana",
        ticlio_psv: "ticlio",
        huachipa_psv: "huachipa",
        tunan_psv: "tunan"
    };

    // ============================================
    // ESTADO DEL MAPA LEAFLET
    // ============================================
    const mapState = {
        mapInstance: null,
        routeLayerGroup: null,
        markerLayerGroup: null,
        polylines: new Map(), // root route id -> L.polyline
        routePositions: new Map(), // route id -> { originPos, destinationPos }
        renderId: 0,
        // Colores vivos que contrastan con el mapa lavanda (primero los de la marca)
        colorPalette: [
            "#0fa89a", "#6b3fa0", "#e0457b", "#f59e0b", "#2563eb",
            "#16a34a", "#db2777", "#0891b2", "#9333ea", "#ea580c"
        ],
        paletteIndex: 0
    };

    // ============================================
    // FUNCIONES DE RUTAS
    // ============================================

    /**
     * Obtiene la fecha de referencia de un trabajo
     */
    function getRouteReferenceDate(job) {
        return AppUtils.getJobReferenceDate(job);
    }

    /**
     * Verifica si un viaje está en progreso
     */
    function isOpenTrip(job) {
        if (!AppUtils.isInProgress(job.status)) return false;
        return !job.completedAt;
    }

    /**
     * Obtiene las últimas rutas abiertas por conductor
     */
    function getLatestOpenRoutePerDriverInLastHours(jobs, hours = LAST_ROUTE_WINDOW_HOURS) {
        const threshold = Date.now() - hours * 60 * 60 * 1000;

        const recentJobs = jobs
            .filter((job) => {
                if (!isOpenTrip(job)) return false;
                const referenceMs = AppUtils.getDateMs(getRouteReferenceDate(job));
                return referenceMs >= threshold;
            })
            .sort(AppUtils.compareByDateDesc);

        const byDriver = new Map();

        recentJobs.forEach((job) => {
            const driverKey = job.userId || AppUtils.normalizeText(job.driverName);
            if (!driverKey || byDriver.has(driverKey)) return;
            byDriver.set(driverKey, job);
        });

        return [...byDriver.values()];
    }

    /**
     * Construye la lista de viajes de rutas
     */
    function buildRouteTrips(jobs) {
        return [...jobs]
            .map((job) => ({
                id: job.id,
                userId: job.userId,
                origin: job.origin,
                originId: job.originId || null,
                destination: job.destination,
                destinationId: job.destinationId || null,
                driverName: job.driverName || "Sin conductor",
                status: job.status || "in_progress",
                distanceKm: job.plannedKm || job.drivenKm || 0,
                kmDriven: job.drivenKm || job.plannedKm || 0,
                startedAt: job.startedAt || null,
                completedAt: job.completedAt || null,
                updatedAt: job.updatedAt || null,
                publicUrl: job.publicUrl || "#"
            }))
            .sort(AppUtils.compareByDateDesc);
    }

    /**
     * Obtiene la ruta asignada por conductor
     */
    function getAssignedRouteByDriver(jobs, recentDriverRoutes = []) {
        const assigned = new Map();

        const processJobs = (jobList) => {
            jobList
                .sort(AppUtils.compareByDateDesc)
                .forEach((job) => {
                    if (!job.userId || assigned.has(job.userId)) return;
                    assigned.set(job.userId, `${job.origin} - ${job.destination}`);
                });
        };

        processJobs(recentDriverRoutes);
        processJobs(jobs);

        return assigned;
    }

    // ============================================
    // FUNCIONES DEL MAPA
    // ============================================

    /**
     * Normaliza el nombre de una ciudad
     */
    function normalizeCityKey(value) {
        return AppUtils.normalizeText(value)
            .replace(/\bpsv\b/g, "")
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "");
    }

    /**
     * Resuelve la clave de ciudad
     */
    function resolveCityKey(cityName, cityId) {
        const candidates = [
            normalizeCityKey(cityId),
            normalizeCityKey(cityName)
        ].filter(Boolean);

        for (const candidate of candidates) {
            if (CITY_POSITIONS[candidate]) return candidate;
            if (CITY_ALIASES[candidate] && CITY_POSITIONS[CITY_ALIASES[candidate]]) {
                return CITY_ALIASES[candidate];
            }
        }

        return null;
    }

    /**
     * Obtiene las coordenadas lat/lng reales de una ciudad
     */
    function getCityPosition(cityName, cityId) {
        const key = resolveCityKey(cityName, cityId);
        return key ? CITY_POSITIONS[key] : null;
    }

    // ============================================
    // GEOCODIFICACION DE RESPALDO (Nominatim / OpenStreetMap, gratis y sin API key)
    // Solo se usa para ciudades que no estan en CITY_POSITIONS. Resultados en cache.
    // ============================================
    const GEOCODE_CACHE_KEY = "Angel Divino:geocode-cache:v1";
    const GEOCODE_MISS_RETRY_MS = 24 * 60 * 60 * 1000;
    const GEOCODE_MIN_INTERVAL_MS = 1100; // politica de uso de Nominatim: max 1 peticion/segundo
    const PERU_BOUNDS = { minLat: -18.6, maxLat: 0.2, minLng: -81.6, maxLng: -68.4 };
    const geocodeInFlight = new Map();
    let geocodeQueue = Promise.resolve();

    function readGeocodeCache() {
        try {
            return JSON.parse(window.localStorage.getItem(GEOCODE_CACHE_KEY) || "{}") || {};
        } catch (error) {
            return {};
        }
    }

    function writeGeocodeCache(key, value) {
        try {
            const cache = readGeocodeCache();
            cache[key] = value;
            window.localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache));
        } catch (error) {
            // Ignorar errores de almacenamiento
        }
    }

    function cleanCityQuery(cityName) {
        return String(cityName || "")
            .replace(/\bpsv\b/gi, "")
            .replace(/[_-]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function isInsidePeru(position) {
        return Boolean(position)
            && position.lat >= PERU_BOUNDS.minLat && position.lat <= PERU_BOUNDS.maxLat
            && position.lng >= PERU_BOUNDS.minLng && position.lng <= PERU_BOUNDS.maxLng;
    }

    async function geocodeCity(query) {
        const url = "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=pe&q="
            + encodeURIComponent(`${query}, Peru`);
        const response = await fetch(url, { headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error(`HTTP ${response.status} geocodificando ${query}`);
        const results = await response.json();
        const first = Array.isArray(results) ? results[0] : null;
        if (!first) return null;
        const position = { lat: Number(first.lat), lng: Number(first.lon) };
        return isInsidePeru(position) ? position : null;
    }

    /**
     * Devuelve la posicion de una ciudad: primero la tabla local, luego la cache
     * y por ultimo Nominatim (en cola, respetando 1 peticion por segundo).
     */
    function resolveCityPosition(cityName, cityId) {
        const known = getCityPosition(cityName, cityId);
        if (known) return Promise.resolve(known);

        const query = cleanCityQuery(cityName) || cleanCityQuery(cityId);
        const key = normalizeCityKey(query);
        if (!key) return Promise.resolve(null);

        const cached = readGeocodeCache()[key];
        if (cached && cached.lat !== undefined) return Promise.resolve({ lat: cached.lat, lng: cached.lng });
        if (cached && cached.miss && Date.now() - cached.miss < GEOCODE_MISS_RETRY_MS) return Promise.resolve(null);

        if (geocodeInFlight.has(key)) return geocodeInFlight.get(key);

        const request = geocodeQueue
            .then(() => geocodeCity(query))
            .then((position) => {
                writeGeocodeCache(key, position ? { lat: position.lat, lng: position.lng } : { miss: Date.now() });
                return position;
            })
            .catch((error) => {
                console.warn("No se pudo ubicar la ciudad en el mapa:", query, error);
                return null;
            })
            .finally(() => geocodeInFlight.delete(key));

        // Espaciar las peticiones siguientes
        geocodeQueue = request.then(() => new Promise((resolve) => setTimeout(resolve, GEOCODE_MIN_INTERVAL_MS)));
        geocodeInFlight.set(key, request);
        return request;
    }

    // Cache de trazados OSRM: una sola clave, geometria simplificada y maximo 40 rutas (LRU).
    // Antes cada ruta ocupaba hasta 150 KB en su propia clave y podia llenar el localStorage.
    const OSRM_CACHE_KEY = "Angel Divino:osrm-routes:v2";
    const OSRM_LEGACY_PREFIX = "Angel Divino_osrm_";
    const OSRM_CACHE_MAX_ROUTES = 40;

    function readOsrmCache() {
        try {
            const parsed = JSON.parse(window.localStorage.getItem(OSRM_CACHE_KEY) || "null");
            return parsed && typeof parsed === "object" ? parsed : {};
        } catch (error) {
            return {};
        }
    }

    function writeOsrmCache(cache) {
        try {
            window.localStorage.setItem(OSRM_CACHE_KEY, JSON.stringify(cache));
        } catch (error) {
            // Ignorar errores de cuota
        }
    }

    // Borrar las claves antiguas (una por ruta, geometria completa)
    try {
        Object.keys(window.localStorage)
            .filter((key) => key.startsWith(OSRM_LEGACY_PREFIX))
            .forEach((key) => window.localStorage.removeItem(key));
    } catch (error) {
        // Almacenamiento no disponible
    }

    /**
     * Hace un fetch a OSRM para obtener la polilínea de la ruta (con cache persistente)
     */
    async function fetchRoutePolyline(originPos, destinationPos) {
        if (!originPos || !destinationPos) return null;

        const routeHash = `${originPos.lat},${originPos.lng}_${destinationPos.lat},${destinationPos.lng}`;
        const cache = readOsrmCache();

        if (cache[routeHash]?.coordinates) {
            cache[routeHash].usedAt = Date.now();
            writeOsrmCache(cache);
            return { type: "LineString", coordinates: cache[routeHash].coordinates };
        }

        try {
            // overview=simplified: trazado suficiente para el mapa y mucho mas liviano
            const url = `${window.AppApi.OSRM_BASE}/${originPos.lng},${originPos.lat};${destinationPos.lng},${destinationPos.lat}?overview=simplified&geometries=geojson`;
            const response = await fetch(url);
            if (!response.ok) return null;
            const data = await response.json();

            if (data && data.code === "Ok" && data.routes && data.routes.length > 0) {
                // 5 decimales ~ 1 m de precision
                const coordinates = (data.routes[0].geometry?.coordinates || [])
                    .map(([lng, lat]) => [Math.round(lng * 1e5) / 1e5, Math.round(lat * 1e5) / 1e5]);
                if (coordinates.length < 2) return null;

                // Releer justo antes de guardar: otras rutas pudieron guardarse mientras tanto
                const freshCache = readOsrmCache();
                freshCache[routeHash] = { coordinates, usedAt: Date.now() };

                // Mantener solo las rutas usadas mas recientemente
                const keys = Object.keys(freshCache);
                if (keys.length > OSRM_CACHE_MAX_ROUTES) {
                    keys.sort((a, b) => (freshCache[a].usedAt || 0) - (freshCache[b].usedAt || 0))
                        .slice(0, keys.length - OSRM_CACHE_MAX_ROUTES)
                        .forEach((key) => delete freshCache[key]);
                }
                writeOsrmCache(freshCache);

                return { type: "LineString", coordinates };
            }
        } catch (e) {
            console.error("No se pudo obtener la ruta OSRM:", e);
        }
        return null; // Fallback to straight line if API fails
    }

    /**
     * Resetea la vista del mapa a todo el Perú
     */
    function resetMapView() {
        if (!mapState.mapInstance) return;
        // Peru Bounds roughly:
        mapState.mapInstance.flyToBounds([
            [-18.3, -81.3], // South West
            [-0.0, -68.6]   // North East
        ], { duration: 1.5 });
    }

    /**
     * Centra el mapa en una ruta específica o sus markers
     */
    function focusMapOnRoute(route) {
        if (!mapState.mapInstance || !route) return;

        const polyline = mapState.polylines.get(String(route.id));
        if (polyline) {
            mapState.mapInstance.flyToBounds(polyline.getBounds(), { padding: [40, 40], duration: 1 });
            return;
        }

        // Si no hay polyline por alguna razón, usamos los puntos de origen/destino
        const storedPositions = mapState.routePositions.get(String(route.id)) || {};
        const originPos = storedPositions.originPos || getCityPosition(route.origin, route.originId);
        const destinationPos = storedPositions.destinationPos || getCityPosition(route.destination, route.destinationId);

        if (originPos && destinationPos) {
            const bounds = L.latLngBounds(
                [originPos.lat, originPos.lng],
                [destinationPos.lat, destinationPos.lng]
            );
            mapState.mapInstance.flyToBounds(bounds, { padding: [50, 50], duration: 1 });
        }
    }

    /**
     * Inicializa la vista del mapa con Leaflet
     */
    function ensureMapView() {
        const canvas = document.getElementById("routeMapCanvas");
        if (!canvas) return false;

        if (mapState.mapInstance) {
            return true;
        }

        // Esperar a que Leaflet este cargado
        if (typeof L === 'undefined') {
            console.warn("Leaflet aún no está cargado.");
            return false;
        }

        // Crear mapa centrado en Peru por defecto
        mapState.mapInstance = L.map('routeMapCanvas', {
            zoomControl: false // Agregaremos uno personalizado o lo dejaremos libre
        }).setView([-10.0, -75.0], 5); // Centro aproximado de Perú, zoom 5

        L.control.zoom({
            position: 'bottomright'
        }).addTo(mapState.mapInstance);

        // Capa base gratuita sin API key: OpenStreetMap estandar.
        // (CARTO ahora exige API key y devuelve tiles "API KEY REQUIRED").
        const baseLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
            className: 'map-tiles-soft'
        }).addTo(mapState.mapInstance);

        // Respaldo gratuito (Esri World Street Map) si OSM falla varias veces
        let tileErrors = 0;
        const onTileError = () => {
            tileErrors += 1;
            if (tileErrors < 4) return;
            baseLayer.off('tileerror', onTileError);
            mapState.mapInstance.removeLayer(baseLayer);
            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors',
                maxZoom: 19,
                className: 'map-tiles-soft'
            }).addTo(mapState.mapInstance);
        };
        baseLayer.on('tileerror', onTileError);

        mapState.routeLayerGroup = L.layerGroup().addTo(mapState.mapInstance);
        mapState.markerLayerGroup = L.layerGroup().addTo(mapState.mapInstance);

        restrictMapToPeru(mapState.mapInstance);

        return true;
    }

    // ============================================
    // MAPA SOLO DE PERU
    // ============================================
    const PERU_GEOJSON_URL = "https://cdn.jsdelivr.net/gh/georgique/world-geojson@develop/countries/peru.json";
    const PERU_MAX_BOUNDS = [[-19.6, -82.8], [1.2, -67.2]];
    const MAP_MASK_COLOR = "#f3f0fb"; // igual al fondo del recuadro del mapa (.map-frame)

    /**
     * Limita el desplazamiento a Peru y tapa todo lo que queda fuera de su frontera
     */
    function restrictMapToPeru(map) {
        map.setMaxBounds(PERU_MAX_BOUNDS);
        map.options.maxBoundsViscosity = 1;
        map.setMinZoom(4);

        // Panel propio: encima de los tiles (200) y debajo de las rutas (400)
        const maskPane = map.createPane("peruMaskPane");
        maskPane.style.zIndex = 350;
        maskPane.style.pointerEvents = "none";
        // Renderer con margen amplio para que la mascara no "se corte" al arrastrar el mapa
        const maskRenderer = L.svg({ pane: "peruMaskPane", padding: 1 });

        fetch(PERU_GEOJSON_URL)
            .then((response) => (response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`))))
            .then((geojson) => {
                const features = Array.isArray(geojson?.features) ? geojson.features : [geojson];
                // Anillos exteriores de Peru en formato [lat, lng]
                const peruRings = [];
                features.forEach((feature) => {
                    const geometry = feature?.geometry;
                    if (!geometry) return;
                    const polygons = geometry.type === "MultiPolygon" ? geometry.coordinates : [geometry.coordinates];
                    polygons.forEach((polygon) => {
                        if (Array.isArray(polygon?.[0])) {
                            peruRings.push(polygon[0].map(([lng, lat]) => [lat, lng]));
                        }
                    });
                });
                if (peruRings.length === 0) return;

                // Rectangulo del mundo con Peru como "hueco"
                const worldRing = [[-90, -360], [-90, 360], [90, 360], [90, -360]];
                L.polygon([worldRing, ...peruRings], {
                    pane: "peruMaskPane",
                    renderer: maskRenderer,
                    stroke: false,
                    fillColor: MAP_MASK_COLOR,
                    fillOpacity: 1,
                    interactive: false
                }).addTo(map);

                // Contorno de Peru con el color de la marca
                L.polyline(peruRings, {
                    pane: "peruMaskPane",
                    renderer: maskRenderer,
                    color: "#6b3fa0",
                    weight: 2,
                    opacity: 0.55,
                    interactive: false
                }).addTo(map);
            })
            .catch((error) => {
                // Si falla, el mapa sigue limitado a Peru por maxBounds
                console.warn("No se pudo cargar el contorno de Peru:", error);
            });
    }

    // ============================================
    // MODALES
    // ============================================

    /**
     * Cierra el modal de ruta
     */
    function closeRouteModal() {
        const modal = document.getElementById("routeModal");
        if (!modal) return;
        modal.classList.remove("open");
        modal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("modal-open");
    }

    /**
     * Abre el modal de ruta
     */
    function openRouteModal(route) {
        const modal = document.getElementById("routeModal");
        const body = document.getElementById("routeModalBody");
        if (!modal || !body || !route) return;

        const referenceDate = getRouteReferenceDate(route);
        const dateLabel = AppUtils.formatDate(referenceDate);
        const statusLabel = route.status === "completed" ? "Completado" : "En progreso";
        const publicUrl = route.publicUrl && route.publicUrl !== "#" ? route.publicUrl : null;

        body.innerHTML = `
            <div class="modal-head route-modal-head">
                <div>
                    <h3>${route.origin} → ${route.destination}</h3>
                    <p>Conductor: ${route.driverName}</p>
                </div>
            </div>
            <div class="modal-grid">
                <article class="modal-metric">
                    <p>Distancia estimada</p>
                    <strong>${AppUtils.formatNumber(route.distanceKm)} km</strong>
                </article>
                <article class="modal-metric">
                    <p>KM recorridos</p>
                    <strong>${AppUtils.formatNumber(route.kmDriven)} km</strong>
                </article>
                <article class="modal-metric">
                    <p>Estado</p>
                    <strong>${statusLabel}</strong>
                </article>
                <article class="modal-metric">
                    <p>Fecha referencia</p>
                    <strong>${dateLabel}</strong>
                </article>
                <article class="modal-metric">
                    <p>Origen</p>
                    <strong>${route.origin}</strong>
                </article>
                <article class="modal-metric">
                    <p>Destino</p>
                    <strong>${route.destination}</strong>
                </article>
                <article class="modal-metric">
                    <p>Daño (Camión / Carga)</p>
                    <strong style="${route.vehicleDamage > 0 || route.trailersDamage > 0 ? 'color: #dc2626;' : 'color: #16a34a;'}">
                        ${route.vehicleDamage}% / ${route.trailersDamage}%
                    </strong>
                </article>
            </div>
            ${publicUrl ? `<p class="modal-route-link"><a href="${publicUrl}" target="_blank" rel="noopener noreferrer">Ver viaje en Trucky</a></p>` : ""}
        `;

        modal.classList.add("open");
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("modal-open");
    }

    // ============================================
    // RENDERIZADO
    // ============================================

    /**
     * Establece el botón de ruta activo
     */
    function setActiveRouteButton(element) {
        document.querySelectorAll(".route-item.active").forEach((item) => {
            item.classList.remove("active");
        });
        if (element) element.classList.add("active");
    }

    /**
     * Establece los elementos del mapa activos (Leaflet)
     */
    function setActiveRouteMapElements(routeId) {
        if (!mapState.mapInstance) return;
        const key = String(routeId || "");

        // Reset all styles
        mapState.polylines.forEach((layer) => {
            layer.setStyle({ weight: 4, opacity: 0.5 });
        });

        // Highlight selected
        const selectedLayer = mapState.polylines.get(key);
        if (selectedLayer) {
            selectedLayer.setStyle({ weight: 7, opacity: 1 });
            selectedLayer.bringToFront();
        }
    }

    /**
     * Crea un marcador de ruta
     */
    function createMarker(route, position, label, markerType, onClick) {
        const marker = document.createElement("button");
        marker.type = "button";
        marker.className = `route-marker ${markerType}`;
        marker.title = label;
        marker.setAttribute("aria-label", label);
        marker.dataset.routeId = String(route.id || "");
        marker.style.left = `${position.x}%`;
        marker.style.top = `${position.y}%`;
        marker.addEventListener("click", (event) => {
            event.stopPropagation();
            onClick();
        });
        return marker;
    }

    /**
     * Renderiza las rutas en el mapa de Leaflet
     */
    async function renderRoutes(routes, source) {
        const routeList = document.getElementById("routeList");
        const routeIndicator = document.getElementById("routeIndicator");

        if (!routeList || !routeIndicator) return;
        if (!ensureMapView()) {
            // Reintentar si Leaflet no cargó aún
            setTimeout(() => renderRoutes(routes, source), 500);
            return;
        }
        mapState.mapInstance.invalidateSize();

        routeList.innerHTML = "";

        mapState.routeLayerGroup.clearLayers();
        mapState.markerLayerGroup.clearLayers();
        mapState.polylines.clear();
        mapState.routePositions.clear();
        mapState.paletteIndex = 0;
        const renderId = ++mapState.renderId;

        const activeCount = routes.length;
        const todayLabel = AppUtils.getTodayLabelInLima();

        routeIndicator.textContent = activeCount > 0
            ? `${activeCount} conductores con su ultima ruta en curso (72h) al ${todayLabel}`
            : `Sin rutas en curso por conductor en las ultimas 72h (${todayLabel})`;

        if (source === "fallback") {
            routeIndicator.textContent += " (modo demostracion)";
        }

        if (routes.length === 0) {
            routeList.innerHTML = '<p class="hint">No hay viajes recientes para mostrar.</p>';
            resetMapView();
            return;
        }

        // Crear una lista de promesas para OSRM fetching
        const routeRenderPromises = routes.map(async (route) => {
            const item = document.createElement("button");
            item.type = "button";
            item.className = "route-item route-trip-btn";
            item.innerHTML = `
                <span class="route-trip-main">
                    <h4 class="route-trip-cities">
                        <span class="city-name">${route.origin}</span>
                        <span class="city-arrow">→</span>
                        <span class="city-name">${route.destination}</span>
                    </h4>
                    <p class="route-trip-meta">${AppUtils.formatNumber(route.distanceKm)} km · Conductor: ${route.driverName}</p>
                </span>
                <span class="route-trip-km">${AppUtils.formatNumber(route.kmDriven)} km</span>
            `;

            const handleSelect = () => {
                setActiveRouteButton(item);
                setActiveRouteMapElements(route.id);
                focusMapOnRoute(route);
                openRouteModal(route);
            };

            item.addEventListener("click", handleSelect);
            routeList.appendChild(item);

            // Color asignado en el orden de la lista (estable aunque la geocodificacion tarde)
            const routeColor = mapState.colorPalette[mapState.paletteIndex % mapState.colorPalette.length];
            mapState.paletteIndex++;
            item.style.setProperty("--route-color", routeColor);

            const [originPos, destinationPos] = await Promise.all([
                resolveCityPosition(route.origin, route.originId),
                resolveCityPosition(route.destination, route.destinationId)
            ]);

            // Si mientras tanto se volvio a renderizar, descartar este resultado
            if (renderId !== mapState.renderId) return;

            if (!originPos || !destinationPos) {
                console.warn("Ruta sin coordenadas conocidas:", route.origin, "->", route.destination);
            }

            if (originPos && destinationPos) {
                mapState.routePositions.set(String(route.id), { originPos, destinationPos });

                // Obtener geometria real
                const geojsonFeature = await fetchRoutePolyline(originPos, destinationPos);
                if (renderId !== mapState.renderId) return;

                let routeLayer;

                if (geojsonFeature) {
                    // Trazar línea de OSRM
                    routeLayer = L.geoJSON(geojsonFeature, {
                        style: {
                            color: routeColor,
                            weight: 4,
                            opacity: 0.7,
                            lineCap: 'round',
                            lineJoin: 'round'
                        }
                    }).addTo(mapState.routeLayerGroup);
                } else {
                    // Fallback a línea recta si falla OSRM
                    routeLayer = L.polyline([
                        [originPos.lat, originPos.lng],
                        [destinationPos.lat, destinationPos.lng]
                    ], {
                        color: routeColor,
                        weight: 4,
                        opacity: 0.7,
                        dashArray: '10, 10'
                    }).addTo(mapState.routeLayerGroup);
                }

                // Guardar referencia para eventos
                mapState.polylines.set(String(route.id), routeLayer);

                // Crear círculos en origen y destino
                const originMarker = L.circleMarker([originPos.lat, originPos.lng], {
                    radius: 5,
                    fillColor: "#fff",
                    color: routeColor,
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 1
                });

                const busSvg = `
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="18" height="12" rx="2" fill="${routeColor}" />
                    <rect x="5" y="6" width="3" height="3" rx="0.5" fill="rgba(255,255,255,0.7)" />
                    <rect x="10.5" y="6" width="3" height="3" rx="0.5" fill="rgba(255,255,255,0.7)" />
                    <rect x="16" y="6" width="3" height="3" rx="0.5" fill="rgba(255,255,255,0.7)" />
                    <circle cx="7" cy="18" r="2.5" fill="#0f172a" />
                    <circle cx="17" cy="18" r="2.5" fill="#0f172a" />
                </svg>`;

                const destMarker = L.marker([destinationPos.lat, destinationPos.lng], {
                    icon: L.divIcon({
                        html: `<div class="bus-marker-wrapper" style="display: flex; align-items: center; justify-content: center; transform: scale(1.3); transition: all 0.3s ease; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">${busSvg}</div>`,
                        className: '',
                        iconSize: [32, 32],
                        iconAnchor: [16, 16]
                    })
                });

                originMarker.bindTooltip(`Origen: ${route.origin}`).addTo(mapState.markerLayerGroup);
                destMarker.bindTooltip(`Destino: ${route.destination} (${route.driverName})`).addTo(mapState.markerLayerGroup);

                // Eventos Leaflet
                routeLayer.on('click', handleSelect);
                destMarker.on('click', handleSelect);
                originMarker.on('click', handleSelect);
            }
        });

        // Esperar a que todss se rendericen para hacer el fitBounds general
        Promise.allSettled(routeRenderPromises).then(() => {
            if (renderId !== mapState.renderId) return;
            const allPolylines = Array.from(mapState.polylines.values());
            if (allPolylines.length > 0) {
                const group = new L.featureGroup(allPolylines);
                mapState.mapInstance.fitBounds(group.getBounds(), { padding: [30, 30] });
            } else {
                resetMapView();
            }
        });
    }

    // ============================================
    // EVENTOS
    // ============================================

    /**
     * Configura los eventos del modal
     */
    function setupModalEvents() {
        const closeButton = document.getElementById("closeRouteModal");
        const modal = document.getElementById("routeModal");

        closeButton?.addEventListener("click", closeRouteModal);

        modal?.addEventListener("click", (event) => {
            if (event.target === modal) closeRouteModal();
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") closeRouteModal();
        });
    }

    // ============================================
    // EXPORTS
    // ============================================

    return {
        LAST_ROUTE_WINDOW_HOURS,
        getLatestOpenRoutePerDriverInLastHours,
        buildRouteTrips,
        getAssignedRouteByDriver,
        renderRoutes,
        setupModalEvents
    };
})(window.AppUtils);
