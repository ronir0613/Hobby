// One flat illustration per catalogue category, drawn on a 320×200 canvas with the main shape
// kept inside the centre 200×200 so a square crop (thumbnails) still reads.
// Colours are placeholders filled from the art tokens in tokens.json, so light and dark match.

export type ArtColorKey = 'field' | 'paper' | 'leaf' | 'leafDeep' | 'sun' | 'glow' | 'clay' | 'ink';

const shadow = (cx: number, cy: number, rx: number) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="7" fill="{ink}" fill-opacity="0.12"/>`;

const ART: Record<string, string> = {
  mindfulness: `
    <circle cx="160" cy="92" r="58" fill="{glow}"/>
    <circle cx="160" cy="92" r="66" fill="none" stroke="{leaf}" stroke-width="2" stroke-opacity="0.6"/>
    ${shadow(160, 166, 62)}
    <ellipse cx="160" cy="148" rx="46" ry="17" fill="{leafDeep}"/>
    <ellipse cx="160" cy="120" rx="32" ry="13" fill="{leaf}"/>
    <ellipse cx="160" cy="98" rx="19" ry="9" fill="{clay}"/>`,

  'games-puzzles': `
    ${shadow(160, 170, 70)}
    <g transform="rotate(-6 160 100)">
      <rect x="100" y="40" width="120" height="120" rx="14" fill="{paper}"/>
      <path d="M140 46 V154 M180 46 V154 M106 80 H214 M106 120 H214" stroke="{ink}" stroke-opacity="0.18" stroke-width="2"/>
      <rect x="106" y="46" width="28" height="28" rx="6" fill="{sun}"/>
      <rect x="186" y="46" width="28" height="28" rx="6" fill="{leaf}"/>
      <rect x="146" y="86" width="28" height="28" rx="6" fill="{leafDeep}"/>
      <rect x="186" y="126" width="28" height="28" rx="6" fill="{clay}"/>
    </g>`,

  'arts-crafts': `
    ${shadow(160, 166, 70)}
    <circle cx="122" cy="116" r="28" fill="{sun}"/>
    <circle cx="166" cy="96" r="22" fill="{clay}"/>
    <circle cx="198" cy="132" r="20" fill="{leaf}"/>
    <g transform="rotate(40 200 90)">
      <rect x="194" y="20" width="12" height="88" rx="6" fill="{leafDeep}"/>
      <rect x="192" y="106" width="16" height="14" rx="2" fill="{ink}" fill-opacity="0.55"/>
      <path d="M192 120 H208 L204 142 Q200 152 196 142 Z" fill="{ink}"/>
    </g>`,

  music: `
    <circle cx="170" cy="96" r="56" fill="{glow}"/>
    <path d="M86 70 Q72 100 86 130 M70 58 Q50 100 70 142" fill="none" stroke="{leaf}" stroke-width="4" stroke-linecap="round"/>
    ${shadow(170, 166, 60)}
    <path d="M144 62 L204 50 V64 L144 76 Z" fill="{leafDeep}"/>
    <rect x="140" y="62" width="5" height="78" fill="{leafDeep}"/>
    <rect x="200" y="50" width="5" height="78" fill="{leafDeep}"/>
    <ellipse cx="130" cy="140" rx="16" ry="12" transform="rotate(-20 130 140)" fill="{leafDeep}"/>
    <ellipse cx="190" cy="128" rx="16" ry="12" transform="rotate(-20 190 128)" fill="{leafDeep}"/>`,

  'outdoors-nature': `
    <circle cx="204" cy="76" r="26" fill="{sun}"/>
    <path d="M0 150 Q90 70 190 140 T320 120 V200 H0 Z" fill="{leaf}"/>
    <rect x="108" y="96" width="4" height="16" fill="{ink}" fill-opacity="0.6"/>
    <circle cx="110" cy="90" r="12" fill="{leafDeep}"/>
    <path d="M0 172 Q120 122 230 166 T320 160 V200 H0 Z" fill="{leafDeep}"/>`,

  'cooking-food': `
    <path d="M136 84 q-8 -12 0 -24 q8 -12 0 -24 M160 80 q-8 -12 0 -24 q8 -12 0 -24 M184 84 q-8 -12 0 -24 q8 -12 0 -24" fill="none" stroke="{leaf}" stroke-width="4" stroke-linecap="round"/>
    ${shadow(160, 164, 70)}
    <path d="M96 104 H224 A64 56 0 0 1 96 104 Z" fill="{clay}"/>
    <ellipse cx="160" cy="104" rx="64" ry="10" fill="{clay}"/>
    <ellipse cx="160" cy="104" rx="56" ry="7" fill="{sun}"/>`,

  'home-garden': `
    <circle cx="214" cy="60" r="22" fill="{sun}"/>
    ${shadow(160, 166, 56)}
    <path d="M160 112 V56" stroke="{leafDeep}" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="140" cy="88" rx="22" ry="10" transform="rotate(30 140 88)" fill="{leaf}"/>
    <ellipse cx="182" cy="76" rx="24" ry="10" transform="rotate(-30 182 76)" fill="{leafDeep}"/>
    <ellipse cx="160" cy="50" rx="10" ry="18" fill="{leaf}"/>
    <path d="M126 118 H194 L186 164 H134 Z" fill="{clay}"/>
    <rect x="120" y="108" width="80" height="16" rx="4" fill="{clay}"/>
    <rect x="120" y="120" width="80" height="4" fill="{ink}" fill-opacity="0.12"/>`,

  'fitness-movement': `
    <circle cx="160" cy="84" r="42" fill="{glow}"/>
    ${shadow(160, 170, 88)}
    <circle cx="112" cy="136" r="30" fill="none" stroke="{ink}" stroke-width="5"/>
    <circle cx="208" cy="136" r="30" fill="none" stroke="{ink}" stroke-width="5"/>
    <path d="M112 136 L156 136 L196 96 M156 136 L140 96 L196 96 L208 136" fill="none" stroke="{leafDeep}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M130 90 H150 M192 84 H206" stroke="{ink}" stroke-width="6" stroke-linecap="round"/>
    <path d="M196 96 L193 84" stroke="{ink}" stroke-width="5" stroke-linecap="round"/>`,

  'learning-culture': `
    <circle cx="234" cy="48" r="18" fill="{sun}"/>
    ${shadow(160, 166, 86)}
    <path d="M78 72 V158 Q124 148 160 162 Q196 148 242 158 V72 Z" fill="{leafDeep}"/>
    <path d="M160 72 Q124 58 84 66 V150 Q124 142 160 156 Z" fill="{paper}"/>
    <path d="M160 72 Q196 58 236 66 V150 Q196 142 160 156 Z" fill="{paper}"/>
    <path d="M160 72 V156" stroke="{ink}" stroke-opacity="0.2" stroke-width="2"/>
    <path d="M100 88 Q124 82 146 90 M100 104 Q124 98 146 106 M100 120 Q120 114 138 120 M174 90 Q196 82 220 88 M174 106 Q196 98 220 104 M174 122 Q192 114 208 118" fill="none" stroke="{ink}" stroke-opacity="0.22" stroke-width="3" stroke-linecap="round"/>`,

  'travel-exploration': `
    ${shadow(160, 168, 84)}
    <path d="M88 60 L134 48 V150 L88 162 Z" fill="{paper}"/>
    <path d="M134 48 L186 60 V162 L134 150 Z" fill="{leaf}"/>
    <path d="M186 60 L232 48 V150 L186 162 Z" fill="{paper}"/>
    <path d="M104 140 C130 120 150 130 160 104 S200 84 212 86" fill="none" stroke="{clay}" stroke-width="4" stroke-dasharray="2 10" stroke-linecap="round"/>
    <path d="M212 92 C200 78 198 72 198 66 A14 14 0 0 1 226 66 C226 72 224 78 212 92 Z" fill="{clay}"/>
    <circle cx="212" cy="66" r="5" fill="{paper}"/>`,
};

/** The SVG markup for a category, with colours filled in. Unknown slugs get the outdoors scene. */
export function categoryArtXml(slug: string, colors: Record<ArtColorKey, string>) {
  const body = (ART[slug] ?? ART['outdoors-nature']).replace(
    /\{(field|paper|leaf|leafDeep|sun|glow|clay|ink)\}/g,
    (_, key: ArtColorKey) => colors[key],
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><rect width="320" height="200" fill="${colors.field}"/>${body}</svg>`;
}

export const ART_SLUGS = Object.keys(ART);
