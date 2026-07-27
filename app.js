            usersDB = usersDB.filter(u => u.id !== id);
            localStorage.setItem('sentinel_db', JSON.stringify(usersDB));
            updateTable();
        }
    };
    const btnClearDB = document.getElementById('btnClearDB');
    if (btnClearDB) {
        btnClearDB.addEventListener('click', () => {
            if (confirm("⚠️ ¿Deseas borrar TODOS los usuarios de la base de datos local?")) {
                usersDB = [];
                localStorage.removeItem('sentinel_db');
                updateTable();
                alert("Base de datos vaciada.");
            }
        });
    }
    const dbSearch = document.getElementById('dbSearch');
    if (dbSearch) {
        dbSearch.addEventListener('input', updateTable);
    }
    function escapeHtml(str) {
        return (str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
    }
    // Limpieza de Service Workers obsoletos al inicio
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(regs => {
            for (let reg of regs) {
                console.log("Limpiando SW anterior:", reg);
            }
        });
    }
    // Inicialización del sistema
    loadModels();
});
