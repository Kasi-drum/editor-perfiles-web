var profileCanvas;
var currentData = null;
var waypointCounter = 0;
var zoneCounter = 0;
var gpxFileName = "perfil";
var elevationProfile = null; // cache del perfil completo
var originalFileXml = null;
var selectedTrackName = null;
var originalFileFormat = null;
var originalTracks = null;
var originalWaypoints = null;

function showModal(title, label, defaultValue) {
  return new Promise(function(resolve) {
    var overlay = document.getElementById("modal-overlay");
    var box = document.getElementById("modal-box");
    var body = document.getElementById("modal-body");
    var btns = document.getElementById("modal-buttons");
    body.innerHTML = '<label id="modal-label"></label><input id="modal-input" type="text">';
    btns.innerHTML = '<button id="modal-ok" class="btn-primary">OK</button><button id="modal-cancel">Cancelar</button>';
    box.classList.remove("wide");
    box.style.position = "";
    box.style.top = "";
    box.style.left = "";
    box.style.cursor = "";
    box.style.resize = "";
    box.style.overflow = "";
    box.style.minWidth = "";
    box.style.minHeight = "";
    box.style.maxWidth = "";
    box.style.maxHeight = "";
    document.getElementById("modal-title").style.cursor = "";
    document.getElementById("modal-title").textContent = title;
    document.getElementById("modal-label").textContent = label;
    var input = document.getElementById("modal-input");
    input.value = defaultValue || "";
    input.style.display = "";
    document.getElementById("modal-cancel").removeAttribute("autofocus");
    overlay.style.display = "";
    overlay.classList.remove("hidden");
    input.focus();
    input.select();
    function cleanup() {
      overlay.classList.add("hidden");
      document.getElementById("modal-ok").onclick = null;
      document.getElementById("modal-cancel").onclick = null;
      input.onkeydown = null;
    }
    document.getElementById("modal-ok").textContent = "OK";
    document.getElementById("modal-ok").classList.add("btn-primary");
    document.getElementById("modal-cancel").textContent = "Cancelar";
    document.getElementById("modal-ok").onclick = function() { cleanup(); resolve(input.value); };
    document.getElementById("modal-cancel").onclick = function() { cleanup(); resolve(null); };
    input.onkeydown = function(e) { if (e.key === "Enter") { cleanup(); resolve(input.value); } if (e.key === "Escape") { cleanup(); resolve(null); } };
  });
}
function showConfirm(title, msg) {
  return new Promise(function(resolve) {
    var overlay = document.getElementById("modal-overlay");
    var box = document.getElementById("modal-box");
    var body = document.getElementById("modal-body");
    var btns = document.getElementById("modal-buttons");
    body.innerHTML = '<label id="modal-label"></label><input id="modal-input" type="text">';
    btns.innerHTML = '<button id="modal-ok">SI</button><button id="modal-cancel">NO</button>';
    box.classList.remove("wide");
    box.style.position = "";
    box.style.top = "";
    box.style.left = "";
    box.style.cursor = "";
    box.style.resize = "";
    box.style.overflow = "";
    box.style.minWidth = "";
    box.style.minHeight = "";
    box.style.maxWidth = "";
    box.style.maxHeight = "";
    document.getElementById("modal-title").style.cursor = "";
    document.getElementById("modal-title").textContent = title;
    document.getElementById("modal-label").textContent = msg;
    var input = document.getElementById("modal-input");
    input.style.display = "none";
    overlay.style.display = "";
    overlay.classList.remove("hidden");
    function cleanup() {
      overlay.classList.add("hidden");
      document.getElementById("modal-ok").onclick = null;
      document.getElementById("modal-cancel").onclick = null;
    }
    document.getElementById("modal-ok").classList.remove("btn-primary");
    document.getElementById("modal-ok").removeAttribute("autofocus");
    document.getElementById("modal-cancel").setAttribute("autofocus", "");
    document.getElementById("modal-ok").onclick = function() { cleanup(); resolve(true); };
    document.getElementById("modal-cancel").onclick = function() { cleanup(); resolve(false); };
  });
}
function showTrackSelector(tracks) {
  return new Promise(function(resolve) {
    var overlay = document.getElementById("modal-overlay");
    var box = document.getElementById("modal-box");
    var body = document.getElementById("modal-body");
    var btns = document.getElementById("modal-buttons");
    box.classList.remove("wide");
    box.style.position = "";
    box.style.top = "";
    box.style.left = "";
    box.style.cursor = "";
    box.style.resize = "";
    box.style.overflow = "";
    box.style.minWidth = "";
    box.style.minHeight = "";
    box.style.maxWidth = "";
    box.style.maxHeight = "";
    document.getElementById("modal-title").style.cursor = "";
    document.getElementById("modal-title").textContent = "Selecciona un track";
    var html = '<div class="track-list">';
    tracks.forEach(function(tr, i) {
      html += '<button type="button" class="track-option" data-index="' + i + '">'
            + '<span class="track-name">' + escXml(tr.name) + '</span>'
            + '<span class="track-meta">' + tr.totalDistance.toFixed(2) + ' km &middot; ' + tr.trackpoints.length + ' puntos</span>'
            + '</button>';
    });
    html += '</div>';
    body.innerHTML = html;
    btns.innerHTML = '<button id="modal-cancel" class="btn-primary" autofocus>Cancelar</button>';
    overlay.style.display = "";
    overlay.classList.remove("hidden");
    function cleanup() {
      overlay.classList.add("hidden");
      document.getElementById("modal-cancel").onclick = null;
      document.onkeydown = null;
      body.innerHTML = '<label id="modal-label"></label><input id="modal-input" type="text">';
    }
    var opts = body.querySelectorAll(".track-option");
    for (var i = 0; i < opts.length; i++) {
      opts[i].onclick = function() {
        var idx = parseInt(this.getAttribute("data-index"), 10);
        cleanup();
        resolve(tracks[idx]);
      };
    }
    document.getElementById("modal-cancel").onclick = function() { cleanup(); resolve(null); };
    document.onkeydown = function(e) { if (e.key === "Escape") { cleanup(); resolve(null); } };
  });
}

