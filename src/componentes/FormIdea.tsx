import { useState, type FormEvent } from 'react';
import { anadirIdea, editarIdea, quitarIdea } from '../agenda/ideas';
import type { Idea, IdeaSinId } from '../datos/ideas';
import { useDatos } from '../estado/datos';
import { confirmar } from '../estado/dialogos';
import { useHoy } from '../estado/hoy';
import { iconoAlEscribir, iconoPara } from '../iconos/diccionario';
import { SelectorArea } from './SelectorArea';
import { SelectorIcono } from './SelectorIcono';

interface Props {
  idea?: Idea;
  inicial?: Partial<IdeaSinId>;
  cerrar(): void;
  // Se llama solo si se guarda bien, antes de cerrar (p. ej. para vaciar la captura rápida que la originó).
  alGuardar?(): void;
}

export function FormIdea({ idea, inicial = {}, cerrar, alGuardar }: Props) {
  const { datos, cambiarIdeas } = useDatos();
  const hoy = useHoy();
  const base = idea ?? inicial;
  const [titulo, setTitulo] = useState(base.titulo ?? '');
  const [texto, setTexto] = useState(base.texto ?? '');
  const [area, setArea] = useState(base.area ?? '');
  const [proyecto, setProyecto] = useState(base.proyecto ?? '');
  const [icono, setIcono] = useState(base.icono ?? iconoPara(`${base.titulo ?? ''} ${base.texto ?? ''}`));
  const [fijado, setFijado] = useState(Boolean(base.icono));
  const [guardando, setGuardando] = useState(false);

  // El icono se sugiere con el título y, si no hay título, con el texto.
  const sugerir = (t: string, x: string) => setIcono((i) => iconoAlEscribir(`${t} ${x}`, i, fijado));

  function elegirProyecto(id: string) {
    setProyecto(id);
    const a = datos.proyectos.find((p) => p.id === id)?.area;
    if (a) setArea(a);
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    const editada: IdeaSinId = {
      fecha: idea?.fecha ?? hoy,
      texto,
      titulo: titulo || undefined,
      icono,
      area: area || undefined,
      proyecto: proyecto || undefined,
    };
    const nombre = titulo.trim() || texto.trim().split('\n')[0];
    setGuardando(true);
    const ok = await cambiarIdeas(
      (is) => (idea ? editarIdea(is, idea, editada) : anadirIdea(is, editada)),
      `${idea ? 'Editar' : 'Apuntar'} idea: ${nombre}`,
    );
    setGuardando(false);
    if (ok) {
      alGuardar?.();
      cerrar();
    }
  }

  async function borrar() {
    if (!idea || !(await confirmar('¿Borrar esta idea?', { aceptar: 'Borrar', peligro: true }))) return;
    setGuardando(true);
    const ok = await cambiarIdeas((is) => quitarIdea(is, idea.id), `Borrar idea: ${titulo || texto.split('\n')[0]}`);
    setGuardando(false);
    if (ok) cerrar();
  }

  return (
    <div className="fondo-modal">
      <form className="modal" onSubmit={(e) => void guardar(e)}>
        <h2>{idea ? 'Editar idea' : 'Nueva idea'}</h2>
        <div className="campo-titulo">
          <SelectorIcono icono={icono} elegir={(i) => { setIcono(i); setFijado(true); }} />
          <label>
            Título
            <input value={titulo} placeholder="(opcional)" maxLength={120} onChange={(e) => { setTitulo(e.target.value); sugerir(e.target.value, texto); }} />
          </label>
        </div>
        <label>
          Idea
          <textarea value={texto} rows={5} required autoFocus onChange={(e) => { setTexto(e.target.value); sugerir(titulo, e.target.value); }} />
        </label>
        <div className="fila-campos">
          <label>
            Área
            <SelectorArea areas={datos.areas} valor={area} cambiar={setArea} ninguna="(ninguna)" />
          </label>
          <label>
            Proyecto
            <select value={proyecto} onChange={(e) => elegirProyecto(e.target.value)} aria-label="Proyecto">
              <option value="">(ninguno)</option>
              {datos.proyectos.map((p) => (
                <option key={p.id} value={p.id}>{p.titulo}</option>
              ))}
              {proyecto && !datos.proyectos.some((p) => p.id === proyecto) && <option value={proyecto}>{proyecto}</option>}
            </select>
          </label>
        </div>
        <div className="botones">
          <button type="submit" className="activa" disabled={guardando || !texto.trim()}>Guardar</button>
          {idea && <button type="button" className="peligro" disabled={guardando} onClick={() => void borrar()}>Borrar</button>}
          <button type="button" onClick={cerrar}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}
