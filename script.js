let puerto;
let lector;
let conectado = false;
let escribiendo = false;
let contadorEncendidos = 0;

const btnConectar = document.getElementById("btnConectar");
const estadoConexion = document.getElementById("estadoConexion");
const estadoLed = document.getElementById("estadoLed");
const mensaje = document.getElementById("mensaje");
const contador = document.getElementById("contador");
const slider = document.getElementById("luminosidad");
const valorLuminosidad = document.getElementById("valorLuminosidad");

const botonesEncender = document.querySelectorAll(".encender[data-pin]");
const botonesApagar = document.querySelectorAll(".apagar[data-pin]");
const btnTodos = document.getElementById("btnTodos");
const btnApagarTodos = document.getElementById("btnApagarTodos");
const btnParpadear = document.getElementById("btnParpadear");
const btnDetener = document.getElementById("btnDetener");

const controles = [...botonesEncender, ...botonesApagar, btnTodos,
  btnApagarTodos, btnParpadear, btnDetener, slider];

btnConectar.addEventListener("click", conectar);

async function conectar() {
  try {
    if (!("serial" in navigator)) {
      alert("Abre la página en Chrome o Edge para conectar Arduino.");
      return;
    }
    puerto = await navigator.serial.requestPort();
    await puerto.open({ baudRate: 9600 });
    conectado = true;
    estadoConexion.textContent = "Arduino conectado";
    mensaje.textContent = "Ya puedes controlar los tres LED.";
    btnConectar.disabled = true;
    controles.forEach(control => control.disabled = false);

    const decoder = new TextDecoderStream();
    puerto.readable.pipeTo(decoder.writable).catch(console.error);
    lector = decoder.readable.getReader();
    leerArduino();
  } catch (error) {
    console.error(error);
    mensaje.textContent = "No se pudo conectar. Comprueba el cable y el puerto USB.";
  }
}

async function leerArduino() {
  let texto = "";
  try {
    while (conectado) {
      const { value, done } = await lector.read();
      if (done) break;
      texto += value;
      const lineas = texto.split("\n");
      texto = lineas.pop();
      lineas.forEach(linea => procesarRespuesta(linea.trim()));
    }
  } catch (error) {
    console.error(error);
    mensaje.textContent = "Se ha interrumpido la comunicación con Arduino.";
  }
}

function procesarRespuesta(respuesta) {
  if (respuesta.startsWith("LED_ON:")) {
    const pin = respuesta.split(":")[1];
    mostrarLed(pin, true);
    contadorEncendidos++;
    contador.textContent = contadorEncendidos;
    mensaje.textContent = `LED del pin ${pin} encendido.`;
  } else if (respuesta.startsWith("LED_OFF:")) {
    const pin = respuesta.split(":")[1];
    mostrarLed(pin, false);
    mensaje.textContent = `LED del pin ${pin} apagado.`;
  } else if (respuesta === "TODOS_ENCENDIDOS") {
    [11, 10, 9].forEach(pin => mostrarLed(pin, true));
    estadoLed.textContent = "Los tres LED están encendidos";
  } else if (respuesta === "TODOS_APAGADOS") {
    [11, 10, 9].forEach(pin => mostrarLed(pin, false));
    estadoLed.textContent = "Los tres LED están apagados";
  } else if (respuesta === "PARPADEANDO") {
    estadoLed.textContent = "Los tres LED están parpadeando";
    mensaje.textContent = "Parpadeo activado.";
  } else if (respuesta === "PARPADEO_DETENIDO") {
    [11, 10, 9].forEach(pin => mostrarLed(pin, false));
    estadoLed.textContent = "Parpadeo detenido";
  } else if (respuesta.startsWith("BRIGHTNESS:")) {
    valorLuminosidad.textContent = respuesta.split(":")[1];
  }
}

function mostrarLed(pin, encendido) {
  const bombilla = document.getElementById(`bombilla${pin}`);
  if (!bombilla) return;
  bombilla.classList.toggle("encendido", encendido);
  bombilla.classList.toggle("apagado", !encendido);
}

async function enviarOrden(orden) {
  if (!conectado || escribiendo) return;
  escribiendo = true;
  let writer;
  try {
    writer = puerto.writable.getWriter();
    await writer.write(new TextEncoder().encode(orden + "\n"));
  } catch (error) {
    console.error(error);
    mensaje.textContent = "Error al enviar la orden a Arduino.";
  } finally {
    if (writer) writer.releaseLock();
    escribiendo = false;
  }
}

botonesEncender.forEach(boton =>
  boton.addEventListener("click", () => enviarOrden(`ON:${boton.dataset.pin}`)));
botonesApagar.forEach(boton =>
  boton.addEventListener("click", () => enviarOrden(`OFF:${boton.dataset.pin}`)));

btnTodos.addEventListener("click", () => enviarOrden("ALL_ON"));
btnApagarTodos.addEventListener("click", () => enviarOrden("ALL_OFF"));
btnParpadear.addEventListener("click", () => enviarOrden("BLINK"));
btnDetener.addEventListener("click", () => enviarOrden("STOP_BLINK"));

// El deslizador envía el mismo nivel de brillo a los tres pines PWM.
let temporizadorBrillo;
slider.addEventListener("input", () => {
  const brillo = Number(slider.value);
  valorLuminosidad.textContent = brillo;
  clearTimeout(temporizadorBrillo);
  temporizadorBrillo = setTimeout(() => enviarOrden(`BRIGHTNESS:${brillo}`), 80);
});
