import mongoose from 'mongoose';

const pedidoSchema = new mongoose.Schema({
  cliente: { type: String, required: true },
  sucursal: { type: String, required: true },
  montoTotal: { type: Number, required: true },
  comisionGanada: { type: Number, required: true },
  origenOffline: { type: Boolean, default: false },
  estado: { type: String, enum: ['Aprobado', 'Pendiente_Credito'], default: 'Aprobado' },
  // Identificador generado por el navegador para poder sincronizar sin duplicar.
  idLocal: { type: String, default: null, index: true }
}, { timestamps: true });

export default mongoose.model('Pedido', pedidoSchema);
