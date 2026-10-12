// Generates public/qr.svg (runs before every build). Dark modules on white so every scanner reads it.
import QRCode from "qrcode";
import { mkdir, writeFile } from "node:fs/promises";

const URL_TO_ENCODE = "https://links.abhinesh.codes";

const svg = await QRCode.toString(URL_TO_ENCODE, {
  type: "svg",
  errorCorrectionLevel: "M",
  margin: 1,
  color: { dark: "#09090bff", light: "#ffffffff" },
});

if (!svg.startsWith("<svg")) throw new Error("qrcode did not return SVG markup");
await mkdir(new URL("../public/", import.meta.url), { recursive: true });
await writeFile(new URL("../public/qr.svg", import.meta.url), svg);
console.log(`qr.svg written for ${URL_TO_ENCODE}`);
