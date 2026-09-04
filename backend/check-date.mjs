// Simula el parseo que hace el dashboard con lo que devuelve la API actual
const fechasApi = ['2026-08-15T06:00:00.000Z', '2026-08-01T06:00:00.000Z', '2026-09-01'];
const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

for (const f of fechasApi) {
  const d = new Date(String(f).slice(0, 10) + 'T00:00:00');
  console.log(f, '->', isNaN(d.getTime()) ? 'INVALIDA' : monthKey(d));
}
console.log('Mes actual:', monthKey(new Date()));
