import { useState } from 'react';
import { FormTarea, type Edicion } from './componentes/FormTarea';
import { ProveedorDatos, useDatos } from './estado/datos';
import { Ajustes } from './pantallas/Ajustes';
import { Calendario } from './pantallas/Calendario';
import { Hoy } from './pantallas/Hoy';
import { Proyectos } from './pantallas/Proyectos';
import { Tareas } from './pantallas/Tareas';

type Pantalla = 'hoy' | 'calendario' | 'tareas' | 'proyectos' | 'ajustes';

const PESTANAS: { id: Pantalla; nombre: string }[] = [
  { id: 'hoy', nombre: 'Hoy' },
  { id: 'calendario', nombre: 'Calendario' },
  { id: 'tareas', nombre: 'Tareas' },
  { id: 'proyectos', nombre: 'Proyectos' },
  { id: 'ajustes', nombre: 'Ajustes' },
];

export default function App() {
  return (
    <ProveedorDatos>
      <Contenido />
    </ProveedorDatos>
  );
}

function Contenido() {
  const { estado, aviso, cerrarAviso, datos, recargar } = useDatos();
  const [pantalla, setPantalla] = useState<Pantalla>('hoy');
  const [edicion, setEdicion] = useState<Edicion | null>(null);
  const forzarAjustes = estado === 'sin-config' || estado === 'error-token';
  const actual: Pantalla = forzarAjustes ? 'ajustes' : pantalla;
  const editar = (e: Edicion) => setEdicion(e);

  return (
    <div className="app">
      <header className="cabecera">
        <h1>Segundo cerebro</h1>
        {estado === 'cargando' && <span className="cargando">Cargando…</span>}
      </header>
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
      <main>
        {actual === 'hoy' && <Hoy editar={editar} />}
        {actual === 'calendario' && <Calendario editar={editar} />}
        {actual === 'tareas' && <Tareas editar={editar} />}
        {actual === 'proyectos' && <Proyectos editar={editar} />}
        {actual === 'ajustes' && <Ajustes />}
      </main>
      <nav className="navegacion">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            className={actual === p.id ? 'activa' : ''}
            disabled={forzarAjustes && p.id !== 'ajustes'}
            onClick={() => setPantalla(p.id)}
          >
            {p.nombre}
          </button>
        ))}
      </nav>
      {edicion && <FormTarea edicion={edicion} cerrar={() => setEdicion(null)} />}
    </div>
  );
}
