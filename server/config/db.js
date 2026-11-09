import mongoose from 'mongoose';

// Si MongoDB no esta disponible, las consultas fallan rapido y la demo usa los mocks.
mongoose.set('bufferCommands', false);

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/districrm_noa',
      { serverSelectionTimeoutMS: 3000 }
    );
    console.log(`MongoDB conectado: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error de conexion a DB: ${error.message}`);
    console.log('Ejecutando en modo demo (datos en memoria).');
  }
};