function showHelp() {
  var overlay = document.getElementById("modal-overlay");
  document.getElementById("modal-box").classList.add("wide");
  document.getElementById("modal-title").textContent = "Ayuda - Editor de Perfiles Topogr\u00e1ficos";
  var body = document.getElementById("modal-body");
  body.innerHTML = '\
<div style="font-size:13px;line-height:1.5;color:#333;max-height:60vh;overflow-y:auto;padding-right:8px;text-align:left">\
  <p style="margin-bottom:12px">Aplicaci\u00f3n web para visualizar y editar perfiles de elevaci\u00f3n a partir de archivos GPX o KML. \
  Carga rutas, analiza el desnivel acumulado, gestiona waypoints y zonas de desnivel positivo/negativo, \
  y exporta el perfil a PNG, JPG o SVG.</p>\
  <hr style="border:none;border-top:1px solid #ddd;margin:12px 0">\
  <h4 style="margin:0 0 6px;font-size:13px;color:#1565C0">1. Archivo</h4>\
  <table style="width:100%;border-collapse:collapse;font-size:12px">\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">Abrir GPX / KML</td>\
        <td style="padding:3px 6px">Carga un archivo GPX o KML. El perfil se renderiza autom\u00e1ticamente con cuadr\u00edcula y ejes. Los waypoints del archivo se importan al perfil y a la barra lateral. Bajo el nombre del archivo se muestran distancia total, D+ y D\u2212 acumulados.</td></tr>\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">Guardar</td>\
        <td style="padding:3px 6px">Guarda una copia del track incluyendo los waypoints y zonas a\u00f1adidos. Antes de guardar puedes elegir el formato: \u201cGuardar como GPX (.gpx)\u201d (por defecto) o \u201cGuardar como KML (.kml)\u201d. Las zonas se guardan dentro del archivo (extensiones GPX / ExtendedData KML) y se restauran al abrirlo de nuevo. No sobrescribe el original.</td></tr>\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">Exportar</td>\
        <td style="padding:3px 6px">Exporta el perfil como imagen (PNG, JPG) o vectorial (SVG). Incluye perfil, cuadr\u00edcula, zonas coloreadas y waypoints.</td></tr>\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">Datos ejemplo</td>\
        <td style="padding:3px 6px">Carga un GPX de ejemplo para probar la aplicaci\u00f3n sin necesidad de archivo propio.</td></tr>\
  </table>\
  <hr style="border:none;border-top:1px solid #ddd;margin:12px 0">\
  <h4 style="margin:0 0 6px;font-size:13px;color:#1565C0">2. Herramientas</h4>\
  <table style="width:100%;border-collapse:collapse;font-size:12px">\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">Detectar Zonas</td>\
        <td style="padding:3px 6px">Analiza el perfil y lo divide en segmentos de subida y bajada. Puedes elegir solo subidas (+), solo bajadas (\u2212) o ambas. Cada segmento se marca con color (rojo = subida, azul = bajada).</td></tr>\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">+WP</td>\
        <td style="padding:3px 6px">A\u00f1ade un waypoint pidiendo nombre y distancia en km. Se representa con un c\u00edrculo numerado y una etiqueta.</td></tr>\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">+WP Inicio/Final</td>\
        <td style="padding:3px 6px">Crea autom\u00e1ticamente un waypoint al inicio (km 0) y otro al final del track.</td></tr>\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">+Zona</td>\
        <td style="padding:3px 6px">Activa el modo de selecci\u00f3n: primer clic en el perfil (por debajo de la l\u00ednea) marca el inicio, segundo clic marca el fin. La zona se colorea seg\u00fan su pendiente.</td></tr>\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">Informe WP</td>\
        <td style="padding:3px 6px">Genera una tabla detallada con los waypoints dentro de 100\u00a0m del track: n\u00famero, nombre, km, altitud, distancia al siguiente, desnivel + y \u2212 de cada segmento y acumulados. Exportable a PNG, JPG o SVG.</td></tr>\
  </table>\
  <hr style="border:none;border-top:1px solid #ddd;margin:12px 0">\
  <h4 style="margin:0 0 6px;font-size:13px;color:#1565C0">3. Visibilidad</h4>\
  <table style="width:100%;border-collapse:collapse;font-size:12px">\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">Cuadr\u00edcula</td><td style="padding:3px 6px">Muestra/oculta la cuadr\u00edcula y etiquetas de elevaci\u00f3n del eje Y.</td></tr>\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">WP</td><td style="padding:3px 6px">Muestra/oculta todos los waypoints (s\u00edmbolos, etiquetas y l\u00edneas gu\u00eda).</td></tr>\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">Zonas</td><td style="padding:3px 6px">Muestra/oculta los bloques de zona y su informaci\u00f3n textual.</td></tr>\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">L\u00edneas</td><td style="padding:3px 6px">Muestra/oculta las l\u00edneas verticales que conectan cada waypoint con el perfil.</td></tr>\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">S\u00edmbolos</td><td style="padding:3px 6px">Muestra/oculta los c\u00edrculos numerados de los waypoints.</td></tr>\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">Nombres</td><td style="padding:3px 6px">Muestra/oculta las etiquetas de nombre de los waypoints (giran 90\u00b0).</td></tr>\
  </table>\
  <hr style="border:none;border-top:1px solid #ddd;margin:12px 0">\
  <h4 style="margin:0 0 6px;font-size:13px;color:#1565C0">4. Mapa</h4>\
  <table style="width:100%;border-collapse:collapse;font-size:12px">\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">Abrir mapa</td>\
        <td style="padding:3px 6px">Abre una nueva pesta\u00f1a con OpenTopoMap mostrando la ruta, los waypoints existentes y un mini-perfil de elevaci\u00f3n. Al cargar un nuevo archivo (GPX/KML), la pesta\u00f1a del mapa anterior se cierra autom\u00e1ticamente.</td></tr>\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">Capas de mapa</td>\
        <td style="padding:3px 6px">Esquina superior derecha: selecciona entre OSM, OpenTopoMap (por defecto), IGN 1:25.000 o Sat\u00e9lite. Capas superpuestas: Puntos de Agua, Refugios, Puertos de Monta\u00f1a, Picos y Bares / Restaurantes.</td></tr>\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">Personalizar track</td>\
        <td style="padding:3px 6px">Controles en la esquina superior izquierda: selector de color y deslizador de ancho para la l\u00ednea del recorrido.</td></tr>\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">Crear WP (clic der.)</td>\
        <td style="padding:3px 6px">En el mapa, haz clic derecho sobre cualquier punto del recorrido. Se abrir\u00e1 un di\u00e1logo para nombrar el nuevo waypoint. Se crea con coordenadas exactas, elevaci\u00f3n interpolada y distancia al inicio.</td></tr>\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">Seleccionar WP</td>\
        <td style="padding:3px 6px">Clic sobre un WP en el mapa: se resalta con borde dorado. Clic en el fondo vac\u00edo para deseleccionar.</td></tr>\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">Eliminar WP en mapa</td>\
        <td style="padding:3px 6px">Con un WP seleccionado, pulsa X, Delete o Supr. Pide confirmaci\u00f3n y lo elimina del mapa y de la ventana principal.</td></tr>\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">Numeraci\u00f3n WP</td>\
        <td style="padding:3px 6px">Al a\u00f1adir o eliminar cualquier waypoint, la lista se reordena por distancia al inicio del track y se reasignan los n\u00fameros correlativos.</td></tr>\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">Mini-perfil</td>\
        <td style="padding:3px 6px">Panel con el perfil de elevaci\u00f3n. Arrastra la barra superior para moverlo. Arrastra los bordes/esquinas para redimensionarlo.</td></tr>\
  </table>\
  <hr style="border:none;border-top:1px solid #ddd;margin:12px 0">\
  <h4 style="margin:0 0 6px;font-size:13px;color:#1565C0">5. Interacci\u00f3n con el canvas</h4>\
  <table style="width:100%;border-collapse:collapse;font-size:12px">\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">Clic en elemento</td><td style="padding:3px 6px">Selecciona el waypoint o zona (borde dorado/iluminado).</td></tr>\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">Arrastrar borde</td><td style="padding:3px 6px">Arrastra el borde vertical de una zona para ajustar inicio o fin.</td></tr>\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">Tecla X / Delete / Supr</td><td style="padding:3px 6px">Elimina el waypoint o zona seleccionado (pide confirmaci\u00f3n).</td></tr>\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">Escape</td><td style="padding:3px 6px">Cancela el modo de zona activo.</td></tr>\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">Clic derecho</td><td style="padding:3px 6px">Sobre waypoint: pregunta si eliminarlo. Sobre perfil vac\u00edo: crea un nuevo waypoint.</td></tr>\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">Color de WP</td><td style="padding:3px 6px">\u2022 Azul: a 50\u00a0m o menos del track<br>\u2022 Naranja: entre 50\u00a0m y 100\u00a0m del track<br>\u2022 Gris: a m\u00e1s de 100\u00a0m del track</td></tr>\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">S\u00edmbolos en etiquetas</td>\
        <td style="padding:3px 6px">Los waypoints con tipo \u201cpico\u201d muestran \u25b2 antes del nombre. Los de tipo \u201cpuerto\u201d muestran ][ (en negrita) antes del nombre. Esto aplica tanto en el perfil como en el informe.</td></tr>\
  </table>\
  <hr style="border:none;border-top:1px solid #ddd;margin:12px 0">\
  <h4 style="margin:0 0 6px;font-size:13px;color:#1565C0">6. Barra lateral</h4>\
  <table style="width:100%;border-collapse:collapse;font-size:12px">\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">Lista waypoints</td><td style="padding:3px 6px">Clic para seleccionar. Bot\u00f3n X para eliminar. Doble clic para renombrar. Los WP fuera de pista (&gt;50\u00a0m) muestran \u26a0\ufe0f.</td></tr>\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">Lista zonas</td><td style="padding:3px 6px">Clic para seleccionar. Bot\u00f3n X para eliminar.</td></tr>\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">Eliminar todos</td><td style="padding:3px 6px">Botones para eliminar todos los waypoints o todas las zonas de una vez.</td></tr>\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">Bot\u00f3n &lt;</td><td style="padding:3px 6px">Oculta/muestra la barra lateral para dar m\u00e1s espacio al gr\u00e1fico.</td></tr>\
  </table>\
  <hr style="border:none;border-top:1px solid #ddd;margin:12px 0">\
  <h4 style="margin:0 0 6px;font-size:13px;color:#1565C0">7. Puntos de Inter\u00e9s (POI) en el mapa</h4>\
  <table style="width:100%;border-collapse:collapse;font-size:12px">\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">Buscar POIs</td>\
        <td style="padding:3px 6px">Bot\u00f3n \u201cBuscar POIs\u201d en el mapa, justo debajo del desplegable de capas de la esquina superior derecha. Consulta OpenStreetMap v\u00eda Overpass API para encontrar puntos de agua, refugios, puertos de monta\u00f1a, picos y bares/restaurantes en la zona visible. Los resultados aparecen como marcadores con su capa correspondiente.</td></tr>\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">\u2022 \ud83d\udeb0 Azul</td><td style="padding:3px 6px">Agua tratada/potable: fuentes, grifos, drinking_water, water_point.</td></tr>\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">\u2022 \ud83d\udca7 Cian</td><td style="padding:3px 6px">Agua natural: manantiales (spring), pozos (well).</td></tr>\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">\u2022 \ud83c\udfd5\ufe0f Verde</td><td style="padding:3px 6px">Refugios libres: vivac, caba\u00f1as de monta\u00f1a, \u00e1reas de picnic con acampada, refugios abiertos.</td></tr>\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">\u2022 \ud83c\udfe0 Rojo</td><td style="padding:3px 6px">Refugios de pago/privados: refugios guardados, campings, cotos de caza, caba\u00f1as privadas.</td></tr>\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">\u2022 ][ Naranja</td><td style="padding:3px 6px">Puertos de monta\u00f1a (mountain_pass, natural=saddle con nombre).</td></tr>\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">\u2022 \u25b2 Granate</td><td style="padding:3px 6px">Picos (natural=peak).</td></tr>\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">\u2022 \ud83c\udf7a Naranja</td><td style="padding:3px 6px">Bares, pubs, restaurantes y caf\u00e9s (amenity=bar/pub/restaurant/cafe).</td></tr>\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">A\u00f1adir POIs al perfil</td>\
        <td style="padding:3px 6px">Tras buscar POIs, aparece el bot\u00f3n \u201cA\u00f1adir POIs cercanos\u201d justo debajo de \u201cBuscar POIs\u201d. A\u00f1ade como waypoints aquellos POIs que est\u00e9n a menos de 100\u00a0m del track. Los puertos y picos se marcan con los s\u00edmbolos ][ y \u25b2 respectivamente.</td></tr>\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">Popups</td>\
        <td style="padding:3px 6px">Clic en un marcador POI: muestra nombre, tipo, potabilidad, capacidad, operador y altitud si est\u00e1n disponibles.</td></tr>\
  </table>\
  <hr style="border:none;border-top:1px solid #ddd;margin:12px 0">\
  <h4 style="margin:0 0 6px;font-size:13px;color:#1565C0">8. Atajos de teclado</h4>\
  <table style="width:100%;border-collapse:collapse;font-size:12px">\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">X / Delete / Supr</td><td style="padding:3px 6px">Elimina el waypoint o zona seleccionado (pide confirmaci\u00f3n).</td></tr>\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">Escape</td><td style="padding:3px 6px">Cancela la creaci\u00f3n de zona en curso.</td></tr>\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">Enter</td><td style="padding:3px 6px">Confirma di\u00e1logos (nombrar WP, etc.).</td></tr>\
    <tr><td style="padding:3px 6px;white-space:nowrap;font-weight:700;vertical-align:top">Clic derecho</td><td style="padding:3px 6px">En canvas: eliminar WP o crear nuevo. En mapa: crear nuevo WP.</td></tr>\
  </table>\
</div>';
  var btns = document.getElementById("modal-buttons");
  btns.innerHTML = '<button id="help-close" class="btn-primary">Cerrar</button>';
  overlay.classList.remove("hidden");
  document.getElementById("help-close").onclick = function() {
    overlay.classList.add("hidden");
    document.getElementById("modal-box").classList.remove("wide");
    body.innerHTML = '<label id="modal-label"></label><input id="modal-input" type="text">';
    btns.innerHTML = '<button id="modal-ok" class="btn-primary">OK</button><button id="modal-cancel">Cancelar</button>';
  };
}

