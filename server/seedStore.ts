import { buildDemoStore } from './demoSeed.js';
import { saveStore } from './store.js';

const store = buildDemoStore();
saveStore(store);
console.log(
  `Store demo gravado: ${store.units.length} unidades, ${store.students.length} alunos, ${store.checkInLog.length} check-ins, 3 meses de histórico.`,
);
