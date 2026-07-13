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
