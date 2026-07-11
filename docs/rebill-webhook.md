# Webhook de Rebill para Tienda

La Tienda verifica el pago con la API de Rebill antes de descontar stock. El webhook suma confirmación para pagos que se acreditan después de cerrar el checkout, como transferencia o efectivo.

Antes de publicar la versión que incluye `app/api/rebill/webhook/[secret]`, configurar en el entorno de producción:

```text
REBILL_WEBHOOK_SECRET=<secreto-aleatorio-largo>
```

Luego, en Rebill > Developer Center > Webhooks, crear un webhook HTTPS con la URL:

```text
https://pasito.app/api/rebill/webhook/<el-mismo-secreto>
```

Seleccionar estos eventos:

- `payment.created`
- `payment.updated`

Por último, usar la opción **Test** del webhook de Rebill con un pago `approved`. El endpoint vuelve a consultar el pago en Rebill antes de registrar la orden, por lo que el webhook funciona como notificación y no como fuente de verdad.
