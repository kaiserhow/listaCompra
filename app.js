// ===== SUPABASE =====
const SUPABASE_URL = 'https://cydqrsojdypxilyzmzwm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5ZHFyc29qZHlweGlseXptendtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNjEyMzIsImV4cCI6MjA5MDczNzIzMn0.HnUvCp7DVghRWvhW95EzrnDRO6-5yEiQ5kwsInCXv-Y';
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== USER ID =====
function getUserId() {
  let id = localStorage.getItem('lacompra_uid');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('lacompra_uid', id);
  }
  return id;
}
let USER_ID = getUserId();

// ===== STATE =====
let groups = [];
let products = [];
let checked = {}; // { product_id: true }
let activeGroup = null;
let currentShopGroup = null;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  bindEvents();
  showLoading('Cargando tu lista...');
  await ensureTablesExist();
  await loadAll();
  hideLoading();
  document.getElementById('share-id-display').textContent = USER_ID.slice(0, 8) + '...';
  document.getElementById('share-id-display').title = USER_ID;
});

// ===== DB SETUP =====
async function ensureTablesExist() {
  // Try to select — if tables don't exist, create them via RPC or just proceed
  // Tables should be pre-created in Supabase; we just handle gracefully
  try {
    await db.from('groups').select('id').limit(1);
    await db.from('products').select('id').limit(1);
    await db.from('checked').select('id').limit(1);
  } catch(e) {
    console.warn('Tables might not exist yet:', e);
  }
}

// ===== LOAD DATA =====
async function loadAll() {
  await loadGroups();
  await loadProducts();
  await loadChecked();
}

async function loadGroups() {
  const { data, error } = await db
    .from('groups')
    .select('*')
    .eq('user_id', USER_ID)
    .order('created_at', { ascending: true });

  if (error) { console.error('loadGroups', error); return; }
  groups = data || [];
  if (groups.length === 0) {
    await createGroup('General');
    await loadGroups();
  }
  if (!activeGroup || !groups.find(g => g.id === activeGroup)) {
    activeGroup = groups[0]?.id || null;
  }
}

async function loadProducts() {
  const { data, error } = await db
    .from('products')
    .select('*')
    .eq('user_id', USER_ID)
    .order('created_at', { ascending: true });

  if (error) { console.error('loadProducts', error); return; }
  products = data || [];
}

async function loadChecked() {
  const { data, error } = await db
    .from('checked')
    .select('*')
    .eq('user_id', USER_ID);

  if (error) { console.error('loadChecked', error); return; }
  checked = {};
  (data || []).forEach(r => { checked[r.product_id] = true; });
}

// ===== CREATE GROUP =====
async function createGroup(name) {
  const { data, error } = await db
    .from('groups')
    .insert({ user_id: USER_ID, name })
    .select()
    .single();
  if (error) { console.error('createGroup', error); showToast('Error creando grupo'); return null; }
  return data;
}

// ===== BIND EVENTS =====
function bindEvents() {
  // Home
  document.getElementById('btn-go-lista').onclick = () => goTo('screen-lista');
  document.getElementById('btn-go-compra').onclick = () => goToCompra();
  document.getElementById('btn-copy-id').onclick = copyId;
  document.getElementById('btn-share-link').onclick = shareLink;
  document.getElementById('btn-join').onclick = joinId;

  // Lista
  document.getElementById('back-lista').onclick = () => goTo('screen-home');
  document.getElementById('btn-add-product').onclick = addProduct;
  document.getElementById('input-name').addEventListener('keydown', e => { if (e.key === 'Enter') addProduct(); });
  document.getElementById('input-qty').addEventListener('keydown', e => { if (e.key === 'Enter') addProduct(); });

  // Compra
  document.getElementById('back-compra-select').onclick = () => goTo('screen-home');

  // Modal group
  document.getElementById('modal-group-cancel').onclick = () => closeModal('modal-group');
  document.getElementById('modal-group-confirm').onclick = confirmNewGroup;
  document.getElementById('modal-group-input').addEventListener('keydown', e => { if (e.key === 'Enter') confirmNewGroup(); });
  document.getElementById('modal-group').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal('modal-group'); });

  // Reset checks
  document.getElementById('btn-reset-checks').onclick = resetChecks;
}

