# IRIS GAME — Corrección de proporciones Chibi

## Qué se corrigió

- Se conserva el renderizador vectorial Chibi de la integración previa: cara suave, ojos manga, cabello por capas, rubor, sombras, pestañas, labios y accesorios.
- Se amplió el escenario del editor y del resultado para que el lienzo de cuerpo completo no reduzca visualmente la cabeza y los ojos.
- Se corrigió el estado `none` del labial: ahora utiliza el tono natural de labios en vez de intentar pintar con el valor CSS inválido `none`.
- Las pestañas también se dibujan cuando la expresión seleccionada cierra los ojos.
- Lucy inicia con cabello largo lacio y mechones rubios frontales; se agregó el peinado largo lacio a las opciones.

## Archivos modificados

- `frontend/src/app.js` — correcciones del renderizado y maquillaje.
- `frontend/src/styles.css` — escala visual del personaje Chibi en editor y resultado, con ajustes responsivos.
- `frontend/src/index.html` — descripción accesible del lienzo.

## Referencia visual

Se tomó como referencia de proporciones y estilo el renderizador de `IrisGame_Cabello_Chibi_v3`. No se reemplazó por el SVG geométrico de la versión Chibi temprana ni por una ilustración plana.

## Validación

La validación automatizada de sintaxis JavaScript se realiza con `node --check`. La prueba visual real en navegador y el arranque Docker deben ejecutarse en el entorno del usuario antes de considerar aprobada la entrega final.
