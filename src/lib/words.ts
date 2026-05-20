export interface WordData {
  word: string;
  hint: string;
  typeHints: string[];
}

export const wordCategories: Record<string, WordData[]> = {
  Allgemein: [
    { word: "Apfel", hint: "gesund", typeHints: ["Obst", "Essen", "Frucht", "Baum"] },
    { word: "Zug", hint: "schnell", typeHints: ["Verkehrsmittel", "Fahrzeug", "Reisen", "Öffentlich"] },
    { word: "Lampe", hint: "an der Decke", typeHints: ["Beleuchtung", "Möbel", "Wohnung", "Lichtquelle"] },
    { word: "Ball", hint: "rund", typeHints: ["Sportgerät", "Spielzeug", "Freizeit", "Rund"] },
    { word: "Radio", hint: "man hört es", typeHints: ["Elektronik", "Gerät", "Unterhaltung", "Musik"] },
    { word: "Tisch", hint: "Möbel", typeHints: ["Möbelstück", "Einrichtung", "Zuhause", "Oberfläche"] },
    { word: "Auto", hint: "fährt", typeHints: ["Fahrzeug", "Transportmittel", "Straße", "Motorisiert"] },
    { word: "Handy", hint: "telefonieren", typeHints: ["Elektronik", "Kommunikation", "Mobil", "Bildschirm"] },
    { word: "Hund", hint: "Tier", typeHints: ["Tier", "Haustier", "Säugetier", "Begleiter"] },
    { word: "Katze", hint: "Tier", typeHints: ["Tier", "Haustier", "Säugetier", "Jäger"] },
    { word: "Basketball", hint: "Michael Jordan", typeHints: ["Sport", "Ballspiel", "Mannschaftssport", "Korb"] },
    { word: "Mario", hint: "Nintendo", typeHints: ["Videospiel", "Charakter", "Klempner", "Jump'n'Run"] },
    { word: "Deutschland", hint: "Land", typeHints: ["Land", "Europa", "Nation", "Kultur"] },
    { word: "Pokémon", hint: "Monster", typeHints: ["Spiel", "Sammeln", "Anime", "Fantasy"] },
    { word: "Minecraft", hint: "8 Ecken", typeHints: ["Spiel", "Bauen", "Sandbox", "Blöcke"] },
  ],
  Natur: [
    { word: "Baum", hint: "draußen", typeHints: ["Pflanze", "Wald", "Holz", "Grün"] },
    { word: "Fluss", hint: "Wasser", typeHints: ["Gewässer", "Natur", "Strömung", "Landschaft"] },
    { word: "Vogel", hint: "fliegt", typeHints: ["Tier", "Fliegen", "Feder", "Luft"] },
    { word: "Blume", hint: "im Garten", typeHints: ["Pflanze", "Blüte", "Farbe", "Duft"] },
    { word: "Wolke", hint: "oben", typeHints: ["Wetter", "Himmel", "Wasser", "Form"] },
    { word: "Berg", hint: "groß", typeHints: ["Landschaft", "Gebirge", "Gipfel", "Natur"] },
    { word: "Sonne", hint: "Tag", typeHints: ["Himmelskörper", "Licht", "Wärme", "Stern"] },
    { word: "Mond", hint: "Nacht", typeHints: ["Himmelskörper", "Nachthimmel", "Erdtrabant", "Phasen"] },
    { word: "Regen", hint: "Wasser", typeHints: ["Wetter", "Niederschlag", "Wolken", "Nass"] },
    { word: "Stein", hint: "hart", typeHints: ["Material", "Fels", "Mineral", "Geologie"] },
  ],
  Sport: [
    { word: "Fußball", hint: "berühmt", typeHints: ["Sportart", "Ballspiel", "Mannschaftssport", "Stadion"] },
    { word: "Basketball", hint: "Michael Jordan", typeHints: ["Sport", "Ballspiel", "Mannschaftssport", "Korb"] },
    { word: "Tennis", hint: "Sport", typeHints: ["Sportart", "Rückschlagspiel", "Schläger", "Feld"] },
    { word: "Schwimmen", hint: "im Wasser", typeHints: ["Sportart", "Wasser", "Bewegung", "Pool"] },
    { word: "Golf", hint: "kleiner Ball", typeHints: ["Sport", "Ballspiel", "Schläger", "Platz"] },
  ],
};

wordCategories["Alle Wörter"] = Object.entries(wordCategories)
  .filter(([k]) => k !== "Alle Wörter")
  .flatMap(([, v]) => v);

export function pickRandomWord(category: string): WordData {
  const list = wordCategories[category] ?? wordCategories.Allgemein;
  return list[Math.floor(Math.random() * list.length)];
}

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}
