import { useState } from 'react';
import { FormTarea, type Edicion } from './componentes/FormTarea';
import { Lateral } from './componentes/Lateral';
import { MenuMovil } from './componentes/MenuMovil';
import type { Destino } from './componentes/navegacion';
import { ProveedorDatos, useDatos } from './estado/datos';
import { Ajustes } from './pantallas/Ajustes';
import { Calendario } from './pantallas/Calendario';
import { Inicio } from './pantallas/Inicio';
import { Proyectos } from './pantallas/Proyectos';
import { Tareas } from './pantallas/Tareas';

export default function App() {
  return (
    <ProveedorDatos>
      <Contenido />
    </ProveedorDatos>
  );
}

function Contenido() {
  const { estado, aviso, cerrarAviso, datos, recargar } = useDatos();
  const [destino, setDestino] = useState<Destino>({ pantalla: 'inicio' });
  // Cuenta las veces que se navega: sirve de `key` para abrir de nuevo una pantalla aunque sea la misma.
  const [visita, setVisita] = useState(0);
  const [edicion, setEdicion] = useState<Edicion | null>(null);
  const forzarAjustes = estado === 'sin-config' || estado === 'error-token';
  const actual = forzarAjustes ? 'ajustes' : destino.pantalla;
  const editar = (e: Edicion) => setEdicion(e);
  const ir = (d: Destino) => {
    setDestino(d);
    setVisita((v) => v + 1);
    window.scrollTo(0, 0);
  };

  return (
    <div className="app">
      <Lateral actual={actual} ir={ir} bloqueado={forzarAjustes} />
      <main>
        {estado === 'cargando' && <p className="cargando">Cargando…</p>}
        {estado === 'sin-conexion' && (
          <div className="banner aviso">
            Sin conexión: estás viendo los últimos datos guardados y no puedes hacer cambios.
            <button onClick={() => void recargar()}>Reintentar</button>
          </div>
        )}
        {aviso && (
          <div className="banner error">
            {aviso} <button onClick={cerrarAviso}>Cerrar</button>
          </div>
        )}
        {datos.errores.map((e) => (
          <div key={e.archivo} className="banner error">
            Error en <code>{e.archivo}</code>: {e.message}. No se puede editar este archivo hasta que se arregle (pídeselo a Claude).
          </div>
        ))}
        {actual === 'inicio' && <Inicio editar={editar} ir={ir} />}
        {actual === 'calendario' && <Calendario key={visita} editar={editar} />}
        {actual === 'tareas' && <Tareas editar={editar} />}
        {actual === 'proyectos' && <Proyectos key={visita} editar={editar} abiertoInicial={destino.proyecto} />}
        {actual === 'ideas' && <p className="vacio">Ideas: llega en la Task 11.</p>}
        {actual === 'ajustes' && <Ajustes />}
      </main>
      <MenuMovil actual={actual} ir={ir} bloqueado={forzarAjustes} />
      {edicion && <FormTarea edicion={edicion} cerrar={() => setEdicion(null)} />}
    </div>
  );
}
