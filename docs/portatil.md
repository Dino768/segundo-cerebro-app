# Zona de estudio en el portátil

Para tener el chat y la pizarra en el portátil, se necesitan los mismos programas que en el PC. Solo hay que hacerlo una vez.

1. **Node.js**: instala la versión LTS (24 o más nueva) desde https://nodejs.org.
2. **Git**: instálalo desde https://git-scm.com (con las opciones por defecto).
3. **Claude Code**: abre PowerShell y escribe:
   ```powershell
   irm https://claude.ai/install.ps1 | iex
   ```
   Después escribe `claude`, inicia sesión con tu cuenta de Claude y sal con `/exit`.
4. **Los dos repositorios**, en el Escritorio y uno al lado del otro:
   ```powershell
   cd $HOME\Desktop
   git clone https://github.com/Dino768/my-context.git
   git clone https://github.com/Dino768/segundo-cerebro-app.git
   cd segundo-cerebro-app
   npm install
   ```
5. **Arrancarlo** (cada vez que quieras estudiar):
   ```powershell
   cd $HOME\Desktop\segundo-cerebro-app
   npm run local
   ```
   Abre http://127.0.0.1:5174/segundo-cerebro-app/.

   Más cómodo: haz un acceso directo en el escritorio a `segundo-cerebro-app\scripts\zona-de-estudio.bat`. Con doble clic cierra la zona de estudio que siguiera abierta, la arranca y abre el navegador.
6. **La primera vez, la llave de GitHub**: crea un token nuevo para este portátil (solo `my-context`, permiso *Contents* de lectura y escritura, 90 días) y pégalo en Ajustes. Nunca lo pegues en el chat.

Las conversaciones y las pizarras en curso del portátil se quedan en el portátil. El historial de pizarras, las asignaturas, las tareas y todo lo demás se comparten con el PC y el móvil.
