import Exa from 'exa-js';

// Lazy init — only throws when actually called, not at module load
let _exa: Exa | null = null;
export const exa = new Proxy({} as Exa, {
  get(_target, prop) {
    if (!_exa) {
      if (!process.env.EXA_API_KEY) {
        throw new Error('EXA_API_KEY is not set. Add it to .env.local to enable AI research.');
      }
      _exa = new Exa(process.env.EXA_API_KEY);
    }
    return (_exa as any)[prop];
  }
});
