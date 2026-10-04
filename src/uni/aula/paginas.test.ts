import { describe, expect, it } from 'vitest';
import { esPaginaDeEntrada, leerSesskey } from './paginas.ts';

describe('entrada', () => {
  it('reconoce la página de entrada de la URJC y la de Moodle', () => {
    expect(esPaginaDeEntrada('https://identifica.urjc.es/CAS/login?service=x')).toBe(true);
    expect(esPaginaDeEntrada('https://www.aulavirtual.urjc.es/moodle/login/index.php')).toBe(true);
    expect(esPaginaDeEntrada('https://www.aulavirtual.urjc.es/moodle/my/')).toBe(false);
  });
  it('saca la sesskey de una página', () => {
    expect(leerSesskey('<script>M.cfg = {"wwwroot":"x","sesskey":"Ab12Cd34Ef","sessiontimeout":"7200"};</script>')).toBe('Ab12Cd34Ef');
    expect(() => leerSesskey('<html></html>')).toThrow(/sesskey/);
  });
});
