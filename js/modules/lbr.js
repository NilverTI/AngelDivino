/*
  Libro de Reclamaciones - por ahora muestra un aviso de "en construcción"
*/

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const lbrTooltip = document.getElementById("lbrTooltip");
    const lbrTooltipCloseBtn = document.getElementById("lbrTooltipCloseBtn");
    const lbrToggleBtn = document.getElementById("lbrToggleBtn");

    if (!lbrTooltip) return;

    const setVisible = (visible) => {
        lbrTooltip.classList.toggle("show", visible);
        lbrTooltip.setAttribute("aria-hidden", visible ? "false" : "true");
    };

    const closeTooltip = () => {
        setVisible(false);
        try {
            localStorage.setItem("Angel Divino:lbr-tooltip-seen", "true");
        } catch (error) { /* almacenamiento no disponible */ }
    };

    let hasSeenTooltip = null;
    try {
        hasSeenTooltip = localStorage.getItem("Angel Divino:lbr-tooltip-seen");
    } catch (error) { /* almacenamiento no disponible */ }

    if (!hasSeenTooltip) {
        setTimeout(() => setVisible(true), 2500);
    }

    if (lbrToggleBtn) {
        lbrToggleBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            setVisible(!lbrTooltip.classList.contains("show"));
        });
    }

    if (lbrTooltipCloseBtn) {
        lbrTooltipCloseBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            closeTooltip();
        });
    }

    lbrTooltip.addEventListener("click", closeTooltip);
});
