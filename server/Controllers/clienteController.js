import Cliente from '../models/Cliente.js';

// Datos de prueba para poder mostrar la demo sin MongoDB corriendo.
const clientesMock = [
  { _id: '1', nombre: 'Comercial Jujuy Central', sucursal: 'Jujuy', diasSinComprar: 21, promedioHistoricoDias: 7, limiteCredito: 200000, deudaActual: 45000, deudaVencida: false },
  { _id: '2', nombre: 'Autoservicio El Carmen', sucursal: 'Jujuy', diasSinComprar: 14, promedioHistoricoDias: 7, limiteCredito: 100000, deudaActual: 0, deudaVencida: false },
  { _id: '3', nombre: 'Distribuidora Salta Norte', sucursal: 'Salta', diasSinComprar: 3, promedioHistoricoDias: 7, limiteCredito: 350000, deudaActual: 12000, deudaVencida: false },
  { _id: '4', nombre: 'Mercado Salta Centro', sucursal: 'Salta', diasSinComprar: 18, promedioHistoricoDias: 7, limiteCredito: 120000, deudaActual: 105000, deudaVencida: true },
  { _id: '5', nombre: 'Distribuidora Tucumán Sur', sucursal: 'Tucumán', diasSinComprar: 28, promedioHistoricoDias: 10, limiteCredito: 250000, deudaActual: 230000, deudaVencida: false },
  { _id: '6', nombre: 'Almacén Tucumán Norte', sucursal: 'Tucumán', diasSinComprar: 9, promedioHistoricoDias: 6, limiteCredito: 90000, deudaActual: 20000, deudaVencida: false }
];

const normalizarSucursal = (sucursal) => (sucursal && sucursal !== 'Todas' ? sucursal : null);

const filtrarPorSucursal = (lista, sucursal) => {
  const filtro = normalizarSucursal(sucursal);
  return filtro ? lista.filter((cliente) => cliente.sucursal === filtro) : lista;
};

// Regla determinista: DiasSinComprar > (PromedioHistorico + 5 dias)
const esClienteDormido = (cliente) => cliente.diasSinComprar > (cliente.promedioHistoricoDias + 5);

export const getClientes = async (req, res) => {
  const { sucursal } = req.query;

  try {
    const query = normalizarSucursal(sucursal) ? { sucursal } : {};
    const clientes = await Cliente.find(query);

    // Si MongoDB esta vacio o no disponible, la demo usa los datos mock.
    res.json(clientes.length ? clientes : filtrarPorSucursal(clientesMock, sucursal));
  } catch (error) {
    res.json(filtrarPorSucursal(clientesMock, sucursal));
  }
};

export const getClientesDormidos = async (req, res) => {
  const { sucursal } = req.query;

  try {
    const query = normalizarSucursal(sucursal) ? { sucursal } : {};
    const clientes = await Cliente.find(query);
    const base = clientes.length ? clientes : filtrarPorSucursal(clientesMock, sucursal);

    res.json(base.filter(esClienteDormido));
  } catch (error) {
    res.json(filtrarPorSucursal(clientesMock, sucursal).filter(esClienteDormido));
  }
};
