// ===== Estado =====
let experiencias = [];
let reservas = [];
let textoBusqueda = "";
let categoriaActual = "todas";
let ordenActual = "normal";
let precioMaximo = Infinity;
let confirmandoVaciado = false;
let temporizadorMensaje;

const ETIQUETAS_CATEGORIA = {
  naturaleza: "Naturaleza",
  cultura: "Cultura",
  aventura: "Aventura",
  gastronomia: "Gastronomía",
  bienestar: "Bienestar"
};

// ===== Referencias al DOM =====
const catalogo = document.querySelector("#catalogo");
const buscador = document.querySelector("#buscador");
const filtroCategoria = document.querySelector("#filtroCategoria");
const ordenPrecio = document.querySelector("#ordenPrecio");
const filtroPrecio = document.querySelector("#filtroPrecio");
const valorPrecio = document.querySelector("#valorPrecio");
const listaReservas = document.querySelector("#listaReservas");
const zonaVaciado = document.querySelector("#zonaVaciado");
const total = document.querySelector("#total");
const totalPersonas = document.querySelector("#totalPersonas");
const estado = document.querySelector("#estado");
const mensaje = document.querySelector("#mensaje");

// ===== Utilidades =====
function normalizarTexto(texto) {
  return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function formatearMoneda(cantidad) {
  return `$${cantidad.toLocaleString("es-MX")} MXN`;
}

// Muestra un mensaje dentro de la página (sin alert()).
function mostrarMensaje(texto, tipo = "info") {
  clearTimeout(temporizadorMensaje);
  mensaje.textContent = texto;
  mensaje.className = `mensaje ${tipo}`;
  mensaje.hidden = false;
  temporizadorMensaje = setTimeout(() => { mensaje.hidden = true; }, 5000);
}

// ===== Carga de datos =====
async function cargarExperiencias() {
  try {
    estado.textContent = "Cargando experiencias...";
    const respuesta = await fetch("./data/experiencias.json");
    if (!respuesta.ok) throw new Error("No fue posible cargar las experiencias");
    experiencias = await respuesta.json();
    configurarFiltroPrecio();
    actualizarCatalogo();
  } catch (error) {
    estado.textContent = "Error al cargar la información";
    mostrarMensaje("No se pudieron cargar las experiencias. Verifica que uses un servidor local.", "error");
    console.error(error);
  }
}

// Ajusta el control de precio máximo según el catálogo cargado.
function configurarFiltroPrecio() {
  const precioMasAlto = Math.max(...experiencias.map(e => e.precio));
  const tope = Math.ceil(precioMasAlto / 50) * 50;
  filtroPrecio.max = tope;
  filtroPrecio.value = tope;
  precioMaximo = tope;
  valorPrecio.textContent = formatearMoneda(tope);
}

// ===== Filtros y orden (sin modificar el arreglo original) =====
function obtenerResultados() {
  let resultados = [...experiencias];
  if (categoriaActual !== "todas") {
    resultados = resultados.filter(e => e.categoria === categoriaActual);
  }
  if (textoBusqueda !== "") {
    resultados = resultados.filter(e =>
      normalizarTexto(e.nombre).includes(textoBusqueda));
  }
  resultados = resultados.filter(e => e.precio <= precioMaximo);
  if (ordenActual === "ascendente") resultados.sort((a, b) => a.precio - b.precio);
  if (ordenActual === "descendente") resultados.sort((a, b) => b.precio - a.precio);
  return resultados;
}

// ===== Catálogo =====
function actualizarCatalogo() {
  const resultados = obtenerResultados();
  if (resultados.length === 0) {
    catalogo.innerHTML = `<p class="sin-resultados">No se encontraron experiencias</p>`;
    estado.textContent = "0 resultados";
    return;
  }
  catalogo.innerHTML = resultados.map(e => `
    <article class="tarjeta">
      <div class="imagen" aria-hidden="true">${e.icono}</div>
      <div class="informacion">
        <span class="categoria">${ETIQUETAS_CATEGORIA[e.categoria] || e.categoria}</span>
        <h3>${e.nombre}</h3>
        <p>Cupo disponible: ${e.cupo}</p>
        <p class="precio">${formatearMoneda(e.precio)}</p>
        <label>Personas:
          <input type="number" id="cantidad-${e.id}" min="1" max="${e.cupo}" value="1">
        </label>
        <button class="btn-reservar" data-id="${e.id}"
          aria-label="Agregar ${e.nombre} a mi reservación">Agregar</button>
      </div>
    </article>`).join("");
  estado.textContent = `${resultados.length} resultados`;
  agregarEventosReservar();
}

function agregarEventosReservar() {
  document.querySelectorAll(".btn-reservar").forEach(boton => {
    boton.addEventListener("click", () => agregarReserva(Number(boton.dataset.id)));
  });
}

// ===== Reservaciones =====
function agregarReserva(id) {
  const experiencia = experiencias.find(e => e.id === id);
  const cantidad = Number(document.querySelector(`#cantidad-${id}`).value);

  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > experiencia.cupo) {
    mostrarMensaje(
      `Cantidad no válida para ${experiencia.nombre}: elige un número entero entre 1 y ${experiencia.cupo}.`,
      "error");
    return;
  }

  const existente = reservas.find(r => r.experienciaId === id);
  if (existente) {
    const nuevaCantidad = existente.cantidad + cantidad;
    if (nuevaCantidad > experiencia.cupo) {
      mostrarMensaje(
        `La cantidad supera el cupo de ${experiencia.nombre} (${experiencia.cupo} lugares). Ya tienes ${existente.cantidad}.`,
        "error");
      return;
    }
    existente.cantidad = nuevaCantidad;
    existente.subtotal = nuevaCantidad * experiencia.precio;
  } else {
    reservas.push({
      experienciaId: id,
      nombre: experiencia.nombre,
      precio: experiencia.precio,
      cantidad,
      subtotal: experiencia.precio * cantidad
    });
  }
  mostrarMensaje(`Se agregó ${experiencia.nombre} (${cantidad} persona(s)).`, "exito");
  mostrarReservas();
}

