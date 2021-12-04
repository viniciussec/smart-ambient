const net = require("net");
const dgram = require("dgram");
const protobuf = require("protobufjs");

const client = new net.Socket();

const PORT = 41848;
const MCAST_ADDR = "230.185.192.108";
const HOST = "localhost";

const clientUDP = dgram.createSocket({ type: "udp4", reuseAddr: true });
clientUDP.on("listening", function () {
  const address = clientUDP.address();
  console.log("Aguardando conexão...");
  clientUDP.setBroadcast(true);
  clientUDP.setMulticastTTL(128);
  clientUDP.addMembership(MCAST_ADDR);
});

clientUDP.once("message", function (message, remote) {
  const msg = Buffer.from(
    JSON.stringify({ type: "TEMPERATURE_SENSOR", ip: HOST, port: 8888 })
  );
  clientUDP.send(msg, 0, msg.length, remote.port, remote.address);

  const client = new net.Socket();
  client.connect({ host: "localhost", port: 8888 }, function (data) {
    console.log("O equipamento está conectado");
  });

  client.on("data", async function (data) {
    data = JSON.parse(data.toString()).message;
    send(data);
  });

  setInterval(async function () {
    send("/TEMPERATURE " + `${20 + Math.random()}`.substring(0, 5));
  }, 3000);

  async function send(msg) {
    client.write(await encodeProtobuf({ message: msg }));
  }
});

clientUDP.bind(PORT, MCAST_ADDR);

async function encodeProtobuf(obj) {
  const root = await protobuf.load("message.proto");

  const Message = root.lookupType("userpackage.Message");
  return Message.encode(obj).finish();
}
