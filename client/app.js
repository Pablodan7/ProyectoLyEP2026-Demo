const API_URL = '/api';
const STORAGE_KEY = 'districrm_pedidos_pendientes';
const COMISION_PREVENTISTA = 0.05;
const TIMEOUT_MS = 4000;

// Elementos del DOM
const alertasContainer = document.getElementById('alertas-container');
const formPedido = document.getElementById('form-pedido');
const inputCliente = document.getElementById('input-cliente');
const inputMonto = document.getElementById('input-monto');
const comisionPreview = document.getElementById('comision-preview');
const listaPedidos = document.getElementById('lista-pedidos');
const selectSucursal = document.getElementById('select-sucursal');
const clientesDatalist = document.getElementById('clientes-datalist');
const creditoInfo = document.getElementById('credito-info');
const badgeEstado = document.getElementById('badge-estado');
const syncBanner = document.getElementById('sync-banner');
const syncMensaje = document.getElementById('sync-mensaje');
const btnSincronizar = document.getElementById('btn-sincronizar');
const mensajeOperacion = document.getElementById('mensaje-operacion');
const btnSubmit = formPedido.querySelector('button[type="submit"]');

// Estado de la demo
let clientes = [];
let pedidosServidor = [];
let pedidosPendientes = cargarPendientes();
let apiDisponible = true;
let sincronizando = false;

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function cargarPendientes() {
  try {
    const datos = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(datos) ? datos : [];
  } catch (error) {
    return [];
  }
}

function guardarPendientes() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pedidosPendientes));
  } catch (error) {
    mostrarMensaje('No se pudo guardar el pedido en el navegador.', 'aviso');
  }
}

