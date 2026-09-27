/* 
  Módulo de Galería y Lightbox
*/

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const galeriaImages = []; // {src, alt} populated dynamically
    const lightboxModal = document.getElementById("lightboxModal");
    const lightboxImage = document.getElementById("lightboxImage");
    const lightboxPrev = document.getElementById("lightboxPrev");
    const lightboxNext = document.getElementById("lightboxNext");
    const lightboxClose = document.getElementById("lightboxClose");
    const lightboxBackdrop = document.querySelector(".lightbox-backdrop");

    if (!lightboxModal) return;

    let currentUserSession = null;

    async function refreshCurrentUserSession() {
        if (!window.checkSupabaseSession) {
            currentUserSession = null;
            return null;
        }

        currentUserSession = await window.checkSupabaseSession();
        return currentUserSession;
    }

    async function initGallery() {
        await refreshCurrentUserSession();
        if (typeof window.fetchGalleryFromDB === "function") {
            await window.fetchGalleryFromDB();
        }
    }

    if (window.supabaseClient?.auth?.onAuthStateChange) {
        window.supabaseClient.auth.onAuthStateChange((_event, session) => {
            currentUserSession = session || null;

            if (typeof window.fetchGalleryFromDB === "function") {
                window.fetchGalleryFromDB();
            }
        });
    }

    let currentIndex = 0;
    let isLightboxOpen = false;

    // ==========================================
    // FUNCIONES PRINCIPALES
    // ==========================================

    function openLightbox(index) {
        currentIndex = index;
        updateLightboxImage();
        
        lightboxModal.classList.add("visible");
        lightboxModal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden"; // Desactivar scroll
        isLightboxOpen = true;

        // Animar la imagen de entrada suavemente
        lightboxImage.style.opacity = "0";
        lightboxImage.style.transform = "scale(0.95)";
        
        requestAnimationFrame(() => {
            setTimeout(() => {
                lightboxImage.style.transition = "opacity 0.3s ease, transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
                lightboxImage.style.opacity = "1";
                lightboxImage.style.transform = "scale(1)";
            }, 50);
        });
    }

    function closeLightbox() {
        lightboxModal.classList.remove("visible");
        lightboxModal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = ""; // Restaurar scroll
        isLightboxOpen = false;
        
        // Limpiar transición para la próxima apertura
        setTimeout(() => {
            if(!isLightboxOpen) {
                lightboxImage.src = "";
                lightboxImage.alt = "";
            }
        }, 300); // Coincidir con el tiempo de animación de salida en CSS
    }

    function updateLightboxImage() {
        // Aseguramos que el índice se mantenga dentro de los límites
        if (currentIndex < 0) {
            currentIndex = galeriaImages.length - 1;
        } else if (currentIndex >= galeriaImages.length) {
            currentIndex = 0;
        }

        const sourceImage = galeriaImages[currentIndex];
        
        // Transición suave entre imágenes
        lightboxImage.style.opacity = "0";
        lightboxImage.style.transform = "scale(0.98)";
        
        setTimeout(() => {
            lightboxImage.src = sourceImage.src;
            lightboxImage.alt = sourceImage.alt;
            
            lightboxImage.onload = () => {
                lightboxImage.style.opacity = "1";
                lightboxImage.style.transform = "scale(1)";
            };
        }, 150);
    }

    function nextImage() {
        currentIndex++;
        updateLightboxImage();
    }

    function prevImage() {
        currentIndex--;
        updateLightboxImage();
    }

    // ==========================================
    // LISTENERS DE EVENTOS
    // ==========================================

    // Ya no enlazamos inicialmente, lo hacemos dinámicamente en fetchGalleryFromDB

    // Controles de botones
    lightboxClose.addEventListener("click", closeLightbox);
    lightboxNext.addEventListener("click", nextImage);
    lightboxPrev.addEventListener("click", prevImage);

    // Clic en el fondo oscurecido para cerrar
    if (lightboxBackdrop) {
        lightboxBackdrop.addEventListener("click", closeLightbox);
    }

    // Controles por teclado general
    window.addEventListener("keydown", (e) => {
        if (!isLightboxOpen) return;

        if (e.key === "Escape") {
            closeLightbox();
        } else if (e.key === "ArrowRight") {
            nextImage();
        } else if (e.key === "ArrowLeft") {
            prevImage();
        }
    });

    // Soporte para gestos táctiles (Swipe)
    let touchStartX = 0;
    let touchEndX = 0;
    
    lightboxModal.addEventListener("touchstart", (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    lightboxModal.addEventListener("touchend", (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        const diffX = touchEndX - touchStartX;
        const threshold = 50; // Mínimo desplazamiento en píxeles
        
        if (Math.abs(diffX) > threshold) {
            if (diffX < 0) {
                // Swipe izquierda -> Siguiente
                nextImage();
            } else {
                // Swipe derecha -> Anterior
                prevImage();
            }
        }
    }

    // ==========================================
    // LÓGICA DE SUBIDA DE IMAGEN
    // ==========================================
    const openUploadModalBtn = document.getElementById("openUploadModalBtn");
    const uploadModal = document.getElementById("uploadModal");
    const closeUploadModal = document.getElementById("closeUploadModal");
    const uploadPreview = document.getElementById("uploadPreview");
    const previewImageElem = document.getElementById("previewImage");
    const removePreview = document.getElementById("removePreview");
    const submitUploadBtn = document.getElementById("submitUploadBtn");

    if (openUploadModalBtn && uploadModal) {
        
        // ==========================================
        // LÓGICA DE LOGIN
        // ==========================================
        const loginModal = document.getElementById("loginModal");
        const loginForm = document.getElementById("loginForm");
        const closeLoginModal = document.getElementById("closeLoginModal");

        function openLogin() {
            if (!loginModal) return;
            loginModal.classList.add("visible");
            loginModal.setAttribute("aria-hidden", "false");
            document.body.style.overflow = "hidden";
        }

        function closeLogin() {
            if (!loginModal) return;
            loginModal.classList.remove("visible");
            loginModal.setAttribute("aria-hidden", "true");
            document.body.style.overflow = "";
        }

        async function requireAuthenticatedSession() {
            const activeSession = currentUserSession?.user
                ? currentUserSession
                : await refreshCurrentUserSession();

            if (activeSession?.user) {
                window.touchSupabaseSession?.();
                return activeSession;
            }

            closeUpload();
            openLogin();
            throw new Error("Tu sesion ha expirado. Inicia sesion nuevamente.");
        }

        if (closeLoginModal) closeLoginModal.addEventListener("click", closeLogin);
        if (loginModal) {
            loginModal.querySelector(".login-backdrop")?.addEventListener("click", closeLogin);
            
            // Procesar el Login con Supabase
            if (loginForm) {
                const loginEmailInput = document.getElementById("loginEmail");
                const loginPasswordInput = document.getElementById("loginPassword");
                const submitBtn = loginForm.querySelector(".login-submit-btn");

                loginForm.addEventListener("submit", async (e) => {
                    e.preventDefault();
                    
                    if (!window.supabaseClient) {
                         alert("El cliente de Supabase no está configurado.");
                         return;
                    }

                    const originalText = submitBtn.textContent;
                    submitBtn.textContent = "Verificando...";
                    submitBtn.disabled = true;

                    const email = loginEmailInput.value;
                    const password = loginPasswordInput.value;
                    let data = null;
                    let error = null;

                    try {
                        const loginResult = await window.supabaseClient.auth.signInWithPassword({
                            email: email,
                            password: password
                        });
                        data = loginResult.data;
                        error = loginResult.error;
                    } catch (err) {
                        console.error("Excepcion real en signInWithPassword:", err);
                        alert("Error al iniciar sesion: " + (err?.message || "sin detalle"));
                    } finally {
                        submitBtn.textContent = originalText;
                        submitBtn.disabled = false;
                    }

                    if (!data && !error) {
                        return;
                    }

                    if (error) {
                        alert("Credenciales incorrectas: " + error.message);
                        return;
                    }

                    if (!data?.session) {
                        alert("No se pudo abrir una sesion valida. Revisa la configuracion de Auth en Supabase.");
                        return;
                    }

                    currentUserSession = data.session;

                    try {
                        window.touchSupabaseSession?.();
                    } catch (touchError) {
                        console.error("Error actualizando el temporizador de sesion:", touchError);
                    }

                    closeLogin();
                    loginForm.reset();

                    try {
                        if (typeof window.fetchGalleryFromDB === "function") {
                            await window.fetchGalleryFromDB();
                        }
                    } catch (postLoginError) {
                        console.error("Login correcto, pero fallo la recarga de galeria:", postLoginError);
                    }

                    openUpload();
                });
            }
        }

        // ==========================================
        // MANEJADORES GLOBALES (Upload vs Login)
        // ==========================================
        openUploadModalBtn.addEventListener("click", async () => {
            const activeSession = await refreshCurrentUserSession();

            if (activeSession?.user) {
                window.touchSupabaseSession?.();
                openUpload();
                return;
            }

            openLogin();
        });

        function openUpload() {
            uploadModal.classList.add("visible");
            uploadModal.setAttribute("aria-hidden", "false");
            document.body.style.overflow = "hidden";
            resetUploadState();
        }

        const closeUpload = () => {
            uploadModal.classList.remove("visible");
            uploadModal.setAttribute("aria-hidden", "true");
            document.body.style.overflow = "";
        };

        closeUploadModal.addEventListener("click", closeUpload);
        uploadModal.querySelector(".upload-backdrop")?.addEventListener("click", closeUpload);

        window.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                if (uploadModal.classList.contains("visible")) closeUpload();
                if (loginModal && loginModal.classList.contains("visible")) closeLogin();
            }
        });



        const urlInput = document.getElementById("uploadUrlInput");
        const descInput = document.getElementById("uploadDescInput");
        const editImageId = document.getElementById("editImageId");
        const uploadModalTitle = document.getElementById("uploadModalTitle");

        function checkSubmitEnable() {
            const hasUrl = urlInput && urlInput.value.trim().length > 0;
            const hasDesc = descInput && descInput.value.trim().length > 0;
            
            if (hasUrl && hasDesc) {
                submitUploadBtn.disabled = false;
            } else {
                submitUploadBtn.disabled = true;
            }
            
            // Auto preview url
            if (hasUrl) {
                previewImageElem.src = urlInput.value.trim();
                uploadPreview.classList.remove("hidden");
            } else {
                uploadPreview.classList.add("hidden");
            }
        }
        
        if (urlInput) urlInput.addEventListener("input", checkSubmitEnable);
        if (descInput) descInput.addEventListener("input", checkSubmitEnable);

        // Remover vista previa
        function resetUploadState() {
            previewImageElem.src = "";
            uploadPreview.classList.add("hidden");
            
            if(editImageId) editImageId.value = "";
            if(uploadModalTitle) uploadModalTitle.textContent = "Aportar a Galería";
            if(submitUploadBtn) submitUploadBtn.textContent = "Publicar Imagen";
            if(urlInput) urlInput.value = "";
            if(descInput) descInput.value = "";
            
            submitUploadBtn.disabled = true;
        }

        removePreview.addEventListener("click", () => {
            if (urlInput) urlInput.value = "";
            previewImageElem.src = "";
            uploadPreview.classList.add("hidden");
            checkSubmitEnable();
        });

        // Enviar Imagen
        submitUploadBtn.addEventListener("click", async () => {
            const desc = descInput ? descInput.value.trim() : "Sin descripción";
            const fileUrl = urlInput ? urlInput.value.trim() : "";
            const isEditMode = editImageId && editImageId.value;
            
            const originalText = submitUploadBtn.textContent;
            submitUploadBtn.textContent = isEditMode ? "Guardando..." : "Subiendo a Supabase...";
            submitUploadBtn.disabled = true;

            try {
                if (!window.supabaseClient) throw new Error("Cliente Supabase no configurado");
                const activeSession = await requireAuthenticatedSession();
                
                let finalImageUrl = fileUrl;
                
                if (!finalImageUrl) throw new Error("Falta la URL de la imagen.");

                if (isEditMode) {
                    // Update BD
                    const { error } = await window.supabaseClient
                        .from('galeria_imagenes')
                        .update({ image_url: finalImageUrl, description: desc })
                        .eq('id', editImageId.value);
                    if (error) throw error;
                } else {
                    // Insert BD
                    const { error } = await window.supabaseClient
                        .from('galeria_imagenes')
                        .insert({ 
                            image_url: finalImageUrl, 
                            description: desc,
                            user_id: activeSession.user.id
                        });
                    if (error) throw error;
                }
                
                closeUpload();
                await window.fetchGalleryFromDB(); // Actualizar galería
                
            } catch(e) {
                console.error("Excepción al subir:", e);
                alert("Hubo un error al guardar: " + e.message);
                submitUploadBtn.textContent = originalText;
                submitUploadBtn.disabled = false;
            }
        });

        // ==========================================
        // FETCH AND RENDER DB GALLERY
        // ==========================================
        window.openEditModal = function(item) {
            resetUploadState();
            if(uploadModalTitle) uploadModalTitle.textContent = "Editar Foto";
            if(editImageId) editImageId.value = item.id;
            if(submitUploadBtn) submitUploadBtn.textContent = "Guardar Cambios";
            
            if(urlInput) urlInput.value = item.image_url;
            if(descInput) descInput.value = item.description || "";
            
            previewImageElem.src = item.image_url;
            uploadPreview.classList.remove("hidden");
            
            checkSubmitEnable();
            
            uploadModal.classList.add("visible");
            uploadModal.setAttribute("aria-hidden", "false");
            document.body.style.overflow = "hidden";
        };

        window.fetchGalleryFromDB = async function() {
            const grid = document.getElementById("galeriaGrid");
            if (!grid || !window.supabaseClient) return;

            grid.innerHTML = '<p style="text-align:center;width:100%;grid-column:1/-1;color:var(--text-muted);">Cargando fotos de Supabase...</p>';
            
            try {
                const { data, error } = await window.supabaseClient
                    .from('galeria_imagenes')
                    .select('*')
                    .order('created_at', { ascending: false });
                    
                if (error) throw error;
                
                grid.innerHTML = '';
                galeriaImages.length = 0; // limpia lightbox arr
                
                if (!data || data.length === 0) {
                    grid.innerHTML = '<p style="text-align:center;width:100%;grid-column:1/-1;color:var(--text-muted);">Aún no hay fotos en la galería.</p>';
                    return;
                }
                
                data.forEach((item, index) => {
                    const div = document.createElement("div");
                    div.className = "galeria-item";
                    div.setAttribute("tabindex", "0");
                    
                    const img = document.createElement("img");
                    img.src = item.image_url;
                    img.alt = item.description || "Foto de galería";
                    img.className = "galeria-img";
                    img.loading = "lazy";
                    
                    div.appendChild(img);
                    
                    // Add for Lightbox
                    galeriaImages.push({ src: img.src, alt: img.alt });
                    
                    // Eventos lightbox
                    div.addEventListener("click", (e) => {
                        if (e.target.closest('.galeria-admin-controls')) return;
                        openLightbox(index);
                    });
                    div.addEventListener("keydown", (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            if (!e.target.closest('.galeria-admin-controls')) {
                                openLightbox(index);
                            }
                        }
                    });
                    
                    // CRUD Buttons (Hover)
                    if (currentUserSession && currentUserSession.user.id === item.user_id) {
                        const controls = document.createElement("div");
                        controls.className = "galeria-admin-controls";
                        
                        const btnEdit = document.createElement("button");
                        btnEdit.className = "admin-btn btn-edit";
                        btnEdit.title = "Editar foto";
                        btnEdit.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>`;
                        btnEdit.addEventListener("click", (e) => {
                            e.stopPropagation();
                            window.openEditModal(item);
                        });
                        
                        const btnDel = document.createElement("button");
                        btnDel.className = "admin-btn btn-delete";
                        btnDel.title = "Eliminar foto";
                        btnDel.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>`;
                        btnDel.addEventListener("click", async (e) => {
                            e.stopPropagation();
                            if (confirm('¿Eliminar esta imagen para siempre?')) {
                                btnDel.style.opacity = '0.5';
                                const { data: delData, error: delError } = await window.supabaseClient
                                    .from('galeria_imagenes')
                                    .delete()
                                    .eq('id', item.id)
                                    .select();
                                    
                                if (delError) {
                                    alert("Error: " + delError.message);
                                    btnDel.style.opacity = '1';
                                } else if (delData && delData.length === 0) {
                                    alert("Error Intencional: Supabase ignoró la orden de eliminar. Esto pasa cuando la política RLS (Reglas de Seguridad en tu Base de Datos) bloquea el borrado. ¡Asegúrate de ejecutar el código SQL para borrar!");
                                    btnDel.style.opacity = '1';
                                } else {
                                    window.fetchGalleryFromDB();
                                }
                            }
                        });
                        
                        controls.appendChild(btnEdit);
                        controls.appendChild(btnDel);
                        div.appendChild(controls);
                    }
                    
                    grid.appendChild(div);
                });
            } catch (e) {
                console.error("Excepción en fetchGallery:", e);
                grid.innerHTML = '<p style="text-align:center;width:100%;grid-column:1/-1;color:red;">Falla contactando base de datos.</p>';
            }
        };

        initGallery();
    }
});
