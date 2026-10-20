import { copyFileSync, mkdirSync } from "node:fs";
const destination = new URL("../.emulator/", import.meta.url);
mkdirSync(destination, { recursive: true });
// O CLI exige que a regra esteja dentro da pasta do projeto de teste.
// A fonte continua sendo a regra completa e única da raiz AUMM.
copyFileSync(
  new URL("../../firestore.rules", import.meta.url),
  new URL("firestore.rules", destination),
);
