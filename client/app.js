const API_URL = 'http://localhost:3001/api';

// Elementos del DOM
const alertasContainer = document.getElementById('alertas-container');
const formPedido = document.getElementById('form-pedido');
const inputCliente = document.getElementById('input-cliente');
const inputMonto = document.getElementById('input-monto');
const comisionPreview = document.getElementById('comision-preview');
const listaPedidos = document.getElementById('lista-pedidos');

// 1. Cargar Alertas de Clientes Dormidos desde el Backend
async function cargarAlertas() {
  try {
    const res = await fetch(`${API_URL}/clientes/dormidos`);
    const clientes = await res.json();

    if (!clientes.length) {
      alertasContainer.innerHTML = `<p class="text-sm text-gray-500">No hay clientes en riesgo de fuga actualmente.</p>`;
      return;
    }

    alertasContainer.innerHTML = clientes.map(c => `
      <div class="p-3 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex justify-between items-center">
        <div>
          <h3 class="font-bold text-sm text-red-900">${c.nombre}</h3>
          <p class="text-xs text-red-700">Días sin pedir: <strong>${c.diasSinComprar} días</strong> (Promedio: ${c.promedioHistoricoDias} días)</p>
        </div>
        <button onclick="asignarVisita('${c.nombre}')" class="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded shadow">
          Asignar Visita
        </button>
      </div>
    `).join('');
  } catch (error) {
    alertasContainer.innerHTML = `<p class="text-xs text-red-500">Error de conexión con la API de alertas.</p>`;
  }
}

// 2. Calcular comisión en tiempo real (Incentivo del Preventista)
inputMonto.addEventListener('input', () => {
  const monto = parseFloat(inputMonto.value) || 0;
  const comision = monto * 0.05; // 5% de comisión
  comisionPreview.textContent = `$${comision.toLocaleString('es-AR')} ARS`;
});

// 3. Registrar nuevo pedido
formPedido.addEventListener('submit', async (e) => {
  e.preventDefault();

  const cliente = inputCliente.value;
  const montoTotal = parseFloat(inputMonto.value);
  const comisionGanada = montoTotal * 0.05;

  try {
    const res = await fetch(`${API_URL}/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente,
        sucursal: 'Jujuy',
        montoTotal,
        comisionGanada,
        origenOffline: false
      })
    });

    const data = await res.json();
    agregarPedidoALista(data.pedido);

    // Limpiar formulario
    formPedido.reset();
    comisionPreview.textContent = '$0 ARS';
  } catch (error) {
    alert('Error al registrar pedido');
  }
});

function agregarPedidoALista(pedido) {
  const primerItem = listaPedidos.querySelector('.italic');
  if (primerItem) primerItem.remove();

  const li = document.createElement('li');
  li.className = 'p-2 bg-gray-50 rounded border flex justify-between items-center text-xs';
  li.innerHTML = `
    <div>
      <span class="font-bold text-gray-800">${pedido.cliente}</span>
      <span class="text-gray-500 block">$${pedido.montoTotal.toLocaleString('es-AR')} ARS</span>
    </div>
    <span class="font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
      Comisión: +$${pedido.comisionGanada.toLocaleString('es-AR')}
    </span>
  `;
  listaPedidos.prepend(li);
}

function asignarVisita(nombreCliente) {
  inputCliente.value = nombreCliente;
  inputMonto.focus();
}

// Inicializar
cargarAlertas();