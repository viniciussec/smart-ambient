const dgram = require("dgram");
const net = require("net");
const protobuf = require("protobufjs");

const PORT = 41848;
const MCAST_ADDR = "230.185.192.108";
const HOST = "localhost";

const clientUDP = dgram.createSocket("udp4");

clientUDP.on("listening", function () {
  const address = clientUDP.address();
  console.log("Aguardando conexão...");
  clientUDP.setBroadcast(true);
  clientUDP.setMulticastTTL(128);
  clientUDP.addMembership(MCAST_ADDR);
});

clientUDP.once("message", function (message, remote) {
  const msg = Buffer.from(JSON.stringify({ type: "AC", ip: HOST, port: 8888 }));
  clientUDP.send(msg, 0, msg.length, remote.port, remote.address);

  const client = new net.Socket();
  client.connect({ host: "localhost", port: 8888 }, function (data) {
    console.log("O equipamento está conectado");
  });

  client.on("data", async function (data) {
    data = (await decodeProtobuf(data)).message;
    const splittedData = data.split(" ");
    const temperature = splittedData[1];

    const info = "AC está configurado em " + temperature + " graus Celsius";
    console.log(info);
    client.write(await encodeProtobuf({ message: data }));
  });
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

clientUDP.bind(PORT, MCAST_ADDR);
