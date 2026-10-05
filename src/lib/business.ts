// Skild Auto — single source of truth for business identity.
// Imported across the site so updates here propagate everywhere.

export const BUSINESS = {
  name: "Skild Auto",
  owner: "Johnny Green",
  location: "Salt Lake City, Utah",
  city: "Salt Lake City, UT",
  phone: "801-584-9804",
  phoneE164: "+18015849804",
  email: "skildauto@gmail.com",
  instagramHandle: "@skildauto",
  instagramUrl: "https://www.instagram.com/skildauto",
  website: "https://skildauto.com",
  calendlyUrl: "https://calendly.com/skildauto/30min",
  hours: "Mon–Fri 8 AM – 8 PM · Sat 9 AM – 8 PM",
} as const;

export const telHref = `tel:${BUSINESS.phoneE164}`;
export const mailHref = `mailto:${BUSINESS.email}`;
