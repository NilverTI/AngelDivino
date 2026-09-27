/*
  Cliente de Supabase para Angel Divino
*/
"use strict";

const SUPABASE_URL = "https://sqjieqwjiwjkcehjwzra.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxamllcXdqaXdqa2NlaGp3enJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MzIwMjgsImV4cCI6MjA5MTEwODAyOH0.tbCvfrifCEawQQEa-WIf6C_G1SnN0eGEHq6H_ki_koo";
const SUPABASE_SESSION_LIMIT_MS = 10 * 60 * 1000;
const SUPABASE_LAST_ACTIVITY_KEY = "Angel Divino:supabase:last-activity";
const SUPABASE_ACTIVITY_THROTTLE_MS = 15000;
const SUPABASE_SESSION_KEY_PREFIX = "sb-";
const Angel Divino_HEAVY_CACHE_KEYS = [
    "Angel Divino:user-totals:v2",
    "Angel Divino:company-data:v4",
    "Angel Divino:month-cache:v2",
    "Angel Divino:totals-cache:v4",
    "Angel Divino:peruserver-top:v1"
];

let supabaseSessionTimerId = null;
let hasSupabaseActiveSession = false;
let lastSupabaseActivityWriteAt = 0;
let isSupabaseSigningOut = false;

function getStorageArea(areaName) {
    try {
        const storage = window?.[areaName];
        return storage || null;
    } catch (_error) {
        return null;
    }
}

function isQuotaExceededError(error) {
    if (!error) return false;

    const errorName = String(error.name || "");
    const errorCode = Number(error.code);
    return (
        errorName === "QuotaExceededError" ||
        errorName === "NS_ERROR_DOM_QUOTA_REACHED" ||
        errorCode === 22 ||
        errorCode === 1014
    );
}

function pruneAngel DivinoHeavyCaches() {
    const localStorageArea = getStorageArea("localStorage");
    if (!localStorageArea) return false;

    let removedAnyKey = false;

    Angel Divino_HEAVY_CACHE_KEYS.forEach((cacheKey) => {
        try {
            if (localStorageArea.getItem(cacheKey) !== null) {
                localStorageArea.removeItem(cacheKey);
                removedAnyKey = true;
            }
        } catch (_error) {
            // Ignore storage errors while pruning
        }
    });

    try {
        const osrmKeys = [];
        for (let index = 0; index < localStorageArea.length; index += 1) {
            const cacheKey = localStorageArea.key(index);
            if (cacheKey && cacheKey.startsWith("Angel Divino_osrm_")) {
                osrmKeys.push(cacheKey);
            }
        }

        osrmKeys.forEach((cacheKey) => {
            localStorageArea.removeItem(cacheKey);
            removedAnyKey = true;
        });
    } catch (_error) {
        // Ignore storage errors while pruning
    }

    return removedAnyKey;
}

function clearStorageKeyFromOtherBackends(activeStorage, key, fallbackStorage) {
    if (activeStorage !== fallbackStorage && fallbackStorage) {
        try {
            fallbackStorage.removeItem(key);
        } catch (_error) {
            // Ignore cleanup errors
        }
    }
}

