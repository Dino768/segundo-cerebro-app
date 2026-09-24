import { useState, type FormEvent } from 'react';
import { URL_USO_CLAUDE } from '../componentes/navegacion';
import { useDatos } from '../estado/datos';
import { confirmar } from '../estado/dialogos';

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
      <div className="barra"><h2>Ajustes</h2></div>
      {estado === 'error-token' && (
        <p className="banner error">La llave de GitHub no funciona (puede que haya caducado o que esté mal copiada). Pega una nueva.</p>
      )}
      {estado === 'sin-config' && (
        <p>Para empezar, conecta la app con tu repositorio <code>my-context</code> de GitHub.</p>
      )}
      <div className="tarjeta">
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
          <button type="submit" className="principal">Guardar y conectar</button>
        </form>
      </div>
      <details className="tarjeta">
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
          <li>En «Expiration» elige 90 días o menos.</li>
          <li>Pulsa «Generate token», copia la llave y pégala aquí.</li>
        </ol>
        <p>
          <strong>Cuidado:</strong> la llave se guarda en este navegador, y cualquier otra web que publiques con GitHub
          Pages en <code>dino768.github.io</code> (un juego, un portfolio…) podría leerla. Usa llaves que caduquen pronto
          y no publiques ahí webs con código de otros.
        </p>
      </details>
      <p className="solo-movil">
        <a href={URL_USO_CLAUDE} target="_blank" rel="noreferrer">📊 Ver el uso de Claude</a>
      </p>
      {config && (
        <button className="peligro" onClick={() => void confirmar('¿Olvidar la llave en este dispositivo?', { aceptar: 'Olvidar', peligro: true }).then((si) => si && desconectar())}>
          Olvidar la llave en este dispositivo
        </button>
      )}
    </section>
  );
}
