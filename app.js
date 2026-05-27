// --- SISTEMA DE ALMACENAMIENTO (LocalStorage) ---
const db = {
    clients: JSON.parse(localStorage.getItem('azier_clients')) || [],
    inventory: JSON.parse(localStorage.getItem('azier_inventory')) || [
        { id: '1', code: 'IT-001', name: 'Cable de Red Cat6 (m)', stock: 500, min: 100, price: 5 },
        { id: '2', code: 'MK-001', name: 'Impresión Banner (m2)', stock: 50, min: 10, price: 45 }
    ],
    orders: JSON.parse(localStorage.getItem('azier_orders')) || [],
    cart: []
};

const saveData = (key) => localStorage.setItem(`azier_${key}`, JSON.stringify(db[key]));

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    initClock();
    setupNavigation();
    setupAuth();
    renderAllViews();
    initCharts();
});

// --- NAVEGACIÓN Y TEMA ---
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const targetId = item.getAttribute('data-target');
            if (!targetId) return;
            
            // UI Activa
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            
            // Cambiar Vista
            document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');
            
            // Refrescar gráficos si entra al Dashboard
            if (targetId === 'view-dashboard') updateCharts();
        });
    });

    document.getElementById('theme-toggle').addEventListener('click', () => {
        const body = document.body;
        const isDark = body.getAttribute('data-theme') === 'dark';
        body.setAttribute('data-theme', isDark ? 'light' : 'dark');
    });
}

