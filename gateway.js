const net = require("net");
const readline = require("readline");
const udp = require("dgram");
// const protobuf = require("protobufjs");

const udpServer = udp.createSocket("udp4");

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

    socket.on("data", function (data) {
      data = JSON.parse(data.toString()).message;
      splittedData = data.split(" ");
      switch (splittedData[0]) {
        case "/TEMPERATURE":
          equipments[id].info =
            "Temperatura é de: " + splittedData[1] + " graus";
          break;
        case "/LAMP":
          equipments[id].info =
            splittedData[1] === "ON" ? "Ligado" : "Desligado";
          console.log(equipments[id].info);
          break;
        case "/AC":
          equipments[id].info =
            "AC configurado em " + splittedData[1] + " graus";
          console.log(equipments[id].info);
          break;

        default:
          console.log(data);
      }
    });

    socket.on("close", function () {
      console.log(equipments[id].type + " se desconectou");
      socket[id] = null;
    });

    rl.on("line", function (data) {
      const splittedData = data.split(" ");
      switch (splittedData[0]) {
        case "/LAMP":
          equipments.forEach((equipment) => {
            if (equipment.type === "LAMP")
              equipment.write(Buffer.from(JSON.stringify({ message: data })));
          });
          break;
        case "/TEMPERATURE":
          equipments.forEach((equipment) => {
            if (equipment.type === "TEMPERATURE_SENSOR")
              console.log(equipment.info);
          });
          break;
        case "/AC":
          equipments.forEach((equipment) => {
            if (equipment.type === "AC")
              equipment.write(Buffer.from(JSON.stringify({ message: data })));
          });
          break;
        default:
          console.log("Comando desconhecido");
      }
    });

    async function encodeProtobuf(obj) {
      const root = await protobuf.load("message.proto");

      const Message = root.lookupType("userpackage.Message");
      return Message.encode(obj).finish();
    }
  })
  .listen(8888);
