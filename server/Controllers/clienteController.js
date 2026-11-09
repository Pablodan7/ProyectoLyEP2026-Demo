import Cliente from '../models/Cliente.js';

// Datos de prueba mock en caso de no tener MongoDB local corriendo aún
const clientesMock = [
  { _id: '1', nombre: 'Comercial Jujuy Central', sucursal: 'Jujuy', diasSinComprar: 21, promedioHistoricoDias: 7, limiteCredito: 200000, deudaActual: 45000, deudaVencida: false },
  { _id: '2', nombre: 'Autoservicio El Carmen', sucursal: 'Jujuy', diasSinComprar: 14, promedioHistoricoDias: 7, limiteCredito: 100000, deudaActual: 0, deudaVencida: false },
  { _id: '3', nombre: 'Distribuidora Salta Norte', sucursal: 'Salta', diasSinComprar: 3, promedioHistoricoDias: 7, limiteCredito: 350000, deudaActual: 12000, deudaVencida: false }
];

export const getClientes = async (req, res) => {
  try {
    const clientes = await Cliente.find();
    res.json(clientes.length ? clientes : clientesMock);
  } catch (error) {
    res.json(clientesMock);
  }
};

export const getClientesDormidos = async (req, res) => {
  try {
    // Regla Determinista: DiasSinComprar > (PromedioHistorico + 5 días)
    const dormidos = clientesMock.filter(c => c.diasSinComprar > (c.promedioHistoricoDias + 5));
    res.json(dormidos);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al filtrar clientes dormidos' });
  }
};