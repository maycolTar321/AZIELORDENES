/**
 * NÚCLEO LOGÍSTICO Y MOTOR OPERATIVO COMPLETO: AZIER SUITE SERVICE
 * Conectado 100% a la Base de Datos PHP (api.php)
 */

const API_URL = "api.php";
let globalOrders = [];
let globalClients = [];
let globalInventory = [];
let globalTasks = [];
let globalUsers = [];
let globalBriefs = [];
let currentUser = null;
let currentCart = [];
let chartInstance = null;

// =========================================================================
// 1. INICIALIZADOR PRINCIPAL
// =========================================================================
document.addEventListener("DOMContentLoaded", () => {
    configurarEventosAutenticacion();
    configurarEventosNavegacion();
    inicializarRelojMilitar();
    
    // Bypass login completely per user request
    currentUser = { email: 'admin-local', role: 'superadmin' };
    loguearExitosamenteApp();
});

// =========================================================================
// 2. CONEXIÓN API Y DATOS
// =========================================================================
async function fetchData() {
    try {
        const res = await fetch(`${API_URL}?action=get_data`);
        const data = await res.json();
        
        globalOrders = data.orders || [];
        globalClients = data.clients || [];
        globalInventory = data.inventory || [];
        globalTasks = data.tasks || [];
        globalUsers = data.users || [];
        globalBriefs = data.briefs || [];
        
        updateUI();
        
        const loader = document.getElementById("loader-initial");
        if(loader) loader.style.display = "none";
    } catch(e) {
        console.error("Error conectando a DB", e);
        showToast("Error crítico conectando a la base de datos.", "error");
        const loader = document.getElementById("loader-initial");
        if(loader) loader.style.display = "none";
    }
}

function updateUI() {
    renderizarEstadisticasYGraficos();
    renderInventory();
    renderClients();
    renderKanban();
    // Poblar modales si están abiertos en background (optimización)
    poblarModalClientes('');
    poblarModalInventario('');
}

// =========================================================================
// 3. TOAST NOTIFICATIONS (Reemplazo de Alert)
// =========================================================================
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast-msg toast-${type}`;
    toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-check-circle' : 'fa-triangle-exclamation'}"></i> <span>${message}</span>`;
    toastContainer.appendChild(toast);
    
    setTimeout(() => { toast.classList.add('fade-out'); }, 2500);
    setTimeout(() => { toast.remove(); }, 2800);
}

function createToastContainer() {
    const div = document.createElement('div');
    div.id = 'toast-container';
    document.body.appendChild(div);
    return div;
}

// =========================================================================
// 4. AUTENTICACIÓN
// =========================================================================
function configurarEventosAutenticacion() {
    const btnLogin = document.getElementById("btn-login");
    const btnLogout = document.getElementById("btn-logout");

    if (btnLogin) {
        btnLogin.addEventListener("click", async () => {
            const email = document.getElementById("login-email").value.trim();
            const pass = document.getElementById("login-pass").value;

            try {
                const res = await fetch(API_URL + "?action=login", {
                    method: 'POST',
                    body: JSON.stringify({email, password: pass})
                });
                const data = await res.json();

                if(data.success) {
                    currentUser = data.user;
                    localStorage.setItem("AZIER_SESSION", JSON.stringify(currentUser));
                    loguearExitosamenteApp();
                } else {
                    document.getElementById("login-error").innerText = data.error;
                    document.getElementById("login-error").style.display = "block";
                }
            } catch(e) { console.error(e); }
        });
    }

    if(btnLogout) {
        btnLogout.addEventListener("click", () => {
            localStorage.removeItem("AZIER_SESSION");
            window.location.reload();
        });
    }
}

function loguearExitosamenteApp() {
    document.getElementById("login-overlay").classList.remove("active");
    if(currentUser.role === 'superadmin' || currentUser.role === 'admin') {
        document.getElementById("nav-admin").style.display = "flex";
    }
    fetchData();
}