function formatoMoneda(valor) {
  return `$${Number(valor || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;
}

async function fetchJSON(url, opciones = {}, timeout = TIMEOUT_MS) {
  const controlador = new AbortController();
  const timer = setTimeout(() => controlador.abort(), timeout);

  try {
    const respuesta = await fetch(url, { ...opciones, signal: controlador.signal });
    const datos = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok) {
      throw new Error(datos.mensaje || `Error HTTP ${respuesta.status}`);
    }

    return datos;
  } finally {
    clearTimeout(timer);
  }
}

function crearParrafo(texto, clases) {
  const parrafo = document.createElement('p');
  parrafo.className = clases;
  parrafo.textContent = texto;
  return parrafo;
}

let timerMensajeOperacion = null;

function mostrarMensaje(texto, tipo = 'ok') {
  mensajeOperacion.textContent = texto;
  mensajeOperacion.className = `text-xs rounded-lg px-3 py-2 ${tipo === 'ok' ? 'mensaje-ok' : 'mensaje-aviso'}`;

  clearTimeout(timerMensajeOperacion);
  timerMensajeOperacion = setTimeout(() => {
    mensajeOperacion.classList.add('hidden');
  }, 5000);
}

// ---------------------------------------------------------------------------
// Clientes y alertas
// ---------------------------------------------------------------------------

function renderDatalistClientes() {
  clientesDatalist.replaceChildren();

  [...clientes]
    .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'))
    .forEach((cliente) => {
      const opcion = document.createElement('option');
      opcion.value = cliente.nombre;
      opcion.label = `${cliente.sucursal} - Límite ${formatoMoneda(cliente.limiteCredito)} - Deuda ${formatoMoneda(cliente.deudaActual)}`;
      clientesDatalist.appendChild(opcion);
    });
}

async function cargarClientes() {
  try {
    const datos = await fetchJSON(`${API_URL}/clientes`);
    clientes = Array.isArray(datos) ? datos : [];
    apiDisponible = true;
  } catch (error) {
    // Se conservan los clientes ya cargados para poder seguir validando crédito.
    apiDisponible = false;
  }

  renderDatalistClientes();
  actualizarCredito();
  actualizarEstadoConexion();
}

async function cargarAlertas() {
  const sucursal = selectSucursal.value;
  alertasContainer.replaceChildren(crearParrafo('Cargando alertas desde el backend...', 'text-sm text-gray-400 animate-pulse'));

  try {
    const query = sucursal !== 'Todas' ? `?sucursal=${encodeURIComponent(sucursal)}` : '';
    const datos = await fetchJSON(`${API_URL}/clientes/dormidos${query}`);
    apiDisponible = true;
    renderAlertas(Array.isArray(datos) ? datos : []);
  } catch (error) {
    apiDisponible = false;
    alertasContainer.replaceChildren(
      crearParrafo('No se pudo conectar con la API de alertas. Verificá que el servidor esté corriendo.', 'text-xs text-red-500')
    );
  }

  actualizarEstadoConexion();
}

function renderAlertas(lista) {
  if (!lista.length) {
    alertasContainer.replaceChildren(
      crearParrafo('No hay clientes en riesgo de fuga para la sucursal seleccionada.', 'text-sm text-gray-500')
    );
    return;
  }

  alertasContainer.replaceChildren();

  lista.forEach((cliente) => {
    const tarjeta = document.createElement('div');
    tarjeta.className = 'p-3 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex justify-between items-center gap-3';

    const info = document.createElement('div');
    const titulo = document.createElement('h3');
    titulo.className = 'font-bold text-sm text-red-900';
    titulo.textContent = cliente.nombre;

    const detalle = document.createElement('p');
    detalle.className = 'text-xs text-red-700';
    detalle.textContent = `${cliente.sucursal} · Días sin pedir: ${cliente.diasSinComprar} (promedio: ${cliente.promedioHistoricoDias})${cliente.deudaVencida ? ' · Deuda vencida' : ''}`;

    info.append(titulo, detalle);

    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded shadow whitespace-nowrap';
    boton.textContent = 'Asignar Visita';
    boton.addEventListener('click', () => asignarVisita(cliente.nombre));

    tarjeta.append(info, boton);
    alertasContainer.appendChild(tarjeta);
  });
}

function asignarVisita(nombreCliente) {
  inputCliente.value = nombreCliente;
  actualizarCredito();
  inputMonto.focus();
}

// ---------------------------------------------------------------------------
// Límite de crédito y comisión
// ---------------------------------------------------------------------------

function obtenerClienteSeleccionado() {
  const nombre = inputCliente.value.trim().toLowerCase();
  if (!nombre) return null;

  return clientes.find((cliente) => String(cliente.nombre).trim().toLowerCase() === nombre) || null;
}

function evaluarCredito() {
  const cliente = obtenerClienteSeleccionado();
  const monto = Number(inputMonto.value) || 0;

  if (!cliente) {
    return { cliente: null, monto, excede: false, disponible: null };
  }

  const limite = Number(cliente.limiteCredito) || 0;
  const deuda = Number(cliente.deudaActual) || 0;
  const disponible = Math.max(limite - deuda, 0);
  const excede = monto > 0 && monto > disponible;

  return { cliente, monto, limite, deuda, disponible, excede };
}

function actualizarCredito() {
  const credito = evaluarCredito();
  creditoInfo.classList.remove('credito-neutro', 'credito-ok', 'credito-alerta', 'credito-aviso');

  if (!credito.cliente) {
    creditoInfo.classList.add('credito-aviso');
    creditoInfo.textContent = inputCliente.value.trim()
      ? 'Cliente no registrado en la base demo: no hay límite de crédito para validar.'
      : 'Seleccioná un cliente para validar su límite de crédito.';
    return;
  }

  const { limite, deuda, disponible, monto, excede } = credito;
  const notaVencida = credito.cliente.deudaVencida ? ' El cliente registra deuda vencida.' : '';

  if (!monto) {
    creditoInfo.classList.add('credito-neutro');
    creditoInfo.textContent = `Límite: ${formatoMoneda(limite)} · Deuda actual: ${formatoMoneda(deuda)} · Disponible: ${formatoMoneda(disponible)}.${notaVencida}`;
    return;
  }

  if (excede) {
    creditoInfo.classList.add('credito-alerta');
    creditoInfo.textContent = `Atención: el pedido supera el crédito disponible por ${formatoMoneda(monto - disponible)}. Se registrará como Pendiente de Crédito.${notaVencida}`;
    return;
  }

  creditoInfo.classList.add('credito-ok');
  creditoInfo.textContent = `Crédito disponible tras el pedido: ${formatoMoneda(disponible - monto)}.${notaVencida}`;
}

function actualizarComision() {
  const monto = Number(inputMonto.value) || 0;
  comisionPreview.textContent = `${formatoMoneda(monto * COMISION_PREVENTISTA)} ARS`;
}

// ---------------------------------------------------------------------------
// Pedidos: render, alta y sincronización offline
// ---------------------------------------------------------------------------

function normalizarPedidoServidor(pedido = {}) {
  return {
    ...pedido,
    id: pedido.id || pedido._id,
    montoTotal: Number(pedido.montoTotal) || 0,
    comisionGanada: Number(pedido.comisionGanada) || 0,
    fecha: pedido.fecha || pedido.createdAt
  };
}

function crearItemPedido(pedido) {
  const item = document.createElement('li');
  item.className = 'p-2 bg-gray-50 rounded border flex justify-between items-center gap-2 text-xs';

  const info = document.createElement('div');
  const nombre = document.createElement('span');
  nombre.className = 'font-bold text-gray-800';
  nombre.textContent = pedido.cliente;

  const detalle = document.createElement('span');
  detalle.className = 'text-gray-500 block';
  detalle.textContent = `${formatoMoneda(pedido.montoTotal)} ARS · ${pedido.sucursal || 'Sin sucursal'}`;

  info.append(nombre, detalle);

  const ladoDerecho = document.createElement('div');
  ladoDerecho.className = 'flex flex-col items-end gap-1';

  const comision = document.createElement('span');
  comision.className = 'font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded';
  comision.textContent = `Comisión: +${formatoMoneda(pedido.comisionGanada)}`;
  ladoDerecho.appendChild(comision);

  if (pedido.estado === 'Pendiente_Credito') {
    const estadoCredito = document.createElement('span');
    estadoCredito.className = 'estado-badge estado-credito';
    estadoCredito.textContent = 'Crédito pendiente';
    ladoDerecho.appendChild(estadoCredito);
  }

  if (pedido.pendienteSync) {
    const estadoSync = document.createElement('span');
    estadoSync.className = 'estado-badge estado-sync';
    estadoSync.textContent = 'Sin sincronizar';
    ladoDerecho.appendChild(estadoSync);
  }

  item.append(info, ladoDerecho);
  return item;
}

function renderPedidos() {
  const porClave = new Map();

  const agregar = (pedido, pendienteSync) => {
    const clave = pedido.idLocal || pedido._id || pedido.id || `${pedido.cliente}-${pedido.fecha}`;
    if (!porClave.has(clave)) {
      porClave.set(clave, { ...pedido, pendienteSync });
    } else if (pendienteSync) {
      porClave.get(clave).pendienteSync = true;
    }
  };

  pedidosPendientes.forEach((pedido) => agregar(pedido, true));
  pedidosServidor.forEach((pedido) => agregar(pedido, false));

  const pedidos = [...porClave.values()].sort((a, b) => {
    return new Date(b.fecha || b.createdAt || 0) - new Date(a.fecha || a.createdAt || 0);
  });

  if (!pedidos.length) {
    listaPedidos.replaceChildren(
      crearParrafo('No hay pedidos cargados en esta sesión.', 'text-xs text-gray-400 italic')
    );
    return;
  }

  listaPedidos.replaceChildren(...pedidos.slice(0, 20).map(crearItemPedido));
}

async function cargarPedidos() {
  try {
    const datos = await fetchJSON(`${API_URL}/pedidos`);
    pedidosServidor = (Array.isArray(datos) ? datos : []).map(normalizarPedidoServidor);
    apiDisponible = true;
  } catch (error) {
    apiDisponible = false;
  }

  renderPedidos();
  actualizarEstadoConexion();
}

async function intentarSincronizar(manual = false) {
  if (sincronizando || !navigator.onLine || !pedidosPendientes.length) {
    actualizarEstadoConexion();
    return;
  }

  sincronizando = true;
  actualizarEstadoConexion();

  const pendientesRestantes = [];
  let sincronizados = 0;

  for (const pedido of pedidosPendientes) {
    try {
      const datos = await fetchJSON(
        `${API_URL}/pedidos`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cliente: pedido.cliente,
            sucursal: pedido.sucursal,
            montoTotal: pedido.montoTotal,
            origenOffline: true,
            estado: pedido.estado,
            idLocal: pedido.idLocal
          })
        },
        6000
      );

      pedidosServidor.push(normalizarPedidoServidor(datos.pedido));
      sincronizados += 1;
      apiDisponible = true;
    } catch (error) {
      apiDisponible = false;
      pendientesRestantes.push(pedido);
    }
  }

  pedidosPendientes = pendientesRestantes;
  guardarPendientes();
  sincronizando = false;

  renderPedidos();
  actualizarEstadoConexion();

  if (sincronizados > 0) {
    // Refresca el historial para que coincida con lo que realmente guardo el servidor.
    await cargarPedidos();
    mostrarMensaje(`${sincronizados} pedido(s) sincronizado(s) con el servidor.`, 'ok');
    if (manual) {
      await cargarClientes();
      await cargarAlertas();
    }
  } else if (manual) {
    mostrarMensaje('No se pudo conectar con el servidor. Los pedidos siguen guardados localmente.', 'aviso');
  }
}

function actualizarEstadoConexion() {
  const pendientes = pedidosPendientes.length;
  const online = navigator.onLine;

  badgeEstado.classList.remove('badge-online', 'badge-offline', 'badge-pendiente');

  if (!online) {
    badgeEstado.textContent = `Offline · ${pendientes} guardado${pendientes === 1 ? '' : 's'}`;
    badgeEstado.classList.add('badge-offline');
  } else if (pendientes > 0) {
    badgeEstado.textContent = apiDisponible
      ? `En línea · ${pendientes} por sincronizar`
      : `API no disponible · ${pendientes} pendiente${pendientes === 1 ? '' : 's'}`;
    badgeEstado.classList.add('badge-pendiente');
  } else if (!apiDisponible) {
    badgeEstado.textContent = 'API no disponible · modo local';
    badgeEstado.classList.add('badge-pendiente');
  } else {
    badgeEstado.textContent = 'En línea · Offline Ready';
    badgeEstado.classList.add('badge-online');
  }

  if (pendientes > 0) {
    syncBanner.classList.remove('hidden');
    syncBanner.classList.add('flex');
    syncMensaje.textContent = `${pendientes} pedido${pendientes === 1 ? '' : 's'} guardado${pendientes === 1 ? '' : 's'} en este navegador.`;
  } else {
    syncBanner.classList.add('hidden');
    syncBanner.classList.remove('flex');
  }

  btnSincronizar.disabled = sincronizando || !online || pendientes === 0;
  btnSincronizar.textContent = sincronizando ? 'Sincronizando...' : 'Sincronizar ahora';
}

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------

selectSucursal.addEventListener('change', cargarAlertas);
inputCliente.addEventListener('input', actualizarCredito);
inputMonto.addEventListener('input', () => {
  actualizarComision();
  actualizarCredito();
});

formPedido.addEventListener('submit', async (evento) => {
  evento.preventDefault();

  const clienteNombre = inputCliente.value.trim();
  const montoTotal = Number(inputMonto.value);
  const credito = evaluarCredito();

  if (!clienteNombre || !Number.isFinite(montoTotal) || montoTotal <= 0) return;

  const sucursal = credito.cliente?.sucursal
    || (selectSucursal.value !== 'Todas' ? selectSucursal.value : 'Jujuy');

  const pedido = {
    idLocal: `local-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    cliente: clienteNombre,
    sucursal,
    montoTotal,
    comisionGanada: Number((montoTotal * COMISION_PREVENTISTA).toFixed(2)),
    origenOffline: !navigator.onLine,
    estado: credito.excede ? 'Pendiente_Credito' : 'Aprobado',
    fecha: new Date().toISOString()
  };

  btnSubmit.disabled = true;
  btnSubmit.textContent = 'Enviando...';

  try {
    if (!navigator.onLine) throw new Error('Sin conexión');

    const datos = await fetchJSON(`${API_URL}/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente: pedido.cliente,
        sucursal: pedido.sucursal,
        montoTotal: pedido.montoTotal,
        origenOffline: pedido.origenOffline,
        estado: pedido.estado,
        idLocal: pedido.idLocal
      })
    });

    pedidosServidor.push(normalizarPedidoServidor(datos.pedido));
    apiDisponible = true;
    mostrarMensaje('Pedido registrado correctamente.', 'ok');
  } catch (error) {
    apiDisponible = false;
    pedidosPendientes.unshift({ ...pedido, origenOffline: true });
    guardarPendientes();
    mostrarMensaje('Sin conexión: el pedido quedó guardado localmente y se sincronizará al volver el servidor.', 'aviso');
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Confirmar y Enviar Pedido';
    formPedido.reset();
    actualizarComision();
    actualizarCredito();
    renderPedidos();
    actualizarEstadoConexion();
  }
});

btnSincronizar.addEventListener('click', () => intentarSincronizar(true));

window.addEventListener('online', async () => {
  mostrarMensaje('Conexión restablecida. Sincronizando pedidos...', 'ok');
  await cargarClientes();
  await cargarAlertas();
  await cargarPedidos();
  await intentarSincronizar(false);
});

window.addEventListener('offline', () => {
  apiDisponible = false;
  actualizarEstadoConexion();
  mostrarMensaje('Sin conexión: los pedidos se guardarán en este navegador.', 'aviso');
});

// Reintento automático: sirve tanto si se cae internet como si se reinicia el servidor.
setInterval(() => {
  if (!navigator.onLine) return;

  if (pedidosPendientes.length) {
    intentarSincronizar(false);
    return;
  }

  if (!apiDisponible) {
    cargarClientes();
    cargarAlertas();
    cargarPedidos();
  }
}, 15000);

// ---------------------------------------------------------------------------
// Inicio
// ---------------------------------------------------------------------------

async function iniciar() {
  actualizarComision();
  actualizarCredito();
  renderPedidos();
  actualizarEstadoConexion();

  await cargarClientes();
  await cargarAlertas();
  await cargarPedidos();

  if (pedidosPendientes.length) {
    await intentarSincronizar(false);
  }
}

iniciar();
