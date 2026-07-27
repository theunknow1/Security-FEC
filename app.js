/**
 * SENTINEL - Sistema Inteligente de Control de Acceso Biométrico
 * Optimizado para GitHub Pages, Navegadores de Escritorio y Teléfonos Móviles
 */
document.addEventListener('DOMContentLoaded', async () => {
    // --- 1. ESTADO Y VARIABLES GLOBALES ---
    let usersDB = JSON.parse(localStorage.getItem('sentinel_db')) || [];
    let currentFaceDescriptor = null;
    let isScanning = false;
    let currentFacingMode = 'user'; // 'user' (frontal) o 'environment' (trasera)
    let currentStream = null;
    // Elementos DOM
    const video = document.getElementById('video');
    const canvas = document.getElementById('face-canvas');
    const resultDisplay = document.getElementById('access-result');
    const startScanBtn = document.getElementById('startScanBtn');
    const btnFaceRegister = document.getElementById('btnFaceRegister');
    const registerStatusBadge = document.getElementById('register-status-badge');
    const systemStatusBar = document.getElementById('system-status-bar');
    const statusText = document.getElementById('status-text');
    const statusSpinner = document.getElementById('status-spinner');
    const cameraLoading = document.getElementById('camera-loading');
    const btnToggleCamera = document.getElementById('btnToggleCamera');
    const scannerLaser = document.getElementById('scanner-laser');
  // --- 2. CARGA ULTRA-ROBUSTA DE MODELOS IA (REPOSITORIO LOCAL + CDN FALLBACK) ---
    // En GitHub Pages o servidores remotos, las rutas locales pueden dar 404 si faltan archivos.
    // Usamos CDN de respaldo rápido para garantizar que la app NUNCA se quede congelada en pantalla negra.
    const BASE_PATH = window.location.pathname.replace(/\/[^\/]*$/, '');
    const MODEL_SOURCES = [
        `${BASE_PATH}/models`,
        './models',
        'https://cdn.jsdelivr.net/gh/cddh/face-api.js@master/weights',
        'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights',
        'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights'
    ];
    async function loadModels() {
        updateStatus("Cargando modelos de IA desde red...", "loading");
   // Verificamos si face-api.js se cargó correctamente desde el CDN externo
        if (typeof faceapi === 'undefined') {
            console.error("face-api.js no está definido. Verificando script tag...");
            updateStatus("Error: Librería face-api.js no detectada.", "error");
            if (startScanBtn) {
                startScanBtn.disabled = false;
                startScanBtn.innerText = "⚠️ REINTENTAR CARGA DE IA";
                startScanBtn.onclick = () => location.reload();
            }
            return;
        }
                  let loaded = false;
        for (const sourceUrl of MODEL_SOURCES) {
            console.log(`[SENTINEL] Intentando cargar modelos desde: ${sourceUrl}`);
            try {
                // timeout de 8 segundos por origen para evitar bloqueos prolongados
                const loadPromise = Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri(sourceUrl),
                    faceapi.nets.tinyFaceDetector.loadFromUri(sourceUrl),
                    faceapi.nets.faceLandmark68Net.loadFromUri(sourceUrl),
                    faceapi.nets.faceRecognitionNet.loadFromUri(sourceUrl)
                ]);
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error("Tiempo de espera agotado al cargar modelos")), 8000)
                );
                         await Promise.race([loadPromise, timeoutPromise]);
                console.log(`[SENTINEL] ✅ Modelos cargados exitosamente desde: ${sourceUrl}`);
                loaded = true;
                break;
            } catch (err) {
                console.warn(`[SENTINEL] Falló origen ${sourceUrl}:`, err.message || err);
            }
        }
        if (loaded) {
            updateStatus("SISTEMA BIOMÉTRICO LISTO", "success");
            if (startScanBtn) {
                startScanBtn.disabled = false;
                startScanBtn.innerText = "⚡ ACTIVAR ESCÁNER BIOMÉTRICO";
            }
            await startCamera();
                      } else {
            updateStatus("Modelos localmente no encontrados. Usando cámara en modo básico.", "error");
            if (startScanBtn) {
                startScanBtn.disabled = false;
                startScanBtn.innerText = "⚠️ REINTENTAR CARGAR IA";
            }
            await startCamera();
        }
    }
    function updateStatus(message, type = "info") {
        if (!systemStatusBar || !statusText) return;
        statusText.innerText = message;
        systemStatusBar.className = `status-bar ${type}`;
        if (statusSpinner) {
            statusSpinner.style.display = type === "loading" ? "inline-block" : "none";
        }
    }

                           // --- 3. CÁMARA (DESKTOP & MÓVIL) ---
    async function startCamera() {
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }
        if (cameraLoading) cameraLoading.style.display = "flex";
        const constraints = {
            video: {
                facingMode: { ideal: currentFacingMode },
                width: { ideal: 1280, max: 1920 },
                height: { ideal: 720, max: 1080 }
            },
            audio: false
        };
        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            currentStream = stream;
            video.srcObject = stream;
                      await new Promise((resolve) => {
                video.onloadedmetadata = () => {
                    video.play().catch(e => console.log("Auto-play prevenido:", e));
                    resolve();
                };
            });
            if (cameraLoading) cameraLoading.style.display = "none";
            adjustCanvasSize();
        } catch (err) {
            console.error("Error al acceder a la cámara:", err);
            if (cameraLoading) {
                cameraLoading.innerHTML = `
                    <div style="padding:20px; text-align:center;">
                        <p style="color:#ff4444; font-weight:bold; margin-bottom:10px;">❌ No se detectó cámara o permiso denegado</p>
                        <small style="color:#aaa;">Si estás en móvil, asegúrate de acceder usando HTTPS y otorgar permisos de cámara.</small>
                    </div>`;
            }
        }
                 }
              function adjustCanvasSize() {
        if (video && canvas && video.videoWidth && video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        }
    }
    window.addEventListener('resize', adjustCanvasSize);
    if (btnToggleCamera) {
        btnToggleCamera.addEventListener('click', async () => {
            currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
            btnToggleCamera.innerText = currentFacingMode === 'user' ? '📱 Cam Frontal' : '📷 Cam Trasera';
            await startCamera();
        });
    }
    // --- 4. SIDEBAR Y MENÚ ---
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
  function toggleMenu() {
        if (sidebar) sidebar.classList.toggle('active');
        if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
    }
    if (menuToggle) menuToggle.addEventListener('click', toggleMenu);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleMenu);
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            if (btn.classList.contains('admin-only')) {
                const pass = prompt("Clave de Administrador (1234):");
                if (pass !== "1234") return alert("Acceso denegado.");
            }
                     document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
            const targetEl = document.getElementById(target);
            if (targetEl) targetEl.classList.add('active');
            if (sidebar && sidebar.classList.contains('active')) toggleMenu();
            if (target === 'db-view') updateTable();
        });
    });
            // --- 5. REGISTRO DE ROSTRO ---
    if (btnFaceRegister) {
        btnFaceRegister.addEventListener('click', async () => {
            if (typeof faceapi === 'undefined' || !faceapi.nets.ssdMobilenetv1.params) {
                return alert("Los modelos de IA aún se están cargando. Aguarde un momento por favor.");
            }
            btnFaceRegister.innerText = "⌛ Analizando rostro...";
            btnFaceRegister.disabled = true;
            try {
                let detection = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();
                if (!detection) {
                    detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
                }
     if (detection) {
                    currentFaceDescriptor = Array.from(detection.descriptor);
                    btnFaceRegister.innerText = "✅ Rostro Capturado";
                    if (registerStatusBadge) {
                        registerStatusBadge.innerText = "✅ Descriptor biométrico capturado.";
                        registerStatusBadge.className = "status-badge-success";
                    }
                } else {
                    btnFaceRegister.innerText = "📷 Reintentar Captura";
                    if (registerStatusBadge) {
                        registerStatusBadge.innerText = "❌ No se detectó ningún rostro. Acércate más a la cámara.";
                        registerStatusBadge.className = "status-badge-error";
                    }
                    alert("No se detectó un rostro claro. Ilumina bien tu rostro y mírate a la cámara.");
                }
            } catch (e) {
                console.error("Error en captura:", e);
                alert("Ocurrió un error al analizar el rostro.");
            } finally {
                btnFaceRegister.disabled = false;
            }
        });
    }
               const registroForm = document.getElementById('registroForm');
    if (registroForm) {
        registroForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!currentFaceDescriptor) return alert("Captura el rostro primero.");
            const nombre = document.getElementById('nombre').value.trim();
            const cedula = document.getElementById('cedula').value.trim();
            const carrera = document.getElementById('carrera').value;
            const rol = document.getElementById('rol').value;
            usersDB.push({
                id: Date.now(),
                nombre,
                cedula,
                carrera,
                rol,
                faceData: currentFaceDescriptor
            });
 localStorage.setItem('sentinel_db', JSON.stringify(usersDB));
            alert(`✅ Usuario "${nombre}" guardado con éxito en SENTINEL.`);
            registroForm.reset();
            currentFaceDescriptor = null;
            btnFaceRegister.innerText = "📷 Capturar Rostro";
            if (registerStatusBadge) {
                registerStatusBadge.innerText = "Esperando nueva captura...";
                registerStatusBadge.className = "status-badge-info";
            }
        });
    }
 // --- 6. ESCÁNER BIOMÉTRICO EN TIEMPO REAL ---
    if (startScanBtn) {
        startScanBtn.addEventListener('click', () => {
            if (usersDB.length === 0) return alert("Base de datos vacía. Registra al menos un usuario primero.");
            isScanning = !isScanning;
            startScanBtn.innerText = isScanning ? "🛑 DETENER ESCÁNER" : "⚡ ACTIVAR ESCÁNER BIOMÉTRICO";
            startScanBtn.className = isScanning ? "btn-main btn-danger" : "btn-main pulse-glow";
            if (resultDisplay) resultDisplay.classList.toggle('hidden', !isScanning);
            if (scannerLaser) scannerLaser.style.display = isScanning ? "block" : "none";
   if (!isScanning) {
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
                if (resultDisplay) resultDisplay.innerHTML = "";
                return;
            }
            const labeledDescriptors = usersDB.map(u => new faceapi.LabeledFaceDescriptors(u.nombre, [new Float32Array(u.faceData)]));
            const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.55);
            async function processScanFrame() {
                if (!isScanning) return;
                adjustCanvasSize();
                const displaySize = { width: video.videoWidth || 640, height: video.videoHeight || 480 };
                if (canvas) faceapi.matchDimensions(canvas, displaySize);
      try {
                    const detections = await faceapi.detectAllFaces(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
                        .withFaceLandmarks()
                        .withFaceDescriptors();
                    const resizedDetections = faceapi.resizeResults(detections, displaySize);
                    if (canvas) {
                        const ctx = canvas.getContext('2d');
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                    }
                    if (resizedDetections.length > 0) {
                        resizedDetections.forEach(det => {
                            const match = faceMatcher.findBestMatch(det.descriptor);
                            const box = det.detection.box;
                            const isMatched = match.label !== 'unknown';
                            const labelText = isMatched 
                                ? `ACCESO CONCEDIDO: ${match.label} (${Math.round((1 - match.distance) * 100)}%)` 
                                : `DESCONOCIDO - ACCESO DENEGADO`;
                            if (canvas) {
                                new 
                                            faceapi.draw.DrawBox(box, {
                                    label: labelText,
                                    boxColor: isMatched ? '#00e676' : '#ff3366',
                                    lineWidth: 3
                                }).draw(canvas);
                            }
                            if (resultDisplay) {
                                resultDisplay.innerHTML = isMatched 
                                    ? `<div class="access-card granted"><div class="status-icon">✅</div><div><h3>ACCESO PERMITIDO</h3><p class="user-name">${match.label}</p></div></div>`
                                    : `<div class="access-card denied"><div class="status-icon">🚫</div><div><h3>ACCESO DENEGADO</h3><p class="user-name">Rostro no registrado</p></div></div>`;
                            }
                        });
                    }
                   } catch (err) {
                    console.error("Error en frame de escáner:", err);
                }
                if (isScanning) setTimeout(processScanFrame, 200);
            }
            processScanFrame();
        });
    }
    function updateTable() {
        const tbody = document.getElementById('userTableBody');
        if (!tbody) return;
        if (usersDB.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-mid); padding: 20px;">No hay usuarios registrados.</td></tr>`;
            return;
        }
        tbody.innerHTML = usersDB.map(u => `
            <tr>
                <td><strong>${escapeHtml(u.nombre)}</strong></td>
                  <td>${escapeHtml(u.cedula)}</td>
                <td>${escapeHtml(u.carrera || 'N/A')}</td>
                <td><span class="role-badge">${escapeHtml(u.rol || 'Estudiante')}</span></td>
                <td><span class="status-active">● Activo</span></td>
                <td><button class="btn-delete" onclick="deleteUser(${u.id})">Eliminar</button></td>
            </tr>
        `).join('');
    }
    window.deleteUser = function(id) {
        if (confirm("¿Deseas eliminar este usuario de SENTINEL?")) {
            usersDB = usersDB.filter(u => u.id !== id);
            localStorage.setItem('sentinel_db', JSON.stringify(usersDB));
            updateTable();
        }
    };
    function escapeHtml(str) {
        return (str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
    }
    // Inicializar modelos
    loadModels();
});