function createSupabaseStorageAdapter() {
    const localStorageArea = getStorageArea("localStorage");
    const sessionStorageArea = getStorageArea("sessionStorage");
    const memoryStorage = new Map();
    let hasWarnedSessionFallback = false;
    let hasWarnedMemoryFallback = false;

    const tryWrite = (storageArea, key, value) => {
        if (!storageArea) return false;
        storageArea.setItem(key, value);
        return true;
    };

    return {
        getItem(key) {
            const storageAreas = [localStorageArea, sessionStorageArea];

            for (const storageArea of storageAreas) {
                if (!storageArea) continue;

                try {
                    const storedValue = storageArea.getItem(key);
                    if (storedValue !== null) {
                        return storedValue;
                    }
                } catch (_error) {
                    // Ignore storage read errors
                }
            }

            return memoryStorage.has(key) ? memoryStorage.get(key) : null;
        },

        setItem(key, value) {
            try {
                if (tryWrite(localStorageArea, key, value)) {
                    clearStorageKeyFromOtherBackends(localStorageArea, key, sessionStorageArea);
                    memoryStorage.delete(key);
                    return;
                }
            } catch (error) {
                const shouldPruneAngel DivinoCaches =
                    isQuotaExceededError(error) &&
                    key.startsWith(SUPABASE_SESSION_KEY_PREFIX);

                if (shouldPruneAngel DivinoCaches && pruneAngel DivinoHeavyCaches()) {
                    try {
                        if (tryWrite(localStorageArea, key, value)) {
                            clearStorageKeyFromOtherBackends(localStorageArea, key, sessionStorageArea);
                            memoryStorage.delete(key);
                            return;
                        }
                    } catch (_retryError) {
                        // Fall through to session or memory fallback
                    }
                }
            }

            try {
                if (tryWrite(sessionStorageArea, key, value)) {
                    clearStorageKeyFromOtherBackends(sessionStorageArea, key, localStorageArea);
                    memoryStorage.delete(key);

                    if (!hasWarnedSessionFallback) {
                        hasWarnedSessionFallback = true;
                        console.warn("[Angel Divino] localStorage lleno; la sesion de Supabase se guardara en sessionStorage.");
                    }
                    return;
                }
            } catch (_error) {
                // Fall through to memory fallback
            }

            memoryStorage.set(key, value);
            if (!hasWarnedMemoryFallback) {
                hasWarnedMemoryFallback = true;
                console.warn("[Angel Divino] No se pudo persistir la sesion de Supabase en Web Storage; se usara memoria temporal.");
            }
        },

        removeItem(key) {
            [localStorageArea, sessionStorageArea].forEach((storageArea) => {
                if (!storageArea) return;

                try {
                    storageArea.removeItem(key);
                } catch (_error) {
                    // Ignore storage cleanup errors
                }
            });

            memoryStorage.delete(key);
        }
    };
}

const supabaseStorageAdapter = createSupabaseStorageAdapter();

function clearSupabaseSessionTimer() {
    if (supabaseSessionTimerId) {
        window.clearTimeout(supabaseSessionTimerId);
        supabaseSessionTimerId = null;
    }
}

function readSupabaseLastActivity() {
    try {
        const rawValue = window.localStorage.getItem(SUPABASE_LAST_ACTIVITY_KEY);
        const parsedValue = Number(rawValue);
        return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
    } catch (_error) {
        return null;
    }
}

function writeSupabaseLastActivity(timestamp = Date.now()) {
    lastSupabaseActivityWriteAt = timestamp;

    try {
        window.localStorage.setItem(SUPABASE_LAST_ACTIVITY_KEY, String(timestamp));
    } catch (_error) {
        // Ignore storage errors
    }
}

function clearSupabaseLastActivity() {
    lastSupabaseActivityWriteAt = 0;

    try {
        window.localStorage.removeItem(SUPABASE_LAST_ACTIVITY_KEY);
    } catch (_error) {
        // Ignore storage errors
    }
}

function scheduleSupabaseSessionExpiry() {
    clearSupabaseSessionTimer();

    if (!hasSupabaseActiveSession) {
        return;
    }

    const lastActivityAt = readSupabaseLastActivity() || lastSupabaseActivityWriteAt;
    if (!lastActivityAt) {
        writeSupabaseLastActivity();
    }

    const effectiveLastActivityAt = readSupabaseLastActivity() || lastSupabaseActivityWriteAt || Date.now();
    const remainingMs = SUPABASE_SESSION_LIMIT_MS - (Date.now() - effectiveLastActivityAt);

    if (remainingMs <= 0) {
        void expireSupabaseSession();
        return;
    }

    supabaseSessionTimerId = window.setTimeout(() => {
        void expireSupabaseSession();
    }, remainingMs);
}

async function expireSupabaseSession() {
    if (!window.supabaseClient || isSupabaseSigningOut) {
        return;
    }

    isSupabaseSigningOut = true;
    hasSupabaseActiveSession = false;
    clearSupabaseSessionTimer();
    clearSupabaseLastActivity();

    try {
        const { error } = await window.supabaseClient.auth.signOut();
        if (error) {
            console.error("Error cerrando sesion por inactividad", error);
        }
    } catch (error) {
        console.error("Excepcion cerrando sesion por inactividad", error);
    } finally {
        isSupabaseSigningOut = false;
    }
}