// =========================================================================
// 5. NAVEGACIÓN Y TABS
// =========================================================================
function configurarEventosNavegacion() {
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach(item => {
        item.addEventListener("click", function() {
            document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
            this.classList.add("active");

            const targetView = this.getAttribute("data-target");
            document.querySelectorAll(".view-section").forEach(sec => sec.classList.remove("active"));
            document.getElementById(targetView).classList.add("active");
            
            if(targetView === 'view-dashboard') renderizarEstadisticasYGraficos();
        });
    });

    const themeToggle = document.getElementById('theme-toggle');
    if(themeToggle) {
        themeToggle.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            if(current === 'dark') {
                document.documentElement.removeAttribute('data-theme');
                themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
                localStorage.setItem('AZIER_THEME', 'light');
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
                localStorage.setItem('AZIER_THEME', 'dark');
            }
            renderizarEstadisticasYGraficos();
        });
    }
    if(localStorage.getItem('AZIER_THEME') === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        if(themeToggle) themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }
}

function inicializarRelojMilitar() {
    setInterval(() => {
        const reloj = document.getElementById("real-time-clock");
        if (reloj) reloj.innerText = new Date().toTimeString().split(' ')[0];
    }, 1000);
}

// =========================================================================
// 6. RENDERIZADO BÁSICO (DASHBOARD)
// =========================================================================
function renderizarEstadisticasYGraficos() {
    const itC = globalOrders.filter(o => o.module==='it' && o.status!=='Completado').length;
    const mkC = globalOrders.filter(o => o.module==='mk' && o.status!=='Completado').length;
    const dgC = globalOrders.filter(o => o.module==='dg' && o.status!=='Completado').length;
    
    if(document.getElementById('dash-it-count')) document.getElementById('dash-it-count').innerText = itC + ' Activas';
    if(document.getElementById('dash-mk-count')) document.getElementById('dash-mk-count').innerText = mkC + ' Campañas';
    if(document.getElementById('dash-dg-count')) document.getElementById('dash-dg-count').innerText = dgC + ' Proyectos';

    let totalRev = 0;
    globalOrders.forEach(o => { if(o.status!=='Cotización') totalRev += parseFloat(o.advance || 0); });
    
    if(document.getElementById('dash-revenue')) document.getElementById('dash-revenue').innerText = 'Bs. ' + totalRev.toFixed(2);
    if(document.getElementById('dash-active')) document.getElementById('dash-active').innerText = itC+mkC+dgC;
    if(document.getElementById('dash-clients')) document.getElementById('dash-clients').innerText = globalClients.length;

    const ctx = document.getElementById('revenueChart');
    if(!ctx) return;
    
    if(chartInstance) chartInstance.destroy();
    
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    const textColor = isDark ? '#94a3b8' : '#475569';

    try {
        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['IT', 'Marketing', 'Diseño'],
                datasets: [{
                    data: [
                        globalOrders.filter(o=>o.module==='it').reduce((acc,o)=>acc+parseFloat(o.total||0),0),
                        globalOrders.filter(o=>o.module==='mk').reduce((acc,o)=>acc+parseFloat(o.total||0),0),
                        globalOrders.filter(o=>o.module==='dg').reduce((acc,o)=>acc+parseFloat(o.total||0),0)
                    ],
                    backgroundColor: ['#0ea5e9', '#ec4899', '#8b5cf6'],
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { grid: { color: gridColor }, ticks: { color: textColor } },
                    x: { grid: { display: false }, ticks: { color: textColor } }
                }
            }
        });
    } catch (e) {
        console.warn("Chart.js failed to load or initialize.", e);
    }
}

// =========================================================================
// 7. ORDENES & MODALES (La selección visual brutal)
// =========================================================================
window.abrirModalClienteSelect = () => {
    document.getElementById('modal-select-client').classList.add('active');
    poblarModalClientes('');
};

window.abrirModalInventorySelect = () => {
    document.getElementById('modal-select-inventory').classList.add('active');
    poblarModalInventario('');
};

document.getElementById('search-modal-client')?.addEventListener('input', (e) => poblarModalClientes(e.target.value));
document.getElementById('search-modal-inventory')?.addEventListener('input', (e) => poblarModalInventario(e.target.value));

