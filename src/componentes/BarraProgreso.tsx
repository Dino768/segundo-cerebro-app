export function BarraProgreso({ hechas, total }: { hechas: number; total: number }) {
  if (total === 0) return <span className="progreso-texto">Sin tareas todavía</span>;
  return (
    <span className="progreso">
      <span className="progreso-barra" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={hechas}>
        <span style={{ width: `${(hechas / total) * 100}%` }} />
      </span>
      <span className="progreso-texto">
        {hechas} de {total} tareas
      </span>
    </span>
  );
}
