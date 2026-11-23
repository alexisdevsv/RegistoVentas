
// ==========================================
// CONTROLVENTAS V1.0
// ==========================================

// CONFIGURACION DE SUPABASE

const SUPABASE_URL = "https://aptbgtlbjwpeubyvvfcv.supabase.co";
const SUPABASE_KEY = "sb_publishable_4zumSASHWBEMt7LIlhA1xw_1xZ3Bz0r";

// ID DEL NEGOCIO
const NEGOCIO_ID = 1;

// Crear cliente de Supabase
// Usamos clienteSupabase para evitar conflictos
// con la variable global supabase del CDN.

const clienteSupabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// ==========================================
// ELEMENTOS HTML
// ==========================================

const listaProductos = document.getElementById("listaProductos");
const botonAgregar = document.getElementById("agregarProducto");
const botonGuardar = document.getElementById("guardarVenta");
const totalVenta = document.getElementById("totalVenta");
const cantidadProductos = document.getElementById("cantidadProductos");
const contador = document.getElementById("contador");
const mensaje = document.getElementById("mensaje");

let numeroProductos = 0;
let sesionIniciada = false;

// ==========================================
// MENSAJES
// ==========================================

function mostrarMensaje(texto) {
    mensaje.textContent = texto;
    mensaje.style.display = "block";
}

function ocultarMensaje() {
    mensaje.textContent = "";
    mensaje.style.display = "none";
}

// ==========================================
// CONEXION Y SESION ANONIMA
// ==========================================

async function iniciarSesion() {

    const { data, error } =
        await clienteSupabase.auth.getSession();

    if (error) {
        throw error;
    }

    if (data.session) {
        sesionIniciada = true;
        return;
    }

    const { error: errorSesion } =
        await clienteSupabase.auth.signInAnonymously();

    if (errorSesion) {
        throw errorSesion;
    }

    sesionIniciada = true;
}

// ==========================================
// AGREGAR PRODUCTO
// ==========================================

function agregarProducto() {

    numeroProductos++;

    const producto = document.createElement("div");

    producto.className = "producto";

    producto.innerHTML = `
        <div class="producto-cabecera">

            <h4>Producto ${numeroProductos}</h4>

            <button
                type="button"
                class="boton-eliminar">
                Eliminar
            </button>

        </div>

        <div class="campos">

            <div class="campo campo-producto">

                <label>Nombre del producto</label>

                <input
                    type="text"
                    class="nombre-producto"
                    placeholder="Ej. Coca-Cola 1.5 L"
                    required>

            </div>

            <div class="campo">

                <label>Cantidad</label>

                <input
                    type="number"
                    class="cantidad-producto"
                    min="0.001"
                    step="0.001"
                    placeholder="0"
                    required>

            </div>

            <div class="campo">

                <label>Precio unitario ($)</label>

                <input
                    type="number"
                    class="precio-producto"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    required>

            </div>

        </div>

        <div class="subtotal-producto">
            Subtotal: $<span class="subtotal">0.00</span>
        </div>
    `;

    listaProductos.appendChild(producto);

    producto.querySelectorAll("input").forEach(input => {
        input.addEventListener("input", calcularTotal);
    });

    producto.querySelector(".boton-eliminar")
        .addEventListener("click", () => {

            producto.remove();

            actualizarContador();
            calcularTotal();
        });

    actualizarContador();
    calcularTotal();
}

// ==========================================
// ACTUALIZAR CONTADOR
// ==========================================

function actualizarContador() {

    const cantidad = listaProductos.querySelectorAll(".producto").length;

    contador.textContent =
        cantidad + (cantidad === 1 ? " producto" : " productos");
}

// ==========================================
// CALCULAR TOTALES
// ==========================================

function calcularTotal() {

    const productos = listaProductos.querySelectorAll(".producto");

    let total = 0;
    let registrados = 0;

    productos.forEach(producto => {

        const nombre = producto.querySelector(".nombre-producto").value.trim();

        const cantidad = Number(
            producto.querySelector(".cantidad-producto").value
        );

        const precio = Number(
            producto.querySelector(".precio-producto").value
        );

        const subtotal =
            (Number.isFinite(cantidad) ? cantidad : 0) *
            (Number.isFinite(precio) ? precio : 0);

        producto.querySelector(".subtotal").textContent =
            subtotal.toFixed(2);

        total += subtotal;

        if (nombre !== "" && cantidad > 0 && precio >= 0) {
            registrados++;
        }
    });

    cantidadProductos.textContent = registrados;
    totalVenta.textContent = "$" + total.toFixed(2);
}

// ==========================================
// REGISTRAR VENTA EN SUPABASE
// ==========================================

async function guardarVenta() {

    ocultarMensaje();

    if (!Number.isInteger(NEGOCIO_ID) || NEGOCIO_ID <= 0) {
        mostrarMensaje("El ID del negocio no es válido.");
        return;
    }

    const filas = listaProductos.querySelectorAll(".producto");

    if (filas.length === 0) {
        mostrarMensaje("Agrega al menos un producto.");
        return;
    }

    const productosVenta = [];

    for (const fila of filas) {

        const nombre = fila.querySelector(".nombre-producto")
            .value.trim();

        const cantidad = Number(
            fila.querySelector(".cantidad-producto").value
        );

        const precio = Number(
            fila.querySelector(".precio-producto").value
        );

        if (
            nombre === "" ||
            !Number.isFinite(cantidad) ||
            cantidad <= 0 ||
            !Number.isFinite(precio) ||
            precio < 0
        ) {

            mostrarMensaje(
                "Completa correctamente todos los productos."
            );

            return;
        }

        productosVenta.push({
            producto: nombre,
            cantidad: cantidad,
            precio_unitario: precio
        });
    }

    botonGuardar.disabled = true;
    botonAgregar.disabled = true;

    mostrarMensaje("Registrando venta...");

    try {

        if (!sesionIniciada) {
            await iniciarSesion();
        }

        const { data, error } = await clienteSupabase.rpc(
            "cv_registrar_venta",
            {
                p_negocio_id: NEGOCIO_ID,
                p_productos: productosVenta
            }
        );

        if (error) {
            throw error;
        }

        mostrarMensaje(
            "¡Venta registrada correctamente! Número: " + data
        );

        listaProductos.innerHTML = "";
        numeroProductos = 0;

        agregarProducto();

    } catch (error) {

        console.error("Error al registrar venta:", error);

        mostrarMensaje(
            "No se pudo registrar: " +
            (error.message || "Error desconocido")
        );

    } finally {

        botonGuardar.disabled = false;
        botonAgregar.disabled = false;
    }
}

// ==========================================
// EVENTOS DE LOS BOTONES
// ==========================================

botonAgregar.addEventListener("click", agregarProducto);

botonGuardar.addEventListener("click", guardarVenta);

// ==========================================
// INICIAR SISTEMA
// ==========================================

async function iniciarSistema() {

    botonGuardar.disabled = true;

    try {

        // Mostrar el primer producto inmediatamente.
        agregarProducto();

        // Preparar sesión anónima.
        await iniciarSesion();

        ocultarMensaje();

    } catch (error) {

        console.error("Error de conexión:", error);

        mostrarMensaje(
            "No se pudo iniciar la sesión. Revisa la conexión."
        );

    } finally {

        botonGuardar.disabled = false;
    }
}

iniciarSistema();
