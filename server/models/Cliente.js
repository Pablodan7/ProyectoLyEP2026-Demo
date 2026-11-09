import mongoose from 'mongoose';

const clienteSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  sucursal: { type: String, required: true },
  diasSinComprar: { type: Number, default: 0 },
  promedioHistoricoDias: { type: Number, default: 7 },
  limiteCredito: { type: Number, default: 150000 },
  deudaActual: { type: Number, default: 0 },
  deudaVencida: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('Cliente', clienteSchema);