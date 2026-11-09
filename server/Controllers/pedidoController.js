import mongoose from 'mongoose';
import Pedido from '../models/Pedido.js';

// Cola en memoria para la demo cuando MongoDB no esta disponible.
const pedidosMock = [];
const COMISION_PREVENTISTA = 0.05;
const ESTADOS_VALIDOS = ['Aprobado', 'Pendiente_Credito'];

const normalizarPedido = (body = {}) => {
  const cliente = String(body.cliente || '').trim();
  const montoTotal = Number(body.montoTotal);

  if (!cliente) throw new Error('El nombre del cliente es obligatorio');
  if (!Number.isFinite(montoTotal) || montoTotal <= 0) {
    throw new Error('El monto total debe ser un numero mayor a cero');
  }

  return {
    cliente,
    sucursal: String(body.sucursal || 'Jujuy').trim(),
    montoTotal,
    // La comision se calcula en el servidor: no se confia en el valor del navegador.
    comisionGanada: Number((montoTotal * COMISION_PREVENTISTA).toFixed(2)),
    origenOffline: Boolean(body.origenOffline),
    estado: ESTADOS_VALIDOS.includes(body.estado) ? body.estado : 'Aprobado',
    idLocal: body.idLocal ? String(body.idLocal) : null
  };
};

export const getPedidos = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const pedidos = await Pedido.find().sort({ createdAt: -1 }).limit(50);
      if (pedidos.length) return res.json(pedidos);
    }
  } catch (error) {
    // Si falla MongoDB se responde con la cola en memoria.
  }

  res.json(pedidosMock);
};

export const crearPedido = async (req, res) => {
  try {
    const datos = normalizarPedido(req.body);

    // Evita duplicados cuando el navegador reintenta sincronizar un pedido offline.
    if (datos.idLocal) {
      const yaExisteEnMemoria = pedidosMock.find((pedido) => pedido.idLocal === datos.idLocal);
      if (yaExisteEnMemoria) {
        return res.status(200).json({ mensaje: 'Pedido ya sincronizado', pedido: yaExisteEnMemoria });
      }

      if (mongoose.connection.readyState === 1) {
        const yaExisteEnDB = await Pedido.findOne({ idLocal: datos.idLocal });
        if (yaExisteEnDB) {
          return res.status(200).json({ mensaje: 'Pedido ya sincronizado', pedido: yaExisteEnDB });
        }
      }
    }

    if (mongoose.connection.readyState === 1) {
      const creado = await Pedido.create(datos);
      const pedido = creado.toObject();
      pedidosMock.unshift(pedido);
      return res.status(201).json({ mensaje: 'Pedido registrado', pedido });
    }

    const pedido = { id: Date.now().toString(), ...datos, fecha: new Date().toISOString() };
    pedidosMock.unshift(pedido);
    res.status(201).json({ mensaje: 'Pedido registrado en modo demo', pedido });
  } catch (error) {
    res.status(400).json({ mensaje: error.message || 'Error al registrar el pedido' });
  }
};
