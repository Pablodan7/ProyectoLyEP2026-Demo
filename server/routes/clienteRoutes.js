import express from 'express';
import { getClientes, getClientesDormidos } from '../Controllers/clienteController.js';

const router = express.Router();

router.get('/', getClientes);
router.get('/dormidos', getClientesDormidos);

export default router;