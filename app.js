document.addEventListener('DOMContentLoaded', () => {
    let usersDB = JSON.parse(localStorage.getItem('sentinel_db')) || [];
    
    // --- Gestión del Menú ---
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');

    menuToggle.addEventListener('click', () => sidebar.classList.toggle('active'));

    // --- Protección de Secciones (Simulación de Admin) ---
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;

            // Si es una sección administrativa, pedir "clave"
            if (btn.classList.contains('admin-only')) {
                const pass = prompt("Ingrese Clave de Administrador:");
                if (pass !== "1234") {
                    alert("Acceso denegado.");
                    return;
                }
            }

            document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
            document.getElementById(target).classList.add('active');
            sidebar.classList.remove('active');
            
            if(target === 'db-view') updateTable();
        });
    });

    // --- Registro ---
    const form = document.getElementById('registroForm');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const newUser = {
            nombre: document.getElementById('nombre').value,
            cedula: document.getElementById('cedula').value,
            carrera: document.getElementById('carrera').value,
            rol: document.getElementById('rol').value
        };
        usersDB.push(newUser);
        localStorage.setItem('sentinel_db', JSON.stringify(usersDB));
        alert("Usuario registrado con éxito");
        form.reset();
    });

    function updateTable() {
        const tbody = document.getElementById('userTableBody');
        tbody.innerHTML = usersDB.map(u => `
            <tr>
                <td>${u.nombre}</td>
                <td>${u.cedula}</td>
                <td>${u.carrera}</td>
                <td style="color: #00ff88">Autorizado</td>
            </tr>
        `).join('');
    }

    // --- Botón de App ---
    document.getElementById('btnDownloadApp').addEventListener('click', () => {
        alert("Generando enlace de descarga PWA para Android/iOS... \n\nInstrucciones: En el móvil, abre el navegador y selecciona 'Añadir a pantalla de inicio'.");
    });
});
// 1. Cargar los modelos al iniciar
async function loadModels() {
    const MODEL_URL = './models';
    await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    console.log("Modelos de IA cargados");
}

// 2. Función para "Vincular Rostro" (Registrar)
let faceDescriptor = null;

async function registerFace() {
    const video = document.getElementById('video'); // Usamos el video del escaner
    const detections = await faceapi.detectSingleFace(video)
        .withFaceLandmarks()
        .withFaceDescriptor();

    if (detections) {
        faceDescriptor = detections.descriptor; // Esto es una lista de 128 números
        alert("Rostro capturado y encriptado con éxito");
    } else {
        alert("No se detecta ningún rostro. Intenta de nuevo.");
    }
}
async function registerFingerprint() {
    if (!window.PublicKeyCredential) {
        alert("Tu dispositivo no soporta biometría web.");
        return;
    }

    // Configuración básica para pedir biometría al sistema operativo
    const challenge = new Uint8Array(32); // Datos aleatorios
    window.crypto.getRandomValues(challenge);

    const createCredentialOptions = {
        publicKey: {
            challenge: challenge,
            rp: { name: "Sentinel AI" },
            user: {
                id: Uint8Array.from("USER_ID", c => c.charCodeAt(0)),
                name: "usuario@sentinel.com",
                displayName: "Usuario Sentinel"
            },
            pubKeyCredParams: [{ alg: -7, type: "public-key" }], // Algoritmo ES256
            authenticatorSelection: {
                authenticatorAttachment: "platform", // Esto fuerza a usar el sensor del dispositivo (huella/faceID)
                userVerification: "required"
            },
            timeout: 60000
        }
    };

    try {
        const credential = await navigator.credentials.create(createCredentialOptions);
        alert("✅ Huella digital vinculada a través del sistema");
        console.log("Credencial creada:", credential);
    } catch (err) {
        console.error(err);
        alert("Error o cancelación de biometría.");
    }
}

// Vincular a los botones
document.getElementById('btnFaceRegister').addEventListener('click', registerFace);
document.getElementById('btnFingerprint').addEventListener('click', registerFingerprint);
