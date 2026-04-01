import dgram from "node:dgram";

const NTP_PORT = 123;
const NTP_PACKET_SIZE = 48;
const NTP_TO_UNIX_SECONDS = 2208988800;
const NTP_HOSTS = ["time.google.com", "time.cloudflare.com", "pool.ntp.org"] as const;

function parseNtpTimestamp(buffer: Buffer) {
  if (buffer.length < NTP_PACKET_SIZE) {
    throw new Error("Invalid NTP response");
  }

  const seconds = buffer.readUInt32BE(40);
  const fraction = buffer.readUInt32BE(44);
  const unixSeconds = seconds - NTP_TO_UNIX_SECONDS;
  const millis = Math.round((fraction / 0x100000000) * 1000);
  return unixSeconds * 1000 + millis;
}

function queryNtpHost(host: string, timeoutMs = 1800): Promise<number> {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket("udp4");
    const packet = Buffer.alloc(NTP_PACKET_SIZE);
    packet[0] = 0x1b;

    const timeout = setTimeout(() => {
      socket.close();
      reject(new Error(`NTP timeout for ${host}`));
    }, timeoutMs);

    socket.once("error", (error) => {
      clearTimeout(timeout);
      socket.close();
      reject(error);
    });

    socket.once("message", (message) => {
      clearTimeout(timeout);
      socket.close();
      try {
        resolve(parseNtpTimestamp(message));
      } catch (error) {
        reject(error);
      }
    });

    socket.send(packet, 0, packet.length, NTP_PORT, host, (error) => {
      if (!error) return;
      clearTimeout(timeout);
      socket.close();
      reject(error);
    });
  });
}

export async function getReliableSastEpochMs() {
  for (const host of NTP_HOSTS) {
    try {
      const epochMs = await queryNtpHost(host);
      return {
        epochMs,
        source: `ntp:${host}`
      };
    } catch {
      // Try the next host.
    }
  }

  return {
    epochMs: Date.now(),
    source: "system-fallback"
  };
}
