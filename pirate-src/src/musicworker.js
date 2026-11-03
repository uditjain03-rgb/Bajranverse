// runs in a Web Worker: makes the music tracks without slowing the game
import { render } from './musiccore.js';
onmessage = e => { const [L, R] = render(e.data); postMessage({ name: e.data, L, R }, [L.buffer, R.buffer]); };
