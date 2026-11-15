# IRIS GAME — Chibi Anime Edition (integración)

## Base integrada
Esta entrega parte de `iris-game-implementado.zip`, conserva su navegación, selección, editor, guardado local, deshacer, evaluación y exportación PNG; integra la composición Chibi de las otras versiones y restaura cuatro perfiles independientes.

## Personajes
- JACKY: cabello caramelo y reflejos cálidos.
- XIMENA: cabello negro a los hombros.
- LUCY: cabello negro largo con mechas frontales rubias y piel clara (interpretación ilustrada a partir de la descripción escrita disponible).
- VALERIA: cabello castaño rizado y voluminoso.

## Cambios principales
- Cuatro perfiles persistidos por separado en `localStorage`.
- Menú inicial, pantalla de menú, tutorial, configuración y selección de cuatro personajes.
- Maquillaje por zonas: sombras con recorte de párpado y mezcla multiplicativa, rubor difuminado, labial con acabados mate/cremoso/gloss, pestañas seleccionables e iris.
- Categorías para cabello, ropa, poses, gadgets y accesorios.
- Exportación PNG y evaluación conectada al backend.
- El backend Python reconoce a Lucy y no sustituye silenciosamente IDs desconocidos por Jacky.

## Ejecutar con Docker
Desde esta carpeta (la que contiene `docker-compose.yml`):

```bash
docker compose up --build
```

Abrir `http://localhost`. Para apagar:

```bash
docker compose down
```

## Validación de esta entrega
- JavaScript: comprobación sintáctica con `node --check` (correcta).
- Python: análisis sintáctico con `ast.parse` y evaluación directa de los cuatro IDs (correcta); también se comprobó el rechazo de un ID desconocido.
- Modelo Java `MakeupSelection.java`: compilación aislada con `javac` (correcta).
- Docker y Maven no están instalados en el entorno de edición, por lo que no se declara una prueba real de construcción de contenedores, compilación completa de Spring Boot ni ejecución integrada del navegador.
- La ilustración se dibuja en Canvas 2D con composición vertical de cuerpo completo, ropa, piernas, calzado y brazos que varían según la pose. Es un render vectorial estilizado; no son sprites anime pintados a mano ni un rig de huesos. La pose de programación coloca una laptop en la zona de las manos, pero la articulación fina de dedos y agarres requiere ilustración especializada adicional.
- No se adjuntó una fotografía de Lucy dentro de los ZIP; se usa una caracterización original basada en la descripción textual.
