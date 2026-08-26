/* PEP 1 — Procesos, fork, hebras, planificación, cambio de contexto */
window.PEP1 = [

{
  id: "p1-1", pep: 1, num: 1, puntos: 1, tema: "Procesos y modo/contexto",
  enunciado: "Indique cuál de las siguientes afirmaciones es correcta:",
  opciones: [
    "Un programa preprocesado, compilado, ensamblado y linkeado es un proceso.",
    "Ejecutar un syscall gatilla siempre un cambio de contexto.",
    "Un cambio en el modo de ejecución implica un cambio de contexto.",
    "Una vez finalizada la ejecución de un manejador para una interrupción, el control podría no volver a la siguiente instrucción del código interrumpido."
  ],
  correcta: 3,
  justificacion: "Después de atender la interrupción, el kernel pasa por el planificador. Si éste decide que otro proceso debe tomar la CPU (por ejemplo, se agotó el quantum o llegó alguien más prioritario), el control NO vuelve a la instrucción siguiente del proceso interrumpido: se hace cambio de contexto y retoma otro proceso. Que vuelva al mismo es lo habitual, pero no está garantizado.",
  descarte: "Ese resultado del pipeline de compilación es un **ejecutable**, no un proceso: el proceso nace cuando el SO lo carga y le arma su PCB. Un syscall es un **cambio de modo** (usuario→kernel), y solo se convierte en cambio de contexto si el proceso deja la CPU. Y cambio de modo ≠ cambio de contexto: son cosas distintas y el primero no arrastra al segundo."
},

{
  id: "p1-2", pep: 1, num: 2, puntos: 2, tema: "fork / conteo de procesos",
  enunciado: "Asuma que el siguiente código se ejecuta sin errores y que N = A = 2. ¿Cuántos procesos crea el programa?",
  codigo: `void main() {
  int p, a;
  for (p = 0; p < N; p++)
    if (fork() != 0) break;
  for (a = 0; a < A-1; a++)
    if (fork() == 0) break;
}`,
  opciones: [
    "El código solo genera un proceso ya que ambos fork() están condicionados a la instrucción break.",
    "3 procesos.",
    "6 procesos.",
    "9 procesos."
  ],
  correcta: 2,
  justificacion: "La clave es preguntarse **quién rompe el ciclo**. En el primer for la condición es `fork() != 0`, o sea rompe el **padre**: se forma una cadena donde cada hijo sigue iterando. Con N=2 quedan N+1 = **3 procesos**. En el segundo for la condición es `fork() == 0`, o sea rompe el **hijo**: cada uno de esos 3 procesos hace A−1 = 1 fork y se queda con 1 hijo. Total = 3 × (1+1) = **6 procesos**.",
  diagrama: `1er for (rompe el padre, cadena):
  P0 ──fork──> H1 ──fork──> H2        →  3 procesos

2do for (rompe el hijo, A-1 = 1 fork c/u):
  P0 ──> h    H1 ──> h    H2 ──> h
  ───────────────────────────────────
  Total = 3 x 2 = 6 procesos`,
  descarte: "El `break` no anula al fork: el fork ya ocurrió antes de evaluar la condición. Regla general de este patrón: **(N+1) × (hijos del 2º for + 1)**."
},

{
  id: "p1-3", pep: 1, num: 3, puntos: 1, tema: "Cambio de contexto",
  enunciado: "En un SO que se ejecuta en el contexto de un proceso usuario con planificador FCFS (FIFO), ocurrirá un cambio de contexto cuando:",
  opciones: [
    "pid_t parent_pid = getppid();",
    "wait(NULL);",
    "long *i = malloc(N * sizeof(long));",
    "free(ptr); donde ptr apunta a memoria reservada por malloc, alloc o realloc."
  ],
  correcta: 1,
  justificacion: "Hay cambio de contexto cuando el proceso **deja la CPU**. `wait(NULL)` bloquea al padre hasta que termine algún hijo: el proceso pasa a estado *blocked*, suelta el procesador y el planificador debe elegir a otro. Ahí sí hay cambio de contexto sí o sí.",
  descarte: "`getppid()` es un syscall trivial: cambio de modo, el kernel devuelve un número y el mismo proceso sigue corriendo. `malloc` y `free` normalmente ni siquiera llegan al kernel (trabajan sobre el heap ya reservado); y aunque pidieran memoria con `brk`/`mmap`, el proceso no se bloquea."
},

{
  id: "p1-4", pep: 1, num: 4, puntos: 1, tema: "Planificación",
  enunciado: "En cierto sistema computacional monoprocesador, corre un proceso que, en cierto momento, ejecuta el código while(1){}. ¿Cuál de las siguientes afirmaciones es correcta?",
  opciones: [
    "Si el planificador es FCFS, eventualmente todos los procesos correrán en el procesador.",
    "Si el planificador es RR, ninguno de los procesos listos para ejecutar serán seleccionados por el planificador.",
    "Si el planificador es FCFS, ninguno de los procesos listos para ejecutar serán seleccionados por el planificador.",
    "Si el planificador es FCFS o RR, eventualmente todos los procesos correrán en el procesador."
  ],
  correcta: 2,
  justificacion: "FCFS **no es apropiativo**: el proceso suelta la CPU solo si termina o se bloquea. Un `while(1){}` no hace ninguna de las dos cosas, así que se queda con el procesador para siempre y el resto de la cola de listos nunca es seleccionado. El sistema queda congelado.",
  descarte: "Con RR pasa justo lo contrario: el timer interrumpe al agotarse el quantum, desapropia al bucle infinito y los demás sí corren (aunque el pesado vuelva a la cola una y otra vez). Por eso las alternativas que mezclan RR con \"nadie corre\" o FCFS con \"todos corren\" son falsas."
},

{
  id: "p1-5", pep: 1, num: 5, puntos: 1, tema: "Hebras (pthreads)",
  contexto: "Código con dos hebras: f1 imprime \"$\" y f2 imprime \"@\", mientras main imprime \"=\" y \"#\" entre los pthread_join. Compilado y ejecutado sin errores.",
  enunciado: "¿Cuál de las siguientes alternativas podría mostrarse por la salida estándar?",
  codigo: `#include <stdio.h>
#include <pthread.h>

void *f1(void *arg) { printf("$"); }

void *f2(void *arg) { printf("@"); }

int main(int argc, char *argv[]) {
  pthread_t t[2];
  pthread_create(&t[0], NULL, f1, NULL);
  pthread_create(&t[1], NULL, f2, NULL);
  pthread_join(t[0], NULL);
  printf("=");
  pthread_join(t[1], NULL);
  printf("#");
  pthread_exit(0);
  return 0;
}`,
  opciones: [
    "@$=#",
    "=#$@",
    "@=#$",
    "$#@="
  ],
  correcta: 0,
  justificacion: "Los `pthread_join` imponen dos amarras: el `=` (línea 13) solo se imprime **después** de que t[0] terminó, o sea después del `$`; y el `#` (línea 15) solo después de que t[1] terminó, o sea después del `@`. El `@` en cambio es libre: puede salir en cualquier momento antes del `#`. La secuencia `@$=#` respeta todo eso.",
  descarte: "`=#$@` pone el `=` antes del `$`, imposible por el primer join. `@=#$` deja el `$` al final, misma violación. `$#@=` invierte `=` y `#`, que main imprime en ese orden fijo."
},

{
  id: "p1-6", pep: 1, num: 6, puntos: 2, tema: "Hebras (pthreads)",
  contexto: "Considere el siguiente código. Las líneas 12 y 14 son los dos pthread_join.",
  enunciado: "Si borramos las líneas 12 y 14, recompilamos y ejecutamos nuevamente el código ¿Cuál de las siguientes alternativas podría mostrarse por la salida estándar?",
  codigo: `int main(int argc, char *argv[]) {
  pthread_t t[2];
  pthread_create(&t[0], NULL, f1, NULL);
  pthread_create(&t[1], NULL, f2, NULL);
  printf("=");            // ya no hay join antes
  printf("#");            // ni aquí
  pthread_exit(0);
  return 0;
}`,
  opciones: [
    "$=#@",
    "$@=#",
    "=#$@",
    "$#@=",
    "Todas son posibles de mostrar por salida estándar."
  ],
  correcta: 4,
  justificacion: "Al borrar los dos `pthread_join` desaparece toda la sincronización: `$` y `@` pueden aparecer en cualquier posición, y main ya no espera a nadie antes de imprimir. **La pauta considera que las cuatro salidas son alcanzables**, porque sin joins no queda ninguna garantía sobre el entrelazado entre las hebras y main.",
  diagrama: `CON joins (pregunta anterior):
   $ antes de =     y     @ antes de #

SIN joins:
   main imprime = y # sin esperar a nadie
   las hebras imprimen $ y @ cuando alcanzan
   → el entrelazado queda totalmente libre`,
  descarte: "⚠ **Objeción honesta**: `=` y `#` los imprime la **misma hebra** (main), una línea después de la otra, así que el orden `=` → `#` debería mantenerse siempre y eso haría imposible la alternativa `$#@=`. Bajo ese criterio estricto la (e) sería discutible. Pero la clave oficial marca la (e), así que en la prueba va esa. Lo que sí debes tener claro para el Test de Salida: **sin joins no hay orden garantizado entre hebras distintas**."
},

{
  id: "p1-7", pep: 1, num: 7, puntos: 1, tema: "SPN / estimación exponencial",
  contexto: "Dado cierto planificador SPN (SJF), se estima el tiempo de servicio de los procesos como la siguiente ráfaga de procesador (CPU burst) utilizando la fórmula τ(n+1) = α·t(n) + (1−α)·τ(n), donde τ(n+1) es la ráfaga estimada a partir de la ráfaga anterior t(n) y la estimación anterior τ(n). Esto se calcula para cada proceso. La predicción inicial es 16 ms. La función de decisión de SPN planifica al procesador con menor estimación; si dos procesos tienen la misma, se selecciona aquel que más tiempo ha estado esperando. Recuerde que los procesos pasan por ráfagas de CPU y de I/O.",
  enunciado: "De lo anterior se puede afirmar lo siguiente:",
  opciones: [
    "Si α = 0, SPN se comporta como FCFS.",
    "Si α = 0, SPN se comporta como RR.",
    "Si α = 1, SPN se comporta como FCFS.",
    "Si α = 1, SPN se comporta como RR."
  ],
  correcta: 0,
  justificacion: "Con α = 0 la fórmula queda τ(n+1) = τ(n): la estimación **nunca cambia**, se queda pegada en los 16 ms iniciales para todos los procesos. Como todos empatan, entra a jugar el criterio de desempate — \"el que más tiempo ha esperado\" — que es exactamente la regla de FCFS.",
  descarte: "Con α = 1 pasa lo contrario: τ(n+1) = t(n), la estimación es la última ráfaga real, o sea SPN puro y bien reactivo. RR no aparece por ningún lado: RR reparte quantum, y aquí no hay quantum en juego."
},

{
  id: "p1-8", pep: 1, num: 8, puntos: 2, tema: "SPN / estimación exponencial",
  contexto: "Dado cierto planificador SPN (SJF), se estima el tiempo de servicio de los procesos como la siguiente ráfaga de procesador (CPU burst) utilizando la fórmula τ(n+1) = α·t(n) + (1−α)·τ(n), donde τ(n+1) es la ráfaga estimada a partir de la ráfaga anterior t(n) y la estimación anterior τ(n). Esto se calcula para cada proceso. La predicción inicial es 16 ms. La función de decisión de SPN planifica al procesador con menor estimación; si dos procesos tienen la misma, se selecciona aquel que más tiempo ha estado esperando. Recuerde que los procesos pasan por ráfagas de CPU y de I/O.",
  enunciado: "Si α = ½ y un proceso ha entrado a la CPU 3 veces con tn = 2 ms, tn-1 = 4 y tn-2 = 8 ms, entonces la predicción es:",
  opciones: [
    "tn+1 = 16 ms",
    "tn+1 = 12 ms",
    "tn+1 = 8 ms",
    "tn+1 = 5 ms"
  ],
  correcta: 3,
  justificacion: "Hay que aplicar la fórmula **tres veces**, partiendo de la ráfaga más antigua (8 ms) y de la predicción inicial de 16 ms. Con α = ½ es simplemente el promedio entre la ráfaga real y la predicción anterior.",
  diagrama: `τ0 = 16                       (predicción inicial)

τ1 = ½·8  + ½·16  = 4 + 8  = 12    (ráfaga tn-2 = 8)
τ2 = ½·4  + ½·12  = 2 + 6  =  8    (ráfaga tn-1 = 4)
τ3 = ½·2  + ½·8   = 1 + 4  =  5    (ráfaga tn   = 2)

                    →  τn+1 = 5 ms`,
  descarte: "El error típico es aplicar la fórmula una sola vez (½·2 + ½·16 = 9) o partir desde la ráfaga más nueva. El orden es cronológico: primero la más vieja."
},

{
  id: "p1-9", pep: 1, num: 9, puntos: 2, tema: "SPN / estimación exponencial",
  contexto: "Dado cierto planificador SPN (SJF), se estima el tiempo de servicio de los procesos como la siguiente ráfaga de procesador (CPU burst) utilizando la fórmula τ(n+1) = α·t(n) + (1−α)·τ(n), donde τ(n+1) es la ráfaga estimada a partir de la ráfaga anterior t(n) y la estimación anterior τ(n). Esto se calcula para cada proceso. La predicción inicial es 16 ms. La función de decisión de SPN planifica al procesador con menor estimación; si dos procesos tienen la misma, se selecciona aquel que más tiempo ha estado esperando. Recuerde que los procesos pasan por ráfagas de CPU y de I/O.",
  enunciado: "Si se mantiene α = ½, con cada nuevo cálculo de tn+1, el valor ponderado de t0 en la fórmula:",
  opciones: [
    "Se incrementa exponencialmente.",
    "Se decrementa exponencialmente.",
    "Se incrementa linealmente.",
    "Se decrementa linealmente."
  ],
  correcta: 1,
  justificacion: "Si desarrollas la recurrencia, el peso que le queda a la predicción/ráfaga inicial es **(1−α)ⁿ**. Con α = ½ eso es (½)ⁿ: 1/2, 1/4, 1/8, 1/16… Cada paso lo parte por la mitad, o sea decae **exponencialmente**. Por eso a esta técnica se le llama promedio exponencial: lo viejo se olvida rápido y lo reciente pesa más.",
  descarte: "No puede incrementarse: (1−α) siempre está entre 0 y 1, así que elevarlo a potencias solo lo achica. Y no es lineal — lineal sería restar una constante cada vez, no multiplicar por ½."
},

{
  id: "p1-10", pep: 1, num: 10, puntos: 1, tema: "Planificador O(1)",
  contexto: "En un SO que implementa el planificador O(1) existen dos políticas de tiempo real, SCHED_FIFO y SCHED_RR. Cada proceso cuenta con una static priority, donde la mayor (o más alta) prioridad es SP = 0.",
  enunciado: "¿Cuál de las siguientes alternativas es correcta?",
  opciones: [
    "Si llega un proceso SCHED_RR con mayor SP que el proceso SCHED_FIFO que está corriendo, éste último es desapropiado.",
    "Si llega un proceso SCHED_FIFO con mayor SP que el proceso SCHED_RR que está corriendo, éste último es desapropiado.",
    "Si llega un proceso SCHED_RR con menor SP que el proceso SCHED_FIFO que está corriendo, éste último es desapropiado.",
    "Si llega un proceso SCHED_FIFO con menor SP que el proceso SCHED_RR que está corriendo, éste último es desapropiado."
  ],
  correcta: 1,
  justificacion: "La regla del O(1) para tiempo real es simple: **siempre corre el de mayor prioridad**. El enunciado aclara que \"mayor prioridad\" significa SP más alta (SP = 0 es el tope). Un SCHED_FIFO que llega con mayor prioridad que el SCHED_RR en ejecución lo desapropia de inmediato, porque SCHED_FIFO corre hasta bloquearse o terminar y solo cede ante alguien más prioritario.",
  descarte: "Las dos alternativas con \"menor SP\" describen a un recién llegado **menos** prioritario: ése espera en la cola, no desapropia a nadie. ⚠ Ojo con la ambigüedad de \"mayor SP\": aquí se lee como mayor prioridad (número más chico), tal como define el enunciado."
},

{
  id: "p1-11", pep: 1, num: 11, puntos: 1, tema: "Cambio de contexto",
  enunciado: "¿Cuál de las siguientes instrucciones necesariamente produce un cambio de contexto en un sistema operativo que se ejecuta en el contexto de procesos usuario?",
  opciones: [
    "int fd = open(\"archivo.txt\", O_RDONLY);",
    "pid_t child = waitpid(-1, NULL, 0);",
    "printf(\"Hola mundo\");",
    "int valor = getpid();"
  ],
  correcta: 1,
  justificacion: "La palabra clave es **necesariamente**. `waitpid(-1, NULL, 0)` bloquea al proceso hasta que termine un hijo: el proceso abandona la CPU sí o sí, y el planificador tiene que elegir a otro. Eso es cambio de contexto garantizado.",
  descarte: "`getpid()` solo consulta un dato del PCB: cambio de modo y vuelta al mismo proceso. `printf` escribe a un buffer en espacio de usuario y puede que ni siquiera haga syscall en ese momento. `open` podría bloquear si hay que ir al disco, pero si el inodo ya está en caché no bloquea — o sea, no es *necesario*."
},

{
  id: "p1-12", pep: 1, num: 12, puntos: 1, tema: "fork / conteo de procesos",
  contexto: "Una empresa de streaming desarrolla un servidor de video que maneja múltiples conexiones. Ejecutan el siguiente código para crear procesos trabajadores.",
  enunciado: "Analice el flujo de ejecución y determine cuántos procesos en total existen durante la ejecución (incluyendo el proceso main):",
  codigo: `int main() {
  int process_count = 1;   // Contador incluyendo main
  int i;
  for (i = 0; i < 2; i++) {
    pid_t pid = fork();
    if (pid == 0) {                    // Proceso hijo
      printf("Worker %d created\\n", i+1);
      if (i == 0) {                    // solo el 1er worker
        if (fork() == 0) {
          printf("Subworker created\\n");
          return 0;                    // Subworker termina
        }
      }
      return 0;                        // Worker termina
    } else {
      process_count++;                 // el padre continúa
    }
  }
  while (wait(NULL) > 0);
  printf("Main finished, created %d processes total\\n", process_count);
  return 0;
}`,
  opciones: [
    "3 procesos: 1 main + 2 workers",
    "4 procesos: 1 main + 2 workers + 1 subworker",
    "5 procesos: 1 main + 2 workers + 2 subworkers",
    "6 procesos: 1 main + 3 workers + 2 subworkers"
  ],
  correcta: 1,
  justificacion: "El `return 0` dentro de la rama del hijo es la pieza clave: **ningún worker vuelve al ciclo**, así que solo main itera. Main hace 2 vueltas → 2 workers. Y el `if (i == 0)` limita el subworker: solo el Worker 1 crea uno. Total = main + Worker1 + Worker2 + Subworker = **4 procesos**.",
  diagrama: `        main
       /    \\
      /      \\        (i=0)        (i=1)
  Worker1   Worker2
     |
  Subworker              →  4 procesos en total

Worker2 no crea subworker porque i == 1.`,
  descarte: "Contar 2 subworkers ignora la condición `i == 0`. Contar 3 workers supone que los hijos siguen iterando, pero el `return 0` lo impide."
},

{
  id: "p1-13", pep: 1, num: 13, puntos: 1, tema: "Planificación",
  enunciado: "Un desarrollador optimiza una aplicación que procesa imágenes. Observa que al ejecutar múltiples instancias simultáneamente el rendimiento mejora hasta cierto punto, pero luego empeora significativamente. ¿Cuál es la explicación más probable?",
  opciones: [
    "El sistema alcanza el límite de thrashing en memoria virtual.",
    "Los procesos compiten por recursos de CPU y el overhead de cambios de contexto aumenta.",
    "El sistema operativo limita automáticamente el número de procesos ejecutándose.",
    "Los procesos entran en condición de carrera por acceso a archivos."
  ],
  correcta: 1,
  justificacion: "Es la curva clásica de saturación: mientras haya núcleos libres, sumar instancias aprovecha paralelismo real y el rendimiento sube. Pasado ese punto los procesos se pelean la misma CPU, el planificador hace cada vez más cambios de contexto y **cada cambio es tiempo que no se usa para trabajar**. El overhead se come la ganancia.",
  descarte: "Thrashing es un fenómeno de **memoria** (page faults constantes) y el enunciado no menciona presión de memoria ni swap. El SO no limita procesos automáticamente de esa forma. Y las instancias son procesos separados que no comparten memoria, así que no hay condición de carrera."
},

{
  id: "p1-14", pep: 1, num: 14, puntos: 1, tema: "Utilización de CPU",
  contexto: "Servidor de juegos con: planificador Round Robin, quantum = 100 ms; timer del sistema (HZ) = 10 (tick cada 100 ms); overhead administrativo por tick = 5 ms; tiempo de cambio de contexto = 12 ms. Los procesos NO hacen I/O y siempre hay al menos 2 procesos listos.",
  enunciado: "Un proceso ejecuta por 100 ms, luego el sistema gasta 5 ms en overhead y 12 ms en cambio de contexto. Calcule la utilización del procesador:",
  opciones: [
    "85.5 % – El sistema tiene overhead significativo",
    "88.2 % – El sistema tiene buen rendimiento pero mejorable",
    "91.7 % – El sistema es eficiente con overhead moderado",
    "94.3 % – El sistema es altamente optimizado"
  ],
  correcta: 0,
  justificacion: "Utilización = tiempo útil ÷ tiempo total del ciclo. El ciclo completo es: 100 ms de trabajo real + 5 ms de overhead del tick + 12 ms de cambio de contexto = **117 ms**, de los cuales solo 100 son productivos.",
  diagrama: `|<---- 100 ms útil ---->|<-5->|<-- 12 -->|
        proceso            tick   ctx switch

U = 100 / (100 + 5 + 12)
  = 100 / 117
  = 0,8547  →  85,5 %`,
  descarte: "Los otros valores salen de olvidar uno de los dos overheads: 100/112 = 89,3 % (sin el tick) o 100/105 = 95,2 % (sin el cambio de contexto). Hay que sumar los dos."
},

{
  id: "p1-15", pep: 1, num: 15, puntos: 1, tema: "SPN / estimación exponencial",
  contexto: "Dado cierto planificador SPN (SJF), se estima el tiempo de servicio de los procesos como la siguiente ráfaga de procesador (CPU burst) utilizando la fórmula τ(n+1) = α·t(n) + (1−α)·τ(n), donde τ(n+1) es la ráfaga estimada a partir de la ráfaga anterior t(n) y la estimación anterior τ(n). Esto se calcula para cada proceso. La predicción inicial es 16 ms. La función de decisión de SPN planifica al procesador con menor estimación; si dos procesos tienen la misma, se selecciona aquel que más tiempo ha estado esperando. Recuerde que los procesos pasan por ráfagas de CPU y de I/O.",
  enunciado: "En un sistema que implementa SPN con estimación exponencial usando τ(n+1) = α·t(n) + (1−α)·τ(n), ¿qué ocurre cuando α = 0?",
  opciones: [
    "El sistema se comporta como Round Robin",
    "El sistema se comporta como FCFS porque todas las estimaciones son iguales",
    "El sistema solo considera la ráfaga de CPU más reciente",
    "El sistema entra en deadlock porque no puede estimar tiempos"
  ],
  correcta: 1,
  justificacion: "Con α = 0 el término de la ráfaga real se anula y queda τ(n+1) = τ(n): la estimación se congela en el valor inicial para todos. Si todos \"miden\" lo mismo, SPN no puede discriminar y cae en su criterio de desempate, que es atender al que lleva más rato esperando: **FCFS**.",
  descarte: "\"Solo considera la ráfaga más reciente\" describe α = 1, el caso opuesto. RR necesita quantum, que aquí no existe. Y el deadlock no tiene nada que ver: no hay recursos disputados, solo una fórmula que da siempre el mismo número."
},

{
  id: "p1-16", pep: 1, num: 16, puntos: 1, tema: "Inanición",
  enunciado: "¿En cuál de los siguientes escenarios es más probable que ocurra inanición?",
  opciones: [
    "Sistema con planificador FCFS y procesos de duración similar",
    "Sistema con planificador Round Robin y quantum pequeño",
    "Sistema con planificador SRT con llegada continua de procesos cortos",
    "Sistema con planificador HRRN independiente de la carga"
  ],
  correcta: 2,
  justificacion: "SRT (y SPN) siempre prefiere al de menor tiempo restante. Si no paran de llegar procesos cortos, un proceso largo queda eternamente postergado: cada vez que va a tocarle, aparece otro más corto que se le cuela. Eso es **inanición** de manual.",
  descarte: "FCFS respeta el orden de llegada: todos avanzan, nadie se salta la fila. RR reparte quantum de manera cíclica, así que todos reciben CPU (quantum chico solo aumenta el overhead, no genera inanición). HRRN incorpora el tiempo de espera en la fórmula de prioridad, o sea que mientras más esperas, más prioridad ganas: está diseñado justamente para evitar inanición."
},

{
  id: "p1-17", pep: 1, num: 17, puntos: 1, tema: "Hebras (pthreads)",
  enunciado: "¿Cuál de las siguientes afirmaciones sobre threads es correcta?",
  opciones: [
    "Los threads de un proceso siempre comparten el stack",
    "Los threads a nivel de usuario no pueden ejecutarse en paralelo en sistemas multiprocesador",
    "Los threads del kernel siempre tienen mejor rendimiento que los threads de usuario",
    "Los threads de un proceso comparten el mismo espacio de direcciones de memoria"
  ],
  correcta: 3,
  justificacion: "Ésa es justamente la definición de hebra: todas las hebras de un proceso viven dentro de la **misma imagen de memoria**. Comparten código, datos globales y heap. Lo único propio de cada hebra es su stack, sus registros y su program counter — por eso son livianas y por eso aparecen las condiciones de carrera.",
  descarte: "El stack es lo único que NO comparten. Los threads de usuario sí pueden correr en paralelo si el mapeo es many-to-many o one-to-one; el problema real del modelo puro many-to-one es que si una hebra bloquea, bloquea a todo el proceso. Y \"siempre mejor rendimiento\" es falso: los kernel threads pagan un syscall en cada creación y cambio, así que en operaciones puramente de gestión los de usuario son más rápidos."
},

{
  id: "p1-18", pep: 1, num: 18, puntos: 1, tema: "Condición de carrera",
  contexto: "Un banco implementa el siguiente código para procesar múltiples transacciones simultáneamente. El equipo reporta inconsistencias en el saldo final.",
  enunciado: "Analice el código y determine cuál es el problema principal:",
  codigo: `int saldo_global = 1000;
pthread_mutex_t mutex_saldo;

void* procesar_transaccion(void *arg) {
  int monto = *(int*)arg;
  int saldo_temp = saldo_global;      // LEE
  usleep(100000);                     // se va a dormir aquí
  if (saldo_temp >= monto) {
    saldo_global = saldo_temp - monto; // ESCRIBE con dato viejo
    ...
  }
  return NULL;
}

int main() {
  pthread_mutex_init(&mutex_saldo, NULL);   // se inicializa...
  // ...pero jamás se hace lock/unlock
}`,
  opciones: [
    "El mutex se inicializa pero nunca se usa, permitiendo condiciones de carrera en el acceso al saldo",
    "El problema es que usleep() causa que los threads se ejecuten secuencialmente",
    "Los montos se pasan incorrectamente a los threads causando valores erróneos",
    "saldo_global debería ser declarado como volatile para evitar optimizaciones del compilador"
  ],
  correcta: 0,
  justificacion: "El mutex está declarado e inicializado, pero **no hay ni un solo `pthread_mutex_lock`/`unlock`** en el código. La sección crítica queda desprotegida: las tres hebras leen `saldo_global` (las tres ven 1000), duermen, y después escriben usando ese valor viejo. El último que escribe pisa a los anteriores y se pierden transacciones. Es el patrón lost update clásico.",
  descarte: "`usleep` no secuencializa nada — al contrario, ensancha la ventana en que las hebras se pisan, haciendo la carrera *más* probable. Los montos se pasan bien (`&montos[i]`, cada uno con su dirección distinta). Y `volatile` solo evita optimizaciones de caché del compilador: **no da atomicidad**, así que no arregla nada aquí."
},

{
  id: "p1-19", pep: 1, num: 19, puntos: 1, tema: "Cambio de modo vs contexto",
  enunciado: "¿Cuál de las siguientes instrucciones gatilla un cambio en el modo de ejecución y NO necesariamente un cambio de contexto, en un SO que se ejecuta en el contexto de los procesos usuarios?",
  opciones: [
    "sleep(5);",
    "exit(0);",
    "waitpid(pid, NULL, 0);",
    "pid_t pid = fork();"
  ],
  correcta: 3,
  justificacion: "`fork()` es un syscall, así que hay cambio de modo obligado. Pero después del fork el **padre puede seguir corriendo tranquilamente**: nada lo obliga a soltar la CPU. Puede que el planificador prefiera al hijo, puede que no. Por eso el cambio de contexto es *posible* pero no *necesario*.",
  descarte: "Los otros tres sacan al proceso de la CPU sí o sí: `sleep(5)` lo bloquea 5 segundos, `waitpid` lo bloquea hasta que termine el hijo, y `exit(0)` derechamente lo termina. En los tres casos el planificador tiene que elegir a otro."
},

{
  id: "p1-20", pep: 1, num: 20, puntos: 1, tema: "Planificación (SRT)",
  enunciado: "En un SO con planificador SRT y sólo un procesador, un proceso será desapropiado cuando:",
  opciones: [
    "Llega un nuevo proceso en estado blocked y este tiene mayor prioridad SP que el proceso que está ejecutándose.",
    "Llega un nuevo proceso en blocked y este tiene mayor tiempo de servicio que el proceso que está ejecutándose.",
    "Llega un nuevo proceso en ready y este tiene mayor prioridad SP que el proceso que está ejecutándose.",
    "Llega un nuevo proceso en ready y tiene menor tiempo de servicio que el tiempo de ejecución que le resta al proceso que está ejecutándose."
  ],
  correcta: 3,
  justificacion: "SRT = *Shortest Remaining Time*. Es la versión apropiativa de SPN: cada vez que llega alguien a la cola de **ready**, se compara su tiempo de servicio con el tiempo que le **queda** al que está corriendo. Si el recién llegado es más corto, lo desapropia al tiro.",
  descarte: "Un proceso que llega en estado **blocked** no compite por la CPU: está esperando I/O, el planificador ni lo mira. Y SRT no usa prioridades estáticas (SP): su único criterio es el tiempo restante."
},

{
  id: "p1-21", pep: 1, num: 21, puntos: 2, tema: "fork / salida de código",
  contexto: "Analice el siguiente fragmento de código, que se ejecuta sin errores. Responda las tres preguntas asociadas a él.",
  enunciado: "¿Qué se muestra por la salida estándar?",
  codigo: `int main() {
  int a = 0;
  int i;
  for (i = 1; i <= 2; i++) {
    a++;
    printf("primer a %d\\n", a);
    a--;
    fork();
    printf("segundo a %d\\n", a);
  }
}`,
  opciones: [
    "1 línea \"primer a 1\" y 2 líneas \"segundo a 0\"",
    "1 línea \"primer a 0\" y 2 líneas \"segundo a 1\"",
    "3 líneas \"primer a 1\" y 6 líneas \"segundo a 0\"",
    "3 líneas \"primer a 0\" y 6 líneas \"segundo a 1\""
  ],
  correcta: 2,
  justificacion: "Primero fíjate en los valores: `a++` deja a en 1 justo antes del primer printf, y `a--` la devuelve a 0 antes del segundo. Así que siempre son **\"primer a 1\"** y **\"segundo a 0\"**. Ahora las cantidades: en i=1 hay 1 proceso que imprime \"primer\" y luego forkea, quedando 2 que imprimen \"segundo\". En i=2 esos 2 imprimen \"primer\" y forkean, quedando 4 que imprimen \"segundo\".",
  diagrama: `i=1:   P0                    →  1 "primer a 1"
       fork
       P0   P1               →  2 "segundo a 0"

i=2:   P0   P1               →  2 "primer a 1"
       fork fork
       P0 P2 P1 P3           →  4 "segundo a 0"
       ─────────────────────────────────────────
       TOTAL: 1+2 = 3 "primer"   2+4 = 6 "segundo"`,
  descarte: "Las opciones con \"primer a 0\" y \"segundo a 1\" invierten el efecto del `a++`/`a--`. Las que dan 1 y 2 líneas olvidan que el ciclo corre dos veces y que los hijos también siguen iterando."
},

{
  id: "p1-22", pep: 1, num: 22, puntos: 1, tema: "Imagen del proceso",
  contexto: "Considere el siguiente código (el fork está dentro del for, después del a--).",
  enunciado: "Si la ejecución del programa se encuentra justo después del fork y el valor de la variable i es igual a 1, se puede observar que:",
  codigo: `int main() {
  int a = 0;
  int i;
  for (i = 1; i <= 2; i++) {
    a++;
    printf("primer a %d\\n", a);
    a--;
    fork();
    printf("segundo a %d\\n", a);
  }
}`,
  opciones: [
    "En el user stack del proceso padre se encuentra la variable a con valor 0.",
    "En el kernel stack del proceso hijo se encuentra la variable i con valor 1.",
    "En el user stack del proceso hijo se encuentra la variable i con valor 0.",
    "En el kernel stack del proceso padre se encuentra la variable a con valor 1."
  ],
  correcta: 0,
  justificacion: "Dos ideas que hay que tener clarísimas. Primera: `a` e `i` son variables **locales de main**, así que viven en el **user stack**, nunca en el kernel stack (ése guarda contexto de syscalls e interrupciones, no variables del programa). Segunda: en ese punto ya se ejecutó `a--`, así que `a` vale **0**. La alternativa junta ambas cosas bien.",
  descarte: "Las dos que hablan del kernel stack están descartadas de entrada por lo anterior. Y la que dice que en el hijo `i` vale 0 se contradice con el enunciado: el hijo es copia exacta del padre, así que hereda `i = 1`."
},

{
  id: "p1-23", pep: 1, num: 23, puntos: 1, tema: "Imagen del proceso",
  contexto: "Analice el siguiente fragmento, que hace fork dentro de un ciclo for.",
  enunciado: "Con respecto a la imagen de los procesos creados en el código se puede afirmar que:",
  codigo: `int main() {
  int a = 0;
  int i;
  for (i = 1; i <= 2; i++) {
    a++;
    printf("primer a %d\\n", a);
    a--;
    fork();
    printf("segundo a %d\\n", a);
  }
}`,
  opciones: [
    "La variable a es compartida entre todos los procesos creados, por lo que todos los procesos pueden leer y modificar su valor.",
    "El segmento heap se encuentra vacío en todos los procesos.",
    "El segmento PCB es compartido entre todos los procesos.",
    "No es necesario un kernel stack cuando un SO se ejecuta en el contexto de los procesos usuarios."
  ],
  correcta: 1,
  justificacion: "En el código no hay ni un `malloc`, `calloc` o `realloc`, así que **nadie reservó memoria dinámica**: el heap queda vacío en el proceso original y, como el fork copia la imagen tal cual, también en todos los hijos.",
  descarte: "La variable `a` NO se comparte: `fork()` duplica el espacio de direcciones, cada proceso trabaja sobre su propia copia (esto es lo contrario a las hebras). El PCB es una estructura del kernel, una por proceso, jamás compartida — y ni siquiera es un \"segmento\" de la imagen. Y el kernel stack es indispensable justamente cuando el SO corre en el contexto del proceso usuario: es donde se apila el contexto al entrar a modo kernel."
},

{
  id: "p1-24", pep: 1, num: 24, puntos: 1, tema: "FCFS vs RR virtual",
  enunciado: "Indique qué se puede considerar una diferencia entre las políticas FCFS y RR virtual:",
  opciones: [
    "Una política favorece minimizar el tiempo de respuesta, mientras que la otra no necesariamente.",
    "FCFS es apropiativo y permite que el proceso continúe cuando hace I/O; RR virtual abandona el procesador al hacer I/O aunque le quede quantum.",
    "En una política un proceso que sale sin terminar va a la cabeza de la cola; en la otra va al final.",
    "En RR virtual, al volver a ejecutarse se le asigna un quantum mayor; FCFS continúa sin quantum."
  ],
  correcta: 0,
  justificacion: "RR (y su variante virtual) está diseñado precisamente para **minimizar el tiempo de respuesta**: reparte quantum para que todos toquen la CPU rápido. FCFS no persigue ese objetivo — si el primero de la fila es un proceso larguísimo, todos los que vienen atrás esperan un montón antes de responder.",
  descarte: "FCFS es **no apropiativo**, no apropiativo como dice esa alternativa (error de bulto). Lo del quantum mayor al volver es inventado: en RR el quantum es fijo. Y lo de \"va a la cabeza de la cola\" describe mal ambas políticas: en RR virtual lo que existe es una **cola auxiliar** con prioridad para los que vuelven de I/O."
},

{
  id: "p1-25", pep: 1, num: 25, puntos: 1, tema: "TAT / SPN vs FCFS",
  enunciado: "Suponga que en un SO los procesos no hacen I/O. Para un mismo stream de procesos ¿bajo qué condiciones el TAT normalizado promedio será el mismo si planificamos con una política SPN o con FCFS?",
  opciones: [
    "Si los procesos llegan ordenados de mayor a menor respecto al tiempo de servicio.",
    "Si los procesos llegan ordenados de menor a mayor respecto al tiempo de servicio.",
    "No es necesario un orden particular de llegada, siempre será el mismo TAT normalizado promedio para ambas políticas.",
    "No existen condiciones que lleven al mismo TAT normalizado promedio para ambas políticas."
  ],
  correcta: 1,
  justificacion: "SPN atiende siempre al más corto primero. FCFS atiende en orden de llegada. Si los procesos **ya vienen ordenados de menor a mayor** tiempo de servicio, entonces el orden de llegada coincide exactamente con el orden que elegiría SPN: ambas políticas producen el mismo Gantt y, por lo tanto, el mismo TAT.",
  descarte: "De mayor a menor es el peor caso: ahí FCFS y SPN dan resultados opuestos (efecto convoy). Y decir que \"siempre coinciden\" o que \"nunca pueden coincidir\" ignora justamente este caso particular donde sí se igualan."
},

{
  id: "p1-26", pep: 1, num: 26, puntos: 3, tema: "fork / conteo de procesos",
  enunciado: "Asuma que el siguiente código se ejecuta sin errores y que los valores de N = 2 y A = 3. ¿Cuál es el total de procesos generados?",
  codigo: `void main() {
  int p, a;
  for (p = 0; p < N; p++)
    if (fork() != 0) break;
  for (a = 0; a < A-1; a++)
    if (fork() == 0) break;
}`,
  opciones: [
    "El código sólo genera un proceso dado que ambos fork están condicionados a la instrucción break",
    "4 procesos.",
    "7 procesos.",
    "9 procesos."
  ],
  correcta: 3,
  justificacion: "Mismo patrón de siempre: **(N+1) × (hijos del 2º for + 1)**. En el primer for rompe el padre (`fork() != 0`), formando una cadena de N+1 = **3** procesos. En el segundo for rompe el hijo (`fork() == 0`), así que el padre completa las A−1 = 2 iteraciones y se queda con **2 hijos**. Cada uno de los 3 procesos genera entonces un grupito de 3. Total = 3 × 3 = **9**.",
  diagrama: `1er for:  P0 ──> H1 ──> H2            (N+1 = 3)

2do for (cada uno hace 2 forks, los hijos rompen):
  P0 ──> h1a, h1b
  H1 ──> h2a, h2b       →  3 x (2+1) = 9 procesos
  H2 ──> h3a, h3b`,
  descarte: "Con N=A=2 el resultado eran 6; subir A a 3 agrega un fork más por rama, no uno más en total. Y de nuevo: el `break` no cancela el fork, que ya se ejecutó al evaluar la condición."
},

{
  id: "p1-27", pep: 1, num: 27, puntos: 1, tema: "Throughput",
  enunciado: "Asuma que siempre hay procesos en la cola de listos (ready) y que el overhead de cambio de contexto es despreciable. El throughput será máximo cuando:",
  opciones: [
    "El planificador es FCFS.",
    "El planificador es RR.",
    "El planificador es SPN.",
    "El planificador es SRT."
  ],
  correcta: 3,
  justificacion: "Throughput = procesos terminados por unidad de tiempo. Para maximizarlo hay que sacarse de encima los procesos cortos lo antes posible, y **SRT** es el que más agresivamente hace eso: no solo elige al más corto, sino que además **desapropia** al que está corriendo si llega alguien con menos tiempo restante. Como el overhead se asume despreciable, no hay penalización por desapropiar.",
  descarte: "SPN va en la dirección correcta pero es no apropiativo: si está corriendo un proceso largo, hay que esperar a que termine aunque lleguen cortitos. FCFS ni siquiera mira la duración. Y RR reparte parejo, lo que alarga a todos por igual: excelente para tiempo de respuesta, mediocre para throughput."
},

{
  id: "p1-28", pep: 1, num: 28, puntos: 1, tema: "Inanición",
  enunciado: "¿Cuál de los siguientes algoritmos podría producir inanición ante la llegada continua de procesos cortos a la cola de listos?",
  opciones: [
    "FCFS",
    "RR",
    "SRT",
    "HRRN"
  ],
  correcta: 2,
  justificacion: "SRT siempre le da la CPU al de menor tiempo restante. Con un flujo constante de procesos cortos, un proceso largo nunca alcanza a ser el más corto de la cola: se queda esperando indefinidamente. Es el caso de inanición típico de las políticas basadas en duración.",
  descarte: "FCFS respeta estrictamente el orden de llegada, así que tarde o temprano a todos les toca. RR rota por la cola dándole quantum a cada uno. HRRN calcula prioridad como (espera + servicio) / servicio: mientras más esperas, más sube tu razón, así que está construido a prueba de inanición."
},

{
  id: "p1-29", pep: 1, num: 29, puntos: 2, tema: "TAT / Gantt",
  contexto: "En la cola de listos hay 3 procesos, donde el proceso i tiene tiempo de servicio Ti = i (1 ≤ i ≤ 3). Los procesos están ordenados de mayor a menor tiempo de servicio, o sea el proceso 3 está en la cabeza de la cola. No hacen I/O, no llegan procesos nuevos y el overhead es cero.",
  enunciado: "Si el planificador es RR con q = 1, el TAT del proceso 3 es:",
  opciones: [
    "1",
    "(1 + 1) + 1",
    "(1 + 2) + (1 + 1) + 1",
    "(1 + 3) + (1 + 2) + (1 + 1) + 1"
  ],
  correcta: 2,
  justificacion: "Todos llegan en t = 0, así que el TAT es simplemente **el instante en que el proceso termina**. Con q = 1 la CPU se reparte de a un tick, en el orden de la cola: P3, P2, P1. P3 necesita 3 quantums, y el último se lo lleva en t = 6.",
  diagrama: `t:  0    1    2    3    4    5    6
    |P3 |P2 |P1 |P3 |P2 |P3 |
             ^         ^    ^
          P1 fin    P2 fin  P3 fin
          (t=3)     (t=5)   (t=6)

TAT(P3) = 6  =  (1+2) + (1+1) + 1
              ┗━ ronda1 ┛ ┗ronda2┛ ┗r3┛`,
  descarte: "La alternativa \"1\" es el TAT de P1 bajo SPN. La de 4 términos suma 10, que excedería el trabajo total del sistema (1+2+3 = 6 unidades): imposible que alguien termine después de eso."
},

{
  id: "p1-30", pep: 1, num: 30, puntos: 2, tema: "TAT / Gantt",
  contexto: "Misma cola: 3 procesos con Ti = i, P3 a la cabeza, sin I/O ni llegadas nuevas, overhead cero.",
  enunciado: "Si el planificador es SPN o SJF, el TAT del proceso 2 es:",
  opciones: [
    "1",
    "(1 + 1) + 1",
    "(1 + 2) + (1 + 1) + 1",
    "(1 + 3) + (1 + 2) + (1 + 1) + 1"
  ],
  correcta: 1,
  justificacion: "SPN ignora el orden de la cola y ordena por tiempo de servicio: primero P1 (1 unidad), después P2 (2), al final P3 (3). Como todos llegaron en t = 0, el TAT de P2 es el instante en que termina: 1 + 2 = **3**, que es lo que vale la expresión (1+1)+1.",
  diagrama: `SPN reordena:  P1  →  P2  →  P3

t:  0    1    2    3    4    5    6
    | P1 |    P2   |      P3      |
         ^         ^              ^
      P1 fin    P2 fin         P3 fin
       (1)        (3)            (6)

TAT(P2) = 3 = (1+1) + 1`,
  descarte: "\"1\" es el TAT de P1. Las expresiones de 3 y 4 términos dan 6 y 10: la primera es el TAT de P3, la segunda no corresponde a nada en este escenario."
},

{
  id: "p1-31", pep: 1, num: 31, puntos: 1, tema: "Planificación (prioridad aleatoria)",
  contexto: "En un SO se implementa un planificador que selecciona al siguiente proceso a ejecutarse según su prioridad. Los procesos definen un atributo priority como una lista de N números enteros entre 0 y 99 (por ejemplo, priority = [0, 15, 80]). El planificador genera un número P aleatorio entre 0 y 99 y lo compara con el priority de los procesos: el proceso que contenga P en su priority es seleccionado. Si más de un proceso contiene a P, se selecciona al que más tiempo ha estado esperando entre ellos. Una vez seleccionado, el proceso corre hasta agotar su quantum de tiempo, se bloquea por I/O o desaloja voluntariamente el procesador.",
  enunciado: "Si los procesos contienen sólo un número en priority y ninguno se repite entre procesos, el planificador se comporta como:",
  opciones: [
    "FCFS",
    "RR",
    "Aleatorio",
    "HRRN"
  ],
  correcta: 2,
  justificacion: "Si cada proceso tiene exactamente un número y todos son distintos, entonces sacar P equivale a **sortear directamente un proceso**. Nunca hay empate, así que el criterio de desempate (el que más ha esperado) jamás se aplica. Queda planificación puramente aleatoria.",
  descarte: "No es FCFS porque el orden de llegada no influye en nada. No es RR porque no hay rotación garantizada: un proceso puede salir sorteado dos veces seguidas y otro nunca. Y no es HRRN porque el tiempo de espera no entra en el cálculo."
},

{
  id: "p1-32", pep: 1, num: 32, puntos: 1, tema: "Planificación (prioridad aleatoria)",
  contexto: "En un SO se implementa un planificador que selecciona al siguiente proceso a ejecutarse según su prioridad. Los procesos definen un atributo priority como una lista de N números enteros entre 0 y 99 (por ejemplo, priority = [0, 15, 80]). El planificador genera un número P aleatorio entre 0 y 99 y lo compara con el priority de los procesos: el proceso que contenga P en su priority es seleccionado. Si más de un proceso contiene a P, se selecciona al que más tiempo ha estado esperando entre ellos. Una vez seleccionado, el proceso corre hasta agotar su quantum de tiempo, se bloquea por I/O o desaloja voluntariamente el procesador.",
  enunciado: "Si los procesos contienen todos los números posibles en priority, el planificador se comporta como:",
  opciones: [
    "FCFS",
    "RR",
    "Aleatorio",
    "HRRN"
  ],
  correcta: 1,
  justificacion: "Si todos tienen todos los números, salga el P que salga **todos son candidatos siempre**. El sorteo se vuelve irrelevante y siempre decide el desempate: gana el que más tiempo lleva esperando, o sea el primero de la cola. Y como el enunciado dice que el proceso corre **hasta agotar su quantum** y luego vuelve a la cola, eso es exactamente Round Robin.",
  descarte: "La trampa es contestar FCFS: efectivamente se elige al que más ha esperado, pero FCFS es no apropiativo y aquí hay quantum. Con quantum + rotación por antigüedad, el nombre correcto es RR. Aleatorio queda descartado porque el azar ya no discrimina a nadie."
},

{
  id: "p1-33", pep: 1, num: 33, puntos: 1, tema: "Planificación (prioridad aleatoria)",
  contexto: "En un SO se implementa un planificador que selecciona al siguiente proceso a ejecutarse según su prioridad. Los procesos definen un atributo priority como una lista de N números enteros entre 0 y 99 (por ejemplo, priority = [0, 15, 80]). El planificador genera un número P aleatorio entre 0 y 99 y lo compara con el priority de los procesos: el proceso que contenga P en su priority es seleccionado. Si más de un proceso contiene a P, se selecciona al que más tiempo ha estado esperando entre ellos. Una vez seleccionado, el proceso corre hasta agotar su quantum de tiempo, se bloquea por I/O o desaloja voluntariamente el procesador.",
  enunciado: "Si un grupo de procesos contiene el 50% + 1 de los números en priority, el planificador da prioridad a:",
  opciones: [
    "El grupo de procesos con más números en priority, con un generador que sigue una distribución normal.",
    "El grupo de procesos con más números en priority, con un generador que sigue una distribución uniforme.",
    "El grupo de procesos con menos números en priority, con un generador que sigue una distribución normal.",
    "El grupo de procesos con menos números en priority, con un generador que sigue una distribución uniforme."
  ],
  correcta: 1,
  justificacion: "Con distribución **uniforme** todos los números tienen la misma probabilidad de salir, así que la probabilidad de que gane un grupo es proporcional a **cuántos números tiene**. El grupo que se quedó con el 50 % + 1 tiene, por construcción, más de la mitad de las chances: sale favorecido de forma predecible.",
  descarte: "Con distribución normal la probabilidad se concentra en el centro del rango (cerca del 50), así que ya no manda la cantidad de números sino **cuáles** números tienes: un grupo con pocos números pero todos centrales podría ganarle a uno con muchos números en los extremos. Por eso las alternativas con \"normal\" no permiten concluir nada, y las que favorecen al grupo con menos números están al revés."
},

{
  id: "p1-34", pep: 1, num: 34, puntos: 1, tema: "SPN vs RR",
  enunciado: "¿Qué condición o condiciones son necesarias y suficientes para que SPN y RR se comporten exactamente igual para el tiempo de respuesta?",
  opciones: [
    "Todos los procesos deben tener el mismo tiempo de servicio.",
    "El quantum debe ser igual al tiempo de servicio.",
    "Todos los procesos deben tener el mismo tiempo de servicio y el quantum debe ser igual al tiempo de servicio.",
    "Los procesos vienen ordenados de mayor a menor tiempo de servicio y el quantum es igual al promedio."
  ],
  correcta: 2,
  justificacion: "Se necesitan **las dos condiciones juntas**, y la pregunta pide condiciones *necesarias y suficientes*. Si el quantum ≥ tiempo de servicio, ningún proceso alcanza a ser desapropiado y RR degenera en FCFS. Y si además todos duran lo mismo, SPN no tiene a quién preferir y también atiende en orden de llegada. Recién ahí ambos producen el mismo Gantt.",
  descarte: "Cada condición por separado no basta: con solo tiempos iguales pero quantum chico, RR sigue rotando y fragmentando la ejecución. Con solo quantum grande pero tiempos distintos, RR=FCFS pero SPN reordena por duración. La última alternativa mezcla condiciones que no garantizan nada."
},

{
  id: "p1-35", pep: 1, num: 35, puntos: 3, tema: "HZ y quantum",
  enunciado: "En un SO, el system timer gatilla un tick cada 2 ms y se establece un quantum de tiempo de 100·HZ/1000. Bajo un planificador RR y procesos sin ráfagas de E/S:",
  opciones: [
    "La variable HZ es 1000 y la duración del quantum es de 0,1 s.",
    "La variable HZ es 1000 y la duración del quantum es de 0,2 s.",
    "La variable HZ equivale a 500 y el quantum de tiempo resulta en 0,1 segundos.",
    "La variable HZ equivale a 500 y el quantum de tiempo resulta en 0,2 segundos."
  ],
  correcta: 2,
  justificacion: "HZ es la cantidad de ticks por segundo. Si cada tick dura 2 ms, en un segundo caben 1000/2 = **500 ticks**, o sea HZ = 500. La fórmula 100·HZ/1000 entrega el quantum **en ticks**, no en segundos: 100 × 500 / 1000 = 50 ticks. Y 50 ticks × 2 ms = 100 ms = **0,1 s**.",
  diagrama: `tick = 2 ms   →   HZ = 1000 ms / 2 ms = 500 ticks/s

quantum = 100 · HZ / 1000
        = 100 · 500 / 1000
        = 50 ticks              (¡ticks, no ms!)

50 ticks × 2 ms/tick = 100 ms = 0,1 s`,
  descarte: "HZ = 1000 correspondería a ticks de 1 ms, no de 2. Y el 0,2 s sale de confundir las unidades: si tomas los 50 y los multiplicas mal, o si asumes HZ=1000 con ticks de 2 ms (que es inconsistente)."
},

{
  id: "p1-36", pep: 1, num: 36, puntos: 1, tema: "Cambio de modo vs contexto",
  enunciado: "Una transición en el modo de ejecución derivará necesariamente en un cambio de contexto siempre que:",
  opciones: [
    "El sistema operativo corra bajo el contexto de un proceso de usuario.",
    "La arquitectura del sistema operativo esté estructurada en base a procesos.",
    "El proceso invoque el syscall fork().",
    "El proceso sea suspendido por la interrupción del reloj del sistema."
  ],
  correcta: 1,
  justificacion: "Cuando el SO está **estructurado en base a procesos**, el kernel no corre \"dentro\" del proceso que hizo la llamada: los servicios del sistema son procesos separados, con su propio PCB y su propia imagen. Por lo tanto, atender un syscall obliga a saltar de un proceso a otro, y eso es cambio de contexto por definición.",
  descarte: "Cuando el SO corre **en el contexto del proceso usuario** pasa justo lo contrario: el kernel se ejecuta usando el kernel stack del mismo proceso, así que hay cambio de modo sin cambio de contexto. `fork()` no obliga al padre a soltar la CPU. Y la interrupción de reloj es un caso donde sí hay cambio de contexto, pero es un caso particular, no la condición general que pide la pregunta."
},

{
  id: "p1-37", pep: 1, num: 37, puntos: 1, tema: "Imagen del proceso / stack",
  contexto: "Analice el estado del sistema para el siguiente código. Note que la función sub está definida pero nunca es invocada.",
  enunciado: "Mientras la ejecución reside en la línea 1, el segmento user stack contendrá los marcos con parámetros de:",
  codigo: `int add (int x, int y){ return x + y; }
int sub (int x, int y){ return add (x, -y); }
int main(int argc, char const *argv[]) {
  int result = add(1, 2);
  return result;
}`,
  opciones: [
    "Únicamente la función main.",
    "Las funciones main y add.",
    "Las funciones main y sub.",
    "Las funciones main, add y sub."
  ],
  correcta: 1,
  justificacion: "El stack refleja la **cadena de llamadas activa en ese instante**. La línea 1 es el cuerpo de `add`, y a `add` solo se llega desde `main` (línea 4). Entonces hay dos marcos apilados: el de main abajo y el de add arriba.",
  diagrama: `      USER STACK
   ┌──────────────┐
   │  add(1, 2)   │  ← tope (ejecutando línea 1)
   ├──────────────┤
   │    main      │
   └──────────────┘
   sub() nunca se llamó → no tiene marco`,
  descarte: "`sub` no aparece en ninguna parte: está definida pero **nadie la invoca**. Definir una función no le reserva stack; el marco se crea recién al llamarla. Y \"únicamente main\" olvida que estamos justamente dentro de add."
},

{
  id: "p1-38", pep: 1, num: 38, puntos: 1, tema: "Imagen del proceso / heap",
  contexto: "Analice el estado del sistema para el siguiente código. Note que la función sub está definida pero nunca es invocada.",
  enunciado: "Situando el flujo en la línea 5, respecto al segmento heap es posible concluir que:",
  codigo: `int add (int x, int y){ return x + y; }
int sub (int x, int y){ return add (x, -y); }
int main(int argc, char const *argv[]) {
  int result = add(1, 2);
  return result;
}`,
  opciones: [
    "Mantiene memoria reservada para la variable result.",
    "Ha liberado el espacio asignado a las variables x e y.",
    "Se encuentra totalmente ocupado por la imagen del proceso.",
    "Permanece sin ser utilizado por el proceso."
  ],
  correcta: 3,
  justificacion: "El heap solo se usa con memoria **dinámica** (`malloc`, `calloc`, `realloc`). Este programa no tiene ninguna de esas llamadas: `result`, `x` e `y` son variables locales que viven en el **user stack** y se destruyen solas al retornar cada función. El heap queda intacto.",
  descarte: "Las dos primeras alternativas confunden stack con heap. La tercera no tiene sentido: el heap es un segmento *de* la imagen del proceso, no algo que la imagen \"ocupe\"."
},

{
  id: "p1-39", pep: 1, num: 39, puntos: 2, tema: "Imagen del proceso / kernel stack",
  contexto: "Analice el estado del sistema para el siguiente código. Note que la función sub está definida pero nunca es invocada.",
  enunciado: "Si se modifica el retorno de sub por return x - y;, tras recompilar y ejecutar, el kernel stack:",
  codigo: `int add (int x, int y){ return x + y; }
int sub (int x, int y){ return add (x, -y); }
int main(int argc, char const *argv[]) {
  int result = add(1, 2);
  return result;
}`,
  opciones: [
    "Reduce su uso al no requerir guardar estados relativos a la función add.",
    "Incrementa su ocupación debido a los cambios en el código fuente.",
    "No existe en el sistema al no ejecutarse llamadas al sistema.",
    "Está presente en el sistema, pero no es requerido por la lógica del proceso."
  ],
  correcta: 3,
  justificacion: "Todo proceso tiene un kernel stack desde que nace: se crea junto con el PCB, exista o no un syscall. Pero este programa solo suma enteros — nunca pide nada al SO — así que el kernel stack está **presente pero sin usar por la lógica del proceso**. Además, cambiar `sub` no altera nada: `sub` sigue sin ser llamada.",
  descarte: "Las llamadas a funciones de usuario (`add`, `sub`) se apilan en el **user stack**, no en el kernel stack, así que no lo reducen ni lo aumentan. Y decir que el kernel stack \"no existe\" es falso: se asigna siempre al crear el proceso."
},

{
  id: "p1-40", pep: 1, num: 40, puntos: 1, tema: "Cambio de contexto",
  enunciado: "Bajo un SO basado en procesos de usuario y un planificador FIFO, se prescindirá de un cambio de contexto al ejecutar:",
  opciones: [
    "int c = getchar(); para lectura desde el flujo de entrada estándar.",
    "int c = fgetc(fp); donde fp es un puntero de archivo abierto para lectura.",
    "sleep(1);",
    "pid_t pid = getpid();"
  ],
  correcta: 3,
  justificacion: "`getpid()` es el syscall más barato que existe: el kernel lee el PID desde el PCB y lo devuelve al toque. Hay **cambio de modo** (usuario → kernel → usuario), pero el proceso nunca deja de ser el dueño de la CPU, así que no hay cambio de contexto.",
  descarte: "`getchar()` bloquea esperando que el usuario teclee algo. `fgetc(fp)` puede tener que ir al disco a buscar el bloque. `sleep(1)` bloquea explícitamente por un segundo. En los tres el proceso pasa a *blocked* y suelta el procesador."
},

{
  id: "p1-41", pep: 1, num: 41, puntos: 2, tema: "Planificación aleatoria",
  enunciado: "En un sistema con planificación aleatoria de procesos, la elección del algoritmo probabilístico implica que:",
  opciones: [
    "La presencia de una distribución normal puede inducir escenarios de inanición.",
    "Una distribución uniforme conlleva inevitablemente a la inanición.",
    "Bajo una distribución normal, la inanición es un evento imposible.",
    "Independientemente de la distribución, se garantiza la ausencia de inanición."
  ],
  correcta: 0,
  justificacion: "La distribución **normal** concentra casi toda la probabilidad alrededor de la media y deja las colas con probabilidad ínfima. Los procesos que caigan en esos extremos pueden pasar muchísimo tiempo sin ser elegidos — en la práctica, inanición. La normal *puede* inducirla, que es exactamente lo que dice la alternativa.",
  descarte: "La distribución **uniforme** reparte igual probabilidad a todos: nadie queda estructuralmente postergado, así que \"inevitablemente conlleva a inanición\" es falso. Y las dos alternativas que garantizan ausencia de inanición ignoran justamente el problema de las colas de la normal."
},

{
  id: "p1-42", pep: 1, num: 42, puntos: 1, tema: "Políticas de planificación",
  enunciado: "Tres procesos A, B y C alternan su ejecución en ráfagas de 10 unidades, retornando a la cola hasta su finalización. ¿Qué política de planificación es compatible con este comportamiento?",
  opciones: [
    "FIFO (FCFS)",
    "Round Robin Virtual (RR Virtual)",
    "Shortest Process Next (SPN)",
    "Planificación por Prioridad"
  ],
  correcta: 1,
  justificacion: "Dos pistas delatan a RR: las ráfagas son **de tamaño fijo** (10 unidades, o sea un quantum) y los procesos **vuelven a la cola sin haber terminado**. Eso solo pasa con una política apropiativa por tiempo, y de las alternativas la única de la familia RR es Round Robin Virtual.",
  descarte: "FIFO y SPN son no apropiativos: un proceso corre hasta terminar o bloquearse, jamás vuelve a la cola a medio camino. La planificación por prioridad tampoco produce rebanadas iguales para todos: el más prioritario correría hasta terminar."
},

{
  id: "p1-43", pep: 1, num: 43, puntos: 2, tema: "Políticas de planificación",
  enunciado: "Un algoritmo selecciona procesos basándose en una prioridad ligada directamente al tiempo de permanencia en estado ready, actualizándola cada T unidades. Este diseño es análogo a:",
  opciones: [
    "Shortest Process Next (SPN)",
    "Shortest Remaining Time (SRT)",
    "Round Robin (RR)",
    "Highest Response Ratio Next (HRRN)"
  ],
  correcta: 2,
  justificacion: "Lee con cuidado: la prioridad depende **únicamente del tiempo que el proceso lleva en ready**, y se recalcula cada T unidades. El que más ha esperado sube al tope, corre, y al volver a la cola su espera se reinicia mientras los demás siguen acumulando. El resultado neto es una **rotación cíclica pareja**, donde el T de actualización hace las veces de quantum: eso es Round Robin.",
  diagrama: `prioridad = tiempo esperando en ready  (se actualiza cada T)

  A espera más → A corre → vuelve al final con espera 0
  B espera más → B corre → vuelve al final con espera 0
  C espera más → C corre → ...

  Turnos parejos y cíclicos  =  ROUND ROBIN`,
  descarte: "HRRN es el distractor fuerte, y por eso hay que afinar: su fórmula es **(espera + servicio) / servicio**, o sea combina la espera **con el tiempo de servicio**. Aquí el tiempo de servicio no aparece por ningún lado — solo la espera —, y sin ese factor no hay razón de respuesta, solo turnos. SPN y SRT ni siquiera miran la espera: ordenan por duración."
},

{
  id: "p1-44", pep: 1, num: 44, puntos: 3, tema: "Utilización de CPU",
  enunciado: "Sea T el tiempo medio de CPU antes de E/S, S el tiempo de cambio de contexto y E el overhead de E/S. En un entorno RR con quantum Q tal que Q ≥ S + T + E, la utilización U es:",
  opciones: [
    "U = T / (T + S + E)",
    "U = T / (T + (T/Q)·S)",
    "U = T / (T + (T/S)·S)",
    "No se cuenta con datos suficientes para determinar U."
  ],
  correcta: 0,
  justificacion: "La condición **Q ≥ S + T + E** es la clave: el quantum alcanza de sobra para toda la ráfaga, así que el proceso **nunca es desapropiado por tiempo** — siempre sale antes por su propia operación de E/S. Entonces cada ciclo es siempre el mismo: T de trabajo útil, más S de cambio de contexto, más E de overhead de E/S. La utilización es el trabajo útil sobre el ciclo completo.",
  diagrama: `|<--- T --->|<- S ->|<- E ->|<--- T --->| ...
   CPU útil    ctx sw   I/O ovh

U = T / (T + S + E)

El quantum Q nunca aparece en la fórmula porque,
al ser Q ≥ S+T+E, jamás se llega a agotar.`,
  descarte: "Las fórmulas con (T/Q)·S modelan el caso contrario — cuando el quantum es más chico que la ráfaga y hay que contar cuántas veces se desapropia. Aquí eso no pasa nunca. Y (T/S)·S se simplifica a T, lo que daría U = T/2T = ½ sin importar los datos: no tiene sentido."
},

{
  id: "p1-45", pep: 1, num: 45, puntos: 3, tema: "fork / conteo de procesos",
  enunciado: "Analice el siguiente fragmento y determine la cantidad total de procesos generados durante su ejecución exitosa:",
  codigo: `main() {
  pid_t pid, npid;
  int i, j;
  for (i = 0; i < 1; i++) {
    pid = getpid();
    for (int j = 0; j <= i+1; j++)
      if (!fork()) break;
    npid = getpid();
    if (npid == pid) break;
  }
}`,
  opciones: [
    "Se crea un único proceso debido a la interrupción por sentencia break.",
    "El flujo de ejecución deriva en la creación de 3 procesos.",
    "El flujo de ejecución deriva en la creación de 9 procesos.",
    "El flujo de ejecución deriva en la creación de 33 procesos."
  ],
  correcta: 1,
  justificacion: "El for externo corre **una sola vez** (`i < 1`), así que todo se resuelve en el for interno. Ahí j va de 0 a i+1 = 1, o sea **2 iteraciones**. La condición `!fork()` es verdadera cuando fork devuelve 0, así que rompe el **hijo** y el padre completa las dos vueltas: se queda con 2 hijos. Total = 1 padre + 2 hijos = **3 procesos**.",
  diagrama: `for interno (i=0, j = 0 y 1):

  j=0:  P0 ──fork──> H1   (H1 hace break)
  j=1:  P0 ──fork──> H2   (H2 hace break)
  j=2:  P0 sale del for

  P0 + H1 + H2  =  3 procesos

Nota: getpid() no crea procesos, solo consulta.
El if final solo decide quién repite el for externo,
pero i=1 ya no cumple i<1, así que nadie repite.`,
  descarte: "El `break` no anula el fork ya ejecutado, así que \"un único proceso\" es falso. Los 9 y 33 saldrían si el for externo iterara varias veces, pero `i < 1` lo limita a una sola pasada. Ojo también con el `getpid()`: está ahí para confundir, no crea nada."
},

{
  id: "p1-46", pep: 1, num: 46, puntos: 1, tema: "Utilización de CPU",
  enunciado: "Asumiendo una carga constante en la cola de listos, la tasa de aprovechamiento del procesador es óptima cuando:",
  opciones: [
    "Se emplea un planificador FIFO y los procesos no requieren operaciones de E/S.",
    "Se emplea un planificador FIFO y los procesos presentan alta carga computacional.",
    "Se emplea un planificador RR y los procesos no requieren operaciones de E/S.",
    "Se emplea un planificador RR y los procesos presentan alta carga computacional."
  ],
  correcta: 0,
  justificacion: "Para exprimir la CPU al máximo hay que eliminar **todo** el tiempo que no sea trabajo útil, y son dos fuentes: la E/S (que deja la CPU ociosa esperando al disco) y los cambios de contexto (overhead puro). FIFO sin E/S elimina ambas: cada proceso agarra la CPU y no la suelta hasta terminar, sin un solo cambio de contexto de más. Utilización teórica del 100 %.",
  descarte: "RR desapropia cada quantum, y **cada desapropiación cuesta un cambio de contexto**: eso baja la utilización aunque no haya E/S. \"Alta carga computacional\" no es garantía de nada por sí sola: un proceso puede ser pesado y aun así hacer E/S. La clave es la ausencia de E/S, no la intensidad del cómputo."
},

{
  id: "p1-47", pep: 1, num: 47, puntos: 2, tema: "Procesos / salida de código",
  contexto: "Considere la ejecución simultánea del siguiente fragmento en dos procesos distintos.",
  enunciado: "¿Cuál de las siguientes secuencias de salida es imposible de observar por la salida estándar?",
  codigo: `int value = 0;
void main() {
  while (value < 10) {
    printf("%i", value);
    value++;
  }
}`,
  opciones: [
    "0123456789",
    "01234567890123456789",
    "00112233445566778899",
    "01230123456789456789"
  ],
  correcta: 0,
  justificacion: "Son **procesos**, no hebras: aunque `value` sea global, cada proceso tiene su propia copia en su propia imagen de memoria. Entonces los dos cuentan de 0 a 9 de forma independiente y en la salida tienen que aparecer **20 dígitos**. Una salida de solo 10 dígitos significaría que uno de los dos procesos no imprimió nada, lo cual es imposible.",
  diagrama: `Proceso A: 0 1 2 3 4 5 6 7 8 9   (su propio value)
Proceso B: 0 1 2 3 4 5 6 7 8 9   (su propio value)
           ─────────────────────
Salida = intercalado cualquiera, pero SIEMPRE 20 dígitos,
y dentro de cada proceso el orden 0→9 se respeta.`,
  descarte: "Las otras tres tienen 20 dígitos y respetan el orden interno de cada proceso: `01234567890123456789` es uno tras otro, `00112233...` es alternancia perfecta, y `01230123456789456789` es A hasta el 3, luego B completo, luego A termina. Todas plausibles. ⚠ Si fueran **hebras** compartiendo `value`, la respuesta sería otra: ahí sí podrían salir solo 10 dígitos."
},

{
  id: "p1-48", pep: 1, num: 48, puntos: 1, tema: "Cambio de modo vs contexto",
  enunciado: "En un entorno donde el SO se ejecuta sobre el contexto del usuario empleando Round Robin, determine bajo qué circunstancia se gatilla una transición de modo sin derivar en un relevo de contexto:",
  opciones: [
    "int c = getchar(); al capturar un carácter desde la entrada estándar.",
    "int c = fgetc(fp); asumiendo que fp proviene de una apertura previa de archivo.",
    "sleep(1);",
    "pid_t pid = getpid();"
  ],
  correcta: 3,
  justificacion: "Misma idea de siempre: `getpid()` entra a modo kernel, lee un campo del PCB y vuelve. El proceso jamás se bloquea ni agota su quantum, así que conserva la CPU. Cambio de modo sí, cambio de contexto no.",
  descarte: "`getchar()` espera al teclado, `fgetc()` puede esperar al disco y `sleep(1)` se bloquea un segundo entero. Los tres mandan al proceso a estado *blocked*, y ahí el planificador está obligado a elegir a otro."
},

{
  id: "p1-49", pep: 1, num: 49, puntos: 1, tema: "Cambio de modo vs contexto",
  enunciado: "Un salto al modo privilegiado resultará forzosamente en un cambio de contexto en el siguiente escenario:",
  opciones: [
    "Cuando el sistema operativo reside en el contexto de las tareas de usuario.",
    "Cuando el diseño arquitectónico del sistema operativo se estructura mediante procesos.",
    "Al momento de invocar la primitiva fork().",
    "Al producirse una señal del temporizador de hardware."
  ],
  correcta: 1,
  justificacion: "Si el SO está **estructurado como procesos**, sus servicios son procesos independientes con PCB propio. Atender cualquier syscall implica entonces pasarle la CPU a *otro proceso*, y eso es cambio de contexto por definición. Es el único diseño donde cambio de modo ⇒ cambio de contexto de manera forzosa.",
  descarte: "Si el SO corre **dentro del contexto del proceso usuario**, el kernel usa el kernel stack del mismo proceso: hay cambio de modo sin cambio de contexto (justo lo contrario). `fork()` no obliga al padre a ceder la CPU. Y la interrupción del temporizador sí suele terminar en cambio de contexto, pero es un caso puntual, no el escenario estructural que pide la pregunta."
},

{
  id: "p1-50", pep: 1, num: 50, puntos: 1, tema: "fork / salida de código",
  contexto: "Analice el siguiente fragmento: tras el fork, el hijo imprime \"x\", el padre imprime \"y\", y ambos imprimen \"z\" antes de terminar.",
  enunciado: "¿Qué cadena de caracteres representa un resultado factible en la consola?",
  codigo: `main(){
  pid_t pid = fork();
  if (pid == 0) printf("x");
  else          printf("y");
  printf("z");
  exit(0);
}`,
  opciones: [
    "yzxz",
    "yzzx",
    "zzxy",
    "zxyz"
  ],
  correcta: 0,
  justificacion: "Después del fork hay dos procesos: el hijo imprime `x` y luego `z`; el padre imprime `y` y luego `z`. Dentro de cada proceso el orden es rígido: **la letra siempre antes de su z**. Se pueden intercalar entre sí, pero nunca invertir ese par. `yzxz` es el padre completo seguido del hijo completo: perfectamente posible.",
  diagrama: `Padre:  y → z
Hijo:   x → z

Regla:  la 'y' SIEMPRE antes de una 'z'
        la 'x' SIEMPRE antes de una 'z'

yzxz  ✓   (padre entero, luego hijo entero)
yzzx  ✗   (la x quedó después de las dos z)
zzxy  ✗   (dos z antes de cualquier letra)
zxyz  ✗   (empieza con z, sin letra previa)`,
  descarte: "Las otras tres ponen alguna `z` antes de la letra que le corresponde, lo que rompe el orden secuencial dentro de un mismo proceso."
},

{
  id: "p1-51", pep: 1, num: 51, puntos: 1, tema: "Syscalls",
  contexto: "Analice el siguiente fragmento: tras el fork, el hijo imprime \"x\", el padre imprime \"y\", y ambos imprimen \"z\" antes de terminar.",
  enunciado: "Indique el número de llamadas al sistema ejecutadas desde el inicio de la instrucción de clonación:",
  codigo: `main(){
  pid_t pid = fork();
  if (pid == 0) printf("x");
  else          printf("y");
  printf("z");
  exit(0);
}`,
  opciones: [
    "3",
    "6",
    "7",
    "9"
  ],
  correcta: 2,
  justificacion: "Hay que contar los syscalls **por proceso**, recordando que después del fork hay dos ejecutando las mismas líneas. `fork` ocurre una sola vez (lo llama el padre); en cambio los dos `printf` y el `exit` los ejecutan ambos procesos.",
  diagrama: `fork()          →  1   (solo el padre lo invoca)
printf(x/y)     →  2   (hijo + padre)
printf("z")     →  2   (hijo + padre)
exit(0)         →  2   (hijo + padre)
                 ────
                   7 syscalls`,
  descarte: "3 es contar un solo proceso. 6 olvida el fork. 9 duplica el fork o cuenta alguna instrucción que no es syscall — recuerda que asignaciones, `if`, `while` e `i++` **no** son llamadas al sistema; `printf`, `fork` y `exit` sí."
},

{
  id: "p1-52", pep: 1, num: 52, puntos: 2, tema: "HZ y quantum",
  enunciado: "El reloj del núcleo genera un evento cada 10 ms, definiendo una porción de tiempo de 100·HZ/1000 unidades. Para un esquema RR con procesos puramente computacionales:",
  opciones: [
    "HZ es 1000 y el quantum equivale a 0,2 s.",
    "HZ es 1000 y el quantum equivale a 0,1 s.",
    "HZ es 100 y el quantum equivale a 0,2 s.",
    "HZ es 100 y el quantum equivale a 0,1 segundos."
  ],
  correcta: 3,
  justificacion: "Si cada tick dura 10 ms, en un segundo entran 1000/10 = **100 ticks**, o sea HZ = 100. La fórmula entrega el quantum en ticks: 100 × 100 / 1000 = **10 ticks**. Y 10 ticks × 10 ms = 100 ms = **0,1 s**.",
  diagrama: `tick = 10 ms  →  HZ = 1000/10 = 100 ticks/s

quantum = 100 · 100 / 1000 = 10 ticks
        = 10 × 10 ms = 100 ms = 0,1 s`,
  descarte: "HZ = 1000 correspondería a ticks de 1 ms. El 0,2 s sale de multiplicar mal las unidades. Truco para no equivocarse: **HZ = 1000 ms ÷ duración del tick**, y el resultado de la fórmula son ticks, hay que convertirlos a tiempo."
},

{
  id: "p1-53", pep: 1, num: 53, puntos: 2, tema: "TAT / SPN vs FCFS",
  enunciado: "Sin presencia de E/S, ¿bajo qué premisa el tiempo de retorno normalizado promedio es idéntico entre SPN y FIFO?",
  opciones: [
    "Si la entrada de procesos sigue un orden descendente de requerimiento de CPU.",
    "Si la entrada de procesos sigue un orden ascendente de requerimiento de CPU.",
    "Cualquier ordenamiento produce resultados equivalentes en dicha métrica.",
    "No existe configuración que permita igualar el TAT normalizado."
  ],
  correcta: 1,
  justificacion: "SPN atiende del más corto al más largo. FIFO atiende en orden de llegada. Si los procesos llegan en **orden ascendente** de tiempo de CPU, el orden de llegada ya es el orden que SPN escogería, así que ambas políticas generan idéntico Gantt e idéntico TAT normalizado.",
  descarte: "El orden descendente es el peor caso (efecto convoy: el largo bloquea a todos los cortos detrás). Y las dos alternativas absolutas — \"siempre igual\" y \"nunca igual\" — desconocen este caso particular en que coinciden."
},

{
  id: "p1-54", pep: 1, num: 54, puntos: 2, tema: "fork / conteo de procesos",
  contexto: "Código de creación jerárquica de procesos, ejecutado sin errores. En el primer for rompe el padre y en el segundo rompe el hijo.",
  enunciado: "Considerando el código de creación jerárquica con N = 4 y A = 3, ¿cuál es el volumen total de procesos resultantes?",
  codigo: `void main() {
  int p, a;
  for (p = 0; p < N; p++)
    if (fork() != 0) break;
  for (a = 0; a < A-1; a++)
    if (fork() == 0) break;
}`,
  opciones: [
    "9",
    "12",
    "15",
    "18"
  ],
  correcta: 2,
  justificacion: "Aplicamos la fórmula del patrón: **(N+1) × (A−1+1)**. Primer for (rompe el padre): cadena de N+1 = **5** procesos. Segundo for (rompe el hijo): el padre completa A−1 = 2 iteraciones, quedándose con 2 hijos, o sea grupos de **3**. Total = 5 × 3 = **15**.",
  diagrama: `1er for (N=4):   P0→H1→H2→H3→H4     = 5 procesos

2do for (A-1 = 2 forks c/u, rompe el hijo):
   cada uno de los 5 queda con 2 hijos
   → 5 grupos de 3

   5 × 3 = 15 procesos`,
  descarte: "9 sería N=2, A=3. 12 saldría de multiplicar 4×3 (olvidando el +1 de la cadena). 18 de usar 6×3. La receta que nunca falla: **(N+1) × A**, ojo con el A−1 del ciclo que deja A−1 hijos, o sea A procesos por grupo."
},

{
  id: "p1-55", pep: 1, num: 55, puntos: 2, tema: "SPN vs RR",
  enunciado: "Suponga que RR y SJF producen tiempos de respuesta idénticos para cada tarea sin ráfagas de E/S. Se concluye que:",
  opciones: [
    "La tajada de tiempo es inferior al mayor servicio y las tareas llegan por magnitud ascendente.",
    "La tajada de tiempo supera al mayor servicio y las tareas llegan por magnitud ascendente.",
    "La tajada de tiempo es inferior al mayor servicio y las tareas llegan por magnitud descendente.",
    "La tajada de tiempo supera al mayor servicio y las tareas llegan por magnitud descendente."
  ],
  correcta: 1,
  justificacion: "Hay que encadenar dos equivalencias. Primero: si el **quantum supera al mayor tiempo de servicio**, ningún proceso alcanza a ser desapropiado y RR se comporta exactamente como FIFO. Segundo: FIFO coincide con SJF cuando los procesos **llegan ordenados de menor a mayor** (ascendente), porque el orden de llegada ya es el orden óptimo. Juntando ambas: RR = FIFO = SJF.",
  diagrama: `quantum > mayor T   ⟹   RR se comporta como FIFO
llegada ascendente  ⟹   FIFO coincide con SJF
────────────────────────────────────────────────
        ⟹  RR  ≡  SJF`,
  descarte: "Si el quantum es **inferior** al mayor servicio, RR fragmenta la ejecución del proceso largo y nunca podrá igualar a SJF. Y el orden descendente hace que FIFO sea lo opuesto a SJF."
},

{
  id: "p1-56", pep: 1, num: 56, puntos: 1, tema: "TAT / Gantt",
  contexto: "Cola con procesos P1, P2 y P3 (Ti = i). P3 encabeza la cola. Sin E/S ni arribos nuevos y overhead despreciable.",
  enunciado: "Bajo RR con q = 1, el TAT para la tarea 3 es:",
  opciones: [
    "1",
    "(1 + 1) + 1",
    "(1 + 2) + (1 + 1) + 1",
    "(1 + 3) + (1 + 2) + (1 + 1) + 1"
  ],
  correcta: 2,
  justificacion: "Como todos llegan en t = 0, el TAT es el instante de término. RR con q = 1 reparte de a un tick siguiendo el orden de la cola (P3, P2, P1). P3 necesita 3 quantums y recibe el último en t = 6, que es lo que suma la expresión (1+2)+(1+1)+1.",
  diagrama: `t:  0    1    2    3    4    5    6
    |P3 |P2 |P1 |P3 |P2 |P3 |
              ^        ^    ^
           P1 fin   P2 fin  P3 fin

TAT(P3) = 6`,
  descarte: "La expresión de 4 términos vale 10, más que el trabajo total del sistema (1+2+3 = 6): imposible. Las de 1 y 3 corresponden a los TAT de P1 y P2 bajo SPN."
},

{
  id: "p1-57", pep: 1, num: 57, puntos: 1, tema: "TAT / Gantt",
  contexto: "Misma cola: P1, P2 y P3 con Ti = i, P3 a la cabeza, sin E/S ni llegadas nuevas.",
  enunciado: "Bajo SPN, el TAT para la tarea 2 es:",
  opciones: [
    "1",
    "(1 + 1) + 1",
    "(1 + 2) + (1 + 1) + 1",
    "(1 + 3) + (1 + 2) + (1 + 1) + 1"
  ],
  correcta: 1,
  justificacion: "SPN ignora el orden de la cola y atiende por duración: P1, después P2, después P3. P1 ocupa la CPU hasta t = 1 y P2 hasta t = 3. Como todos llegaron en t = 0, TAT(P2) = **3**, que es el valor de (1+1)+1.",
  diagrama: `SPN reordena:  P1 → P2 → P3

t:  0    1         3              6
    |P1 |    P2    |      P3      |
         ^         ^              ^
      fin P1    fin P2         fin P3

TAT(P2) = 3`,
  descarte: "\"1\" es el TAT de P1. Las expresiones mayores valen 6 y 10: la primera es el TAT de P3 y la segunda no corresponde a este escenario."
},

{
  id: "p1-58", pep: 1, num: 58, puntos: 1, tema: "Interrupciones (orden de eventos)",
  contexto: "Dos procesos P y Q corriendo en un SO. Considere los siguientes eventos que pueden ocurrir mientras el SO ejecuta concurrentemente P y Q y maneja interrupciones:\nA. El Program Counter pasa de apuntar a código del kernel en modo kernel de P a código del kernel en modo kernel de Q.\nB. El Stack Pointer pasa de apuntar al kernel stack de P al kernel stack de Q.\nC. La CPU que ejecuta P pasa de modo usuario de P a modo kernel de P.\nD. La CPU que ejecuta P pasa de modo kernel de P a modo usuario de P.\nE. La CPU que ejecuta Q pasa de modo kernel de Q a modo usuario de Q.\nF. Se ejecuta el código de manejo de interrupciones del SO.\nG. Se ejecuta el código del planificador del SO.",
  enunciado: "Ante una interrupción en P tras la cual se retoma el mismo proceso, la secuencia lógica es:",
  opciones: [
    "C F G D",
    "F C G D",
    "F C D G",
    "C F D G"
  ],
  correcta: 0,
  justificacion: "El orden lo dicta la lógica del hardware. **C siempre va primero**: para poder ejecutar código del kernel, la CPU tiene que entrar en modo kernel. Después **F** corre el handler de la interrupción, luego **G** consulta al planificador (que en este caso decide seguir con P), y finalmente **D** devuelve la CPU a modo usuario del mismo proceso P.",
  diagrama: `C  usuario(P) ──────> kernel(P)     [cambio de modo]
F  ejecuta el handler de interrupción
G  ejecuta el planificador  → decide: sigue P
D  kernel(P) ──────> usuario(P)     [vuelve a P]

No aparecen A, B ni E porque NO se cambia de proceso.`,
  descarte: "Las que parten con F son imposibles: no se puede ejecutar código del kernel antes de haber entrado en modo kernel. Y `C F D G` deja el planificador después de haber vuelto a modo usuario, lo que no tiene sentido: el planificador es código de kernel."
},

{
  id: "p1-59", pep: 1, num: 59, puntos: 1, tema: "Interrupciones (orden de eventos)",
  contexto: "Dos procesos P y Q corriendo en un SO. Considere los siguientes eventos que pueden ocurrir mientras el SO ejecuta concurrentemente P y Q y maneja interrupciones:\nA. El Program Counter pasa de apuntar a código del kernel en modo kernel de P a código del kernel en modo kernel de Q.\nB. El Stack Pointer pasa de apuntar al kernel stack de P al kernel stack de Q.\nC. La CPU que ejecuta P pasa de modo usuario de P a modo kernel de P.\nD. La CPU que ejecuta P pasa de modo kernel de P a modo usuario de P.\nE. La CPU que ejecuta Q pasa de modo kernel de Q a modo usuario de Q.\nF. Se ejecuta el código de manejo de interrupciones del SO.\nG. Se ejecuta el código del planificador del SO.",
  enunciado: "Ante el agotamiento del quantum en P derivando en la selección de Q, el orden correcto de eventos es:",
  opciones: [
    "F C G B E A",
    "C F G B E A",
    "C F G B A E",
    "F C G B A E"
  ],
  correcta: 2,
  justificacion: "Parte igual que antes — **C** (entrar a modo kernel), **F** (handler del timer), **G** (planificador) — pero ahora el planificador elige a Q, así que hay cambio de contexto: **B** cambia el Stack Pointer al kernel stack de Q, **A** cambia el Program Counter al código kernel de Q, y recién ahí **E** devuelve la CPU a modo usuario de Q. La clave es que **A va antes que E**: primero te posicionas en el kernel de Q y después sales a usuario.",
  diagrama: `C   usuario(P) → kernel(P)
F   handler de la interrupción de reloj
G   planificador → elige Q
    ── cambio de contexto ──
B   Stack Pointer: kernel stack de P → kernel stack de Q
A   Program Counter: kernel de P → kernel de Q
E   kernel(Q) → usuario(Q)`,
  descarte: "Las que empiezan con F violan la regla de que hay que estar en modo kernel para correr código de kernel. Y `B E A` sale a modo usuario de Q (E) **antes** de haber movido el PC al kernel de Q (A): el orden está invertido."
},

{
  id: "p1-60", pep: 1, num: 60, puntos: 1, tema: "Syscalls",
  contexto: "Estudie el siguiente código, que se ejecuta sin errores. El padre hace un segundo fork y sale del ciclo con break; solo el hijo del primer fork sigue iterando.",
  enunciado: "Para k = 1 ¿cuántos syscalls fueron ejecutados partiendo desde la instrucción de fork?",
  codigo: `int main(int argc, char const *argv[]) {
  int i = 0;
  int k = atoi(argv[1]);
  int pid1, pid2;
  while (i < k) {
    pid1 = fork();
    if (pid1 != 0) {          // Rama del Proceso Padre
      pid2 = fork();
      break;
    }
    i++;
  }
  if (pid1 != 0 && pid2 != 0) {   // Sincronización de padres
    waitpid(pid1, NULL, 0);
    waitpid(pid2, NULL, 0);
  }
  printf("%d\\n", getpid());
  exit(0);
}`,
  opciones: [
    "4",
    "7",
    "10",
    "13"
  ],
  correcta: 3,
  justificacion: "La línea `printf(\"%d\\n\", getpid())` contiene **dos syscalls**, no uno: `getpid()` le pide el PID al kernel y después `printf` hace la escritura. Con k = 1 quedan **3 procesos** (P0, H1 y H2), y solo P0 tiene pid1 ≠ 0 **y** pid2 ≠ 0, así que solo P0 ejecuta los dos `waitpid`. Los tres, en cambio, ejecutan getpid, printf y exit.",
  diagrama: `P0:  fork + fork + waitpid×2 + getpid + printf + exit  = 7
H1:  getpid + printf + exit                            = 3
H2:  getpid + printf + exit                            = 3
                                                      ────
                                                        13`,
  descarte: "10 es exactamente el resultado de contar `printf(getpid())` como **un solo** syscall en vez de dos: el error más fácil de cometer. 7 olvida además alguno de los forks o los waitpid. Y ojo con `atoi`: **no es syscall**, es una función de librería que solo convierte texto a número, igual que `i++`, el `if` o el `while`."
},

{
  id: "p1-61", pep: 1, num: 61, puntos: 2, tema: "fork / conteo de procesos",
  contexto: "Estudie el siguiente código, que se ejecuta sin errores. El padre hace un segundo fork y sale del ciclo con break; solo el hijo del primer fork sigue iterando.",
  enunciado: "Para k = 3 ¿cuántos procesos crea el código?",
  codigo: `while (i < k) {
  pid1 = fork();
  if (pid1 != 0) {      // el PADRE entra aquí
    pid2 = fork();
    break;              // ...y se sale del ciclo
  }
  i++;                  // solo el HIJO sigue iterando
}`,
  opciones: [
    "3",
    "5",
    "7",
    "9"
  ],
  correcta: 2,
  justificacion: "En cada vuelta el padre crea **dos** hijos (el del primer fork y el del segundo) y se sale con `break`. El único que sigue iterando es el hijo del primer fork, que repite la jugada. Con k = 3 hay 3 vueltas, cada una aportando 2 procesos nuevos: 6 creados + el original = **7 procesos**.",
  diagrama: `i=0:  P0 ──fork──> H1        P0 ──fork──> H1b, break
i=1:  H1 ──fork──> H2        H1 ──fork──> H2b, break
i=2:  H2 ──fork──> H3        H2 ──fork──> H3b, break
i=3:  H3 sale del while (i no es < 3)

Procesos: P0, H1, H1b, H2, H2b, H3, H3b  =  7`,
  descarte: "3 y 5 corresponden a k = 1 y k = 2. La confusión típica es creer que ambos hijos siguen iterando: el segundo hijo (H1b, H2b…) nace después del `break` en la rama del padre, así que sale inmediatamente del ciclo."
},

{
  id: "p1-62", pep: 1, num: 62, puntos: 2, tema: "fork / conteo de procesos",
  contexto: "Estudie el siguiente código, que se ejecuta sin errores. El padre hace un segundo fork y sale del ciclo con break; solo el hijo del primer fork sigue iterando.",
  enunciado: "Para k = N ¿cuántos procesos crea el código?",
  codigo: `int main(int argc, char const *argv[]) {
  int i = 0;
  int k = atoi(argv[1]);
  int pid1, pid2;
  while (i < k) {
    pid1 = fork();
    if (pid1 != 0) {          // Rama del Proceso Padre
      pid2 = fork();
      break;
    }
    i++;
  }
  if (pid1 != 0 && pid2 != 0) {   // Sincronización de padres
    waitpid(pid1, NULL, 0);
    waitpid(pid2, NULL, 0);
  }
  printf("%d\\n", getpid());
  exit(0);
}`,
  opciones: [
    "2 * N",
    "2 * N + 1",
    "2ᴺ",
    "2ᴺ − 1"
  ],
  correcta: 1,
  justificacion: "El crecimiento es **lineal, no exponencial**: cada iteración agrega exactamente 2 procesos (los dos hijos del padre de turno), y solo hay N iteraciones. Sumando el proceso original: **2N + 1**. Se comprueba con el caso anterior: N = 3 → 2(3)+1 = 7 ✓.",
  diagrama: `N=1 →  3 procesos     2(1)+1 = 3 ✓
N=2 →  5 procesos     2(2)+1 = 5 ✓
N=3 →  7 procesos     2(3)+1 = 7 ✓`,
  descarte: "Las fórmulas exponenciales (2ᴺ, 2ᴺ−1) aparecerían si **todos** los procesos siguieran iterando, que es el caso de un `for` con fork sin break. Aquí el `break` corta la ramificación: solo un proceso continúa el ciclo en cada vuelta. Y 2N olvida contar el proceso original."
},

{
  id: "p1-63", pep: 1, num: 63, puntos: 1, tema: "FCFS vs RR virtual",
  enunciado: "Indique cuál de las siguientes alternativas se considera una diferencia entre las políticas FCFS y RR virtual.",
  opciones: [
    "Una política podría generar inanición, mientras que la otra no.",
    "FCFS es apropiativo y permite que el proceso continúe en el procesador cuando hace I/O, en cambio RR virtual abandona el procesador cuando hace I/O aunque le quede quantum de tiempo.",
    "Cuando un proceso es desapropiado en RR virtual, al volver a ejecutarse se le asigna un quantum mayor al de su ráfaga anterior, para que pronto termine. FCFS continúa sin quantum.",
    "En una política un proceso que sale del procesador y no ha terminado, va a una cola auxiliar, en cambio en la otra va al final de la cola para el estado ready."
  ],
  correcta: 3,
  justificacion: "Ésa es justamente la gracia del RR **virtual**: mantiene una **cola auxiliar** con prioridad para los procesos que volvieron de una operación de I/O, de modo que recuperen el quantum que no alcanzaron a gastar. En FCFS no existe tal cola: quien vuelve se va derechito al final de la cola de ready.",
  descarte: "FCFS es **no apropiativo** (error grueso en esa alternativa), y ninguna política deja al proceso en la CPU mientras hace I/O. El quantum en RR es **fijo**, no crece al volver. Y ni FCFS ni RR generan inanición, así que la primera alternativa tampoco distingue nada."
},

{
  id: "p1-64", pep: 1, num: 64, puntos: 2, tema: "Condición de carrera",
  contexto: "Suponga que dos hebras ejecutan la función increment_counter sin errores.",
  enunciado: "¿Qué se muestra por la salida estándar cada vez que ejecutamos el código?",
  codigo: `#define ITERATIONS 100000
long counter = 0;
bool is_safe = true;

void* increment_counter(void* arg){
  for (int i = 0; i < ITERATIONS/2; ++i){
    while(!is_safe);      // espera activa
    is_safe = false;      // "toma el candado"  ← no es atómico
    counter++;            // sección crítica
    is_safe = true;       // "suelta el candado"
  }
  return NULL;
}
// main: crea t1 y t2, hace join a ambas, imprime counter`,
  opciones: [
    "Siempre se muestra 100000.",
    "Se muestra el valor entre 1 y 50000.",
    "Se muestra un valor entre 2 y 100000.",
    "Se muestra un valor entre 50000 y 100000."
  ],
  correcta: 2,
  justificacion: "El \"candado\" con `is_safe` está roto: entre el `while(!is_safe)` y el `is_safe = false` puede ocurrir un cambio de contexto, así que **las dos hebras pueden entrar juntas** a la sección crítica. Además `counter++` no es atómico (son tres instrucciones: leer, sumar, escribir), así que se pierden incrementos. El **máximo** es 100000 (si por suerte nunca se pisan) y el **mínimo teórico es 2**: en el peor entrelazado imaginable, cada hebra termina escribiendo el resultado de su propio último incremento sobre un valor viejo, y al menos cada hebra deja su marca una vez.",
  diagrama: `Entrelazado que pierde incrementos:

  H1: lee counter (=5)
  H2: lee counter (=5)     ← ambas leen lo mismo
  H1: escribe 6
  H2: escribe 6            ← se perdió un incremento

El candado no protege porque
  while(!is_safe)  y  is_safe = false
son DOS instrucciones separadas: entre medio cabe
un cambio de contexto.`,
  descarte: "\"Siempre 100000\" supondría exclusión mutua real, que aquí no existe. El rango 1–50000 corresponde al trabajo de una sola hebra. Y 50000–100000 asume que al menos una hebra completa todos sus incrementos sin interferencia, lo que no está garantizado."
},

{
  id: "p1-65", pep: 1, num: 65, puntos: 1, tema: "Utilización de CPU",
  contexto: "En un sistema, la mitad de los procesos hacen I/O y la otra mitad no. Los primeros demoran en promedio t desde que llegan hasta finalizar, de los cuales un décimo lo pasan haciendo I/O, y usan FCFS. Los segundos usan en promedio solo un cuarto del quantum y usan RR. Considere un quantum q y overhead de administración e.",
  enunciado: "¿Cuál es la utilización del procesador?",
  opciones: [
    "0,9t / (0,9t + e) + 0,25q / (0,25q + e)",
    "½ · [ 0,9t / (0,9t + e) + 0,25q / (0,25q + e) ]",
    "0,1t / (0,1t + e) + 0,25q / (0,25q + e)",
    "½ · [ 0,1t / (0,1t + e) + 0,25q / (0,25q + e) ]"
  ],
  correcta: 1,
  justificacion: "Se calcula la utilización de cada grupo y después se **promedia**, porque cada grupo es la mitad del sistema. Grupo FCFS: si un décimo del tiempo lo pasan en I/O, el tiempo **útil de CPU** es 0,9t, y el ciclo completo es 0,9t + e → utilización 0,9t/(0,9t+e). Grupo RR: usan 0,25q de CPU por turno más el overhead e → 0,25q/(0,25q+e). Como son mitad y mitad, el promedio lleva el factor **½**.",
  diagrama: `Grupo FCFS (mitad):   útil = 0,9t   (0,1t es I/O)
                      U₁ = 0,9t / (0,9t + e)

Grupo RR (mitad):     útil = 0,25q
                      U₂ = 0,25q / (0,25q + e)

U total = ½ (U₁ + U₂)`,
  descarte: "Las que usan 0,1t toman el tiempo de **I/O** como si fuera trabajo útil de CPU, justo al revés. Y las que no llevan el ½ suman dos fracciones que pueden dar más de 1: una utilización mayor al 100 % es imposible."
},

{
  id: "p1-66", pep: 1, num: 66, puntos: 1, tema: "Planificador O(1)",
  enunciado: "Respecto al planificador O(1) ¿cuál de las siguientes alternativas es verdadera?",
  opciones: [
    "SCHED_FIFO puede ser desapropiado por SCHED_FIFO, SCHED_RR y SCHED_OTHER.",
    "SCHED_RR puede ser desapropiado por SCHED_RR y SCHED_OTHER.",
    "SCHED_OTHER sólo puede ser desapropiado por SCHED_OTHER.",
    "SCHED_RR no puede ser desapropiado por SCHED_OTHER."
  ],
  correcta: 3,
  justificacion: "La jerarquía del O(1) es estricta: las políticas de **tiempo real** (SCHED_FIFO y SCHED_RR, prioridades 0–99) siempre le ganan a las de **tiempo compartido** (SCHED_OTHER, prioridades 100–139). Un proceso normal jamás puede desapropiar a uno de tiempo real, y por eso esta afirmación es verdadera.",
  descarte: "Las dos primeras dicen que SCHED_OTHER puede desapropiar a procesos RT, lo que rompe la jerarquía. La tercera es falsa por lo contrario: SCHED_OTHER **sí** puede ser desapropiado por cualquiera de las dos políticas de tiempo real (y también por otro SCHED_OTHER más prioritario)."
}

];
