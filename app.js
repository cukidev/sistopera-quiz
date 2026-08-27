/* ==========================================================
   SistoperaQuiz — lógica de la aplicación
   Los datos viven en data/pep1.js, pep2.js y pep3.js
   ========================================================== */

const BANCO = [].concat(
  window.PEP1 || [],
  window.PEP2 || [],
  window.PEP3 || []
);

const INFO_PEPS = {
  1: { titulo: 'PEP 1', temas: 'Procesos, fork, hebras, planificación, cambio de contexto' },
  2: { titulo: 'PEP 2', temas: 'Concurrencia, SC/EM, semáforos, monitores, deadlock' },
  3: { titulo: 'PEP 3', temas: 'Memoria, memoria virtual, paginación, I/O, RAID' }
};

const LETRAS = ['a', 'b', 'c', 'd', 'e', 'f'];
const CLAVE_STATS = 'sistopera_stats_v1';
const CLAVE_MARCADAS = 'sistopera_marcadas_v1';
const CLAVE_HISTORIAL = 'sistopera_historial_v1';

/* ---------- Estado ---------- */
let cfg = { peps: new Set([1]), aleatorio: true, barajarAlt: false, feedback: true,
            soloFalladas: false, soloMarcadas: false, limite: 20 };
let sesion = null;   // { preguntas:[], idx, respuestas:[] }
let marcadas = new Set();   // ids marcados para repasar (persiste en localStorage)

/* ---------- Utilidades ---------- */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