// ===== NAVIGATION =====
function goTo(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (id === 'screen-lista') renderLista();
  if (id === 'screen-compra-select') renderCompraSelect();
}

async function goToCompra() {
  showLoading('Cargando lista...');
  await loadAll();
  hideLoading();
  const groupsWithProducts = groups.filter(g => products.some(p => p.group_id === g.id));
  if (products.length === 0) {
    showToast('Añade productos a tu lista primero 📝');
    return;
  }
  if (groupsWithProducts.length <= 1) {
    startShopping(groupsWithProducts.length === 1 ? groupsWithProducts[0].id : null);
  } else {
    goTo('screen-compra-select');
  }
}

// ===== LISTA RENDER =====
function renderLista() {
  renderGroups();
  renderGroupSelect();
  renderProductList();
}

function renderGroups() {
  const row = document.getElementById('groups-row');
  row.innerHTML = '';
  groups.forEach(g => {
    const chip = document.createElement('div');
    chip.className = 'group-chip' + (g.id === activeGroup ? ' active' : '');
    chip.textContent = g.name;
    chip.onclick = () => { activeGroup = g.id; renderLista(); };
    row.appendChild(chip);
  });
  const add = document.createElement('div');
  add.className = 'group-chip add-group';
  add.textContent = '+ Grupo';
  add.onclick = openNewGroupModal;
  row.appendChild(add);
}

function renderGroupSelect() {
  const sel = document.getElementById('input-group');
  sel.innerHTML = groups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
  if (activeGroup) sel.value = activeGroup;
}