function cambiarCantidad(id, cambio) {
  const reserva = reservas.find(r => r.experienciaId === id);
  const experiencia = experiencias.find(e => e.id === id);
  const nuevaCantidad = reserva.cantidad + cambio;

  if (nuevaCantidad < 1) {
    mostrarMensaje("La cantidad mínima es 1. Usa Eliminar para quitar la experiencia.", "aviso");
    return;
  }
  if (nuevaCantidad > experiencia.cupo) {
    mostrarMensaje(`No hay más lugares: el cupo de ${experiencia.nombre} es ${experiencia.cupo}.`, "error");
    return;
  }
  reserva.cantidad = nuevaCantidad;
  reserva.subtotal = nuevaCantidad * reserva.precio;
  mostrarReservas();
  // Conserva el foco en el mismo botón para usuarios de teclado.
  const accion = cambio > 0 ? "aumentar" : "disminuir";
  document.querySelector(`[data-accion="${accion}"][data-id="${id}"]`)?.focus();
}

function eliminarReserva(id) {
  const eliminada = reservas.find(r => r.experienciaId === id);
  reservas = reservas.filter(r => r.experienciaId !== id);
  mostrarMensaje(`Se eliminó ${eliminada.nombre} de tu reservación.`, "aviso");
  mostrarReservas();
}

function calcularTotalPersonas() {
  return reservas.reduce((suma, r) => suma + r.cantidad, 0);
}

function calcularTotalImporte() {
  return reservas.reduce((suma, r) => suma + r.subtotal, 0);
}

