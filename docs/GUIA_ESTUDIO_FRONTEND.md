# Guía de estudio del código de ReManga

Esta guía acompaña los comentarios dentro de los archivos. Su objetivo no es solo describir qué hace cada bloque, sino ayudarte a reconstruir el recorrido de los datos y entender por qué se usan las herramientas del lenguaje.

## 1. Cómo leer una función

Cuando encuentres una función, respondé estas preguntas en orden:

1. **¿Quién la llama?** Puede llamarla otra función, un evento de usuario o el navegador al cargar la página.
2. **¿Qué recibe?** Los parámetros son datos que la función necesita. Una función sin parámetros puede obtener los datos del DOM, de una variable compartida, de la URL o de Supabase.
3. **¿Qué variables crea?** Cada variable representa un dato intermedio. Fijate qué valor tiene al inicio y cómo cambia.
4. **¿Qué decisiones toma?** Los `if`, operadores lógicos y retornos anticipados determinan qué caminos puede seguir.
5. **¿Qué modifica?** Puede cambiar el DOM, guardar datos en localStorage, modificar una lista o insertar registros en Supabase.
6. **¿Qué devuelve?** `return` entrega un resultado al código que la llamó. Si no hay `return` explícito, normalmente devuelve `undefined`.
7. **¿Qué sucede después?** Buscá quién usa el resultado y cómo llega a la siguiente parte de la interfaz.

## 2. Variables, constantes y alcance

- `const` impide reasignar la variable, pero no vuelve inmutable un objeto o array guardado en ella. Por ejemplo, un array declarado con `const` puede seguir recibiendo `push()`.
- `let` se usa cuando la variable necesita recibir otro valor más adelante, como una lista filtrada o un cliente que inicialmente vale `null`.
- `var` tiene reglas de alcance más antiguas. En los archivos que lo usan, conviene aprender su comportamiento, no reemplazarlo automáticamente durante la documentación.
- Una variable local existe dentro de su función o bloque. Una variable compartida por el módulo puede conservar estado entre llamadas.
- Los nombres descriptivos son una ayuda, pero para entender el código hay que seguir dónde se asignan y dónde se leen.

## 3. Expresiones frecuentes de JavaScript

### Operadores y valores

- `===`: compara valor y tipo sin conversión automática.
- `||`: devuelve el primer operando verdadero (*truthy*); suele usarse como valor alternativo.
- `??`: usa el valor alternativo solo cuando el anterior es `null` o `undefined`.
- `?.`: encadenamiento opcional; evita intentar acceder a una propiedad cuando el valor anterior es `null` o `undefined`.
- `!valor`: negación lógica.
- `Number(valor)`: intenta convertir un valor a número.
- `String(valor)`: convierte un valor a texto.
- `condición ? A : B`: operador ternario, una forma compacta de elegir entre dos resultados.

No son equivalentes todos los valores vacíos: `0`, `""`, `false`, `null` y `undefined` pueden comportarse de manera diferente según el operador.

### Funciones flecha y callbacks

Una expresión como `(producto) => producto.precio` define una función que recibe `producto) y devuelve su precio. Si se pasa a `filter`, `map` o un listener, esa función se ejecutará cuando la herramienta que la recibe necesite usarla.

### Arrays

- `map`: transforma cada elemento y crea un array nuevo.
- `filter`: crea un array nuevo con los elementos que pasan una condición.
- `find`: devuelve el primer elemento coincidente o `undefined`.
- `reduce`: acumula los elementos en un único resultado, como un total.
- `some`: devuelve `true) si al menos un elemento cumple.
- `sort`: ordena el array sobre el que se ejecuta; por eso a veces se copia antes con `[...array]`.
- `slice`: obtiene una porción sin modificar el array original.
- `includes`: comprueba si una cadena contiene texto o si un array contiene un valor.

## 4. DOM: cómo JavaScript trabaja con el HTML