function poblarModalClientes(query) {
    const list = document.getElementById('modal-client-list');
    if(!list) return;
    list.innerHTML = '';
    const filtered = globalClients.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));
    filtered.forEach(c => {
        list.innerHTML += `<div class="selection-item" onclick="seleccionarCliente('${c.name}', '${c.phone}')">
            <div class="selection-title">${c.name}</div>
            <div class="selection-meta"><i class="fa-brands fa-whatsapp"></i> ${c.phone || 'N/A'}</div>
        </div>`;
    });
}

function poblarModalInventario(query) {
    const list = document.getElementById('modal-inventory-list');
    if(!list) return;
    list.innerHTML = '';
    const filtered = globalInventory.filter(i => i.item_name.toLowerCase().includes(query.toLowerCase()));
    filtered.forEach(i => {
        list.innerHTML += `<div class="selection-item" onclick="agregarAlCarrito('${i.item_name}', ${i.price || 0})">
            <div>
                <div class="selection-title">${i.item_name}</div>
                <div class="selection-meta">Stock: ${i.stock_current}</div>
            </div>
            <div style="font-weight:800; color:var(--accent);">Bs. ${i.price || '0.00'}</div>
        </div>`;
    });
}

window.seleccionarCliente = (name, phone) => {
    document.getElementById('order-client').value = name;
    document.getElementById('order-phone').value = phone;
    document.getElementById('modal-select-client').classList.remove('active');
    showToast("Cliente seleccionado", "success");
};

window.agregarAlCarrito = (name, price) => {
    currentCart.push({ desc: name, price: price });
    document.getElementById('modal-select-inventory').classList.remove('active');
    renderCart();
    showToast("Ítem añadido a la orden", "success");
};

