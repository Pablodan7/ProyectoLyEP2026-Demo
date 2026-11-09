# DistriCRM NOA - Demo

Prototipo visual de CRM para distribuidoras del NOA. Combina un panel gerencial de retención de clientes con una terminal de preventa que funciona también sin conexión.

> Este proyecto es una **demo de idea de negocio**, no un sistema listo para producción.

## Funcionalidades

- **Alertas de retención:** detecta clientes dormidos con la regla `díasSinComprar > promedioHistórico + 5`.
- **Filtro multi-sucursal:** permite ver las alertas de Jujuy, Salta, Tucumán o todas juntas.
- **Terminal de preventa:** carga pedidos y calcula la comisión del preventista (5%).
- **Validación de crédito:** compara el monto del pedido con el límite y la deuda del cliente. Si se supera, el pedido queda como `Pendiente_Credito`.
- **Modo offline:** si la API no responde, los pedidos se guardan en `localStorage` y se sincronizan automáticamente al volver el servidor. También hay un botón manual "Sincronizar ahora".

## Estructura

```
client/                 Frontend estático (HTML + JS vanilla + Tailwind CDN)
server/
  index.js              Servidor Express
  config/db.js          Conexión a MongoDB con fallback a modo demo
  models/               Esquemas Mongoose
  Controllers/          Lógica de clientes y pedidos
  routes/               Rutas REST
```

## Requisitos

- Node.js 18 o superior.
- MongoDB es **opcional**. Si no está corriendo, la API usa datos mock y una cola de pedidos en memoria.

## Ejecutar

```bash
cd server
npm install
npm run dev
```

Abrir <http://localhost:3001>.

Si se quiere usar MongoDB, definir la variable antes de arrancar:

```bash
MONGO_URI=mongodb://127.0.0.1:27017/districrm_noa npm run dev
```

En PowerShell:

```powershell
$env:MONGO_URI="mongodb://127.0.0.1:27017/districrm_noa"; npm run dev
```

## API

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/clientes` | Lista de clientes (acepta `?sucursal=Jujuy`) |
| GET | `/api/clientes/dormidos` | Clientes en riesgo (acepta `?sucursal=Salta`) |
| GET | `/api/pedidos` | Últimos pedidos |
| POST | `/api/pedidos` | Crea un pedido y calcula la comisión en el servidor |

## Notas de la demo

- Sin MongoDB, los datos de clientes son mock y los pedidos viven en memoria del proceso.
- Los pedidos offline se guardan en el navegador con la clave `districrm_pedidos_pendientes`.
- La sincronización se reintenta cada 15 segundos y al recuperar la conexión.
