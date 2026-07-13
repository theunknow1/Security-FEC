document.addEventListener('DOMContentLoaded', async () => {
    // --- 1. VARIABLES GLOBALES Y BASE DE DATOS ---
    let usersDB = JSON.parse(localStorage.getItem('sentinel_db')) || [];
    let faceDescriptor = null; 
    let deferredPrompt; 

    const video = document.getElementById('video');

    // --- 2. INICIALIZACIÓN DE IA Y CÁMARA ---
    async function initSystem() {
        console.log("Cargando modelos de IA...");
        try {
            // USAMOS RUTA RELATIVA 'models' (sin la barra / al principio)
            const MODEL_URL = 'models'; 
            
            await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
            await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
            await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
            
            console.log("Modelos cargados correctamente.");
            startCamera(); 
        } catch (err) {
            console.error("Error cargando modelos:", err);
            alert("Error al cargar la IA. Revisa la consola (F12).");
        }
    }

    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
            video.srcObject = stream;
        } catch (err) {
            console.error("No se pudo acceder a la cámara:", err);
            alert("Error: No se detectó cámara o falta de permisos.");
        }
    }

    // EJECUTAR INICIALIZACIÓN UNA SOLA VEZ
    initSystem();

    // --- 3. GESTIÓN DEL MENÚ Y NAVEGACIÓN ---
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');

    if(menuToggle) {
        menuToggle.addEventListener('click', () => sidebar.classList.toggle('active'));
    }

    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            if (btn.classList.contains('admin-only')) {
                const pass = prompt("Ingrese Clave de Administrador:");
                if (pass !== "1234") {
                    alert("Acceso denegado.");
                    return;
                }
            }
            document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
            document.getElementById(target).classList.add('active');
            document.getElementById('section-title').innerText = target.toUpperCase();
            sidebar.classList.remove('active');
            if (target === 'db-view') updateTable();
        });
    });

    // --- 4. LÓGICA DE BIOMETRÍA (REGISTRO) ---
    async function registerFace() {
        const btnFace = document.getElementById('btnFaceRegister');
        btnFace.innerText = "⌛ Analizando...";
        
        try {
            const detections = await faceapi.detectSingleFace(video)
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (detections) {
                faceDescriptor = Array.from(detections.descriptor);
                btnFace.innerText = "✅ Rostro Vinculado";
                btnFace.style.borderColor = "#00ff88";
                alert("Análisis biométrico facial completado.");
            } else {
                btnFace.innerText = "📷 Reintentar Rostro";
                alert("No se detectó el rostro claramente. Mira a la cámara.");
            }
        } catch (e) {
            console.error(e);
            btnFace.innerText = "❌ Error";
        }
    }

    async function registerFingerprint() {
        if (!window.PublicKeyCredential) {
            alert("Dispositivo no compatible con WebAuthn.");
            return;
        }
        const btnFinger = document.getElementById('btnFingerprint');
        // ... (Tu lógica de huella se mantiene igual)
        alert("Simulación: Huella vinculada (WebAuthn requiere HTTPS real).");
        btnFinger.innerText = "✅ Huella Vinculada";
    }

    // --- 5. FORMULARIO Y TABLA ---
    const form = document.getElementById('registroForm');
    if(form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!faceDescriptor) {
                alert("Debes vincular el rostro antes de finalizar.");
                return;
            }
            const newUser = {
                nombre: document.getElementById('nombre').value,
                cedula: document.getElementById('cedula').value,
                carrera: document.getElementById('carrera').value,
                rol: document.getElementById('rol').value,
                faceData: faceDescriptor,
                fecha: new Date().toLocaleString()
            };
            usersDB.push(newUser);
            localStorage.setItem('sentinel_db', JSON.stringify(usersDB));
            alert("¡Registro Exitoso!");
            form.reset();
            faceDescriptor = null;
            document.getElementById('btnFaceRegister').innerText = "📷 Vincular Rostro";
        });
    }

    function updateTable() {
        const tbody = document.getElementById('userTableBody');
        if(tbody) {
            tbody.innerHTML = usersDB.map(u => `
                <tr>
                    <td>${u.nombre}</td>
                    <td>${u.cedula}</td>
                    <td>${u.carrera}</td>
                    <td style="color: #00ff88">Activo</td>
                </tr>
            `).join('');
        }
    }

    // --- 6. EVENTOS BIOMÉTRICOS ---
    document.getElementById('btnFaceRegister').addEventListener('click', registerFace);
    document.getElementById('btnFingerprint').addEventListener('click', registerFingerprint);

    // --- 7. PWA ---
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log("SW error", err));
    }
});
