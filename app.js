const API_URL = 'http://localhost/aziel_ordenes/api.php';

// Real Time Clock
function updateClock() {
    const clockEl = document.getElementById('real-time-clock');
    if(clockEl) {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString('es-ES', { hour12: false });
    }
}
setInterval(updateClock, 1000);
updateClock();

// Modules & Presets Definition
function getOrderCode(order) {
    if (order.id === 'TMP') {
        const nextId = globalOrders.length > 0 ? Math.max(...globalOrders.map(o => parseInt(o.id) || 0)) + 1 : 1;
        return `${order.module.toUpperCase()}-${new Date().getFullYear()}-${nextId.toString().padStart(4, '0')}`;
    }
    return `${order.module.toUpperCase()}-${new Date(order.created_at).getFullYear()}-${order.id.toString().padStart(4, '0')}`;
}

const MODULES = {
    it: {
        name: "Soporte IT y Redes",
        presets: [
            { id: "p1", name: "Mantenimiento PC", price: 80 },
            { id: "p2", name: "Formateo + Windows", price: 100 },
            { id: "p3", name: "Instalación de Red", price: 150 },
            { id: "p4", name: "Revisión Técnica", price: 50 }
        ]
    },
    mk: {
        name: "Marketing Digital",
        presets: [
            { id: "p5", name: "Manejo RRSS (Mensual)", price: 800 },
            { id: "p6", name: "Campaña Meta Ads", price: 350 },
            { id: "p7", name: "Estrategia Digital", price: 500 }
        ]
    },
    dg: {
        name: "Diseño Gráfico y Marca",
        presets: [
            { id: "p8", name: "Diseño de Logotipo", price: 250 },
            { id: "p9", name: "Identidad Visual (Branding)", price: 600 },
            { id: "p10", name: "Manual de Marca", price: 400 },
            { id: "p11", name: "Diseño de Post (Unidad)", price: 50 }
        ]
    }
};

let currentModule = 'it'; // Default
let globalOrders = [];
let globalClients = [];
let globalInventory = [];
let globalTasks = [];
let globalUsers = [];
let myUser = { email: '', role: 'empleado' };
let revenueChartInstance = null;

// DOM Elements
const els = {
    navItems: document.querySelectorAll('.nav-item'),
    views: document.querySelectorAll('.view-section'),
    themeToggle: document.getElementById('theme-toggle'),
    dateDisplay: document.getElementById('current-date'),
    
    modBtns: document.querySelectorAll('.mod-btn'),
    presetsContainer: document.getElementById('presets-container'),
    cartBody: document.getElementById('cart-body'),
    btnAddRow: document.getElementById('btn-add-row'),
    
    subtotal: document.getElementById('sum-subtotal'),
    discount: document.getElementById('order-discount'),
    total: document.getElementById('sum-total'),
    advance: document.getElementById('order-advance'),
    balance: document.getElementById('sum-balance'),
    
    client: document.getElementById('order-client'),
    phone: document.getElementById('order-phone'),
    project: document.getElementById('order-project'),
    notes: document.getElementById('order-notes'),
    status: document.getElementById('order-status'),
    
    btnSave: document.getElementById('btn-save'),
    btnWa: document.getElementById('btn-wa'),
    btnPrint: document.getElementById('btn-print'),
    
    activityList: document.getElementById('activity-list'),
    ordersList: document.getElementById('orders-list'),
    clientsGrid: document.getElementById('clients-grid'),
    searchOrder: document.getElementById('search-order'),
    filterModule: document.getElementById('filter-module')
};

els.dateDisplay.textContent = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

let isDark = localStorage.getItem('aziel_pro_theme') === 'dark';
if(isDark) document.documentElement.setAttribute('data-theme', 'dark');
els.themeToggle.addEventListener('click', () => {
    isDark = !isDark;
    if(isDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('aziel_pro_theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('aziel_pro_theme', 'light');
    }
});

els.navItems.forEach(item => {
    item.addEventListener('click', () => {
        const target = item.getAttribute('data-target');
        document.querySelectorAll(`.nav-item[data-target="${target}"]`).forEach(n => {
            document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
            n.classList.add('active');
        });
        
        els.views.forEach(v => v.classList.remove('active'));
        document.getElementById(target).classList.add('active');
        fetchData();
    });
});

els.modBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        els.modBtns.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        currentModule = e.currentTarget.dataset.mod;
        
        document.getElementById('label-project-device').textContent = currentModule === 'it' ? 'Equipo / Dispositivo' : 'Detalle del Proyecto';
        
        loadPresets(currentModule);
        els.cartBody.innerHTML = '';
        addCartRow();
    });
});