- `document.getElementById("catalogGrid")` busca un elemento por su atributo `id`.
- `document.querySelector(".newsletter form")` busca el primer elemento que coincide con un selector CSS.
- `querySelectorAll()` devuelve una colección de todos los elementos coincidentes.
- `createElement()` crea un nodo HTML que todavía no está necesariamente en la página.
- `appendChild()` lo inserta en el documento.
- `textContent` establece texto sin interpretarlo como HTML.
- `innerHTML` interpreta una cadena como marcado HTML. Si la cadena contiene datos no confiables, puede introducir una vulnerabilidad XSS.
- `classList.add/remove/toggle` agrega, quita o alterna clases CSS.
- `addEventListener()` registra una función para ejecutarla ante un evento.

Los identificadores y clases que JavaScript busca deben coincidir con el HTML. Si una función no encuentra su elemento, normalmente debe detenerse sin romper las demás páginas.

## 5. Asincronía y errores

Una consulta a Supabase requiere comunicación de red y no termina inmediatamente.

- Una función `async` siempre devuelve una promesa.
- `await` espera el resultado de una promesa dentro de esa función, sin bloquear el hilo completo del navegador.
- `try/catch` permite manejar excepciones.
- `finally` se ejecuta al terminar tanto el camino exitoso como el que produjo un error.
- Muchas operaciones del cliente Supabase devuelven un objeto con `data` y `error`. Que la promesa se resuelva no significa necesariamente que la consulta haya sido exitosa: hay que revisar `error`.

## 6. Cómo se conecta el frontend actual con Supabase

El flujo habitual de productos es:

1. `config.js` publica la configuración del proyecto en `window.REMANGA_SUPABASE_CONFIG`.
2. El HTML carga la librería de Supabase y los scripts necesarios en el orden previsto.
3. `static/script.js` crea o reutiliza un cliente.
4. Una función consulta la tabla `productos).
5. JavaScript procesa los registros y crea o actualiza elementos HTML.
6. CSS determina cómo se presentan esos elementos.

Las imágenes se guardan en Supabase Storage. Según el formato del campo `imagen`, el frontend puede usar una URL completa, una ruta local o construir la URL pública del bucket.

Las operaciones de autenticación usan Supabase Auth. El carrito, por su parte, se conserva en `localStorage`; eso lo mantiene entre páginas del mismo sitio en ese navegador, pero no sincroniza por sí solo el carrito entre dispositivos.

## 7. Seguridad: qué puede y qué no puede garantizar el navegador

Las claves públicas de Supabase están diseñadas para usarse en el cliente con las políticas adecuadas. Nunca debe colocarse una clave secreta `service_role` en código que se envía al navegador.

Una comprobación JavaScript como “hay una sesión” sirve para orientar la interfaz, pero la autorización real debe hacerse también en el servidor/servicio y mediante las políticas RLS de Supabase. No hay que confiar en datos enviados por el navegador como prueba suficiente de identidad.

## 8. Orden recomendado para estudiar ReManga

1. **HTML:** identificar cada sección, formularios, IDs, clases y archivos CSS/JS vinculados.
2. **CSS:** aprender cascada, especificidad, selectores, modelo de caja, flexbox/grid y media queries.
3. **JavaScript común:** formato de precios, imágenes, parámetros de URL, notificaciones y eventos.
4. **Productos y Supabase:** cliente, consulta de productos, creación de publicaciones y almacenamiento de imágenes.
5. **Catálogo:** filtros, ordenamiento, arrays y actualización del DOM.
6. **Detalle y carrito:** parámetros de URL, cantidades, persistencia y cálculo de subtotales.
7. **Autenticación y perfil:** sesiones, registro, recuperación, publicaciones propias.
8. **Favoritos:** Set, almacenamiento local, tabla remota, migración y cambios de sesión.
9. **Pruebas:** seguir un caso de principio a fin y verificar tanto éxito como errores.

## 9. Regla de documentación

Los comentarios deben explicar el motivo y el funcionamiento de la lógica, no repetir literalmente lo que ya dice la instrucción. Si el bloque es demasiado grande para entenderlo solo con comentarios, la explicación debe describir su flujo de entrada, procesamiento, salida y dependencias. Esta documentación no reemplaza las pruebas: los cambios de esta rama deben revisarse antes de integrarlos a `main`.