function initClock() {
    setInterval(() => {
        const now = new Date();
        document.getElementById('real-time-clock').innerText = now.toLocaleTimeString('es-BO');
        document.getElementById('current-date').innerText = now.toLocaleDateString('es-BO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }, 1000);
}

// --- AUTENTICACIÓN BÁSICA ---
function setupAuth() {
    const overlay = document.getElementById('login-overlay');
    document.getElementById('btn-login').addEventListener('click', () => {
        // Simulación nivel Dios: Ignora credenciales para la demo, entra directo
        overlay.classList.remove('active');
        showToast('¡Bienvenido a AZIER Suite!', 'success');
    });
    document.getElementById('go-to-register').addEventListener('click', () => {
        document.getElementById('box-login').style.display = 'none';
        document.getElementById('box-register').style.display = 'block';
    });
    document.getElementById('go-to-login').addEventListener('click', () => {
        document.getElementById('box-register').style.display = 'none';
        document.getElementById('box-login').style.display = 'block';
    });
}

// --- RENDERIZADO GLOBAL ---
function renderAllViews() {
    renderCRM();
    renderInventory();
    setupCartLogic();
    renderKanban();
    updateDashboardStats();
}

// --- CRM (CLIENTES) ---
function renderCRM() {
    const grid = document.getElementById('clients-grid');
    const datalist = document.getElementById('clients-datalist');
    grid.innerHTML = '';
    datalist.innerHTML = '';

    if (db.clients.length === 0) {
        grid.innerHTML = '<p class="text-muted">No hay clientes registrados. Crea uno nuevo.</p>';
        return;
    }

    db.clients.forEach(c => {
        grid.innerHTML += `
            <div class="card-glass" style="padding: 15px;">
                <h4 style="margin-bottom: 5px;"><i class="fa-solid fa-building" style="color:var(--accent)"></i> ${c.name}</h4>
                <p class="text-muted"><i class="fa-solid fa-phone"></i> ${c.phone}</p>
            </div>
        `;
        datalist.innerHTML += `<option value="${c.name}">${c.phone}</option>`;
    });
}

window.openClientModal = function() {
    const name = prompt("Nombre del Cliente/Empresa:");
    const phone = prompt("Teléfono (WhatsApp):");
    if (name && phone) {
        db.clients.push({ id: Date.now().toString(), name, phone });
        saveData('clients');
        renderCRM();
        showToast('Cliente guardado con éxito', 'success');
    }
};

// --- INVENTARIO ---
function renderInventory() {
    const tbody = document.getElementById('inventory-list');
    tbody.innerHTML = '';

    db.inventory.forEach(i => {
        const isLow = i.stock <= i.min;
        tbody.innerHTML += `
            <tr>
                <td><strong>${i.code}</strong></td>
                <td>${i.name}</td>
                <td class="${isLow ? 'text-danger' : 'text-success'}"><strong>${i.stock}</strong></td>
                <td>${i.min}</td>
                <td><span class="badge" style="background:${isLow ? 'var(--danger)' : 'var(--success)'}; padding: 4px 8px; border-radius: 4px; color: white;">${isLow ? 'Bajo' : 'Óptimo'}</span></td>
                <td><button class="btn-oc" onclick="deleteInventory('${i.id}')"><i class="fa-solid fa-trash"></i></button></td>
            </tr>
        `;
    });
}

window.openInventoryModal = function() {
    const name = prompt("Nombre del Material:");
    const stock = prompt("Stock Actual:");
    const min = prompt("Stock Mínimo de alerta:");
    if (name && stock) {
        db.inventory.push({ 
            id: Date.now().toString(), 
            code: 'M-' + Math.floor(Math.random() * 1000), 
            name, 
            stock: parseInt(stock), 
            min: parseInt(min),
            price: 0
        });
        saveData('inventory');
        renderInventory();
        showToast('Material agregado', 'success');
    }
};

window.deleteInventory = function(id) {
    db.inventory = db.inventory.filter(i => i.id !== id);
    saveData('inventory');
    renderInventory();
};

// --- LÓGICA DE COTIZACIÓN (NEW ORDER) ---
function setupCartLogic() {
    document.getElementById('btn-add-row').addEventListener('click', () => {
        db.cart.push({ desc: 'Nuevo Ítem', qty: 1, price: 0 });
        renderCart();
    });

    document.getElementById('order-discount').addEventListener('input', calculateTotals);
    document.getElementById('order-advance').addEventListener('input', calculateTotals);

    document.getElementById('btn-save').addEventListener('click', saveOrder);
}

function renderCart() {
    const tbody = document.getElementById('cart-body');
    tbody.innerHTML = '';
    
    db.cart.forEach((item, index) => {
        tbody.innerHTML += `
            <tr>
                <td><input type="text" value="${item.desc}" onchange="updateCart(${index}, 'desc', this.value)"></td>
                <td><input type="number" value="${item.qty}" min="1" onchange="updateCart(${index}, 'qty', this.value)"></td>
                <td><input type="number" value="${item.price}" min="0" step="0.1" onchange="updateCart(${index}, 'price', this.value)"></td>
                <td><button class="btn-icon-del" onclick="removeFromCart(${index})"><i class="fa-solid fa-xmark"></i></button></td>
            </tr>
        `;
    });
    calculateTotals();
}

window.updateCart = function(index, field, value) {
    db.cart[index][field] = field === 'desc' ? value : parseFloat(value) || 0;
    calculateTotals();
}

window.removeFromCart = function(index) {
    db.cart.splice(index, 1);
    renderCart();
}

function calculateTotals() {
    let subtotal = db.cart.reduce((sum, item) => sum + (item.qty * item.price), 0);
    let discount = parseFloat(document.getElementById('order-discount').value) || 0;
    let total = subtotal - discount;
    let advance = parseFloat(document.getElementById('order-advance').value) || 0;
    let balance = total - advance;

    document.getElementById('sum-subtotal').innerText = `Bs. ${subtotal.toFixed(2)}`;
    document.getElementById('sum-total').innerText = `Bs. ${total.toFixed(2)}`;
    document.getElementById('sum-balance').innerText = `Bs. ${balance.toFixed(2)}`;
}

function saveOrder() {
    const client = document.getElementById('order-client').value;
    if (!client || db.cart.length === 0) {
        showToast('Falta cliente o ítems en la cotización', 'warning');
        return;
    }

    const order = {
        id: Math.floor(Math.random() * 10000).toString(),
        client: client,
        phone: document.getElementById('order-phone').value,
        project: document.getElementById('order-project').value,
        status: document.getElementById('order-status').value,
        total: parseFloat(document.getElementById('sum-total').innerText.replace('Bs. ', '')),
        date: new Date().toLocaleDateString('es-BO')
    };

    db.orders.push(order);
    saveData('orders');
    
    // Limpiar formulario
    db.cart = [];
    document.getElementById('order-client').value = '';
    document.getElementById('order-project').value = '';
    renderCart();
    renderKanban();
    updateDashboardStats();
    
    showToast('Orden Guardada Exitosamente', 'success');
    document.querySelector('[data-target="view-orders"]').click();
}

// --- KANBAN Y ÓRDENES ---
function renderKanban() {
    const columns = { 'Cotización': '', 'En Proceso': '', 'Pendiente de Pago': '', 'Completado': '' };
    const counts = { 'Cotización': 0, 'En Proceso': 0, 'Pendiente de Pago': 0, 'Completado': 0 };

    db.orders.forEach(o => {
        let status = o.status.replace(/ /g, '-');
        if(!columns[o.status]) return;

        counts[o.status]++;
        columns[o.status] += `
            <div class="order-card oc-status-${status}">
                <div class="oc-header">
                    <div class="oc-client">${o.client} <br><span class="oc-date">#${o.id} - ${o.date}</span></div>
                </div>
                <div class="oc-desc">${o.project || 'Sin descripción'}</div>
                <div class="oc-footer">
                    <div class="oc-price">Bs. ${o.total.toFixed(2)}</div>
                    <div class="oc-actions">
                        <button class="btn-oc" onclick="deleteOrder('${o.id}')"><i class="fa-solid fa-trash text-danger"></i></button>
                    </div>
                </div>
            </div>
        `;
    });

    Object.keys(columns).forEach(key => {
        let safeKey = key.replace(/ /g, '-');
        let container = document.getElementById(`kb-${safeKey}`);
        let badge = document.getElementById(`kb-count-${safeKey.substring(0,4).toLowerCase()}`);
        if(container) container.innerHTML = columns[key] || '<p class="text-muted text-center" style="font-size:0.8rem">Sin órdenes</p>';
        if(badge) badge.innerText = counts[key];
    });
}

window.deleteOrder = function(id) {
    if(confirm('¿Eliminar orden?')) {
        db.orders = db.orders.filter(o => o.id !== id);
        saveData('orders');
        renderKanban();
        updateDashboardStats();
    }
}

// --- GRÁFICOS Y DASHBOARD (Nivel Dios) ---
let revChart, invChart;

function initCharts() {
    const ctxRev = document.getElementById('revenueChart').getContext('2d');
    revChart = new Chart(ctxRev, {
        type: 'line',
        data: {
            labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
            datasets: [{
                label: 'Ingresos (Bs)',
                data: [1200, 1900, 800, 2500, 3200, 1500, 900],
                borderColor: '#4f46e5',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    const ctxInv = document.getElementById('inventoryChart').getContext('2d');
    invChart = new Chart(ctxInv, {
        type: 'doughnut',
        data: {
            labels: ['Soporte IT', 'Marketing', 'Diseño'],
            datasets: [{
                data: [45, 25, 30],
                backgroundColor: ['#0ea5e9', '#ec4899', '#8b5cf6'],
                borderWidth: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '75%' }
    });
}

function updateDashboardStats() {
    const totalRevenue = db.orders.reduce((sum, o) => sum + o.total, 0);
    document.getElementById('dash-revenue').innerText = `Bs. ${totalRevenue.toFixed(2)}`;
    document.getElementById('dash-active').innerText = db.orders.length;
    document.getElementById('dash-clients').innerText = db.clients.length;
}

function updateCharts() {
    // Aquí puedes agregar lógica para actualizar los gráficos con db.orders reales
    if(revChart) revChart.update();
    if(invChart) invChart.update();
}

// --- UTILIDADES (Toast Notifications) ---
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 10000;
        background: ${type === 'success' ? 'var(--success)' : type === 'warning' ? 'var(--warning)' : 'var(--accent)'};
        color: white; padding: 15px 25px; border-radius: 8px; font-weight: 600;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2); animation: slideInRight 0.3s ease forwards;
    `;
    toast.innerHTML = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Keyframes generados dinámicamente para los Toasts
const style = document.createElement('style');
style.innerHTML = `
    @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideOutRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
`;
document.head.appendChild(style);