function mostrarReservas() {
  totalPersonas.textContent = calcularTotalPersonas();
  total.textContent = formatearMoneda(calcularTotalImporte());

  if (reservas.length === 0) {
    confirmandoVaciado = false;
    listaReservas.innerHTML = "<p>No hay experiencias seleccionadas.</p>";
    zonaVaciado.innerHTML = "";
    return;
  }

  listaReservas.innerHTML = reservas.map(r => `
    <article class="item-reserva">
      <div>
        <strong>${r.nombre}</strong>
        <p>${r.cantidad} persona(s) × ${formatearMoneda(r.precio)}</p>
        <div class="controles-cantidad" role="group" aria-label="Cantidad de personas para ${r.nombre}">
          <button class="btn-cantidad" data-accion="disminuir" data-id="${r.experienciaId}"
            aria-label="Disminuir personas de ${r.nombre}"
            ${r.cantidad <= 1 ? 'aria-disabled="true"' : ""}>−</button>
          <span aria-live="polite">${r.cantidad}</span>
          <button class="btn-cantidad" data-accion="aumentar" data-id="${r.experienciaId}"
            aria-label="Aumentar personas de ${r.nombre}">+</button>
        </div>
      </div>
      <div class="acciones-item">
        <strong>${formatearMoneda(r.subtotal)}</strong><br>
        <button class="btn-eliminar" data-accion="eliminar" data-id="${r.experienciaId}"
          aria-label="Eliminar ${r.nombre} de mi reservación">Eliminar</button>
      </div>
    </article>`).join("");

  mostrarZonaVaciado();
  agregarEventosReservas();
}

function agregarEventosReservas() {
  document.querySelectorAll("[data-accion]").forEach(boton => {
    boton.addEventListener("click", () => {
      const id = Number(boton.dataset.id);
      if (boton.dataset.accion === "aumentar") cambiarCantidad(id, 1);
      if (boton.dataset.accion === "disminuir") cambiarCantidad(id, -1);
      if (boton.dataset.accion === "eliminar") eliminarReserva(id);
    });
  });
}

// ===== Vaciar reservación con confirmación dentro de la página =====
function mostrarZonaVaciado() {
  if (!confirmandoVaciado) {
    zonaVaciado.innerHTML = `<button class="btn-vaciar" id="btnVaciar">Vaciar reservación</button>`;
    document.querySelector("#btnVaciar").addEventListener("click", () => {
      confirmandoVaciado = true;
      mostrarZonaVaciado();
      document.querySelector("#btnCancelarVaciado").focus();
    });
    return;
  }
  zonaVaciado.innerHTML = `
    <div class="confirmacion" role="alertdialog" aria-labelledby="textoConfirmar">
      <p id="textoConfirmar">¿Seguro que deseas borrar toda tu reservación?</p>
      <button class="btn-confirmar" id="btnConfirmarVaciado">Sí, vaciar</button>
      <button class="btn-cancelar" id="btnCancelarVaciado">Cancelar</button>
    </div>`;
  document.querySelector("#btnConfirmarVaciado").addEventListener("click", vaciarReservacion);
  document.querySelector("#btnCancelarVaciado").addEventListener("click", () => {
    confirmandoVaciado = false;
    mostrarZonaVaciado();
    document.querySelector("#btnVaciar").focus();
  });
}

function vaciarReservacion() {
  reservas = [];
  confirmandoVaciado = false;
  mostrarMensaje("Tu reservación quedó vacía.", "aviso");
  mostrarReservas();
}

// ===== Controles =====
buscador.addEventListener("input", () => {
  textoBusqueda = normalizarTexto(buscador.value.trim());
  actualizarCatalogo();
});
filtroCategoria.addEventListener("change", () => {
  categoriaActual = filtroCategoria.value;
  actualizarCatalogo();
});
ordenPrecio.addEventListener("change", () => {
  ordenActual = ordenPrecio.value;
  actualizarCatalogo();
});
filtroPrecio.addEventListener("input", () => {
  precioMaximo = Number(filtroPrecio.value);
  valorPrecio.textContent = formatearMoneda(precioMaximo);
  actualizarCatalogo();
});

cargarExperiencias();
