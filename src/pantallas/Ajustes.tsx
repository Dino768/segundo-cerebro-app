import { useState, type FormEvent } from 'react';
import { useDatos } from '../estado/datos';

export function Ajustes() {
  const { config, conectar, desconectar, estado } = useDatos();
  const [owner, setOwner] = useState(config?.owner ?? '');
  const [repo, setRepo] = useState(config?.repo ?? 'my-context');
  const [token, setToken] = useState('');
  const necesitaToken = !config || estado === 'error-token';

  function enviar(e: FormEvent) {
    e.preventDefault();
    conectar({ owner: owner.trim(), repo: repo.trim(), token: token.trim() || config?.token || '' });
    setToken('');
  }

  return (
    <section className="ajustes">
      <h2>Ajustes</h2>
      {estado === 'error-token' && (
        <p className="banner error">La llave de GitHub no funciona (puede que haya caducado o que esté mal copiada). Pega una nueva.</p>
      )}
      {estado === 'sin-config' && (
        <p>Para empezar, conecta la app con tu repositorio <code>my-context</code> de GitHub.</p>
      )}
      <form onSubmit={enviar}>
        <label>
          Usuario de GitHub
          <input value={owner} onChange={(e) => setOwner(e.target.value)} required autoComplete="username" />
        </label>
        <label>
          Repositorio
          <input value={repo} onChange={(e) => setRepo(e.target.value)} required />
        </label>
        <label>
          Llave (token){!necesitaToken && ': déjalo vacío para mantener la actual'}
          <input type="password" value={token} onChange={(e) => setToken(e.target.value)} required={necesitaToken} autoComplete="off" />
        </label>
        <button type="submit">Guardar y conectar</button>
      </form>
      <details>
        <summary>¿Cómo creo la llave?</summary>
        <ol>
          <li>
            Entra en{' '}
            <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">
              github.com/settings/personal-access-tokens/new
            </a>
            .
          </li>
          <li>En «Repository access» elige «Only select repositories» y marca <code>my-context</code>.</li>
          <li>En «Permissions», busca «Contents» y elige «Read and write».</li>
          <li>Pulsa «Generate token», copia la llave y pégala aquí.</li>
        </ol>
      </details>
      {config && (
        <button className="peligro" onClick={() => confirm('¿Olvidar la llave en este dispositivo?') && desconectar()}>
          Olvidar la llave en este dispositivo
        </button>
      )}
    </section>
  );
}
