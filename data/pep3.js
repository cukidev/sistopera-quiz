/* PEP 3 — Memoria, memoria virtual, paginación, I/O y RAID */
window.PEP3 = [

{
  id: "p3-1", pep: 3, num: 1, puntos: 2, tema: "Direcciones de memoria",
  contexto: "El sistema implementa paginación con páginas de 4 KB y tabla de páginas multinivel. Cada entrada de tabla es de 8 bytes y cada tabla cabe exactamente en una página. El tipo int es de 4 bytes y la dirección de la variable A es 0x7ffdb9ab8f80.",
  enunciado: "¿Qué es lo que se muestra por pantalla?",
  codigo: `int main(int argc, char const *argv[]) {
  int i, A[1024];
  for (i = 0; i < 1024; i++)
    A[i] = i*4;
  printf("%p\\n", &A[i]);   // ¡ojo! aquí i vale 1024
  return 0;
}`,
  opciones: [
    "0x7ffdb9ab9f78",
    "0x7ffdb9ab9f7d",
    "0x7ffdb9ab9f80",
    "0x7ffdb9ab9f84"
  ],
  correcta: 2,
  justificacion: "La trampa está en que el `printf` va **después** del for, así que `i` vale 1024 (la condición se evaluó como falsa justo con ese valor). Entonces se imprime la dirección de `A[1024]`, que está una posición más allá del final del arreglo: base + 1024 × 4 bytes = base + 4096 = base + **0x1000** en hexadecimal.",
  diagrama: `&A[1024] = 0x7ffdb9ab8f80 + (1024 × 4)
         = 0x7ffdb9ab8f80 + 4096
         = 0x7ffdb9ab8f80 + 0x1000
         = 0x7ffdb9ab9f80
                     ↑
        el dígito que cambia: 8 → 9`,
  descarte: "Las otras opciones alteran los últimos dígitos (f78, f7d, f84), pero sumar 0x1000 a una dirección **no toca los últimos tres dígitos hex**: solo incrementa el cuarto dígito desde la derecha. Fíjate que el `f80` final se mantiene idéntico."
},

{
  id: "p3-2", pep: 3, num: 2, puntos: 1, tema: "Direcciones de memoria",
  contexto: "Considere el siguiente código: el arreglo A tiene 1024 posiciones y se imprime &A[1024].",
  enunciado: "¿Qué valor está almacenado en la dirección de memoria que se muestra por pantalla?",
  codigo: `int main(int argc, char const *argv[]) {
  int i, A[1024];
  for (i = 0; i < 1024; i++)
    A[i] = i*4;
  printf("%p\\n", &A[i]);   // ¡ojo! aquí i vale 1024
  return 0;
}`,
  opciones: [
    "4088",
    "4092",
    "4096",
    "No es posible indicarlo a partir del código mostrado."
  ],
  correcta: 3,
  justificacion: "El arreglo tiene índices válidos de **0 a 1023**. La posición `A[1024]` está **fuera del arreglo**: es memoria que el programa nunca inicializó y que no le pertenece al arreglo. Ahí puede haber cualquier cosa (la variable `i`, basura del stack, lo que sea), así que es imposible determinar su contenido leyendo el código.",
  descarte: "4092 sería el valor de `A[1023]` (el último válido: 1023 × 4). 4096 sería lo que valdría `A[1024]` **si el arreglo llegara hasta ahí**, que es justamente la trampa: extrapolar el patrón `i*4` a una posición que el ciclo nunca escribió."
},

{
  id: "p3-3", pep: 3, num: 3, puntos: 1, tema: "Paginación",
  contexto: "Considere el siguiente código. Páginas de 4 KB, arreglo de 1024 enteros de 4 bytes.",
  enunciado: "Suponga que la primera página que contiene el arreglo comienza en 0x7ffdb9ab8f80. ¿Cuántas páginas contienen el arreglo?",
  codigo: `int main(int argc, char const *argv[]) {
  int i, A[1024];
  for (i = 0; i < 1024; i++)
    A[i] = i*4;
  printf("%p\\n", &A[i]);   // ¡ojo! aquí i vale 1024
  return 0;
}`,
  opciones: [
    "1 página",
    "2 páginas",
    "4 páginas",
    "6 páginas"
  ],
  correcta: 1,
  justificacion: "La clave está en que **la dirección no está alineada** al inicio de una página. El arreglo empieza en 0x7ffdb9ab8f80, cuyo offset dentro de la página es 0xf80 = **3968**, así que en esa primera página solo quedan 4096 − 3968 = **128 bytes** libres. Como el arreglo pesa 4096 bytes, los 3968 restantes se derraman a la página siguiente: **2 páginas**.",
  diagrama: `Arreglo = 1024 × 4 B = 4096 B
Offset de inicio = 0xf80 = 3968

página N:    [ ...ocupado... | 128 B del arreglo ]
                              ↑ 0x...f80
página N+1:  [ 3968 B del arreglo | ...libre... ]

              →  el arreglo toca 2 PÁGINAS`,
  descarte: "Sería 1 página **solo si el arreglo estuviera alineado** al comienzo de una (dirección terminada en 000): ahí sus 4096 bytes calzarían exactos. Ése es el error fácil: ver que 4096 B = 1 página y concluir de inmediato, sin mirar **dónde empieza**. Regla: mira siempre los tres últimos dígitos hex de la dirección base."
},

{
  id: "p3-4", pep: 3, num: 4, puntos: 1, tema: "Espacio de direcciones",
  contexto: "Direcciones como 0x7ffdb9ab8f80 (12 dígitos hexadecimales), páginas de 4 KB.",
  enunciado: "Teniendo en consideración las direcciones de memoria que emite el programa anterior, ¿cuál de las siguientes aseveraciones es verdadera?",
  opciones: [
    "La imagen del proceso es de 128 TB",
    "La memoria total del sistema es de 4 GB",
    "El total de páginas por proceso es de 2³⁶",
    "El total de marcos en memoria es de 2²²"
  ],
  correcta: 2,
  justificacion: "Primero cuenta los dígitos hexadecimales: son **12**, y cada dígito hex vale 4 bits, así que las direcciones son de **48 bits**. El espacio de direcciones es entonces 2⁴⁸ bytes. Como las páginas son de 4 KB = 2¹² bytes, la cantidad de páginas es 2⁴⁸ ÷ 2¹² = **2³⁶**.",
  diagrama: `0x7ffdb9ab8f80  →  12 dígitos hex × 4 bits = 48 bits

Imagen del proceso = 2⁴⁸ B = 256 TB
Offset             = log₂(4 KB) = 12 bits
N° de páginas      = 2⁴⁸ / 2¹² = 2³⁶  ✓`,
  descarte: "La imagen es de 2⁴⁸ = **256 TB**, no 128 TB. Y las dos alternativas sobre memoria física (los 4 GB y los 2²² marcos) son imposibles de deducir: **con direcciones virtuales nunca puedes sacar la memoria física ni el número de marcos**. Son datos independientes."
},

{
  id: "p3-5", pep: 3, num: 5, puntos: 1, tema: "Tabla multinivel",
  contexto: "Direcciones de 48 bits, páginas de 4 KB, cada entrada de tabla es de 8 bytes y cada tabla cabe exactamente en una página.",
  enunciado: "¿Cuántos niveles tiene la tabla de páginas multinivel?",
  opciones: [
    "1 nivel",
    "2 niveles",
    "3 niveles",
    "4 niveles"
  ],
  correcta: 3,
  justificacion: "Son tres pasos mecánicos. **Entradas por tabla** = tamaño de página ÷ tamaño de entrada = 4096 ÷ 8 = 512. **Bits por nivel** = log₂(512) = 9. **Bits de número de página** = 48 − 12 (offset) = 36. Entonces niveles = 36 ÷ 9 = **4**.",
  diagrama: `entradas/tabla = 4 KB / 8 B = 512
bits por nivel = log₂(512)  = 9
bits de página = 48 − 12    = 36
niveles        = 36 / 9     = 4

Dirección virtual:
| 9 bits | 9 bits | 9 bits | 9 bits | 12 bits offset |
  niv.1    niv.2    niv.3    niv.4`,
  descarte: "Los errores típicos son usar el tamaño de página como número de entradas (olvidando dividir por los 8 bytes de la entrada) o restar mal el offset. La receta es siempre la misma: **entradas = página ÷ entrada**, **bits/nivel = log₂(entradas)**, **niveles = bits de página ÷ bits por nivel**."
},

{
  id: "p3-6", pep: 3, num: 6, puntos: 2, tema: "Tabla multinivel",
  contexto: "Mismo sistema: 4 niveles, páginas de 4 KB, cada tabla ocupa exactamente una página.",
  enunciado: "¿Cuál es el tamaño mínimo que puede ocupar en memoria la tabla de páginas multinivel?",
  opciones: [
    "8 KB",
    "16 KB",
    "32 KB",
    "64 KB"
  ],
  correcta: 1,
  justificacion: "El **mínimo** se da cuando el proceso usa apenas una página: aun así hay que recorrer la cadena completa, o sea se necesita **una tabla por cada nivel** para llegar hasta ella. Con 4 niveles y tablas de 4 KB cada una: 4 × 4 KB = **16 KB**.",
  diagrama: `Nivel 1 ──> Nivel 2 ──> Nivel 3 ──> Nivel 4 ──> página del proceso
 4 KB        4 KB        4 KB        4 KB

Mínimo = niveles × tamaño de página = 4 × 4 KB = 16 KB

(El MÁXIMO sería 1 + 512 + 512² + 512³ páginas.)`,
  descarte: "8 KB correspondería a 2 niveles y 32 KB a 8 niveles. Regla rápida: **mínimo = n° de niveles × tamaño de página**; el máximo es la serie 1 + N + N² + … con un término por nivel."
},

{
  id: "p3-7", pep: 3, num: 7, puntos: 1, tema: "TLB",
  enunciado: "Un sistema de administración de memoria implementa TLB para el proceso de traducción de direcciones lógicas a físicas. Se puede afirmar respecto a la TLB que:",
  opciones: [
    "En la TLB se almacenan porciones de las páginas de un proceso.",
    "Mejora la temporalidad espacial y temporal de los accesos de un proceso.",
    "Disminuye la tasa de page fault de la tabla de páginas.",
    "Busca evitar acceder a la tabla de páginas del proceso."
  ],
  correcta: 3,
  justificacion: "La TLB es una **caché de traducciones**: guarda pares (número de página → número de marco) usados recientemente. Su único trabajo es que la CPU no tenga que salir a memoria a recorrer la tabla de páginas en cada acceso. Si hay hit, la traducción se resuelve dentro del hardware y te ahorras uno o varios accesos a memoria.",
  descarte: "La TLB **no guarda datos ni porciones de páginas** — eso lo hace la caché de datos, es otra cosa. **No mejora la localidad**: al revés, se aprovecha de la localidad que el programa ya tiene. Y **no reduce los page faults**: si la página no está en memoria, no está, y la TLB no puede hacer nada al respecto — solo acelera la traducción de páginas que sí están cargadas."
},

{
  id: "p3-8", pep: 3, num: 8, puntos: 1, tema: "Buffering de páginas",
  enunciado: "Si una página es referenciada y se encuentra en una de las dos listas que mantiene el sistema cuando se implementa buffering de página, entonces:",
  opciones: [
    "Ocurre page-fault y el proceso es bloqueado.",
    "Ocurre page-fault y el proceso es finalizado.",
    "No ocurre page-fault y la página se mantiene en la lista.",
    "No ocurre page-fault y la página es eliminada de la lista."
  ],
  correcta: 3,
  justificacion: "Ésa es exactamente la gracia del buffering de páginas: cuando una página sale del conjunto residente **no se borra de memoria**, solo se pone en una lista (de libres o de modificadas). Si el proceso vuelve a referenciarla antes de que su marco sea reutilizado, se la **rescata directamente sin ir al disco** y, claro, se la saca de la lista porque vuelve a estar en uso activo.",
  diagrama: `Página sale del conjunto residente
        ↓
  entra a la lista (libres / modificadas)
        ↓
  ¿se referencia de nuevo antes de reasignar el marco?
        ↓ SÍ
  se rescata SIN acceder a disco
  y se ELIMINA de la lista            ✓`,
  descarte: "Las dos alternativas con page-fault olvidan que la página **sigue físicamente en memoria**: no hay que traerla de ninguna parte. Y decir que se mantiene en la lista es contradictorio: si el proceso la está usando activamente, no puede seguir figurando como candidata a ser reemplazada."
},

{
  id: "p3-9", pep: 3, num: 9, puntos: 1, tema: "RAID",
  enunciado: "Considere un sistema RAID 0, con 5 discos en total y tamaño de strip de 64 KB. Si se requiere realizar una operación de escritura de 56 KB, comenzando desde el disco 3 (enumerando los discos del 1 al 5): ¿Cuántas operaciones de escritura en discos separados se deben realizar?",
  opciones: [
    "1 escritura en un disco.",
    "2 escrituras en dos discos, una por disco.",
    "3 escrituras en tres discos, una por disco.",
    "4 escrituras en cinco discos, una por disco."
  ],
  correcta: 1,
  justificacion: "Los 56 KB **no comienzan al inicio del strip** del disco 3, sino en algún punto dentro de él. Como el strip mide 64 KB y el dato ocupa 56 KB, lo que no alcanza a caber en el espacio restante del disco 3 se derrama al **disco 4**: en total, **2 escrituras en 2 discos distintos**, una en cada uno. Y como RAID 0 no tiene redundancia, no hay escrituras extra de paridad ni de espejo.",
  diagrama: `strip = 64 KB          dato = 56 KB

Disco3            Disco4
[ ...|■■■■■■■■]   [■■■■...        ]
      parte 1       parte 2

  →  2 escrituras, en 2 discos separados`,
  descarte: "⚠ Si asumes que la escritura arranca **justo al inicio** del strip del disco 3, entonces 56 < 64 y cabría en un solo disco — ése fue mi razonamiento y la pauta lo descarta. Lo que no cambia en ningún escenario: en RAID 0 **jamás hay operaciones adicionales de paridad**, así que las alternativas que involucran los cinco discos están fuera."
},

{
  id: "p3-10", pep: 3, num: 10, puntos: 1, tema: "RAID",
  contexto: "Continuación del mismo enunciado: un RAID 0 con 5 discos y strips de 64 KB, sobre el que se escriben 56 KB comenzando desde el disco 3. Al caber el dato en un solo strip, se realiza una única escritura en un único disco.",
  enunciado: "¿Para qué otro sistema RAID ocurriría la misma cantidad de operaciones de escritura en discos separados?",
  opciones: [
    "RAID 0",
    "RAID 1",
    "RAID 2",
    "RAID 3"
  ],
  correcta: 1,
  justificacion: "RAID 1 es **mirroring**: el dato se escribe en un disco y se copia idéntico en su espejo. No hay que calcular paridad ni leer nada previo, así que la operación involucra únicamente al disco de datos y su copia — el dato sigue \"cabiendo en un disco\", igual que en RAID 0, sin dispersarse por todo el arreglo.",
  descarte: "RAID 0 queda fuera porque el enunciado pide **otro** sistema. RAID 2 (código Hamming) y RAID 3 (paridad con striping a nivel de **bit o byte**) reparten cada dato entre **todos** los discos del arreglo, así que cualquier escritura, por chica que sea, obliga a tocar todos los discos a la vez."
},

{
  id: "p3-11", pep: 3, num: 11, puntos: 1, tema: "Tabla de páginas",
  contexto: "Una entrada de la tabla de páginas usa los bits 31..12 para el número de marco (20 bits) y el resto para bits de control: AVAIL (3), D, A, V/S, R/W, P y bits reservados. El tamaño máximo de memoria para un proceso es de 4 GB y las páginas son de 8 KB.",
  enunciado: "¿Cuál es el tamaño de la tabla de páginas?",
  opciones: [
    "1 MB",
    "2 MB",
    "4 MB",
    "8 MB"
  ],
  correcta: 1,
  justificacion: "Dos factores: **cuántas entradas** y **cuánto pesa cada una**. Las entradas son 4 GB ÷ 8 KB = 2³² ÷ 2¹³ = **2¹⁹ páginas**. Y cada entrada ocupa los 32 bits del formato mostrado = **4 bytes**. Multiplicando: 2¹⁹ × 4 = 2²¹ = **2 MB**.",
  diagrama: `N° de entradas = imagen del proceso / tamaño de página
               = 4 GB / 8 KB
               = 2³² / 2¹³  =  2¹⁹

Tamaño entrada = 32 bits = 4 bytes   (bits 31..0)

Tabla = 2¹⁹ × 4 B = 2²¹ B = 2 MB`,
  descarte: "1 MB saldría de suponer entradas de 2 bytes, y 4 MB de usar páginas de 4 KB en vez de 8 KB. Ojo con el dato: la entrada mide 32 bits porque el formato va del bit 31 al 0, aunque solo 20 de ellos sean el número de marco."
},

{
  id: "p3-12", pep: 3, num: 12, puntos: 1, tema: "Memoria física",
  contexto: "Mismo formato de entrada: bits 31..12 para el número de marco (20 bits), páginas de 8 KB.",
  enunciado: "¿Cuál es el tamaño de la memoria del sistema?",
  opciones: [
    "1 GB",
    "2 GB",
    "4 GB",
    "8 GB"
  ],
  correcta: 3,
  justificacion: "La fórmula es **memoria física = 2^(bits de marco) × tamaño de marco**. Los bits 31..12 dan 20 bits para el número de marco, o sea 2²⁰ marcos posibles. Como cada marco mide lo mismo que una página (8 KB = 2¹³), la memoria total es 2²⁰ × 2¹³ = 2³³ = **8 GB**.",
  diagrama: `bits de marco (31..12) = 20 bits  →  2²⁰ marcos
tamaño de marco = tamaño de página = 8 KB = 2¹³

Memoria = 2²⁰ × 2¹³ = 2³³ B = 8 GB

(Recuerda: 2³⁰ = 1 GB, entonces 2³³ = 8 GB)`,
  descarte: "Los 4 GB del enunciado anterior son el **espacio virtual del proceso**, no la memoria física: son cosas distintas y aquí resulta que la física es mayor. Los otros valores salen de contar mal los bits de marco o de usar un tamaño de marco equivocado."
},

{
  id: "p3-13", pep: 3, num: 13, puntos: 1, tema: "TLB",
  enunciado: "En un sistema con memoria virtual que implementa paginación, ¿cuál es la principal función de la TLB (Translation Lookaside Buffer)?",
  opciones: [
    "Almacenar páginas completas en memoria caché para acceso rápido",
    "Mantener una copia de respaldo de la tabla de páginas principal",
    "Acelerar la traducción de direcciones virtuales a físicas almacenando entradas de tabla de páginas frecuentemente usadas",
    "Gestionar automáticamente los page faults cuando una página no está en memoria"
  ],
  correcta: 2,
  justificacion: "La TLB es una caché **asociativa y muy pequeña** que vive dentro de la MMU y guarda las traducciones página→marco usadas recientemente. Si la traducción está ahí (hit), la dirección física se resuelve en el hardware sin salir a memoria; si no está (miss), recién ahí hay que recorrer la tabla de páginas.",
  descarte: "No guarda **páginas completas** — eso es la caché de datos, otra cosa distinta. No es un respaldo de nada: si una entrada se descarta de la TLB no se pierde información, la tabla de páginas sigue siendo la fuente de verdad. Y los page faults los maneja el **SO** mediante una interrupción, no la TLB."
},

{
  id: "p3-14", pep: 3, num: 14, puntos: 2, tema: "Direcciones de memoria",
  contexto: "Una empresa de videojuegos analiza el comportamiento de memoria de su nuevo juego. El sistema usa páginas de 4 KB y la dirección base del arreglo es 0x7fff12345000.",
  enunciado: "Analice el comportamiento de memoria:",
  codigo: `int main() {
  int texturas[2048];    // Cada int = 4 bytes
  int i;
  for (i = 0; i < 2048; i++) {
    texturas[i] = i * 16;
  }
  printf("Dirección base: %p\\n", &texturas[0]);
  printf("Dirección final: %p\\n", &texturas[i]);   // i vale 2048
  return 0;
}`,
  opciones: [
    "El arreglo ocupa exactamente 1 página, la dirección final será 0x7fff12345FFF",
    "El arreglo ocupa exactamente 2 páginas, la dirección final será 0x7fff12347000",
    "El arreglo ocupa más de 2 páginas, la dirección final será 0x7fff12347001",
    "El programa tiene un error, no se puede determinar la dirección final"
  ],
  correcta: 1,
  justificacion: "El arreglo pesa 2048 × 4 = **8192 bytes = 8 KB**, o sea exactamente **2 páginas** de 4 KB. Y como la base termina en `000`, está alineada al inicio de página, así que no se derrama a una tercera. La dirección final es base + 8192 = base + **0x2000**.",
  diagrama: `Tamaño = 2048 × 4 B = 8192 B = 8 KB = 2 páginas

&texturas[2048] = 0x7fff12345000 + 0x2000
                = 0x7fff12347000
                              ↑
                    5 + 2 = 7

|← página 1 (4KB) →|← página 2 (4KB) →|
 texturas[0..1023]  texturas[1024..2047]`,
  descarte: "Una sola página solo alcanzaría para 1024 enteros. La dirección `...FFF` sería el último **byte** de la primera página, no el final del arreglo. Y no hay error en el programa: acceder a `&texturas[i]` con i = 2048 es legal en C (tomar la dirección del elemento siguiente al último está permitido, lo prohibido es *leer* ahí)."
},

{
  id: "p3-15", pep: 3, num: 15, puntos: 1, tema: "RAID",
  enunciado: "¿Cuál de las siguientes características distingue principalmente a RAID 5 de RAID 4?",
  opciones: [
    "RAID 5 usa striping a nivel de bytes mientras RAID 4 usa bloques",
    "RAID 5 distribuye la paridad entre todos los discos, RAID 4 usa un disco dedicado para paridad",
    "RAID 5 requiere menos discos que RAID 4 para implementarse",
    "RAID 5 no implementa redundancia, RAID 4 sí"
  ],
  correcta: 1,
  justificacion: "Es **la** diferencia entre ambos. RAID 4 concentra toda la paridad en un único disco, que se convierte en cuello de botella: **cada** escritura del arreglo, sin importar a qué disco vaya, obliga a actualizar ese mismo disco de paridad. RAID 5 reparte los bloques de paridad entre todos los discos, así que las escrituras se distribuyen y el rendimiento mejora.",
  diagrama: `RAID 4:                      RAID 5:
 D0  D1  D2  P                D0  D1  D2  P
 D3  D4  D5  P                D3  D4  P   D6
 D6  D7  D8  P                D9  P   D10 D11
          ↑                       ↖ paridad rotando
   cuello de botella`,
  descarte: "Ambos usan striping a nivel de **bloque** (el de nivel de byte es RAID 3). Necesitan la misma cantidad mínima de discos. Y los dos implementan redundancia por paridad: la diferencia es **dónde** la ponen, no si la tienen."
},

{
  id: "p3-16", pep: 3, num: 16, puntos: 1, tema: "Tabla multinivel",
  enunciado: "En un sistema de paginación con tabla de páginas multinivel, si cada entrada de tabla ocupa 8 bytes y cada tabla cabe exactamente en una página de 4 KB, ¿cuántas entradas puede tener cada tabla?",
  opciones: [
    "256 entradas",
    "512 entradas",
    "1024 entradas",
    "2048 entradas"
  ],
  correcta: 1,
  justificacion: "División directa: **entradas por tabla = tamaño de página ÷ tamaño de entrada** = 4096 ÷ 8 = **512**. Este número es la base de todos los cálculos multinivel, porque log₂(512) = 9 te da los bits que consume cada nivel en la dirección virtual.",
  diagrama: `4 KB / 8 B  =  4096 / 8  =  512 entradas

512 = 2⁹  →  cada nivel consume 9 bits de la dirección`,
  descarte: "1024 saldría con entradas de 4 bytes (típico de sistemas de 32 bits) y 2048 con entradas de 2 bytes. Siempre revisa el tamaño de entrada que te da el enunciado: en sistemas de 64 bits suele ser 8 bytes, en los de 32 bits, 4."
},

{
  id: "p3-17", pep: 3, num: 17, puntos: 2, tema: "RAID",
  contexto: "Un centro de datos configura un RAID-4 con 5 discos (el Disco 4 es el de paridad). Un administrador necesita escribir 48 KB de datos nuevos comenzando en el Disco 1, primer strip. Los nuevos datos cambiarán el valor de 0x123 a 0xFFF.",
  enunciado: "¿Qué operaciones se deben realizar y por qué?",
  tabla: {"head":["Disco 0","Disco 1","Disco 2","Disco 3","Disco 4 (paridad)"],"rows":[["0xABC","0x123","0x456","0x789","0x???"]]},
  opciones: [
    "Solo escribir en Disco 1, porque los datos caben en un strip",
    "Escribir en Disco 1 y recalcular toda la paridad del Disco 4 leyendo todos los discos",
    "Leer valor original del Disco 1, leer paridad actual, escribir nuevo valor en Disco 1 y escribir nueva paridad en Disco 4",
    "Escribir en Disco 1 y Disco 2 porque los datos ocupan múltiples strips"
  ],
  correcta: 2,
  justificacion: "Es la famosa **small write penalty** de RAID 4 y 5: modificar un solo strip cuesta **4 operaciones**. Se aprovecha una propiedad del XOR: `P_nueva = P_vieja ⊕ dato_viejo ⊕ dato_nuevo`. O sea, no hace falta leer los otros discos, basta con el dato antiguo y la paridad antigua.",
  diagrama: `Small write (RAID 4 y 5) = 4 operaciones:

  1. LEER   el dato viejo   (Disco 1: 0x123)
  2. LEER   la paridad vieja (Disco 4)
  3. ESCRIBIR el dato nuevo  (Disco 1: 0xFFF)
  4. ESCRIBIR la paridad nueva (Disco 4)

  P_nueva = P_vieja ⊕ 0x123 ⊕ 0xFFF`,
  descarte: "Escribir solo en el Disco 1 dejaría la paridad **inconsistente**: si después falla un disco, no se podría reconstruir nada. Recalcular leyendo **todos** los discos también funciona pero es más caro (en un arreglo grande sería carísimo); por eso se usa el truco del XOR. Y los 48 KB caben en un strip, así que no se toca el Disco 2."
},

{
  id: "p3-18", pep: 3, num: 18, puntos: 1, tema: "Paginación",
  enunciado: "¿Cuál es la principal ventaja de usar páginas grandes en un sistema de memoria virtual?",
  opciones: [
    "Reduce la fragmentación interna de memoria",
    "Disminuye el número de entradas en la tabla de páginas",
    "Aumenta la localidad temporal de los programas",
    "Mejora la seguridad del sistema operativo"
  ],
  correcta: 1,
  justificacion: "Con páginas más grandes, la misma imagen del proceso se divide en **menos pedazos**, así que la tabla de páginas necesita menos entradas y ocupa menos memoria. Además, como cada entrada de TLB cubre más terreno, la tasa de hit sube y se reducen los niveles de la tabla multinivel — por eso existen las *huge pages*.",
  descarte: "La fragmentación interna va justo al revés: **páginas más grandes = más desperdicio** en la última página del proceso (si sobra medio bloque, ese medio bloque se pierde). La localidad es una propiedad del **programa**, no algo que el tamaño de página pueda cambiar. Y la seguridad no depende del tamaño de las páginas, sino de los bits de protección de cada entrada."
},

{
  id: "p3-19", pep: 3, num: 19, puntos: 1, tema: "Buffering de páginas",
  enunciado: "En el contexto de buffering de páginas, si una página referenciada se encuentra en la lista de páginas libres, ¿qué ocurre?",
  opciones: [
    "Ocurre page fault y el proceso es bloqueado hasta cargar la página",
    "No ocurre page fault y la página permanece en la lista de páginas libres",
    "Ocurre page fault y la página es eliminada de la lista de páginas libres",
    "Ocurre page fault pero el proceso continúa ejecutándose"
  ],
  correcta: 2,
  justificacion: "Como la página ya no está en el conjunto residente del proceso, técnicamente **se gatilla el page fault**. Pero la gracia del buffering es que la página **sigue físicamente en el marco**: solo estaba anotada como candidata a reemplazo. El SO la rescata de la lista sin tocar el disco y la devuelve al conjunto residente, sacándola de la lista de libres.",
  diagrama: `Página referenciada
        ↓
  ¿está en el conjunto residente?  NO  →  page fault
        ↓
  ¿está en la lista de libres/modificadas?  SÍ
        ↓
  se rescata SIN acceder a disco
  y se ELIMINA de la lista            ✓ costo casi nulo`,
  descarte: "No se bloquea al proceso porque **no hay acceso a disco** que esperar: la resolución es inmediata. Y no puede permanecer en la lista de libres, porque el proceso volvió a usarla activamente: dejarla ahí significaría que su marco podría ser reasignado en cualquier momento. ⚠ Ojo con la redacción: hay versiones de esta pregunta donde la alternativa correcta dice \"**no** ocurre page fault y se elimina de la lista\" — lo que siempre se cumple es lo esencial: **se elimina de la lista y no se va a disco**."
},

{
  id: "p3-20", pep: 3, num: 20, puntos: 2, tema: "TLB",
  contexto: "TLB con direcciones virtuales de 32 bits, páginas de 4 KB (12 bits de offset), y entradas de 20 bits para número de página, 20 bits para marco y 8 bits para PID.",
  enunciado: "Analice la siguiente referencia y determine el resultado: PID 1 accede a la dirección virtual 0x00001ABC.",
  tabla: {"head":["Página","Marco","PID"],"rows":[["0x00000","0x12345","1"],["0x00001","0xABCDE","1"],["0x00010","0x11111","2"],["0xFFFFF","0x22222","1"]]},
  opciones: [
    "TLB Hit - Dirección física: 0xABCDEABC",
    "TLB Hit - Dirección física: 0xABCED000",
    "TLB Miss - Debe consultar tabla de páginas",
    "Error - Dirección inválida para el PID"
  ],
  correcta: 0,
  justificacion: "Primero **se parte la dirección**: con 12 bits de offset (3 dígitos hex), 0x00001ABC se divide en página = **0x00001** y offset = **0xABC**. Buscas esa página en la TLB con PID 1 y la encuentras en la segunda fila: marco **0xABCDE**. Y ahora la regla de oro de la paginación: la dirección física se arma **concatenando** marco y offset, nunca sumando.",
  diagrama: `0x00001ABC  (32 bits)
 └──┬──┘└┬┘
    │     └── offset  = 0xABC   (12 bits = 3 dígitos hex)
    └──────── página  = 0x00001 (20 bits = 5 dígitos hex)

TLB: página 0x00001, PID 1  →  marco 0xABCDE   ✓ HIT

Física = marco ‖ offset = 0xABCDE ‖ 0xABC = 0xABCDEABC`,
  descarte: "0xABCED000 tiene los dígitos del marco cambiados de orden y pierde el offset. No es miss: la entrada está en la tabla con el PID correcto. Y no es inválida: la página 0x00001 pertenece efectivamente al PID 1 (la del PID 2 es la 0x00010, que es otra distinta — ojo con ese cero de más)."
},

{
  id: "p3-21", pep: 3, num: 21, puntos: 1, tema: "Fragmentación",
  enunciado: "¿Cuál es la principal diferencia entre fragmentación interna y externa en sistemas de gestión de memoria?",
  opciones: [
    "La fragmentación externa ocurre en paginación, la interna en segmentación",
    "La fragmentación interna es desperdicio dentro de una partición asignada, la externa es desperdicio entre particiones asignadas",
    "La fragmentación interna afecta la memoria física, la externa la memoria virtual",
    "La fragmentación interna se puede resolver con compactación, la externa no"
  ],
  correcta: 1,
  justificacion: "La distinción es puramente **de ubicación del desperdicio**. La **interna** es espacio que quedó sin usar *dentro* de un bloque que sí se asignó (te dieron una página de 4 KB y solo ocupaste 100 bytes: los otros 3996 se pierden). La **externa** son huecos libres *entre* bloques asignados, que sumados podrían alcanzar pero están dispersos y no sirven para nada.",
  diagrama: `INTERNA (paginación, particionamiento fijo):
  [proceso▓▓▓░░░]   ← el ░ está dentro de la partición

EXTERNA (particionamiento dinámico, segmentación):
  [P1▓▓]░░░[P2▓▓▓]░░[P3▓]░░░░
        ↑        ↑       ↑
    huecos libres entre procesos asignados`,
  descarte: "La primera alternativa invierte los sistemas: la **interna** es de paginación y particionamiento fijo, la **externa** de segmentación y particionamiento dinámico. La distinción no es física/virtual. Y es al revés en la última: la **compactación** (mover procesos para juntar los huecos) resuelve la **externa**, no la interna — la interna solo se reduce achicando el tamaño de bloque."
},

{
  id: "p3-22", pep: 3, num: 22, puntos: 1, tema: "Requerimientos de memoria",
  enunciado: "Con respecto al requerimiento de \"reubicación\" en un sistema de administración de memoria, es incorrecto indicar que:",
  opciones: [
    "Corresponde a la capacidad del sistema de administración de memoria para cargar la imagen del proceso en cualquier parte de la memoria física.",
    "Si un proceso es \"suspendido\" y, tiempo después, vuelve al estado \"bloqueado\", el proceso debe ser cargado exactamente en el mismo lugar de memoria física.",
    "Para soportar este requerimiento, los procesos deben generar direcciones de memoria lógicas, no físicas.",
    "El proceso de traducción de direcciones lógicas a físicas ocurre en tiempo de ejecución."
  ],
  correcta: 1,
  justificacion: "Esa afirmación describe **justo lo contrario** de la reubicación. La gracia del requerimiento es precisamente que un proceso que vuelve del swap puede cargarse en **cualquier zona libre** de la memoria física, no necesariamente donde estaba. Si estuviera obligado a volver al mismo lugar, el SO no tendría libertad para administrar la memoria y toda la idea se cae.",
  descarte: "Las otras tres son correctas y de hecho se sostienen entre sí: la reubicación es poder cargar la imagen en cualquier parte, para lograrlo el proceso debe emitir direcciones **lógicas** (si emitiera físicas quedaría amarrado a una posición fija), y la traducción lógica→física la hace el hardware **en tiempo de ejecución**, en cada acceso."
},

{
  id: "p3-23", pep: 3, num: 23, puntos: 1, tema: "Requerimientos de memoria",
  enunciado: "En cierto sistema de administración de memoria, durante la traducción de una dirección se detecta que la dirección generada cae fuera del espacio de direcciones del proceso, gatillando una interrupción. Este mecanismo permite implementar el requerimiento de:",
  opciones: [
    "Protección.",
    "Compartición.",
    "Organización lógica.",
    "Organización física."
  ],
  correcta: 0,
  justificacion: "Impedir que un proceso lea o escriba fuera de su propio espacio de direcciones es la definición de **protección**. El hardware compara cada dirección generada contra los límites del proceso y, si se sale, lanza una interrupción que el SO atiende (típicamente matando al proceso con un *segmentation fault*). Así ningún proceso puede corromper a otro ni al kernel.",
  descarte: "**Compartición** es lo contrario: permitir que varios procesos accedan *a propósito* a la misma región (bibliotecas compartidas, memoria compartida). **Organización lógica** se refiere a poder dividir el programa en módulos con distintos permisos (el fuerte de la segmentación). Y **organización física** trata de gestionar la jerarquía memoria principal/secundaria y el movimiento entre ellas."
},

{
  id: "p3-24", pep: 3, num: 24, puntos: 1, tema: "Fragmentación",
  enunciado: "En un sistema con particionamiento dinámico se requiere una política de posicionamiento, tales como best-fit y first-fit. Con respecto a estas políticas se puede afirmar que:",
  opciones: [
    "Best-fit produce mayor fragmentación interna que first-fit.",
    "First-fit produce mayor fragmentación interna que best-fit.",
    "Best-fit produce mayor fragmentación externa que first-fit.",
    "First-fit produce mayor fragmentación externa que best-fit."
  ],
  correcta: 2,
  justificacion: "Suena contraintuitivo, pero es así: **best-fit** busca el hueco cuyo tamaño sea el más parecido al que necesitas, y precisamente por eso deja como sobrante un pedacito **diminuto e inservible**. Repitiendo la jugada, la memoria se llena de fragmentos microscópicos que ya no le sirven a nadie. First-fit toma el primer hueco que alcance y deja sobrantes más grandes, que sí pueden reutilizarse.",
  diagrama: `Se necesitan 10 KB. Huecos: [12 KB]  [40 KB]

BEST-FIT  → usa el de 12 KB → deja 2 KB   (inservible)
FIRST-FIT → usa el de 40 KB → deja 30 KB  (reutilizable)

Best-fit deja migajas ⇒ MÁS fragmentación externa.`,
  descarte: "Las dos alternativas sobre fragmentación **interna** están mal encaminadas: en particionamiento **dinámico** las particiones se crean a la medida exacta del proceso, así que prácticamente no existe fragmentación interna. La interna es propia del particionamiento **fijo**, la paginación y el sistema buddy."
},

{
  id: "p3-25", pep: 3, num: 25, puntos: 1, tema: "Paginación",
  enunciado: "Paginación es un sistema de particionamiento simple que particiona la imagen de un proceso en páginas y la memoria en marcos. Con respecto a este sistema, NO es posible afirmar que:",
  opciones: [
    "Todas las páginas son del mismo tamaño que los marcos en memoria.",
    "Pueden haber más marcos que páginas, pero no más páginas que marcos.",
    "En este sistema, una dirección lógica está dividida en bits para el número de página y bits para el offset.",
    "Todas las páginas del proceso se encuentran en la memoria principal."
  ],
  correcta: 1,
  justificacion: "No existe ninguna regla que impida que un proceso tenga **más páginas que marcos disponibles** en la memoria física — de hecho es lo habitual, y es justamente el problema que la **memoria virtual** viene a resolver (manteniendo solo un conjunto residente en memoria y el resto en disco). Afirmar que las páginas nunca pueden superar a los marcos es falso.",
  descarte: "Las otras tres sí son características correctas de la paginación: página y marco miden exactamente lo mismo (es el principio del esquema), la dirección lógica se parte en número de página + offset, y en paginación **simple** (sin memoria virtual) efectivamente se carga el proceso completo en memoria."
},

{
  id: "p3-26", pep: 3, num: 26, puntos: 1, tema: "Segmentación",
  enunciado: "¿Cuál de las siguientes afirmaciones es correcta para un sistema de administración de memoria que implementa segmentación?",
  opciones: [
    "Al traducir una dirección de memoria lógica a física, se concatena la dirección base del segmento al offset.",
    "Los segmentos pueden ser de distinto largo, sin un máximo definido.",
    "Durante la traducción de dirección lógica a física puede ocurrir un page-fault.",
    "La tabla de segmento se direcciona por número de segmento y cada entrada en la tabla contiene dirección base y el límite del segmento."
  ],
  correcta: 3,
  justificacion: "Cada entrada de la tabla de segmentos necesita **dos** campos: la **base** (dónde empieza el segmento en memoria física) y el **límite** (cuánto mide). La base sirve para calcular la dirección física y el límite para validar que el offset no se salga — si `offset ≥ límite`, se dispara un **segmentation fault**.",
  diagrama: `Dirección lógica:  | n° segmento | offset |
                          ↓
Tabla de segmentos:  [ base | límite ]
                          ↓
  si offset ≥ límite  →  SEGMENTATION FAULT
  si no  →  física = base + offset   (SUMAR)`,
  descarte: "La diferencia más preguntada del ramo: en **segmentación se SUMA** (base + offset) porque los segmentos empiezan en cualquier parte; en **paginación se CONCATENA** (marco ‖ offset) porque los marcos están alineados. Los segmentos sí tienen un máximo, definido por los bits del offset. Y el **page-fault** es de paginación: en segmentación pura el error se llama segmentation fault."
},

{
  id: "p3-27", pep: 3, num: 27, puntos: 1, tema: "Segmentación paginada",
  contexto: "Un sistema implementa segmentación paginada, con máximo 64 KB de memoria física divididos en marcos de 4 K. Un proceso está dividido en 3 segmentos: S0 de 32768 bytes, S1 de 16386 bytes y S3 de 15870 bytes.",
  enunciado: "¿Se podrá cargar este programa completamente en memoria? Suponga que no existe un límite para el conjunto residente.",
  opciones: [
    "Sí, dado que la imagen del proceso es 63,5 KB y la memoria de 64 KB.",
    "No, dado que la imagen del proceso es de 70 KB y la memoria es de 64 KB.",
    "Sí, dado que la imagen del proceso ocupa 16 páginas y la memoria cuenta con 16 marcos.",
    "No, dado que la imagen del proceso ocupa 17 páginas y la memoria cuenta con 16 marcos."
  ],
  correcta: 3,
  justificacion: "La clave es que en segmentación paginada **cada segmento se pagina por separado**, así que hay que redondear hacia arriba segmento por segmento y recién después sumar. Aunque los bytes totales dan 63,5 KB (que cabrían), los redondeos individuales hacen que se necesiten **17 páginas** contra los 16 marcos disponibles.",
  diagrama: `S0: 32768 / 4096 = 8,00  →   8 páginas (exacto)
S1: 16386 / 4096 = 4,0005 →  5 páginas (¡por 2 bytes!)
S3: 15870 / 4096 = 3,87  →   4 páginas
                            ───────────
                            17 páginas

Memoria: 64 KB / 4 KB = 16 marcos

17 > 16  →  NO cabe`,
  descarte: "La trampa está en sumar primero los bytes (63,5 KB) y concluir que cabe: eso solo valdría si los segmentos pudieran compartir páginas, cosa que no ocurre. Fíjate en S1: **le sobran 2 bytes** sobre el múltiplo exacto y eso ya obliga a una quinta página completa."
},

{
  id: "p3-28", pep: 3, num: 28, puntos: 1, tema: "Fragmentación",
  contexto: "Mismo sistema: S0 de 32768 bytes, S1 de 16386 bytes y S3 de 15870 bytes, con marcos de 4 K.",
  enunciado: "¿En cuántas páginas ocurrirá fragmentación interna?",
  opciones: [
    "Ninguna página del proceso sufrirá fragmentación interna.",
    "Sólo una página del proceso sufrirá fragmentación interna.",
    "Dos páginas del proceso sufrirán fragmentación interna.",
    "Todas las páginas del proceso sufrirán fragmentación interna."
  ],
  correcta: 2,
  justificacion: "La fragmentación interna vive **en la última página de cada segmento**, y solo si el segmento no es múltiplo exacto del tamaño de página. Revisando uno por uno: S0 calza perfecto (no hay desperdicio), pero S1 y S3 dejan restos. Son **2 páginas** con fragmentación.",
  diagrama: `S0: 32768 = 8 × 4096 exacto     →  0 desperdicio  ✓
S1: 16386 = 4×4096 + 2          →  última pág.: 4094 B perdidos
S3: 15870 = 3×4096 + 3582       →  última pág.:  514 B perdidos
                                    ─────────────
                                    2 páginas fragmentadas`,
  descarte: "\"Ninguna\" ignora que S1 y S3 no son múltiplos exactos. \"Todas\" confunde el concepto: las páginas intermedias de un segmento están **llenas al 100 %**, el desperdicio solo aparece en la última de cada segmento. Y \"sólo una\" olvida que aquí hay dos segmentos mal alineados, no uno."
},

{
  id: "p3-29", pep: 3, num: 29, puntos: 1, tema: "Segmentación",
  contexto: "En un sistema basado en segmentos, la tabla de segmentos contiene sólo dos entradas. Una de ellas indica que el segmento 0 tiene una base de 0x00DB y un largo de 256 direcciones de memoria.",
  enunciado: "El proceso genera la dirección 0x01AE, lo que resulta en:",
  opciones: [
    "La traducción de la dirección lógica a física, para luego acceder a memoria la dirección 0x01AE.",
    "La traducción de la dirección lógica a física, para luego acceder a memoria la dirección 0x0289.",
    "La traducción de la dirección lógica a física, produciendo page-fault.",
    "La traducción de la dirección lógica a física, produciendo segmentation-fault."
  ],
  correcta: 3,
  justificacion: "Antes de sumar la base **siempre hay que validar el límite**. El offset 0x01AE en decimal es **430**, y el segmento mide apenas **256** direcciones (índices válidos: 0 a 255). Como 430 ≥ 256, la dirección se sale del segmento y el hardware dispara un **segmentation fault**. Ni siquiera se llega a calcular la dirección física.",
  diagrama: `offset = 0x01AE = 430
límite = 256

  ¿offset < límite?
  430 < 256  →  NO   ⇒  SEGMENTATION FAULT

(Si hubiera sido válida: física = 0x00DB + 0x01AE = 0x0289,
 que es justamente el distractor de la alternativa b.)`,
  descarte: "0x0289 es exactamente base + offset: es el resultado que obtienes **si te saltas la validación del límite**, que es el error que la pregunta quiere pillar. El **page-fault** pertenece a paginación, no a segmentación pura. Y acceder directamente a 0x01AE sería ignorar la traducción por completo."
},

{
  id: "p3-30", pep: 3, num: 30, puntos: 2, tema: "Segmentación paginada",
  contexto: "Formato de una dirección de memoria virtual en un sistema con segmentación paginada.",
  enunciado: "Para el siguiente formato, se puede afirmar que:",
  tabla: {"head":["Número de segmento","Número de página","offset"],"rows":[["2 bits","16 bits","8 bits"]]},
  opciones: [
    "La cantidad máxima de segmentos por proceso es 4 y el tamaño máximo del segmento 16 MB.",
    "La cantidad máxima de páginas por segmento es de 2¹⁸ y el tamaño de una página es 256 bytes.",
    "El número de páginas por segmento es 2¹⁶ y el tamaño de página dependerá del tamaño del segmento.",
    "El número de páginas totales de la imagen del proceso es 2¹⁸ y el tamaño de página dependerá del tamaño del segmento."
  ],
  correcta: 0,
  justificacion: "Cada campo se lee como potencia de dos. **Segmentos**: 2 bits → 2² = **4**. **Páginas por segmento**: 16 bits → 2¹⁶. **Tamaño de página**: 8 bits de offset → 2⁸ = 256 bytes. El tamaño máximo de un segmento es entonces 2¹⁶ × 256 = 2¹⁶ × 2⁸ = 2²⁴ = **16 MB**.",
  diagrama: `| 2 bits | 16 bits | 8 bits |
   seg      página    offset

Segmentos       = 2²  = 4
Páginas/segmento= 2¹⁶ = 65.536
Tamaño página   = 2⁸  = 256 B
Tamaño segmento = 2¹⁶ × 2⁸ = 2²⁴ = 16 MB  ✓`,
  descarte: "2¹⁸ sale de sumar mal los campos de segmento y página (2+16). Y las dos alternativas que dicen que \"el tamaño de página dependerá del tamaño del segmento\" están conceptualmente erradas: el tamaño de página es **fijo** y lo determinan exclusivamente los bits de offset, nunca el segmento."
},

{
  id: "p3-31", pep: 3, num: 31, puntos: 3, tema: "Reemplazo de páginas",
  contexto: "Un sistema con 5 marcos en memoria, al comienzo vacíos. Un proceso genera la siguiente secuencia de referencias a páginas: 1, 2, 3, 4, 1, 1, 2, 5, 6, 1, 3, 1, 2, 5",
  enunciado: "Para la secuencia anterior se puede afirmar que:",
  opciones: [
    "El algoritmo de reemplazo LRU produce menos page-fault que el algoritmo del reloj.",
    "El algoritmo de reemplazo del reloj produce menos page-fault que el algoritmo LRU.",
    "El algoritmo del reloj produce la misma cantidad de page-fault que LRU.",
    "No es posible comparar ambos algoritmos."
  ],
  correcta: 0,
  justificacion: "Hay que simular ambos. **LRU** da 7 fallos y **reloj** da 8. La diferencia aparece en la referencia a la página 1 (posición 10): LRU la tiene todavía en memoria porque recuerda con precisión el orden de uso, mientras que el reloj —que es una aproximación con un solo bit de uso— ya la había sacado al buscar víctima para la página 6, porque al recorrer el círculo le tocó ser la primera con el bit en cero.",
  diagrama: `Secuencia: 1 2 3 4 1 1 2 5 6 1 3 1 2 5

LRU   → fallos en: 1, 2, 3, 4, 5, 6, 3        = 7 fallos
RELOJ → fallos en: 1, 2, 3, 4, 5, 6, 1, 2     = 8 fallos

El reloj sacrifica la página 1 al buscar víctima para
la 6 (dio la vuelta completa bajando bits de uso),
y por eso vuelve a fallar en la posición 10.

LRU (7)  <  Reloj (8)   ⇒  LRU es mejor aquí`,
  descarte: "El reloj **nunca supera** a LRU en calidad de decisiones: es precisamente una aproximación barata de LRU, diseñada para no tener que mantener timestamps. Su gracia es el bajo costo de implementación, no la precisión. Y sí se pueden comparar: basta simular ambos con la misma secuencia y el mismo número de marcos."
},

{
  id: "p3-32", pep: 3, num: 32, puntos: 1, tema: "Tabla multinivel",
  contexto: "Un sistema de 64 bits utiliza direcciones de memoria de 48 bits, omitiendo los 16 bits más significativos. Implementa memoria virtual con paginación y tabla multinivel. Cada tabla contiene 512 entradas de 8 bytes y cada una cabe exactamente en una página.",
  enunciado: "¿Cuál de las siguientes afirmaciones es correcta?",
  opciones: [
    "El tamaño máximo de memoria virtual direccionable es 32 GB.",
    "El tamaño de una página es de 1 KB.",
    "El esquema de tabla de páginas multinivel es de 4 niveles.",
    "Una dirección lógica se compone de bits para la tabla índice, bits para la tabla de páginas y bits para el offset."
  ],
  correcta: 2,
  justificacion: "Primero deduces el tamaño de página: si una tabla de 512 entradas × 8 bytes = 4096 bytes cabe **exactamente** en una página, entonces la página mide **4 KB** y el offset es de 12 bits. Después: bits de número de página = 48 − 12 = **36**, y cada nivel consume log₂(512) = **9 bits**. Por lo tanto 36 ÷ 9 = **4 niveles**.",
  diagrama: `página = 512 × 8 B = 4096 B = 4 KB  →  offset = 12 bits
bits de página = 48 − 12 = 36
bits por nivel = log₂(512) = 9
niveles = 36 / 9 = 4  ✓

| 9 | 9 | 9 | 9 | 12 bits offset |`,
  descarte: "El espacio virtual es 2⁴⁸ = **256 TB**, no 32 GB. La página es de 4 KB, no de 1 KB. Y la última alternativa describe un esquema de **dos** niveles (\"tabla índice\" + \"tabla de páginas\"), cuando aquí son cuatro."
},

{
  id: "p3-33", pep: 3, num: 33, puntos: 1, tema: "Tabla multinivel",
  contexto: "Mismo sistema: 4 niveles, páginas de 4 KB, cada tabla ocupa una página.",
  enunciado: "¿Cuál es el tamaño mínimo que puede ocupar en memoria la tabla de páginas multinivel?",
  opciones: [
    "4 KB.",
    "8 KB.",
    "12 KB.",
    "16 KB."
  ],
  correcta: 3,
  justificacion: "Aunque el proceso use una única página, hay que atravesar **los cuatro niveles** para llegar a ella, así que se necesita al menos **una tabla por nivel**. Con tablas de 4 KB: 4 × 4 KB = **16 KB**.",
  diagrama: `Mínimo = n° de niveles × tamaño de página
       = 4 × 4 KB = 16 KB

Nivel1 → Nivel2 → Nivel3 → Nivel4 → página
 4KB      4KB      4KB      4KB`,
  descarte: "4 KB sería una tabla de un solo nivel, 8 KB de dos y 12 KB de tres. El error clásico es pensar que basta con la tabla raíz: sin las tablas intermedias no hay forma de llegar al marco final."
},

{
  id: "p3-34", pep: 3, num: 34, puntos: 1, tema: "Tabla multinivel",
  contexto: "Mismo sistema: 4 niveles, tablas de 512 entradas.",
  enunciado: "¿Cuál es el tamaño máximo que puede ocupar en memoria la tabla de páginas multinivel?",
  opciones: [
    "1 + 512 páginas",
    "1 + 512 + 512*512 páginas",
    "1 + 512 + 512*512 + 512*512*512 páginas",
    "1 + 512 + 512*512 + 512*512*512 + 512*512*512*512 páginas"
  ],
  correcta: 2,
  justificacion: "El máximo es la suma de **todas las tablas de todos los niveles**, y la serie lleva **un término por nivel**. Con 4 niveles: 1 tabla raíz, más 512 tablas de segundo nivel (una por cada entrada de la raíz), más 512² de tercer nivel, más 512³ de cuarto nivel.",
  diagrama: `Nivel 1:  1 tabla
Nivel 2:  512 tablas
Nivel 3:  512² tablas
Nivel 4:  512³ tablas
          ─────────────────────────
Máximo = 1 + 512 + 512² + 512³ páginas

(4 niveles ⇒ 4 términos en la serie)`,
  descarte: "La serie de 2 términos corresponde a 2 niveles y la de 3 términos a 3 niveles. La de **5 términos** es el error más tentador: agrega un 512⁴ que representaría un quinto nivel inexistente — las páginas de datos del proceso no son tablas y no se cuentan aquí."
},

{
  id: "p3-35", pep: 3, num: 35, puntos: 1, tema: "Espacio de direcciones",
  enunciado: "Un sistema computacional define direcciones virtuales de 24 bits, el cual puede configurarse con páginas de 2 KB o 4 KB. ¿Cuál de las siguientes aseveraciones es correcta para cualquier configuración?",
  opciones: [
    "El tamaño de la memoria física es de 16 MB.",
    "La imagen del proceso tiene un tamaño de 16 MB.",
    "La memoria física se divide en 4096 marcos.",
    "La imagen del proceso se divide en 8192 páginas."
  ],
  correcta: 1,
  justificacion: "Lo único que depende exclusivamente de los 24 bits de dirección virtual es el **tamaño de la imagen del proceso**: 2²⁴ = **16 MB**, sin importar si las páginas son de 2 KB o de 4 KB. Por eso es la única afirmación válida \"para cualquier configuración\", que es lo que pide el enunciado.",
  diagrama: `Imagen = 2²⁴ B = 16 MB   (fija, no depende de la página)

Con páginas de 2 KB → 16 MB / 2 KB = 8192 páginas
Con páginas de 4 KB → 16 MB / 4 KB = 4096 páginas
                       ↑
        el n° de páginas SÍ cambia según la configuración`,
  descarte: "Los 8192 páginas solo valen para la configuración de 2 KB, así que no sirve \"para cualquier configuración\". Y las dos alternativas sobre **memoria física** son indeducibles: con direcciones **virtuales** nunca puedes sacar el tamaño de la memoria física ni el número de marcos."
},

{
  id: "p3-36", pep: 3, num: 36, puntos: 2, tema: "Direcciones de memoria",
  contexto: "Un sistema soporta direcciones de 32 bits con páginas de 4 KB. Para mantener compatibilidad con el sistema anterior de 24 bits, se soportan direcciones de 31 bits dejando el bit más significativo como selector: si el bit está en cero se usa el esquema de 24 bits; si está en uno, el de 32 bits.",
  enunciado: "Para el sistema descrito, indique cuál es el número de página correspondiente a la dirección de memoria emitida.",
  opciones: [
    "Dirección virtual 0x7594384f, N° de página 0x84f.",
    "Dirección virtual 0x7e8f5a4f, N° de página 0x8f5.",
    "Dirección virtual 0x855d08c0, N° de página 0x8c0.",
    "Dirección virtual 0x8ffc40b5, N° de página 0xfc4."
  ],
  correcta: 1,
  justificacion: "El procedimiento tiene tres pasos. **Uno**: mirar el primer dígito hex para saber el bit 31 (si es 0–7 el bit vale 0 → esquema de 24 bits; si es 8–F vale 1 → esquema de 32 bits). **Dos**: quedarse con los bits que corresponden al esquema. **Tres**: quitar los 12 bits de offset (los **3 últimos dígitos hex**) y lo que queda es el número de página. En 0x7e8f5a4f el primer dígito es 7 → esquema de 24 bits → tomo `8f5a4f`, saco el offset `a4f` y queda **0x8f5** ✓.",
  diagrama: `0x7e8f5a4f  →  primer dígito 7 = 0111 → bit31 = 0
               → esquema de 24 bits (6 dígitos hex)

   8f5a4f
   └─┬┘└┬┘
     │   └── offset  = a4f   (12 bits = 3 dígitos)
     └────── página  = 8f5   ✓

Regla: el offset son SIEMPRE los 3 últimos dígitos hex
       (páginas de 4 KB = 2¹² = 12 bits).`,
  descarte: "En las alternativas a, c y d lo que se ofrece como \"número de página\" son en realidad los **3 últimos dígitos**, o sea el **offset**, no la página. Es el error clásico: hay que quedarse con lo que está **antes** de esos tres dígitos, no con ellos."
},

{
  id: "p3-37", pep: 3, num: 37, puntos: 2, tema: "Segmentación paginada",
  contexto: "Un sistema de 64 bits (16 exabytes) implementa segmentación y paginación combinadas. La imagen del proceso se divide en segmentos iguales de 2 GB. Se implementa una tabla de segmentos multinivel, donde cada tabla es de 16 KB con 2048 entradas.",
  enunciado: "Dado lo anterior, se puede afirmar:",
  opciones: [
    "Se requieren 53 bits en cada entrada de tabla para direccionar las tablas.",
    "Los 33 bits menos significativos de la dirección virtual se utilizan para la paginación.",
    "Cada entrada de tabla es de 4 bytes.",
    "Cuando solo se utiliza un segmento de 2 GB, el tamaño de la tabla de segmentos multinivel es de 48 KB."
  ],
  correcta: 3,
  justificacion: "Hay que armar el esquema paso a paso. Un segmento de 2 GB = 2³¹ consume **31 bits**, así que para el número de segmento quedan 64 − 31 = **33 bits**. Cada tabla tiene 2048 = 2¹¹ entradas, o sea **11 bits por nivel**, y por lo tanto 33 ÷ 11 = **3 niveles**. Usando un solo segmento hay que recorrer la cadena completa: 3 tablas × 16 KB = **48 KB**.",
  diagrama: `segmento = 2 GB = 2³¹     → 31 bits internos
bits de segmento = 64 − 31 = 33
entradas/tabla = 2048 = 2¹¹ → 11 bits por nivel
niveles = 33 / 11 = 3

Tamaño mínimo = 3 × 16 KB = 48 KB   ✓
Tamaño entrada = 16384 / 2048 = 8 bytes`,
  descarte: "Cada entrada mide 16384 ÷ 2048 = **8 bytes**, no 4. Los bits menos significativos dedicados a lo interno del segmento son **31**, no 33 (los 33 son para el número de segmento, que van en la parte alta). Y los 53 bits no salen de ningún cálculo con estos datos."
},

{
  id: "p3-38", pep: 3, num: 38, puntos: 1, tema: "TLB",
  enunciado: "Un sistema implementa 1 nivel de TLB. Indique cuál es el tiempo promedio de traducción de una dirección lógica a física cuando el 50% del tiempo se hace Hit en la TLB. Asuma que los procesos se encuentran completos en memoria. Considere tTLB = tiempo de acceso a la TLB y tM = tiempo de acceso a la memoria.",
  opciones: [
    "tTLB",
    "tM",
    "tTLB + (tM / 2)",
    "tM + (tTLB / 2)"
  ],
  correcta: 2,
  justificacion: "La TLB **se consulta siempre**, haya hit o no: ése es el `tTLB` que aparece en todos los casos. Si hay hit (50 %) ahí termina el trabajo. Si hay miss (el otro 50 %) hay que ir además a la tabla de páginas en memoria, o sea sumar `tM`. Promediando: tTLB + 0,5 × tM = **tTLB + tM/2**.",
  diagrama: `Fórmula general:  t = t_TLB + (1 − h) · t_M

con h = 0,5:
   t = t_TLB + (1 − 0,5) · t_M
     = t_TLB + 0,5 · t_M
     = t_TLB + t_M / 2      ✓`,
  descarte: "`tTLB` solo sería correcto con 100 % de hit, y `tM` si no existiera TLB. La cuarta alternativa invierte los roles: divide por dos el acceso a la TLB, cuando en realidad la TLB se consulta **completa siempre** y lo que se paga a medias es el acceso a memoria."
},

{
  id: "p3-39", pep: 3, num: 39, puntos: 1, tema: "Segmentación paginada",
  contexto: "Un sistema implementa memoria virtual con segmentación paginada, con tabla de 3 niveles: 1 nivel para segmento y 2 niveles para páginas. Cada tabla de página cabe exactamente en una página.",
  enunciado: "Dado lo anterior se puede afirmar que:",
  tabla: {"head":["Primer nivel","Segundo nivel","Tercer nivel","offset"],"rows":[["2 bits","9 bits","9 bits","12 bits"]]},
  opciones: [
    "El tamaño máximo de la imagen del proceso es de 1 GB.",
    "Una entrada de tabla de página es de 8 bytes.",
    "El tamaño de página es de 2 KB.",
    "El número de segmentos por proceso es 2."
  ],
  correcta: 1,
  justificacion: "Los 12 bits de offset dan páginas de 2¹² = **4 KB**. Los niveles de página usan 9 bits, o sea 2⁹ = **512 entradas** por tabla. Y como cada tabla debe caber exactamente en una página: tamaño de entrada = 4096 ÷ 512 = **8 bytes**.",
  diagrama: `offset = 12 bits   →  página = 2¹² = 4 KB
nivel de página = 9 bits → 512 entradas por tabla

entrada = tamaño página / entradas
        = 4096 / 512 = 8 bytes   ✓

Imagen total = 2^(2+9+9+12) = 2³² = 4 GB
Segmentos    = 2² = 4`,
  descarte: "La imagen es 2³² = **4 GB**, no 1 GB (hay que sumar todos los campos: 2+9+9+12 = 32 bits). La página es de 4 KB, no de 2 KB (2 KB serían 11 bits de offset). Y los segmentos son 2² = **4**, no 2 — el error es confundir la cantidad de bits con la cantidad de segmentos."
},

{
  id: "p3-40", pep: 3, num: 40, puntos: 2, tema: "Segmentación paginada",
  contexto: "Mismo esquema (2 bits de segmento, 9 bits, 9 bits y 12 bits de offset). Suponga ahora que todos los segmentos tienen como máximo 512 páginas.",
  enunciado: "Indique cuál de las siguientes direcciones de memoria es válida.",
  opciones: [
    "0x04163af2",
    "0xaa209194",
    "0x801de2f8",
    "0xfffcff8d"
  ],
  correcta: 2,
  justificacion: "Si cada segmento tiene a lo más **512 páginas**, con 9 bits (2⁹ = 512) alcanza y sobra para numerarlas: basta **un solo nivel** de tabla de páginas. Eso significa que el campo del **segundo nivel debe ser cero** en toda dirección válida — si no lo fuera, estaría apuntando a más páginas de las que el segmento puede tener. Al descomponer 0x801de2f8 en binario, ese campo da exactamente 0.",
  diagrama: `0x801de2f8 = 1000 0000 0001 1101 1110 0010 1111 1000

| 2 bits | 9 bits | 9 bits | 12 bits |
   10      000000000  111011110  001011111000
   seg=2   2°niv = 0  3°niv=478   offset
              ↑
        ¡CERO!  →  DIRECCIÓN VÁLIDA  ✓

En las otras tres el campo de 2° nivel es distinto de 0,
o sea apuntan más allá de las 512 páginas del segmento.`,
  descarte: "En 0x04163af2, 0xaa209194 y 0xfffcff8d el campo de segundo nivel (bits 29 a 21) es distinto de cero, lo que implicaría que el segmento tiene más de 512 páginas — contradiciendo el enunciado. Truco: pasa la dirección a binario y aísla los 9 bits que siguen a los 2 del segmento."
},

{
  id: "p3-41", pep: 3, num: 41, puntos: 1, tema: "RAID",
  enunciado: "En relación a los sistemas RAID, ¿cuál de las siguientes aseveraciones es verdadera?",
  opciones: [
    "RAID4 y RAID5 muestran el mismo rendimiento en tiempos de acceso en todos los casos.",
    "RAID4 es más barato (inversión) que RAID5.",
    "En algunos casos, RAID5 puede mostrar mejores rendimientos en tiempos de acceso que RAID4.",
    "RAID4 usa un algoritmo de paridad distinto al algoritmo de RAID5."
  ],
  correcta: 2,
  justificacion: "RAID 5 **distribuye** la paridad entre todos los discos, mientras que RAID 4 la concentra en uno solo. Esa diferencia se nota especialmente con **escrituras pequeñas y concurrentes**: en RAID 4 todas hacen fila para actualizar el único disco de paridad (cuello de botella), mientras que en RAID 5 pueden ir en paralelo a discos distintos. Fíjate en el \"en algunos casos\": es lo que hace correcta y matizada a la afirmación.",
  descarte: "No rinden igual \"en todos los casos\", justamente por lo anterior. Cuestan lo mismo: ambos usan la misma cantidad de discos (N datos + 1 de paridad). Y el **algoritmo de paridad es idéntico** en los dos (XOR); lo único que cambia es **dónde** se guarda el resultado."
},

{
  id: "p3-42", pep: 3, num: 42, puntos: 1, tema: "Disco (HDD)",
  contexto: "Un disco mecánico o HDD cuenta con: número de platos (o superficies) 8; número de pistas por superficie 512 K (512 × 2¹⁰); número de bytes por pista 8 MB; número de sectores por pista 8 K (8 × 2¹⁰).",
  enunciado: "¿Cuál es el tamaño de un sector?",
  opciones: [
    "512 bytes",
    "1 KB",
    "2 KB",
    "4 KB"
  ],
  correcta: 1,
  justificacion: "División directa: **tamaño de sector = bytes por pista ÷ sectores por pista**. Pasando todo a potencias de 2: 8 MB = 2²³ bytes y 8 K = 2¹³ sectores. Entonces 2²³ ÷ 2¹³ = 2¹⁰ = **1 KB**.",
  diagrama: `sector = bytes por pista / sectores por pista
       = 8 MB / 8 K
       = 2²³ / 2¹³
       = 2¹⁰  =  1 KB   ✓

(dividir potencias de 2 = RESTAR exponentes)`,
  descarte: "Los 512 bytes son el tamaño de sector **tradicional** en discos reales, y por eso es el distractor más tentador — pero aquí hay que calcularlo con los datos del enunciado, no con la costumbre. Los otros valores salen de errores al convertir MB y K a potencias de 2."
},

{
  id: "p3-43", pep: 3, num: 43, puntos: 1, tema: "Disco (HDD)",
  contexto: "Mismo disco: 8 superficies, 512 K pistas por superficie, 8 MB por pista, 8 K sectores por pista.",
  enunciado: "¿Cuál es el tamaño o capacidad total del disco?",
  opciones: [
    "4 TB",
    "32 TB",
    "32 GB",
    "512 GB"
  ],
  correcta: 1,
  justificacion: "La capacidad es el producto de las tres dimensiones: **superficies × pistas por superficie × bytes por pista**. En potencias de 2: 2³ × 2¹⁹ × 2²³ = 2^(3+19+23) = **2⁴⁵**. Y como 2⁴⁰ = 1 TB, entonces 2⁴⁵ = 2⁵ TB = **32 TB**.",
  diagrama: `superficies       = 8      = 2³
pistas/superficie = 512 K  = 2⁹ × 2¹⁰ = 2¹⁹
bytes/pista       = 8 MB   = 2³ × 2²⁰ = 2²³

Capacidad = 2³ × 2¹⁹ × 2²³ = 2⁴⁵

2⁴⁰ = 1 TB  ⇒  2⁴⁵ = 32 TB   ✓`,
  descarte: "Multiplicar potencias de 2 es **sumar** los exponentes: el error más común es equivocarse al convertir (512 K = 2¹⁹, no 2⁹). ⚠ Ojo también con el dato de \"platos\": si el enunciado dijera **platos** en vez de superficies, habría que multiplicar por 2 (cada plato tiene dos caras). Aquí el enunciado aclara que los 8 son superficies."
},

{
  id: "p3-44", pep: 3, num: 44, puntos: 1, tema: "Planificación de disco",
  contexto: "La cabeza lectora de un disco de un plato se encuentra en la pista 18 y se mueve hacia pistas mayores. La secuencia de requerimientos de I/O es: 5, 20, 1, 60, 3, 8, 90, 2, 20, 40, 6, 70",
  enunciado: "¿Cuál es el número de pistas recorridas en total por la cabeza lectora para servir todos los requerimientos, con FIFO (FCFS)?",
  opciones: [
    "474",
    "519",
    "525",
    "534"
  ],
  correcta: 0,
  justificacion: "FIFO atiende **estrictamente en el orden de llegada**, sin optimizar nada. Basta con sumar las distancias absolutas entre cada pista y la siguiente, partiendo desde la 18. La dirección inicial de la cabeza es irrelevante en FIFO: igual va a tener que ir a donde le pidan.",
  diagrama: `18→5  =13    5→20 =15    20→1 =19    1→60 =59
60→3  =57    3→8  = 5    8→90 =82   90→2 =88
2→20  =18   20→40 =20   40→6  =34    6→70 =64

13+15+19+59+57+5+82+88+18+20+34+64 = 474  ✓`,
  descarte: "Los otros valores salen de equivocarse en alguna resta o de olvidar el salto inicial desde la pista 18. Consejo: anota las 12 diferencias en columna y súmalas de a poco — es puro cálculo, pero es fácil perderse a mitad de camino."
},

{
  id: "p3-45", pep: 3, num: 45, puntos: 2, tema: "Planificación de disco",
  contexto: "Misma situación: cabeza en la pista 18, requerimientos 5, 20, 1, 60, 3, 8, 90, 2, 20, 40, 6, 70",
  enunciado: "¿Cuál es el número de pistas recorridas en total por la cabeza lectora para servir todos los requerimientos, con SSTF (tiempo de servicio más corto primero)?",
  opciones: [
    "108",
    "110",
    "119",
    "150"
  ],
  correcta: 1,
  justificacion: "SSTF salta siempre al requerimiento **más cercano** a la posición actual, sin importar la dirección. Desde la 18 lo más cerca es la 20 (a 2 pistas), y desde ahí se atiende el otro 20 sin moverse (distancia 0). Después baja atendiendo el grupo de pistas pequeñas y finalmente sube hacia las grandes. Total: **110**.",
  diagrama: `18→20 = 2     20→20 = 0     20→8  =12     8→6  = 2
 6→5  = 1      5→3  = 2      3→2  = 1     2→1  = 1
 1→40 =39     40→60 =20     60→70 =10    70→90 =20

2+0+12+2+1+2+1+1+39+20+10+20 = 110  ✓

Compara con FIFO (474): SSTF recorre 4 veces menos.`,
  descarte: "108 sale de olvidar el requerimiento repetido de la pista 20 o alguna distancia chica. 119 y 150 corresponden a caminos distintos, típicamente de aplicar SCAN/LOOK (que sí respetan la dirección de movimiento) en vez de SSTF puro. Recuerda: **SSTF no mira la dirección**, solo la distancia."
},

{
  id: "p3-46", pep: 3, num: 46, puntos: 1, tema: "Requerimientos de memoria",
  enunciado: "¿Cuál de las siguientes afirmaciones es correcta para los requerimientos de un sistema de administración de memoria virtual?",
  opciones: [
    "El SO puede ubicar un proceso en cualquier lugar de la memoria física. Para lograrlo, los procesos emiten direcciones de memoria físicas.",
    "Los procesos emiten direcciones de memoria lógicas siempre válidas, lo que asegura el requerimiento de protección.",
    "Es posible proveer compartición al mantener copias privadas de datos entre varios procesos.",
    "El movimiento entre los diferentes niveles de memoria es responsabilidad del SO."
  ],
  correcta: 3,
  justificacion: "Ése es el requerimiento de **organización física**: decidir qué páginas están en memoria principal y cuáles en disco, cuándo traerlas y cuándo sacarlas, es trabajo del sistema operativo. El programador no tiene que escribir ni una línea para gestionar el swap — de eso se trata la memoria virtual, de darle al proceso la ilusión de que todo está en memoria.",
  descarte: "Para poder reubicar, los procesos deben emitir direcciones **lógicas**, no físicas (la primera se contradice a sí misma). Las direcciones lógicas **no son siempre válidas**: precisamente por eso el hardware las valida contra los límites, y de ahí surge la protección. Y la **compartición** consiste en apuntar a la **misma** región física desde varios procesos, no en mantener copias privadas — eso sería lo opuesto."
},

{
  id: "p3-47", pep: 3, num: 47, puntos: 1, tema: "Fragmentación",
  enunciado: "Con respecto a la fragmentación es posible afirmar que:",
  opciones: [
    "La fragmentación interna ocurre en sistemas de particionamiento fijo y en segmentación.",
    "La fragmentación externa ocurre en sistemas de particionamiento dinámico y en paginación.",
    "La fragmentación interna ocurre en sistemas de particionamiento tipo buddy y en paginación.",
    "La fragmentación externa ocurre en sistemas de particionamiento fijo y en tipo buddy."
  ],
  correcta: 2,
  justificacion: "Vale la pena memorizar el mapa completo. **Interna**: particionamiento fijo, paginación y buddy — los tres asignan bloques de tamaño predefinido, así que siempre sobra algo dentro del bloque. **Externa**: particionamiento dinámico, segmentación y buddy — los tres dejan huecos entre asignaciones. Fíjate que **buddy aparece en ambas listas**, y por eso la alternativa correcta lo junta con paginación.",
  diagrama: `INTERNA          │  EXTERNA
─────────────────┼──────────────────
 fijo            │  dinámico
 paginación      │  segmentación
 buddy  ←────────┼──→ buddy

(buddy sufre las dos: redondea a potencias de 2
 y además deja huecos entre bloques)`,
  descarte: "La segmentación produce fragmentación **externa**, no interna (los segmentos se ajustan al tamaño real). La paginación produce **interna**, no externa (los marcos son todos iguales, no quedan huecos inutilizables). Y el particionamiento fijo produce **interna**, no externa."
},

{
  id: "p3-48", pep: 3, num: 48, puntos: 1, tema: "Memoria virtual",
  enunciado: "En un sistema de administración de memoria virtual con paginación se puede indicar que:",
  opciones: [
    "Para obtener la dirección física, se suma el número de página al offset de la dirección lógica.",
    "La cantidad de marcos en memoria es siempre la misma cantidad de páginas en que puede ser dividido el proceso.",
    "La tabla de páginas se encuentra paginada y sólo una porción de esta está en memoria.",
    "Todas las entradas de tabla de página contienen números de marco válidos."
  ],
  correcta: 2,
  justificacion: "En sistemas grandes la tabla de páginas es enorme (recuerda: con 48 bits serían 2³⁶ entradas), así que **ella misma se pagina**: se organiza en múltiples niveles y solo las porciones efectivamente usadas se mantienen en memoria, mientras el resto puede estar en disco. Ésa es la razón de existir de las tablas multinivel.",
  descarte: "Para obtener la física se **concatena marco ‖ offset**, y además se usa el número de **marco**, no el de página (sumar es lo de segmentación). La cantidad de marcos y de páginas es **independiente**: lo típico es tener muchas más páginas que marcos. Y las entradas con el bit de presencia en 0 apuntan a páginas que están en disco, así que **no** todas tienen marco válido."
},

{
  id: "p3-49", pep: 3, num: 49, puntos: 1, tema: "Espacio de direcciones",
  contexto: "Un proceso emite las siguientes direcciones de memoria: 0x5601ab164189 / 0x5601ac2e32a0 / 0x7fff6705fa10",
  enunciado: "Teniendo en consideración las direcciones emitidas ¿Cuál es el tamaño del espacio de direcciones virtuales o imagen del proceso?",
  opciones: [
    "4 GB",
    "256 GB",
    "1 TB",
    "256 TB"
  ],
  correcta: 3,
  justificacion: "Cuenta los dígitos hexadecimales de cualquiera de las direcciones: son **12**. Como cada dígito hex equivale a 4 bits, estamos ante direcciones de 12 × 4 = **48 bits**. El espacio de direcciones es entonces 2⁴⁸ bytes, y como 2⁴⁰ = 1 TB, resulta 2⁸ TB = **256 TB**.",
  diagrama: `0x5601ab164189  →  12 dígitos hex
                   12 × 4 bits = 48 bits

Imagen = 2⁴⁸ B

2⁴⁰ = 1 TB   ⇒   2⁴⁸ = 2⁸ TB = 256 TB   ✓

Recuerda: 2¹⁰=K, 2²⁰=M, 2³⁰=G, 2⁴⁰=T`,
  descarte: "4 GB correspondería a direcciones de 32 bits (8 dígitos hex). El truco que nunca falla en estas preguntas: **cuenta los dígitos hexadecimales y multiplica por 4** para saber cuántos bits tiene la dirección."
},

{
  id: "p3-50", pep: 3, num: 50, puntos: 2, tema: "Tabla de páginas",
  contexto: "En un sistema de 32 bits se implementa memoria virtual con paginación, donde el tamaño máximo de una página es de 2048 bytes y la memoria física es de 128 MBytes. Asuma que no hay bits de control.",
  enunciado: "Dado lo anterior, se puede afirmar que:",
  opciones: [
    "Se necesita 1 byte para el número de marco en cada entrada de la tabla de páginas.",
    "La tabla de páginas es de 4 MB.",
    "Se necesitan 11 bits para el número de página en la dirección virtual.",
    "Se necesitan 8 bits para el número de marco."
  ],
  correcta: 1,
  justificacion: "Encadenamos los cálculos. **Offset** = log₂(2048) = 11 bits, así que el **número de página** ocupa 32 − 11 = 21 bits → 2²¹ entradas. **Marcos** = 128 MB ÷ 2 KB = 2²⁷ ÷ 2¹¹ = 2¹⁶, o sea 16 bits = **2 bytes por entrada**. Tabla = 2²¹ × 2 = 2²² = **4 MB**.",
  diagrama: `offset  = log₂(2048)  = 11 bits
n° página = 32 − 11    = 21 bits  →  2²¹ entradas

marcos  = 128 MB / 2 KB = 2²⁷/2¹¹ = 2¹⁶
        → 16 bits = 2 bytes por entrada

Tabla = 2²¹ × 2 B = 2²² B = 4 MB   ✓`,
  descarte: "El número de marco necesita **16 bits = 2 bytes**, no 1 byte ni 8 bits. Y los **11 bits son del offset**, no del número de página: ése es el error que busca pillar la tercera alternativa, invertir los dos campos."
},

{
  id: "p3-51", pep: 3, num: 51, puntos: 1, tema: "Traducción de direcciones",
  contexto: "Mismo sistema: páginas de 2048 bytes (11 bits de offset), sistema de 32 bits.",
  enunciado: "Dada la dirección virtual 0x01AEB211 ¿cuál es su correspondiente dirección física? Suponga que el marco donde se aloja la página es el 33 (decimal) y que la dirección lógica es válida.",
  opciones: [
    "0x00010A11",
    "0x00010611",
    "0x00008A11",
    "0x00008611"
  ],
  correcta: 0,
  justificacion: "La dirección física se arma **concatenando** el número de marco con el offset. El offset son los **11 bits menos significativos** de 0x01AEB211, que dan 0x211 (529 en decimal). Y el marco 33 aporta 33 × 2048 = 67584. Sumando la contribución de cada parte: 67584 + 529 = 68113 = **0x00010A11**.",
  diagrama: `Offset = 11 bits menos significativos de 0x01AEB211
       = 0x211 = 529

Marco 33 × 2048 B = 67584

Física = 67584 + 529 = 68113 = 0x00010A11   ✓

(Ojo: se CONCATENA marco ‖ offset. Como el offset es
 de 11 bits —no un múltiplo de 4— el resultado no se
 lee "pegando" dígitos hex; conviene pasar a decimal.)`,
  descarte: "Los otros valores salen de tomar 12 bits de offset en vez de 11 (o sea leer 0x211 como si fueran 3 dígitos hex completos alineados) o de usar un marco equivocado. El detalle fino es que **11 bits no calzan con dígitos hexadecimales enteros**, así que la concatenación directa en hex confunde: es más seguro calcular en decimal."
},

{
  id: "p3-52", pep: 3, num: 52, puntos: 2, tema: "Segmentación",
  contexto: "En un sistema de 16 bits se implementa memoria virtual con segmentación, donde el tamaño máximo de un segmento es 4 KBytes y cada entrada en la tabla de segmentos cuenta con 1 bit de presencia, 1 bit de modificación y 2 bits de control más.",
  enunciado: "Con lo anterior se puede calcular que:",
  opciones: [
    "El ancho de una entrada en la tabla de segmentos es de 2 bytes.",
    "La tabla de segmentos tiene 32 entradas.",
    "El tamaño de la tabla de segmentos es de 64 bytes.",
    "La cantidad máxima de segmentos posible en este sistema es 4."
  ],
  correcta: 2,
  justificacion: "Vamos por partes. El segmento máximo de 4 KB consume **12 bits**, así que para el número de segmento quedan 16 − 12 = **4 bits** → 2⁴ = **16 entradas**. Cada entrada necesita la **base** (16 bits), el **límite** (12 bits) y **4 bits** de control = 32 bits = **4 bytes**. Total: 16 × 4 = **64 bytes**.",
  diagrama: `segmento máx = 4 KB = 2¹²  →  12 bits de offset
bits de segmento = 16 − 12 = 4  →  2⁴ = 16 entradas

Entrada = base(16) + límite(12) + control(4)
        = 32 bits = 4 bytes

Tabla = 16 × 4 B = 64 bytes   ✓`,
  descarte: "La entrada mide **4 bytes**, no 2 (con 2 bytes ni siquiera cabría la dirección base completa). Las entradas son **16**, no 32 ni 4: 32 saldría de usar 5 bits y 4 de usar 2 bits para el número de segmento."
},

{
  id: "p3-53", pep: 3, num: 53, puntos: 1, tema: "Segmentación",
  contexto: "Mismo sistema de 16 bits (4 bits de segmento, 12 bits de offset).",
  enunciado: "Para la dirección virtual 0x12F0, suponga que la entrada en la tabla de segmento indica que el segmento comienza en 0x2020 y el largo del segmento es de 3486 direcciones de memoria. Indique cuál es la dirección física correspondiente y si esta es válida o no.",
  opciones: [
    "La dirección física es 0x2310 y es válida.",
    "La dirección física es 0x2310 y es inválida.",
    "La dirección física es 0x3310 y es válida.",
    "La dirección física es 0x3310 y es inválida."
  ],
  correcta: 0,
  justificacion: "Primero se separa: con 12 bits de offset, en 0x12F0 el segmento es el **1** y el offset es **0x2F0 = 752**. Después se valida: 752 < 3486, así que la dirección **es válida**. Y recién ahí se traduce **sumando** (segmentación siempre suma): 0x2020 + 0x2F0 = **0x2310**.",
  diagrama: `0x12F0  →  segmento = 1,  offset = 0x2F0 = 752

¿752 < 3486?   SÍ  →  VÁLIDA  ✓

Física = base + offset          (SUMAR, no concatenar)
       = 0x2020 + 0x02F0
       = 0x2310   ✓

  2020
+ 02F0
  ────
  2310`,
  descarte: "0x3310 sale de sumar mal en hexadecimal (recuerda que se lleva al pasar de 16, no de 10). Y marcarla como inválida sería no comparar bien el offset contra el límite: 752 está cómodamente dentro de las 3486 direcciones del segmento."
},

{
  id: "p3-54", pep: 3, num: 54, puntos: 2, tema: "Tabla multinivel",
  contexto: "En un sistema de 32 bits se implementa memoria virtual con tabla de páginas multinivel. Las páginas son de 4 KB, las entradas en todas las tablas son de 4 bytes y cada tabla cabe exactamente en una página.",
  enunciado: "Podemos afirmar que:",
  opciones: [
    "Se requieren 10 bits para el offset.",
    "El tamaño de la tabla índice es de 2 páginas.",
    "Se reservan los 20 bits más significativos de la dirección virtual para el número de página.",
    "El tamaño máximo que puede alcanzar en memoria la tabla de páginas multinivel es de 4100 KB."
  ],
  correcta: 3,
  justificacion: "Con páginas de 4 KB el offset es de **12 bits**, quedan 20 bits de número de página. Entradas por tabla = 4096 ÷ 4 = **1024** → 10 bits por nivel → 20 ÷ 10 = **2 niveles**. El máximo es entonces 1 tabla índice + 1024 tablas de segundo nivel = **1025 páginas** × 4 KB = 4100 KB.",
  diagrama: `entradas/tabla = 4 KB / 4 B = 1024 = 2¹⁰ → 10 bits
offset = 12 bits, n° página = 20 bits → 2 niveles

Máximo = (1 + 1024) páginas × 4 KB
       = 1025 × 4 KB
       = 4100 KB   ✓`,
  descarte: "El offset es de **12** bits, no 10 (10 bits darían páginas de 1 KB). La tabla índice ocupa **1** página, no 2. ⚠ Ojo: la alternativa c (\"20 bits más significativos para el número de página\") **también es verdadera**, pero al valer 2 puntos la pregunta apunta al cálculo del máximo; si en la pauta aparece la c, no te compliques, ambas describen bien el sistema."
},

{
  id: "p3-55", pep: 3, num: 55, puntos: 2, tema: "Tabla multinivel",
  contexto: "Un sistema de 32 bits implementa memoria virtual con paginación y tabla multinivel. El primer nivel (siempre en memoria) es una pequeña tabla con 4 entradas de 64 bits cada una. El resto también contiene entradas de 64 bits y caben exactamente en una página. La memoria física está dividida en marcos de 4 KB.",
  enunciado: "¿Cuál de las siguientes afirmaciones es correcta?",
  opciones: [
    "El tamaño máximo de memoria virtual direccionable es 256 TB.",
    "Cada tabla cabe exactamente en una página.",
    "El esquema de tabla de páginas multinivel es de 3 niveles.",
    "Una dirección lógica se compone de 2 bits para el primer nivel, 9 bits para el segundo nivel, 9 bits para el tercer nivel y 4 bits para el offset."
  ],
  correcta: 2,
  justificacion: "Se arma sumando bits hasta llegar a 32. El **offset** es 12 bits (páginas de 4 KB). El **primer nivel** tiene 4 entradas → 2 bits. Los demás niveles tienen 4096 ÷ 8 = **512 entradas** → 9 bits cada uno. Entonces: 2 + 9 + 9 + 12 = 32 ✓, o sea **3 niveles**.",
  diagrama: `entradas nivel 1 = 4        → 2 bits
entradas resto   = 4096/8 = 512 → 9 bits
offset (4 KB)               → 12 bits

2 + 9 + 9 + 12 = 32 bits   ✓  →  3 NIVELES

| 2 | 9 | 9 | 12 |
 n1  n2  n3  offset`,
  descarte: "Con 32 bits el espacio virtual es 2³² = **4 GB**, no 256 TB (eso sería de 48 bits). No todas las tablas caben en una página: la del **primer nivel** son apenas 4 × 8 = 32 bytes. Y la última alternativa acierta con los niveles pero pone **4 bits de offset**, cuando son 12: sumaría solo 24 bits en total."
},

{
  id: "p3-56", pep: 3, num: 56, puntos: 1, tema: "Segmentación paginada",
  contexto: "En un sistema de administración de memoria, las direcciones virtuales siguen el formato indicado.",
  enunciado: "Para el formato anterior, se puede afirmar que:",
  tabla: {"head":["N° de segmento","N° de página","offset"],"rows":[["2 bits","16 bits","8 bits"]]},
  opciones: [
    "El sistema implementa una tabla de páginas multinivel de dos niveles y páginas de 256 bytes.",
    "El tamaño máximo de los segmentos es de 16 MB.",
    "La cantidad máxima de segmentos para el sistema es 2 por proceso.",
    "Todos los segmentos son de igual tamaño."
  ],
  correcta: 1,
  justificacion: "El tamaño máximo de un segmento sale de multiplicar cuántas páginas caben en él por cuánto mide cada página: 2¹⁶ páginas × 2⁸ bytes = 2²⁴ = **16 MB**. También se puede pensar directamente: los 16 + 8 = 24 bits que quedan tras el número de segmento dan 2²⁴ = 16 MB.",
  diagrama: `| 2 bits | 16 bits | 8 bits |
   seg      página    offset

Tamaño página   = 2⁸  = 256 B
Páginas/segmento= 2¹⁶
Segmento máx    = 2¹⁶ × 2⁸ = 2²⁴ = 16 MB   ✓
Segmentos       = 2²  = 4`,
  descarte: "Los segmentos son **4** (2² con 2 bits), no 2: el error es confundir la cantidad de bits con la cantidad de elementos. Aquí hay **un solo nivel** de tabla de páginas (los 16 bits van en un único campo), no dos. Y los segmentos **no** son todos iguales: 16 MB es el **máximo**, cada uno puede ser más chico."
},

{
  id: "p3-57", pep: 3, num: 57, puntos: 1, tema: "Fragmentación",
  contexto: "Mismo sistema.",
  enunciado: "Si disminuimos el tamaño de página ¿qué efecto tendrá sobre la fragmentación?",
  tabla: {"head":["N° de segmento","N° de página","offset"],"rows":[["2 bits","16 bits","8 bits"]]},
  opciones: [
    "La fragmentación interna disminuirá en todas las páginas del proceso.",
    "La fragmentación interna aumentará en todas las páginas del proceso.",
    "La fragmentación interna disminuirá en la última página del proceso.",
    "La fragmentación interna aumentará en la última página del proceso."
  ],
  correcta: 2,
  justificacion: "Hay que ser precisos en **dónde** vive la fragmentación interna: solo en la **última página** del proceso, porque todas las anteriores están llenas al 100 %. Y como el desperdicio máximo posible es \"el tamaño de página menos un byte\", al achicar la página se achica también ese desperdicio.",
  diagrama: `Proceso de 5000 bytes:

Con páginas de 4 KB:  [4096 llena][904 usados + 3192 perdidos]
Con páginas de 2 KB:  [2048][2048][904 usados + 1144 perdidos]
                                              ↑
                                    menos desperdicio

Solo la ÚLTIMA página sufre fragmentación interna.`,
  descarte: "Decir \"todas las páginas\" es el error conceptual: las páginas intermedias están completamente ocupadas, no desperdician nada. Y la fragmentación **aumenta** con páginas grandes, no con páginas chicas — ojo con el costo: páginas más chicas significan tablas de páginas más grandes, así que es un intercambio."
},

{
  id: "p3-58", pep: 3, num: 58, puntos: 1, tema: "Particionamiento fijo",
  enunciado: "En un sistema de administración de memoria que implementa particionamiento fijo, si se aloja un proceso de 4096 KB en particiones de 2048 KB:",
  opciones: [
    "Se produce fragmentación interna de 2048 KB.",
    "Se produce fragmentación externa de 2048 KB.",
    "Se asigna una partición al proceso.",
    "Se asignan dos particiones al proceso."
  ],
  correcta: 1,
  justificacion: "En particionamiento fijo un proceso ocupa **exactamente una partición**: no se pueden encadenar dos. Como el proceso pesa 4096 KB y la partición mide 2048 KB, **el proceso no cabe** y esa partición no puede serle asignada. Ese espacio de 2048 KB queda disponible pero **inutilizable para este proceso**, y desperdicio que queda *fuera* de lo asignado es, por definición, **fragmentación externa**.",
  diagrama: `Proceso: 4096 KB        Particiones: 2048 KB c/u

  [ 2048 KB ] [ 2048 KB ] ...
       ↑
  el proceso no cabe en ninguna, y no se pueden unir
  → los 2048 KB quedan inservibles PARA ÉL = frag. EXTERNA`,
  descarte: "⚠ Ojo, porque esto choca con la regla general: el particionamiento fijo normalmente produce fragmentación **interna** (el espacio que sobra *dentro* de la partición cuando el proceso es más chico). Aquí pasa lo contrario — el proceso es **más grande** que la partición —, y por eso el desperdicio queda afuera. No se asignan dos particiones porque el esquema no lo permite."
},

{
  id: "p3-59", pep: 3, num: 59, puntos: 1, tema: "Espacio de direcciones",
  contexto: "Un sistema con 32 GB de memoria física implementa paginación con páginas de 4 KB y tabla multinivel. Cada entrada de tabla es de 8 bytes y cada tabla cabe exactamente en una página. Una dirección posible en este sistema es 0x7fffc9638f60.",
  enunciado: "¿Cuál de las siguientes aseveraciones es verdadera?",
  opciones: [
    "La imagen del proceso es de 128 TB.",
    "El espacio de direcciones del proceso es de 2³² bytes.",
    "El total máximo de páginas por proceso es de 2³⁶.",
    "El total de marcos en memoria es de 2²²."
  ],
  correcta: 2,
  justificacion: "La dirección tiene **12 dígitos hexadecimales** → 48 bits. Con páginas de 4 KB = 2¹² el offset es de 12 bits, así que el número de páginas es 2⁴⁸ ÷ 2¹² = **2³⁶**.",
  diagrama: `0x7fffc9638f60 → 12 dígitos hex × 4 = 48 bits

Imagen        = 2⁴⁸ B = 256 TB
Páginas       = 2⁴⁸ / 2¹² = 2³⁶     ✓
Marcos        = 32 GB / 4 KB
              = 2³⁵ / 2¹² = 2²³     (no 2²²)`,
  descarte: "La imagen es 2⁴⁸ = **256 TB**, no 128 TB. El espacio no es 2³² (eso sería un sistema de 32 bits, o sea 8 dígitos hex). Y los marcos son 32 GB ÷ 4 KB = 2³⁵ ÷ 2¹² = **2²³**, no 2²² — ojo con la conversión: 32 GB = 2⁵ × 2³⁰ = 2³⁵."
},

{
  id: "p3-60", pep: 3, num: 60, puntos: 1, tema: "Tabla multinivel",
  contexto: "Mismo sistema: direcciones de 48 bits, páginas de 4 KB, entradas de 8 bytes, cada tabla cabe en una página.",
  enunciado: "¿Cuántos niveles tiene la tabla de páginas multinivel?",
  opciones: [
    "1 nivel",
    "2 niveles",
    "3 niveles",
    "4 niveles"
  ],
  correcta: 3,
  justificacion: "La receta de siempre: entradas por tabla = 4096 ÷ 8 = **512**, bits por nivel = log₂(512) = **9**, bits de número de página = 48 − 12 = **36**. Entonces 36 ÷ 9 = **4 niveles**.",
  diagrama: `entradas/tabla = 4 KB / 8 B = 512
bits por nivel = log₂(512)   = 9
bits de página = 48 − 12     = 36
niveles        = 36 / 9      = 4   ✓

| 9 | 9 | 9 | 9 | 12 |`,
  descarte: "Menos niveles significaría entradas más grandes o direcciones más cortas. Este esquema de 4 niveles con 512 entradas es exactamente el de x86-64 real, así que vale la pena que se te quede grabado."
},

{
  id: "p3-61", pep: 3, num: 61, puntos: 2, tema: "Tabla multinivel",
  contexto: "Mismo sistema (48 bits, 4 niveles con páginas de 4 KB). Para disminuir el impacto de recorrer los niveles, se configuran páginas del proceso de 2 MB, manteniendo las páginas de la tabla en 4 KB.",
  enunciado: "Dado lo anterior, el proceso de traducción es:",
  opciones: [
    "25% más rápido",
    "50% más rápido",
    "75% más rápido",
    "100% más rápido"
  ],
  correcta: 0,
  justificacion: "Con páginas de **2 MB = 2²¹**, el offset pasa a ser de 21 bits, así que el número de página se reduce a 48 − 21 = **27 bits**. Como cada nivel sigue consumiendo 9 bits, ahora hacen falta 27 ÷ 9 = **3 niveles** en vez de 4. Se elimina un acceso de cuatro: **25 % más rápido**.",
  diagrama: `ANTES (páginas de 4 KB):
  offset = 12 bits → n° página = 36 → 36/9 = 4 niveles
  | 9 | 9 | 9 | 9 | 12 |

DESPUÉS (páginas de 2 MB):
  offset = 21 bits → n° página = 27 → 27/9 = 3 niveles
  | 9 | 9 | 9 | 21 |

Ahorro = 1 acceso de 4 = 25 %   ✓`,
  descarte: "50 % sería pasar de 4 a 2 niveles y 75 % de 4 a 1. El truco está en calcular el nuevo offset: log₂(2 MB) = log₂(2²¹) = 21 bits. Fíjate que las tablas siguen siendo de 4 KB, así que los 9 bits por nivel no cambian."
},

{
  id: "p3-62", pep: 3, num: 62, puntos: 1, tema: "Sistema de archivos",
  enunciado: "¿Cuál de las siguientes afirmaciones NO corresponde a un VFS o Virtual File System?",
  opciones: [
    "Corresponde a una capa que provee una interfaz unificada a los procesos para comunicarse con uno o más sistemas de administración de archivos.",
    "Define una serie de objetos (files, inodes, etc.) y operaciones sobre esos objetos (open a file, read a file, etc.) para varios syscalls.",
    "Algunos sistemas de administración de archivos soportados por VFS son ext4, vfat, fuse.sshfs.",
    "VFS no permite montar sistemas de archivos remotos, tales como NFS a través de la red."
  ],
  correcta: 3,
  justificacion: "Es justamente al revés: **el VFS sí permite montar sistemas de archivos remotos**. Ésa es una de sus grandes virtudes — al abstraer las operaciones tras una interfaz común, da lo mismo si detrás hay un disco local, una partición NTFS o un servidor NFS al otro lado de la red. Para el proceso, todo se ve como archivos y directorios normales.",
  descarte: "Las otras tres describen correctamente al VFS: es la capa de abstracción que unifica el acceso, define objetos genéricos (superblock, inode, dentry, file) con sus operaciones, y efectivamente soporta ext4, vfat y fuse.sshfs, entre muchos otros."
},

{
  id: "p3-63", pep: 3, num: 63, puntos: 1, tema: "Memoria virtual / latencia",
  contexto: "La memoria de un proceso es virtual, lo que introduce latencia en el acceso a memoria. Para tareas como el trading de alta frecuencia (HFT), donde se compite a nivel de microsegundos, una mayor latencia se traduce en pérdidas económicas.",
  enunciado: "¿Cuál o cuáles son las mayores fuentes de latencia al acceder a la memoria?",
  opciones: [
    "TLB hit",
    "page-fault",
    "TLB hit y page-fault",
    "TLB miss y page-fault"
  ],
  correcta: 3,
  justificacion: "Son las dos cosas que salen del camino rápido. Un **TLB miss** obliga a recorrer la tabla de páginas, o sea uno o varios accesos extra a memoria (con 4 niveles, hasta 4 accesos). Un **page-fault** es muchísimo peor: hay que ir al **disco**, que es órdenes de magnitud más lento, y encima el proceso se bloquea y se hace cambio de contexto.",
  diagrama: `TLB hit    →  ~1 ns      (camino rápido, sin latencia extra)
TLB miss   →  ~100 ns    (recorrer la tabla multinivel)
page-fault →  ~ms        (¡ir al DISCO!)

Las fuentes de latencia son el MISS y el FAULT.`,
  descarte: "El **TLB hit** es precisamente lo contrario a una fuente de latencia: es el caso óptimo, cuando la traducción se resuelve dentro del hardware sin tocar memoria. Cualquier alternativa que lo incluya como problema está equivocada."
},

{
  id: "p3-64", pep: 3, num: 64, puntos: 2, tema: "Memoria virtual / latencia",
  contexto: "Se usa mlockall() para forzar que las páginas se mantengan en el conjunto residente y no puedan ser swapeadas, y munlockall() para liberar la restricción.",
  enunciado: "Dadas las fuentes de latencia indicadas anteriormente, podemos afirmar que durante la ejecución del código sensible a la latencia:",
  codigo: `int main(int argc, char const *argv[]) {
  // codigo normal
  mlockall(MCL_CURRENT | MCL_FUTURE);   // fija las páginas en memoria
  // codigo sensible a la latencia (ej. HFT)
  munlockall();                          // libera la restricción
  // codigo normal
  return 0;
}`,
  opciones: [
    "Nunca ocurrirá un TLB miss, dado que siempre encontraré la entrada de tabla de página que estoy buscando en la TLB.",
    "Nunca ocurrirán un page-fault, dado que todas las páginas a utilizar se encuentran en memoria.",
    "Nunca ocurrirá un TLB miss, pero sí pueden ocurrir page-faults dado que no están todas las páginas en memoria.",
    "Puede ocurrir un TLB miss y puede ocurrir page-fault."
  ],
  correcta: 3,
  justificacion: "`mlockall()` impide que las páginas sean **swapeadas a disco**, pero eso no elimina los page faults del todo: con `MCL_FUTURE`, cada página **nueva** que el proceso toque por primera vez sigue gatillando un fault (menor, sin ir a disco, pero fault al fin). Y la TLB es una caché diminuta de unas pocas decenas de entradas que **no se puede fijar ni reservar**: si el código sensible recorre suficientes páginas, las traducciones se van desalojando y los misses ocurren igual.",
  diagrama: `mlockall()  →  las páginas no se van al SWAP  ✓

  pero:
  · TLB miss   → sigue ocurriendo (la TLB es chica
                 y no admite "lock" de entradas)
  · page-fault → sigue siendo posible (MCL_FUTURE
                 fija páginas nuevas al tocarlas)

  ⇒ pueden ocurrir AMBOS`,
  descarte: "Las dos alternativas que prometen \"nunca un TLB miss\" son las más claramente falsas: nada de lo que hace `mlockall` toca la TLB. Y afirmar que **nunca** habrá page-fault sobreestima la garantía: lo que `mlockall` evita es el swap, que es el caso caro, no todo tipo de fault."
},

{
  id: "p3-65", pep: 3, num: 65, puntos: 2, tema: "Copy-on-write",
  contexto: "En SO modernos se implementa copy-on-write (CoW) fork: durante el fork se crea una tabla de páginas para el hijo cuyas entradas apuntan a los mismos marcos del padre, marcados como \"sólo lectura\". Cuando padre o hijo intenta modificar, el sistema interrumpe, busca un marco para copiar la página original y retorna el control al proceso que gatilló la interrupción.",
  enunciado: "¿Qué impacto tiene en el uso de la memoria física y en el acceso a código sensible a la latencia?",
  opciones: [
    "Aumenta el uso de memoria física para proceso y aumenta la latencia.",
    "Disminuye el uso de memoria física para proceso y aumenta la latencia.",
    "Aumenta el uso de memoria física para proceso y disminuye la latencia.",
    "Disminuye el uso de memoria física para proceso y disminuye la latencia."
  ],
  correcta: 1,
  justificacion: "Son dos efectos que van en direcciones opuestas. **Memoria: baja**, porque padre e hijo comparten los mismos marcos y solo se duplica lo que efectivamente se modifica (si el hijo hace `exec` de inmediato, no se copia casi nada). **Latencia: sube**, porque la primera escritura sobre cada página compartida gatilla una interrupción, el SO tiene que buscar un marco libre, copiar 4 KB y recién devolver el control — todo eso es tiempo que un `fork` sin CoW no habría pagado en ese momento.",
  diagrama: `Sin CoW: fork copia TODA la imagen de inmediato
         → mucha memoria, sin sorpresas después

Con CoW: fork solo copia la tabla de páginas
         → poca memoria ✓
         → pero la 1ª escritura de cada página:
             interrupción + buscar marco + copiar
           = latencia impredecible ✗

Es un intercambio: se ahorra memoria, se paga en latencia.`,
  descarte: "Las alternativas que dicen \"aumenta el uso de memoria\" contradicen el propósito mismo del CoW, que existe para **no** duplicar páginas innecesariamente. Y las que prometen menor latencia olvidan el costo de la interrupción y la copia: para código sensible a microsegundos, esa copia diferida es exactamente lo que no quieres."
},

{
  id: "p3-66", pep: 3, num: 66, puntos: 2, tema: "TLB",
  contexto: "Un sistema implementa MV con paginación, TLB y paginación por demanda. Es de 8 bits, con páginas de 16 bytes. Existe un arreglo de 10 enteros de 4 bytes comenzando en la dirección virtual 0x64. Suponga que los únicos accesos a memoria que genera el ciclo son al arreglo.",
  enunciado: "¿Cuál es la tasa de hit de la TLB asumiendo que es la primera vez que se accede al arreglo y siempre hay espacio en la TLB?",
  codigo: `int i, sum=0;
for(i=0; i<10; i++)
  sum += a[i];`,
  opciones: [
    "0",
    "0,3",
    "0,7",
    "1"
  ],
  correcta: 2,
  justificacion: "Hay que ver cuántos elementos caben en cada página. Con páginas de **16 bytes** y enteros de **4 bytes**, entran **4 enteros por página**. El arreglo parte en 0x64 = 100, que no está alineado al inicio de página, así que la repartición queda despareja. Se produce un **miss** cada vez que se entra a una página nueva: 3 misses en total, y los otros 7 accesos son hits gracias a la localidad espacial. Tasa = **7/10 = 0,7**.",
  diagrama: `página = 16 B / 4 B = 4 enteros por página
arreglo empieza en 0x64 = 100

a[0] a[1] a[2]     → dir 100-111 → página 6   MISS (1ª vez)
a[3] a[4] a[5] a[6]→ dir 112-127 → página 7   MISS
a[7] a[8] a[9]     → dir 128-139 → página 8   MISS

3 misses, 7 hits   →  tasa de hit = 7/10 = 0,7  ✓`,
  descarte: "Una tasa de 1 exigiría que todo el arreglo cupiera en una sola página. Una tasa de 0 significaría fallar en los 10 accesos, ignorando la localidad espacial. Y 0,3 invierte hits con misses."
},

{
  id: "p3-67", pep: 3, num: 67, puntos: 2, tema: "TLB",
  contexto: "Mismo sistema (tasa de hit 0,7). El tiempo de acceso a la TLB es 1 microsegundo y el tiempo de acceso a memoria es 10 veces más lento que la TLB. La tabla de páginas es de 2 niveles y todo el proceso está en memoria.",
  enunciado: "¿Cuál sería el tiempo promedio de traducción de una dirección virtual a física?",
  opciones: [
    "0,7 μs",
    "1 μs",
    "7 μs",
    "20 μs"
  ],
  correcta: 2,
  justificacion: "El detalle que decide la pregunta son los **2 niveles**: cada miss cuesta 2 accesos a memoria, no uno. Con hit (70 %) el costo es solo 1 μs de TLB. Con miss (30 %) es 1 μs + 2 × 10 μs = **21 μs**. Promediando: 0,7 × 1 + 0,3 × 21 = 0,7 + 6,3 = **7 μs**.",
  diagrama: `t_TLB = 1 μs        t_M = 10 × 1 = 10 μs

HIT  (70 %):  1 μs
MISS (30 %):  1 + (2 niveles × 10) = 21 μs

Promedio = 0,7 × 1  +  0,3 × 21
         = 0,7 + 6,3
         = 7 μs   ✓`,
  descarte: "1 μs sería el caso de 100 % de hit. El error más común es olvidar los **2 niveles** y calcular 0,7×1 + 0,3×11 = 4 μs. Y 0,7 μs sale de multiplicar la tasa de hit por el tiempo de TLB sin considerar los misses."
},

{
  id: "p3-68", pep: 3, num: 68, puntos: 1, tema: "RAID",
  enunciado: "En un sistema que implementa RAID 1 para N discos, tolera perder:",
  opciones: [
    "sólo 1 disco, cualquiera sea.",
    "1 disco, cualquiera sea, y hasta N/2 discos, para ciertos casos.",
    "Ningún disco.",
    "N/2 discos, cualquiera sea."
  ],
  correcta: 1,
  justificacion: "RAID 1 organiza los discos en **pares espejo**. La garantía mínima es sobrevivir a la pérdida de **cualquier** disco, porque su gemelo tiene la copia. Pero con suerte se puede perder mucho más: si caen N/2 discos y resulta que es **uno de cada par**, el arreglo sigue funcionando. Lo que mata al sistema es perder **ambos discos de un mismo par**.",
  diagrama: `Par1: [A][A']   Par2: [B][B']   Par3: [C][C']

Pierdo A, B, C   → sobrevivo ✓ (N/2 discos, uno por par)
Pierdo A y A'    → MUERO ✗   (los dos del mismo par)

Garantía: 1 disco cualquiera.
En el mejor caso: hasta N/2.`,
  descarte: "\"Sólo 1 disco\" subestima la tolerancia real del esquema. \"N/2 cualquiera sea\" la sobreestima: si esos N/2 incluyen un par completo, se pierden datos. Y \"ningún disco\" describe a **RAID 0**, que no tiene redundancia alguna."
},

{
  id: "p3-69", pep: 3, num: 69, puntos: 1, tema: "Sistema de archivos (ext2)",
  contexto: "Un SO implementa ext2. En el superblock cuenta con s_blocks_count y s_inodes_count, cada uno de 4 bytes, para el número total de bloques e inodes. Cada inode cuenta con 12 punteros directos, 1 indirecto, 1 doble indirecto y 1 triple indirecto. El tamaño de bloque es de 1024 bytes y los punteros son de 32 bits.",
  enunciado: "¿Cuál es el tamaño máximo del sistema de archivos?",
  opciones: [
    "1 TB",
    "2 TB",
    "4 TB",
    "8 TB"
  ],
  correcta: 2,
  justificacion: "El límite lo pone el campo que cuenta los bloques. Como `s_blocks_count` es de **4 bytes = 32 bits**, el sistema puede tener a lo más **2³² bloques**. Multiplicando por el tamaño de bloque: 2³² × 1024 = 2³² × 2¹⁰ = 2⁴² bytes = **4 TB**.",
  diagrama: `s_blocks_count = 4 B = 32 bits  →  2³² bloques
tamaño de bloque = 1024 B = 2¹⁰

Máximo = 2³² × 2¹⁰ = 2⁴² B

2⁴⁰ = 1 TB  ⇒  2⁴² = 4 TB   ✓`,
  descarte: "Los otros valores salen de contar mal los exponentes. El dato clave está en el **superblock**, no en los punteros del inode: esos determinan el tamaño máximo de un **archivo**, no del sistema de archivos completo."
},

{
  id: "p3-70", pep: 3, num: 70, puntos: 2, tema: "Sistema de archivos (ext2)",
  contexto: "Mismo sistema ext2: bloques de 1024 bytes, punteros de 32 bits, inodes con 12 punteros directos, 1 indirecto, 1 doble indirecto y 1 triple indirecto.",
  enunciado: "¿Cuál es el tamaño mínimo y máximo de un archivo?",
  opciones: [
    "1 bloque y (256³ + 256² + 256 + 12) bloques",
    "12 bloques y (256 + 256 + 256 + 12) bloques",
    "1 bloque y (1024 + 1024 + 1024 + 12) bloques",
    "12 bloques y (1024³ + 1024² + 1024 + 12) bloques"
  ],
  correcta: 0,
  justificacion: "Primero el número mágico: **punteros por bloque = 1024 ÷ 4 = 256**. El **mínimo** es 1 bloque, porque aunque el archivo tenga un solo byte igual se le asigna un bloque completo (los 12 punteros directos existen, pero no obligan a usarlos todos). El **máximo** suma los cuatro aportes: 12 directos + 256 del indirecto + 256² del doble + 256³ del triple.",
  diagrama: `punteros por bloque = 1024 B / 4 B = 256

  12 punteros directos   →  12 bloques
  1 indirecto            →  256 bloques
  1 doble indirecto      →  256² bloques
  1 triple indirecto     →  256³ bloques
                            ──────────────
  Máximo = 256³ + 256² + 256 + 12 bloques
  Mínimo = 1 bloque  ✓`,
  descarte: "El mínimo **no** es 12 bloques: los punteros directos son capacidad disponible, no una reserva obligatoria. Y las opciones con 1024 confunden el **tamaño del bloque en bytes** con la **cantidad de punteros que caben en él** — hay que dividir por los 4 bytes de cada puntero para llegar a 256."
}

];
