
// Variables de comunicacion

let puerto;
let lector;
let conectado = false;
let escribiendo = false;

// Elementos HTML

const btnConectar =
    document.getElementById("btnConectar");

const btnEncender =
    document.getElementById("btnEncender");

const btnApagar =
    document.getElementById("btnApagar");

const estadoConexion =
    document.getElementById("estadoConexion");

const estadoLed =
    document.getElementById("estadoLed");

const bombilla =
    document.getElementById("bombilla");

const mensaje =
    document.getElementById("mensaje");


// CONECTAR ARDUINO

btnConectar.addEventListener("click", conectar);

async function conectar() {

    try {

        if (!("serial" in navigator)) {

            alert("Utiliza Google Chrome o Microsoft Edge");

            return;
        }

        // Seleccionar puerto

        puerto = await navigator.serial.requestPort();

        // Abrir comunicacion

        await puerto.open({
            baudRate: 9600
        });

        conectado = true;

        estadoConexion.textContent =
            "Arduino conectado";

        mensaje.textContent =
            "Ya puedes controlar el LED";

        btnConectar.disabled = true;

        btnEncender.disabled = false;
        btnApagar.disabled = false;

        // Preparar lector de datos

        const decoder = new TextDecoderStream();

        puerto.readable.pipeTo(decoder.writable)
            .catch(error => console.log(error));

        lector = decoder.readable.getReader();

        leerArduino();

    } catch (error) {

        console.error(error);

        mensaje.textContent =
            "Error al conectar Arduino";

    }

}


// LEER RESPUESTAS DE ARDUINO

async function leerArduino() {

    let texto = "";

    try {

        while (conectado) {

            const { value, done } = await lector.read();

            if (done) break;

            texto += value;

            const lineas = texto.split("\n");

            texto = lineas.pop();

            for (const linea of lineas) {

                const respuesta = linea.trim();

                if (respuesta === "ENCENDIDO") {

                    mostrarEstado(true);

                }

                if (respuesta === "APAGADO") {

                    mostrarEstado(false);

                }

            }

        }

    } catch (error) {

        console.error(error);

    }

}


// ENVIAR ORDEN A ARDUINO

async function enviarOrden(orden) {

    if (!conectado || escribiendo) return;

    escribiendo = true;

    try {

        const writer = puerto.writable.getWriter();

        await writer.write(
            new TextEncoder().encode(orden + "\n")
        );

        writer.releaseLock();

    } catch (error) {

        console.error(error);

        mensaje.textContent =
            "Error enviando la orden";

    } finally {

        escribiendo = false;

    }

}


// ENCENDER LED

btnEncender.addEventListener("click", function() {

    enviarOrden("ON");

});


// APAGAR LED

btnApagar.addEventListener("click", function() {

    enviarOrden("OFF");

});


// ACTUALIZAR INTERFAZ

function mostrarEstado(encendido) {

    if (encendido) {

        estadoLed.textContent = "LED ENCENDIDO";

        bombilla.classList.remove("apagado");
        bombilla.classList.add("encendido");

        mensaje.textContent =
            "Arduino ha encendido el LED";

    } else {

        estadoLed.textContent = "LED APAGADO";

        bombilla.classList.remove("encendido");
        bombilla.classList.add("apagado");

        mensaje.textContent =
            "Arduino ha apagado el LED";

    }

}