function initApp() {
  var canvas = document.getElementById("profile-canvas");
  profileCanvas = new ProfileCanvas(canvas);
  document.getElementById("btn-open").addEventListener("click", openGPX);
  document.getElementById("file-name").textContent = gpxFileName;
  document.getElementById("btn-export").addEventListener("click", exportDialog);
  document.getElementById("btn-capturar").addEventListener("click", capturarPantalla);
  updateFileStats();
  document.getElementById("btn-save-gpx").addEventListener("click", saveGPX);
  document.getElementById("btn-analyze").addEventListener("click", analyzeGPX);
  document.getElementById("btn-informes").addEventListener("click", showInformes);
  initDesnivelConfig();
  document.getElementById("btn-add-wp").addEventListener("click", addWaypoint);
  document.getElementById("btn-add-wp-if").addEventListener("click", function() {
    if (!currentData) return;
    ensureStartEndWaypoints();
    profileCanvas.render();
    updateSidebar();
  });
  document.getElementById("btn-add-zone").addEventListener("click", addZone);
  document.getElementById("btn-toggle-grid").addEventListener("click", function() { profileCanvas.showGrid = !profileCanvas.showGrid; document.getElementById("btn-toggle-grid").classList.toggle("active"); profileCanvas.render(); });
  var savedWpStates = null;
  document.getElementById("btn-toggle-wp").addEventListener("click", function() {
    profileCanvas.showWaypoints = !profileCanvas.showWaypoints;
    var on = profileCanvas.showWaypoints;
    if (on) {
      if (savedWpStates) {
        profileCanvas.mostrarLineasVerticales = savedWpStates.lineas;
        profileCanvas.mostrarSimbolos = savedWpStates.simbolos;
        profileCanvas.mostrarNombres = savedWpStates.nombres;
      } else {
        profileCanvas.mostrarLineasVerticales = true;
        profileCanvas.mostrarSimbolos = true;
        profileCanvas.mostrarNombres = true;
      }
    } else {
      savedWpStates = {
        lineas: profileCanvas.mostrarLineasVerticales,
        simbolos: profileCanvas.mostrarSimbolos,
        nombres: profileCanvas.mostrarNombres
      };
      profileCanvas.mostrarLineasVerticales = false;
      profileCanvas.mostrarSimbolos = false;
      profileCanvas.mostrarNombres = false;
    }
    document.getElementById("btn-toggle-wp").classList.toggle("active", on);
    document.getElementById("btn-toggle-lineas").classList.toggle("active", profileCanvas.mostrarLineasVerticales);
    document.getElementById("btn-toggle-simbolos").classList.toggle("active", profileCanvas.mostrarSimbolos);
    document.getElementById("btn-toggle-nombres").classList.toggle("active", profileCanvas.mostrarNombres);
    profileCanvas.render();
  });
  document.getElementById("btn-del-all-zones").addEventListener("click", async function() {
    if (!profileCanvas.zones.length) return;
    var ok = await showConfirm("Eliminar Zonas", "Eliminar todas las zonas?");
    if (ok) { profileCanvas.zones = []; profileCanvas.selectedElement = null; profileCanvas.render(); updateSidebar(); }
  });
  document.getElementById("btn-del-all-wp").addEventListener("click", async function() {
    if (!profileCanvas.waypoints.length) return;
    var ok = await showConfirm("Eliminar WP", "Eliminar todos los waypoints?");
    if (ok) { profileCanvas.waypoints = []; profileCanvas.selectedElement = null; profileCanvas.render(); updateSidebar(); syncMapaWaypoints(); }
  });
  document.getElementById("btn-toggle-zones").addEventListener("click", function() { profileCanvas.showZones = !profileCanvas.showZones; document.getElementById("btn-toggle-zones").classList.toggle("active"); profileCanvas.render(); });
  document.getElementById("btn-toggle-lineas").addEventListener("click", function() {
    if (!profileCanvas.mostrarSimbolos && !profileCanvas.mostrarNombres) return;
    profileCanvas.mostrarLineasVerticales = !profileCanvas.mostrarLineasVerticales;
    document.getElementById("btn-toggle-lineas").classList.toggle("active");
    profileCanvas.render();
  });
  document.getElementById("btn-toggle-simbolos").addEventListener("click", function() {
    profileCanvas.mostrarSimbolos = !profileCanvas.mostrarSimbolos;
    document.getElementById("btn-toggle-simbolos").classList.toggle("active");
    if (!profileCanvas.mostrarSimbolos && !profileCanvas.mostrarNombres) {
      profileCanvas.mostrarLineasVerticales = false;
      document.getElementById("btn-toggle-lineas").classList.remove("active");
    }
    profileCanvas.render();
  });
  document.getElementById("btn-toggle-nombres").addEventListener("click", function() {
    profileCanvas.mostrarNombres = !profileCanvas.mostrarNombres;
    document.getElementById("btn-toggle-nombres").classList.toggle("active");
    if (!profileCanvas.mostrarSimbolos && !profileCanvas.mostrarNombres) {
      profileCanvas.mostrarLineasVerticales = false;
      document.getElementById("btn-toggle-lineas").classList.remove("active");
    }
    profileCanvas.render();
  });
  document.getElementById("btn-mapa").addEventListener("click", function() {
    if (!currentData || !profileCanvas.trackpoints.length) return;
    var mapaData = {
      trackpoints: profileCanvas.trackpoints,
      waypoints: profileCanvas.waypoints
    };
    try { localStorage.setItem("mapa-track-data", JSON.stringify(mapaData)); } catch(e) {}
    try { localStorage.setItem("mapa-gpx-id", Date.now() + ":" + gpxFileName); } catch(e) {}
    try { localStorage.setItem("mapa-revision", String(Date.now())); } catch(e) {}
    window.open("mapa.html");
  });
  document.getElementById("btn-toggle-grid").classList.add("active");
  document.getElementById("btn-toggle-wp").classList.add("active");
  document.getElementById("btn-toggle-zones").classList.add("active");
  document.getElementById("btn-toggle-lineas").classList.add("active");
  document.getElementById("btn-toggle-simbolos").classList.add("active");
  document.getElementById("btn-toggle-nombres").classList.add("active");
  document.getElementById("sidebar-toggle").addEventListener("click", function() { document.getElementById("sidebar").classList.toggle("collapsed"); });
  document.getElementById("btn-help").addEventListener("click", showHelp);
  var draggingBoundary = null;
  function findZoneBoundaryAt(mx, my) {
    var threshold = 8;
    var fillBottom = profileCanvas.axisY;
    var drawTop = profileCanvas.drawArea.y;
    for (var i = 0; i < profileCanvas.zones.length; i++) {
      var z = profileCanvas.zones[i];
      var sx = profileCanvas.xPos(z.startDist);
      var ex = profileCanvas.xPos(z.endDist);
      var sy = profileCanvas.yPos(profileCanvas.interpolateEle(z.startDist));
      var ey = profileCanvas.yPos(profileCanvas.interpolateEle(z.endDist));
      if (Math.abs(mx - sx) < threshold && my >= sy && my <= fillBottom) return {zone: z, side: "start"};
      if (Math.abs(mx - ex) < threshold && my >= ey && my <= fillBottom) return {zone: z, side: "end"};
    }
    return null;
  }
  canvas.addEventListener("mousedown", function(e) {
    if (e.button === 2) {
      profileCanvas.isSelectingZone = false;
      profileCanvas.zoneStartDist = -1;
      profileCanvas.zonePreviewDist = -1;
      profileCanvas.render();
      return;
    }
    var r = canvas.getBoundingClientRect();
    var mx = e.clientX - r.left, my = e.clientY - r.top;
    var da = profileCanvas.drawArea;
    var insideProfile = mx >= da.x && mx <= da.x + da.width;
    // Element interaction first (always)
    var boundary = findZoneBoundaryAt(mx, my);
    if (boundary) {
      draggingBoundary = boundary;
      profileCanvas.selectedElement = boundary.zone;
      profileCanvas.render();
      return;
    }
    var wp = findWaypointAt(mx, my);
    if (wp) { selectElementAt(mx, my); return; }
    // Second click: complete zone creation
    if (profileCanvas.isSelectingZone) {
      if (insideProfile && currentData) {
        var dist = ((mx - da.x) / da.width) * profileCanvas.totalDistance;
        if (dist >= 0 && dist <= profileCanvas.totalDistance) {
          var start = Math.min(profileCanvas.zoneStartDist, dist);
          var end = Math.max(profileCanvas.zoneStartDist, dist);
          if (end - start > 0.01) {
            zoneCounter++;
            profileCanvas.zones.push({id:"zone-"+zoneCounter, name:"Zona "+zoneCounter, startDist:start, endDist:end, startEle:profileCanvas.interpolateEle(start), endEle:profileCanvas.interpolateEle(end)});
          }
        }
      }
      profileCanvas.isSelectingZone = false;
      profileCanvas.zoneStartDist = -1;
      profileCanvas.zonePreviewDist = -1;
      profileCanvas.render();
      updateSidebar();
      return;
    }
    if (!currentData || !insideProfile) return;
    var dist = ((mx - da.x) / da.width) * profileCanvas.totalDistance;
    if (dist < 0 || dist > profileCanvas.totalDistance) return;
    var profileY = profileCanvas.yPos(profileCanvas.interpolateEle(dist));
    if (my < profileY) return;
    profileCanvas.isSelectingZone = true;
    profileCanvas.zoneStartDist = dist;
    profileCanvas.zonePreviewDist = dist;
    profileCanvas.render();
  });
  canvas.addEventListener("contextmenu", async function(e) {
    e.preventDefault();
    var r = canvas.getBoundingClientRect();
    var mx = e.clientX - r.left, my = e.clientY - r.top;
    var dist = ((mx - profileCanvas.drawArea.x) / profileCanvas.drawArea.width) * profileCanvas.totalDistance;
    var wp = findWaypointAt(mx, my);
    if (wp) {
      var del = await showConfirm("WP: " + wp.name, "Eliminar este WP?");
      if (del) {
        profileCanvas.waypoints.splice(profileCanvas.waypoints.indexOf(wp), 1);
        profileCanvas.selectedElement = null;
        profileCanvas.render();
        updateSidebar();
        syncMapaWaypoints();
        return;
      }
    }
    if (dist >= 0 && dist <= profileCanvas.totalDistance) {
      var name = await showModal("Nuevo WP", "Nombre (" + dist.toFixed(2) + " km):");
      if (name) {
        var coords = interpolateCoords(dist);
        profileCanvas.waypoints.push({name:name, dist:parseFloat(dist.toFixed(3)), ele:profileCanvas.interpolateEle(dist), lat:coords.lat, lng:coords.lng});
        renumberWaypoints();
        profileCanvas.render();
        updateSidebar();
        syncMapaWaypoints();
      }
    }
  });
  canvas.addEventListener("mousemove", function(e) {
    var r = canvas.getBoundingClientRect();
    var mx = e.clientX - r.left, my = e.clientY - r.top;
    if (!draggingBoundary) {
      var b = findZoneBoundaryAt(mx, my);
      canvas.style.cursor = b ? "ew-resize" : "";
    }
    if (draggingBoundary) {
      var da = profileCanvas.drawArea;
      var dist = ((mx - da.x) / da.width) * profileCanvas.totalDistance;
      dist = Math.max(0.01, Math.min(profileCanvas.totalDistance - 0.01, dist));
      var zone = draggingBoundary.zone;
      if (draggingBoundary.side === "start") {
        if (dist < zone.endDist - 0.01) {
          zone.startDist = dist;
          zone.startEle = profileCanvas.interpolateEle(dist);
        }
      } else {
        if (dist > zone.startDist + 0.01) {
          zone.endDist = dist;
          zone.endEle = profileCanvas.interpolateEle(dist);
        }
      }
      profileCanvas.render();
      updateSidebar();
      return;
    }
    profileCanvas.mouseX = mx;
    if (profileCanvas.isSelectingZone) {
      var da = profileCanvas.drawArea;
      if (mx >= da.x && mx <= da.x + da.width) {
        profileCanvas.zonePreviewDist = ((mx - da.x) / da.width) * profileCanvas.totalDistance;
      }
    }
    profileCanvas.render();
  });
  canvas.addEventListener("mouseup", function() {
    if (draggingBoundary) { profileCanvas.selectedElement = null; profileCanvas.render(); updateSidebar(); }
    draggingBoundary = null;
  });
  canvas.addEventListener("mouseleave", function() {
    if (draggingBoundary) { profileCanvas.selectedElement = null; updateSidebar(); }
    draggingBoundary = null; canvas.style.cursor = ""; profileCanvas.mouseX = -1; profileCanvas.render();
  });
  document.addEventListener("keydown", function(e) {
    if ((e.key === "Delete" || e.key === "Backspace" || e.key === "x" || e.key === "X") && e.target === document.body && profileCanvas.selectedElement) {
      e.preventDefault();
      (async function() {
        var el = profileCanvas.selectedElement;
        var name = el.name || el.id;
        var ok = await showConfirm("Eliminar", "Eliminar " + name + "?");
        if (ok) deleteSelected();
      })();
    }
    else if (e.key === "Escape" && profileCanvas.isSelectingZone) {
      profileCanvas.isSelectingZone = false;
      profileCanvas.zoneStartDist = -1;
      profileCanvas.zonePreviewDist = -1;
      profileCanvas.render();
    }
  });
  window.addEventListener("storage", function(e) {
    if (e.key === "mapa-new-wp" && e.newValue) {
      var wpData = JSON.parse(e.newValue);
      try { localStorage.removeItem("mapa-new-wp"); } catch(ex) {}
      if (!wpData || !wpData.name) return;
      profileCanvas.waypoints.push({name:wpData.name, dist:wpData.dist, ele:wpData.ele, lat:wpData.lat, lng:wpData.lng, offTrackDist: wpData.offTrackDist || 0, poiType: wpData.poiType || null});
      renumberWaypoints();
      profileCanvas.render();
      updateSidebar();
      try { localStorage.setItem("mapa-wp-update", JSON.stringify(profileCanvas.waypoints)); } catch(ex) {}
    }
    if (e.key === "mapa-del-wp" && e.newValue) {
      var wpData = JSON.parse(e.newValue);
      try { localStorage.removeItem("mapa-del-wp"); } catch(ex) {}
      if (!wpData || wpData.name == null) return;
      var idx = -1;
      for (var i = 0; i < profileCanvas.waypoints.length; i++) {
        if (profileCanvas.waypoints[i].name === wpData.name && Math.abs(profileCanvas.waypoints[i].dist - wpData.dist) < 0.001) {
          idx = i; break;
        }
      }
      if (idx === -1) return;
      profileCanvas.waypoints.splice(idx, 1);
      renumberWaypoints();
      profileCanvas.render();
      updateSidebar();
      try { localStorage.setItem("mapa-wp-update", JSON.stringify(profileCanvas.waypoints)); } catch(ex) {}
    }
  });
  var wl = document.getElementById("wp-list");
  wl.addEventListener("click", function(e) {
    var li = e.target.closest("li");
    if (!li) return;
    if (e.target.classList.contains("sidebar-del")) return;
    var id = li.dataset.id;
    if (!id) return;
    for (var i = 0; i < profileCanvas.waypoints.length; i++) {
      if (profileCanvas.waypoints[i].id === id) {
        profileCanvas.selectedElement = profileCanvas.waypoints[i];
        profileCanvas.render();
        var all = this.querySelectorAll("li");
        for (var j = 0; j < all.length; j++) all[j].classList.remove("selected");
        li.classList.add("selected");
        return;
      }
    }
  });
  wl.addEventListener("dblclick", function(e) {
    var li = e.target.closest("li");
    if (!li) return;
    if (e.target.classList.contains("sidebar-del")) return;
    var id = li.dataset.id;
    if (!id) return;
    for (var i = 0; i < profileCanvas.waypoints.length; i++) {
      if (profileCanvas.waypoints[i].id === id) {
        var wp = profileCanvas.waypoints[i];
        var n = prompt("Editar WP", wp.name);
        if (n === null || n === "") return;
        wp.name = n;
        renumberWaypoints();
        profileCanvas.render();
        updateSidebar();
        syncMapaWaypoints();
        return;
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", initApp);
if (document.readyState !== "loading") initApp();

function showAnalyzeMenu() {
  return new Promise(function(resolve) {
    var overlay = document.getElementById("modal-overlay");
    document.getElementById("modal-title").textContent = "Detectar Zonas";
    document.getElementById("modal-label").textContent = "Selecciona tipo de segmento:";
    var input = document.getElementById("modal-input");
    input.style.display = "none";
    var btns = document.getElementById("modal-buttons");
    btns.innerHTML = '<button id="analyze-btn-pos" style="background:#e53935;color:#fff;border-color:#e53935">Desniveles +</button><button id="analyze-btn-neg" style="background:#0d47a1;color:#fff;border-color:#0d47a1">Desniveles -</button><button id="analyze-btn-both" style="background:#1565C0;color:#fff;border-color:#1565C0">Ambos</button><button id="analyze-btn-cancel">Cancelar</button>';
    overlay.classList.remove("hidden");
    function cleanup() {
      overlay.classList.add("hidden");
      btns.innerHTML = '<button id="modal-ok" class="btn-primary">OK</button><button id="modal-cancel">Cancelar</button>';
      document.getElementById("modal-label").textContent = "";
      input.style.display = "";
    }
    document.getElementById("analyze-btn-pos").onclick = function() { cleanup(); resolve("pos"); };
    document.getElementById("analyze-btn-neg").onclick = function() { cleanup(); resolve("neg"); };
    document.getElementById("analyze-btn-both").onclick = function() { cleanup(); resolve("both"); };
    document.getElementById("analyze-btn-cancel").onclick = function() { cleanup(); resolve(null); };
  });
}
async function analyzeGPX() {
  if (!currentData || !profileCanvas.trackpoints.length) return;
  var mode = await showAnalyzeMenu();
  if (!mode) return;
  profileCanvas.zones = [];
  zoneCounter = 0;
  var tps = profileCanvas.trackpoints;
  var MIN_ELE = 30, HYST = 4, MIN_DIST = 0.1;
  var segments = [];
  var dir = 0, mainAcc = 0, revAcc = 0, startIdx = 0;
  var pending = 0, pendingStart = 0;
  for (var i = 1; i < tps.length; i++) {
    var de = tps[i].ele - tps[i - 1].ele;
    if (dir === 0) {
      pending += de;
      if (pendingStart === 0) pendingStart = i - 1;
      if (Math.abs(pending) >= 0.5) {
        dir = pending > 0 ? 1 : -1;
        mainAcc = Math.abs(pending); revAcc = 0;
        startIdx = pendingStart; pending = 0; pendingStart = 0;
      }
    } else {
      var segDir = de > 0 ? 1 : (de < 0 ? -1 : 0);
      if (segDir === 0) continue;
      if (segDir === dir) {
        mainAcc += Math.abs(de); revAcc = 0;
      } else {
        revAcc += Math.abs(de);
        if (revAcc >= HYST) {
          if (mainAcc >= MIN_ELE && (tps[i - 1].dist - tps[startIdx].dist) >= MIN_DIST)
            segments.push({s: startIdx, e: i - 1, dir: dir});
          dir = segDir; mainAcc = Math.abs(de); revAcc = 0; startIdx = i - 1;
        }
      }
    }
  }
  if (dir !== 0 && mainAcc >= MIN_ELE && (tps[tps.length - 1].dist - tps[startIdx].dist) >= MIN_DIST)
    segments.push({s: startIdx, e: tps.length - 1, dir: dir});
  segments.forEach(function(seg) {
    if (mode === "pos" && seg.dir === -1) return;
    if (mode === "neg" && seg.dir === 1) return;
    zoneCounter++;
    profileCanvas.zones.push({id:"zone-"+zoneCounter, name:"Zona "+zoneCounter, startDist:tps[seg.s].dist, endDist:tps[seg.e].dist, startEle:tps[seg.s].ele, endEle:tps[seg.e].ele});
  });
  profileCanvas.render();
  updateSidebar();
}
function ensureStartEndWaypoints() {
  var wps = profileCanvas.waypoints;
  var totalDist = profileCanvas.totalDistance;
  var hasStart = false, hasEnd = false;
  for (var i = 0; i < wps.length; i++) {
    if (Math.abs(wps[i].dist) < 0.001) hasStart = true;
    if (Math.abs(wps[i].dist - totalDist) < 0.001) hasEnd = true;
  }
  if (!hasStart) {
    var c0 = interpolateCoords(0);
    wps.push({name:"Inicio", dist:0, ele:interpolateElevation(0), lat:c0.lat, lng:c0.lng});
  }
  if (!hasEnd) {
    var c1 = interpolateCoords(totalDist);
    wps.push({name:"Final", dist:totalDist, ele:interpolateElevation(totalDist), lat:c1.lat, lng:c1.lng});
  }
  renumberWaypoints();
  profileCanvas.waypoints.forEach(function(wp) {
    if (wp.lat != null && wp.lng != null && profileCanvas.trackpoints && profileCanvas.trackpoints.length) {
      var bestD = Infinity;
      for (var t = 0; t < profileCanvas.trackpoints.length; t++) {
        var d = haversine(wp.lat, wp.lng, profileCanvas.trackpoints[t].lat, profileCanvas.trackpoints[t].lng);
        if (d < bestD) bestD = d;
      }
      wp.offTrackDist = bestD;
    } else {
      wp.offTrackDist = 0;
    }
  });
}
function openGPX() {
  var input = document.getElementById("gpx-file-input");
  if (!input) {
    input = document.createElement("input");
    input.id = "gpx-file-input";
    input.type = "file";
    input.accept = ".gpx,.kml";
    input.style.position = "fixed";
    input.style.top = "0";
    input.style.left = "0";
    input.style.width = "1px";
    input.style.height = "1px";
    input.style.opacity = "0";
    input.style.pointerEvents = "none";
    document.body.appendChild(input);
  }
  input.onchange = function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var prevName = gpxFileName;
    gpxFileName = file.name.replace(/\.(gpx|kml)$/i, '');
    document.getElementById("file-name").textContent = gpxFileName;
    var reader = new FileReader();
    reader.onload = async function(ev) {
      var isKml = /\.kml$/i.test(file.name);
      var data = isKml ? kmlParser.parse(ev.target.result) : gpxParser.parse(ev.target.result);
      if (data.multiple && data.tracks && data.tracks.length > 1) {
        var sel = await showTrackSelector(data.tracks);
        if (!sel) {
          gpxFileName = prevName;
          document.getElementById("file-name").textContent = gpxFileName;
          return;
        }
        originalFileXml = ev.target.result;
        selectedTrackName = sel.name;
        originalFileFormat = isKml ? 'kml' : 'gpx';
        originalTracks = data.tracks;
        originalWaypoints = data.waypoints;
        data = {
          trackpoints: sel.trackpoints,
          totalDistance: sel.totalDistance,
          maxEle: sel.maxEle,
          minEle: sel.minEle,
          waypoints: data.waypoints,
          zones: data.zones
        };
        if (!isKml) {
          gpxParser.attachWaypoints(data.waypoints, data.trackpoints);
        } else {
          kmlParser.attachWaypoints(data.waypoints, data.trackpoints);
        }
      } else {
        originalFileXml = null;
        selectedTrackName = null;
        originalFileFormat = null;
        originalTracks = null;
        originalWaypoints = null;
      }
      currentData = data;
      profileCanvas.waypoints = [];
      profileCanvas.zones = [];
      waypointCounter = 0;
      zoneCounter = 0;
      if (data.waypoints) {
        data.waypoints.sort(function(a, b) { return a.dist - b.dist; }).forEach(function(wp) {
          profileCanvas.waypoints.push({name: wp.name, dist: wp.dist, ele: wp.ele, lat: wp.lat, lng: wp.lng});
        });
      }
      profileCanvas.totalDistance = data.totalDistance;
      profileCanvas.trackpoints = data.trackpoints;
      ensureStartEndWaypoints();
      profileCanvas.loadData(data);
      if (data.zones && data.zones.length) {
        data.zones.forEach(function(z) {
          var zStart = z.startDist != null ? z.startDist : z.start;
          var zEnd = z.endDist != null ? z.endDist : z.end;
          zoneCounter++;
          profileCanvas.zones.push({
            id: z.id || ("zone-" + zoneCounter),
            name: z.name || ("Zona " + zoneCounter),
            startDist: zStart,
            endDist: zEnd,
            startEle: z.startEle != null ? z.startEle : profileCanvas.interpolateEle(zStart),
            endEle: z.endEle != null ? z.endEle : profileCanvas.interpolateEle(zEnd)
          });
        });
      }
      profileCanvas.waypoints.forEach(function(wp) {
        if (wp.lat != null && wp.lng != null && profileCanvas.trackpoints && profileCanvas.trackpoints.length) {
          var bestD = Infinity;
          for (var t = 0; t < profileCanvas.trackpoints.length; t++) {
            var d = haversine(wp.lat, wp.lng, profileCanvas.trackpoints[t].lat, profileCanvas.trackpoints[t].lng);
            if (d < bestD) bestD = d;
          }
          wp.offTrackDist = bestD;
        } else {
          wp.offTrackDist = 0;
        }
      });
      profileCanvas.waypoints.forEach(function(wp) {
        if (wp.ele == null || isNaN(wp.ele) || wp.ele === undefined) {
          wp.ele = interpolateElevation(wp.dist);
        }
      });
      elevationProfile = calculateElevationProfile(profileCanvas.trackpoints, profileCanvas.totalDistance, getDesnivelSettings());
      profileCanvas.elevationProfile = elevationProfile;
      try { localStorage.setItem("mapa-revision", String(Date.now())); } catch(e) {}
      try { localStorage.setItem("mapa-gpx-id", Date.now() + ":" + gpxFileName); } catch(e) {}
      try { localStorage.removeItem("mapa-pois-cache"); } catch(e) {}
      updateFileStats();
      profileCanvas.render();
      updateSidebar();
    };
    reader.readAsText(file);
    input.value = "";
  };
  input.click();
}
function saveProject() {
  var project = { trackpoints: currentData.trackpoints, waypoints: profileCanvas.waypoints, zones: profileCanvas.zones };
  console.log("Proyecto:", project);
}
function calcCumulativeElevation(dist) {
  if (!elevationProfile || !elevationProfile.profile) return {pos: 0, neg: 0};
  var pt = elevationProfile.profile.find(function(p) { return p.dist >= dist; }) || elevationProfile.profile[elevationProfile.profile.length - 1];
  return {pos: Math.round(pt.dPos), neg: Math.round(pt.dNeg)};
}

function calcSegElevation(startDist, endDist) {
  if (!elevationProfile || !elevationProfile.profile) return {pos: 0, neg: 0};
  var startPt = elevationProfile.profile.find(function(p) { return p.dist >= startDist; }) || elevationProfile.profile[0];
  var endPt = elevationProfile.profile.find(function(p) { return p.dist >= endDist; }) || elevationProfile.profile[elevationProfile.profile.length - 1];
  return {pos: Math.max(0, Math.round(endPt.dPos - startPt.dPos)), neg: Math.min(0, Math.round(endPt.dNeg - startPt.dNeg))};
}
function exportReportTable(format, wps, trackMinEle, trackMaxEle) {
  var headerLabels = ["N\u00ba","Nombre","Km","Altura","Dist.\nSig.","Prox. WP\n+ (m)","Prox. WP\n\u2212 (m)","Acum.\n+ (m)","Acum.\n\u2212 (m)"];
  var colAligns = ["right","left","right","right","right","right","right","right","right"];
  var padL = 8, padR = 8;
  var mc = document.createElement("canvas").getContext("2d");
  mc.font = 'bold 12px sans-serif';
  var colWidths = [];
  for (var ci = 0; ci < headerLabels.length; ci++) {
    var headerLines = headerLabels[ci].split("\n");
    var maxW = 0;
    for (var hli = 0; hli < headerLines.length; hli++) {
      var hlw = mc.measureText(headerLines[hli]).width;
      if (hlw > maxW) maxW = hlw;
    }
    mc.font = '12px sans-serif';
    for (var ri = 0; ri < wps.length; ri++) {
      var wp = wps[ri];
      var nextIdx = findNextOnTrack(wps, ri);
      var segEle = calcSegElevation(wp.dist, nextIdx !== -1 ? wps[nextIdx].dist : profileCanvas.totalDistance);
      var cum = calcCumulativeElevation(wp.dist);
      var vals = exportCellText(ri, wp, segEle, cum);
      var tw = mc.measureText(String(vals[ci])).width;
      if (tw > maxW) maxW = tw;
    }
    mc.font = 'bold 12px sans-serif';
    colWidths.push(Math.ceil(maxW) + padL + padR + 4);
  }
  var rowHeight = 18, headerH = 26, titleH = 32;
  var totalW = 0;
  for (var ci = 0; ci < colWidths.length; ci++) totalW += colWidths[ci];
  totalW += colWidths.length;
  var totalH = titleH + headerH + wps.length * rowHeight + 1;
  var cellColor = function(ri, ci, wp) {
    if (ri === -1) return {bg:"#1565C0", fg:"#fff"};
    var bg = ri % 2 === 0 ? '#e0e0e0' : '#fff';
    var fg = '#333';
    if (ci === 3 && wp && wp.ele !== undefined) {
      if (Math.abs(wp.ele - trackMinEle) < 0.01) fg = '#0d47a1';
      else if (Math.abs(wp.ele - trackMaxEle) < 0.01) fg = '#e53935';
    }
    if (ci === 1 && wp && wp.poiType === "water") fg = '#00008B';
    if (ci === 5 || ci === 7) fg = '#e53935';
    else if (ci === 6 || ci === 8) fg = '#0d47a1';
    return {bg: bg, fg: fg};
  };
  function exportCellText(ri, wp, segEle, cum) {
    if (ri === -1) return headerLabels;
    var nameDisplay = wp.name;
    if (wp.poiType === "peak") nameDisplay = "\u25B2 " + nameDisplay;
    else if (wp.poiType === "pass") nameDisplay = "][ " + nameDisplay;
    if (wp.offTrackDist > 0.05) nameDisplay += ' (fuera de track ' + Math.round(wp.offTrackDist * 1000) + ' m)';
    var nextIdx = findNextOnTrack(wps, ri);
    var nextDist = nextIdx !== -1 ? wps[nextIdx].dist - wp.dist : 0;
    var surfaceEle = interpolateElevation(wp.dist);
    var eleVal = (surfaceEle != null && !isNaN(surfaceEle)) ? Math.round(surfaceEle) : '-';
    return [
      wp.number, nameDisplay, wp.dist.toFixed(1), eleVal,
      nextDist > 0 ? nextDist.toFixed(1) : '-',
      '+' + (segEle.pos > 0 ? segEle.pos : 0),
      segEle.neg < 0 ? segEle.neg : 0,
      '+' + (cum.pos > 0 ? cum.pos : 0),
      cum.neg < 0 ? cum.neg : 0
    ];
  }
  var font = '12px sans-serif';
  var headerFont = 'bold 12px sans-serif';
  var svg = '<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+totalW+' '+totalH+'" width="'+totalW+'" height="'+totalH+'"><rect width="'+totalW+'" height="'+totalH+'" fill="white"/>';
  svg += '<text x="'+padL+'" y="'+(titleH/2)+'" fill="#111" font-size="12" font-family="sans-serif" font-weight="bold" text-anchor="start" dominant-baseline="central">INFORME - '+escXml(gpxFileName)+'</text>';
  var x = 0;
  var y = titleH;
  for (var ri = -1; ri < wps.length; ri++) {
    var wp = ri >= 0 ? wps[ri] : null;
    var segEle = null;
    var cum = null;
    if (ri >= 0) {
      var nIdx = findNextOnTrack(wps, ri);
      segEle = calcSegElevation(wp.dist, nIdx !== -1 ? wps[nIdx].dist : profileCanvas.totalDistance);
      cum = calcCumulativeElevation(wp.dist);
    }
    var texts = exportCellText(ri, wp, segEle, cum);
    x = 0;
    for (var ci = 0; ci < colWidths.length; ci++) {
      var cw = colWidths[ci];
      var clr = cellColor(ri, ci, wp, segEle, cum);
      if (ri === -1) {
        svg += '<rect x="'+x+'" y="'+y+'" width="'+cw+'" height="'+headerH+'" fill="#1565C0"/>';
        svg += '<rect x="'+x+'" y="'+(y+headerH-1)+'" width="'+cw+'" height="1" fill="#1565C0"/>';
      } else {
        svg += '<rect x="'+x+'" y="'+y+'" width="'+cw+'" height="'+rowHeight+'" fill="'+clr.bg+'"/>';
        svg += '<rect x="'+x+'" y="'+y+'" width="1" height="'+rowHeight+'" fill="#ddd"/>';
      }
      var tx = x + (colAligns[ci] === 'right' ? cw - padR : padL);
      var ty = y + (ri === -1 ? headerH / 2 : rowHeight / 2);
      var anchor = colAligns[ci] === 'right' ? 'end' : 'start';
      var f = ri === -1 ? headerFont : font;
      var fw = ri === -1 ? 'bold' : 'normal';
      var txt = texts[ci] !== undefined ? String(texts[ci]) : '';
      if (ri === -1 && txt.indexOf("\n") !== -1) {
        var headerLines2 = txt.split("\n");
        for (var li = 0; li < headerLines2.length; li++) {
          var ly = ty + (li === 0 ? -6.5 : 6.5);
          var la = li === 0 ? anchor : 'middle';
          var lx = li === 0 ? tx : tx - mc.measureText(headerLines2[0]).width / 2;
          svg += '<text x="'+lx+'" y="'+ly+'" fill="'+clr.fg+'" font-size="12" font-family="sans-serif" font-weight="'+fw+'" text-anchor="'+la+'" dominant-baseline="central">'+escXml(headerLines2[li])+'</text>';
        }
      } else {
        svg += '<text x="'+tx+'" y="'+ty+'" fill="'+clr.fg+'" font-size="12" font-family="sans-serif" font-weight="'+fw+'" text-anchor="'+anchor+'" dominant-baseline="central">'+escXml(txt)+'</text>';
      }
      x += cw + 1;
    }
    y += ri === -1 ? headerH : rowHeight;
  }
  svg += '</svg>';
  if (format === 'svg') {
    downloadFile(svg, gpxFileName + "_informe.svg", "image/svg+xml");
    return;
  }
  var img = new Image();
  img.onload = function() {
    var c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    var cx = c.getContext("2d");
    cx.drawImage(img, 0, 0);
    if (format === "png") {
      c.toBlob(function(blob) { downloadBlob(blob, gpxFileName + "_informe.png"); });
    }
    else if (format === "jpg") {
      var c2 = document.createElement("canvas");
      c2.width = c.width;
      c2.height = c.height;
      var cx2 = c2.getContext("2d");
      cx2.fillStyle = "white";
      cx2.fillRect(0, 0, c2.width, c2.height);
      cx2.drawImage(c, 0, 0);
      c2.toBlob(function(blob) { downloadBlob(blob, gpxFileName + "_informe.jpg"); }, "image/jpeg", 0.92);
    }
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function findNextOnTrack(wps, i) {
  for (var j = i + 1; j < wps.length; j++) {
    if (wps[j].offTrackDist <= 0.1) return j;
  }
  return -1;
}
function showInformes() {
  if (!currentData || !profileCanvas.waypoints.length) return;
  var allWps = profileCanvas.waypoints.slice();
  allWps.sort(function(a,b){return a.dist - b.dist;});
  var wps = allWps.filter(function(wp){ return wp.offTrackDist <= 0.1; });
  if (!wps.length) { alert("No hay waypoints dentro de 100m del track para mostrar el informe."); return; }
  var tps = profileCanvas.trackpoints;
  var trackMinEle = tps[0].ele, trackMaxEle = tps[0].ele;
  for (var t = 0; t < tps.length; t++) {
    if (tps[t].ele < trackMinEle) trackMinEle = tps[t].ele;
    if (tps[t].ele > trackMaxEle) trackMaxEle = tps[t].ele;
  }
  var rows = '';
  for (var i = 0; i < wps.length; i++) {
    var wp = wps[i];
    var nextIdx = findNextOnTrack(wps, i);
    var nextDist = nextIdx !== -1 ? wps[nextIdx].dist - wp.dist : 0;
    var segEle = calcSegElevation(wp.dist, nextIdx !== -1 ? wps[nextIdx].dist : profileCanvas.totalDistance);
    var cum = calcCumulativeElevation(wp.dist);
    var bg = i % 2 === 0 ? '#e0e0e0' : '#fff';
    var nameDisplay = wp.name;
    if (wp.poiType === "peak") nameDisplay = "\u25B2 " + nameDisplay;
    else if (wp.poiType === "pass") nameDisplay = "<b>][</b> " + nameDisplay;
    else if (wp.poiType === "water") nameDisplay = '<span style="color:#00008B">' + nameDisplay + '</span>';
    if (wp.offTrackDist > 0.05) nameDisplay += ' <span style="color:#e65100;font-size:10px">(fuera de track ' + Math.round(wp.offTrackDist * 1000) + ' m)</span>';
    var surfaceEle = interpolateElevation(wp.dist);
    var eleDisplay = (surfaceEle != null && !isNaN(surfaceEle)) ? Math.round(surfaceEle) : '-';
    rows += '<tr style="background:'+bg+'"><td style="padding:2px 8px;border:1px solid #ddd;text-align:right">'+wp.number+'</td><td style="padding:2px 8px;border:1px solid #ddd">'+nameDisplay+'</td><td style="padding:2px 8px;border:1px solid #ddd;text-align:right">'+wp.dist.toFixed(1)+'</td><td style="padding:2px 8px;border:1px solid #ddd;text-align:right">'+eleDisplay+'</td><td style="padding:2px 8px;border:1px solid #ddd;text-align:right">'+(nextDist > 0 ? nextDist.toFixed(1) : '-')+'</td><td style="padding:2px 8px;border:1px solid #ddd;text-align:right;color:#e53935">+'+ (segEle.pos > 0 ? segEle.pos : 0)+'</td><td style="padding:2px 8px;border:1px solid #ddd;text-align:right;color:#0d47a1">'+(segEle.neg < 0 ? segEle.neg : 0)+'</td><td style="padding:2px 8px;border:1px solid #ddd;text-align:right;color:#e53935">+'+ (cum.pos > 0 ? cum.pos : 0)+'</td><td style="padding:2px 8px;border:1px solid #ddd;text-align:right;color:#0d47a1">'+(cum.neg < 0 ? cum.neg : 0)+'</td></tr>';
  }
  var overlay = document.getElementById("modal-overlay");
  var box = document.getElementById("modal-box");
  var btns = document.getElementById("modal-buttons");
  var isMobile = window.innerWidth < 768;
  if (isMobile) {
    box.style.position = "fixed";
    box.style.top = "0";
    box.style.left = "0";
    box.style.width = "100vw";
    box.style.height = "100dvh";
    box.style.maxWidth = "100vw";
    box.style.maxHeight = "100dvh";
    box.style.minWidth = "0";
    box.style.minHeight = "0";
    box.style.margin = "0";
    box.style.borderRadius = "0";
    box.style.cursor = "default";
    box.style.resize = "none";
    box.style.overflow = "hidden";
    box.style.display = "flex";
    box.style.flexDirection = "column";
    document.getElementById("modal-body").style.flex = "1";
    document.getElementById("modal-body").style.overflow = "hidden";
    document.getElementById("modal-body").style.display = "flex";
    document.getElementById("modal-body").style.flexDirection = "column";
    document.getElementById("modal-title").style.cursor = "default";
    document.getElementById("modal-title").style.flexShrink = "0";
    btns.style.flexShrink = "0";
  } else {
    box.style.position = "absolute";
    box.style.top = "60px";
    box.style.left = "120px";
    box.style.cursor = "default";
    box.style.resize = "both";
    box.style.overflow = "auto";
    box.style.minWidth = "400px";
    box.style.minHeight = "200px";
    box.style.maxWidth = "none";
    box.style.maxHeight = (window.innerHeight - 40) + "px";
    box.style.height = "";
    box.style.overflow = "auto";
  }
  overlay.style.display = "block";
  document.getElementById("modal-title").textContent = "INFORME - " + gpxFileName;
  if (!isMobile) document.getElementById("modal-title").style.cursor = "move";
  var lbl = document.getElementById("modal-label");
  if (lbl) lbl.textContent = "";
  var input = document.getElementById("modal-input");
  if (input) input.style.display = "none";
  btns.innerHTML = '<button id="inf-btn-export-png" style="background:#1565C0;color:#fff;border-color:#1565C0">PNG</button><button id="inf-btn-export-jpg" style="background:#1565C0;color:#fff;border-color:#1565C0">JPG</button><button id="inf-btn-export-svg" style="background:#1565C0;color:#fff;border-color:#1565C0">SVG</button><button id="inf-btn-close" class="btn-primary">Cerrar</button>';
  var body = document.getElementById("modal-body");
  var oldTable = document.getElementById("inf-table-wrap");
  if (oldTable) oldTable.remove();
  var wrap = document.createElement("div");
  wrap.id = "inf-table-wrap";
  wrap.style.overflowX = "auto";
  wrap.style.maxWidth = "100%";
  if (isMobile) {
    wrap.style.flex = "1";
    wrap.style.minHeight = "0";
  }
  wrap.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:12px;table-layout:auto;white-space:nowrap"><thead><tr style="background:#1565C0;color:#fff"><th style="padding:6px 8px;border:1px solid #1565C0;text-align:right">N\u00ba</th><th style="padding:6px 8px;border:1px solid #1565C0;text-align:left">Nombre</th><th style="padding:6px 8px;border:1px solid #1565C0;text-align:right">Km</th><th style="padding:6px 8px;border:1px solid #1565C0;text-align:right">Altura</th><th style="padding:6px 8px;border:1px solid #1565C0;text-align:right;white-space:nowrap">Dist.<br><span style="display:block;text-align:center">Sig.</span></th><th style="padding:6px 8px;border:1px solid #1565C0;text-align:right;white-space:nowrap">Prox. WP<br><span style="display:block;text-align:center">+ (m)</span></th><th style="padding:6px 8px;border:1px solid #1565C0;text-align:right;white-space:nowrap">Prox. WP<br><span style="display:block;text-align:center">\u2212 (m)</span></th><th style="padding:6px 8px;border:1px solid #1565C0;text-align:right;white-space:nowrap">Acum.<br><span style="display:block;text-align:center">+ (m)</span></th><th style="padding:6px 8px;border:1px solid #1565C0;text-align:right;white-space:nowrap">Acum.<br><span style="display:block;text-align:center">\u2212 (m)</span></th></tr></thead><tbody>'+rows+'</tbody></table>';
  body.appendChild(wrap);
  overlay.classList.remove("hidden");
  box.classList.add("wide");
  if (!isMobile) {
    var dragOffX = 0, dragOffY = 0;
    document.getElementById("modal-title").onmousedown = function(e) {
      dragOffX = e.clientX - box.offsetLeft;
      dragOffY = e.clientY - box.offsetTop;
      function onMove(e2) {
        box.style.left = (e2.clientX - dragOffX) + "px";
        box.style.top = (e2.clientY - dragOffY) + "px";
      }
      function onUp() {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      }
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    };
  }
  document.getElementById("inf-btn-export-png").onclick = function() { exportReportTable("png", wps, trackMinEle, trackMaxEle); };
  document.getElementById("inf-btn-export-jpg").onclick = function() { exportReportTable("jpg", wps, trackMinEle, trackMaxEle); };
  document.getElementById("inf-btn-export-svg").onclick = function() { exportReportTable("svg", wps, trackMinEle, trackMaxEle); };
  document.getElementById("inf-btn-close").onclick = function() {
    var t = document.getElementById("inf-table-wrap");
    if (t) t.remove();
    box.classList.remove("wide");
    box.style.position = "";
    box.style.top = "";
    box.style.left = "";
    box.style.cursor = "";
    box.style.resize = "";
    box.style.overflow = "";
    box.style.minWidth = "";
    box.style.minHeight = "";
    box.style.maxWidth = "";
    box.style.height = "";
    box.style.maxHeight = "";
    box.style.overflow = "";
    box.style.width = "";
    box.style.margin = "";
    box.style.borderRadius = "";
    box.style.display = "";
    box.style.flexDirection = "";
    document.getElementById("modal-body").style.flex = "";
    document.getElementById("modal-body").style.overflow = "";
    document.getElementById("modal-body").style.display = "";
    document.getElementById("modal-body").style.flexDirection = "";
    document.getElementById("modal-title").style.cursor = "";
    document.getElementById("modal-title").style.flexShrink = "";
    btns.style.flexShrink = "";
    overlay.style.display = "";
    overlay.classList.add("hidden");
    btns.innerHTML = '<button id="modal-ok" class="btn-primary">OK</button><button id="modal-cancel">Cancelar</button>';
    input.style.display = "";
  };
}
function showExportMenu() {
  return new Promise(function(resolve) {
    var overlay = document.getElementById("modal-overlay");
    document.getElementById("modal-title").textContent = "Exportar";
    document.getElementById("modal-label").textContent = "Selecciona formato:";
    var input = document.getElementById("modal-input");
    input.style.display = "none";
    var btns = document.getElementById("modal-buttons");
    btns.innerHTML = '<button id="export-btn-png" style="background:#1565C0;color:#fff;border-color:#1565C0">PNG</button><button id="export-btn-jpg" style="background:#1565C0;color:#fff;border-color:#1565C0">JPG</button><button id="export-btn-svg" style="background:#1565C0;color:#fff;border-color:#1565C0">SVG</button><button id="export-btn-cancel">Cancelar</button>';
    overlay.classList.remove("hidden");
    function cleanup() {
      overlay.classList.add("hidden");
      btns.innerHTML = '<button id="modal-ok" class="btn-primary">OK</button><button id="modal-cancel">Cancelar</button>';
      document.getElementById("modal-label").textContent = "";
      input.style.display = "";
    }
    document.getElementById("export-btn-png").onclick = function() { cleanup(); resolve("png"); };
    document.getElementById("export-btn-jpg").onclick = function() { cleanup(); resolve("jpg"); };
    document.getElementById("export-btn-svg").onclick = function() { cleanup(); resolve("svg"); };
    document.getElementById("export-btn-cancel").onclick = function() { cleanup(); resolve(null); };
  });
}
function renderLabelsOnCanvas(c) {
  var layout = profileCanvas._wpLayout;
  if (!layout || !profileCanvas.mostrarNombres) return;
  var ctx = c.getContext("2d");
  var dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  var r = Math.max(6, Math.min(10, profileCanvas.width / 100));
  for (var i = 0; i < profileCanvas.waypoints.length; i++) {
    var wp = profileCanvas.waypoints[i];
    var symX = layout.leaderInfo && layout.leaderInfo[i] ? layout.leaderInfo[i].shiftX : profileCanvas.xPos(wp.dist);
    var symY = layout.symYs[i];
    var label = profileCanvas.mostrarSimbolos ? wp.name : wp.number + " - " + wp.name;
    if (wp.poiType === "peak") label = "\u25B2 " + label;
    else if (wp.poiType === "pass") label = "][" + label;
    var adj = profileCanvas.mostrarSimbolos ? r + 5 : 5;
    var labelY = symY - adj;
    var textH = label.length * 6.5 + 4;
    if (labelY < textH) labelY = textH;
    ctx.save();
    ctx.translate(symX - 6, labelY);
    ctx.rotate(-Math.PI / 2);
    if (wp.poiType === "pass") {
      ctx.font = "bold 11px sans-serif";
      ctx.fillStyle = "#333";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("][", 0, 0);
      var restWidth = ctx.measureText("][").width;
      ctx.font = "11px sans-serif";
      ctx.fillText(label.replace(/^\]\[/, ""), restWidth + 2, 0);
    } else {
      ctx.font = "11px sans-serif";
      ctx.fillStyle = "#333";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(label, 0, 0);
    }
    ctx.restore();
  }
}
async function exportDialog() {
  var choice = await showExportMenu();
  if (!choice) return;
  if (profileCanvas.selectedElement) {
    profileCanvas.selectedElement = null;
    profileCanvas.render();
  }
  if (choice === "png") {
    renderLabelsOnCanvas(profileCanvas.canvas);
    profileCanvas.canvas.toBlob(function(blob) { downloadBlob(blob, gpxFileName + ".png"); });
  }
  else if (choice === "jpg") {
    var c = document.createElement("canvas");
    c.width = profileCanvas.canvas.width;
    c.height = profileCanvas.canvas.height;
    var cx = c.getContext("2d");
    cx.fillStyle = "white";
    cx.fillRect(0, 0, c.width, c.height);
    cx.drawImage(profileCanvas.canvas, 0, 0);
    renderLabelsOnCanvas(c);
    c.toBlob(function(blob) { downloadBlob(blob, gpxFileName + ".jpg"); }, "image/jpeg", 0.92);
  }
  else if (choice === "svg") downloadFile(ExportEngine.toSVG(profileCanvas), gpxFileName + ".svg", "image/svg+xml");
}
async function addWaypoint() {
  var name = await showModal("Nuevo Waypoint", "Nombre:");
  if (!name) return;
  if (!currentData) { alert("Carga un GPX primero"); return; }
  var dist = await showModal("Nuevo Waypoint", "Distancia (km):");
  if (dist === null) return;
  var coords = interpolateCoords(parseFloat(dist));
  profileCanvas.waypoints.push({name:name, dist:parseFloat(dist), ele:interpolateElevation(parseFloat(dist)), lat:coords.lat, lng:coords.lng});
  renumberWaypoints();
  profileCanvas.render();
  updateSidebar();
  syncMapaWaypoints();
}
async function addZone() {
  if (!currentData) return;
  var start = await showModal("Nueva Zona", "Inicio (km):");
  if (start === null) return;
  var end = await showModal("Nueva Zona", "Fin (km):");
  if (end === null) return;
  zoneCounter++;
  profileCanvas.zones.push({id:"zone-"+zoneCounter, name:"Zona "+zoneCounter, startDist:parseFloat(start), endDist:parseFloat(end), startEle:interpolateElevation(parseFloat(start)), endEle:interpolateElevation(parseFloat(end))});
  profileCanvas.render();
  updateSidebar();
}
function deleteSelected() {
  if (!profileCanvas.selectedElement) return;
  var id = profileCanvas.selectedElement.id;
  if (id && id.startsWith("wp-")) {
    profileCanvas.waypoints = profileCanvas.waypoints.filter(function(w){return w.id !== id;});
    renumberWaypoints();
  } else if (id && id.startsWith("zone-")) {
    profileCanvas.zones = profileCanvas.zones.filter(function(z){return z.id !== id;});
  }
  profileCanvas.selectedElement = null;
  profileCanvas.render();
  updateSidebar();
  syncMapaWaypoints();
}
function findWaypointAt(mx,my) {
  var r=Math.max(6,Math.min(10,profileCanvas.width/100));
  var baseSymY=profileCanvas.yPos(profileCanvas.maxEle)-50;
  var pos=[];
  for(var i=0;i<profileCanvas.waypoints.length;i++) {
    var x=profileCanvas.xPos(profileCanvas.waypoints[i].dist);
    pos.push({x:x, symY: baseSymY});
  }
  var leader = profileCanvas._wpLayout ? profileCanvas._wpLayout.leaderInfo : null;
  for(var i=0;i<profileCanvas.waypoints.length;i++) {
    var wp=profileCanvas.waypoints[i];
    var symX = (leader && leader[i]) ? leader[i].shiftX : pos[i].x;
    var d=Math.sqrt((mx-symX)*(mx-symX)+(pos[i].symY-my)*(pos[i].symY-my));
    if(d<r+5) return wp;
  }
  return null;
}
function selectElementAt(mx,my) {
  var wp = findWaypointAt(mx, my);
  if (wp) { profileCanvas.selectedElement = wp; profileCanvas.render(); updateSidebar(); return; }
  for(var i=0;i<profileCanvas.zones.length;i++) {
    var z=profileCanvas.zones[i];
    var x1=profileCanvas.xPos(z.startDist),x2=profileCanvas.xPos(z.endDist);
    var a=profileCanvas.drawArea,b=a.y+a.height*0.85;
    if(mx>=x1&&mx<=x2&&my>=a.y&&my<=b){profileCanvas.selectedElement=z;profileCanvas.render();updateSidebar();return;}
  }
  profileCanvas.selectedElement=null;profileCanvas.render();updateSidebar();
}
function syncMapaWaypoints() {
  try { localStorage.setItem("mapa-wp-update", JSON.stringify(profileCanvas.waypoints)); } catch(ex) {}
}
function updateSidebar() {
  var wl = document.getElementById("wp-list");
  wl.innerHTML = "";
  for(var i=0;i<profileCanvas.waypoints.length;i++){
    var wp = profileCanvas.waypoints[i];
    var li = document.createElement("li");
    li.className = "sidebar-item" + (wp.offTrackDist > 0.05 ? " offtrack" : "");
    var span = document.createElement("span");
    span.textContent = wp.number + "   " + wp.name + (wp.offTrackDist > 0.05 ? " \u26A0" : "");
    span.style.flex = "1";
    var del = document.createElement("button");
    del.textContent = "X";
    del.className = "sidebar-del";
    (function(wp, del){ del.onclick = async function(e){ e.stopPropagation(); var ok = await showConfirm("Eliminar WP", "Eliminar " + wp.name + "?"); if (!ok) return; profileCanvas.waypoints.splice(profileCanvas.waypoints.indexOf(wp),1); renumberWaypoints(); profileCanvas.selectedElement = null; profileCanvas.render(); updateSidebar(); syncMapaWaypoints(); }; })(wp, del);
    li.appendChild(span);
    li.appendChild(del);
    li.dataset.id = wp.id;
    wl.appendChild(li);
  }
  var zl = document.getElementById("zone-list");
  zl.innerHTML = "";
  profileCanvas.zones.sort(function(a,b){return a.startDist - b.startDist;});
  for(var i=0;i<profileCanvas.zones.length;i++){
    var z = profileCanvas.zones[i];
    z.name = "Zona " + (i+1);
    var li = document.createElement("li");
    li.className = "sidebar-item";
    var span = document.createElement("span");
    var d = (z.endDist - z.startDist).toFixed(1);
    var ev = profileCanvas.calcZoneElevation(z);
    span.textContent = z.name + "\n" + z.startDist.toFixed(1) + " - " + z.endDist.toFixed(1) + " km\n" + d + " km  +" + ev.pos + "/" + ev.neg + " m";
    span.style.flex = "1";
    if (ev.pos > 0 && ev.neg === 0) span.style.color = "#e53935";
    else if (ev.neg < 0 && ev.pos === 0) span.style.color = "#0d47a1";
    else span.style.color = "#111";
    var del = document.createElement("button");
    del.textContent = "X";
    del.className = "sidebar-del";
    (function(z, del){ del.onclick = async function(e){ e.stopPropagation(); var ok = await showConfirm("Eliminar Zona", "Eliminar " + z.name + "?"); if (!ok) return; profileCanvas.zones.splice(profileCanvas.zones.indexOf(z),1); profileCanvas.selectedElement = null; profileCanvas.render(); updateSidebar(); }; })(z, del);
    li.appendChild(span);
    li.appendChild(del);
    li.dataset.id = z.id;
    (function(z){ li.onclick = function(){ profileCanvas.selectedElement = z; profileCanvas.render(); updateSidebar(); }; })(z);
    zl.appendChild(li);
  }
}
function getDesnivelSettings() {
  var def = {threshold: 2, windowSize: 5};
  try {
    var raw = localStorage.getItem("desnivel-settings");
    if (raw) {
      var s = JSON.parse(raw);
      if (s && typeof s.threshold === "number" && typeof s.windowSize === "number") return s;
    }
  } catch(e) {}
  return def;
}
function saveDesnivelSettings() {
  try {
    localStorage.setItem("desnivel-settings", JSON.stringify({threshold: getDesnivelThreshold(), windowSize: getDesnivelWindow()}));
  } catch(e) {}
}
function getDesnivelThreshold() {
  var el = document.getElementById("sel-threshold");
  return el ? parseInt(el.value, 10) : 2;
}
function getDesnivelWindow() {
  var el = document.getElementById("sel-window");
  return el ? parseInt(el.value, 10) : 5;
}
function applyDesnivelSettingsToUI() {
  var s = getDesnivelSettings();
  var t = document.getElementById("sel-threshold");
  var w = document.getElementById("sel-window");
  if (t) t.value = String(s.threshold);
  if (w) w.value = String(s.windowSize);
}
function recalcDesnivel() {
  if (!currentData || !profileCanvas) return;
  var opts = {threshold: getDesnivelThreshold(), windowSize: getDesnivelWindow()};
  elevationProfile = calculateElevationProfile(profileCanvas.trackpoints, profileCanvas.totalDistance, opts);
  profileCanvas.elevationProfile = elevationProfile;
  updateFileStats();
  profileCanvas.render();
  updateSidebar();
}
function showDesnivelModal() {
  var overlay = document.getElementById("modal-overlay");
  var box = document.getElementById("modal-box");
  var body = document.getElementById("modal-body");
  var btns = document.getElementById("modal-buttons");
  box.classList.remove("wide");
  box.style.position = "";
  box.style.top = "";
  box.style.left = "";
  box.style.cursor = "";
  box.style.resize = "";
  box.style.overflow = "";
  box.style.minWidth = "";
  box.style.minHeight = "";
  box.style.maxWidth = "";
  box.style.maxHeight = "";
  document.getElementById("modal-title").style.cursor = "";
  document.getElementById("modal-title").textContent = "Configuración del desnivel";
  body.innerHTML = '\
<div style="font-size:13px;line-height:1.5;color:#333;text-align:left">\
  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px">\
    <label for="sel-threshold" style="font-weight:600;white-space:nowrap">Mínimo a acumular:</label>\
    <select id="sel-threshold" style="padding:4px 6px;border:1px solid #ccc;border-radius:4px;font-size:13px">\
      <option value="0">0 m</option>\
      <option value="2">2 m</option>\
      <option value="3">3 m</option>\
      <option value="5">5 m</option>\
      <option value="10">10 m</option>\
      <option value="15">15 m</option>\
    </select>\
    <label for="sel-window" style="font-weight:600;white-space:nowrap">Suavizado:</label>\
    <select id="sel-window" style="padding:4px 6px;border:1px solid #ccc;border-radius:4px;font-size:13px">\
      <option value="1">Sin (1)</option>\
      <option value="3">Ligero (3)</option>\
      <option value="5">Actual (5)</option>\
      <option value="7">Fuerte (7)</option>\
    </select>\
  </div>\
  <div style="background:#f5f5f5;border:1px solid #eee;border-radius:4px;padding:6px 10px;color:#555">\
    <p style="margin:2px 0"><strong>Mínimo a acumular</strong></p>\
    <p style="margin:2px 0">· 0 m&nbsp;&nbsp;= Sumar TODO, sin filtro (máximo)</p>\
    <p style="margin:2px 0">· 2 m&nbsp;&nbsp;= Filtrar oscilaciones menores de 2 m (defecto)</p>\
    <p style="margin:2px 0">· 5 m&nbsp;&nbsp;= Ignorar subidas/bajadas de menos de 5 m</p>\
    <p style="margin:2px 0">· 10 m / 15 m = Solo contar desniveles grandes</p>\
    <p style="margin:2px 0"><strong>Suavizado</strong></p>\
    <p style="margin:2px 0">· Sin (1)&nbsp;&nbsp;&nbsp;&nbsp;= Altitud tal cual del GPS (máximo detalle + ruido)</p>\
    <p style="margin:2px 0">· Ligero (3) = Conserva casi todas las subiditas reales</p>\
    <p style="margin:2px 0">· Actual (5) = Suavizado de 5 puntos (defecto)</p>\
    <p style="margin:2px 0">· Fuerte (7) = Perfil muy liso, solo grandes ascensiones</p>\
  </div>\
  <div style="margin-top:8px;color:#888;font-size:12px">Al pulsar "Por defecto" los selectores se ponen en Mínimo = 2 m y Suavizado = 5.</div>\
</div>';
  btns.innerHTML = '<button id="btn-desnivel-default" style="margin-right:auto">Por defecto</button><button id="btn-desnivel-close">Cerrar</button>';
  applyDesnivelSettingsToUI();
  var t = document.getElementById("sel-threshold");
  var w = document.getElementById("sel-window");
  var dirty = false;
  function showAceptar() {
    if (document.getElementById("btn-desnivel-aceptar")) return;
    dirty = true;
    var aceptar = document.createElement("button");
    aceptar.id = "btn-desnivel-aceptar";
    aceptar.className = "btn-primary";
    aceptar.textContent = "Aceptar";
    aceptar.onclick = function() {
      saveDesnivelSettings();
      recalcDesnivel();
      overlay.classList.add("hidden");
      body.innerHTML = '<label id="modal-label"></label><input id="modal-input" type="text">';
      btns.innerHTML = '<button id="modal-ok" class="btn-primary">OK</button><button id="modal-cancel">Cancelar</button>';
    };
    btns.insertBefore(aceptar, document.getElementById("btn-desnivel-close"));
  }
  t.addEventListener("change", showAceptar);
  w.addEventListener("change", showAceptar);
  document.getElementById("btn-desnivel-default").onclick = function() {
    t.value = "2";
    w.value = "5";
    showAceptar();
  };
  document.getElementById("btn-desnivel-close").onclick = function() {
    overlay.classList.add("hidden");
    body.innerHTML = '<label id="modal-label"></label><input id="modal-input" type="text">';
    btns.innerHTML = '<button id="modal-ok" class="btn-primary">OK</button><button id="modal-cancel">Cancelar</button>';
  };
  overlay.classList.remove("hidden");
}
function initDesnivelConfig() {
  var btn = document.getElementById("btn-desnivel");
  if (!btn) return;
  btn.addEventListener("click", showDesnivelModal);
}
function updateFileStats() {
  var el = document.getElementById("file-stats");
  if (!currentData || !elevationProfile) {
    el.textContent = "";
    return;
  }
  var distStr = currentData.totalDistance.toFixed(1).replace('.', ',');
  var pos = Math.round(elevationProfile.pos);
  var neg = Math.round(Math.abs(elevationProfile.neg));
  el.innerHTML = '<span class="file-stat-dist-label">Distancia:</span> <span class="file-stat-dist-value">' + distStr + ' Km</span>  <span class="file-stat-pos">' + pos + 'm+</span>  <span class="file-stat-neg">' + neg + 'm-</span>';
}
function interpolateElevation(dist) {
  if (!currentData) return 0;
  var pts = currentData.trackpoints;
  for (var i = 0; i < pts.length - 1; i++) {
    if (dist >= pts[i].dist && dist <= pts[i+1].dist) {
      var r = (dist - pts[i].dist) / (pts[i+1].dist - pts[i].dist);
      return pts[i].ele + r * (pts[i+1].ele - pts[i].ele);
    }
  }
  return pts[pts.length-1].ele;
}
function interpolateCoords(dist) {
  var pts = currentData.trackpoints;
  for (var i = 0; i < pts.length - 1; i++) {
    if (dist >= pts[i].dist && dist <= pts[i+1].dist) {
      var r = (dist - pts[i].dist) / (pts[i+1].dist - pts[i].dist);
      return {lat: pts[i].lat + r * (pts[i+1].lat - pts[i].lat), lng: pts[i].lng + r * (pts[i+1].lng - pts[i].lng)};
    }
  }
  var last = pts[pts.length - 1];
  return {lat: last.lat, lng: last.lng};
}
function renumberWaypoints() {
  profileCanvas.waypoints.sort(function(a,b){return a.dist - b.dist;});
  for (var i = 0; i < profileCanvas.waypoints.length; i++) {
    profileCanvas.waypoints[i].number = i + 1;
    profileCanvas.waypoints[i].id = "wp-" + (i + 1);
  }
  if (profileCanvas.selectedElement && profileCanvas.selectedElement.id && profileCanvas.selectedElement.id.indexOf("wp-") === 0) {
    var selId = profileCanvas.selectedElement.id;
    var found = false;
    for (var i = 0; i < profileCanvas.waypoints.length; i++) {
      if (profileCanvas.waypoints[i].id === selId) { found = true; break; }
    }
    if (!found) profileCanvas.selectedElement = null;
  }
}
function generateGPX() {
  var xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<gpx version="1.1" creator="EditorPerfiles" xmlns="http://www.topografix.com/GPX/1/1" xmlns:zns="http://editorperfiles/zones">\n';
  var zones = profileCanvas.zones;
  if (originalTracks && selectedTrackName) {
    for (var ti = 0; ti < originalTracks.length; ti++) {
      var trk = originalTracks[ti];
      var tps = trk.name === selectedTrackName ? profileCanvas.trackpoints : trk.trackpoints;
      xml += '  <trk>\n    <name>' + escXml(trk.name) + '</name>\n';
      if (trk.name === selectedTrackName && zones && zones.length) {
        xml += '    <extensions>\n      <zns:zones>\n';
        for (var zi = 0; zi < zones.length; zi++) {
          var z = zones[zi];
          xml += '        <zns:zone id="' + escXml(z.id) + '" name="' + escXml(z.name) + '" start="' + z.startDist.toFixed(3) + '" end="' + z.endDist.toFixed(3) + '" startEle="' + z.startEle.toFixed(1) + '" endEle="' + z.endEle.toFixed(1) + '"/>\n';
        }
        xml += '      </zns:zones>\n    </extensions>\n';
      }
      xml += '    <trkseg>\n';
      for (var i = 0; i < tps.length; i++) {
        xml += '      <trkpt lat="' + tps[i].lat.toFixed(7) + '" lon="' + tps[i].lng.toFixed(7) + '">\n';
        if (tps[i].ele !== undefined) xml += '        <ele>' + tps[i].ele.toFixed(1) + '</ele>\n';
        xml += '      </trkpt>\n';
      }
      xml += '    </trkseg>\n  </trk>\n';
    }
  } else {
    var tps = profileCanvas.trackpoints;
    if (tps.length) {
      xml += '  <trk>\n';
      if (zones && zones.length) {
        xml += '    <extensions>\n      <zns:zones>\n';
        for (var zi = 0; zi < zones.length; zi++) {
          var z = zones[zi];
          xml += '        <zns:zone id="' + escXml(z.id) + '" name="' + escXml(z.name) + '" start="' + z.startDist.toFixed(3) + '" end="' + z.endDist.toFixed(3) + '" startEle="' + z.startEle.toFixed(1) + '" endEle="' + z.endEle.toFixed(1) + '"/>\n';
        }
        xml += '      </zns:zones>\n    </extensions>\n';
      }
      xml += '    <trkseg>\n';
      for (var i = 0; i < tps.length; i++) {
        xml += '      <trkpt lat="' + tps[i].lat.toFixed(7) + '" lon="' + tps[i].lng.toFixed(7) + '">\n';
        if (tps[i].ele !== undefined) xml += '        <ele>' + tps[i].ele.toFixed(1) + '</ele>\n';
        xml += '      </trkpt>\n';
      }
      xml += '    </trkseg>\n  </trk>\n';
    }
  }
  var wps = profileCanvas.waypoints;
  for (var i = 0; i < wps.length; i++) {
    if (wps[i].lat == null || wps[i].lng == null || isNaN(wps[i].lat) || isNaN(wps[i].lng)) continue;
    xml += '  <wpt lat="' + wps[i].lat.toFixed(7) + '" lon="' + wps[i].lng.toFixed(7) + '">\n';
    if (wps[i].ele !== undefined) xml += '    <ele>' + wps[i].ele.toFixed(1) + '</ele>\n';
    xml += '    <name>' + escXml(wps[i].name) + '</name>\n';
    xml += '  </wpt>\n';
  }
  xml += '</gpx>';
  return xml;
}
function generateGPXFromOriginal() {
  return generateGPX();
}
function escXml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}
function generateKML() {
  var xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<kml xmlns="http://www.opengis.net/kml/2.2">\n<Document>\n';
  xml += '  <name>' + escXml(gpxFileName) + '</name>\n';
  var zones = profileCanvas.zones;
  if (zones && zones.length) {
    xml += '  <ExtendedData>\n    <Data name="editorperfiles_zones">\n      <value>' + escXml(JSON.stringify(zones.map(function(z) {
      return {id: z.id, name: z.name, startDist: z.startDist, endDist: z.endDist, startEle: z.startEle, endEle: z.endEle};
    }))) + '</value>\n    </Data>\n  </ExtendedData>\n';
  }
  if (originalTracks && selectedTrackName) {
    for (var ti = 0; ti < originalTracks.length; ti++) {
      var trk = originalTracks[ti];
      var tps = trk.name === selectedTrackName ? profileCanvas.trackpoints : trk.trackpoints;
      xml += '  <Placemark>\n    <name>' + escXml(trk.name) + '</name>\n';
      if (originalFileFormat === 'kml') {
        xml += '    <Style>\n      <LineStyle>\n        <color>ff0000ff</color>\n        <width>3</width>\n      </LineStyle>\n    </Style>\n';
      }
      xml += '    <LineString>\n      <coordinates>\n';
      for (var i = 0; i < tps.length; i++) {
        xml += '        ' + tps[i].lng.toFixed(7) + ',' + tps[i].lat.toFixed(7);
        if (tps[i].ele !== undefined) xml += ',' + tps[i].ele.toFixed(1);
        xml += '\n';
      }
      xml += '      </coordinates>\n    </LineString>\n  </Placemark>\n';
    }
  } else {
    var tps = profileCanvas.trackpoints;
    if (tps.length) {
      xml += '  <Placemark>\n    <name>Recorrido</name>\n    <LineString>\n      <coordinates>\n';
      for (var i = 0; i < tps.length; i++) {
        xml += '        ' + tps[i].lng.toFixed(7) + ',' + tps[i].lat.toFixed(7);
        if (tps[i].ele !== undefined) xml += ',' + tps[i].ele.toFixed(1);
        xml += '\n';
      }
      xml += '      </coordinates>\n    </LineString>\n  </Placemark>\n';
    }
  }
  var wps = profileCanvas.waypoints;
  for (var i = 0; i < wps.length; i++) {
    if (wps[i].lat == null || wps[i].lng == null || isNaN(wps[i].lat) || isNaN(wps[i].lng)) continue;
    xml += '  <Placemark>\n    <name>' + escXml(wps[i].name) + '</name>\n    <Point>\n      <coordinates>';
    xml += wps[i].lng.toFixed(7) + ',' + wps[i].lat.toFixed(7);
    if (wps[i].ele !== undefined) xml += ',' + wps[i].ele.toFixed(1);
    xml += '</coordinates>\n    </Point>\n  </Placemark>\n';
  }
  xml += '</Document>\n</kml>';
  return xml;
}
function generateKMLFromOriginal() {
  return generateKML();
}
function chooseSaveFormat() {
  return new Promise(function(resolve) {
    var overlay = document.getElementById("modal-overlay");
    var box = document.getElementById("modal-box");
    var body = document.getElementById("modal-body");
    var btns = document.getElementById("modal-buttons");
    body.innerHTML = '<label id="modal-label"></label><input id="modal-input" type="text">';
    btns.innerHTML = '<button id="modal-ok" class="btn-primary">Guardar como GPX (.gpx)</button><button id="modal-kml">Guardar como KML (.kml)</button><button id="modal-cancel">Cancelar</button>';
    box.classList.remove("wide");
    box.style.position = "";
    box.style.top = "";
    box.style.left = "";
    box.style.cursor = "";
    box.style.resize = "";
    box.style.overflow = "";
    box.style.minWidth = "";
    box.style.minHeight = "";
    box.style.maxWidth = "";
    box.style.maxHeight = "";
    document.getElementById("modal-title").style.cursor = "";
    document.getElementById("modal-title").textContent = "Guardar track";
    document.getElementById("modal-label").textContent = "Elige el formato de guardado:";
    var input = document.getElementById("modal-input");
    input.style.display = "none";
    overlay.style.display = "";
    overlay.classList.remove("hidden");
    function cleanup() {
      overlay.classList.add("hidden");
      document.getElementById("modal-ok").onclick = null;
      document.getElementById("modal-kml").onclick = null;
      document.getElementById("modal-cancel").onclick = null;
    }
    document.getElementById("modal-ok").classList.add("btn-primary");
    document.getElementById("modal-ok").removeAttribute("autofocus");
    document.getElementById("modal-kml").removeAttribute("autofocus");
    document.getElementById("modal-cancel").removeAttribute("autofocus");
    document.getElementById("modal-ok").onclick = function() { cleanup(); resolve("gpx"); };
    document.getElementById("modal-kml").onclick = function() { cleanup(); resolve("kml"); };
    document.getElementById("modal-cancel").onclick = function() { cleanup(); resolve(null); };
    document.getElementById("modal-ok").focus();
  });
}
async function saveGPX() {
  if (!currentData || !profileCanvas.trackpoints.length) { alert("Carga un GPX primero"); return; }
  var format = await chooseSaveFormat();
  if (!format) return;
  if (format === "kml") {
    downloadFile(generateKML(), gpxFileName + "_COPIA.kml", "application/vnd.google-earth.kml+xml");
  } else {
    downloadFile(generateGPX(), gpxFileName + "_COPIA.gpx", "application/gpx+xml");
  }
}
function loadSampleData() {
  fetch("datos-ejemplo.gpx").then(function(r){if(!r.ok)throw Error("No se pudo cargar");return r.text();}).then(async function(xml){
    var data = gpxParser.parse(xml);
    gpxFileName = "datos-ejemplo";
    document.getElementById("file-name").textContent = gpxFileName;
    currentData = data;
    waypointCounter = 0;
    zoneCounter = 0;
    // Indexar waypoints antes del primer renderizado
    profileCanvas.totalDistance = data.totalDistance;
    profileCanvas.trackpoints = data.trackpoints;
    var sw = [{n:"Inicio",d:0},{n:"Refugio",d:data.totalDistance*0.2},{n:"Collado",d:data.totalDistance*0.45},{n:"Cima",d:data.totalDistance*0.6},{n:"Fuente",d:data.totalDistance*0.8},{n:"Final",d:data.totalDistance}];
    for (var i = 0; i < sw.length; i++) {
      var c = interpolateCoords(sw[i].d);
      profileCanvas.waypoints.push({name:sw[i].n, dist:sw[i].d, ele:interpolateElevation(sw[i].d), lat:c.lat, lng:c.lng});
    }
    renumberWaypoints();
    profileCanvas.loadData(data);
    zoneCounter++;
    profileCanvas.zones.push({id:"zone-"+zoneCounter, name:"Zona "+zoneCounter, startDist:data.totalDistance*0.3, endDist:data.totalDistance*0.55, startEle:interpolateElevation(data.totalDistance*0.3), endEle:interpolateElevation(data.totalDistance*0.55)});
    elevationProfile = calculateElevationProfile(profileCanvas.trackpoints, profileCanvas.totalDistance, getDesnivelSettings());
    profileCanvas.elevationProfile = elevationProfile;
    try { localStorage.setItem("mapa-revision", String(Date.now())); } catch(e) {}
    try { localStorage.setItem("mapa-gpx-id", Date.now() + ":" + gpxFileName); } catch(e) {}
    try { localStorage.removeItem("mapa-pois-cache"); } catch(e) {}
    updateFileStats();
    profileCanvas.render();
    updateSidebar();
  }).catch(function(e){console.log("Error cargando datos:",e);});
}
function downloadFile(content, filename, mimeType) {
  var blob = new Blob([content], {type: mimeType});
  downloadBlob(blob, filename);
}
function downloadBlob(blob, filename) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
}
function capturarPantalla() {
  document.getElementById("btn-capturar").disabled = true;
  var base = gpxFileName ? gpxFileName : "captura";
  html2canvas(document.body, { scale: Math.min(window.devicePixelRatio || 1, 2), useCORS: true, backgroundColor: null })
    .then(function(canvas) {
      canvas.toBlob(function(blob) {
        downloadBlob(blob, base + "_pantalla.png");
        document.getElementById("btn-capturar").disabled = false;
      }, "image/png");
    })
    .catch(function(err) {
      document.getElementById("btn-capturar").disabled = false;
      alert("No se pudo capturar la pantalla: " + err.message);
    });
}
