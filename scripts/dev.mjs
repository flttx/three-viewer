import net from "node:net";
import { spawn } from "node:child_process";

const basePort = Number(process.env.PORT || process.env.NEXT_PORT || 5401);
const maxTries = 20;

const tryListen = (port, host, options = {}) =>
  new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on("error", (err) => resolve({ ok: false, err }));
    if (host) {
      server.listen({ port, host, ...options }, () => {
        server.close(() => resolve({ ok: true }));
      });
      return;
    }
    server.listen(port, () => {
      server.close(() => resolve({ ok: true }));
    });
  });

const isPortUnavailable = (err) =>
  err?.code === "EADDRINUSE" || err?.code === "EACCES";

const isIPv6Unsupported = (err) =>
  err?.code === "EAFNOSUPPORT" ||
  err?.code === "EADDRNOTAVAIL" ||
  err?.code === "EINVAL";

const isPortAvailable = async (port) => {
  const ipv6 = await tryListen(port, "::", { ipv6Only: false });
  const ipv4 = await tryListen(port, "0.0.0.0");

  if (isPortUnavailable(ipv6.err) || isPortUnavailable(ipv4.err)) {
    return false;
  }

  if (ipv6.ok && ipv4.ok) return true;
  if (isIPv6Unsupported(ipv6.err)) return ipv4.ok;
  return false;
};

const pickPort = async () => {
  for (let port = basePort; port < basePort + maxTries; port += 1) {
    if (await isPortAvailable(port)) return port;
  }
  return null;
};

const run = async () => {
  const port = await pickPort();
  if (!port) {
    console.error(
      `端口 ${basePort} 起的 ${maxTries} 个端口均不可用，请手动释放或设置 PORT。`,
    );
    process.exit(1);
  }

  if (port !== basePort) {
    console.log(`端口 ${basePort} 已占用，自动切换为 ${port}`);
  }

  const command = `next dev -p ${port}`;
  const child = spawn(command, {
    stdio: "inherit",
    env: process.env,
    shell: true,
  });

  child.on("error", (error) => {
    console.error("启动失败：", error?.message || error);
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
};

run();