function loadPresets(mod) {
    els.presetsContainer.innerHTML = '';
    MODULES[mod].presets.forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'preset-chip';
        btn.textContent = p.name;
        btn.onclick = () => addCartRow(p.name, 1, p.price);
        els.presetsContainer.appendChild(btn);
    });
}

function addCartRow(desc = '', qty = 1, price = 0) {
    const tr = document.createElement('tr');
    tr.className = 'cart-row';
    tr.innerHTML = `
        <td><input type="text" class="cart-desc" list="inventory-datalist" placeholder="Detalle..." value="${desc}"></td>
        <td><input type="number" class="cart-qty" min="1" step="1" value="${qty}"></td>
        <td><input type="number" class="cart-price" min="0" step="0.5" value="${price}"></td>
        <td><button class="btn-icon-del"><i class="fa-solid fa-xmark"></i></button></td>
    `;
    
    tr.querySelectorAll('input').forEach(i => i.addEventListener('input', calculateFinancials));
    tr.querySelector('.btn-icon-del').addEventListener('click', () => { tr.remove(); calculateFinancials(); });
    
    els.cartBody.appendChild(tr);
    calculateFinancials();
}
els.btnAddRow.addEventListener('click', () => addCartRow());

function calculateFinancials() {
    let sub = 0;
    document.querySelectorAll('.cart-row').forEach(r => {
        const q = parseFloat(r.querySelector('.cart-qty').value) || 0;
        const p = parseFloat(r.querySelector('.cart-price').value) || 0;
        sub += (q * p);
    });
    
    els.subtotal.textContent = `Bs. ${sub.toFixed(2)}`;
    const disc = parseFloat(els.discount.value) || 0;
    const total = sub - disc;
    els.total.textContent = `Bs. ${total.toFixed(2)}`;
    
    const adv = parseFloat(els.advance.value) || 0;
    els.balance.textContent = `Bs. ${(total - adv).toFixed(2)}`;
}

els.discount.addEventListener('input', calculateFinancials);
els.advance.addEventListener('input', calculateFinancials);

els.client.addEventListener('input', () => {
    const val = els.client.value;
    const match = globalClients.find(c => c.name === val);
    if (match && match.phone) {
        els.phone.value = match.phone;
    }
});

els.btnSave.addEventListener('click', async () => {
    if(!els.client.value.trim()) return alert("Debe ingresar un cliente.");
    
    const items = [];
    document.querySelectorAll('.cart-row').forEach(r => {
        const desc = r.querySelector('.cart-desc').value;
        if(desc) {
            items.push({
                desc,
                qty: parseFloat(r.querySelector('.cart-qty').value) || 0,
                price: parseFloat(r.querySelector('.cart-price').value) || 0
            });
        }
    });
    
    if(items.length === 0) return alert("Agregue al menos un ítem.");
    
    const total = parseFloat(els.total.textContent.replace('Bs. ', ''));
    
    // Auto-format Client Name to Title Case (Intercalado)
    let formattedClient = els.client.value.toLowerCase().replace(/\b\w/g, s => s.toUpperCase());
    
    const newOrder = {
        module: currentModule,
        client: formattedClient,
        phone: els.phone.value,
        project: els.project.value,
        notes: els.notes.value,
        status: els.status.value,
        items,
        subtotal: parseFloat(els.subtotal.textContent.replace('Bs. ', '')),
        discount: parseFloat(els.discount.value) || 0,
        total,
        advance: parseFloat(els.advance.value) || 0,
        balance: parseFloat(els.balance.textContent.replace('Bs. ', ''))
    };
    
    try {
        const res = await fetch(`${API_URL}?action=save_order`, {
            method: 'POST',
            body: JSON.stringify(newOrder),
            headers: {'Content-Type': 'application/json'}
        });
        const data = await res.json();
        
        if(data.success) {
            const nextId = data.order_id;
            const tempCode = `${currentModule.toUpperCase()}-${new Date().getFullYear()}-${nextId.toString().padStart(4, '0')}`;
            alert(`¡Orden ${tempCode} guardada exitosamente! Recuerda que para subir el PDF al Drive automáticamente necesitas configurar las credenciales de la API de Google en el servidor.`);
            els.client.value = ''; els.phone.value = ''; els.project.value = ''; els.notes.value = '';
            els.cartBody.innerHTML = ''; els.advance.value = 0; els.discount.value = 0;
            addCartRow();
            fetchData();
        } else {
            alert("Error: Asegúrate de haber ejecutado setup_db.php en tu navegador primero.");
        }
    } catch(e) {
        alert("Error de conexión a la base de datos.");
    }
});

