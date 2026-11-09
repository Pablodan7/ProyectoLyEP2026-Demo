import Pedido from '../models/Pedido.js';

const pedidosMock = [];

export const getPedidos = async (req, res) => {
  res.json(pedidosMock);
};

export const crearPedido = async (req, res) => {
  const { cliente, sucursal, montoTotal, comisionGanada, origenOffline } = req.body;
  
  const nuevoPedido = {
    id: Date.now().toString(),
    cliente,
    sucursal,
    montoTotal,
    comisionGanada,
    origenOffline: origenOffline || false,
    estado: 'Aprobado',
    fecha: new Date().toISOString()
  };

  pedidosMock.unshift(nuevoPedido);
  res.status(201).json({ mensaje: 'Pedido registrado con éxito', pedido: nuevoPedido });
};