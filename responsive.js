(() => {
    const MOBILE_BREAKPOINT = 800;

    function updateMode() {
        const isMobile = window.innerWidth <= MOBILE_BREAKPOINT || /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        const doc = document.documentElement;
        doc.classList.toggle("mobile-mode", isMobile);
        doc.classList.toggle("desktop-mode", !isMobile);
        doc.classList.add("mode-ready");
    }

    window.addEventListener("resize", updateMode);
    // Execute immediately in case the inline script was missed or for resizing
    updateMode();
})();