function recordSupabaseSessionActivity(force = false) {
    if (!hasSupabaseActiveSession) {
        return;
    }

    const now = Date.now();
    if (!force && now - lastSupabaseActivityWriteAt < SUPABASE_ACTIVITY_THROTTLE_MS) {
        return;
    }

    writeSupabaseLastActivity(now);
    scheduleSupabaseSessionExpiry();
}

function bindSupabaseActivityListeners() {
    if (window.__Angel DivinoSupabaseActivityBound) {
        return;
    }

    const activityEvents = ["pointerdown", "keydown", "touchstart", "scroll"];
    const handleActivity = () => {
        recordSupabaseSessionActivity(false);
    };

    activityEvents.forEach((eventName) => {
        window.addEventListener(eventName, handleActivity, { passive: true });
    });

    window.addEventListener("storage", (event) => {
        if (event.key !== SUPABASE_LAST_ACTIVITY_KEY || !hasSupabaseActiveSession) {
            return;
        }

        if (!event.newValue) {
            clearSupabaseSessionTimer();
            return;
        }

        scheduleSupabaseSessionExpiry();
    });

    window.__Angel DivinoSupabaseActivityBound = true;
}

try {
    if (typeof supabase === "undefined" || typeof supabase.createClient !== "function") {
        throw new Error(
            "El SDK de Supabase no está cargado. " +
            "Verifica que el script de https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/... " +
            "se carga ANTES de supabase-client.js y sin errores de red."
        );
    }

    window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false,
            storage: supabaseStorageAdapter
        }
    });
} catch (error) {
    console.error(
        "[Angel Divino] Error al inicializar Supabase.\n" +
        "Si el login funciona local pero no en produccion, ve a:\n" +
        "Supabase Dashboard → Authentication → URL Configuration\n" +
        "y agrega la URL de produccion en Redirect URLs:\n" +
        "https://angeldivinopsv.vercel.app/**",
        error
    );
    window.supabaseClient = null;
}

window.touchSupabaseSession = () => {
    recordSupabaseSessionActivity(true);
};

window.clearSupabaseSessionActivity = () => {
    clearSupabaseSessionTimer();
    clearSupabaseLastActivity();
};

window.checkSupabaseSession = async () => {
    try {
        if (!window.supabaseClient) {
            return null;
        }

        const { data, error } = await window.supabaseClient.auth.getSession();
        if (error) {
            console.error("Error obteniendo sesion", error);
            return null;
        }

        const activeSession = data.session;
        hasSupabaseActiveSession = Boolean(activeSession?.user);

        if (!activeSession?.user) {
            clearSupabaseSessionTimer();
            clearSupabaseLastActivity();
            return null;
        }

        const lastActivityAt = readSupabaseLastActivity() || lastSupabaseActivityWriteAt;
        if (lastActivityAt && Date.now() - lastActivityAt >= SUPABASE_SESSION_LIMIT_MS) {
            await expireSupabaseSession();
            return null;
        }

        if (!lastActivityAt) {
            recordSupabaseSessionActivity(true);
        } else {
            scheduleSupabaseSessionExpiry();
        }

        return activeSession;
    } catch (error) {
        console.error("Excepcion en checkSession", error);
        return null;
    }
};

if (window.supabaseClient?.auth?.onAuthStateChange) {
    bindSupabaseActivityListeners();

    window.supabaseClient.auth.onAuthStateChange((event, session) => {
        hasSupabaseActiveSession = Boolean(session?.user);

        if (!session?.user) {
            clearSupabaseSessionTimer();
            clearSupabaseLastActivity();
            return;
        }

        if (event === "SIGNED_IN") {
            recordSupabaseSessionActivity(true);
            return;
        }

        const lastActivityAt = readSupabaseLastActivity() || lastSupabaseActivityWriteAt;
        if (lastActivityAt && Date.now() - lastActivityAt >= SUPABASE_SESSION_LIMIT_MS) {
            void expireSupabaseSession();
            return;
        }

        if (!lastActivityAt) {
            recordSupabaseSessionActivity(true);
            return;
        }

        scheduleSupabaseSessionExpiry();
    });
}
