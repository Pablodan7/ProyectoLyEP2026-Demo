import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/districrm_noa');
    console.log(`🟢 MongoDB Conectado: ${conn.connection.host}`);
  } catch (error) {
    console.error(`🔴 Error de conexión a DB: ${error.message}`);
    console.log('⚠️ Ejecutando en modo memoria local temporal...');
  }
};