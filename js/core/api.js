/* 
   ___  _____    ___
  /   ||  _  |  /   | _
 / /| || |/' | / /| |(_)
/ /_| ||  /| |/ /_| |
\_CONEXIÓN INESTABLE| _
    |_/ \___/     |_/(_)

  https://angeldivinopsv.vercel.app/

  API Module - Capa de comunicación con Trucky API
*/

"use strict";

window.AppApi = ((AppUtils) => {
    // ============================================
    // CONSTANTES
    // ============================================
    // Detectar si estamos en producción (Vercel) o en local
    const IS_LOCAL = typeof window !== "undefined" && (
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
    );

    const PROXY_BASE = "/api/trucky";

    const API_BASE = IS_LOCAL
        ? "https://e.truckyapp.com/api/v1/company/45279"
        : `${PROXY_BASE}/api/v1/company/45279`;

    // URL base para llamadas a api.mdcdev.me (PeruServer)
    const MDCDEV_BASE = IS_LOCAL
        ? "https://api.mdcdev.me/v2/peruserver/trucky"
        : "/api/mdcdev";

    // URL base para OSRM (utilizada en rutas)
    const OSRM_BASE = IS_LOCAL
        ? "https://router.project-osrm.org/route/v1/driving"
        : "/api/osrm";

    const MAX_JOB_PAGES = 3;
    const RECENT_ROUTES_ENDPOINT = "/jobs?top=0&page=1&perPage=100&status=in_progress&sortingField=updated_at&sortingDirection=desc";
    const DEFAULT_TIMEOUT_MS = 12000;
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 350;

    const TRUCKY_HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
        Referer: "https://hub.truckyapp.com/",
        Origin: "https://hub.truckyapp.com",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8"
    };

    // ============================================
    // FUNCIONES PRIVADAS
    // ============================================

    /**
     * Obtiene los headers para las peticiones
     * Elimina headers bloqueados por navegadores
     */
    function getRequestHeaders() {
        const headers = { ...TRUCKY_HEADERS };

        if (typeof window !== "undefined") {
            delete headers["User-Agent"];
            delete headers.Referer;
            delete headers.Origin;
        }

        return headers;
    }

    // ============================================
    // PROTECCION CONTRA BLOQUEOS (HTTP 429)
    // Si Trucky limita las peticiones, se pausan TODAS las llamadas a Trucky un tiempo
    // en vez de seguir insistiendo (insistir alarga el bloqueo).
    // ============================================
    const RATE_LIMIT_KEY = "Angel Divino:trucky-rate-limit:v1";
    const RATE_LIMIT_DEFAULT_MS = 2 * 60 * 1000;
    const RATE_LIMIT_MAX_MS = 10 * 60 * 1000;
    const inFlightRequests = new Map();

    let rateLimitedUntil = (() => {
        try {
            return Number(window.localStorage.getItem(RATE_LIMIT_KEY)) || 0;
        } catch {
            return 0;
        }
    })();

    function isTruckyUrl(url) {
        const value = String(url || "");
        return value.includes("truckyapp.com") || value.includes("/api/trucky");
    }

    function isRateLimited() {
        return Date.now() < rateLimitedUntil;
    }

    function noteRateLimit(retryAfterHeader) {
        const retryAfterSec = Number(retryAfterHeader);
        const waitMs = Number.isFinite(retryAfterSec) && retryAfterSec > 0
            ? Math.min(retryAfterSec * 1000, RATE_LIMIT_MAX_MS)
            : RATE_LIMIT_DEFAULT_MS;
        rateLimitedUntil = Math.max(rateLimitedUntil, Date.now() + waitMs);
        try {
            // Compartido entre pestañas del mismo visitante
            window.localStorage.setItem(RATE_LIMIT_KEY, String(rateLimitedUntil));
        } catch {
            // Ignorar
        }
    }

    class HttpError extends Error {
        constructor(status, url) {
            super(`HTTP ${status} en ${url}`);
            this.status = status;
        }
    }

    async function doFetchJson(url, timeoutMs) {
        if (isTruckyUrl(url) && isRateLimited()) {
            throw new HttpError(429, url); // no tocar la red mientras dure la pausa
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(url, {
                headers: getRequestHeaders(),
                signal: controller.signal
            });

            if (!response.ok) {
                if (response.status === 429 && isTruckyUrl(url)) {
                    noteRateLimit(response.headers.get("retry-after"));
                }
                throw new HttpError(response.status, url);
            }

            return await response.json();
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Fetch JSON con timeout. Peticiones identicas simultaneas se comparten (una sola llamada).
     */
    function fetchJson(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
        const key = String(url);
        if (inFlightRequests.has(key)) return inFlightRequests.get(key);

        const request = doFetchJson(url, timeoutMs).finally(() => {
            inFlightRequests.delete(key);
        });
        inFlightRequests.set(key, request);
        return request;
    }

    /**
     * Fetch con reintentos solo para fallos de red/servidor (nunca ante 429 u otros 4xx)
     */
    async function fetchWithRetry(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
        let lastError = null;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
            try {
                return await fetchJson(url, timeoutMs);
            } catch (error) {
                lastError = error;
                const status = Number(error?.status) || 0;
                if (status >= 400 && status < 500) break;

                if (attempt < MAX_RETRIES) {
                    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
                }
            }
        }

        throw lastError;
    }

    // ============================================
    // FUNCIONES PÚBLICAS
    // ============================================

    /**
     * Fetch a un endpoint específico
     */
    async function fetchEndpoint(endpoint) {
        try {
            return await fetchJson(`${API_BASE}${endpoint}`);
        } catch (error) {
            if (Number(error?.status) === 429) {
                console.warn("Trucky limito las peticiones; se usan los datos guardados:", endpoint);
            } else {
                console.error("Error API endpoint:", endpoint, error);
            }
            return null;
        }
    }

    /**
     * Fetch paginado con detalles de errores
     */
    async function fetchPaginatedDetailed(endpoint, maxPages = MAX_JOB_PAGES) {
        let nextUrl = `${API_BASE}${endpoint}`;
        const allRows = [];
        let hasError = false;

        for (let page = 1; page <= maxPages && nextUrl; page += 1) {
            let payload = null;
            let pageError = null;

            try {
                payload = await fetchWithRetry(nextUrl);
                pageError = null;
            } catch (error) {
                pageError = error;
            }

            if (!payload) {
                console.error("Error paginado:", pageError);
                hasError = true;
                break;
            }

            allRows.push(...AppUtils.getDataArray(payload));
            nextUrl = payload?.next_page_url || null;

            if (nextUrl && !IS_LOCAL) {
                // Forzar el uso del proxy para las paginaciones también (Universal)
                nextUrl = nextUrl.replace("https://e.truckyapp.com/api/v1/company/45279", `${PROXY_BASE}/api/v1/company/45279`);
                nextUrl = nextUrl.replace("https://e.truckyapp.com", PROXY_BASE);
            }
        }

        return {
            rows: allRows,
            hasError
        };
    }

    /**
     * Fetch paginado simple
     */
    async function fetchPaginated(endpoint, maxPages = MAX_JOB_PAGES) {
        const result = await fetchPaginatedDetailed(endpoint, maxPages);
        return result.rows;
    }

    // ============================================
    // EXPORTS
    // ============================================

    return {
        IS_LOCAL,
        API_BASE,
        MDCDEV_BASE,
        OSRM_BASE,
        MAX_JOB_PAGES,
        RECENT_ROUTES_ENDPOINT,
        TRUCKY_HEADERS,
        fetchEndpoint,
        fetchJson,
        fetchWithRetry,
        isRateLimited,
        fetchPaginated,
        fetchPaginatedDetailed
    };
})(window.AppUtils);