function renderCart() {
    const tbody = document.getElementById('cart-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    let subtotal = 0;
    currentCart.forEach((item, index) => {
        subtotal += parseFloat(item.price);
        tbody.innerHTML += `<tr>
            <td>${item.desc}</td>
            <td style="font-weight:700;">Bs. ${item.price}</td>
            <td><button class="btn-icon-del" onclick="removerDelCarrito(${index})"><i class="fa-solid fa-trash"></i></button></td>
        </tr>`;
    });
    
    if(document.getElementById('sum-subtotal')) document.getElementById('sum-subtotal').innerText = `Bs. ${subtotal.toFixed(2)}`;
    if(document.getElementById('sum-total')) document.getElementById('sum-total').innerText = `Bs. ${subtotal.toFixed(2)}`;
}

window.removerDelCarrito = (idx) => {
    currentCart.splice(idx, 1);
    renderCart();
};

document.getElementById('btn-save')?.addEventListener('click', async () => {
    const client = document.getElementById('order-client').value;
    const phone = document.getElementById('order-phone').value;
    const module = document.getElementById('order-module').value;
    const project = document.getElementById('order-project').value;
    
    if(!client || currentCart.length === 0) {
        return showToast("Falta cliente o ítems en la orden", "error");
    }
    
    let subtotal = currentCart.reduce((a,b)=>a+parseFloat(b.price),0);
    
    const payload = {
        module, client, phone, project, status: "Cotización",
        subtotal: subtotal, discount: 0, total: subtotal, advance: 0, balance: subtotal,
        notes: "", items: currentCart
    };
    
    const res = await fetch(API_URL + "?action=save_order", { method:'POST', body: JSON.stringify(payload) });
    const data = await res.json();
    if(data.success) {
        showToast("Orden procesada exitosamente", "success");
        currentCart = [];
        renderCart();
        document.getElementById('order-client').value = '';
        fetchData(); // Reload
    }
});

// =========================================================================
// 8. RENDER LISTS (CRM, INVENTORY, KANBAN)
// =========================================================================
function renderClients() {
    const grid = document.getElementById("clients-grid");
    if(!grid) return;
    grid.innerHTML = '';
    globalClients.forEach(c => {
        const safeName = c.name || 'Sin Nombre';
        const initial = safeName.charAt(0).toUpperCase();
        grid.innerHTML += `<div class="client-card contact-card card-glass">
            <div class="contact-header">
                <div class="contact-avatar">${initial}</div>
                <div class="contact-info">
                    <h3>${safeName}</h3>
                    <p><i class="fa-solid fa-phone"></i> ${c.phone || 'Sin número'}</p>
                </div>
            </div>
            <div class="contact-actions">
                <button class="btn-primary w-100" onclick="window.open('https://wa.me/591${c.phone || ''}')"><i class="fa-brands fa-whatsapp"></i> Chat</button>
                <button class="btn-outline btn-small" onclick="editarCliente(${c.id}, '${safeName}', '${c.phone}')" title="Editar"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-danger btn-small" onclick="eliminarCliente(${c.id})" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>`;
    });
}

function renderInventory() {
    const tbody = document.getElementById("inventory-list");
    if(!tbody) return;
    tbody.innerHTML = '';
    globalInventory.forEach(i => {
        tbody.innerHTML += `<tr>
            <td><strong>${i.item_name}</strong></td>
            <td><span class="badge ${i.stock_current <= i.stock_min ? 'bg-danger' : 'bg-success'}">${i.stock_current}</span></td>
            <td>Bs. ${i.price || '0.00'}</td>
            <td>
                <button class="btn-outline btn-small" onclick="editarInsumo(${i.id}, '${i.item_name}', ${i.stock_current}, ${i.price || 0})" style="padding: 5px 10px; margin-right: 5px;"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-danger btn-small" onclick="eliminarInsumo(${i.id})" style="padding: 5px 10px;"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`;
    });
}

function renderKanban() {
    const cols = ['Cotización', 'En Proceso', 'Pendiente de Pago', 'Completado'];
    cols.forEach(status => {
        const wrapper = document.getElementById(`kb-${status.replace(/ /g, '-')}`);
        if(!wrapper) return;
        wrapper.innerHTML = '';
        const items = globalOrders.filter(o => o.status === status);
        items.forEach(o => {
            wrapper.innerHTML += `<div class="order-card card-${o.module}">
                <div class="oc-header"><span class="oc-client">${o.client}</span></div>
                <div class="oc-desc">${o.project || 'Sin detalle'}</div>
                <div class="oc-footer" style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="oc-price">Bs. ${o.total}</span>
                    <div style="display:flex; gap:5px;">
                        <button class="btn-danger btn-small" onclick="eliminarOrden(${o.id})" style="padding: 5px 10px;" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                        ${status !== 'Completado' ? `<button class="btn-success btn-small" onclick="avanzarOrden(${o.id}, '${status}')" style="padding: 5px 10px;" title="Avanzar Estado"><i class="fa-solid fa-arrow-right"></i></button>` : ''}
                    </div>
                </div>
            </div>`;
        });
    });
}

// =========================================================================
// 9. FUNCIONES CRUD COMPLETAS (CRM, INVENTARIO, ORDENES, BRIEFS)
// =========================================================================

window.eliminarCliente = (id) => {
    if(!confirm("¿Estás seguro de eliminar este cliente permanentemente?")) return;
    fetch(API_URL + "?action=delete_client", { method: 'POST', body: JSON.stringify({id}) }).then(r=>r.json()).then(res => {
        if(res.success) { showToast("Cliente eliminado", "success"); fetchData(); }
    });
};

window.editarCliente = (id, oldName, oldPhone) => {
    const name = prompt("Nuevo nombre del cliente:", oldName);
    if(!name) return;
    const phone = prompt("Nuevo teléfono:", oldPhone);
    fetch(API_URL + "?action=edit_client", { method: 'POST', body: JSON.stringify({id, name, phone}) }).then(r=>r.json()).then(res => {
        if(res.success) { showToast("Cliente actualizado", "success"); fetchData(); }
    });
};

window.eliminarInsumo = (id) => {
    if(!confirm("¿Borrar este insumo del inventario?")) return;
    fetch(API_URL + "?action=delete_inventory", { method: 'POST', body: JSON.stringify({id}) }).then(r=>r.json()).then(res => {
        if(res.success) { showToast("Insumo eliminado", "success"); fetchData(); }
    });
};

window.editarInsumo = (id, oldName, oldStock, oldPrice) => {
    const item_name = prompt("Nombre del insumo:", oldName);
    if(!item_name) return;
    const stock_current = prompt("Stock actual:", oldStock);
    const price = prompt("Precio Base (Bs.):", oldPrice);
    fetch(API_URL + "?action=edit_inventory", { method: 'POST', body: JSON.stringify({id, item_name, stock_current: parseInt(stock_current||0), price: parseFloat(price||0)}) }).then(r=>r.json()).then(res => {
        if(res.success) { showToast("Insumo actualizado", "success"); fetchData(); }
    });
};

window.eliminarOrden = (id) => {
    if(!confirm("¿Eliminar esta orden del sistema? Esta acción no se puede deshacer.")) return;
    fetch(API_URL + "?action=delete_order", { method: 'POST', body: JSON.stringify({id}) }).then(r=>r.json()).then(res => {
        if(res.success) { showToast("Orden eliminada", "success"); fetchData(); }
    });
};

window.avanzarOrden = (id, currentStatus) => {
    const statuses = ['Cotización', 'En Proceso', 'Pendiente de Pago', 'Completado'];
    const nextIdx = statuses.indexOf(currentStatus) + 1;
    if(nextIdx >= statuses.length) return;
    const status = statuses[nextIdx];
    fetch(API_URL + "?action=update_order_status", { method: 'POST', body: JSON.stringify({id, status}) }).then(r=>r.json()).then(res => {
        if(res.success) { showToast("Orden avanzada a: " + status, "success"); fetchData(); }
    });
};
window.abrirModalClientCreate = () => {
    const name = prompt("Nombre completo del nuevo cliente:");
    if(!name) return;
    const phone = prompt("Teléfono (WhatsApp):");
    fetch(API_URL + "?action=add_client", {
        method: 'POST',
        body: JSON.stringify({ name, phone, notes: "" })
    }).then(r=>r.json()).then(data => {
        if(data.success) { showToast("Contacto guardado en el CRM", "success"); fetchData(); }
    });
};

window.abrirModalInventoryCreate = () => {
    const item_name = prompt("Nombre del Insumo / Servicio:");
    if(!item_name) return;
    const stock_current = prompt("Cantidad inicial en stock:", "1");
    fetch(API_URL + "?action=add_inventory", {
        method: 'POST',
        body: JSON.stringify({ item_name, category: "Gral", stock_current: parseInt(stock_current), stock_min: 5, price: 0 })
    }).then(r=>r.json()).then(data => {
        if(data.success) { showToast("Insumo añadido al almacén", "success"); fetchData(); }
    });
};

document.getElementById('btn-save-brief')?.addEventListener('click', async () => {
    const client = document.getElementById('brief-client').value;
    const project = document.getElementById('brief-project').value;
    const objective = document.getElementById('brief-objective').value;
    const deliverables = document.getElementById('brief-deliverables').value;
    
    if(!client || !project) return showToast("El cliente y el proyecto son requeridos", "error");
    
    const payload = { client, project, objective, deliverables };
    const res = await fetch(API_URL + "?action=save_brief", { method: 'POST', body: JSON.stringify(payload) });
    const data = await res.json();
    
    if(data.success) {
        showToast("Brief Creativo generado y guardado", "success");
        document.getElementById('brief-client').value = '';
        document.getElementById('brief-project').value = '';
        document.getElementById('brief-objective').value = '';
        document.getElementById('brief-deliverables').value = '';
        fetchData();
    }
});

function renderBriefs() {
    const grid = document.getElementById("briefs-grid");
    if(!grid) return;
    grid.innerHTML = '';
    globalBriefs.forEach(b => {
        grid.innerHTML += `<div class="contact-card card-glass" style="border-left: 4px solid var(--accent);">
            <div class="contact-info">
                <h3>${b.client} - ${b.project}</h3>
                <p style="margin-top: 8px;"><strong>Objetivo:</strong> ${b.objective}</p>
                <p><strong>Entregables:</strong> ${b.deliverables}</p>
            </div>
            <div class="contact-actions">
                <button class="btn-outline btn-small w-100"><i class="fa-solid fa-file-pdf"></i> PDF</button>
            </div>
        </div>`;
    });
}

// Sobrescribir updateUI para asegurar renderBriefs y selectores de reportes
const oldUpdateUI = updateUI;
updateUI = () => {
    oldUpdateUI();
    renderBriefs();
    poblarSelectorReportes();
};

function poblarSelectorReportes() {
    const select = document.getElementById('report-order-select');
    if(!select) return;
    select.innerHTML = '<option value="">Seleccione una orden...</option>';
    globalOrders.forEach(o => {
        select.innerHTML += `<option value="${o.id}">${o.client} - ${o.project} (Bs. ${o.total})</option>`;
    });
}

window.generarReporteUniversally = () => {
    const orderId = document.getElementById('report-order-select').value;
    const type = document.getElementById('report-type-select').value;
    
    if(!orderId) return showToast("Por favor selecciona una orden", "error");
    
    const order = globalOrders.find(o => o.id == orderId);
    if(!order) return;
    
    const printArea = document.getElementById('print-content');
    
    let title = "Cotización de Servicios";
    let subtitle = "Válido por 15 días";
    if(type === 'recibo') { title = "Recibo de Pago"; subtitle = "Comprobante oficial de transacción"; }
    else if(type === 'progreso') { title = "Reporte de Avance"; subtitle = "Estado actual del proyecto"; }
    
    const today = new Date().toLocaleDateString('es-ES');
    let itemsHtml = '';
    
    try {
        const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
        if(items && items.length) {
            items.forEach(it => {
                itemsHtml += `<tr><td>${it.desc}</td><td>1</td><td>Bs. ${it.price}</td><td>Bs. ${it.price}</td></tr>`;
            });
        } else {
            itemsHtml = `<tr><td colspan="4">Servicio General: ${order.project}</td></tr>`;
        }
    } catch(e) { itemsHtml = `<tr><td colspan="4">Servicio General: ${order.project}</td></tr>`; }

    printArea.innerHTML = `
        <div class="print-header">
            <div class="print-brand">
                <h1>AZIER SUITE</h1>
                <p>Gestión y Desarrollo Empresarial<br>Tel: +591 77173169<br>admin@aziervillanueva.com</p>
            </div>
            <div class="print-title">
                <h2>${title}</h2>
                <p>Doc. Ref: #${order.id.toString().padStart(6, '0')}<br>Fecha: ${today}</p>
            </div>
        </div>
        
        <div class="print-meta-grid">
            <div class="print-meta-box">
                <h4>Datos del Cliente</h4>
                <p>${order.client}</p>
                <p style="color:#64748b; font-size:0.9rem; font-weight:400;">Tel: ${order.phone || 'No registrado'}</p>
            </div>
            <div class="print-meta-box">
                <h4>Información del Proyecto</h4>
                <p>${order.project}</p>
                <p style="color:#64748b; font-size:0.9rem; font-weight:400;">Módulo: ${order.module.toUpperCase()} | Estado: ${order.status}</p>
            </div>
        </div>
        
        <table class="print-table">
            <thead>
                <tr><th>Descripción</th><th>Cant.</th><th>P. Unitario</th><th>Total</th></tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
        </table>
        
        <div class="print-summary">
            <div class="print-summary-row"><span>Subtotal:</span><span>Bs. ${order.subtotal || order.total}</span></div>
            <div class="print-summary-row"><span>Descuento:</span><span>Bs. ${order.discount || '0.00'}</span></div>
            <div class="print-summary-row total"><span>TOTAL NETO:</span><span>Bs. ${order.total}</span></div>
        </div>
        
        <div class="print-footer">
            <p>Gracias por confiar en Azier Suite. ${subtitle}.<br>Generado automáticamente desde la plataforma operativa.</p>
        </div>
    `;
    
    // Trigger Print
    setTimeout(() => { window.print(); }, 500);
};