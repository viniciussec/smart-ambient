const net = require("net");
const readline = require("readline");
const udp = require("dgram");
const protobuf = require("protobufjs");

const udpServer = udp.createSocket({ type: "udp4", reuseAddr: true });

const PORT = 41848;
const MCAST_ADDR = "230.185.192.108";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

udpServer.bind(PORT, function () {
  udpServer.setBroadcast(true);
  udpServer.setMulticastTTL(128);
  udpServer.addMembership(MCAST_ADDR);
});

function broadcastNew() {
  const message = Buffer.from(JSON.stringify({ message: "/IDENTIFY" }));
  udpServer.send(message, 0, message.length, PORT, MCAST_ADDR);
  // console.log("Sent " + message + " to the wire...");
}

setInterval(broadcastNew, 3000);

udpServer.on("message", function (data) {
  const config = JSON.parse(data.toString());
  if (config.type) {
    console.log(config.type + " se conectou");
    configs.push(config);
  }
});

const equipments = [];
const configs = [];

net
  .createServer(function (socket) {
    const id = equipments.length;
    socket.id = id;
    socket.type = configs[id].type;

    equipments.push(socket);

    socket.on("data", async function (data) {
      data = (await decodeProtobuf(data)).message;
      splittedData = data.split(" ");
      switch (splittedData[0]) {
        case "/TEMPERATURE":
          if (equipments[id].type === "TEMPERATURE") {
            equipments[id].info =
              "Temperatura é de: " + splittedData[1] + " graus";
          }
          break;

        case "/LAMP":
          if (equipments[id].type === "LAMP") {
            equipments[id].info =
              splittedData[1] === "ON" ? "Ligado" : "Desligado";
            console.log(equipments[id].info);
          }
          break;

        case "/AC":
          if (equipments[id].type === "AC") {
            equipments[id].info =
              "AC configurado em " + splittedData[1] + " graus";
            console.log(equipments[id].info);
          }
          break;

        default:
          console.log(data);
          break;
      }
    });

    socket.on("close", function () {
      console.log(equipments[id].type + " se desconectou");
      socket[id] = null;
    });

    rl.on("line", async function (data) {
      const splittedData = data.split(" ");
      switch (splittedData[0]) {
        case "/LAMP":
          if (socket.type === "LAMP") {
            const msg = await encodeProtobuf({ message: data });
            socket.write(msg);
          }
          break;
        case "/TEMPERATURE":
          if (socket.type === "TEMPERATURE_SENSOR") console.log(socket.info);
          break;
        case "/AC":
          if (socket.type === "AC") {
            const msg = await encodeProtobuf({ message: data });
            socket.write(msg);
          }

          break;
        default:
          console.log("Comando desconhecido!!!");
      }
    });

    async function decodeProtobuf(obj) {
      const root = await protobuf.load("message.proto");

      const Message = root.lookupType("userpackage.Message");
      return Message.decode(obj);
    }

    async function encodeProtobuf(obj) {
      const root = await protobuf.load("message.proto");

      const Message = root.lookupType("userpackage.Message");
      return Message.encode(obj).finish();
    }
  })
  .listen(8888);