async function fetchData() {
    try {
        const res = await fetch(`${API_URL}?action=get_data`);
        const data = await res.json();
        if(data.error) return console.warn(data.error);
        
        globalOrders = data.orders || [];
        globalClients = data.clients || [];
        globalInventory = data.inventory || [];
        globalTasks = data.tasks || [];
        globalUsers = data.users || [];
        
        // If electron, we didn't set myUser yet.
        if (isElectron && myUser.email === '') {
            myUser = { email: 'admin-local', role: 'superadmin' };
            document.getElementById('nav-admin').style.display = 'flex';
        }

        updateUI();
        loadSocialSettings(); // Load social settings after UI updates
    } catch(e) {
        console.warn("Using offline mode (No DB found).");
    }
}

function updateUI() {
    let itCount = 0, mkCount = 0, dgCount = 0, active = 0, rev = 0;
    const m = new Date().getMonth();
    
    globalOrders.forEach(o => {
        if(o.module === 'it') itCount++;
        if(o.module === 'mk') mkCount++;
        if(o.module === 'dg') dgCount++;
        
        if(o.status !== 'Completado') active++;
        if(new Date(o.created_at).getMonth() === m && o.status === 'Completado') rev += parseFloat(o.total);
    });
    
    document.getElementById('dash-it-count').textContent = `${itCount} Órdenes`;
    document.getElementById('dash-mk-count').textContent = `${mkCount} Proyectos`;
    document.getElementById('dash-dg-count').textContent = `${dgCount} Proyectos`;
    document.getElementById('dash-active').textContent = active;
    document.getElementById('dash-clients').textContent = globalClients.length;
    document.getElementById('dash-revenue').textContent = `Bs. ${rev.toFixed(2)}`;

    // Populate Datalists for Autocomplete
    const cd = document.getElementById('clients-datalist');
    if(cd) {
        cd.innerHTML = '';
        globalClients.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.name;
            cd.appendChild(opt);
        });
    }
    
    const ind = document.getElementById('inventory-datalist');
    if(ind) {
        ind.innerHTML = '';
        globalInventory.forEach(i => {
            const opt = document.createElement('option');
            opt.value = i.item_name || i.name;
            ind.appendChild(opt);
        });
    }
    
    // Build Chart
    const ctx = document.getElementById('revenueChart');
    if(ctx) {
        if(revenueChartInstance) revenueChartInstance.destroy();
        const mNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        let monthlyData = [0,0,0,0,0,0,0,0,0,0,0,0];
        globalOrders.forEach(o => {
            if(o.status === 'Completado') {
                let d = new Date(o.created_at);
                monthlyData[d.getMonth()] += parseFloat(o.total);
            }
        });
        
        revenueChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: mNames.slice(m-3 >= 0 ? m-3 : 0, m+1),
                datasets: [{
                    label: 'Ingresos Bs.',
                    data: monthlyData.slice(m-3 >= 0 ? m-3 : 0, m+1),
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.2)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // Tasks Widget
    const tl = document.getElementById('dash-task-list');
    if(tl) {
        tl.innerHTML = '';
        globalTasks.slice(0, 3).forEach(t => {
            tl.innerHTML += `<li class="task-item">
                <span class="task-title">${t.title}</span>
                <span class="badge ${t.status === 'pending' ? 'b-mk' : 'b-it'}">${t.status}</span>
            </li>`;
        });
        if(globalTasks.length === 0) tl.innerHTML = '<li class="task-item">No hay tareas pendientes</li>';
    }

    // Inventory Tasks
    const invTl = document.getElementById('inv-task-list');
    if(invTl) {
        invTl.innerHTML = '';
        const toBuy = globalInventory.filter(i => i.stock_current <= i.stock_min);
        if(toBuy.length > 0) {
            toBuy.slice(0, 4).forEach(item => {
                invTl.innerHTML += `<li class="task-item">
                    <span class="task-title"><i class="fa-solid fa-triangle-exclamation" style="color:var(--danger); margin-right:5px;"></i> Comprar: ${item.item_name || item.name}</span>
                    <span class="badge b-mk">Urgente</span>
                </li>`;
            });
        } else {
            invTl.innerHTML = '<li class="task-item"><span style="color:var(--success)"><i class="fa-solid fa-check-circle"></i> Todo en orden</span></li>';
        }
    }

    // Admin View - PRO GOD LEVEL
    const usersTable = document.getElementById('users-list');
    if(usersTable && myUser.role === 'superadmin') {
        // Update stats
        const sUsers = document.getElementById('admin-active-users');
        const sOrders = document.getElementById('admin-total-orders');
        const sCrm = document.getElementById('admin-total-crm');
        
        if(sUsers) sUsers.textContent = globalUsers.filter(u => u.status === 'approved').length;
        if(sOrders) sOrders.textContent = globalOrders.length;
        if(sCrm) sCrm.textContent = globalClients.length;

        usersTable.innerHTML = '';
        globalUsers.forEach(u => {
            let statusBadge = u.status === 'pending' ? 'b-mk' : 'b-it';
            let roleColor = u.role === 'superadmin' ? 'color:var(--accent)' : 'color:var(--text-secondary)';
            
            let btnApprove = u.status === 'pending' ? `<button class="btn-icon" title="Aprobar Usuario" style="padding:6px; background:var(--success); color:white; border-radius:6px;" onclick="approveUser(${u.id})"><i class="fa-solid fa-check"></i></button>` : '';
            let btnRole = `<button class="btn-icon" title="Cambiar Rol" style="padding:6px; background:var(--bg-app); border:1px solid var(--border); color:var(--text-primary); border-radius:6px;" onclick="changeRole(${u.id}, '${u.role === 'superadmin' ? 'empleado' : 'superadmin'}')"><i class="fa-solid fa-user-shield"></i></button>`;
            let btnDelete = `<button class="btn-icon" title="Eliminar Usuario" style="padding:6px; background:rgba(239,68,68,0.1); color:var(--danger); border-radius:6px; border:1px solid transparent;" onclick="deleteUser(${u.id})"><i class="fa-solid fa-trash"></i></button>`;

            usersTable.innerHTML += `<tr>
                <td style="color:var(--text-secondary); font-size:0.85rem;"><strong>USR-${u.id.toString().padStart(3, '0')}</strong></td>
                <td><strong>${u.email}</strong></td>
                <td style="${roleColor}; font-weight:700; text-transform:capitalize;"><i class="fa-solid ${u.role==='superadmin'?'fa-crown':'fa-user'}"></i> ${u.role}</td>
                <td><span class="badge ${statusBadge}">${u.status === 'pending' ? 'Pendiente' : 'Activo'}</span></td>
                <td>
                    <div style="display:flex; gap:6px;">
                        ${btnApprove}
                        ${btnRole}
                        ${btnDelete}
                    </div>
                </td>
            </tr>`;
        });
    }

    els.activityList.innerHTML = '';
    globalOrders.slice(0, 4).forEach(o => {
        const li = document.createElement('li');
        li.style = "padding: 10px 0; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between;";
        li.innerHTML = `
            <div>
                <strong>${getOrderCode(o)} - ${o.client}</strong>
                <div style="font-size: 0.8rem; color: var(--text-secondary)">${o.project}</div>
            </div>
            <span class="badge b-${o.module}">${o.status}</span>
        `;
        els.activityList.appendChild(li);
    });
    
    renderOrders();
    renderClients();
    renderInventory();
}

window.renderInventory = () => {
    const s = document.getElementById('search-inventory');
    const q = s ? s.value.toLowerCase() : '';
    
    const invTable = document.getElementById('inventory-list');
    if(!invTable) return;
    
    invTable.innerHTML = '';
    let okCount = 0;
    let alertCount = 0;

    globalInventory.forEach((i, idx) => {
        if(q && !(i.item_name || i.name || '').toLowerCase().includes(q)) return;
        
        let status = 'Suficiente'; 
        let badgeClass = 'b-it';
        if(i.stock_current <= i.stock_min) { 
            status = 'Comprar Urgente'; 
            badgeClass = 'b-mk'; 
            alertCount++;
        } else {
            okCount++;
        }
        
        const code = 'MAT-' + (i.id || (idx + 1)).toString().padStart(4, '0');

        invTable.innerHTML += `<tr>
            <td style="color:var(--text-secondary); font-size:0.8rem;"><strong>${code}</strong></td>
            <td><strong>${i.item_name || i.name}</strong></td>
            <td><span style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary);">${i.stock_current}</span> un.</td>
            <td>${i.stock_min}</td>
            <td><span class="badge ${badgeClass}">${status}</span></td>
            <td>
                <button class="btn-icon" style="padding: 6px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-card); cursor: pointer; color: var(--accent); transition: all 0.2s;" onclick="alert('Editar material')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-icon" style="padding: 6px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-card); cursor: pointer; color: var(--success); transition: all 0.2s;" onclick="alert('Añadir stock')"><i class="fa-solid fa-plus"></i></button>
            </td>
        </tr>`;
    });

    // Update Inventory Chart if empty search to reflect totals, or based on filtered. 
    // Usually chart reflects all inventory regardless of search to not be confusing, so we use global.
    const invCtx = document.getElementById('inventoryChart');
    if(invCtx && !q) {
        if(window.inventoryChartInstance) window.inventoryChartInstance.destroy();
        window.inventoryChartInstance = new Chart(invCtx, {
            type: 'doughnut',
            data: {
                labels: ['Stock Suficiente', 'Requiere Compra'],
                datasets: [{
                    data: [okCount, alertCount],
                    backgroundColor: ['#10b981', '#ef4444'],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { color: isDark ? '#94a3b8' : '#64748b' } } },
                cutout: '75%'
            }
        });
    }
};

const searchInvInput = document.getElementById('search-inventory');
if(searchInvInput) {
    searchInvInput.addEventListener('input', window.renderInventory);
}

window.renderClients = () => {
    const s = document.getElementById('search-client');
    const q = s ? s.value.toLowerCase() : '';
    
    els.clientsGrid.innerHTML = '';
    globalClients.forEach(c => {
        if(q && !c.name.toLowerCase().includes(q) && !(c.phone||'').includes(q)) return;
        
        let wpBtn = c.phone ? `<button class="btn-oc" onclick="window.open('https://wa.me/591${c.phone.replace(/[^0-9]/g, '')}', '_blank')" style="color:#25D366; border-color:#25D366"><i class="fa-brands fa-whatsapp"></i></button>` : '';
        
        els.clientsGrid.innerHTML += `
            <div class="list-card" style="border-left: 4px solid var(--accent)">
                <div class="flex-between">
                    <h4 style="font-size:1.1rem;font-weight:800;">${c.name}</h4>
                    <div class="oc-actions">${wpBtn}</div>
                </div>
                <p style="color:var(--text-secondary); margin-top:5px;"><i class="fa-solid fa-phone"></i> ${c.phone || 'S/N'}</p>
                <p style="color:var(--text-secondary); margin-top:5px;"><i class="fa-solid fa-tag"></i> ${c.last_project || 'Sin Detalle'}</p>
                <div class="list-card-footer mt-3" style="border-top:1px dashed var(--border); padding-top:10px;">
                    <span style="font-size:0.8rem; color:var(--text-secondary); font-weight:700;">Valor Generado</span>
                    <span class="list-price" style="color:var(--success)">Bs. ${parseFloat(c.total_spent).toFixed(2)}</span>
                </div>
            </div>
        `;
    });
};

function renderOrders() {
    const s = els.searchOrder.value.toLowerCase();
    const f = els.filterModule.value;
    
    const cols = {
        'Cotización': document.getElementById('kb-Cotización'),
        'Pendiente de Pago': document.getElementById('kb-Pendiente-de-Pago'),
        'En Proceso': document.getElementById('kb-En-Proceso'),
        'Completado': document.getElementById('kb-Completado')
    };
    
    for(let k in cols) if(cols[k]) cols[k].innerHTML = '';
    let counts = { 'Cotización': 0, 'Pendiente de Pago': 0, 'En Proceso': 0, 'Completado': 0 };

    globalOrders.forEach(o => {
        if(f !== 'All' && o.module !== f) return;
        if(s && !o.client.toLowerCase().includes(s) && !o.id.toString().includes(s)) return;
        
        let statusKey = o.status;
        if(statusKey === 'Pendiente') statusKey = 'Pendiente de Pago'; // Backwards compatibility
        if(!cols[statusKey]) statusKey = 'Cotización'; // Default fallback
        
        counts[statusKey]++;

        const card = document.createElement('div');
        card.className = `order-card oc-status-${statusKey.replace(/ /g, '-')}`;
        card.innerHTML = `
            <div class="oc-header">
                <div>
                    <div class="oc-client">${o.client}</div>
                    <div class="oc-date">${getOrderCode(o)} • ${new Date(o.created_at).toLocaleDateString()}</div>
                </div>
                <span class="badge b-${o.module}">${MODULES[o.module].name.split(' ')[0]}</span>
            </div>
            <div class="oc-desc">${o.project}</div>
            <div class="oc-footer">
                <div class="oc-price">Bs. ${parseFloat(o.total).toFixed(2)}</div>
                <div class="oc-actions">
                    <button class="btn-oc nube" onclick="window.open('https://drive.google.com/drive/folders/1G8oFCmbzxNO7g1tmBaqJ725WSMqsd_gC?usp=sharing', '_blank')" title="Ver en la Nube">
                        <i class="fa-brands fa-google-drive"></i>
                    </button>
                    <button class="btn-oc" onclick="printSaved(${o.id})" title="Imprimir / PDF">
                        <i class="fa-solid fa-print"></i>
                    </button>
                </div>
            </div>
        `;
        if(cols[statusKey]) cols[statusKey].appendChild(card);
    });

    document.getElementById('kb-count-cot').textContent = counts['Cotización'];
    document.getElementById('kb-count-pend').textContent = counts['Pendiente de Pago'];
    document.getElementById('kb-count-proc').textContent = counts['En Proceso'];
    document.getElementById('kb-count-comp').textContent = counts['Completado'];
}
els.searchOrder.addEventListener('input', renderOrders);
els.filterModule.addEventListener('change', renderOrders);

els.btnWa.addEventListener('click', () => {
    const phone = els.phone.value;
    if(!phone) return alert("Ingrese el teléfono.");
    
    let msg = `*AZIER SUITE SERVICE - ${MODULES[currentModule].name}* 🚀\n\nHola *${els.client.value || 'Cliente'}*,\nAdjuntamos el detalle de su solicitud:\n\n*${els.project.value ? els.project.value : 'Detalle de Servicios'}:*\n`;
    
    document.querySelectorAll('.cart-row').forEach(r => {
        const d = r.querySelector('.cart-desc').value;
        const q = r.querySelector('.cart-qty').value;
        const p = r.querySelector('.cart-price').value;
        if(d) msg += `- ${d} (x${q}) : Bs. ${(q*p).toFixed(2)}\n`;
    });
    
    msg += `\n*TOTAL:* Bs. ${els.total.textContent.replace('Bs. ', '')}`;
    msg += `\n*Saldo:* Bs. ${els.balance.textContent.replace('Bs. ', '')}`;
    
    if(els.notes.value) msg += `\n\n*Notas:* ${els.notes.value}`;
    
    msg += `\n\n📞 *Soporte y Consultas:* +591 77173169`;
    
    let cp = phone.replace(/\D/g, '');
    if(cp.length === 8) cp = '591' + cp;
    window.open(`https://wa.me/${cp}?text=${encodeURIComponent(msg)}`, '_blank');
});

els.btnPrint.addEventListener('click', () => printLogic());

function printLogic(order = null) {
    let o;
    if(order) o = order;
    else {
        o = {
            id: 'TMP',
            created_at: new Date().toISOString(),
            module: currentModule,
            client: els.client.value || 'Cliente Final',
            phone: els.phone.value || '-',
            project: els.project.value || '-',
            items: [],
            subtotal: parseFloat(els.subtotal.textContent.replace('Bs. ', '')),
            discount: parseFloat(els.discount.value),
            total: parseFloat(els.total.textContent.replace('Bs. ', '')),
            advance: parseFloat(els.advance.value),
            balance: parseFloat(els.balance.textContent.replace('Bs. ', '')),
            notes: els.notes.value
        };
        document.querySelectorAll('.cart-row').forEach(r => {
            const d = r.querySelector('.cart-desc').value;
            if(d) {
                o.items.push({
                    desc: d,
                    qty: parseFloat(r.querySelector('.cart-qty').value) || 0,
                    price: parseFloat(r.querySelector('.cart-price').value) || 0
                });
            }
        });
    }

    document.getElementById('pt-module-name').textContent = MODULES[o.module].name;
    document.getElementById('pt-id').textContent = getOrderCode(o);
    document.getElementById('pt-date').textContent = new Date(o.created_at).toLocaleDateString('es-ES');
    document.getElementById('pt-client').textContent = o.client;
    document.getElementById('pt-phone').textContent = o.phone;
    document.getElementById('pt-project').textContent = o.project;
    
    const tbody = document.getElementById('pt-items');
    tbody.innerHTML = '';
    o.items.forEach(i => {
        tbody.innerHTML += `<tr><td>${i.desc}</td><td>${i.qty}</td><td>${parseFloat(i.price).toFixed(2)}</td><td>${(i.qty*i.price).toFixed(2)}</td></tr>`;
    });
    
    document.getElementById('pt-sub').textContent = parseFloat(o.subtotal).toFixed(2);
    document.getElementById('pt-disc').textContent = parseFloat(o.discount).toFixed(2);
    document.getElementById('pt-total').textContent = parseFloat(o.total).toFixed(2);
    document.getElementById('pt-adv').textContent = parseFloat(o.advance).toFixed(2);
    document.getElementById('pt-bal').textContent = parseFloat(o.balance).toFixed(2);
    document.getElementById('pt-notes').textContent = o.notes;
    
    window.print();
}

window.printSaved = (id) => {
    const o = globalOrders.find(x => x.id == id);
    if(o) printLogic(o);
};

window.approveUser = async (id) => {
    if(!confirm('¿Estás seguro de aprobar este usuario?')) return;
    try {
        const res = await fetch(`${API_URL}?action=approve_user`, {
            method: 'POST', body: JSON.stringify({id}), headers: {'Content-Type': 'application/json'}
        });
        const data = await res.json();
        if(data.success) {
            alert('Usuario aprobado.');
            fetchData();
        }
    } catch(e) { alert('Error.'); }
};

window.changeRole = async (id, newRole) => {
    if(!confirm(`¿Cambiar rol a ${newRole}?`)) return;
    try {
        const res = await fetch(`${API_URL}?action=change_role`, {
            method: 'POST', body: JSON.stringify({id, role: newRole}), headers: {'Content-Type': 'application/json'}
        });
        const data = await res.json();
        if(data.success) fetchData();
    } catch(e) { alert('Error al cambiar rol.'); }
};

window.deleteUser = async (id) => {
    if(!confirm('¿Eliminar definitivamente este usuario? Esta acción no se puede deshacer.')) return;
    try {
        const res = await fetch(`${API_URL}?action=delete_user`, {
            method: 'POST', body: JSON.stringify({id}), headers: {'Content-Type': 'application/json'}
        });
        const data = await res.json();
        if(data.success) fetchData();
    } catch(e) { alert('Error al eliminar usuario.'); }
};

window.exportBackup = () => {
    const backupData = {
        date: new Date().toISOString(),
        orders: globalOrders,
        clients: globalClients,
        inventory: globalInventory,
        users: globalUsers
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "AZIER_SUITE_BACKUP_" + new Date().getTime() + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
};

window.saveSocialSettings = async () => {
    const fb = document.getElementById('admin-link-fb').value;
    const wa = document.getElementById('admin-link-wa').value;
    const ig = document.getElementById('admin-link-ig').value;
    
    try {
        const res = await fetch(`${API_URL}?action=save_settings`, {
            method: 'POST', body: JSON.stringify({facebook: fb, whatsapp: wa, instagram: ig}), headers: {'Content-Type': 'application/json'}
        });
        const data = await res.json();
        if(data.success) {
            alert('¡Enlaces de Redes Sociales guardados correctamente!');
            loadSocialSettings();
        }
    } catch(e) { alert('Error al guardar la configuración.'); }
};

window.loadSocialSettings = async () => {
    try {
        const res = await fetch(`${API_URL}?action=get_settings`);
        const data = await res.json();
        
        // Update sidebar links
        const linkFb = document.getElementById('link-fb');
        const linkWa = document.getElementById('link-wa');
        const linkIg = document.getElementById('link-ig');
        if(linkFb) linkFb.href = data.facebook || '#';
        if(linkWa) linkWa.href = data.whatsapp || '#';
        if(linkIg) linkIg.href = data.instagram || '#';
        
        // Update admin inputs if they exist
        const inFb = document.getElementById('admin-link-fb');
        const inWa = document.getElementById('admin-link-wa');
        const inIg = document.getElementById('admin-link-ig');
        if(inFb) inFb.value = data.facebook && data.facebook !== '#' ? data.facebook : '';
        if(inWa) inWa.value = data.whatsapp && data.whatsapp !== '#' ? data.whatsapp : '';
        if(inIg) inIg.value = data.instagram && data.instagram !== '#' ? data.instagram : '';
    } catch(e) { console.warn("Could not load social settings", e); }
};

// Auth & Start (Bypassed)
const loginOverlay = document.getElementById('login-overlay');

function initApp() {
    if(loginOverlay) {
        loginOverlay.classList.remove('active');
        loginOverlay.style.display = 'none';
    }
    loadPresets(currentModule);
    addCartRow();
    fetchData();
}

// Bypass login completely per user request
myUser = { email: 'admin-local', role: 'superadmin' };
document.getElementById('nav-admin').style.display = 'flex';
initApp();

// === MODAL LOGIC ===
const uModal = document.getElementById('universal-modal');
const mTitle = document.getElementById('modal-title');
const mBody = document.getElementById('modal-body');
const mSaveBtn = document.getElementById('modal-save-btn');
let currentModalAction = '';

window.openClientModal = () => {
    mTitle.innerHTML = '<i class="fa-solid fa-user-plus"></i> Nuevo Cliente';
    mBody.innerHTML = `
        <div class="form-group mb-3">
            <label>Nombre del Cliente / Empresa</label>
            <input type="text" id="m-client-name" placeholder="Ej. Juan Pérez">
        </div>
        <div class="form-group mb-3">
            <label>Teléfono (WhatsApp)</label>
            <input type="tel" id="m-client-phone" placeholder="Ej. 70000000">
        </div>
        <div class="form-group mb-3">
            <label>Notas Adicionales</label>
            <input type="text" id="m-client-notes" placeholder="Rubro, detalles...">
        </div>
    `;
    currentModalAction = 'save_client';
    uModal.classList.add('active');
};

window.openInventoryModal = () => {
    mTitle.innerHTML = '<i class="fa-solid fa-box-open"></i> Nuevo Material';
    mBody.innerHTML = `
        <div class="form-group mb-3">
            <label>Nombre del Material / Producto</label>
            <input type="text" id="m-inv-name" placeholder="Ej. Disco Duro 1TB">
        </div>
        <div class="form-group mb-3">
            <label>Categoría</label>
            <select id="m-inv-cat" class="modern-select">
                <option value="IT">Soporte IT</option>
                <option value="MK">Marketing</option>
                <option value="DG">Diseño Gráfico</option>
                <option value="General">General</option>
            </select>
        </div>
        <div class="split-inputs">
            <div class="form-group mb-3">
                <label>Stock Inicial</label>
                <input type="number" id="m-inv-stock" value="0">
            </div>
            <div class="form-group mb-3">
                <label>Stock Mínimo (Alerta)</label>
                <input type="number" id="m-inv-min" value="5">
            </div>
        </div>
    `;
    currentModalAction = 'save_inventory';
    uModal.classList.add('active');
};

window.openUserModal = () => {
    mTitle.innerHTML = '<i class="fa-solid fa-user-plus"></i> Nuevo Usuario (Empleado)';
    mBody.innerHTML = `
        <div class="form-group mb-3">
            <label>Correo Electrónico</label>
            <input type="email" id="m-user-email" placeholder="ejemplo@correo.com">
        </div>
        <div class="form-group mb-3">
            <label>Contraseña</label>
            <input type="password" id="m-user-pass" placeholder="Mínimo 4 caracteres">
        </div>
        <div class="form-group mb-3">
            <label>Privilegios (Rol)</label>
            <select id="m-user-role" class="modern-select">
                <option value="empleado">Empleado (Limitado)</option>
                <option value="superadmin">Administrador (Total)</option>
            </select>
        </div>
    `;
    currentModalAction = 'save_user';
    uModal.classList.add('active');
};

mSaveBtn.addEventListener('click', async () => {
    mSaveBtn.textContent = 'Guardando...';
    try {
        if(currentModalAction === 'save_client') {
            const data = {
                name: document.getElementById('m-client-name').value,
                phone: document.getElementById('m-client-phone').value,
                notes: document.getElementById('m-client-notes').value
            };
            if(!data.name) return alert("El nombre es requerido");
            const res = await fetch(`${API_URL}?action=add_client`, { method: 'POST', body: JSON.stringify(data), headers: {'Content-Type': 'application/json'} });
            const result = await res.json();
            if(result.success) { alert("¡Cliente registrado exitosamente!"); uModal.classList.remove('active'); fetchData(); }
        } else if(currentModalAction === 'save_inventory') {
            const data = {
                item_name: document.getElementById('m-inv-name').value,
                category: document.getElementById('m-inv-cat').value,
                stock_current: parseInt(document.getElementById('m-inv-stock').value),
                stock_min: parseInt(document.getElementById('m-inv-min').value)
            };
            if(!data.item_name) return alert("El nombre del material es requerido");
            const res = await fetch(`${API_URL}?action=add_inventory`, { method: 'POST', body: JSON.stringify(data), headers: {'Content-Type': 'application/json'} });
            const result = await res.json();
            if(result.success) { alert("¡Material agregado al inventario exitosamente!"); uModal.classList.remove('active'); fetchData(); }
        } else if(currentModalAction === 'save_user') {
            const data = {
                email: document.getElementById('m-user-email').value,
                password: document.getElementById('m-user-pass').value,
                role: document.getElementById('m-user-role').value
            };
            if(!data.email || data.password.length < 4) return alert("Ingrese un correo válido y contraseña de mín 4 caracteres.");
            const res = await fetch(`${API_URL}?action=add_user_admin`, { method: 'POST', body: JSON.stringify(data), headers: {'Content-Type': 'application/json'} });
            const result = await res.json();
            if(result.success) { alert("¡Usuario creado y activado exitosamente!"); uModal.classList.remove('active'); fetchData(); }
            else if(result.error) { alert(result.error); }
        }
    } catch (e) {
        alert("Error de conexión al servidor.");
    }
    mSaveBtn.textContent = 'Guardar';
});
