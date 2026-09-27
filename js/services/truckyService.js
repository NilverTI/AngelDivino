/* 
   ___  _____    ___
  /   ||  _  |  /   | _
 / /| || |/' | / /| |(_)
/ /_| ||  /| |/ /_| |
\_CONEXIÓN INESTABLE| _
    |_/ \___/     |_/(_)

  https://angeldivinopsv.vercel.app/

  Trucky Service Module - Capa de servicio para API de Trucky
*/

"use strict";

window.TruckyService = ((AppUtils, AppApi) => {
    // ============================================
    // CONSTANTES
    // ============================================
    const DEFAULT_AVATAR = "assets/img/default-avatar.svg";
    const MAX_MONTH_JOB_PAGES = 120;
    const COMPANY_CACHE_KEY = "Angel Divino:company-data:v4";
    // Si la cache tiene menos de este tiempo, no se vuelve a consultar Trucky al cargar
    const COMPANY_CACHE_FRESH_MS = 10 * 60 * 1000;
    const MONTH_CACHE_KEY = "Angel Divino:month-cache:v2";
    const TOTALS_CACHE_KEY = "Angel Divino:totals-cache:v4";
    const TOTALS_REVALIDATE_MS = 4 * 60 * 60 * 1000;
    const CURRENT_MONTH_CACHE_MS = 10 * 60 * 1000;
    const MAX_PERSISTED_MONTHS = 96;
    const FAST_LOAD_TIMEOUT_MS = 9000;
    const YEARLY_STATS_TIMEOUT_MS = 4500;
    const RANGE_JOBS_PER_PAGE = 100;
    const MAX_RANGE_JOB_PAGES = 160;
    // Acumulado por conductor desde el 01/01/2026 (todas sus empresas en Trucky).
    // v3 guarda los trabajos en formato compacto; v2 guardaba el JSON completo (~8 MB).
    const USER_TOTALS_CACHE_KEY = "Angel Divino:user-totals:v3";
    const LEGACY_USER_TOTALS_CACHE_KEY = "Angel Divino:user-totals:v2";
    const USER_TOTALS_CACHE_MS = 20 * 60 * 1000;
    const USER_HISTORY_START_MS = Date.parse("2026-01-01T00:00:00-05:00"); // 01/01/2026 hora de Lima
    const USER_PAGE_DELAY_MS = 400;
    const USER_DELAY_MS = 600;
    const USER_ERROR_BACKOFF_MS = 5 * 60 * 1000;
    const USER_JOBS_PER_PAGE = 100;
    const USER_JOBS_MAX_PAGES = 60;
    const USER_TOTALS_TIMEOUT_MS = 12000;
    const FAST_JOBS_ENDPOINT = "/jobs?top=0&page=1&perPage=100&sortingField=updated_at&sortingDirection=desc";
    const PERUSERVER_TOP_CACHE_KEY = "Angel Divino:peruserver-top:v1";
    const PERUSERVER_TOP_CACHE_MS = 10 * 60 * 1000;
    const PERUSERVER_TOP_TIMEOUT_MS = 9000;
    const PERUSERVER_TOP_MONTHLY_URL = `${AppApi.MDCDEV_BASE}/top-km/monthly?limit=50`;

    const PLACEHOLDER_AVATAR_SIGNATURES = [
        "fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb",
        "0000000000000000000000000000000000000000"
    ];

    // ============================================
    // CACHÉ
    // ============================================
    const monthCache = new Map();
    const userTotalsCache = new Map();
    const userTotalsInFlight = new Map();

    // Inicializar caché al cargar
    hydrateMonthCache();
    hydrateUserTotalsCache();

    // ============================================
    // FUNCIONES DE ALMACENAMIENTO
    // ============================================

    function canUseStorage() {
        if (typeof window === "undefined") return false;
        try {
            return !!window.localStorage;
        } catch {
            return false;
        }
    }

    function readStorage(key) {
        if (!canUseStorage()) return null;
        try {
            const raw = window.localStorage.getItem(key);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (error) {
            console.warn("No se pudo leer cache local:", key, error);
            return null;
        }
    }

    function writeStorage(key, value) {
        if (!canUseStorage()) return;
        try {
            window.localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.warn("No se pudo guardar cache local:", key, error);
        }
    }

    function hydrateMonthCache() {
        const stored = readStorage(MONTH_CACHE_KEY);
        if (!Array.isArray(stored)) return;

        stored.forEach((entry) => {
            if (!Array.isArray(entry) || entry.length !== 2) return;
            const [cacheKey, cacheValue] = entry;
            if (!cacheKey || !cacheValue || typeof cacheValue !== "object") return;
            monthCache.set(String(cacheKey), cacheValue);
        });
    }

    function persistMonthCache() {
        const entries = [...monthCache.entries()].slice(-MAX_PERSISTED_MONTHS);
        writeStorage(MONTH_CACHE_KEY, entries);
    }

    // Trabajo compacto: [id, km, completedAtMs, origen, destino]
    function compactUserJob(row) {
        if (Array.isArray(row)) return row;
        const status = AppUtils.normalizeText(row?.status || "completed");
        if (status && status !== "completed") return null;

        const id = AppUtils.toNumber(row?.id);
        if (!id) return null;

        const dateMs = Date.parse(row?.completed_at || row?.updated_at || row?.started_at || "");
        return [
            id,
            AppUtils.toNumber(row?.driven_distance_km ?? row?.driven_distance),
            Number.isFinite(dateMs) ? dateMs : 0,
            String(row?.source_city_name || row?.origin || "Origen"),
            String(row?.destination_city_name || row?.destination || "Destino")
        ];
    }

    function expandUserJob(job, userId) {
        const completedAt = job[2] ? new Date(job[2]).toISOString() : null;
        return {
            id: job[0],
            userId,
            origin: job[3],
            destination: job[4],
            status: "completed",
            plannedKm: job[1],
            drivenKm: job[1],
            startedAt: completedAt,
            completedAt,
            updatedAt: completedAt,
            publicUrl: "#"
        };
    }

    function sumUserJobsKm(jobs) {
        return (jobs || []).reduce((sum, job) => sum + AppUtils.toNumber(job[1]), 0);
    }

    function hydrateUserTotalsCache() {
        let stored = readStorage(USER_TOTALS_CACHE_KEY);

        // Migrar la cache v2 (pesada) a v3 compacta, sin volver a pedir nada a Trucky
        if (!stored || typeof stored !== "object") {
            const legacy = readStorage(LEGACY_USER_TOTALS_CACHE_KEY);
            if (legacy && typeof legacy === "object") {
                stored = {};
                Object.entries(legacy).forEach(([userId, value]) => {
                    if (!value || !Array.isArray(value.jobs)) return;
                    stored[userId] = {
                        cachedAt: 0, // forzar una revision incremental
                        updatedAtRef: "",
                        jobs: value.jobs.map(compactUserJob).filter((job) => job && job[2] >= USER_HISTORY_START_MS)
                    };
                });
            }
        }

        if (canUseStorage()) {
            try {
                window.localStorage.removeItem(LEGACY_USER_TOTALS_CACHE_KEY);
                window.localStorage.removeItem("Angel Divino:company-months:v1");
            } catch {
                // Ignorar
            }
        }

        if (!stored || typeof stored !== "object") return;

        Object.entries(stored).forEach(([userId, value]) => {
            if (!userId || !value || !Array.isArray(value.jobs)) return;
            const jobs = value.jobs.filter((job) => Array.isArray(job));
            userTotalsCache.set(String(userId), {
                jobs,
                totalKm: sumUserJobsKm(jobs),
                cachedAt: AppUtils.toNumber(value.cachedAt),
                updatedAtRef: String(value.updatedAtRef || "")
            });
        });

        persistUserTotalsCache();
    }

    function persistUserTotalsCache() {
        const serialized = {};
        userTotalsCache.forEach((value, key) => {
            serialized[key] = {
                cachedAt: value.cachedAt,
                updatedAtRef: value.updatedAtRef,
                jobs: value.jobs
            };
        });
        writeStorage(USER_TOTALS_CACHE_KEY, serialized);
    }

    // ============================================
    // NORMALIZACIÓN
    // ============================================

    function sanitizeCompanyTotals(value) {
        if (!value || typeof value !== "object") return null;

        return {
            companyId: AppUtils.toNumber(value.companyId),
            totalDistance: AppUtils.toNumber(value.totalDistance),
            totalJobs: AppUtils.toNumber(value.totalJobs),
            realKm: AppUtils.toNumber(value.realKm),
            raceKm: AppUtils.toNumber(value.raceKm),
            jobsCompleted: AppUtils.toNumber(value.jobsCompleted),
            jobsCanceled: AppUtils.toNumber(value.jobsCanceled),
            year: AppUtils.toNumber(value.year),
            rangeStart: String(value.rangeStart || ""),
            rangeEnd: String(value.rangeEnd || ""),
            period: String(value.period || ""),
            monthsProcessed: AppUtils.toNumber(value.monthsProcessed),
            monthsWithErrors: AppUtils.toNumber(value.monthsWithErrors),
            monthsTotal: AppUtils.toNumber(value.monthsTotal),
            source: value.source || "members-fallback",
            cachedAt: AppUtils.toNumber(value.cachedAt)
        };
    }

    function getCachedTotals() {
        return sanitizeCompanyTotals(readStorage(TOTALS_CACHE_KEY));
    }

    function saveCachedTotals(totals) {
        const normalized = sanitizeCompanyTotals(totals);
        if (!normalized) return;
        writeStorage(TOTALS_CACHE_KEY, normalized);
    }

    function getFallbackCompanyTotals(normalizedMembers, normalizedJobs, range) {
        const safeRange = range || buildYearToDateRange();
        const jobs = Array.isArray(normalizedJobs) ? normalizedJobs : [];

        const jobsInRange = jobs.filter((job) => {
            const completedAt = job?.completedAt || job?.updatedAt || job?.startedAt;
            if (!completedAt) return false;
            const dateKey = getDateKeyInTimeZone(completedAt);
            if (!dateKey) return false;
            return dateKey >= safeRange.dateFrom && dateKey <= safeRange.dateTo;
        });

        const totals = aggregateCompletedJobs(jobsInRange);
        const nowYear = safeRange.year || new Date().getFullYear();
        const totalDrivers = Array.isArray(normalizedMembers) ? normalizedMembers.length : 0;

        return {
            companyId: extractCompanyId(),
            totalDistance: AppUtils.toNumber(totals.totalDistance),
            totalJobs: AppUtils.toNumber(totals.totalJobs),
            realKm: 0,
            raceKm: 0,
            jobsCompleted: AppUtils.toNumber(totals.totalJobs),
            jobsCanceled: 0,
            year: nowYear,
            rangeStart: safeRange.dateFrom,
            rangeEnd: safeRange.dateTo,
            period: safeRange.period || "year-to-date",
            monthsProcessed: 0,
            monthsWithErrors: 0,
            monthsTotal: 0,
            source: totalDrivers > 0 ? "jobs-fallback" : "fallback",
            cachedAt: Date.now()
        };
    }

    function sanitizeCachedPayload(payload) {
        if (!payload || typeof payload !== "object") return null;

        // Caches antiguas guardaban el km del mes de Trucky como "totalKm"
        const members = (Array.isArray(payload.members) ? payload.members : []).map((member) => (
            member && member.monthKm === undefined && member.totalKm !== undefined
                ? { ...member, monthKm: AppUtils.toNumber(member.totalKm), totalKm: undefined }
                : member
        ));
        const jobs = Array.isArray(payload.jobs) ? payload.jobs : [];
        const recentJobs = Array.isArray(payload.recentJobs) ? payload.recentJobs : [];

        if (members.length === 0 || jobs.length === 0) return null;
        // Nunca reutilizar datos de demostracion como si fueran reales
        if (payload.source === "fallback") return null;

        return {
            source: payload.source || "api",
            members,
            jobs,
            recentJobs,
            companyTotals: sanitizeCompanyTotals(payload.companyTotals),
            monthKmByDriver: Array.isArray(payload.monthKmByDriver) ? payload.monthKmByDriver : undefined,
            statsRange: payload.statsRange && typeof payload.statsRange === "object" ? payload.statsRange : undefined
        };
    }

    function getCachedCompanyData() {
        const stored = readStorage(COMPANY_CACHE_KEY);
        if (!stored || typeof stored !== "object") return null;

        const payload = sanitizeCachedPayload(stored.payload);
        if (!payload) return null;

        return {
            ...payload,
            cachedAt: AppUtils.toNumber(stored.cachedAt)
        };
    }

    function isCompanyCacheFresh(cachedPayload = getCachedCompanyData()) {
        if (!cachedPayload) return false;
        const ageMs = Date.now() - AppUtils.toNumber(cachedPayload.cachedAt);
        return ageMs >= 0 && ageMs <= COMPANY_CACHE_FRESH_MS;
    }

    function saveCachedCompanyData(payload) {
        const safePayload = sanitizeCachedPayload(payload);
        if (!safePayload) return;

        writeStorage(COMPANY_CACHE_KEY, {
            cachedAt: Date.now(),
            payload: safePayload
        });
    }

    // ============================================
    // UTILIDADES
    // ============================================

    function withDeadline(promise, timeoutMs = FAST_LOAD_TIMEOUT_MS) {
        return Promise.race([
            promise,
            new Promise((resolve) => {
                window.setTimeout(() => resolve(null), timeoutMs);
            })
        ]);
    }

    function sanitizeAvatarUrl(value) {
        let url = String(value || "").trim();
        if (!url) return DEFAULT_AVATAR;

        // Si es solo un nombre de archivo, asumimos que es de Trucky
        if (!url.startsWith("http")) {
            url = `https://cdn.truckyapp.com/public/users/avatars/${url}`;
        }

        const lowerUrl = url.toLowerCase();
        
        // Verificar si es un placeholder de Steam o Trucky
        const isPlaceholder = PLACEHOLDER_AVATAR_SIGNATURES.some((signature) => lowerUrl.includes(signature));
        if (isPlaceholder) return DEFAULT_AVATAR;

        // Si no estamos en local y la imagen es de Trucky, heredar el proxy para evitar el bloqueo CORB/ORB
        if (!AppApi.IS_LOCAL && url.includes("truckyapp.com")) {
            // Convertimos: https://cdn.truckyapp.com/public/users/239598/image.jpg
            // En: /api/trucky-user/cdn.truckyapp.com/public/users/avatars/...
            return `/api/trucky-user/${url.replace("https://", "")}`;
        }

        return url;
    }

    function normalizeMembers(rows) {
        return rows.map((row, index) => {
            const memberId = AppUtils.toNumber(row.id || index + 1);
            const memberUpdatedAt = row.updated_at || row.updatedAt || "";
            const cachedTotal = getCachedUserTotalDistance(memberId, memberUpdatedAt);

            return {
                id: memberId,
                name: row.name || row.username || `Conductor ${index + 1}`,
                role: row.role?.name || row.role || "Conductor",
                level: AppUtils.toNumber(row.level),
                updatedAt: row.updated_at || row.updatedAt || null,
                avatar: sanitizeAvatarUrl(row.avatar_url || row.avatar || DEFAULT_AVATAR),
                // Trucky: en /members, total_driven_distance_km es el kilometraje del MES ACTUAL
                // (es el mismo valor que muestra Trucky Hub para cada miembro).
                monthKm: AppUtils.toNumber(row.total_driven_distance_km ?? row.km_driven_total),
                totalDistanceKm: AppUtils.toNumber(cachedTotal?.totalKm)
            };
        });
    }

    function normalizeJobs(rows) {
        return rows.map((row, index) => {
            const startedAt = row.started_at || row.created_at || null;
            const completedAt = row.completed_at || null;
            const updatedAt = row.updated_at || startedAt || completedAt || null;

            return {
                id: AppUtils.toNumber(row.id || index + 1),
                userId: AppUtils.toNumber(row.user_id || row.driver?.id),
                driverName: row.driver?.name || row.driver_username || row.username || "Sin conductor",
                origin: row.source_city_name || row.origin_city || "Origen",
                originId: row.source_city_id || row.origin_city_id || null,
                destination: row.destination_city_name || row.destination_city || "Destino",
                destinationId: row.destination_city_id || row.destination_id || null,
                status: row.status || "completed",
                plannedKm: AppUtils.toNumber(row.planned_distance_km ?? row.distance ?? row.planned_distance),
                drivenKm: AppUtils.toNumber(row.driven_distance_km ?? row.driven_distance),
                vehicleDamage: AppUtils.toNumber(row.vehicle_damage),
                trailersDamage: AppUtils.toNumber(row.trailers_damage),
                startedAt,
                completedAt,
                updatedAt,
                publicUrl: row.public_url || "#"
            };
        });
    }

    function extractCompanyId() {
        const match = String(AppApi.API_BASE || "").match(/\/company\/(\d+)/i);
        return AppUtils.toNumber(match?.[1]);
    }

    function buildMonthRange(startDateIso) {
        const now = new Date();
        const startDate = new Date(startDateIso || now.toISOString());

        if (Number.isNaN(startDate.getTime())) {
            return [{ month: now.getMonth() + 1, year: now.getFullYear() }];
        }

        const monthCursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        const endDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const months = [];

        while (monthCursor <= endDate) {
            months.push({
                month: monthCursor.getMonth() + 1,
                year: monthCursor.getFullYear()
            });
            monthCursor.setMonth(monthCursor.getMonth() + 1);
        }

        return months;
    }

    function getTimeZoneParts(date = new Date(), timeZone = AppUtils.LIMA_TIME_ZONE) {
        const parts = new Intl.DateTimeFormat("en-CA", {
            timeZone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).formatToParts(date);

        const map = {};
        parts.forEach((part) => {
            map[part.type] = part.value;
        });

        return {
            year: AppUtils.toNumber(map.year),
            month: AppUtils.toNumber(map.month),
            day: AppUtils.toNumber(map.day)
        };
    }

    function formatDateParts({ year, month, day }) {
        const pad = (value) => String(value).padStart(2, "0");
        return `${year}-${pad(month)}-${pad(day)}`;
    }

    function getDateKeyInTimeZone(isoString, timeZone = AppUtils.LIMA_TIME_ZONE) {
        if (!isoString) return "";
        const date = new Date(isoString);
        if (Number.isNaN(date.getTime())) return "";
        return formatDateParts(getTimeZoneParts(date, timeZone));
    }

    function buildMonthToDateRange(now = new Date(), timeZone = AppUtils.LIMA_TIME_ZONE) {
        const parts = getTimeZoneParts(now, timeZone);
        const month = String(parts.month).padStart(2, "0");

        return {
            period: "month-to-date",
            year: parts.year,
            month: parts.month,
            dateFrom: `${parts.year}-${month}-01`,
            dateTo: formatDateParts(parts)
        };
    }

    function buildYearToDateRange(now = new Date(), timeZone = AppUtils.LIMA_TIME_ZONE) {
        const parts = getTimeZoneParts(now, timeZone);

        return {
            period: "year-to-date",
            year: parts.year,
            dateFrom: `${parts.year}-01-01`,
            dateTo: formatDateParts(parts)
        };
    }

    function getApiOrigin() {
        // En producción usamos el proxy de Vercel para los endpoints de usuario
        // En local llamamos directamente a truckyapp.com
        return AppApi.IS_LOCAL
            ? "https://e.truckyapp.com"
            : "/api/trucky-user";
    }

    function buildUserJobsEndpoint(userId, page = 1) {
        const safeUserId = AppUtils.toNumber(userId);
        const safePage = Math.max(1, AppUtils.toNumber(page));
        return `${getApiOrigin()}/api/v1/user/${safeUserId}/jobs?page=${safePage}&perPage=${USER_JOBS_PER_PAGE}&status=completed&sortingField=updated_at&sortingDirection=desc`;
    }

    function buildUserDetailEndpoint(userId) {
        const safeUserId = AppUtils.toNumber(userId);
        return `${getApiOrigin()}/api/v2/user/${safeUserId}`;
    }

    function buildCompanyJobsEndpoint({
        page,
        perPage = RANGE_JOBS_PER_PAGE,
        status,
        userId,
        dateFrom,
        dateTo
    }) {
        const params = new URLSearchParams();
        params.set("page", String(Math.max(1, AppUtils.toNumber(page) || 1)));
        if (perPage) params.set("perPage", String(perPage));
        if (status) params.set("status", status);
        if (userId) params.set("user_id", String(userId));
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);

        return `/jobs?${params.toString()}`;
    }

    function normalizeDistanceToKm(distance, unit) {
        const safeDistance = AppUtils.toNumber(distance);
        const normalizedUnit = AppUtils.normalizeText(unit || "km");
        if (normalizedUnit === "mi" || normalizedUnit === "mile" || normalizedUnit === "miles") {
            return safeDistance * 1.609344;
        }
        return safeDistance;
    }

    function fetchAbsoluteJson(url, timeoutMs = USER_TOTALS_TIMEOUT_MS) {
        // Usa la capa comun: pausa global ante HTTP 429 y peticiones identicas compartidas
        return AppApi.fetchJson(url, timeoutMs);
    }

    async function fetchCompanyJobsRange({ dateFrom, dateTo, status, userId }, maxPages = MAX_RANGE_JOB_PAGES) {
        const rows = [];
        let hasError = false;
        let lastPage = 1;

        for (let page = 1; page <= maxPages; page += 1) {
            const endpoint = buildCompanyJobsEndpoint({
                page,
                perPage: RANGE_JOBS_PER_PAGE,
                status,
                userId,
                dateFrom,
                dateTo
            });

            const payload = await AppApi.fetchEndpoint(endpoint);
            if (!payload) {
                hasError = true;
                break;
            }

            rows.push(...AppUtils.getDataArray(payload));
            lastPage = Math.max(lastPage, AppUtils.toNumber(payload?.last_page));

            if (page >= lastPage) break;
        }

        return {
            rows,
            hasError
        };
    }

    function getJobDistanceKm(job) {
        return AppUtils.toNumber(
            job?.driven_distance_km ??
            job?.driven_distance ??
            job?.planned_distance_km ??
            job?.planned_distance ??
            job?.distance
        );
    }

    function aggregateCompletedJobs(rows) {
        if (!Array.isArray(rows) || rows.length === 0) {
            return {
                totalDistance: 0,
                totalJobs: 0
            };
        }

        let totalDistance = 0;
        let totalJobs = 0;

        rows.forEach((row) => {
            const status = AppUtils.normalizeText(row?.status || "");
            if (status !== "completed") return;
            totalJobs += 1;
            totalDistance += getJobDistanceKm(row);
        });

        return { totalDistance, totalJobs };
    }

    function buildMonthKmByDriver(rows) {
        const result = new Map();
        if (!Array.isArray(rows) || rows.length === 0) return result;

        rows.forEach((row) => {
            const status = AppUtils.normalizeText(row?.status || "");
            if (status !== "completed") return;

            const userId = AppUtils.toNumber(row?.user_id || row?.driver?.id);
            if (!userId) return;

            const distance = getJobDistanceKm(row);
            if (distance <= 0) return;

            result.set(userId, (result.get(userId) || 0) + distance);
        });

        return result;
    }

    function filterJobsByRange(rows, range) {
        if (!Array.isArray(rows) || !range) return [];

        return rows.filter((row) => {
            const completedAt = row?.completed_at || row?.completedAt;
            const updatedAt = row?.updated_at || row?.updatedAt;
            const startedAt = row?.started_at || row?.startedAt;
            const reference = completedAt || updatedAt || startedAt;
            if (!reference) return false;

            const dateKey = getDateKeyInTimeZone(reference);
            if (!dateKey) return false;
            return dateKey >= range.dateFrom && dateKey <= range.dateTo;
        });
    }

    async function fetchCompanyTotalsFromJobsRange(range) {
        if (!range || !range.dateFrom || !range.dateTo) return null;

        const result = await fetchCompanyJobsRange(
            {
                dateFrom: range.dateFrom,
                dateTo: range.dateTo,
                status: "completed"
            },
            MAX_RANGE_JOB_PAGES
        );

        if (!result || (!result.rows.length && result.hasError)) return null;

        const totals = aggregateCompletedJobs(result.rows);

        return {
            companyId: extractCompanyId(),
            totalDistance: AppUtils.toNumber(totals.totalDistance),
            totalJobs: AppUtils.toNumber(totals.totalJobs),
            realKm: 0,
            raceKm: 0,
            jobsCompleted: AppUtils.toNumber(totals.totalJobs),
            jobsCanceled: 0,
            year: AppUtils.toNumber(range.year),
            rangeStart: range.dateFrom,
            rangeEnd: range.dateTo,
            period: range.period || "year-to-date",
            monthsProcessed: 0,
            monthsWithErrors: result.hasError ? 1 : 0,
            monthsTotal: 0,
            source: result.hasError ? "range-partial" : "range-jobs",
            cachedAt: Date.now()
        };
    }

    function fetchUserJobsPage(userId, page) {
        // Reintenta solo fallos de red/servidor; ante 429 se detiene de inmediato
        return AppApi.fetchWithRetry(buildUserJobsEndpoint(userId, page), USER_TOTALS_TIMEOUT_MS);
    }

    function getCachedUserTotalDistance(userId) {
        const cacheEntry = userTotalsCache.get(String(userId));
        if (!cacheEntry) return null;
        return { totalKm: cacheEntry.totalKm, cachedAt: cacheEntry.cachedAt, updatedAtRef: cacheEntry.updatedAtRef };
    }

    let userStatsPausedUntil = 0;

    /**
     * Acumulado del conductor desde el 01/01/2026 (todas sus empresas en Trucky) + historial.
     * - Cache fresca (o conductor sin cambios): 0 peticiones.
     * - Si no: descarga incremental, solo las paginas nuevas hasta encontrar un trabajo ya guardado.
     * - Si Trucky falla (429, etc.): se conserva la cache y se pausa un rato.
     */
    async function fetchUserStatsKm(userId, updatedAtRef = "") {
        const safeUserId = AppUtils.toNumber(userId);
        if (safeUserId <= 0) return { totalKm: 0, jobs: [], fromCache: true };
        const cacheKey = String(safeUserId);
        const safeUpdatedAtRef = String(updatedAtRef || "");
        const cached = userTotalsCache.get(cacheKey);

        const toResult = (entry, fromCache) => ({
            totalKm: entry ? entry.totalKm : 0,
            jobs: entry ? entry.jobs.map((job) => expandUserJob(job, safeUserId)) : [],
            fromCache
        });

        if (cached) {
            const age = Date.now() - AppUtils.toNumber(cached.cachedAt);
            const unchanged = safeUpdatedAtRef && safeUpdatedAtRef === cached.updatedAtRef;
            if ((age >= 0 && age <= USER_TOTALS_CACHE_MS) || (unchanged && age <= 6 * USER_TOTALS_CACHE_MS)) {
                return toResult(cached, true);
            }
        }

        if (Date.now() < userStatsPausedUntil || AppApi.isRateLimited()) return toResult(cached, true);

        const existingRequest = userTotalsInFlight.get(cacheKey);
        if (existingRequest) return existingRequest;

        const request = (async () => {
            try {
                const knownIds = new Set((cached?.jobs || []).map((job) => job[0]));
                const newJobs = [];
                let totalPages = 1;

                for (let page = 1; page <= Math.min(totalPages, USER_JOBS_MAX_PAGES); page += 1) {
                    if (page > 1) await new Promise((resolve) => window.setTimeout(resolve, USER_PAGE_DELAY_MS));

                    const payload = await fetchUserJobsPage(safeUserId, page);
                    totalPages = Math.max(1, AppUtils.toNumber(payload?.last_page) || 1);
                    const rows = AppUtils.getDataArray(payload);

                    let reachedEnd = rows.length === 0;
                    for (const row of rows) {
                        const job = compactUserJob(row);
                        if (!job) continue;
                        if (knownIds.has(job[0])) { reachedEnd = true; break; }       // ya guardado
                        if (job[2] && job[2] < USER_HISTORY_START_MS) { reachedEnd = true; break; } // antes de 2026
                        newJobs.push(job);
                    }
                    if (reachedEnd) break;
                }

                const byId = new Map();
                (cached?.jobs || []).forEach((job) => byId.set(job[0], job));
                newJobs.forEach((job) => byId.set(job[0], job));
                const jobs = [...byId.values()]
                    .filter((job) => !job[2] || job[2] >= USER_HISTORY_START_MS)
                    .sort((a, b) => b[2] - a[2]);

                const entry = {
                    jobs,
                    totalKm: sumUserJobsKm(jobs),
                    cachedAt: Date.now(),
                    updatedAtRef: safeUpdatedAtRef
                };
                userTotalsCache.set(cacheKey, entry);
                persistUserTotalsCache();
                return toResult(entry, false);
            } catch (error) {
                console.warn(`No se pudo actualizar el acumulado del usuario ${safeUserId}:`, error);
                userStatsPausedUntil = Date.now() + USER_ERROR_BACKOFF_MS;
                return toResult(cached, true);
            } finally {
                userTotalsInFlight.delete(cacheKey);
            }
        })();

        userTotalsInFlight.set(cacheKey, request);
        return request;
    }

    /**
     * Devuelve al instante lo que hay en cache para cada miembro (sin peticiones).
     */
    function getCachedMembersStats(members) {
        if (!Array.isArray(members)) return [];
        return members.map((member) => {
            const entry = userTotalsCache.get(String(AppUtils.toNumber(member?.id)));
            if (!entry) return member;
            return {
                ...member,
                totalDistanceKm: entry.totalKm,
                historyJobs: entry.jobs.map((job) => expandUserJob(job, member.id))
            };
        });
    }

    /**
     * Actualiza el acumulado conductor por conductor (uno a la vez, con pausas).
     * `onProgress(members)` se llama cada vez que un conductor se actualiza.
     */
    async function enrichMembersWithTotalDistance(members, { onProgress } = {}) {
        if (!Array.isArray(members) || members.length === 0) return [];

        const enriched = getCachedMembersStats(members);

        for (let index = 0; index < members.length; index += 1) {
            const member = members[index];
            const userId = AppUtils.toNumber(member?.id);
            if (userId <= 0) continue;

            const stats = await fetchUserStatsKm(userId, String(member?.updatedAt || ""));
            enriched[index] = {
                ...enriched[index],
                totalDistanceKm: stats.totalKm,
                historyJobs: stats.jobs
            };

            if (!stats.fromCache) {
                if (typeof onProgress === "function") onProgress([...enriched]);
                await new Promise((resolve) => window.setTimeout(resolve, USER_DELAY_MS));
            }
        }

        return enriched;
    }

    function buildPeruServerAccumulatedUrl(year = new Date().getFullYear()) {
        const safeYear = Math.max(2020, AppUtils.toNumber(year) || new Date().getFullYear());
        return `${AppApi.MDCDEV_BASE}/top-km?month=1&year=${safeYear}&limit=50`;
    }

    function getCachedPeruServerCertification() {
        const stored = readStorage(PERUSERVER_TOP_CACHE_KEY);
        if (!stored || typeof stored !== "object") return null;
        if (!stored.monthly && !stored.accumulated) return null;

        return {
            source: String(stored.source || "cache"),
            companyId: AppUtils.toNumber(stored.companyId),
            fetchedAt: AppUtils.toNumber(stored.fetchedAt),
            monthly: stored.monthly || null,
            accumulated: stored.accumulated || null
        };
    }

    function savePeruServerCertification(payload) {
        if (!payload || typeof payload !== "object") return;
        writeStorage(PERUSERVER_TOP_CACHE_KEY, {
            source: String(payload.source || "api"),
            companyId: AppUtils.toNumber(payload.companyId),
            fetchedAt: AppUtils.toNumber(payload.fetchedAt || Date.now()),
            monthly: payload.monthly || null,
            accumulated: payload.accumulated || null
        });
    }

    function normalizePeruServerItem(item, index) {
        return {
            rank: index + 1,
            companyId: AppUtils.toNumber(item?.id),
            name: String(item?.name || "Empresa"),
            tag: String(item?.tag || ""),
            distanceKm: AppUtils.toNumber(item?.distance ?? item?.distance_field),
            members: AppUtils.toNumber(item?.members),
            totalJobs: AppUtils.toNumber(item?.total_jobs),
            updatedAt: String(item?.updated || "")
        };
    }

    function parsePeruServerView(payload, companyId, view) {
        if (!payload || typeof payload !== "object") return null;

        const rows = Array.isArray(payload.items) ? payload.items : [];
        const normalized = rows.map(normalizePeruServerItem);
        const leader = normalized[0] || null;
        const companyRow = normalized.find((row) => row.companyId === companyId) || null;
        const totalCompanies = AppUtils.toNumber(payload.count_companies_processed) || normalized.length;

        const leaderDistanceKm = AppUtils.toNumber(leader?.distanceKm);
        const distanceKm = AppUtils.toNumber(companyRow?.distanceKm);
        const percentVsLeader = leaderDistanceKm > 0
            ? (distanceKm / leaderDistanceKm) * 100
            : 0;

        return {
            view,
            found: !!companyRow,
            rank: AppUtils.toNumber(companyRow?.rank),
            totalCompanies,
            companyName: String(companyRow?.name || ""),
            companyTag: String(companyRow?.tag || ""),
            distanceKm,
            members: AppUtils.toNumber(companyRow?.members),
            totalJobs: AppUtils.toNumber(companyRow?.totalJobs),
            updatedAt: String(companyRow?.updatedAt || leader?.updatedAt || ""),
            month: AppUtils.toNumber(payload.month),
            year: AppUtils.toNumber(payload.year),
            leaderDistanceKm,
            percentVsLeader: Number.isFinite(percentVsLeader) ? percentVsLeader : 0
        };
    }

    async function loadPeruServerCertification() {
        const companyId = extractCompanyId();
        const cached = getCachedPeruServerCertification();
        const cacheAge = cached ? Date.now() - AppUtils.toNumber(cached.fetchedAt) : Number.POSITIVE_INFINITY;

        if (cached && cacheAge >= 0 && cacheAge <= PERUSERVER_TOP_CACHE_MS) {
            return {
                ...cached,
                source: "cache"
            };
        }

        const currentYear = new Date().getFullYear();
        const requests = await Promise.allSettled([
            fetchAbsoluteJson(PERUSERVER_TOP_MONTHLY_URL, PERUSERVER_TOP_TIMEOUT_MS),
            fetchAbsoluteJson(buildPeruServerAccumulatedUrl(currentYear), PERUSERVER_TOP_TIMEOUT_MS)
        ]);

        const monthlyPayload = requests[0].status === "fulfilled" ? requests[0].value : null;
        const accumulatedPayload = requests[1].status === "fulfilled" ? requests[1].value : null;

        const monthly = parsePeruServerView(monthlyPayload, companyId, "monthly");
        const accumulated = parsePeruServerView(accumulatedPayload, companyId, "accumulated");

        if (!monthly && !accumulated) {
            const reason = requests.find((result) => result.status === "rejected");
            console.warn("No se pudo cargar certificacion PeruServer:", reason?.reason || "sin datos");

            if (cached) {
                return {
                    ...cached,
                    source: "cache-stale"
                };
            }

            return {
                source: "unavailable",
                companyId,
                fetchedAt: Date.now(),
                monthly: null,
                accumulated: null
            };
        }

        const payload = {
            source: "api",
            companyId,
            fetchedAt: Date.now(),
            monthly,
            accumulated
        };

        savePeruServerCertification(payload);
        return payload;
    }

    // ============================================
    // API DE TRUCKY
    // ============================================

    async function getCompanyInfo() {
        return await AppApi.fetchEndpoint("");
    }

    async function fetchCompanyYearlyTotals(year = new Date().getFullYear(), rangeEnd) {
        const payload = await AppApi.fetchEndpoint(`/stats/yearly?year=${year}`);
        if (!payload || typeof payload !== "object") return null;

        const ets2 = payload.ets2 || {};
        const total = payload.total || {};
        const raceKm = AppUtils.toNumber(ets2.race_km ?? ets2.race ?? total.race_km ?? total.race);
        const realKm = AppUtils.toNumber(ets2.real_km ?? ets2.real ?? total.real_km ?? total.real);
        const totalDistance = AppUtils.toNumber(ets2.total_km ?? total.total_km) || (raceKm + realKm);
        const totalJobs = AppUtils.toNumber(ets2.total_jobs ?? total.total_jobs);
        const jobsCompleted = AppUtils.toNumber(ets2.jobs_completed ?? total.jobs_completed);
        const jobsCanceled = AppUtils.toNumber(ets2.jobs_canceled ?? total.jobs_canceled);

        if (totalDistance <= 0 && totalJobs <= 0) return null;

        const range = buildYearToDateRange(new Date());

        return {
            companyId: extractCompanyId(),
            totalDistance,
            totalJobs,
            realKm,
            raceKm,
            jobsCompleted,
            jobsCanceled,
            year: AppUtils.toNumber(payload.year || year),
            rangeStart: range.dateFrom,
            rangeEnd: rangeEnd || range.dateTo,
            period: range.period,
            monthsProcessed: 0,
            monthsWithErrors: 0,
            monthsTotal: 0,
            source: "yearly-api",
            cachedAt: Date.now()
        };
    }

    async function fetchMonthWithCache(companyId, month, year, isCurrentMonth) {
        const cacheKey = `${companyId}:${year}-${month}`;
        const now = Date.now();
        const cached = monthCache.get(cacheKey);

        if (cached) {
            const cachedAt = AppUtils.toNumber(cached.cachedAt);
            const isCurrentMonthFresh = now - cachedAt <= CURRENT_MONTH_CACHE_MS;
            if (!isCurrentMonth || isCurrentMonthFresh) return cached;
        }

        const pad = (value) => String(value).padStart(2, "0");
        const dateFrom = `${year}-${pad(month)}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const defaultTo = `${year}-${pad(month)}-${pad(lastDay)}`;
        const currentRange = buildMonthToDateRange(new Date());
        const dateTo = isCurrentMonth ? currentRange.dateTo : defaultTo;

        const rangeResult = await fetchCompanyJobsRange(
            { dateFrom, dateTo, status: "completed" },
            MAX_MONTH_JOB_PAGES
        );
        const jobs = Array.isArray(rangeResult.rows) ? rangeResult.rows : [];

        const seenJobIds = new Set();
        const monthDistance = jobs.reduce((sum, row) => {
            const distance = getJobDistanceKm(row);
            if (distance <= 0) return sum;

            const jobId = AppUtils.toNumber(row.id);
            if (!jobId || seenJobIds.has(jobId)) return sum;

            seenJobIds.add(jobId);
            return sum + distance;
        }, 0);

        const monthData = {
            success: !rangeResult.hasError,
            distance: monthDistance,
            jobs: seenJobIds.size,
            cachedAt: now
        };

        monthCache.set(cacheKey, monthData);
        persistMonthCache();
        return monthData;
    }

    async function calculateCompanyMonthlyTotals() {
        const companyId = extractCompanyId();
        if (!companyId) return null;

        const companyInfo = await getCompanyInfo();
        const monthRange = buildMonthRange(companyInfo?.created_at);
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        let totalDistance = 0;
        let totalJobs = 0;
        let monthsProcessed = 0;
        let monthsWithErrors = 0;

        for (const { month, year } of monthRange) {
            const isCurrentMonth = month === currentMonth && year === currentYear;
            const monthData = await fetchMonthWithCache(companyId, month, year, isCurrentMonth);

            if (monthData.success) {
                totalDistance += AppUtils.toNumber(monthData.distance);
                totalJobs += AppUtils.toNumber(monthData.jobs);
                monthsProcessed += 1;
            } else {
                monthsWithErrors += 1;
            }
        }

        return {
            companyId,
            totalDistance,
            totalJobs,
            monthsProcessed,
            monthsWithErrors,
            monthsTotal: monthRange.length,
            source: monthsWithErrors > 0 ? "monthly-partial" : "monthly-precise",
            cachedAt: Date.now()
        };
    }

    async function refreshTotalsIfNeeded(currentTotals) {
        const now = Date.now();
        const source = String(currentTotals?.source || "");
        const cachedYear = AppUtils.toNumber(currentTotals?.year);
        const currentRange = buildYearToDateRange(new Date());
        const currentYear = currentRange.year;
        const currentRangeEnd = String(currentRange.dateTo || "");
        const cachedRangeEnd = String(currentTotals?.rangeEnd || "");
        const totalsAge = now - AppUtils.toNumber(currentTotals?.cachedAt);

        if (
            source === "yearly-api" &&
            cachedYear === currentYear &&
            cachedRangeEnd === currentRangeEnd &&
            totalsAge > 0 &&
            totalsAge <= TOTALS_REVALIDATE_MS
        ) {
            return null;
        }

        try {
            const refreshed = await withDeadline(
                fetchCompanyYearlyTotals(currentYear, currentRangeEnd),
                YEARLY_STATS_TIMEOUT_MS
            );
            if (!refreshed) return null;
            saveCachedTotals(refreshed);
            return refreshed;
        } catch (error) {
            console.error("No se pudo actualizar totales anuales:", error);
            return null;
        }
    }

    // ============================================
    // CARGA DE DATOS
    // ============================================

    async function loadCompanyData() {
        const now = new Date();
        const monthRange = buildMonthToDateRange(now);
        const yearRange = buildYearToDateRange(now);

        const membersPayloadPromise = withDeadline(AppApi.fetchEndpoint("/members"));
        const jobsPayloadPromise = withDeadline(AppApi.fetchEndpoint(FAST_JOBS_ENDPOINT));
        const recentJobsPayloadPromise = withDeadline(AppApi.fetchEndpoint(AppApi.RECENT_ROUTES_ENDPOINT));
        const yearlyTotalsPromise = withDeadline(
            fetchCompanyYearlyTotals(yearRange.year, yearRange.dateTo),
            YEARLY_STATS_TIMEOUT_MS
        );
        const [membersPayload, jobsPayload, recentJobsPayload, yearlyTotals] = await Promise.all([
            membersPayloadPromise,
            jobsPayloadPromise,
            recentJobsPayloadPromise,
            yearlyTotalsPromise
        ]);

        // fetchEndpoint devuelve null cuando la peticion falla (429, timeout, etc.).
        // En ese caso se reutiliza la ultima cache buena en vez de los datos de demostracion.
        const cachedPayload = getCachedCompanyData();
        let source = "api";
        let membersRaw = AppUtils.getDataArray(membersPayload);
        let jobsRaw = AppUtils.getDataArray(jobsPayload);
        let recentJobsRaw = AppUtils.getDataArray(recentJobsPayload);

        let normalizedMembers = null;
        let normalizedJobs = null;
        let normalizedRecentJobs = null;

        if (membersRaw.length === 0) {
            if (cachedPayload?.members?.length) {
                normalizedMembers = cachedPayload.members;
                source = "cache";
            } else {
                // Nunca mostrar datos inventados: sin API y sin cache no hay nada que pintar
                const error = new Error("Trucky no disponible y sin datos guardados");
                error.code = "TRUCKY_UNAVAILABLE";
                throw error;
            }
        }

        if (jobsRaw.length === 0) {
            if (cachedPayload?.jobs?.length) {
                normalizedJobs = cachedPayload.jobs;
                source = "cache";
            } else if (jobsPayload === null) {
                // Fallo la lista de trabajos: mostrar miembros reales, sin guardar en cache
                source = "partial";
            }
        }

        if (recentJobsPayload === null && cachedPayload?.recentJobs) {
            normalizedRecentJobs = cachedPayload.recentJobs;
        }

        normalizedMembers = normalizedMembers || normalizeMembers(membersRaw);
        normalizedJobs = normalizedJobs || normalizeJobs(jobsRaw);
        normalizedRecentJobs = normalizedRecentJobs || normalizeJobs(recentJobsRaw);

        if (yearlyTotals) {
            saveCachedTotals(yearlyTotals);
        }

        let companyTotals = yearlyTotals || getCachedTotals();

        if (!companyTotals) {
            companyTotals = getFallbackCompanyTotals(normalizedMembers, normalizedJobs, yearRange);
        }

        // KM del mes = dato oficial de Trucky por miembro (sin peticiones extra)
        const monthKmEntries = normalizedMembers.map((member) => [member.id, AppUtils.toNumber(member.monthKm)]);

        const basePayload = {
            source,
            members: normalizedMembers,
            jobs: normalizedJobs,
            recentJobs: normalizedRecentJobs,
            companyTotals,
            monthKmByDriver: monthKmEntries,
            statsRange: {
                month: monthRange,
                year: yearRange
            }
        };

        // Solo se guarda en cache lo que vino completo de la API real
        if (source === "api") {
            saveCachedCompanyData(basePayload);
        }

        const totalsRefreshPromise = (source !== "api"
            ? Promise.resolve(null)
            : refreshTotalsIfNeeded(companyTotals))
            .then((refreshedTotals) => {
                if (!refreshedTotals) return null;

                const payloadWithFreshTotals = {
                    ...basePayload,
                    companyTotals: refreshedTotals
                };

                saveCachedCompanyData(payloadWithFreshTotals);
                return {
                    companyTotals: refreshedTotals
                };
            });

        return {
            ...basePayload,
            totalsRefreshPromise
        };
    }

    async function loadWorkersPreview() {
        const cachedPayload = getCachedCompanyData();
        if (cachedPayload?.members?.length) {
            return {
                source: "cache",
                members: cachedPayload.members
            };
        }

        // Misma URL que loadCompanyData: api.js comparte la peticion (no se duplica)
        const membersPayload = await withDeadline(AppApi.fetchEndpoint("/members"), 3500);
        const membersRaw = AppUtils.getDataArray(membersPayload);

        if (membersRaw.length > 0) {
            return {
                source: "api",
                members: normalizeMembers(membersRaw)
            };
        }

        return null;
    }

    // ============================================
    // EXPORTS
    // ============================================

    return {
        getCachedCompanyData,
        isCompanyCacheFresh,
        loadWorkersPreview,
        loadCompanyData,
        loadPeruServerCertification,
        fetchUserStatsKm,
        getCachedMembersStats,
        enrichMembersWithTotalDistance,
        normalizeMembers,
        normalizeJobs
    };
})(window.AppUtils, window.AppApi);
