// assets/js/utils.js
(function () {
    function msToHms(ms) {
        if (!ms || ms <= 0) return "0h 0m";
        const seconds = Math.floor(ms / 1000);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }

    function deg2rad(deg) { return deg * (Math.PI / 180); }

    function getDistance(lat1, lon1, lat2, lon2) {
        if ([lat1, lon1, lat2, lon2].some(v => v == null || isNaN(v))) return Infinity;
        const R = 6371000;
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    async function getCurrentLocation(timeout = 7000) {
        return new Promise((resolve) => {
            if ("geolocation" in navigator) {
                const options = { enableHighAccuracy: true, timeout, maximumAge: 0 };
                navigator.geolocation.getCurrentPosition(pos => {
                    resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                }, err => {
                    console.warn("Geolocation error:", err);
                    // Degradado seguro
                    resolve({ lat: 0, lng: 0 });
                }, options);
            } else {
                resolve({ lat: 0, lng: 0 });
            }
        });
    }

    function safeCreateIcons() {
        try {
            if (window.lucide && typeof window.lucide.createIcons === 'function') {
                window.lucide.createIcons();
            }
        } catch (e) {
            console.warn("lucide.createIcons fallo:", e);
        }
    }

    function showMessage(message, type = 'info', autoHide = true) {
        const container = document.getElementById('modal-container');
        if (!container) return;
        let bg = 'bg-blue-600';
        let icon = 'info';

        if (type === 'error') { bg = 'bg-red-600'; icon = 'alert-triangle'; }
        else if (type === 'success') { bg = 'bg-green-600'; icon = 'check-circle'; }

        container.innerHTML = `
            <div class="card p-6 w-full max-w-sm mx-auto transform transition-all scale-100 duration-300">
                <div class="flex items-center space-x-4">
                    <i data-lucide="${icon}" class="w-6 h-6 text-white ${bg} rounded-full p-1 flex-shrink-0"></i>
                    <p class="text-gray-700 font-semibold flex-grow">${message}</p>
                </div>
                <div class="mt-4 text-right">
                    <button id="modal-close-btn" class="px-4 py-2 text-sm font-medium rounded-lg text-white ${bg}">Cerrar</button>
                </div>
            </div>
        `;
        container.classList.remove('hidden');
        container.classList.add('flex');
        safeCreateIcons();

        document.getElementById('modal-container').querySelector('#modal-close-btn').onclick = hideMessage;

        if (autoHide) setTimeout(hideMessage, 4500);
    }

    function hideMessage() {
        const container = document.getElementById('modal-container');
        if (!container) return;
        container.classList.add('hidden');
        container.classList.remove('flex');
        container.innerHTML = '';
    }

    // export
    window.msToHms = msToHms;
    window.getDistance = getDistance;
    window.getCurrentLocation = getCurrentLocation;
    window.safeCreateIcons = safeCreateIcons;
    window.showMessage = showMessage;
    window.hideMessage = hideMessage;
})();