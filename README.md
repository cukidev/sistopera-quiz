# SistoperaQuiz

Quiz web para estudiar **Sistemas Operativos** (Sistope, USACH): 197 preguntas de
pruebas anteriores, cada una con la justificación de por qué la respuesta es
correcta y por qué caen las otras alternativas.

HTML, CSS y JavaScript puro. Sin frameworks, sin build, sin dependencias.

## Cómo usarlo

**En línea:** entra a la URL de GitHub Pages de este repositorio.

**Local:** descarga el repositorio y haz doble clic en `index.html`. No necesita
servidor, internet ni instalar nada.

## Sobre el material

Las preguntas provienen de PEPs de semestres anteriores recopiladas por
estudiantes, y las respuestas están contrastadas contra las pautas oficiales.
Es material de estudio hecho por y para estudiantes del ramo: úsalo para
practicar y entender, que es justamente de lo que se trata.

Las justificaciones y los diagramas son elaboración propia y pueden contener
errores. Si encuentras alguno, los *issues* y *pull requests* son bienvenidos.

## Qué trae

- **197 preguntas**: 66 de PEP 1, 61 de PEP 2, 70 de PEP 3.
- **Justificación en cada una**: el razonamiento con palabras propias, más una
  sección de "por qué caen las otras" con los errores típicos.
- **109 diagramas ASCII**: árboles de fork, Gantt de planificación, trazas de
  entrelazado de hebras, descomposición de direcciones, cálculos paso a paso.
- **42 preguntas con código** en bloques numerados, para ubicar las líneas que
  menciona el enunciado.

## Opciones

| Opción | Para qué sirve |
|---|---|
| Seleccionar PEP | Se pueden combinar (clic para activar/desactivar). Siempre queda al menos una. |
| Orden aleatorio | Baraja las preguntas en cada ronda. |
| Barajar alternativas | Baraja también las letras, para no memorizar "la c". |
| Mostrar justificación | Si lo desactivas, funciona como prueba real: solo corrige, sin explicar. |
| Solo las falladas | Repasa únicamente lo que has respondido mal antes. |
| Cantidad | 10, 20, 30, 50 o todas. |

## Atajos de teclado

- `1` – `6`: responder esa alternativa
- `Enter` o `→`: siguiente pregunta

## Otras cosas

- El progreso se guarda solo en el navegador (localStorage). Si abres el archivo
  desde otro navegador o borras datos de navegación, las estadísticas se pierden.
- Al terminar muestra el porcentaje, una **nota estimada** en escala 1–7 con 60 %
  de exigencia, y un desglose de aciertos **por tema** para saber qué repasar.
- El botón "Repetir las falladas" arma una ronda nueva solo con los errores de
  esa sesión.

## Verificación de las respuestas

Las **197 respuestas están contrastadas una por una contra las que vienen
marcadas en negrita en la Sistopera**, que son las de la pauta oficial.

**Las 197 verificadas y coincidentes.** (La PEP 2 #42 no traía negrita en el
documento y fue confirmada aparte: es la b.)

Las justificaciones sí son mías. En los casos donde mi razonamiento no cuadraba
del todo con la pauta, la respuesta marcada como correcta es **siempre la de la
pauta**, y la objeción queda anotada con ⚠ dentro de la explicación. Esas son:

| Pregunta | Tema | Qué anotar |
|---|---|---|
| PEP 1 #6 | Salida con hebras sin join | `=` y `#` los imprime la misma hebra, así que el orden entre ellos no debería invertirse |
| PEP 2 #36 | Peterson e inanición | La alternativa dice "queda encolada", pero Peterson hace busy-waiting, no encola |
| PEP 2 #50 | Mínimo con carreras | Con 1e7 y 1e4 la traza fina da 10.000; la pauta usa el resultado canónico de 2 |
| PEP 2 #57 | Lista con CAS | La solución es correcta y lock-free, pero no cumple la definición formal de EM |
| PEP 3 #9 | RAID 0, 56 KB | Depende de si la escritura arranca al inicio del strip o no |
| PEP 3 #58 | Particionamiento fijo | El caso normal de este esquema es fragmentación interna, no externa |

También hay dos erratas del documento original, señaladas dentro de las
justificaciones: PEP 2 #12 tiene alternativas duplicadas literalmente, y en
PEP 2 la numeración salta (la #48 aparece rotulada como #68).

## Archivos

```
index.html        estructura
style.css         estilos
app.js            lógica del quiz
data/pep1.js      66 preguntas — procesos, fork, hebras, planificación
data/pep2.js      61 preguntas — concurrencia, semáforos, monitores, deadlock
data/pep3.js      70 preguntas — memoria, paginación, I/O, RAID
```

Para agregar una pregunta nueva, copia el formato de cualquier objeto en los
archivos de `data/`. Campos obligatorios: `id`, `pep`, `num`, `tema`,
`enunciado`, `opciones`, `correcta` (índice desde 0) y `justificacion`.
Opcionales: `contexto`, `codigo`, `tabla`, `diagrama`, `descarte`, `puntos`.
En los textos puedes usar `` `código` `` y `**destacado**`.
