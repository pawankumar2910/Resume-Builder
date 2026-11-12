import { createStaticServer } from './server.mjs';
const port = Number(process.env.PORT || 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error('PORT must be an integer from 1 to 65535.');
const server = createStaticServer();
server.on('error', (error) => {
  console.error(
    error.code === 'EADDRINUSE'
      ? `Port ${port} is in use. Set PORT to another value.`
      : error.message,
  );
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => console.log(`Folio: http://127.0.0.1:${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