function renderProductList() {
  const list = document.getElementById('product-list');
  const activeGroupObj = groups.find(g => g.id === activeGroup);
  const items = products.filter(p => p.group_id === activeGroup);

  if (!items.length) {
    const groupName = activeGroupObj?.name || 'este grupo';
    list.innerHTML = `<div class="empty-state"><span class="emoji">🥬</span>Sin productos en "${groupName}"<br><small style="margin-top:6px;display:block;opacity:0.7">Añade algo arriba</small></div>`;
    return;
  }

  list.innerHTML = items.map(p => `
    <div class="product-item">
      <div class="product-info">
        <span class="product-name">${escHtml(p.name)}</span>
        <span class="product-qty">Cantidad: ${escHtml(p.quantity)}</span>
      </div>
      <div class="product-actions">
        <span class="group-badge">${escHtml(activeGroupObj?.name || '')}</span>
        <button class="del-btn" data-id="${p.id}">✕</button>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.del-btn').forEach(btn => {
    btn.onclick = () => deleteProduct(btn.dataset.id);
  });
}

// ===== ADD PRODUCT =====
async function addProduct() {
  const nameEl = document.getElementById('input-name');
  const qtyEl = document.getElementById('input-qty');
  const groupEl = document.getElementById('input-group');
  const name = nameEl.value.trim();
  const quantity = qtyEl.value.trim() || '1';
  const group_id = groupEl.value;

  if (!name) { showToast('Escribe un nombre'); nameEl.focus(); return; }

  const btn = document.getElementById('btn-add-product');
  btn.disabled = true;
  btn.textContent = '...';

  const { data, error } = await db
    .from('products')
    .insert({ user_id: USER_ID, name, quantity, group_id })
    .select()
    .single();

  btn.disabled = false;
  btn.textContent = 'Añadir';

  if (error) { console.error('addProduct', error); showToast('Error al añadir'); return; }

  products.push(data);
  nameEl.value = '';
  qtyEl.value = '';
  nameEl.focus();
  renderProductList();
  showToast(`"${name}" añadido ✓`);
}

// ===== DELETE PRODUCT =====
async function deleteProduct(id) {
  const { error } = await db.from('products').delete().eq('id', id).eq('user_id', USER_ID);
  if (error) { showToast('Error al eliminar'); return; }
  products = products.filter(p => p.id !== id);
  delete checked[id];
  renderProductList();
  showToast('Eliminado');
}

// ===== NEW GROUP MODAL =====
function openNewGroupModal() {
  document.getElementById('modal-group-input').value = '';
  document.getElementById('modal-group').classList.add('visible');
  setTimeout(() => document.getElementById('modal-group-input').focus(), 150);
}

async function confirmNewGroup() {
  const name = document.getElementById('modal-group-input').value.trim();
  if (!name) return;
  if (groups.find(g => g.name.toLowerCase() === name.toLowerCase())) {
    showToast('Ya existe ese grupo');
    return;
  }
  showLoading('Creando grupo...');
  const newGroup = await createGroup(name);
  if (newGroup) {
    groups.push(newGroup);
    activeGroup = newGroup.id;
    renderLista();
    showToast(`Grupo "${name}" creado ✓`);
  }
  closeModal('modal-group');
  hideLoading();
}

// ===== COMPRA SELECT =====
function renderCompraSelect() {
  const container = document.getElementById('list-selector');
  const groupsWithProducts = groups.filter(g => products.some(p => p.group_id === g.id));

  if (products.length === 0) {
    container.innerHTML = `<div class="empty-state"><span class="emoji">📝</span>Añade productos a tu lista primero</div>`;
    return;
  }

  container.innerHTML = '';

  // "All" option
  const allItem = document.createElement('div');
  allItem.className = 'list-select-item';
  allItem.innerHTML = `<div><div class="lsi-name">🛒 Todos los productos</div><div class="lsi-count">${products.length} producto${products.length !== 1 ? 's' : ''}</div></div><div class="lsi-arrow">→</div>`;
  allItem.onclick = () => startShopping(null);
  container.appendChild(allItem);

  groupsWithProducts.forEach(g => {
    const count = products.filter(p => p.group_id === g.id).length;
    const item = document.createElement('div');
    item.className = 'list-select-item';
    item.innerHTML = `<div><div class="lsi-name">${escHtml(g.name)}</div><div class="lsi-count">${count} producto${count !== 1 ? 's' : ''}</div></div><div class="lsi-arrow">→</div>`;
    item.onclick = () => startShopping(g.id);
    container.appendChild(item);
  });
}

// ===== SHOPPING MODE =====
function startShopping(groupId) {
  currentShopGroup = groupId;
  const hasMultiple = groups.filter(g => products.some(p => p.group_id === g.id)).length > 1;

  document.getElementById('compra-back-btn').onclick = () => {
    if (hasMultiple) goTo('screen-compra-select');
    else goTo('screen-home');
  };

  const groupName = groupId ? (groups.find(g => g.id === groupId)?.name || '') : 'Toda la lista';
  document.getElementById('shopping-subtitle').textContent = groupName;

  renderShopList();
  goTo('screen-compra');
}

function renderShopList() {
  const visibleProducts = currentShopGroup
    ? products.filter(p => p.group_id === currentShopGroup)
    : products;

  const total = visibleProducts.length;
  const done = visibleProducts.filter(p => checked[p.id]).length;

  document.getElementById('progress-pill').textContent = `${done} / ${total}`;
  const pct = total ? (done / total) * 100 : 0;
  document.getElementById('progress-bar').style.width = pct + '%';

  const list = document.getElementById('shop-list');

  if (!visibleProducts.length) {
    list.innerHTML = `<div class="empty-state"><span class="emoji">✅</span>Sin productos</div>`;
    return;
  }

  if (!currentShopGroup) {
    // Group by group
    const byGroup = {};
    visibleProducts.forEach(p => {
      if (!byGroup[p.group_id]) byGroup[p.group_id] = [];
      byGroup[p.group_id].push(p);
    });
    list.innerHTML = Object.entries(byGroup).map(([gid, items]) => {
      const gName = groups.find(g => g.id === gid)?.name || '';
      return `<div class="shop-group-label">${escHtml(gName)}</div>` +
        items.map(p => shopItemHTML(p)).join('');
    }).join('');
  } else {
    list.innerHTML = visibleProducts.map(p => shopItemHTML(p)).join('');
  }

  list.querySelectorAll('.shop-item').forEach(el => {
    el.onclick = () => toggleCheck(el.dataset.id);
  });
}

function shopItemHTML(p) {
  const isChecked = !!checked[p.id];
  return `<div class="shop-item${isChecked ? ' checked' : ''}" data-id="${p.id}">
    <div class="shop-check">${isChecked ? '✓' : ''}</div>
    <span class="shop-item-name">${escHtml(p.name)}</span>
    <span class="shop-item-qty">${escHtml(p.quantity)}</span>
  </div>`;
}

async function toggleCheck(productId) {
  const isNowChecked = !checked[productId];

  // Optimistic update
  if (isNowChecked) {
    checked[productId] = true;
  } else {
    delete checked[productId];
  }
  renderShopList();

  // Persist
  if (isNowChecked) {
    await db.from('checked').upsert({ user_id: USER_ID, product_id: productId });
  } else {
    await db.from('checked').delete().eq('user_id', USER_ID).eq('product_id', productId);
  }
}

async function resetChecks() {
  const visibleProducts = currentShopGroup
    ? products.filter(p => p.group_id === currentShopGroup)
    : products;

  visibleProducts.forEach(p => delete checked[p.id]);
  renderShopList();

  const ids = visibleProducts.map(p => p.id);
  await db.from('checked').delete().eq('user_id', USER_ID).in('product_id', ids);
  showToast('Marcas reiniciadas');
}

// ===== SHARE / JOIN =====
function copyId() {
  navigator.clipboard.writeText(USER_ID).then(() => showToast('ID copiado ✓')).catch(() => {
    // fallback
    const el = document.createElement('textarea');
    el.value = USER_ID;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    showToast('ID copiado ✓');
  });
}

function shareLink() {
  const url = `${window.location.origin}${window.location.pathname}?id=${USER_ID}`;
  if (navigator.share) {
    navigator.share({ title: 'La Compra', text: 'Únete a mi lista de la compra', url });
  } else {
    navigator.clipboard.writeText(url).then(() => showToast('Enlace copiado ✓'));
  }
}

async function joinId() {
  const input = document.getElementById('input-join-id').value.trim();
  if (!input) return;
  // Accept short form or full UUID
  const newId = input.length === 36 ? input : null;
  if (!newId) {
    showToast('ID no válido (necesitas el UUID completo)');
    return;
  }
  // Verify it exists
  showLoading('Buscando lista...');
  const { data } = await db.from('groups').select('id').eq('user_id', newId).limit(1);
  hideLoading();
  if (!data || data.length === 0) {
    showToast('No se encontró esa lista');
    return;
  }
  USER_ID = newId;
  localStorage.setItem('lacompra_uid', newId);
  document.getElementById('input-join-id').value = '';
  document.getElementById('share-id-display').textContent = USER_ID.slice(0, 8) + '...';
  showLoading('Cargando lista compartida...');
  await loadAll();
  hideLoading();
  showToast('Lista cargada ✓');
  renderLista();
}

// Check URL for shared ID on load
(function checkUrlId() {
  const params = new URLSearchParams(window.location.search);
  const urlId = params.get('id');
  if (urlId && urlId.length === 36 && urlId !== USER_ID) {
    document.getElementById('input-join-id').value = urlId;
    // Auto-join after a moment
    setTimeout(() => joinId(), 800);
  }
})();

// ===== MODAL HELPERS =====
function closeModal(id) {
  document.getElementById(id).classList.remove('visible');
}

function showLoading(text = 'Cargando...') {
  document.getElementById('loading-text').textContent = text;
  document.getElementById('modal-loading').classList.add('visible');
}

function hideLoading() {
  document.getElementById('modal-loading').classList.remove('visible');
}

// ===== TOAST =====
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

// ===== UTILS =====
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
