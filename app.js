document.addEventListener('DOMContentLoaded', async () => {
    // --- 1. VARIABLES GLOBALES Y BASE DE DATOS ---
    let usersDB = JSON.parse(localStorage.getItem('sentinel_db')) || [];
    let faceDescriptor = null; // Guardará la huella facial temporal del registro
    let deferredPrompt; // Para la instalación de la App

    // --- 2. INICIALIZACIÓN DE IA Y CÁMARA ---
    async function initSystem() {
        console.log("Cargando modelos de IA...");
        try {
            const MODEL_URL = './models';
            await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
            await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
            await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
            console.log("Modelos cargados correctamente.");
            startCamera(); // Iniciar cámara tras cargar modelos
        } catch (err) {
            console.error("Error cargando modelos:", err);
        }
    }

    async function startCamera() {
        const video = document.getElementById('video');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
            video.srcObject = stream;
        } catch (err) {
            console.error("No se pudo acceder a la cámara:", err);
        }
    }

    // Ejecutar inicialización
    initSystem();

    // --- 3. GESTIÓN DEL MENÚ Y NAVEGACIÓN ---
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');

    menuToggle.addEventListener('click', () => sidebar.classList.toggle('active'));

    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;

            // Restricción administrativa
            if (btn.classList.contains('admin-only')) {
                const pass = prompt("Ingrese Clave de Administrador:");
                if (pass !== "1234") {
                    alert("Acceso denegado.");
                    return;
                }
            }

            // Cambiar de sección
            document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
            document.getElementById(target).classList.add('active');
            
            // Actualizar título de la sección
            document.getElementById('section-title').innerText = target.toUpperCase();
            
            sidebar.classList.remove('active');
            if (target === 'db-view') updateTable();
        });
    });

    // --- 4. LÓGICA DE BIOMETRÍA (REGISTRO) ---

    // Registro Facial
    async function registerFace() {
        const video = document.getElementById('video');
        const btnFace = document.getElementById('btnFaceRegister');
        
        btnFace.innerText = "⌛ Analizando...";
        
        const detections = await faceapi.detectSingleFace(video)
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (detections) {
            faceDescriptor = Array.from(detections.descriptor); // Convertir a array para guardar en JSON
            btnFace.innerText = "✅ Rostro Vinculado";
            btnFace.style.borderColor = "#00ff88";
            alert("Análisis biométrico facial completado.");
        } else {
            btnFace.innerText = "📷 Reintentar Rostro";
            alert("No se detectó el rostro claramente. Mira a la cámara.");
        }
    }

    // Registro de Huella (WebAuthn)
    async function registerFingerprint() {
        if (!window.PublicKeyCredential) {
            alert("Este dispositivo no cuenta con sensor biométrico compatible con WebAuthn.");
            return;
        }

        const btnFinger = document.getElementById('btnFingerprint');
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const options = {
            publicKey: {
                challenge: challenge,
                rp: { name: "Sentinel AI" },
                user: {
                    id: Uint8Array.from("USERID", c => c.charCodeAt(0)),
                    name: "registro@sentinel.com",
                    displayName: "Usuario Sentinel"
                },
                pubKeyCredParams: [{ alg: -7, type: "public-key" }],
                authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
                timeout: 60000
            }
        };

        try {
            const credential = await navigator.credentials.create(options);
            if (credential) {
                btnFinger.innerText = "✅ Huella Vinculada";
                btnFinger.style.borderColor = "#00ff88";
                alert("Huella digital registrada en el sistema.");
            }
        } catch (err) {
            console.error(err);
            alert("La autenticación de huella fue cancelada o falló.");
        }
    }

    // --- 5. FORMULARIO DE REGISTRO ---
    const form = document.getElementById('registroForm');
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
            faceData: faceDescriptor, // Guardamos la firma facial
            fecha: new Date().toLocaleString()
        };

        usersDB.push(newUser);
        localStorage.setItem('sentinel_db', JSON.stringify(usersDB));
        
        alert("¡Registro Exitoso! Usuario añadido a la red Sentinel.");
        form.reset();
        faceDescriptor = null; // Limpiar para el siguiente
        document.getElementById('btnFaceRegister').innerText = "📷 Vincular Rostro";
    });

    // --- 6. TABLA DE USUARIOS ---
    function updateTable() {
        const tbody = document.getElementById('userTableBody');
        tbody.innerHTML = usersDB.map(u => `
            <tr>
                <td>${u.nombre}</td>
                <td>${u.cedula}</td>
                <td>${u.carrera}</td>
                <td style="color: #00ff88">Activo</td>
            </tr>
        `).join('');
    }

    // --- 7. FUNCIONES DE LA APP (PWA) ---
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log("SW no registrado", err));
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
    });

    document.getElementById('btnDownloadApp').addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            deferredPrompt = null;
        } else {
            alert("Para instalar en iOS: Pulsa 'Compartir' y luego 'Añadir a pantalla de inicio'.");
        }
    });

    // --- 8. ASIGNACIÓN DE EVENTOS A BOTONES BIOMÉTRICOS ---
    document.getElementById('btnFaceRegister').addEventListener('click', registerFace);
    document.getElementById('btnFingerprint').addEventListener('click', registerFingerprint);

}); // Fin DOMContentLoaded
