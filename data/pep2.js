/* PEP 2 — Concurrencia, SC/EM, semáforos, monitores, deadlock */
window.PEP2 = [

{
  id: "p2-1", pep: 2, num: 1, puntos: 1, tema: "Exclusión mutua",
  contexto: "El siguiente código es una posible implementación para un semáforo binario, usado para proteger la SC de una función que ejecutan varias hebras.",
  enunciado: "Para la implementación anterior es posible afirmar lo siguiente:",
  codigo: `typedef struct __lock_t { int flag; } lock_t;

void init(lock_t *mutex)  { mutex->flag = 0; }

void lock(lock_t *mutex) {
  while (mutex->flag == 1);   // (1) espera
  mutex->flag = 1;            // (2) toma el candado
}

void unlock(lock_t *mutex) { mutex->flag = 0; }`,
  opciones: [
    "La implementación propuesta no provee EM.",
    "La implementación propuesta produce deadlock.",
    "La implementación propuesta no produce inanición.",
    "La implementación propuesta no permite progreso."
  ],
  correcta: 0,
  justificacion: "El bug está en que `lock()` hace **dos operaciones separadas y no atómicas**: primero mira el flag y después lo escribe. Entre esas dos instrucciones puede ocurrir un cambio de contexto, así que dos hebras pueden salir del `while` a la vez (las dos vieron flag == 0), las dos ponen flag = 1 y las dos entran a la SC. **No hay exclusión mutua.**",
  diagrama: `H1: while(flag==1)  → flag vale 0, sale del while
    ── cambio de contexto ──
H2: while(flag==1)  → flag SIGUE valiendo 0, sale
H2: flag = 1
H2: entra a la SC
    ── cambio de contexto ──
H1: flag = 1
H1: entra a la SC  ← ¡las dos adentro!`,
  descarte: "No hay deadlock: nadie queda bloqueado para siempre, el problema es justo lo contrario (entran todas). Y hablar de inanición o progreso es prematuro: si ni siquiera se cumple el primer requisito (EM), la solución ya está descartada."
},

{
  id: "p2-2", pep: 2, num: 2, puntos: 1, tema: "Busy waiting",
  contexto: "Considere el siguiente código (el while que gira esperando el flag).",
  enunciado: "El código anterior utiliza la técnica vista en clases conocida como busy-waiting. El problema con esta técnica es:",
  codigo: `typedef struct __lock_t { int flag; } lock_t;

void init(lock_t *mutex)  { mutex->flag = 0; }

void lock(lock_t *mutex) {
  while (mutex->flag == 1);   // (1) espera
  mutex->flag = 1;            // (2) toma el candado
}

void unlock(lock_t *mutex) { mutex->flag = 0; }`,
  opciones: [
    "No funciona para hebras que se ejecutan en un multiprocesador.",
    "No funciona para hebras que se ejecutan en un monoprocesador.",
    "El quantum de tiempo asignado se consume parcialmente esperando entrar a la SC en un sistema monoprocesador.",
    "El quantum de tiempo asignado se consume parcial o totalmente esperando entrar a la SC en un sistema multiprocesador."
  ],
  correcta: 3,
  justificacion: "El costo del busy-waiting es que la hebra **quema CPU sin hacer nada útil**: en vez de bloquearse y ceder el procesador, se queda dando vueltas en el `while`. En un multiprocesador la hebra que tiene la SC sí está avanzando en otro núcleo, así que la espera puede terminar en cualquier momento: el quantum se gasta **parcial o totalmente**, dependiendo de cuánto demore el otro en soltar.",
  descarte: "La técnica funciona en ambas arquitecturas (mal, pero funciona), así que las dos primeras son falsas. En **monoprocesador** el desperdicio es siempre **total**: la hebra que tiene la SC no puede avanzar mientras la otra gira, así que el que espera quema su quantum completo — por eso decir \"parcialmente\" en monoprocesador es incorrecto."
},

{
  id: "p2-3", pep: 2, num: 3, puntos: 1, tema: "Semáforos",
  contexto: "Revise el siguiente código. La línea 05 está dentro de child (después del printf(\"2\")), la línea 12 está en main antes del pthread_create, y la línea 14 está en main justo antes del printf(\"3\").",
  enunciado: "Utilizando semáforos contadores, indique qué código se debe agregar en las líneas 05, 12 y 14 para que el output del programa sea siempre 123:",
  codigo: `binary_semaphore s;

void *child(void *arg) {
  printf("2");
  // línea 05  ← ¿qué va aquí?
  return NULL;
}

int main(int argc, char *argv[]) {
  pthread_t p;
  printf("1");
  // línea 12  ← ¿qué va aquí?
  pthread_create(&p, NULL, child, NULL);
  // línea 14  ← ¿qué va aquí?
  printf("3");
  return 0;
}`,
  opciones: [
    "05: signal(&s);   12: s = 1;   14: wait(&s);",
    "05: wait(&s);     12: s = 1;   14: signal(&s);",
    "05: signal(&s);   12: s = 0;   14: wait(&s);",
    "05: wait(&s);     12: s = 0;   14: signal(&s);"
  ],
  correcta: 2,
  justificacion: "El único problema real es que main podría imprimir el \"3\" antes de que la hebra hija alcance a imprimir el \"2\". Entonces main tiene que **esperar** (`wait`) y la hija tiene que **avisar** (`signal`) cuando ya imprimió. El semáforo se inicializa en **0** para que el `wait` de main efectivamente bloquee si la hija aún no ha llegado.",
  diagrama: `s = 0                        (línea 12, antes de crear la hebra)

main:  printf("1")
       pthread_create(...)
       wait(&s)   ← se bloquea si s == 0
       printf("3")

child: printf("2")
       signal(&s) ← libera a main

Salida garantizada:  1 2 3`,
  descarte: "Si inicializas `s = 1`, el `wait` de main pasa de largo sin bloquearse y el \"3\" puede salir antes del \"2\". Y si inviertes las primitivas (wait en la hija, signal en main), la que espera es la hebra equivocada: main igual imprime el \"3\" cuando quiere."
},

{
  id: "p2-4", pep: 2, num: 4, puntos: 1, tema: "Requerimientos de EM",
  enunciado: "Considere i ≠ j y a ≠ b; i, j, a, b ∈ N. Una solución que provea EM falla si:",
  opciones: [
    "Cuando la hebra hi está en la SC, ninguna otra hebra hj estará en la SC.",
    "Si una hebra hi ejecuta enterSCa() y ninguna otra hebra hj se encuentra en la correspondiente SCa, entonces hi puede entrar a la SCa.",
    "Se garantiza que una hebra hi, que ejecuta enterSCa(), eventualmente entrará a la SCa.",
    "Cuando la hebra hi está en la SCa, otra hebra hj podría estar en otra SCb si ambas SC comparten la misma memoria."
  ],
  correcta: 3,
  justificacion: "Dos secciones críticas distintas pueden ejecutarse en paralelo **solo si tocan datos distintos**. Si SCa y SCb acceden a la **misma memoria compartida**, entonces en realidad son la misma sección crítica y deben excluirse mutuamente. Permitir que hi esté en SCa mientras hj está en SCb sobre los mismos datos es exactamente donde la solución falla.",
  descarte: "Las otras tres son justamente los requerimientos que una solución correcta **debe cumplir**: la primera es la exclusión mutua propiamente tal, la segunda es el **progreso** (si nadie está adentro, no hay razón para hacerte esperar) y la tercera es la **ausencia de inanición** (espera limitada). Cumplirlas no es fallar, es lo contrario."
},

{
  id: "p2-5", pep: 2, num: 5, puntos: 2, tema: "Semáforos / deadlock",
  contexto: "En una esquina sin semáforos se prueban autos autónomos. Los autos no pueden retroceder y solo avanzan en línea recta. Todos detectan los cuadrantes a, b, c y d, y pueden avanzar a ellos si no están ocupados. Cada auto es una hebra y solo avanzan un cuadrante a la vez.",
  enunciado: "¿Para qué valores de X e Y la solución satisface los requerimientos para una solución correcta de EM?",
  codigo: `// 4 semáforos que representan los cuadrantes
semaphore cuadrante[4] = {X};
// 1 semáforo que representa la intersección
semaphore interseccion = Y;

void auto(int i) {
  // El auto avanza hasta llegar a la intersección
  wait(&interseccion);
  wait(&cuadrante[i]);            // avanza un cuadrante
  wait(&cuadrante[(i+1)%4]);      // avanza al segundo
  // El auto ha cruzado la intersección
  signal(&cuadrante[i]);
  signal(&cuadrante[(i+1)%4]);
  signal(&interseccion);
}`,
  opciones: [
    "X = 0 e Y = 3",
    "X = 1 e Y = 3",
    "X = 0 e Y = 4",
    "X = 1 e Y = 4"
  ],
  correcta: 1,
  justificacion: "Son dos decisiones distintas. **X = 1** porque cada cuadrante es un recurso que admite un solo auto a la vez: el semáforo debe partir libre (en 1) para que el primero pase y el segundo se bloquee. **Y = 3** porque hay que impedir que los 4 autos entren juntos: si entran los cuatro, cada uno toma su cuadrante y queda esperando el del vecino, formando una **espera circular** perfecta — deadlock. Dejando entrar máximo 3, siempre queda un cuadrante libre y alguien puede completar el cruce.",
  diagrama: `Con Y = 4 (los 4 autos adentro):

   auto0 tiene 'a', espera 'b'
   auto1 tiene 'b', espera 'c'
   auto2 tiene 'c', espera 'd'
   auto3 tiene 'd', espera 'a'   ← círculo cerrado = DEADLOCK

Con Y = 3: siempre hay al menos un cuadrante libre
→ se rompe la espera circular.`,
  descarte: "Con X = 0 los semáforos de cuadrante parten cerrados: **ningún auto podría avanzar nunca**, deadlock inmediato. Y con Y = 4 el semáforo de la intersección no limita nada, así que se cae en la espera circular descrita arriba."
},

{
  id: "p2-6", pep: 2, num: 6, puntos: 1, tema: "Deadlock",
  contexto: "Múltiples hebras invocan concurrentemente acquire_locks(semlist[], size) intentando obtener un conjunto arbitrario de semáforos, con el arreglo en cualquier orden. Los semáforos son únicos, sin punteros duplicados. La función retorna una vez adquiridos todos.",
  enunciado: "¿Cuál sería una implementación que resuelva el problema y esté libre de deadlock?",
  codigo: `void acquire_locks(struct lock *semlist[], int size);`,
  opciones: [
    "Se recorre semlist[] adquiriendo los semáforos en el orden de la lista.",
    "Se ordena semlist[] por dirección de memoria, adquiriendo los semáforos en ese orden.",
    "Se recorre semlist[] adquiriendo sólo los semáforos que estén disponibles.",
    "No es posible implementar la función correctamente y libre de deadlock."
  ],
  correcta: 1,
  justificacion: "La técnica se llama **orden total de adquisición** y ataca directamente la condición de **espera circular**. Como las direcciones de memoria son únicas y comparables, ordenar por dirección impone un orden global que *todas* las hebras respetan por igual. Si dos hebras quieren los mismos dos semáforos, ambas los pedirán en el mismo orden, así que una gana el primero y la otra espera ahí — nunca se forma el ciclo.",
  diagrama: `SIN ordenar (deadlock):
  H1 pide A, luego B      H2 pide B, luego A
  H1 tiene A, espera B    H2 tiene B, espera A   ← ciclo

ORDENANDO por dirección (A < B siempre):
  H1 pide A, luego B      H2 pide A, luego B
  H1 tiene A y B          H2 espera en A y luego pasa  ✓`,
  descarte: "Tomarlos en el orden de la lista es exactamente el caso que produce deadlock, porque cada hebra trae el arreglo desordenado a su manera. Adquirir \"sólo los disponibles\" no cumple el contrato de la función (debe retornar con **todos** adquiridos) y además puede derivar en livelock. Y sí es posible resolverlo, así que la última alternativa es falsa."
},

{
  id: "p2-7", pep: 2, num: 7, puntos: 1, tema: "Concurrencia (modelado)",
  contexto: "Cien reos, cada uno en su celda. Hay una sala con una ampolleta inicialmente apagada. Cada día el guardia elige aleatoriamente a un reo y lo lleva a la sala, donde puede cambiar el interruptor y aseverar si todos ya entraron al menos una vez. Estrategia acordada: un único líder cuenta cuántas veces encuentra la ampolleta prendida y al salir la apaga; los demás la prenden la primera vez que la encuentran apagada y nunca más la tocan.",
  enunciado: "Respecto al pseudocódigo, ¿cuál de las siguientes afirmaciones es correcta?",
  codigo: `lámpara l = OFF;

reo(tid) {
  boolean first_time = true;
  int counter = 1;
  while (true) {
    if (tid == LIDER) {
      if (l == ON) {
        switch_lamp(l);      // el líder APAGA
        counter++;
      }
      if (counter == MAX_REOS)
        printf("TODOS HAN ENTRADO");
    } else {
      if (first_time && l == OFF) {
        switch_lamp(l);      // el resto PRENDE, una sola vez
        first_time = false;
      }
    }
  }
}`,
  opciones: [
    "Un reo que no es líder podría apagar la luz más de una vez.",
    "Dos reos actúan como líder, prendiendo la ampolleta.",
    "Más de un reo modifica el contador, por lo que podría ocurrir una condición de carrera.",
    "Es posible que el líder nunca asevere que todos los reos han entrado por lo menos una vez a la sala."
  ],
  correcta: 3,
  justificacion: "El guardia elige **aleatoriamente** y sin garantías de equidad: nada asegura que algún reo en particular sea llevado alguna vez a la sala. Si a un reo nunca lo eligen, jamás prende la ampolleta, el contador del líder nunca llega a MAX_REOS y la aseveración nunca ocurre. Es inanición, y el código no tiene ningún mecanismo para prevenirla.",
  descarte: "Los no líderes solo **prenden** (cuando la encuentran apagada) y además el `first_time` los limita a una única vez, así que no pueden apagarla ni repetir. El `tid == LIDER` garantiza que haya un solo líder, y es él quien apaga, no quien prende. Y `counter` es una **variable local** del líder: nadie más la toca, así que no hay condición de carrera sobre ella."
},

{
  id: "p2-8", pep: 2, num: 8, puntos: 1, tema: "Inanición",
  contexto: "Considere el siguiente pseudocódigo de los reos.",
  enunciado: "¿Cuál de los siguientes problemas se puede apreciar en el código?",
  codigo: `lámpara l = OFF;

reo(tid) {
  boolean first_time = true;
  int counter = 1;
  while (true) {
    if (tid == LIDER) {
      if (l == ON) {
        switch_lamp(l);      // el líder APAGA
        counter++;
      }
      if (counter == MAX_REOS)
        printf("TODOS HAN ENTRADO");
    } else {
      if (first_time && l == OFF) {
        switch_lamp(l);      // el resto PRENDE, una sola vez
        first_time = false;
      }
    }
  }
}`,
  opciones: [
    "Existe una traza que lleva a deadlock, donde ningún reo volverá a ingresar a la sala",
    "No se asegura progreso, dado que un reo no podría ingresar a la sala aún cuando no haya sido elegido",
    "Ocurre inanición, ya que un reo podría eventualmente nunca ingresar a la sala",
    "No se provee EM sobre las variables compartidas."
  ],
  correcta: 3,
  justificacion: "La pregunta apunta al **defecto del código**, y la lámpara `l` es una variable compartida por los 100 reos que se lee (`l == ON`) y después se escribe (`switch_lamp(l)`) sin ningún mecanismo de protección: no hay semáforo, mutex ni monitor en todo el pseudocódigo. Ese par leer-y-luego-escribir es una sección crítica desprotegida, o sea **no se provee EM**.",
  diagrama: `Líder:      if (l == ON) { switch_lamp(l); counter++; }
Otros reos: if (first_time && l == OFF) { switch_lamp(l); ... }
                        ↑                      ↑
                    LEE  l                 ESCRIBE  l

Ambos bloques tocan la misma variable compartida
sin candado de por medio  →  no hay exclusión mutua.`,
  descarte: "La inanición sí existe en el problema, pero depende del **guardia**, que es un agente externo al pseudocódigo, no un defecto de éste. No hay deadlock: todos los días entra alguien, el sistema avanza. Y el progreso se cumple: al reo que eligen, entra sin que nada se lo impida."
},

{
  id: "p2-9", pep: 2, num: 9, puntos: 2, tema: "Sección crítica",
  contexto: "Considere el siguiente pseudocódigo de los reos. Líneas 09–10: switch_lamp(l) y counter++ del líder. Líneas 17–18: switch_lamp(l) y first_time = false del resto.",
  enunciado: "¿Cuál es o cuáles son las SC en el código?",
  codigo: `lámpara l = OFF;

reo(tid) {
  boolean first_time = true;
  int counter = 1;
  while (true) {
    if (tid == LIDER) {
      if (l == ON) {
        switch_lamp(l);      // el líder APAGA
        counter++;
      }
      if (counter == MAX_REOS)
        printf("TODOS HAN ENTRADO");
    } else {
      if (first_time && l == OFF) {
        switch_lamp(l);      // el resto PRENDE, una sola vez
        first_time = false;
      }
    }
  }
}`,
  opciones: [
    "Existe una SC, que corresponde a las líneas 09, 10, 17 y 18.",
    "Existe una SC, que corresponde a las líneas 09, 10, 11, 17, 18 y 19.",
    "Existen dos SCs no exclusivas entre ellas, SCa con las líneas 09 y 10 y SCb con las líneas 17 y 18.",
    "Existen dos SCs no exclusivas entre ellas, SCa con las líneas 09, 10 y 11 y SCb con las líneas 17, 18 y 19."
  ],
  correcta: 0,
  justificacion: "La única variable **compartida** es la lámpara `l`, y la tocan tanto el líder (línea 09) como el resto de los reos (línea 17). Como todos acceden al **mismo dato**, es **una sola SC**: los dos bloques deben excluirse mutuamente entre sí, no son secciones independientes.",
  descarte: "Decir que son \"dos SCs no exclusivas\" es el error conceptual clave: si ambas manipulan la misma ampolleta, no pueden ejecutarse en paralelo. Las alternativas que suman las líneas 11 y 19 incluyen cierres de bloque y la comprobación de `counter`, que es variable local del líder — nadie compite por ella."
},

{
  id: "p2-10", pep: 2, num: 10, puntos: 1, tema: "Deadlock / banquero",
  enunciado: "¿Cuál de las siguientes afirmaciones es correcta?",
  opciones: [
    "Una solución que involucre recursos consumibles y renovables no puede generar deadlock.",
    "Si hay más procesadores que procesos o hebras, nunca ocurrirá deadlock.",
    "El algoritmo del banquero denegará la asignación de un recurso si todas las posibles asignaciones de recursos a los procesos terminan con todos los procesos finalizando su ejecución exitosamente.",
    "El algoritmo del banquero supone que ningún proceso puede terminar o salir mientras posea recursos asignados."
  ],
  correcta: 3,
  justificacion: "Es uno de los supuestos explícitos del modelo del banquero: los procesos declaran su necesidad máxima por adelantado y **devuelven todos los recursos antes de terminar**. Bajo ese supuesto el algoritmo puede simular la \"secuencia segura\" y saber si, en el peor caso, todos alcanzan a terminar.",
  descarte: "El deadlock se produce por **recursos**, no por falta de CPUs: aunque cada hebra tenga su propio procesador, igual pueden quedarse esperando candados entre ellas. Los recursos consumibles también generan deadlock (dos procesos esperando un mensaje que el otro debe enviar). Y la tercera alternativa está al revés: si **todas** las asignaciones terminan bien, eso es un estado **seguro** y el banquero **concede** el recurso, no lo deniega."
},

{
  id: "p2-11", pep: 2, num: 11, puntos: 1, tema: "Semáforos",
  contexto: "Se ha protegido la SC dentro de una función ejecutada por varias hebras. La variable s fue inicializada en la hebra main.",
  enunciado: "Se provee EM siempre y cuando:",
  codigo: `sem_t s;

void* worker(void *param) {
  while (true) {
    sem_wait(&s);    // enterSC()
    // SC
    sem_post(&s);    // exitSC()
  }
}`,
  opciones: [
    "sem_init(&s, 0);",
    "sem_init(&s, 1);",
    "sem_init(&s, 2);",
    "sem_init(&s, 3);"
  ],
  correcta: 1,
  justificacion: "El valor inicial de un semáforo indica **cuántas hebras pueden estar dentro simultáneamente**. Para exclusión mutua queremos exactamente una, así que se inicializa en **1**: la primera hebra hace `sem_wait`, lo baja a 0 y entra; cualquier otra que llegue encuentra 0 y se bloquea hasta que la primera haga `sem_post`.",
  descarte: "Con 0 el semáforo parte cerrado y **nadie** entra jamás: deadlock inmediato. Con 2 o 3 estás construyendo un semáforo **contador** que deja pasar a 2 o 3 hebras a la vez — útil para limitar acceso a un pool de recursos, pero no es exclusión mutua."
},

{
  id: "p2-12", pep: 2, num: 12, puntos: 1, tema: "Semáforos",
  contexto: "Comparando la implementación POSIX (sem_wait / sem_post) con el semáforo contador estudiado en clases.",
  enunciado: "El comportamiento del semáforo contador implementado difiere de lo estudiado en clases en lo siguiente:",
  opciones: [
    "El valor negativo del semáforo estudiado en clases no refleja el número de hebras esperando en el semáforo.",
    "El valor positivo del semáforo estudiado en clases refleja el número de hebras esperando en el semáforo.",
    "El valor negativo del semáforo estudiado en clases refleja el número de hebras esperando en el semáforo.",
    "El valor positivo del semáforo estudiado en clases no refleja el número de hebras esperando en el semáforo."
  ],
  correcta: 2,
  justificacion: "Ojo con leer las cuatro alternativas completas, porque solo cambian en dos palabras: **negativo/positivo** y la presencia del **\"no\"**. En el semáforo teórico de clases, `semWait` **siempre decrementa** el contador, incluso cuando ya está en cero. Por eso el valor puede volverse negativo, y su **magnitud indica exactamente cuántas hebras están bloqueadas** esperando en la cola: si vale −3, hay tres hebras esperando. La implementación POSIX en cambio nunca baja de cero, y ahí está justamente la diferencia que pregunta el enunciado.",
  diagrama: `Semáforo de CLASES (teórico):        POSIX (sem_t):

  semWait: s--  siempre              sem_wait: si s>0, s--
           si s<0 → bloquea                    si s==0 → bloquea
                                               (nunca baja de 0)
  s = -3  →  3 hebras esperando
  s =  2  →  2 pueden entrar          sem_getvalue nunca es < 0
             sin bloquearse`,
  descarte: "La alternativa 1 niega justamente lo que sí ocurre. Las que hablan del valor **positivo** confunden los dos significados del contador: cuando es positivo indica cuántas hebras más **pueden entrar sin bloquearse** (unidades del recurso disponibles), no cuántas esperan — por eso la 2 es falsa. Y aunque la 4 es una afirmación cierta en sí misma, no responde la pregunta: el positivo tampoco refleja las hebras esperando en la implementación POSIX, así que **eso no es una diferencia** entre ambas."
},

{
  id: "p2-13", pep: 2, num: 13, puntos: 1, tema: "Condición de carrera",
  enunciado: "Una de las siguientes afirmaciones NO es una característica de una condición de carrera (CC):",
  opciones: [
    "El resultado de una operación sobre memoria compartida depende del orden de ejecución y velocidad relativa de dos o más hebras.",
    "La CC sólo ocurre en sistemas multiprocesador o multicore.",
    "La CC es un error potencial de concurrencia.",
    "El resultado de una CC podría llevar a un resultado correcto."
  ],
  correcta: 1,
  justificacion: "En un monoprocesador también hay condiciones de carrera, y la culpa es del **cambio de contexto**: el planificador puede desapropiar a una hebra justo en la mitad de un `counter++` (que en assembler son tres instrucciones), dejando la operación a medias mientras entra la otra. No se necesita paralelismo real, basta con **concurrencia**.",
  descarte: "Las otras tres son características legítimas: la CC es por definición dependencia del entrelazado, es un error **potencial** (puede que nunca se manifieste en tus pruebas) y perfectamente puede arrojar el resultado correcto por casualidad — precisamente por eso son tan traicioneras de depurar."
},

{
  id: "p2-14", pep: 2, num: 14, puntos: 2, tema: "Sección crítica",
  enunciado: "La sección crítica (SC) se define como:",
  opciones: [
    "Código ejecutado por sólo una hebra realizando operaciones de escritura sobre memoria.",
    "Código ejecutado por dos hebras realizando ambas operaciones de escritura sobre memoria local o privada.",
    "Código ejecutado por dos o más hebras donde por lo menos una realiza operaciones de escritura sobre memoria global o compartida.",
    "Código ejecutado por varias hebras donde todas realizan operaciones de escritura sobre memoria compartida."
  ],
  correcta: 2,
  justificacion: "La definición tiene tres ingredientes y hay que respetarlos todos: (1) **dos o más hebras**, porque con una sola no hay con quién competir; (2) memoria **global o compartida**, porque sobre memoria privada nadie se pisa; y (3) basta con que **al menos una escriba** — si todas solo leen, no hay problema alguno.",
  descarte: "Con una sola hebra no existe concurrencia. La memoria **local o privada** no genera conflicto: cada hebra tiene su propio stack. Y exigir que **todas** escriban es demasiado restrictivo: el caso clásico de un escritor y varios lectores ya constituye sección crítica."
},

{
  id: "p2-15", pep: 2, num: 15, puntos: 2, tema: "Requerimientos de EM",
  enunciado: "Considere i ≠ j y a ≠ b. Una solución incorrecta para proveer exclusión mutua (EM) permite que:",
  opciones: [
    "Cuando la hebra hi está en la SCa, ninguna otra hebra hj estará en la misma SCa.",
    "Si una hebra hi ejecuta enterSCa() y ninguna otra hebra hj se encuentra en la correspondiente SCa, entonces hi puede entrar a la SCa.",
    "Se garantiza que una hebra hi que ejecuta enterSCa() eventualmente entrará a la SCa.",
    "Cuando la hebra hi está en la SCa, otra hebra hj podría estar en otra SCb si ambas SC comparten la misma memoria."
  ],
  correcta: 3,
  justificacion: "Si dos \"secciones críticas\" acceden a la **misma memoria compartida**, conceptualmente son una sola SC y deben excluirse mutuamente. Permitir que hi esté en SCa mientras hj está en SCb sobre los mismos datos es precisamente la violación de exclusión mutua.",
  descarte: "Las otras tres describen los requerimientos que toda solución **correcta** debe cumplir: exclusión mutua, progreso y ausencia de inanición respectivamente. Cumplirlas es lo esperado, no un defecto."
},

{
  id: "p2-16", pep: 2, num: 16, puntos: 2, tema: "Conceptos de concurrencia",
  enunciado: "Identifique aquella afirmación que es verdadera:",
  opciones: [
    "Toda instrucción en lenguaje de alto nivel es atómica.",
    "Durante la ejecución de una instrucción de un lenguaje de alto nivel no ocurren cambios de contexto, pero pueden ocurrir entre varias instrucciones de assembler.",
    "Aunque inanición implica deadlock, deadlock no implica inanición.",
    "El código que ejecuta una hebra puede tener más de una SC."
  ],
  correcta: 3,
  justificacion: "Perfectamente posible: una hebra puede tocar varias variables compartidas distintas en distintos momentos, y cada acceso constituye su propia sección crítica, con su propio candado. Es más, usar candados separados para datos independientes es **buena práctica**, porque permite más paralelismo que un candado global.",
  descarte: "Una instrucción de alto nivel como `counter++` se traduce a **tres** instrucciones de máquina (leer, sumar, escribir) y el cambio de contexto puede caer justo en medio: no es atómica. La segunda alternativa dice exactamente lo contrario de la realidad. Y la tercera invierte la implicación: **deadlock sí implica inanición** (los procesos trabados nunca avanzan), pero puede haber inanición sin deadlock — el sistema avanza, solo que sin ti."
},

{
  id: "p2-17", pep: 2, num: 17, puntos: 1, tema: "Soluciones por hardware",
  contexto: "Un sistema provee la instrucción atómica fetch_and_add, que devuelve el valor antiguo e incrementa. Dos hebras ejecutan la función trabajador; boleto y turno son globales. Es la implementación de un ticket lock.",
  enunciado: "¿Cuáles valores iniciales para las variables boleto y turno producen deadlock?",
  codigo: `int fetch_and_add(int *ptr) {
  int old = *ptr;
  *ptr = old + 1;
  return old;              // devuelve el valor ANTIGUO
}

void* trabajador(void *parametro){
  while(1){
    // código no crítico
    int mi_turno = fetch_and_add(&boleto);   // saca número
    while(turno != mi_turno);                // espera su turno
    SC();
    fetch_and_add(&turno);                   // llama al siguiente
    // código no crítico
  }
}`,
  opciones: [
    "boleto = 1 y turno = 0",
    "boleto = 0 y turno = 1",
    "boleto = 1 y turno = 1",
    "boleto = 0 y turno = 0"
  ],
  correcta: 0,
  justificacion: "Es el mecanismo de la panadería: sacas un número y esperas a que el mostrador lo llame. Con **boleto = 1 y turno = 0**, el mostrador está llamando al número 0 pero **ese boleto ya no lo saca nadie**: la primera hebra saca el 1, la segunda el 2, y así. Nadie tiene el 0, así que nadie entra jamás y `turno` nunca avanza. Deadlock total.",
  diagrama: `boleto = 1, turno = 0

H1: mi_turno = 1   →  while(0 != 1)  gira para siempre
H2: mi_turno = 2   →  while(0 != 2)  gira para siempre

turno se queda en 0 porque nadie llega a la SC
para incrementarlo.  ⇒ DEADLOCK`,
  descarte: "Con boleto = turno (casos 0/0 y 1/1) el sistema funciona bien: el primer número que se saca coincide con el que está siendo llamado. Y boleto = 0 con turno = 1 no produce deadlock sino **inanición**: la hebra que saca el 0 nunca entra, pero las demás sí avanzan."
},

{
  id: "p2-18", pep: 2, num: 18, puntos: 1, tema: "Inanición",
  contexto: "Mismo ticket lock, con dos hebras ejecutando trabajador.",
  enunciado: "¿Esta solución es libre de inanición?",
  codigo: `int fetch_and_add(int *ptr) {
  int old = *ptr;
  *ptr = old + 1;
  return old;              // devuelve el valor ANTIGUO
}

void* trabajador(void *parametro){
  while(1){
    // código no crítico
    int mi_turno = fetch_and_add(&boleto);   // saca número
    while(turno != mi_turno);                // espera su turno
    SC();
    fetch_and_add(&turno);                   // llama al siguiente
    // código no crítico
  }
}`,
  opciones: [
    "Sí, para los valores boleto = 1 y turno = 0",
    "No, para los valores boleto = 0 y turno = 1",
    "Sí, para los valores boleto = 0 y turno = 0",
    "No, para los valores boleto = 1 y turno = 1"
  ],
  correcta: 2,
  justificacion: "Cuando **boleto y turno arrancan iguales** (los dos en 0), el ticket lock funciona como el mesón de una panadería bien administrada: la primera hebra saca el número 0 y el mostrador está llamando justo al 0, la segunda saca el 1 y entrará después, y así sucesivamente. El orden de atención es **FIFO estricto**, nadie se salta la fila y toda hebra tiene garantizado su turno: **espera limitada**, o sea libre de inanición.",
  diagrama: `boleto = 0, turno = 0

H1: saca 0  →  turno==0  →  ENTRA ✓  →  al salir turno = 1
H2: saca 1  →  turno==1  →  ENTRA ✓  →  al salir turno = 2
H1: saca 2  →  turno==2  →  ENTRA ✓  ...

Atención en orden de llegada  ⇒  sin inanición`,
  descarte: "Con **boleto = 1 y turno = 0** hay deadlock: nadie saca el número 0, así que el mostrador llama para siempre a un boleto inexistente. Con **boleto = 0 y turno = 1** hay inanición: la hebra que saca el 0 nunca es llamada mientras las demás entran y salen. Y decir \"No\" para 1/1 es falso: ahí también coinciden y el lock funciona bien."
},

{
  id: "p2-19", pep: 2, num: 19, puntos: 1, tema: "Semáforos (túnel)",
  contexto: "Por un túnel de una sola vía sólo pueden pasar autos en una dirección al mismo tiempo. Existen contadorDirA y contadorDirB en cero, y los semáforos binarios semDirA, semDirB y semTunel en uno. N hebras ejecutan autoDirA() y M ejecutan autoDirB(). El primer auto de una dirección toma el túnel y el último lo libera.",
  enunciado: "Suponga que alguna ejecución concurrente ha producido estos valores, donde t representa valores discretos del tiempo. Para contadorDirA y contadorDirB se puede afirmar que:",
  codigo: `void *autoDirA(void *data){
  semWait(&semDirA);
  contadorDirA++;
  if (contadorDirA == 1) semWait(&semTunel);   // el primero toma el túnel
  semSignal(&semDirA);
  cruzarTunel();
  semWait(&semDirA);
  contadorDirA--;
  if (contadorDirA == 0) semSignal(&semTunel); // el último lo libera
  semSignal(&semDirA);
}
// autoDirB es simétrico, con semDirB y contadorDirB`,
  tabla: {"head":["","t1","t2","t3","t4","t5","t6","t7","t8"],"rows":[["contadorDirA","0","1","2","1","0","0","1","1"],["contadorDirB","0","0","0","1","1","2","1","0"]]},
  opciones: [
    "La secuencia es inválida, dado que no es posible que en t4 contadorDirA y contadorDirB tomen el valor 1.",
    "La secuencia es inválida, dado que no es posible que en t7 contadorDirA y contadorDirB tomen el valor 1.",
    "La secuencia es inválida, porque los valores nunca superan en valor 2.",
    "La secuencia es válida."
  ],
  correcta: 3,
  justificacion: "La trampa es creer que ambos contadores no pueden ser distintos de cero a la vez. Sí pueden: fíjate que `contadorDirB++` se ejecuta **antes** del `semWait(&semTunel)`. O sea, un auto de la dirección B ya se contó a sí mismo y **después** queda bloqueado esperando el túnel que todavía tiene la dirección A. El contador refleja \"autos que quieren pasar\", no \"autos dentro del túnel\".",
  diagrama: `t4:  contadorDirA = 1   ← un auto A todavía cruzando
     contadorDirB = 1   ← un auto B ya se contó,
                          pero está BLOQUEADO en semWait(&semTunel)

t5:  A baja a 0  → semSignal(&semTunel)
     → recién ahí el auto B entra al túnel  ✓

La secuencia respeta el protocolo en todo momento.`,
  descarte: "Los valores en t4 y t7 son perfectamente posibles por lo explicado. Y no hay ninguna regla que impida superar el 2: los contadores llegan hasta N y M respectivamente, según cuántos autos estén esperando."
},

{
  id: "p2-20", pep: 2, num: 20, puntos: 2, tema: "Sección crítica",
  contexto: "Considere el siguiente código del túnel.",
  enunciado: "En el código se puede identificar la siguiente SC:",
  codigo: `void *autoDirA(void *data){
  semWait(&semDirA);
  contadorDirA++;
  if (contadorDirA == 1) semWait(&semTunel);   // el primero toma el túnel
  semSignal(&semDirA);
  cruzarTunel();
  semWait(&semDirA);
  contadorDirA--;
  if (contadorDirA == 0) semSignal(&semTunel); // el último lo libera
  semSignal(&semDirA);
}
// autoDirB es simétrico, con semDirB y contadorDirB`,
  opciones: [
    "La sección crítica que accede a contadorDirB entre hebras que ejecutan autoDirB()",
    "La sección crítica que accede a contadorDirB entre hebras que ejecutan autoDirA()",
    "La sección crítica cruzarTunel() entre las hebras que ejecutan autoDirA()",
    "La sección crítica cruzarTunel() entre las hebras que ejecutan autoDirB()"
  ],
  correcta: 0,
  justificacion: "Una SC existe donde varias hebras tocan el mismo dato compartido. `contadorDirB` lo modifican **únicamente las hebras que ejecutan autoDirB()**, y por eso está protegido con `semWait(&semDirB)` / `semSignal(&semDirB)`. Ese bloque es exactamente la sección crítica.",
  descarte: "Las hebras de `autoDirA()` ni siquiera mencionan `contadorDirB`: no compiten por él. Y `cruzarTunel()` **no es sección crítica**: la gracia del problema es justamente que muchos autos de la misma dirección crucen **simultáneamente**. La exclusión se aplica entre direcciones opuestas (vía semTunel), no entre autos de la misma dirección."
},

{
  id: "p2-21", pep: 2, num: 21, puntos: 1, tema: "Inanición",
  contexto: "Mismo problema del túnel. Recuerde que si pasa un auto en una dirección y hay más autos en la misma dirección esperando, éstos tienen prioridad frente a los de la dirección contraria.",
  enunciado: "¿Cuándo la solución siempre sufrirá inanición?",
  codigo: `void *autoDirA(void *data){
  semWait(&semDirA);
  contadorDirA++;
  if (contadorDirA == 1) semWait(&semTunel);   // el primero toma el túnel
  semSignal(&semDirA);
  cruzarTunel();
  semWait(&semDirA);
  contadorDirA--;
  if (contadorDirA == 0) semSignal(&semTunel); // el último lo libera
  semSignal(&semDirA);
}
// autoDirB es simétrico, con semDirB y contadorDirB`,
  opciones: [
    "Cuando N y M son finitos",
    "Cuando N y M son finitos y N es 10M",
    "Cuando N y M son finitos y M es 10N",
    "Cuando N y M tienden a infinito"
  ],
  correcta: 3,
  justificacion: "El túnel solo se libera cuando el contador de la dirección que lo tiene llega a **cero**. Si los autos de esa dirección llegan sin parar (N → ∞), el contador nunca baja a cero, el `semSignal(&semTunel)` nunca se ejecuta y los autos de la dirección contraria esperan para siempre. La política de \"prioridad a los de la misma dirección\" se vuelve una condena.",
  diagrama: `contadorDirA:  1 → 2 → 3 → 2 → 3 → 4 → ...
               (nunca vuelve a 0 porque siguen llegando)

semTunel queda tomado indefinidamente
→ las hebras de dirección B nunca cruzan  =  INANICIÓN`,
  descarte: "Con N y M **finitos** la inanición no es permanente: tarde o temprano se acaban los autos de una dirección, el contador llega a cero y se libera el túnel. Que uno sea 10 veces el otro solo hace la espera más larga, pero igual termina."
},

{
  id: "p2-22", pep: 2, num: 22, puntos: 1, tema: "Deadlock",
  enunciado: "Identifique aquella afirmación que NO es verdadera para deadlock:",
  opciones: [
    "Ocurre deadlock en un conjunto de hebras si algunas hebras están esperando un recurso que sólo puede liberar (o generar en caso de recursos consumibles) otra hebra del conjunto.",
    "El algoritmo del banquero asegura que nunca ocurrirá deadlock.",
    "Para que un sistema pueda caer en deadlock, se deben cumplir 3 condiciones: exclusión mutua, hold and wait y no desapropiación.",
    "Una solución que involucre recursos consumibles puede generar deadlock."
  ],
  correcta: 2,
  justificacion: "Son **cuatro** condiciones, no tres: falta la **espera circular**. Las tres que menciona la alternativa (exclusión mutua, hold and wait y no desapropiación) son condiciones *necesarias*, pero por sí solas no bastan: el deadlock se consuma recién cuando además se forma el ciclo de espera. Por eso la afirmación es falsa.",
  diagrama: `Las 4 condiciones de Coffman:

  1. Exclusión mutua      ┐
  2. Hold and wait        ├─ necesarias (pueden darse sin deadlock)
  3. No desapropiación    ┘
  4. Espera circular      ← la que lo consuma`,
  descarte: "Las otras tres son correctas: esa es la definición de deadlock, el banquero efectivamente lo evita manteniéndose siempre en estados seguros, y los recursos consumibles (mensajes, señales) también producen deadlock cuando dos procesos esperan un mensaje que el otro debía enviar."
},

{
  id: "p2-23", pep: 2, num: 23, puntos: 1, tema: "Monitores",
  enunciado: "Para una solución de concurrencia basada en monitores, NO es posible que:",
  opciones: [
    "No cumpla con el requerimiento de proveer EM",
    "No cumpla con el requerimiento de no producir deadlock",
    "No cumpla con el requerimiento de no producir inanición",
    "No cumpla con el requerimiento de permitir progreso"
  ],
  correcta: 0,
  justificacion: "La **exclusión mutua viene gratis** con los monitores: es parte de la construcción del lenguaje. El compilador garantiza que solo una hebra esté activa dentro del monitor a la vez, sin que el programador tenga que acordarse de hacer lock/unlock. Por eso es imposible que un monitor no provea EM.",
  descarte: "Todo lo demás **sí puede fallar**, porque depende de cómo programes las variables de condición: si haces `wait()` sobre una condición que nadie va a señalizar, tienes deadlock; si el `signal()` despierta siempre a la misma hebra, tienes inanición. El monitor te regala la EM, el resto es responsabilidad tuya."
},

{
  id: "p2-24", pep: 2, num: 24, puntos: 1, tema: "Semáforos (peluquería)",
  contexto: "Peluquería con un peluquero, una silla de peluquería y N sillas de espera. Si no hay clientes, el peluquero duerme. Si un cliente llega y el peluquero trabaja, se sienta si hay sillas; si no, se va y vuelve después.",
  enunciado: "¿Cuál de las siguientes afirmaciones es correcta?",
  codigo: `semaphore peluqueroListo = 0;
semaphore salaDeEspera   = 1;
semaphore hayClientes    = 0;
int sillasLibres = N;

void *peluquero(void *data){
  while(1){
    semWait(&hayClientes);
    semWait(&salaDeEspera);
    sillasLibres++;
    semSignal(&peluqueroListo);
    semSignal(&salaDeEspera);
    // El peluquero le corta el pelo al cliente
  }
}

void *cliente(void *data){
  while(1){
    semWait(&salaDeEspera);
    if (sillasLibres > 0) {
      sillasLibres--;
      semSignal(&hayClientes);
      semSignal(&salaDeEspera);
      semWait(&peluqueroListo);
      // El peluquero le corta el pelo
    } else
      semSignal(&salaDeEspera);   // el cliente se va
  }
}`,
  opciones: [
    "El peluquero nunca le cortará el pelo a un cliente dado que el semáforo hayClientes nunca es distinto de cero",
    "Un cliente nunca será atendido por el peluquero dado que el semáforo peluqueroListo nunca es distinto de cero",
    "Los clientes pueden sufrir inanición",
    "El semáforo salaDeEspera no es necesario, los demás semáforos proveen EM"
  ],
  correcta: 2,
  justificacion: "Hay dos fuentes de inanición. Primero, un cliente que llega y encuentra la sala llena **se va** (rama del `else`) y vuelve a intentar: nada garantiza que alguna vez encuentre silla. Segundo, `peluqueroListo` es un semáforo **sin identidad**: cuando el peluquero hace `semSignal`, despierta a *cualquiera* de los clientes en cola, no necesariamente al que lleva más tiempo esperando. Un cliente con mala suerte puede quedar postergado indefinidamente.",
  descarte: "Los semáforos sí se activan: `hayClientes` lo incrementa el cliente antes de esperar, y `peluqueroListo` lo incrementa el peluquero. Y `salaDeEspera` **es indispensable**: es el mutex que protege la variable compartida `sillasLibres`; sin él, dos clientes podrían decrementarla a la vez y sentarse en la misma silla."
},

{
  id: "p2-25", pep: 2, num: 25, puntos: 2, tema: "Semáforos (peluquería)",
  contexto: "Considere el siguiente código de la peluquería.",
  enunciado: "¿Cuál de las siguientes afirmaciones es incorrecta?",
  codigo: `semaphore peluqueroListo = 0;
semaphore salaDeEspera   = 1;
semaphore hayClientes    = 0;
int sillasLibres = N;

void *peluquero(void *data){
  while(1){
    semWait(&hayClientes);
    semWait(&salaDeEspera);
    sillasLibres++;
    semSignal(&peluqueroListo);
    semSignal(&salaDeEspera);
    // El peluquero le corta el pelo al cliente
  }
}

void *cliente(void *data){
  while(1){
    semWait(&salaDeEspera);
    if (sillasLibres > 0) {
      sillasLibres--;
      semSignal(&hayClientes);
      semSignal(&salaDeEspera);
      semWait(&peluqueroListo);
      // El peluquero le corta el pelo
    } else
      semSignal(&salaDeEspera);   // el cliente se va
  }
}`,
  opciones: [
    "Si dos clientes llegan al mismo tiempo, la solución registra que sólo un cliente decrementó el valor de sillasLibres (o sea, dos clientes se sentaron en la misma silla)",
    "Un mismo cliente puede ser atendido más de una vez",
    "Clientes que no estén en la sala de espera no serán atendidos",
    "La sección crítica corresponde al acceso a la variable compartida sillasLibres, mientras que el acto de cortar el pelo es coordinación entre hebras que se ejecutan en concurrencia"
  ],
  correcta: 0,
  justificacion: "Esa afirmación es **incorrecta justamente porque el código sí funciona bien en ese punto**. El acceso a `sillasLibres` está encerrado entre `semWait(&salaDeEspera)` y `semSignal(&salaDeEspera)`, o sea protegido por un mutex. Si dos clientes llegan al mismo tiempo, uno entra y el otro se bloquea: el decremento se registra dos veces, nunca se pierde. No hay dos clientes en la misma silla.",
  descarte: "Las otras tres son verdaderas: la función `cliente` tiene un `while(1)`, así que el mismo cliente vuelve una y otra vez; solo se atiende a quien alcanzó a sentarse (los que encuentran la sala llena se van sin ser atendidos); y la distinción entre sección crítica (`sillasLibres`) y coordinación (el corte de pelo, sincronizado vía `hayClientes` y `peluqueroListo`) es exactamente correcta."
},

{
  id: "p2-26", pep: 2, num: 26, puntos: 1, tema: "Conceptos de concurrencia",
  enunciado: "Teniendo en cuenta los conceptos de Condición de Carrera (CC), Sección Crítica (SC) y Exclusión Mutua (EM) indique cuál de las siguientes afirmaciones es correcta:",
  opciones: [
    "Si dos o más hebras entran a una misma SC(a), entonces ninguna otra hebra puede entrar a otra SC(b).",
    "Si se provee EM a una SC(a), nunca ocurrirá una CC en la respectiva SC(a).",
    "Una CC no sólo ocurre cuando se modifica memoria compartida, sino también, y esencialmente, cuando se modifica memoria local o privada.",
    "La CC sólo ocurre en sistemas multiprocesador o multicore."
  ],
  correcta: 1,
  justificacion: "Ésa es la razón de ser de la exclusión mutua: si garantizas que solo una hebra a la vez ejecuta la SC(a), entonces las operaciones sobre esos datos compartidos dejan de entrelazarse y el resultado ya no depende del orden ni de la velocidad relativa. Sin entrelazado no hay condición de carrera.",
  descarte: "La primera confunde secciones críticas independientes: dos SC que tocan datos distintos pueden ejecutarse en paralelo sin problema. La tercera está al revés: la memoria **local o privada** es de cada hebra, nadie más la ve, así que jamás genera CC. Y la cuarta ignora que en monoprocesador el cambio de contexto puede partir un `counter++` por la mitad."
},

{
  id: "p2-27", pep: 2, num: 27, puntos: 1, tema: "Busy waiting",
  enunciado: "Busy Waiting o espera activa es una característica de las soluciones por hardware y software para implementar enterSC() y exitSC(). Con respecto a esta técnica se puede afirmar que:",
  opciones: [
    "La hebra que invoca enterSC(a) se bloquea (pasa a estado bloqueado) a la espera que otra hebra en la SC(a) invoque exitSC(a).",
    "Sólo una hebra que invoca enterSC(a) estará en espera activa. Ninguna otra hebra que invoque enterSC(a) lo estará.",
    "Ninguna solución basada en espera activa provee EM.",
    "Una hebra en espera activa puede consumir todo su quantum de tiempo ejecutando enterSC(a)."
  ],
  correcta: 3,
  justificacion: "Ése es exactamente el defecto del busy-waiting: la hebra **no se bloquea**, se queda girando en un `while` que para el planificador es trabajo normal. El SO le sigue dando quantum tras quantum y ella lo quema entero sin avanzar ni un milímetro. Es CPU tirada a la basura.",
  descarte: "Bloquearse y ceder el procesador es justo lo que **no** hace el busy-waiting (eso lo hacen los semáforos con cola de bloqueados). Pueden estar **varias** hebras girando a la vez, no solo una. Y sí existen soluciones con espera activa que proveen EM correctamente — Peterson, test-and-set, compare-and-swap — su problema es la eficiencia, no la corrección."
},

{
  id: "p2-28", pep: 2, num: 28, puntos: 1, tema: "Deadlock / banquero",
  enunciado: "En un sistema se implementa el algoritmo del banquero que, a partir de un estado inicial, calcula si corresponde a un estado seguro o inseguro. Para lo anterior se puede afirmar que:",
  opciones: [
    "Un estado inseguro siempre provocará deadlock.",
    "Un estado seguro siempre provocará deadlock.",
    "Un estado inseguro nunca provocará deadlock.",
    "Un estado seguro nunca provocará deadlock."
  ],
  correcta: 3,
  justificacion: "Un estado **seguro** significa que existe al menos una secuencia de ejecución en la que todos los procesos alcanzan a terminar, aunque cada uno pida su máximo declarado. Como esa secuencia existe, el sistema **siempre puede salir adelante**: por eso el banquero solo concede recursos si el estado resultante sigue siendo seguro.",
  descarte: "La asimetría es la clave: seguro ⇒ nunca hay deadlock, pero inseguro ⇒ **puede** haberlo, no necesariamente lo hay. Un estado inseguro solo significa que *si todos pidieran su máximo* podrían trabarse; si en la práctica no lo piden, el sistema termina bien igual. Por eso \"siempre\" y \"nunca\" en las alternativas de estado inseguro son ambas falsas."
},

{
  id: "p2-29", pep: 2, num: 29, puntos: 2, tema: "Soluciones por hardware",
  contexto: "Se implementa compare-and-swap por hardware. N hebras ejecutan function() y las variables key, X e Y son globales.",
  enunciado: "¿Para qué valores de key, X e Y la solución provee EM?",
  codigo: `int compare_and_swap(int *ptr, int expected, int new) {
  int actual = *ptr;
  if (actual == expected) *ptr = new;
  return actual;              // devuelve el valor que HABÍA
}

void enterSC(int *key) { while (compare_and_swap(key, X, Y)); }
void exitSC(int *key)  { *key = 0; }

void* function(void *param) {
  while (1) {
    // código no crítico
    enterSC(&key);
    SC();
    exitSC(&key);
    // código no crítico
  }
}`,
  opciones: [
    "key = -1, X = -1, Y = -1",
    "key = 0,  X = -1, Y = -1",
    "key = 0,  X = 0,  Y = -1",
    "key = 0,  X = 0,  Y = 0"
  ],
  correcta: 2,
  justificacion: "Hay que pedirle tres cosas al `while`. Que la **primera** hebra salga del ciclo: el CAS debe devolver 0, así que key debe partir en **0**. Que esa hebra efectivamente **cierre** el candado: para que ocurra el swap se necesita `key == X`, o sea **X = 0**. Y que las **siguientes** queden girando: tras el swap key vale Y, y el CAS les devolverá Y, que debe ser distinto de cero → **Y = −1**.",
  diagrama: `key=0, X=0, Y=-1

H1: CAS(key, 0, -1) → actual=0, coincide → key=-1, retorna 0
    while(0) es falso  →  H1 ENTRA a la SC ✓

H2: CAS(key, 0, -1) → actual=-1, no coincide → retorna -1
    while(-1) es verdadero  →  H2 GIRA ✓

exitSC: key = 0  →  H2 puede entrar`,
  descarte: "Con X = Y = −1 y key = 0, el CAS nunca hace swap (0 ≠ −1) y siempre retorna 0: **todas** las hebras entran, no hay EM. Con X = Y = 0 pasa lo mismo: el swap escribe un 0 sobre otro 0 y el retorno siempre es 0, así que todas pasan. Y key = X = Y = −1 hace que el CAS retorne −1 siempre: nadie entra nunca."
},

{
  id: "p2-30", pep: 2, num: 30, puntos: 2, tema: "Deadlock",
  contexto: "Considere el siguiente código de compare-and-swap.",
  enunciado: "¿Para qué valores de key, X e Y la solución provoca deadlock?",
  codigo: `int compare_and_swap(int *ptr, int expected, int new) {
  int actual = *ptr;
  if (actual == expected) *ptr = new;
  return actual;              // devuelve el valor que HABÍA
}

void enterSC(int *key) { while (compare_and_swap(key, X, Y)); }
void exitSC(int *key)  { *key = 0; }

void* function(void *param) {
  while (1) {
    // código no crítico
    enterSC(&key);
    SC();
    exitSC(&key);
    // código no crítico
  }
}`,
  opciones: [
    "key = -1, X = -1, Y = -1",
    "key = 0,  X = -1, Y = -1",
    "key = 0,  X = 0,  Y = -1",
    "key = 0,  X = 0,  Y = 0"
  ],
  correcta: 0,
  justificacion: "Con **key = X = Y = −1** el candado nace cerrado. El CAS lee `actual = −1`, ve que coincide con X, escribe −1 (o sea, no cambia nada) y **retorna −1**. Como −1 es distinto de cero, el `while` se cumple y la hebra gira. Esto le pasa a todas por igual, siempre: nadie entra jamás a la SC, así que nadie llega al `exitSC` que pondría key en 0. Deadlock permanente.",
  diagrama: `key = -1, X = -1, Y = -1

Cualquier hebra:
  CAS(key, -1, -1) → actual = -1, coincide → key = -1
                   → retorna -1
  while(-1) verdadero → gira otra vez → retorna -1 → gira...

Nadie alcanza exitSC() ⇒ key nunca vuelve a 0  ⇒ DEADLOCK`,
  descarte: "Los casos con key = 0 y X ≠ 0 (o X = Y = 0) fallan por el problema opuesto: el CAS devuelve 0 y **todas** las hebras entran, o sea no hay EM pero tampoco deadlock. Y key = 0, X = 0, Y = −1 es la combinación que funciona bien."
},

{
  id: "p2-31", pep: 2, num: 31, puntos: 2, tema: "Semáforos (modelado)",
  contexto: "Un mago quiere una poción con exactamente K% de esencia de magia y (100−K)% de agua. Dos aprendices vierten ingredientes sin parar, a la espera de que el mago los detenga. El mago solo comprueba la proporción y debe detenerlos cuando se alcanza. Los ingredientes son infinitos.",
  enunciado: "¿La solución resuelve el problema?",
  codigo: `// agua y esencia_de_magia globales, inicializadas en uno.
// mutex global, ya inicializado. 3 hebras.

void* agregar_agua(void* p){
  while(1){ semWait(&mutex); agua++; semSignal(&mutex); }
}

void* agregar_esencia_de_magia(void* p){
  while(1){ semWait(&mutex); esencia_de_magia++; semSignal(&mutex); }
}

void* comprobar_proporcion(void* p){
  double proporcion;
  while(1){
    semWait(&mutex);
    proporcion = (float)magia/(float)(agua+magia);
    semSignal(&mutex);           // ← suelta el mutex ANTES de decidir
    if (proporcion <= 0.3) { exit(0); }
  }
}`,
  opciones: [
    "Sí, dado que la ejecución de las hebras está secuencializada (se ejecutan siempre una tras otra en el mismo orden).",
    "Sí, dado que eventualmente se cumplirá con la proporción.",
    "No, dado que nunca se cumplirá la proporción.",
    "No, es posible que los aprendices continúen agregando ingredientes antes que el mago los detenga."
  ],
  correcta: 3,
  justificacion: "El error de diseño está en que el mago **suelta el mutex antes de evaluar la condición**. Entre el `semSignal(&mutex)` y el `if`, los aprendices siguen corriendo y modificando `agua` y `magia`: cuando el mago finalmente decide detenerse, la proporción que midió ya no es la real. La verificación y la acción tienen que ser **una sola operación atómica**, y aquí están separadas.",
  diagrama: `mago:      calcula proporcion = 0,30  ✓
           semSignal(&mutex)
    ── cambio de contexto ──
aprendiz:  agua++  agua++  agua++   ← la proporción cambia
    ── cambio de contexto ──
mago:      if (0.30 <= 0.3) exit(0)
           pero la poción REAL ya no está en 0,30 ✗`,
  descarte: "Nada secuencializa a las hebras: el mutex garantiza exclusión, no orden ni alternancia. Y no es que la proporción \"nunca se cumpla\" — sí se alcanza momentáneamente, el problema es que el mago no logra congelar el estado en ese instante."
},

{
  id: "p2-32", pep: 2, num: 32, puntos: 1, tema: "Inanición",
  contexto: "Considere el siguiente código del mago y los aprendices.",
  enunciado: "¿Es posible inanición?",
  codigo: `// agua y esencia_de_magia globales, inicializadas en uno.
// mutex global, ya inicializado. 3 hebras.

void* agregar_agua(void* p){
  while(1){ semWait(&mutex); agua++; semSignal(&mutex); }
}

void* agregar_esencia_de_magia(void* p){
  while(1){ semWait(&mutex); esencia_de_magia++; semSignal(&mutex); }
}

void* comprobar_proporcion(void* p){
  double proporcion;
  while(1){
    semWait(&mutex);
    proporcion = (float)magia/(float)(agua+magia);
    semSignal(&mutex);           // ← suelta el mutex ANTES de decidir
    if (proporcion <= 0.3) { exit(0); }
  }
}`,
  opciones: [
    "Sí, puede que el mago nunca pueda corroborar la proporción.",
    "Sí, dado que todas las hebras se ejecutan en un ciclo infinito.",
    "No, dado que existe alternancia estricta entre mago y aprendices (primero el mago, luego el aprendiz que coloca agua y luego el que coloca esencia de magia).",
    "No, siempre y cuando el código se ejecute en un sistema computacional monoprocesador."
  ],
  correcta: 0,
  justificacion: "Las tres hebras compiten por el **mismo mutex** en un `while(1)`, y un semáforo no garantiza equidad: nada impide que los dos aprendices se turnen el mutex una y otra vez mientras el mago queda siempre atrás en la cola. Si el mago nunca logra entrar a medir, nunca detiene el proceso. Eso es inanición.",
  descarte: "Un ciclo infinito por sí solo no causa inanición — el problema es la competencia injusta por el mutex, no el `while`. La supuesta \"alternancia estricta\" no existe en ninguna parte del código: es puro azar de planificación. Y ser monoprocesador no ayuda: ahí también el planificador puede postergar sistemáticamente a la hebra del mago."
},

{
  id: "p2-33", pep: 2, num: 33, puntos: 1, tema: "Deadlock",
  contexto: "Considere el siguiente código del mago y los aprendices.",
  enunciado: "¿Es posible deadlock?",
  codigo: `// agua y esencia_de_magia globales, inicializadas en uno.
// mutex global, ya inicializado. 3 hebras.

void* agregar_agua(void* p){
  while(1){ semWait(&mutex); agua++; semSignal(&mutex); }
}

void* agregar_esencia_de_magia(void* p){
  while(1){ semWait(&mutex); esencia_de_magia++; semSignal(&mutex); }
}

void* comprobar_proporcion(void* p){
  double proporcion;
  while(1){
    semWait(&mutex);
    proporcion = (float)magia/(float)(agua+magia);
    semSignal(&mutex);           // ← suelta el mutex ANTES de decidir
    if (proporcion <= 0.3) { exit(0); }
  }
}`,
  opciones: [
    "Sí, dado que todas las hebras ejecutan semWait() sobre el mismo semáforo.",
    "Sí, dado que se están utilizando semáforos binarios y no semáforos contadores.",
    "No, dado que es posible probar que, si una hebra está en la SC, ninguna otra hebra está en la misma SC.",
    "No, dado que es posible probar que no existe espera circular entre todas las hebras para el semáforo mutex."
  ],
  correcta: 3,
  justificacion: "Con **un solo semáforo** no puede haber espera circular. Cada hebra toma el mutex, hace su cosita y lo suelta de inmediato — nunca queda con un recurso en la mano mientras pide otro. Sin espera circular no se cumplen las cuatro condiciones de Coffman, así que el deadlock es imposible.",
  descarte: "Que todas usen el mismo semáforo es justamente lo que **previene** el deadlock, no lo causa (el peligro aparece con dos o más candados tomados en distinto orden). El tipo de semáforo, binario o contador, no tiene nada que ver. Y la alternativa que habla de exclusión mutua describe la **EM**, que es un requerimiento distinto del deadlock: confundirlos es el error típico."
},

{
  id: "p2-34", pep: 2, num: 34, puntos: 1, tema: "Deadlock",
  enunciado: "Cuando un sistema cae en deadlock, es posible afirmar que:",
  opciones: [
    "Los recursos compartidos involucrados son de tipo consumible, y no de tipo reutilizables.",
    "Existe una sola instancia de cada recurso involucrado.",
    "Se cumplieron sólo las condiciones de exclusión mutua, hold and wait y no desapropiación.",
    "No se implementó el algoritmo del banquero."
  ],
  correcta: 3,
  justificacion: "Es un razonamiento por contrapositiva: el algoritmo del banquero **garantiza** que nunca se llegue a deadlock, porque solo concede recursos cuando el estado resultante sigue siendo seguro. Entonces, si el sistema efectivamente cayó en deadlock, se deduce que esa política de evitación no estaba implementada.",
  descarte: "El deadlock ocurre con recursos **reutilizables** (candados, memoria, dispositivos) y también con consumibles: no es exclusivo de ninguno. Puede haber múltiples instancias de un recurso y aun así trabarse, si todas están asignadas. Y la palabra **\"sólo\"** hace falsa a la tercera: además de esas tres condiciones se cumplió la **espera circular**, que es la cuarta."
},

{
  id: "p2-35", pep: 2, num: 35, puntos: 2, tema: "Algoritmo de Peterson",
  contexto: "Se implementa el tipo mutex_t con las funciones lock_init(), lock() y unlock(). Dos hebras ejecutan worker, una con t = 0 y la otra con t = 1.",
  enunciado: "Con respecto al código anterior, es posible afirmar que:",
  codigo: `typedef struct _mutex_t{
  int flag[2];
  int turn;
} mutex_t;

void lock_init(mutex_t *m){
  m->flag[0] = m->flag[1] = 0;
  m->turn = 0;
}

void lock(mutex_t *m, int t){
  m->flag[t] = 1;          // "quiero entrar"
  m->turn = 1-t;           // "pero le cedo el paso al otro"
  while (m->flag[1-t]==1 && m->turn==1-t);
}

void unlock(mutex_t *m, int t){ m->flag[t] = 0; }`,
  opciones: [
    "La solución no provee EM dado que los valores para el parámetro de entrada int t son incorrectos, ambas hebras deben recibir el mismo valor.",
    "Si en un momento dado m->flag[t] es igual a uno para todas las hebras, entonces, sólo la hebra que evalúe la expresión m->turn==1-t como falsa accederá a la SC.",
    "La implementación permite resolver el problema de concurrencia para N hebras.",
    "La hebra que invoca a lock y no puede continuar se bloqueará y abandonará el procesador a la espera que la despierten."
  ],
  correcta: 1,
  justificacion: "Éste es el **algoritmo de Peterson**. Cuando ambas hebras levantan su bandera (las dos quieren entrar), el desempate lo hace `turn`, que es **una sola variable con un único valor**. Ambas escriben en ella, pero la última escritura gana: para una de las dos la comparación `turn == 1-t` resulta **falsa**, y ésa es la que rompe el `while` y entra. La otra queda girando hasta que la primera baje su bandera.",
  diagrama: `H0: flag[0]=1, turn=1
H1: flag[1]=1, turn=0    ← escribió última, turn queda en 0

H0 evalúa: flag[1]==1 ✓  &&  turn==1 ✗  →  ENTRA
H1 evalúa: flag[0]==1 ✓  &&  turn==0 ✓  →  gira

El "cederle el turno al otro" es lo que evita el empate.`,
  descarte: "Los valores de t **deben ser distintos** (0 y 1): son el identificador de cada hebra, darles el mismo valor rompería todo. Peterson funciona solo para **dos** hebras, no para N. Y no hay bloqueo: el `while` es **busy-waiting** puro, la hebra conserva el procesador girando."
},

{
  id: "p2-36", pep: 2, num: 36, puntos: 1, tema: "Inanición",
  contexto: "Mismo algoritmo de Peterson.",
  enunciado: "¿Es posible inanición?",
  codigo: `typedef struct _mutex_t{
  int flag[2];
  int turn;
} mutex_t;

void lock_init(mutex_t *m){
  m->flag[0] = m->flag[1] = 0;
  m->turn = 0;
}

void lock(mutex_t *m, int t){
  m->flag[t] = 1;          // "quiero entrar"
  m->turn = 1-t;           // "pero le cedo el paso al otro"
  while (m->flag[1-t]==1 && m->turn==1-t);
}

void unlock(mutex_t *m, int t){ m->flag[t] = 0; }`,
  opciones: [
    "Sí, la solución no implementa ningún mecanismo que asegure que una hebra que invoca lock() eventualmente accederá a la SC.",
    "Sí, dado que cada vez que una hebra invoca lock() y se bloquea, abandona el procesador y no queda encolada en una variable de condición.",
    "No, eventualmente la hebra que haya ejecutado lock() quedan encolada a la espera de poder acceder a la SC.",
    "No, dado que se implementa un sistema de turnos entre las hebras que participan en la concurrencia."
  ],
  correcta: 2,
  justificacion: "Peterson garantiza **espera limitada** (bounded waiting): al entrar a `lock()` cada hebra pone `m->turn = 1-t`, o sea le **cede explícitamente el paso a la otra**. Por eso ninguna puede monopolizar la sección crítica — si H0 sale y quiere volver a entrar, vuelve a cederle el turno a H1. Toda hebra que invoca `lock()` tiene garantizado que eventualmente accederá: no hay inanición.",
  descarte: "⚠ La redacción de la alternativa es imprecisa: Peterson **no encola** a nadie ni bloquea hebras, hace busy-waiting girando en el `while`. Pero la idea de fondo — que el acceso está garantizado — es correcta, y es la que marca la pauta. Las dos alternativas que responden \"Sí\" ignoran el mecanismo de cesión de turno, que es justamente lo que hace correcto al algoritmo."
},

{
  id: "p2-37", pep: 2, num: 37, puntos: 1, tema: "Monitores",
  enunciado: "¿Es posible que una solución basada en monitores a un problema de EM produzca deadlock?",
  opciones: [
    "Sí, dado que por como están implementados los monitores, se asegura cumplir con el requerimiento de EM.",
    "Sí, es posible que al implementar el monitor, durante la ejecución se cumpla con las condiciones necesarias y suficientes para provocar deadlock.",
    "No, dado que por como están implementados los monitores, se asegura cumplir con el requerimiento de no provocar deadlock.",
    "No, dado que los monitores son un método para evitar el deadlock."
  ],
  correcta: 1,
  justificacion: "El monitor te regala la **exclusión mutua**, pero nada más. El deadlock sigue siendo perfectamente posible: basta con hacer `wait()` sobre una variable de condición que ninguna otra hebra va a señalizar, o con que dos hebras entren a monitores distintos y cada una espere una condición que solo la otra puede cumplir. La lógica de sincronización sigue siendo responsabilidad del programador.",
  descarte: "La primera alternativa da la conclusión correcta pero con un argumento equivocado: garantizar EM no tiene nada que ver con poder o no caer en deadlock. Y las dos que dicen \"No\" confunden monitores con algoritmos de prevención o evitación (como el banquero): un monitor es un **mecanismo de sincronización**, no una política antideadlock."
},

{
  id: "p2-38", pep: 2, num: 38, puntos: 2, tema: "Condición de carrera",
  contexto: "Suponga que dos hebras ejecutan la función increment_counter sin errores.",
  enunciado: "¿Qué se muestra por la salida estándar cada vez que ejecutamos el código?",
  codigo: `#define ITERATIONS 100000
long counter = 0;
bool is_safe = true;

void* increment_counter(void* arg){
  for (int i = 0; i < ITERATIONS/2; ++i){
    while(!is_safe);      // 10
    is_safe = false;      // 11
    counter++;            // 12
    is_safe = true;       // 13
  }
  return NULL;
}`,
  opciones: [
    "Siempre se muestra 100000.",
    "Se muestra el valor entre 1 y 50000.",
    "Se muestra un valor entre 2 y 100000.",
    "Se muestra un valor entre 50000 y 100000."
  ],
  correcta: 2,
  justificacion: "El candado casero está roto: entre el `while(!is_safe)` y el `is_safe = false` cabe un cambio de contexto, así que ambas hebras pueden entrar juntas. Además `counter++` no es atómico (leer-sumar-escribir), así que se pierden incrementos. Si por suerte nunca se pisan, el resultado es el **máximo** de 100000; en el peor entrelazado imaginable baja hasta **2**, que es el mínimo teórico con dos hebras.",
  descarte: "\"Siempre 100000\" supondría exclusión mutua real, que aquí no existe. El rango 1–50000 corresponde al trabajo de una sola hebra. Y 50000–100000 asume que al menos una hebra completa sus incrementos sin interferencia, lo que no está garantizado."
},

{
  id: "p2-39", pep: 2, num: 39, puntos: 1, tema: "Sección crítica",
  contexto: "Considere el siguiente código. Línea 10: while(!is_safe). Línea 11: is_safe = false. Línea 12: counter++. Línea 13: is_safe = true.",
  enunciado: "¿Cuántas secciones críticas se pueden identificar en el código?",
  codigo: `#define ITERATIONS 100000
long counter = 0;
bool is_safe = true;

void* increment_counter(void* arg){
  for (int i = 0; i < ITERATIONS/2; ++i){
    while(!is_safe);      // 10
    is_safe = false;      // 11
    counter++;            // 12
    is_safe = true;       // 13
  }
  return NULL;
}`,
  opciones: [
    "Una SC, la línea 12.",
    "Una SC, las líneas 10, 11 y 13.",
    "Dos SCs no exclusivas entre ellas, la línea 12 es una SC, y las líneas 10, 11 y 13 son otra SC.",
    "Dos SCs no exclusivas entre ellas, la línea 12 es una SC, y las líneas 6, 10, 11 y 13 son otra SC."
  ],
  correcta: 2,
  justificacion: "Hay **dos variables globales distintas** en juego, y cada una genera su propia sección crítica. `counter` se toca solo en la línea 12. `is_safe` se lee y escribe en las líneas 10, 11 y 13. Son **no exclusivas entre ellas** porque acceden a datos diferentes: proteger una no protege a la otra, y de hecho el bug del programa es justamente que la SC de `is_safe` está desprotegida.",
  diagrama: `SC #1  →  counter        (línea 12)
SC #2  →  is_safe        (líneas 10, 11, 13)

Son independientes: tocan variables distintas.
El error del código es que la SC #2 (el candado)
no es atómica, y por eso la SC #1 queda expuesta.`,
  descarte: "Contar una sola SC ignora que son dos variables compartidas separadas. Y la línea 6 es el `for` con la variable `i`, que es **local a cada hebra**: no es memoria compartida, así que no forma parte de ninguna sección crítica."
},

{
  id: "p2-40", pep: 2, num: 40, puntos: 1, tema: "Atomicidad",
  contexto: "Considere nuevamente el siguiente código.",
  enunciado: "¿Bajo qué condiciones se cumpliría el requerimiento de EM para la variable counter?",
  codigo: `#define ITERATIONS 100000
long counter = 0;
bool is_safe = true;

void* increment_counter(void* arg){
  for (int i = 0; i < ITERATIONS/2; ++i){
    while(!is_safe);      // 10
    is_safe = false;      // 11
    counter++;            // 12
    is_safe = true;       // 13
  }
  return NULL;
}`,
  opciones: [
    "Si la línea 11 fuera atómica.",
    "Si la línea 12 fuera atómica.",
    "Si la línea 13 fuera atómica.",
    "Si la línea 14 fuera atómica."
  ],
  correcta: 1,
  justificacion: "La línea 12 es `counter++`, que en assembler son tres instrucciones separadas (cargar, incrementar, guardar) y ahí es donde se pierden los incrementos. Si esa operación completa fuera **atómica**, ninguna hebra podría interrumpir a la otra en la mitad: cada incremento se aplicaría íntegro sobre el valor actualizado y el resultado sería siempre 100000.",
  descarte: "Las líneas 11 y 13 son asignaciones simples (`is_safe = false` / `= true`), que ya son prácticamente atómicas por sí solas — hacerlas \"más atómicas\" no arregla nada. El problema real del candado es que las líneas 10 y 11 deberían ser atómicas **en conjunto**, no por separado. Y la línea 14 es el cierre del `for`, que no toca memoria compartida."
},

{
  id: "p2-41", pep: 2, num: 41, puntos: 1, tema: "Soluciones por hardware",
  contexto: "Un sistema provee Load-Linked (LL) y Store-Conditional (SCond), instrucciones atómicas. Al invocar LL se \"reserva\" la dirección de memoria; si otra hebra invoca LL sobre la misma dirección, la reserva se invalida, lo que revisa SCond retornando cero.",
  enunciado: "Si flag es una variable global con valor inicial cero, es posible asegurar que:",
  codigo: `int LL(int *ptr) { return *ptr; }

int SCond(int *ptr, int value){
  if (ninguna otra hebra ha invocado LL sobre la misma direccion){
    *ptr = value;
    return 1;
  } else return 0;
}

enterSC(int *flag){ while( LL(&flag) || !SCond(&flag, 1) ); }
exitSC(int *flag) { *flag = 0; }`,
  opciones: [
    "Se provee EM y la solución está libre de deadlock.",
    "Se provee EM pero ocurre deadlock.",
    "No se provee EM y la solución está libre de deadlock.",
    "No se provee EM y ocurre deadlock."
  ],
  correcta: 0,
  justificacion: "El `while` tiene dos filtros encadenados por el cortocircuito del `||`. Primero `LL(&flag)`: si el candado ya está tomado (flag = 1) devuelve verdadero y la hebra gira sin siquiera intentar el store. Si está libre (flag = 0), pasa al segundo filtro: `SCond` solo escribe si **nadie más interfirió** desde el LL. Si dos hebras compiten, la reserva de una se invalida y su SCond devuelve 0, así que sigue girando. **Solo una entra**, y como `exitSC` siempre devuelve flag a 0, tampoco hay deadlock.",
  diagrama: `flag = 0

H1: LL → 0 (falso)  →  SCond → 1  →  !1 = 0  →  ENTRA ✓
H2: LL → 1 (verdad) →  cortocircuito, gira    ✓

Si ambas hacen LL a la vez:
  la reserva de una se invalida → su SCond = 0 → !0 = 1 → gira`,
  descarte: "No hay deadlock porque el candado siempre se libera en `exitSC`. Y la EM sí se cumple gracias a la atomicidad del par LL/SCond, que es justamente lo que le faltaba a la implementación ingenua con un `flag` común."
},

{
  id: "p2-42", pep: 2, num: 42, puntos: 1, tema: "Busy waiting / inanición",
  contexto: "Misma solución con LL y SCond.",
  enunciado: "De la solución anterior se puede afirmar lo siguiente:",
  codigo: `int LL(int *ptr) { return *ptr; }

int SCond(int *ptr, int value){
  if (ninguna otra hebra ha invocado LL sobre la misma direccion){
    *ptr = value;
    return 1;
  } else return 0;
}

enterSC(int *flag){ while( LL(&flag) || !SCond(&flag, 1) ); }
exitSC(int *flag) { *flag = 0; }`,
  opciones: [
    "La solución está basada en espera activa y no sufre de inanición.",
    "La solución está basada en espera activa y sufre de inanición.",
    "La solución no está basada en espera activa y No sufre de inanición.",
    "La solución no está basada en espera activa y sufre de inanición."
  ],
  correcta: 1,
  justificacion: "Es espera activa evidente: el `while` gira consumiendo CPU en vez de bloquear a la hebra. Y **sí puede haber inanición**, porque no existe ninguna cola ni orden de llegada: cada hebra reintenta el par LL/SCond y gana la que tenga suerte con el timing. Una hebra particularmente desafortunada puede perder la carrera indefinidamente mientras el resto entra y sale.",
  descarte: "Que no haya cola FIFO es la clave: soluciones como el **ticket lock** sí garantizan orden y por eso son libres de inanición, pero LL/SCond a secas no. Y descartar la espera activa es imposible: el `while` está ahí, a la vista."
},

{
  id: "p2-43", pep: 2, num: 43, puntos: 2, tema: "Semáforos (peluquería)",
  contexto: "Mismo problema de la peluquería: un peluquero, una silla de peluquería y N sillas de espera. Los clientes que no encuentran silla se van y vuelven después.",
  enunciado: "¿Cuál de las siguientes afirmaciones es correcta?",
  codigo: `semaphore peluqueroListo = 0;
semaphore salaDeEspera   = 1;
semaphore hayClientes    = 0;
int sillasLibres = N;

// peluquero: semWait(hayClientes) → protege sala → sillasLibres++
//            → semSignal(peluqueroListo) → corta el pelo

// cliente:   semWait(salaDeEspera)
//            si sillasLibres > 0 → sillasLibres--, semSignal(hayClientes),
//                                  semWait(peluqueroListo)
//            si no → se va sin esperar`,
  opciones: [
    "El peluquero nunca le cortará el pelo a un cliente dado que el semáforo hayClientes nunca es distinto de cero.",
    "Un cliente nunca será atendido por el peluquero dado que el semáforo peluqueroListo nunca es distinto de cero.",
    "Puede que ciertos clientes nunca sean atendidos por el peluquero.",
    "El semáforo salaDeEspera no es necesario, los demás semáforos proveen EM."
  ],
  correcta: 2,
  justificacion: "Por dos razones. Un cliente que llega y encuentra la sala llena **se va** sin esperar, y nada le garantiza que en el próximo intento haya cupo. Y `peluqueroListo` es un semáforo **anónimo**: al hacer `semSignal` el peluquero despierta a cualquiera de los que esperan, no al que lleva más tiempo. Un cliente con mala suerte puede quedar postergado para siempre.",
  descarte: "Ambos semáforos sí llegan a ser distintos de cero: el cliente incrementa `hayClientes` antes de esperar, y el peluquero incrementa `peluqueroListo` al estar disponible. Y `salaDeEspera` es indispensable: es el mutex que protege `sillasLibres`, sin él dos clientes podrían sentarse en la misma silla."
},

{
  id: "p2-44", pep: 2, num: 44, puntos: 2, tema: "Semáforos (peluquería)",
  contexto: "Considere el siguiente código de la peluquería.",
  enunciado: "¿Cuál de las siguientes afirmaciones es incorrecta?",
  codigo: `semaphore peluqueroListo = 0;
semaphore salaDeEspera   = 1;
semaphore hayClientes    = 0;
int sillasLibres = N;

// peluquero: semWait(hayClientes) → protege sala → sillasLibres++
//            → semSignal(peluqueroListo) → corta el pelo

// cliente:   semWait(salaDeEspera)
//            si sillasLibres > 0 → sillasLibres--, semSignal(hayClientes),
//                                  semWait(peluqueroListo)
//            si no → se va sin esperar`,
  opciones: [
    "Si dos clientes llegan al mismo tiempo, la solución registra que sólo un cliente decrementó el valor de sillasLibres (o sea, dos clientes se sentaron en la misma silla).",
    "Un mismo cliente puede ser atendido más de una vez.",
    "Clientes que no estén en la sala de espera no serán atendidos.",
    "La sección crítica corresponde al acceso a la variable compartida sillasLibres, mientras que el acto de cortar el pelo es coordinación entre hebras que se ejecutan en concurrencia."
  ],
  correcta: 0,
  justificacion: "Es incorrecta precisamente porque el código **sí protege bien** ese acceso: la lectura y el decremento de `sillasLibres` están encerrados por `semWait(&salaDeEspera)` y `semSignal(&salaDeEspera)`. Si dos clientes llegan a la vez, uno entra y el otro se bloquea en el mutex, así que los dos decrementos se registran. Nunca se pierde uno ni terminan dos en la misma silla.",
  descarte: "Las otras tres son verdaderas: la función `cliente` corre en un `while(1)`, así que el mismo cliente vuelve y puede ser atendido varias veces; solo se atiende a quien alcanzó a sentarse; y la distinción entre sección crítica (`sillasLibres`) y coordinación entre hebras (el corte de pelo, sincronizado con `hayClientes` y `peluqueroListo`) está correctamente planteada."
},

{
  id: "p2-45", pep: 2, num: 45, puntos: 1, tema: "Conceptos de concurrencia",
  enunciado: "¿Cuál de las siguientes afirmaciones es correcta?",
  opciones: [
    "Las soluciones al problema de exclusión mutua por hardware y semáforos garantizan que no habrá deadlock.",
    "Una sección crítica compuesta de una sola instrucción en C siempre se ejecuta de manera atómica.",
    "Los problemas de sincronización sólo ocurren en sistemas multiprocesadores y no en monoprocesadores.",
    "A diferencia de los semáforos, los monitores proporcionan un entorno donde la exclusión mutua está asegurada."
  ],
  correcta: 3,
  justificacion: "Ésa es la ventaja de diseño de los monitores: la exclusión mutua es **parte de la construcción del lenguaje**, no algo que el programador deba recordar. Con semáforos tienes que escribir manualmente el `wait` y el `signal`, y si se te olvida uno o los pones en el orden equivocado, la EM se cae. Con un monitor el compilador te la garantiza.",
  descarte: "Ni el hardware ni los semáforos previenen el deadlock — es tristemente fácil trabar un programa con dos semáforos tomados en distinto orden. Una instrucción de C como `counter++` **no es atómica**: son tres instrucciones de máquina. Y los problemas de sincronización aparecen igual en monoprocesador, gracias a los cambios de contexto."
},

{
  id: "p2-46", pep: 2, num: 46, puntos: 2, tema: "Monitores",
  contexto: "Implementación en pseudocódigo (C++ style) de un semáforo utilizando monitores. El constructor recibe dos parámetros. N hebras ejecutan worker, que hace sem_wait(), la SC y sem_signal().",
  enunciado: "¿Para qué valores de value y limit se provee EM a la SC en la función worker, sin producir deadlock?",
  codigo: `Monitor sem {
  int s, t;
  cond c;

  void sem(int value, int limit){ s = value; t = limit; }

  void sem_wait(){ while(s <= t) wait(&c);  s--; }

  void sem_signal(){ s++; signal(&c); }
}`,
  opciones: [
    "value = 0, limit = 0",
    "value = 1, limit = 0",
    "value = 0, limit = 1",
    "value = 1, limit = 1"
  ],
  correcta: 1,
  justificacion: "La condición de bloqueo es `s <= t`, así que para que la **primera** hebra pase se necesita `s > t`, o sea **value = 1 y limit = 0**. Esa hebra entra y deja s = 0; la siguiente encuentra `0 <= 0` y se bloquea en la variable de condición. Cuando la primera sale, `sem_signal` sube s a 1 y despierta a la otra, que reevalúa `1 <= 0` como falso y entra. Exactamente un mutex.",
  diagrama: `value=1, limit=0   →   s=1, t=0

H1: while(1 <= 0)? NO  →  pasa, s-- → s=0   ENTRA ✓
H2: while(0 <= 0)? SÍ  →  wait(&c)          BLOQUEADA ✓

H1 sale: s++ → s=1, signal(&c)
H2 despierta: while(1 <= 0)? NO → pasa, s=0  ENTRA ✓`,
  descarte: "Las otras tres combinaciones cumplen `s <= t` desde el arranque (0≤0, 0≤1, 1≤1), así que **la primerísima hebra ya se bloquea**. Y como nadie llegó nunca a la SC, nadie ejecutará `sem_signal` para despertarla: deadlock inmediato."
},

{
  id: "p2-47", pep: 2, num: 47, puntos: 1, tema: "Monitores",
  contexto: "Mismo monitor (bloquea mientras s <= t).",
  enunciado: "¿Cuál de las siguientes afirmaciones es correcta para los valores de value = 3 y limit = 2?",
  codigo: `Monitor sem {
  int s, t;
  cond c;

  void sem(int value, int limit){ s = value; t = limit; }

  void sem_wait(){ while(s <= t) wait(&c);  s--; }

  void sem_signal(){ s++; signal(&c); }
}`,
  opciones: [
    "Ocurre deadlock y no se permite progreso.",
    "Ocurre deadlock y se permite progreso.",
    "No ocurre deadlock y no se permite progreso.",
    "No ocurre deadlock y se permite progreso."
  ],
  correcta: 3,
  justificacion: "Con s = 3 y t = 2 la condición de bloqueo `3 <= 2` es falsa, así que la primera hebra entra sin problema y deja s = 2. La segunda encuentra `2 <= 2` y se bloquea. Al salir la primera, s vuelve a 3 y el `signal` despierta a la que esperaba, que ahora sí pasa. **El sistema avanza**: hay progreso y no hay deadlock. De hecho se comporta igual que value=1, limit=0, solo que con los números corridos en 2.",
  descarte: "Lo que importa no son los valores absolutos sino la **diferencia** entre value y limit: mientras `value − limit = 1`, el monitor funciona como mutex. Si fueran iguales o value menor, ahí sí habría deadlock desde el arranque."
},

{
  id: "p2-48", pep: 2, num: 48, puntos: 1, tema: "Hebras / sincronización",
  contexto: "Revise el siguiente código, que implementa un \"join\" casero mediante una variable compartida.",
  enunciado: "Al compilar y correr el código, la única o todas las posibles salidas serán:",
  codigo: `int done = 0;

void thr_exit() { done = 1; }

void *child(void *arg) {
  thr_exit();          // avisa PRIMERO
  printf("$");         // imprime DESPUÉS
  return NULL;
}

void thr_join() { while (done == 0); }

int main(int argc, char *argv[]) {
  printf("@");
  pthread_t p;
  pthread_create(&p, NULL, child, NULL);
  thr_join();
  printf("&");
  return 0;
}`,
  opciones: [
    "@$&",
    "@&$",
    "@$& ó @&$",
    "@$& ó @&$ ó @&"
  ],
  correcta: 3,
  justificacion: "El bug está en el **orden dentro de child**: avisa con `thr_exit()` *antes* de imprimir el `$`. Entonces main puede salir del `while` e imprimir el `&` mientras la hija todavía no llega a su `printf`. Eso da tres escenarios: la hija alcanza a imprimir antes (`@$&`), main se le adelanta (`@&$`), o —el caso más traicionero— **main hace `return 0` y el proceso completo termina antes de que la hija imprima**, así que el `$` se pierde: queda `@&`.",
  diagrama: `@   main siempre imprime primero

Caso 1:  child: done=1, printf("$")  →  main: printf("&")   = @$&
Caso 2:  child: done=1  →  main: printf("&")  →  child: "$"  = @&$
Caso 3:  child: done=1  →  main: "&" y return 0
         → el proceso muere, el "$" nunca sale             = @&`,
  descarte: "Las alternativas que ofrecen una o dos salidas olvidan alguno de los casos. La clave que casi todos pasan por alto es la tercera: cuando main retorna, **se termina el proceso entero** y las hebras pendientes mueren con él (a diferencia de lo que pasaría con `pthread_exit`, que sí espera)."
},

{
  id: "p2-49", pep: 2, num: 49, puntos: 1, tema: "Condición de carrera",
  contexto: "La notación 1e7 corresponde a notación científica: 1e4 es 1 × 10⁴. Dos hebras incrementan la misma variable global sin protección.",
  enunciado: "Al ejecutar el código, ¿cuál de las siguientes alternativas NO corresponde a un posible output?",
  codigo: `int c = 0;

void *f1(void *arg){ for (int i = 0; i < 1e7; ++i) c++; }
void *f2(void *arg){ for (int i = 0; i < 1e4; ++i) c++; }

int main(int argc, char *argv[]) {
  pthread_t t1, t2;
  pthread_create(&t1, NULL, f1, NULL);
  pthread_create(&t2, NULL, f2, NULL);
  pthread_join(t1, NULL);
  pthread_join(t2, NULL);
  printf("%d\\n", c);
  pthread_exit(0);
  return 0;
}`,
  opciones: [
    "9999",
    "9999999",
    "10000000",
    "10.100.000"
  ],
  correcta: 3,
  justificacion: "El **máximo absoluto** es la suma de todos los incrementos: 10.000.000 + 10.000 = **10.010.000**. Las condiciones de carrera solo pueden hacer que se **pierdan** incrementos, jamás que se ganen. Como 10.100.000 supera ese techo, es un resultado imposible de obtener.",
  diagrama: `Máximo posible  =  1e7 + 1e4  =  10.010.000
Mínimo posible  =  10.000     (por los incrementos perdidos)

10.100.000  >  10.010.000   ⇒  IMPOSIBLE`,
  descarte: "Las otras tres están dentro del rango alcanzable: 10.000.000 sale si f2 pierde casi todos sus incrementos, 9.999.999 si además se pierde uno de f1, y 9.999 si el entrelazado es especialmente desastroso."
},

{
  id: "p2-50", pep: 2, num: 50, puntos: 2, tema: "Condición de carrera",
  contexto: "Considere el siguiente código: f1 hace 1e7 incrementos y f2 hace 1e4, sobre la misma variable global sin protección.",
  enunciado: "¿Cuál es el valor mínimo posible para el output que se muestre en la salida estándar?",
  codigo: `int c = 0;

void *f1(void *arg){ for (int i = 0; i < 1e7; ++i) c++; }
void *f2(void *arg){ for (int i = 0; i < 1e4; ++i) c++; }

int main(int argc, char *argv[]) {
  pthread_t t1, t2;
  pthread_create(&t1, NULL, f1, NULL);
  pthread_create(&t2, NULL, f2, NULL);
  pthread_join(t1, NULL);
  pthread_join(t2, NULL);
  printf("%d\\n", c);
  pthread_exit(0);
  return 0;
}`,
  opciones: [
    "0",
    "1",
    "2",
    "10000"
  ],
  correcta: 2,
  justificacion: "Es el resultado clásico de dos hebras incrementando sin protección: el **mínimo teórico es 2**. La idea es que cada hebra puede quedar \"congelada\" con un valor viejo leído en un registro y escribirlo mucho después, pisando todo el trabajo acumulado de la otra. En el peor entrelazado imaginable, cada hebra alcanza a dejar su marca apenas una vez, y el contador termina en 2 en lugar de los 10.010.000 esperados.",
  diagrama: `Idea del peor caso (dos hebras, sin protección):

  H1: lee c = 0            (se lo guarda en un registro)
  H2: corre y sube c hasta el final
  H1: escribe 0 + 1 = 1    ← pisó TODO el trabajo de H2
  H2: lee 1, escribe 2

  Los incrementos perdidos no se recuperan nunca.`,
  descarte: "⚠ **Nota honesta**: yo hice la traza fina con estos números concretos (1e7 y 1e4) y me da que el mínimo real es **10.000**, porque la hebra que pisa al final todavía tiene iteraciones pendientes que la vuelven a subir. Pero la pauta marca **2**, que es el resultado canónico que se enseña en clases para dos hebras. Para la prueba: **2**. Si te lo preguntan en el Test de Salida, el argumento que esperan es el del entrelazado que pisa el trabajo acumulado."
},

{
  id: "p2-51", pep: 2, num: 51, puntos: 1, tema: "Sección crítica",
  contexto: "Considere el siguiente código. La línea 3 es el for de f1, la línea 4 el de f2, y la línea 12 el printf(c) de main.",
  enunciado: "¿Cuántas SC se pueden identificar en el código?",
  codigo: `int c = 0;

void *f1(void *arg){ for (int i = 0; i < 1e7; ++i) c++; }
void *f2(void *arg){ for (int i = 0; i < 1e4; ++i) c++; }

int main(int argc, char *argv[]) {
  pthread_t t1, t2;
  pthread_create(&t1, NULL, f1, NULL);
  pthread_create(&t2, NULL, f2, NULL);
  pthread_join(t1, NULL);
  pthread_join(t2, NULL);
  printf("%d\\n", c);
  pthread_exit(0);
  return 0;
}`,
  opciones: [
    "1 SC, acceso a la variable c en las líneas 3 y 4",
    "2 SC, acceso al cuerpo completo de las funciones f1 y f2",
    "3 SC, acceso a la variable c en f1 y f2, así como en el main en la línea 12",
    "4 SC, acceso a la variable c en f1 y f2, el main en la línea 12 y la línea 2"
  ],
  correcta: 0,
  justificacion: "Hay **una sola** variable compartida (`c`) y **un solo** punto de conflicto: el `c++` que ejecutan concurrentemente f1 y f2. Aunque el código aparezca en dos líneas distintas, ambas compiten por el mismo dato, así que constituyen **la misma sección crítica** — hay que protegerlas con el mismo candado.",
  descarte: "El `printf` de la línea 12 ocurre **después de los dos `pthread_join`**, cuando ya no queda ninguna hebra corriendo: sin concurrencia no hay SC. La línea 2 es la declaración `int c = 0`, que se ejecuta antes de crear cualquier hebra. Y el \"cuerpo completo\" de las funciones incluye la variable `i` del for, que es **local** a cada hebra."
},

{
  id: "p2-52", pep: 2, num: 52, puntos: 2, tema: "Soluciones por hardware",
  contexto: "Se utiliza la instrucción atómica compare_and_swap para coordinar la ejecución de dos hebras.",
  enunciado: "¿Para qué valores de X, Y y Z el código siempre mostrará la salida \"main: inicio / func: hola! / main: fin\"?",
  codigo: `int compare_and_swap(int *ptr, int expected, int new) {
  int actual = *ptr;
  if (actual == expected) *ptr = new;
  return actual;
}

int s = X;

void * func(void *arg) {
  printf("func: hola!\\n");
  s = Y;
}

int main(int argc, char *argv[]) {
  printf("main: inicio\\n");
  pthread_t c;
  pthread_create(&c, NULL, func, NULL);
  while(compare_and_swap(&s, Z, X));   // main espera aquí
  printf("main: fin\\n");
  return 0;
}`,
  opciones: [
    "X = 0, Y = 0, Z = 1",
    "X = 1, Y = 0, Z = 0",
    "X = 0, Y = 1, Z = 1",
    "X = 1, Y = 1, Z = 0"
  ],
  correcta: 1,
  justificacion: "Main tiene que **quedarse girando** hasta que la hebra hija imprima y ejecute `s = Y`. El `while` sigue mientras el CAS devuelva un valor distinto de cero, y el CAS devuelve el valor que tenía `s`. Entonces: mientras `s = X` debe girar → **X ≠ 0**, o sea X = 1. Y cuando la hija escribe Y, el CAS debe devolver 0 → **Y = 0**. Con Z = 0 el swap ocurre justo en ese momento y main sale del ciclo.",
  diagrama: `X=1, Y=0, Z=0     s parte en 1

main:  CAS(&s, 0, 1) → actual=1, no coincide con Z=0
                     → retorna 1 → while(1) gira ✓

func:  printf("func: hola!")
       s = 0

main:  CAS(&s, 0, 1) → actual=0, coincide → s=1
                     → retorna 0 → while(0) sale ✓
       printf("main: fin")`,
  descarte: "Con X = 0 el CAS devuelve 0 en la primera vuelta y main **no espera nada**: el \"main: fin\" puede salir antes del \"func: hola!\". Y con X = Y = 1 la hebra hija escribe el mismo valor que ya había, así que el CAS nunca devuelve 0 y main gira para siempre: deadlock."
},

{
  id: "p2-53", pep: 2, num: 53, puntos: 1, tema: "Hebras (pthreads)",
  contexto: "Estudie el siguiente código de una función que ejecuta una hebra.",
  enunciado: "De la ejecución del código se puede afirmar lo siguiente:",
  codigo: `typedef struct _myarg_t { int a, b; } myarg_t;
typedef struct _myret_t { int x, y; } myret_t;

void *mythread(void *arg) {
  myarg_t *m = (myarg_t *) arg;
  printf("%d %d\\n", m->a, m->b);
  myret_t r;              // ← variable LOCAL, vive en el stack de la hebra
  r.x = 1; r.y = 2;
  return (void *) &r;     // ← devuelve su dirección  ¡PELIGRO!
}

int main(int argc, char const *argv[]) {
  pthread_t t;
  myarg_t myarg; myarg.a = 1; myarg.b = 2;
  myret_t *myret;
  pthread_create(&t, NULL, mythread, &myarg);
  pthread_join(t, (void **)&myret);
  printf("%d\\n", myret->x);
  printf("%d\\n", myret->y);
  return 0;
}`,
  opciones: [
    "Ocurrirá error en tiempo de compilación, dado que se utiliza el operador & para retornar la dirección de memoria de la variable r",
    "Ocurrirá error en tiempo de compilación, dado que se accede a las variables de la estructura r con el operador punto . y no con el operador ->",
    "Ocurrirá error en tiempo de ejecución, cuando se intente acceder a las variables de la estructura r",
    "El código se ejecutará correctamente"
  ],
  correcta: 2,
  justificacion: "La estructura `r` es una variable **local**: vive en el stack de la hebra. Cuando la hebra termina, ese stack se libera y la dirección que devolvió queda apuntando a memoria que ya no es válida — es un **puntero colgante** (dangling pointer). El código compila sin problemas (sintácticamente es correcto), pero cuando main hace `myret->x` accede a memoria liberada: error en tiempo de ejecución o basura impredecible.",
  diagrama: `Durante la hebra:        Después del join:

  stack de la hebra          (stack liberado)
  ┌──────────────┐           ┌ ─ ─ ─ ─ ─ ─ ┐
  │  r.x = 1     │ ←─┐         ?  basura  ?  ←─┐
  │  r.y = 2     │   │       └ ─ ─ ─ ─ ─ ─ ┘   │
  └──────────────┘   │                          │
                   myret                      myret  ← puntero colgante

Solución correcta: reservar r con malloc()
(el heap sobrevive al término de la hebra).`,
  descarte: "Sintácticamente no hay nada malo: `&r` sobre una variable local es legal, y `r.x` con punto es correcto porque `r` es una estructura, no un puntero (para `m->a` sí corresponde la flecha, porque `m` sí es puntero). El compilador a lo más lanzará un *warning*, no un error."
},

{
  id: "p2-54", pep: 2, num: 54, puntos: 1, tema: "Busy waiting / inanición",
  enunciado: "¿Cuál de las siguientes afirmaciones es verdadera en relación a un proceso multihebra que utiliza spinlocks o busy-waiting para implementar exclusión mutua?",
  opciones: [
    "No produce deadlock en multiprocesadores de memoria compartida",
    "No produce deadlock en monoprocesadores",
    "Puede producir inanición en sistemas multiprocesadores",
    "No produce inanición en sistemas monoprocesadores"
  ],
  correcta: 2,
  justificacion: "Los spinlocks no mantienen ninguna cola de espera: quien entra es simplemente quien gana la carrera por la instrucción atómica. En un multiprocesador varias hebras giran a la vez en distintos núcleos, y nada garantiza que una hebra concreta gane alguna vez — puede perder indefinidamente mientras las demás entran y salen. Eso es **inanición**.",
  descarte: "Los spinlocks **sí** pueden producir deadlock en ambas arquitecturas (basta con tomar dos candados en distinto orden), así que las dos primeras son falsas. Y en monoprocesador la inanición también es posible: depende de a quién favorezca el planificador al momento de repartir quantum."
},

{
  id: "p2-55", pep: 2, num: 55, puntos: 1, tema: "Variables de condición",
  enunciado: "El estándar Pthreads no implementa monitores, sino mutex y variables de condición. La hebra que es desbloqueada por un signal debe chequear nuevamente la condición de la aplicación que hizo que se bloqueara debido a que:",
  opciones: [
    "La variable de condición donde estaba bloqueada la hebra pudo tener un valor falso",
    "La hebra que emitió el signal podría continuar dentro de la sección crítica y cambiar la condición de la aplicación",
    "El signal emitido desbloquea el mutex asociado y otra hebra podría ingresar a la sección crítica",
    "La hebra que recibe el signal puede no estar al principio de la cola de la variable de condición"
  ],
  correcta: 1,
  justificacion: "Pthreads usa **semántica Mesa**: el `signal` no transfiere el control de inmediato, solo mueve a la hebra de la cola de la condición a la cola del mutex. La que señalizó **sigue corriendo dentro de la sección crítica** y puede modificar el estado antes de soltar el candado. Por eso la condición que era verdadera al momento del signal puede ser falsa cuando la hebra despertada finalmente entra — y de ahí la regla de oro: **siempre `while`, nunca `if`**.",
  diagrama: `pthread_mutex_lock(&m);
while (condicion_no_se_cumple)      ← WHILE, no IF
    pthread_cond_wait(&c, &m);
// ...usar el recurso...
pthread_mutex_unlock(&m);

Con semántica Mesa, entre el signal y el despertar
efectivo puede pasar cualquier cosa.`,
  descarte: "Las variables de condición **no tienen valor**: son colas de espera, no booleanos, así que la primera alternativa parte de una premisa falsa. El `signal` no libera el mutex — eso lo hace el `unlock`. Y la posición en la cola no es el problema: aunque fueras la primera, la condición igual pudo cambiar."
},

{
  id: "p2-56", pep: 2, num: 56, puntos: 1, tema: "Exclusión mutua",
  contexto: "El siguiente código implementa un semáforo binario que se utiliza para proteger una sección crítica. Las dos operaciones de lock() no son atómicas: puede ocurrir cambio de contexto entre ellas.",
  enunciado: "Del código anterior se puede afirmar lo siguiente:",
  codigo: `typedef struct __lock_t { int flag; } lock_t;

void init(lock_t *mutex) { mutex->flag = 0; }

void lock(lock_t *mutex) {
  while (mutex->flag == 1);   // gira esperando
  mutex->flag = 1;            // toma el candado
}
// (las dos operaciones NO son atómicas)

void unlock(lock_t *mutex) { mutex->flag = 0; }`,
  opciones: [
    "Se provee EM, implementa busy-waiting",
    "No se provee EM, no implementa busy-waiting",
    "Se provee EM, no implementa busy-waiting",
    "No se provee EM, implementa busy-waiting"
  ],
  correcta: 3,
  justificacion: "Son dos afirmaciones y ambas hay que verificarlas. **Busy-waiting: sí**, el `while` gira consumiendo CPU sin bloquear a la hebra. **EM: no**, porque comprobar el flag y escribirlo son dos operaciones separadas: si el cambio de contexto cae justo entre ellas, dos hebras salen del `while` creyendo que el candado está libre y ambas entran a la sección crítica.",
  descarte: "Las alternativas que afirman que sí hay EM ignoran el problema de atomicidad (que el propio enunciado te subraya). Y decir que no hay busy-waiting es contradecir el `while` que está a la vista: para no tener espera activa la hebra tendría que bloquearse y ceder el procesador, cosa que este código no hace en ningún momento."
},

{
  id: "p2-57", pep: 2, num: 57, puntos: 2, tema: "Soluciones por hardware",
  contexto: "Se cuenta con la función atómica compare_and_swap sobre punteros genéricos. Dos o más hebras usan insert() para agregar un nodo a una lista, donde head es una variable compartida.",
  enunciado: "Evalúe la implementación anterior. Es posible indicar que:",
  codigo: `int compare_and_swap(void **address, void *expected, void *new_ptr) {
  if (*address == expected) {
    *address = new_ptr;
    return 1;
  }
  return 0;
}

void insert(int value) {
  node_t *n = malloc(sizeof(node_t));
  n->value = value;
  do {
    n->next = head;                          // apunta al head actual
  } while (!compare_and_swap(&head, n->next, n));  // reintenta si cambió
}`,
  opciones: [
    "La implementación propuesta produce deadlock",
    "No se cumple el requerimiento de progreso",
    "La solución no provee EM",
    "La solución cumple con los cuatro requerimientos para una solución correcta de EM"
  ],
  correcta: 2,
  justificacion: "Ojo con qué se está preguntando: el `compare_and_swap` hace **atómica la actualización de `head`**, pero eso no es lo mismo que proveer exclusión mutua. No hay `enterSC()` ni `exitSC()`, no hay candado, y el resto de la función (el `malloc`, el `n->value`, el `n->next = head`) corre completamente desprotegido. Es una técnica **lock-free**, que resuelve el problema por reintento en vez de por exclusión: por eso, en los términos del curso, **no provee EM**.",
  diagrama: `void insert(int value) {
  node_t *n = malloc(...);   ┐
  n->value = value;          │ sin protección alguna
  do { n->next = head; }     ┘
  while (!CAS(&head, n->next, n));   ← solo ESTO es atómico
}

Atomicidad de una operación  ≠  exclusión mutua.`,
  descarte: "⚠ Vale aclarar que la implementación **sí es correcta**: no pierde nodos, porque si otra hebra se adelanta el CAS falla y el `do-while` reintenta releyendo el `head` actualizado. Tampoco hay deadlock (no hay candados que queden tomados) ni falta de progreso (siempre alguna hebra gana). Lo que no cumple es la **definición formal de EM**, y eso descarta la alternativa que dice que cumple los cuatro requerimientos."
},

{
  id: "p2-58", pep: 2, num: 58, puntos: 1, tema: "Deadlock",
  enunciado: "Cuando un sistema cae en deadlock (se cumplen 4 condiciones), es posible afirmar que:",
  opciones: [
    "Los recursos compartidos involucrados son de tipo consumible, y no de tipo reutilizables",
    "Existe una sola instancia de cada recurso involucrado",
    "Se cumplieron las condiciones de exclusión mutua, hold and wait, no desapropiación y espera circular",
    "Se implementó el algoritmo del banquero"
  ],
  correcta: 2,
  justificacion: "Son las **cuatro condiciones de Coffman** y tienen que darse todas simultáneamente: exclusión mutua (el recurso no se comparte), hold and wait (retienes algo mientras pides más), no desapropiación (nadie te lo puede quitar) y espera circular (el ciclo que cierra la trampa). Si alguna falta, no hay deadlock.",
  diagrama: `1. Exclusión mutua     — el recurso es de uso exclusivo
2. Hold and wait       — retengo uno y pido otro
3. No desapropiación   — no me lo pueden quitar
4. Espera circular     — P1→P2→P3→P1

Romper CUALQUIERA de las cuatro previene el deadlock.`,
  descarte: "El deadlock ocurre tanto con recursos reutilizables como consumibles. Puede haber varias instancias de un recurso y trabarse igual, si todas están asignadas. Y si el banquero **hubiera** estado implementado, justamente no habría deadlock: esa alternativa dice lo contrario de lo que corresponde."
},

{
  id: "p2-59", pep: 2, num: 59, puntos: 1, tema: "Monitores",
  enunciado: "¿Es posible que una solución basada en monitores a un problema de EM produzca deadlock?",
  opciones: [
    "Sí, dado que por como están implementados los monitores, se asegura cumplir con el primer requerimiento de EM",
    "Sí, es posible que al implementar el monitor, durante la ejecución se cumpla con las condiciones necesarias y suficientes para provocar deadlock",
    "No, dado que por como están implementados los monitores, se asegura cumplir con el requerimiento de no provocar deadlock",
    "No, dado que los monitores son un método para evitar el deadlock"
  ],
  correcta: 1,
  justificacion: "El monitor garantiza exclusión mutua por construcción, pero **nada más**. Si programas un `wait()` sobre una condición que ninguna otra hebra va a señalizar, o si dos hebras entran a monitores distintos y cada una espera algo que solo la otra puede entregar, se cumplen las cuatro condiciones de Coffman y tienes deadlock. La lógica de sincronización sigue dependiendo de ti.",
  descarte: "La primera llega a la conclusión correcta con un argumento equivocado: garantizar EM no dice nada sobre el deadlock. Y las dos que responden \"No\" confunden un **mecanismo de sincronización** (el monitor) con una **política de prevención o evitación** de deadlock (como el algoritmo del banquero)."
},

{
  id: "p2-60", pep: 2, num: 60, puntos: 2, tema: "Deadlock",
  contexto: "Múltiples hebras invocan concurrentemente acquire_locks(semlist[], size), intentando obtener un conjunto arbitrario de semáforos con el arreglo en cualquier orden. Los semáforos son únicos y no hay punteros duplicados.",
  enunciado: "¿Cuál sería una implementación que resuelva el problema y esté libre de deadlock?",
  opciones: [
    "Se recorre semlist[] adquiriendo los semáforos en el orden de la lista",
    "Se ordena semlist[] por dirección de memoria, adquiriendo los semáforos en ese orden",
    "Se recorre semlist[] adquiriendo sólo los semáforos que estén disponibles",
    "No es posible implementar la función correctamente y libre de deadlock"
  ],
  correcta: 1,
  justificacion: "Ordenar por dirección de memoria impone un **orden total de adquisición** que todas las hebras respetan por igual. Como las direcciones son únicas y comparables, dos hebras que quieran los mismos semáforos los pedirán siempre en la misma secuencia: una gana el primero y la otra espera ahí, sin retener nada que la primera necesite. Se rompe la **espera circular** y el deadlock se vuelve imposible.",
  descarte: "Tomarlos en el orden de la lista es precisamente lo que genera el problema, porque cada hebra trae su arreglo desordenado. Adquirir \"sólo los disponibles\" incumple el contrato de la función, que debe retornar con **todos** adquiridos, y puede derivar en livelock. Y sí existe solución, así que la última es falsa."
},

{
  id: "p2-61", pep: 2, num: 61, puntos: 2, tema: "Hebras (pthreads)",
  contexto: "Revise el siguiente código. Fíjese bien en qué se le pasa como argumento a cada hebra.",
  enunciado: "¿Cuál de las siguientes alternativas corresponde a la descripción de todas las posibles salidas del código anterior?",
  codigo: `#define N 5

void* print(void* arg) {
  int num = *(int*)arg;      // lee el valor APUNTADO, cuando alcanza a correr
  printf("%d", num);
}

int main() {
  pthread_t t[N];
  for (int i = 0; i < 5; i++)
    pthread_create(&t[i], NULL, print, &i);   // ← &i : ¡la MISMA dirección!
  for (int i = 0; i < 5; i++)
    pthread_join(t[i], NULL);
}`,
  opciones: [
    "Una secuencia, sin repetición, donde cada dígito pertenece al conjunto [0,1,2,3,4]",
    "Una secuencia, con repetición, donde cada dígito pertenece al conjunto [0,1,2,3,4,5]",
    "Una secuencia, sin repetición, donde cada dígito pertenece al conjunto [0,1,2,3,4,5]",
    "Una secuencia, con repetición, donde cada dígito pertenece al conjunto [0,1,2,3,4]"
  ],
  correcta: 1,
  justificacion: "El bug es que se pasa `&i`, o sea **la misma dirección de memoria a las cinco hebras**, y esa variable sigue cambiando mientras el ciclo avanza. Cada hebra lee el valor que haya en `i` cuando alcance a ejecutarse, no el que había cuando fue creada. De ahí salen dos consecuencias: puede haber **repetición** (dos hebras leen el mismo valor) y el **5 es alcanzable**, porque el `for` termina evaluando `i < 5` con i valiendo 5, y una hebra lenta puede leer justo ese valor.",
  diagrama: `main:    i=0 → crea t0
         i=1 → crea t1
         i=2 → crea t2   (ninguna alcanzó a correr todavía)
         i=3 → crea t3
         i=4 → crea t4
         i=5 → sale del for   ← i queda valiendo 5

hebras:  todas leen *(&i) = 5   →  salida "55555"

Otro entrelazado podría dar "01234", "00234", "12355"...
La solución correcta sería pasar una copia por hebra
(por ejemplo, &arreglo[i] o un malloc por hebra).`,
  descarte: "Las alternativas \"sin repetición\" asumen que cada hebra recibe su propio valor, lo que solo sería cierto si se pasara una copia independiente. Y limitar el conjunto a [0..4] olvida que la variable llega a 5 antes de salir del ciclo."
}

];
