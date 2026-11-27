import { Cormorant_Garamond, Source_Sans_3, Nunito, Cinzel, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";

// House / Vasana: high-contrast serif + humanist sans
export const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--font-cormorant", display: "swap" });
export const source = Source_Sans_3({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-source", display: "swap" });
// Dhun: rounded sans, lowercase
export const nunito = Nunito({ subsets: ["latin"], weight: ["500", "700", "800"], variable: "--font-nunito", display: "swap", preload: false });
// Anvaya: engraved serif, wide spacing
export const cinzel = Cinzel({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-cinzel", display: "swap", preload: false });
// Odaya: technical sans
export const plex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex", display: "swap", preload: false });
export const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono", display: "swap", preload: false });

export const fontVariables = [cormorant.variable, source.variable, nunito.variable, cinzel.variable, plex.variable, plexMono.variable].join(" ");
