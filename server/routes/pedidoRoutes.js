import express from 'express';
import { getPedidos, crearPedido } from '../Controllers/pedidoController.js';

const router = express.Router();

router.get('/', getPedidos);
router.post('/', crearPedido);

export default router;