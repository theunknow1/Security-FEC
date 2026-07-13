document.addEventListener('DOMContentLoaded', async () => {
    // --- 1. VARIABLES GLOBALES Y BASE DE DATOS ---
    // Intentamos cargar la DB del navegador, si no existe, empezamos con un array vacío
    let usersDB = JSON.parse(localStorage.getItem('sentinel_db')) || [];
    let faceDescriptor = null; // Para guardar temporalmente la huella facial al registrar
    const video = document.getElementById('video');
    const resultDisplay = document.getElementById('access-result');

    // --- 2. INICIALIZACIÓN DE IA Y CÁMARA ---
    async function initSystem() {
        console.log("Cargando modelos de IA...");
        try {
            // Ruta relativa para GitHub Pages
            const MODEL_URL = 'models'; 
            
            // Cargamos los 3 modelos necesarios
            await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
            await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
            await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
            
            console.log("Modelos cargados correctamente.");
            startCamera(); 
        } catch (err) {
            console.error("Error crítico cargando modelos:", err);
            alert("No se pudieron cargar los modelos de IA. Revisa la carpeta /models.");
        }
    }

    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
            video.srcObject = stream;
            console.log("Cámara activa.");
        } catch (err) {
            console.error("Error de cámara:", err);
            alert("No se pudo acceder a la cámara. Asegúrate de usar HTTPS.");
        }
    }

    // Arrancamos el sistema
    initSystem();

    // --- 3. GESTIÓN DE NAVEGACIÓN Y MENÚ ---
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');

    if (menuToggle) {
        menuToggle.addEventListener('click', () => sidebar.classList.toggle('active'));
    }

    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            
            // Seguridad para Admin
            if (btn.classList.contains('admin-only')) {
                const pass = prompt("Ingrese Clave de Administrador:");
                if (pass !== "1234") {
                    alert("Acceso Denegado.");
                    return;
                }
            }

            // Cambiar pestañas
            document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
            document.getElementById(target).classList.add('active');
            document.getElementById('section-title').innerText = target.toUpperCase();
            
            sidebar.classList.remove('active');
            if (target === 'db-view') updateTable();
        });
    });

    // --- 4. LÓGICA DE REGISTRO (VINCULAR ROSTRO) ---
    async function registerFace() {
        const btnFace = document.getElementById('btnFaceRegister');
        btnFace.innerText = "⌛ Analizando...";
        
        try {
            const detections = await faceapi.detectSingleFace(video)
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (detections) {
                // Convertimos el descriptor a un Array normal para poder guardarlo en JSON
                faceDescriptor = Array.from(detections.descriptor);
                btnFace.innerText = "✅ Rostro Vinculado";
                btnFace.style.borderColor = "#00ff88";
                alert("Firma biométrica capturada con éxito.");
            } else {
                btnFace.innerText = "📷 Reintentar Rostro";
                alert("No se detectó el rostro. Acércate más a la cámara.");
            }
        } catch (e) {
            console.error(e);
            btnFace.innerText = "❌ Error";
        }
    }

    // --- 5. LÓGICA DE ESCANEO (RECONOCIMIENTO) ---
    const startScanBtn = document.getElementById('startScanBtn');
    let isScanning = false;

    startScanBtn.addEventListener('click', async () => {
        if (usersDB.length === 0) {
            alert("La base de datos está vacía. Registre un usuario primero.");
            return;
        }

        isScanning = !isScanning;
        startScanBtn.innerText = isScanning ? "🛑 DETENER ESCÁNER" : "ACTIVAR ESCÁNER BIOMÉTRICO";
        resultDisplay.classList.toggle('hidden', !isScanning);

        if (!isScanning) return;

        // Preparamos los datos guardados para la comparación
        const labeledDescriptors = usersDB.map(user => {
            const desc = new Float32Array(user.faceData);
            return new faceapi.LabeledFaceDescriptors(user.nombre, [desc]);
        });

        const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);

        // Bucle de detección
        const scanLoop = async () => {
            if (!isScanning) return;

            const detections = await faceapi.detectSingleFace(video)
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (detections) {
                const bestMatch = faceMatcher.findBestMatch(detections.descriptor);
                
                if (bestMatch.label !== 'unknown') {
                    resultDisplay.innerHTML = `
                        <div style="background: rgba(0,255,136,0.1); padding: 20px; border-radius: 15px; border: 1px solid #00ff88">
                            <h2 style="color: #00ff88">ACCESO CONCEDIDO</h2>
                            <p>${bestMatch.label}</p>
                            <small>Verificación Biométrica Exitosa</small>
                        </div>
                    `;
                } else {
                    resultDisplay.innerHTML = `
                        <div style="background: rgba(255,68,68,0.1); padding: 20px; border-radius: 15px; border: 1px solid #ff4444">
                            <h2 style="color: #ff4444">ACCESO DENEGADO</h2>
                            <p>Usuario no identificado</p>
                        </div>
                    `;
                }
            }
            // Ejecutar de nuevo en 1 segundo
            setTimeout(scanLoop, 1000);
        };

        scanLoop();
    });

    // --- 6. GUARDAR REGISTRO EN LOCALSTORAGE ---
    const form = document.getElementById('registroForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            if (!faceDescriptor) {
                alert("Error: Primero debes capturar el rostro.");
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
            
            alert("Usuario registrado exitosamente en Sentinel AI.");
            form.reset();
            faceDescriptor = null;
            document.getElementById('btnFaceRegister').innerText = "📷 Vincular Rostro";
            document.getElementById('btnFaceRegister').style.borderColor = "";
        });
    }

    // --- 7. TABLA DE BASE DE DATOS ---
    function updateTable() {
        const tbody = document.getElementById('userTableBody');
        if (tbody) {
            tbody.innerHTML = usersDB.map(u => `
                <tr>
                    <td>${u.nombre}</td>
                    <td>${u.cedula}</td>
                    <td>${u.carrera}</td>
                    <td style="color: #00ff88">✔ Activo</td>
                </tr>
            `).join('');
        }
    }

    // --- 8. EVENTOS Y PWA ---
    document.getElementById('btnFaceRegister').addEventListener('click', registerFace);
    /* BORRA O COMENTA ESTO TEMPORALMENTE:
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log("SW error", err));
    }
});