function barajar(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function escapar(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* Permite `código` y **negrita** dentro de textos de datos */
function fmt(s) {
  return escapar(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<span class="clave">$1</span>');
}

/* Bloque de código con numeración de líneas */
function renderCodigo(codigo) {
  const lineas = codigo.replace(/\n+$/, '').split('\n');
  const html = lineas.map((l, i) => {
    const n = String(i + 1).padStart(2, '0');
    return `<span class="ln">${n}</span>${escapar(l)}`;
  }).join('\n');
  return `<pre class="codigo">${html}</pre>`;
}

function renderTabla(tabla) {
  const cab = tabla.head ? `<thead><tr>${tabla.head.map(h => `<th>${escapar(h)}</th>`).join('')}</tr></thead>` : '';
  const cuerpo = `<tbody>${tabla.rows.map(r => `<tr>${r.map(c => `<td>${escapar(c)}</td>`).join('')}</tr>`).join('')}</tbody>`;
  return `<table class="tabla-datos">${cab}${cuerpo}</table>`;
}

/* ---------- Estadísticas persistentes ---------- */
function cargarStats() {
  try { return JSON.parse(localStorage.getItem(CLAVE_STATS)) || {}; }
  catch (e) { return {}; }
}
function guardarStats(s) {
  try { localStorage.setItem(CLAVE_STATS, JSON.stringify(s)); } catch (e) {}
}
function registrar(id, acierto) {
  const s = cargarStats();
  if (!s[id]) s[id] = { ok: 0, mal: 0 };
  acierto ? s[id].ok++ : s[id].mal++;
  guardarStats(s);
}

/* ---------- Historial de rondas ---------- */
function cargarHistorial() {
  try { return JSON.parse(localStorage.getItem(CLAVE_HISTORIAL)) || []; }
  catch (e) { return []; }
}
function guardarRonda(ronda) {
  const h = cargarHistorial();
  h.unshift(ronda);                       // la más reciente primero
  try { localStorage.setItem(CLAVE_HISTORIAL, JSON.stringify(h.slice(0, 50))); } catch (e) {}
}
function fechaCorta(ts) {
  const d = new Date(ts);
  const hoy = new Date();
  const mismoDia = d.toDateString() === hoy.toDateString();
  const hora = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  if (mismoDia) return 'Hoy ' + hora;
  const ayer = new Date(hoy); ayer.setDate(hoy.getDate() - 1);
  if (d.toDateString() === ayer.toDateString()) return 'Ayer ' + hora;
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' }) + ' ' + hora;
}
function notaDe(p) {
  const n = p < 0.6 ? 1 + (3 / 0.6) * p : 4 + (3 / 0.4) * (p - 0.6);
  return Math.round(n * 10) / 10;
}

function pintarHistorial() {
  const h = cargarHistorial();
  const cont = $('#historial-lista');
  const card = $('#card-historial');
  if (h.length === 0) { card.classList.add('oculto'); return; }
  card.classList.remove('oculto');

  const mejor = Math.max(...h.map(r => r.pct));
  cont.innerHTML = h.slice(0, 12).map((r, i) => {
    const prev = h[i + 1];
    let delta = '';
    if (prev) {
      const d = r.pct - prev.pct;
      if (d > 0)      delta = `<span class="delta sube">▲ ${d}</span>`;
      else if (d < 0) delta = `<span class="delta baja">▼ ${Math.abs(d)}</span>`;
      else            delta = `<span class="delta igual">=</span>`;
    }
    const color = r.pct >= 70 ? 'var(--ok)' : r.pct >= 50 ? 'var(--amarillo)' : 'var(--mal)';
    const temas = Object.keys(r.porTema || {}).sort().map(t => {
      const d = r.porTema[t];
      return `<div class="mini-tema"><span>${escapar(t)}</span><b>${d.ok}/${d.total}</b></div>`;
    }).join('');
    return `<details class="ronda">
        <summary>
          <span class="ronda-fecha">${fechaCorta(r.fecha)}</span>
          <span class="ronda-peps">PEP ${r.peps.join('+')}</span>
          <span class="ronda-pct" style="color:${color}">${r.pct}%</span>
          <span class="ronda-detalle">${r.ok}/${r.total} · nota ${r.nota.toFixed(1)}</span>
          ${delta}
          ${r.pct === mejor ? '<span class="chip-mejor">★ mejor</span>' : ''}
        </summary>
        <div class="mini-temas">${temas || '<i>sin desglose</i>'}</div>
      </details>`;
  }).join('');
}

/* ---------- Marcadas para repasar (persistentes) ---------- */
function cargarMarcadas() {
  try { return new Set(JSON.parse(localStorage.getItem(CLAVE_MARCADAS)) || []); }
  catch (e) { return new Set(); }
}
function guardarMarcadas() {
  try { localStorage.setItem(CLAVE_MARCADAS, JSON.stringify([...marcadas])); } catch (e) {}
}
function alternarMarca(id) {
  marcadas.has(id) ? marcadas.delete(id) : marcadas.add(id);
  guardarMarcadas();
  return marcadas.has(id);
}
function pintarConteoMarcadas() {
  const chip = $('#conteo-marcadas');
  const n = marcadas.size;
  chip.textContent = n ? `(${n})` : '';
  chip.className = 'contador-chip' + (n ? ' activo' : '');
  $('#cfg-solo-marcadas').disabled = n === 0;
  $('#btn-limpiar-marcadas').style.display = n ? '' : 'none';
}

/* ---------- Pantalla de inicio ---------- */
function pintarSelectorPeps() {
  const cont = $('#selector-peps');
  cont.innerHTML = '';
  [1, 2, 3].forEach(n => {
    const total = BANCO.filter(q => q.pep === n).length;
    const b = document.createElement('button');
    b.className = 'pep-btn' + (cfg.peps.has(n) ? ' activo' : '');
    b.innerHTML = `<span class="titulo">${INFO_PEPS[n].titulo}</span>
                   <span class="meta">${total} preguntas</span>
                   <span class="temas">${INFO_PEPS[n].temas}</span>`;
    b.onclick = () => {
      cfg.peps.has(n) ? cfg.peps.delete(n) : cfg.peps.add(n);
      if (cfg.peps.size === 0) cfg.peps.add(n);   // nunca vacío
      pintarSelectorPeps();
    };
    cont.appendChild(b);
  });
}

function pintarStats() {
  const s = cargarStats();
  const ids = Object.keys(s);
  const cont = $('#stats-globales');
  if (ids.length === 0) {
    cont.innerHTML = '<p class="sub">Todavía no has respondido nada. ¡A darle!</p>';
    return;
  }
  let ok = 0, mal = 0;
  ids.forEach(id => { ok += s[id].ok; mal += s[id].mal; });
  const falladas = ids.filter(id => s[id].mal > 0).length;
  const pct = ok + mal > 0 ? Math.round(ok * 100 / (ok + mal)) : 0;
  cont.innerHTML = `
    <div class="stat-fila"><span>Preguntas vistas</span><b>${ids.length} / ${BANCO.length}</b></div>
    <div class="stat-fila"><span>Respuestas correctas</span><b style="color:var(--ok)">${ok}</b></div>
    <div class="stat-fila"><span>Respuestas incorrectas</span><b style="color:var(--mal)">${mal}</b></div>
    <div class="stat-fila"><span>Preguntas con al menos un fallo</span><b>${falladas}</b></div>
    <div class="stat-fila"><span>Porcentaje de acierto</span><b>${pct}%</b></div>`;
}

function leerConfig() {
  cfg.aleatorio    = $('#cfg-aleatorio').checked;
  cfg.barajarAlt   = $('#cfg-baraja-alt').checked;
  cfg.feedback     = $('#cfg-feedback').checked;
  cfg.soloFalladas = $('#cfg-solo-falladas').checked;
  cfg.soloMarcadas = $('#cfg-solo-marcadas').checked;
  cfg.limite       = parseInt($('#cfg-limite').value, 10);
}

/* ---------- Arranque de sesión ---------- */
function empezar(listaForzada) {
  leerConfig();
  let pool;

  if (listaForzada) {
    pool = listaForzada;
  } else {
    pool = BANCO.filter(q => cfg.peps.has(q.pep));
    if (cfg.soloMarcadas) {
      const filtradas = pool.filter(q => marcadas.has(q.id));
      if (filtradas.length === 0) {
        alert('No tienes preguntas marcadas en esa selección de PEPs.');
        return;
      }
      pool = filtradas;
    }
    if (cfg.soloFalladas) {
      const s = cargarStats();
      const filtradas = pool.filter(q => s[q.id] && s[q.id].mal > 0);
      if (filtradas.length === 0) {
        alert('No tienes preguntas falladas registradas en esa selección. Se usarán todas.');
      } else {
        pool = filtradas;
      }
    }
    if (cfg.aleatorio) pool = barajar(pool);
    if (cfg.limite > 0) pool = pool.slice(0, cfg.limite);
  }

  if (pool.length === 0) { alert('No hay preguntas con esos filtros.'); return; }

  sesion = {
    preguntas: pool,
    idx: 0,
    respuestas: new Array(pool.length).fill(null),
    ordenAlt: pool.map(q => {
      const idxs = q.opciones.map((_, i) => i);
      return cfg.barajarAlt ? barajar(idxs) : idxs;
    })
  };

  $('#pantalla-inicio').classList.add('oculto');
  $('#pantalla-resultado').classList.add('oculto');
  $('#pantalla-quiz').classList.remove('oculto');
  pintarPregunta();
}

/* ---------- Render de una pregunta ---------- */
function pintarPregunta() {
  const { preguntas, idx } = sesion;
  const q = preguntas[idx];
  const orden = sesion.ordenAlt[idx];
  const yaRespondida = sesion.respuestas[idx] !== null;

  // Progreso
  $('#progreso-fill').style.width = ((idx) / preguntas.length * 100) + '%';
  $('#progreso-txt').textContent = `${idx + 1} / ${preguntas.length}`;
  const ok = sesion.respuestas.filter((r, i) => r !== null && r === preguntas[i].correcta).length;
  const mal = sesion.respuestas.filter((r, i) => r !== null && r !== preguntas[i].correcta).length;
  $('#marcador-ok').textContent = ok;
  $('#marcador-mal').textContent = mal;

  // Cabecera
  let html = `<div class="etiquetas">
      <span class="tag tag-pep">PEP ${q.pep}</span>
      <span class="tag">${escapar(q.tema)}</span>
      ${q.puntos ? `<span class="tag tag-pts">${q.puntos} pto${q.puntos > 1 ? 's' : ''}</span>` : ''}
      <span class="tag">#${escapar(q.num)}</span>
    </div>`;

  if (q.contexto) html += `<div class="contexto"><span class="rotulo">Enunciado</span>${fmt(q.contexto)}</div>`;
  html += `<p class="enunciado">${fmt(q.enunciado)}</p>`;
  if (q.codigo) html += renderCodigo(q.codigo);
  if (q.tabla) html += renderTabla(q.tabla);

  html += '<div class="alternativas">';
  orden.forEach((iOriginal, pos) => {
    html += `<button class="alt" data-i="${iOriginal}">
        <span class="letra">${LETRAS[pos]}</span>
        <span class="texto">${fmt(q.opciones[iOriginal])}</span>
      </button>`;
  });
  html += '</div><div id="zona-justificacion"></div>';

  $('#contenedor-pregunta').innerHTML = html;
  window.scrollTo({ top: 0, behavior: 'instant' });

  // Botón de repaso
  pintarBotonRepaso(q.id);

  // Botón siguiente
  $('#btn-siguiente').disabled = !yaRespondida;
  $('#btn-siguiente').textContent = (idx === preguntas.length - 1) ? 'Ver resultados' : 'Siguiente →';

  // Listeners
  $$('.alt').forEach(btn => {
    btn.onclick = () => responder(parseInt(btn.dataset.i, 10));
  });

  if (yaRespondida) mostrarCorreccion(sesion.respuestas[idx]);
}

function responder(iElegida) {
  const { idx, preguntas } = sesion;
  if (sesion.respuestas[idx] !== null) return;    // ya respondió
  sesion.respuestas[idx] = iElegida;
  registrar(preguntas[idx].id, iElegida === preguntas[idx].correcta);
  mostrarCorreccion(iElegida);
  $('#btn-siguiente').disabled = false;

  const ok = sesion.respuestas.filter((r, i) => r !== null && r === preguntas[i].correcta).length;
  const mal = sesion.respuestas.filter((r, i) => r !== null && r !== preguntas[i].correcta).length;
  $('#marcador-ok').textContent = ok;
  $('#marcador-mal').textContent = mal;
}

function mostrarCorreccion(iElegida) {
  const q = sesion.preguntas[sesion.idx];
  const acierto = iElegida === q.correcta;

  $$('.alt').forEach(btn => {
    const i = parseInt(btn.dataset.i, 10);
    btn.classList.add('bloqueada');
    if (i === q.correcta) btn.classList.add('correcta');
    else if (i === iElegida) btn.classList.add('incorrecta');
    else btn.classList.add('atenuada');
  });

  if (!cfg.feedback) return;

  const letraCorrecta = LETRAS[sesion.ordenAlt[sesion.idx].indexOf(q.correcta)];
  $('#zona-justificacion').innerHTML = `
    <div class="justificacion ${acierto ? 'acierto' : 'error'}">
      <div class="veredicto">${acierto ? '✓ ¡Correcto!' : '✗ Incorrecta'} — la respuesta es la <b>${letraCorrecta})</b></div>
      <p>${fmt(q.justificacion)}</p>
      ${q.descarte ? `<p><span class="clave">Por qué caen las otras:</span> ${fmt(q.descarte)}</p>` : ''}
      ${q.diagrama ? `<pre>${escapar(q.diagrama)}</pre>` : ''}
    </div>`;
}

function pintarBotonRepaso(id) {
  const btn = $('#btn-repasar');
  const esta = marcadas.has(id);
  btn.classList.toggle('marcada', esta);
  btn.textContent = esta ? '★ Marcada — la repasarás después' : '☆ Marcar para repasar';
  btn.title = esta
    ? 'Quítale la marca si ya la dominas'
    : 'Se guarda aunque salgas: podrás filtrar solo las marcadas desde el inicio';
}

function siguiente() {
  if (sesion.idx === sesion.preguntas.length - 1) { terminar(); return; }
  sesion.idx++;
  pintarPregunta();
}

/* ---------- Resultados ---------- */
function terminar() {
  const { preguntas, respuestas } = sesion;
  const contestadas = respuestas.filter(r => r !== null).length;
  const ok = respuestas.filter((r, i) => r !== null && r === preguntas[i].correcta).length;
  const pct = contestadas ? Math.round(ok * 100 / contestadas) : 0;

  // Nota escala chilena (60% de exigencia)
  const p = contestadas ? ok / contestadas : 0;
  let nota = p < 0.6 ? 1 + (3 / 0.6) * p : 4 + (3 / 0.4) * (p - 0.6);
  nota = Math.round(nota * 10) / 10;

  $('#pantalla-quiz').classList.add('oculto');
  $('#pantalla-resultado').classList.remove('oculto');
  $('#res-revision').classList.add('oculto');
  $('#res-revision').innerHTML = '';

  const clase = pct >= 70 ? 'buena' : pct >= 50 ? 'media' : 'mala';
  $('#res-nota').className = 'nota-grande ' + clase;
  $('#res-nota').textContent = pct + '%';
  $('#res-titulo').textContent = pct >= 85 ? '¡Crack total!' : pct >= 60 ? '¡Vas bien!' : 'A repasar se ha dicho';
  $('#res-detalle').textContent =
    `${ok} de ${contestadas} correctas · nota estimada ${nota.toFixed(1)} (escala 1–7, exigencia 60%)`;

  // Desglose por tema
  const porTema = {};
  preguntas.forEach((q, i) => {
    if (respuestas[i] === null) return;
    if (!porTema[q.tema]) porTema[q.tema] = { ok: 0, total: 0 };
    porTema[q.tema].total++;
    if (respuestas[i] === q.correcta) porTema[q.tema].ok++;
  });
  const filas = Object.keys(porTema).sort().map(t => {
    const d = porTema[t];
    const p2 = Math.round(d.ok * 100 / d.total);
    const color = p2 >= 70 ? 'var(--ok)' : p2 >= 50 ? 'var(--amarillo)' : 'var(--mal)';
    return `<div class="tema-fila">
        <span class="nombre">${escapar(t)}</span>
        <span class="barra"><div style="width:${p2}%;background:${color}"></div></span>
        <span class="val">${d.ok}/${d.total}</span>
      </div>`;
  }).join('');
  $('#res-por-tema').innerHTML = filas ? `<h2 style="margin-top:24px">Por tema</h2>${filas}` : '';

  // Guardar la ronda en el historial ANTES de comparar
  const previas = cargarHistorial();
  guardarRonda({
    fecha: Date.now(),
    peps: [...new Set(preguntas.map(q => q.pep))].sort(),
    total: contestadas, ok, pct, nota, porTema
  });

  // Comparación con la ronda anterior
  const cmp = $('#res-comparacion');
  if (previas.length) {
    const ant = previas[0];
    const d = pct - ant.pct;
    const mejorPrevio = Math.max(...previas.map(r => r.pct));
    if (d > 0) {
      cmp.className = 'comparacion sube';
      cmp.innerHTML = `▲ <b>${d} puntos</b> mejor que tu ronda anterior (${ant.pct}%)` +
        (pct > mejorPrevio ? ' · <b>¡tu mejor resultado hasta ahora!</b> 🎉' : '');
    } else if (d < 0) {
      cmp.className = 'comparacion baja';
      cmp.innerHTML = `▼ ${Math.abs(d)} puntos bajo tu ronda anterior (${ant.pct}%). Tu mejor sigue siendo ${mejorPrevio}%.`;
    } else {
      cmp.className = 'comparacion igual';
      cmp.innerHTML = `Igual que tu ronda anterior (${ant.pct}%).`;
    }
  } else {
    cmp.className = 'comparacion igual';
    cmp.innerHTML = 'Primera ronda registrada. Desde ahora vas a poder comparar tu avance.';
  }

  const hayMalas = preguntas.some((q, i) => respuestas[i] !== null && respuestas[i] !== q.correcta);
  $('#btn-repetir-malas').style.display = hayMalas ? '' : 'none';

  // Aviso de cuántas dejaste marcadas en esta ronda
  const marcadasRonda = preguntas.filter(q => marcadas.has(q.id)).length;
  $('#btn-repasar-marcadas').style.display = marcadas.size ? '' : 'none';
  $('#btn-repasar-marcadas').textContent = `★ Repasar las marcadas (${marcadas.size})`;
  const aviso = $('#res-aviso-marcadas');
  if (aviso) {
    aviso.innerHTML = marcadasRonda
      ? `Marcaste <b>${marcadasRonda}</b> pregunta${marcadasRonda > 1 ? 's' : ''} de esta ronda para repasar.`
      : '';
  }
}

function pintarRevision() {
  const { preguntas, respuestas } = sesion;
  const cont = $('#res-revision');
  cont.innerHTML = '<h2 style="margin-top:30px">Revisión completa</h2>' + preguntas.map((q, i) => {
    const r = respuestas[i];
    const acierto = r === q.correcta;
    return `<div class="revision-item ${acierto ? 'ok' : ''}">
        <div class="rev-num">PEP ${q.pep} · #${escapar(q.num)} · ${escapar(q.tema)}${marcadas.has(q.id) ? ' · <span style="color:var(--amarillo)">★ marcada</span>' : ''}</div>
        <div class="rev-enun">${fmt(q.enunciado)}</div>
        ${q.codigo ? renderCodigo(q.codigo) : ''}
        <div class="rev-linea"><span class="lbl">Tu respuesta:</span>
          <span style="color:${acierto ? 'var(--ok)' : 'var(--mal)'}">${r === null ? '— sin responder —' : fmt(q.opciones[r])}</span></div>
        ${acierto ? '' : `<div class="rev-linea"><span class="lbl">Correcta:</span> <span style="color:var(--ok)">${fmt(q.opciones[q.correcta])}</span></div>`}
        <div class="rev-just">${fmt(q.justificacion)}${q.descarte ? '<br><br><span class="clave">Por qué caen las otras:</span> ' + fmt(q.descarte) : ''}</div>
      </div>`;
  }).join('');
  cont.classList.remove('oculto');
  cont.scrollIntoView({ behavior: 'smooth' });
}

function volverInicio() {
  $('#pantalla-quiz').classList.add('oculto');
  $('#pantalla-resultado').classList.add('oculto');
  $('#pantalla-inicio').classList.remove('oculto');
  pintarStats();
  pintarConteoMarcadas();
  pintarHistorial();
  window.scrollTo({ top: 0 });
}

/* ---------- Eventos ---------- */
$('#btn-empezar').onclick = () => empezar();
$('#btn-siguiente').onclick = siguiente;
$('#btn-salir').onclick = () => { if (confirm('¿Salir del quiz? Se pierde el avance de esta ronda.')) volverInicio(); };
$('#btn-volver-inicio').onclick = volverInicio;
$('#btn-revisar').onclick = pintarRevision;
$('#btn-repetir-malas').onclick = () => {
  const malas = sesion.preguntas.filter((q, i) => sesion.respuestas[i] !== null && sesion.respuestas[i] !== q.correcta);
  empezar(malas);
};
$('#btn-repasar').onclick = () => {
  alternarMarca(sesion.preguntas[sesion.idx].id);
  pintarBotonRepaso(sesion.preguntas[sesion.idx].id);
};
$('#btn-repasar-marcadas').onclick = () => {
  const lista = BANCO.filter(q => marcadas.has(q.id));
  if (lista.length === 0) { alert('No tienes preguntas marcadas.'); return; }
  empezar(cfg.aleatorio ? barajar(lista) : lista);
};
$('#btn-limpiar-marcadas').onclick = () => {
  if (confirm(`¿Quitar las marcas de ${marcadas.size} pregunta(s)?`)) {
    marcadas.clear(); guardarMarcadas(); pintarConteoMarcadas();
  }
};
$('#btn-borrar-historial').onclick = () => {
  if (confirm('¿Borrar el historial de rondas? Tus estadísticas por pregunta se mantienen.')) {
    localStorage.removeItem(CLAVE_HISTORIAL);
    pintarHistorial();
  }
};
$('#btn-reset-stats').onclick = () => {
  if (confirm('¿Borrar todas tus estadísticas?')) { localStorage.removeItem(CLAVE_STATS); pintarStats(); }
};

// Atajos de teclado: 1-5 para responder, Enter/→ para avanzar
document.addEventListener('keydown', e => {
  if ($('#pantalla-quiz').classList.contains('oculto')) return;
  if (e.key === 'Enter' || e.key === 'ArrowRight') {
    if (!$('#btn-siguiente').disabled) { e.preventDefault(); siguiente(); }
  } else if (/^[1-6]$/.test(e.key)) {
    const btns = $$('.alt');
    const b = btns[parseInt(e.key, 10) - 1];
    if (b && !b.classList.contains('bloqueada')) b.click();
  }
});

/* Atajo: tecla M para marcar/desmarcar la pregunta actual */
document.addEventListener('keydown', e => {
  if ($('#pantalla-quiz').classList.contains('oculto')) return;
  if (e.key === 'm' || e.key === 'M') $('#btn-repasar').click();
});

/* ---------- Init ---------- */
marcadas = cargarMarcadas();
pintarSelectorPeps();
pintarStats();
pintarConteoMarcadas();
pintarHistorial();
