document.addEventListener('DOMContentLoaded', async () => {
    // --- 1. VARIABLES GLOBALES Y BASE DE DATOS ---
    let usersDB = JSON.parse(localStorage.getItem('sentinel_db')) || [];
    let faceDescriptor = null; 
    const video = document.getElementById('video');
    const resultDisplay = document.getElementById('access-result');

    // --- 2. INICIALIZACIÓN DE IA Y CÁMARA ---
    async function initSystem() {
        console.log("Iniciando carga de modelos...");
        try {
            // Usamos ruta relativa sin puntos ni barras al inicio para máxima compatibilidad
            const MODEL_URL = 'models'; 
            
            // Cargamos los modelos uno por uno para detectar fallos
            await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
            console.log("SSD Mobilenet cargado.");
            await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
            console.log("Landmarks cargados.");
            await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
            console.log("Recognition cargado.");
            
            console.log("SISTEMA LISTO.");
            startCamera(); 
        } catch (err) {
            console.error("ERROR CARGANDO MODELOS:", err);
            alert("Error crítico: No se pudieron cargar los modelos de IA. Revisa la consola (F12).");
        }
    }

    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
            video.srcObject = stream;
            console.log("Cámara encendida correctamente.");
        } catch (err) {
            console.error("Error de acceso a cámara:", err);
            alert("No se pudo activar la cámara. Revisa los permisos.");
        }
    }

    // Arrancamos el motor
    initSystem();

    // --- 3. NAVEGACIÓN ---
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');

    if (menuToggle) {
        menuToggle.addEventListener('click', () => sidebar.classList.toggle('active'));
    }

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            if (btn.classList.contains('admin-only')) {
                const pass = prompt("Clave de Admin:");
                if (pass !== "1234") return alert("Denegado");
            }
            document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
            document.getElementById(target).classList.add('active');
            document.getElementById('section-title').innerText = target.toUpperCase();
            sidebar.classList.remove('active');
            if (target === 'db-view') updateTable();
        });
    });

    // --- 4. REGISTRO (VINCULAR) ---
    document.getElementById('btnFaceRegister').addEventListener('click', async () => {
        const btn = document.getElementById('btnFaceRegister');
        btn.innerText = "⌛ Analizando...";
        try {
            const detections = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();
            if (detections) {
                faceDescriptor = Array.from(detections.descriptor);
                btn.innerText = "✅ Rostro Vinculado";
                btn.style.borderColor = "#00ff88";
                alert("Rostro capturado exitosamente.");
            } else {
                btn.innerText = "📷 Reintentar";
                alert("No se detectó el rostro. Acércate más.");
            }
        } catch (e) { console.error(e); }
    });

    // --- 5. ESCÁNER (RECONOCER) ---
    const startScanBtn = document.getElementById('startScanBtn');
    let isScanning = false;

    startScanBtn.addEventListener('click', async () => {
        if (usersDB.length === 0) return alert("Base de datos vacía.");
        
        isScanning = !isScanning;
        startScanBtn.innerText = isScanning ? "🛑 DETENER" : "ACTIVAR ESCÁNER";
        resultDisplay.classList.toggle('hidden', !isScanning);

        if (!isScanning) return;

        const labeledDescriptors = usersDB.map(u => new faceapi.LabeledFaceDescriptors(u.nombre, [new Float32Array(u.faceData)]));
        const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);

        const loop = async () => {
            if (!isScanning) return;
            const det = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();
            if (det) {
                const match = faceMatcher.findBestMatch(det.descriptor);
                resultDisplay.innerHTML = match.label !== 'unknown' 
                    ? `<h2 style="color:#00ff88">ACCESO: ${match.label}</h2>`
                    : `<h2 style="color:#ff4444">NO RECONOCIDO</h2>`;
            }
            setTimeout(loop, 1000);
        };
        loop();
    });

    // --- 6. GUARDAR Y TABLA ---
    document.getElementById('registroForm').addEventListener('submit', (e) => {
        e.preventDefault();
        if (!faceDescriptor) return alert("Captura el rostro primero.");
        
        usersDB.push({
            nombre: document.getElementById('nombre').value,
            cedula: document.getElementById('cedula').value,
            carrera: document.getElementById('carrera').value,
            faceData: faceDescriptor
        });
        localStorage.setItem('sentinel_db', JSON.stringify(usersDB));
        alert("Guardado!");
        e.target.reset();
        faceDescriptor = null;
        document.getElementById('btnFaceRegister').innerText = "📷 Vincular Rostro";
    });

    function updateTable() {
        document.getElementById('userTableBody').innerHTML = usersDB.map(u => 
            `<tr><td>${u.nombre}</td><td>${u.cedula}</td><td>${u.carrera}</td><td style="color:#00ff88">Activo</td></tr>`
        ).join('');
    }

    // --- 7. ELIMINAR SERVICE WORKER FANTASMA ---
    // (Esto ayuda a limpiar si el navegador tiene uno viejo bloqueando)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(regs => {
            for(let reg of regs) reg.unregister();
        });
    }
});
