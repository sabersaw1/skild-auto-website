// Vehicle database for the Skild Auto intake quiz.
// Designed to later be replaced by an external API / Neon-backed lookup
// without changing the shape consumed by the UI.

export type VehicleKind = "auto" | "moto";

export const OTHER = "Other";

export function getYears(kind: VehicleKind): string[] {
  const now = new Date().getFullYear() + 1;
  const earliest = kind === "moto" ? 1960 : 1970;
  const years: string[] = [];
  for (let y = now; y >= earliest; y--) years.push(String(y));
  return years;
}

// --- AUTO ---------------------------------------------------------------

export const AUTO_MAKES_MODELS: Record<string, string[]> = {
  Acura: ["ILX", "TLX", "RDX", "MDX", "Integra", OTHER],
  Audi: ["A3", "A4", "A5", "A6", "Q3", "Q5", "Q7", "S4", OTHER],
  BMW: ["2 Series", "3 Series", "4 Series", "5 Series", "X1", "X3", "X5", "M3", "M5", OTHER],
  Buick: ["Encore", "Enclave", "Envision", OTHER],
  Cadillac: ["CTS", "ATS", "Escalade", "XT5", "CT5", OTHER],
  Chevrolet: ["Silverado", "Tahoe", "Suburban", "Equinox", "Malibu", "Camaro", "Corvette", "Traverse", OTHER],
  Chrysler: ["300", "Pacifica", "Voyager", OTHER],
  Dodge: ["Charger", "Challenger", "Durango", "Ram 1500", "Ram 2500", OTHER],
  Ford: ["F-150", "F-250", "F-350", "Ranger", "Escape", "Explorer", "Expedition", "Mustang", "Bronco", "Edge", OTHER],
  Genesis: ["G70", "G80", "G90", "GV70", "GV80", OTHER],
  GMC: ["Sierra 1500", "Sierra 2500", "Yukon", "Acadia", "Terrain", OTHER],
  Honda: ["Civic", "Accord", "CR-V", "Pilot", "Odyssey", "HR-V", "Passport", "Ridgeline", OTHER],
  Hyundai: ["Elantra", "Sonata", "Tucson", "Santa Fe", "Palisade", "Kona", OTHER],
  Infiniti: ["Q50", "Q60", "QX50", "QX60", "QX80", OTHER],
  Jeep: ["Wrangler", "Grand Cherokee", "Cherokee", "Compass", "Gladiator", "Renegade", OTHER],
  Kia: ["Forte", "K5", "Sportage", "Sorento", "Telluride", "Soul", OTHER],
  "Land Rover": ["Defender", "Discovery", "Range Rover", "Range Rover Sport", OTHER],
  Lexus: ["IS", "ES", "RX", "GX", "LX", "NX", OTHER],
  Lincoln: ["Aviator", "Navigator", "Nautilus", "Corsair", OTHER],
  Mazda: ["Mazda3", "Mazda6", "CX-3", "CX-5", "CX-9", "MX-5 Miata", OTHER],
  "Mercedes-Benz": ["A-Class", "C-Class", "E-Class", "S-Class", "GLA", "GLC", "GLE", "GLS", OTHER],
  Mitsubishi: ["Outlander", "Eclipse Cross", "Mirage", OTHER],
  Nissan: ["Altima", "Maxima", "Sentra", "Rogue", "Pathfinder", "Frontier", "Titan", "370Z", OTHER],
  Porsche: ["911", "Cayenne", "Macan", "Panamera", "Taycan", OTHER],
  Ram: ["1500", "2500", "3500", "ProMaster", OTHER],
  Subaru: ["Impreza", "Legacy", "Outback", "Forester", "Crosstrek", "WRX", "Ascent", OTHER],
  Tesla: ["Model 3", "Model Y", "Model S", "Model X", "Cybertruck", OTHER],
  Toyota: ["Corolla", "Camry", "RAV4", "4Runner", "Tacoma", "Tundra", "Highlander", "Sequoia", "Sienna", "Prius", OTHER],
  Volkswagen: ["Jetta", "Passat", "Golf", "GTI", "Tiguan", "Atlas", "Taos", OTHER],
  Volvo: ["S60", "S90", "XC40", "XC60", "XC90", OTHER],
  [OTHER]: [OTHER],
};

// --- MOTO ---------------------------------------------------------------

export const MOTO_MAKES_MODELS: Record<string, string[]> = {
  "Harley-Davidson": ["Sportster", "Iron 883", "Softail", "Fat Boy", "Street Glide", "Road Glide", "Road King", "Dyna", OTHER],
  Honda: ["CBR300R", "CBR500R", "CBR600RR", "CBR1000RR", "Rebel 300", "Rebel 500", "Rebel 1100", "Shadow", "Gold Wing", "Africa Twin", "Grom", OTHER],
  Yamaha: ["YZF-R1", "YZF-R3", "YZF-R6", "YZF-R7", "MT-03", "MT-07", "MT-09", "MT-10", "Bolt", "Tenere 700", "V-Star", OTHER],
  Kawasaki: ["Ninja 400", "Ninja 650", "Ninja ZX-6R", "Ninja ZX-10R", "Z400", "Z650", "Z900", "Versys 650", "Vulcan", OTHER],
  Suzuki: ["GSX-R600", "GSX-R750", "GSX-R1000", "SV650", "V-Strom 650", "V-Strom 1050", "Hayabusa", "Boulevard", OTHER],
  Ducati: ["Monster", "Panigale V2", "Panigale V4", "Streetfighter", "Multistrada", "Scrambler", "Diavel", OTHER],
  BMW: ["R 1250 GS", "R 1250 RT", "S 1000 RR", "S 1000 R", "F 850 GS", "F 900 R", "R nineT", OTHER],
  KTM: ["Duke 390", "Duke 790", "Duke 890", "RC 390", "1290 Super Duke", "Adventure 390", "Adventure 890", OTHER],
  Triumph: ["Bonneville T100", "Bonneville T120", "Street Triple", "Speed Triple", "Tiger 900", "Tiger 1200", "Rocket 3", OTHER],
  "Indian Motorcycle": ["Scout", "Chief", "Chieftain", "Roadmaster", "Challenger", "FTR", OTHER],
  Aprilia: ["RS 660", "RSV4", "Tuono 660", "Tuono V4", OTHER],
  "Royal Enfield": ["Classic 350", "Meteor 350", "Himalayan", "Interceptor 650", "Continental GT 650", OTHER],
  [OTHER]: [OTHER],
};

export function getMakes(kind: VehicleKind): string[] {
  return Object.keys(kind === "moto" ? MOTO_MAKES_MODELS : AUTO_MAKES_MODELS);
}
export function getModels(kind: VehicleKind, make: string): string[] {
  const db = kind === "moto" ? MOTO_MAKES_MODELS : AUTO_MAKES_MODELS;
  return db[make] ?? [OTHER];
}
