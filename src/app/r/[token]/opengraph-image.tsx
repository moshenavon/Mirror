import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getSharedLink } from "@/lib/shared-link";
import { shareCopy } from "@/lib/share-preview";
import { rtlWords } from "@/lib/og-text";

export const alt = "Mirror – שיתוף מחשבות ותובנות עם הצוות";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const ASSETS = join(process.cwd(), "src/assets/og");

const YELLOW = "#ffd02f";
const NAVY = "#050038";

async function asset(name: string): Promise<Buffer> {
  return readFile(join(ASSETS, name));
}

async function dataUrl(name: string): Promise<string> {
  return `data:image/png;base64,${(await asset(name)).toString("base64")}`;
}

/** Emoji scattered around the card: [file, x, y, size, rotation]. */
type Sprinkle = [string, number, number, number, number];

const REPORT_EMOJI: Sprinkle[] = [
  ["1f604", 70, 56, 92, -10],
  ["1f4a1", 40, 470, 96, 8],
  ["1f4ac", 560, 520, 72, -6],
  ["1f389", 1080, 22, 88, 10],
  ["1f680", 1080, 500, 88, -8],
  ["2728", 470, 36, 60, 0],
];

const JOIN_EMOJI: Sprinkle[] = [
  ["1f64b", 64, 52, 100, -8],
  ["1f91d", 40, 470, 96, 8],
  ["2728", 560, 524, 64, 0],
  ["1f389", 1080, 22, 88, 10],
  ["1f680", 1080, 500, 88, -8],
  ["1f4a1", 470, 32, 64, -6],
];

/** Hebrew paragraph laid out right-to-left (the renderer has no bidi support). */
function Rtl({ text, fontSize, color, weight, gap }: { text: string; fontSize: number; color: string; weight: number; gap: number }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row-reverse",
        flexWrap: "wrap",
        justifyContent: "flex-start",
        columnGap: gap,
        fontSize,
        fontWeight: weight,
        color,
        lineHeight: 1.15,
      }}
    >
      {rtlWords(text).map((word, i) => (
        <span key={i}>{word}</span>
      ))}
    </div>
  );
}

function titleSize(title: string): number {
  const length = Array.from(title).length;
  if (length <= 10) return 104;
  if (length <= 14) return 84;
  if (length <= 20) return 64;
  return 54;
}

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await getSharedLink(token);
  const copy = shareCopy(link);
  const sprinkles = link?.allow_join ? JOIN_EMOJI : REPORT_EMOJI;

  const [regular, bold, logo, ...emoji] = await Promise.all([
    asset("Heebo-500.ttf"),
    asset("Heebo-800.ttf"),
    dataUrl("logo.png"),
    ...sprinkles.map(([code]) => dataUrl(`emoji-${code}.png`)),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 110px 0 130px",
          fontFamily: "Heebo",
          backgroundColor: NAVY,
          backgroundImage: "radial-gradient(circle at 30% 45%, #1d1880 0%, #0a0830 55%, #050020 100%)",
        }}
      >
        {sprinkles.map(([code, x, y, s, r], i) => (
          <img
            key={code}
            src={emoji[i]}
            width={s}
            height={s}
            alt=""
            style={{ position: "absolute", left: x, top: y, transform: `rotate(${r}deg)` }}
          />
        ))}

        <img
          src={logo}
          width={300}
          height={300}
          alt=""
          style={{
            borderRadius: 66,
            transform: "rotate(-4deg)",
            boxShadow: "0 30px 80px rgba(255, 208, 47, 0.28)",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", width: 640 }}>
          <div
            style={{
              display: "flex",
              backgroundColor: YELLOW,
              color: NAVY,
              borderRadius: 999,
              padding: "8px 26px 12px",
            }}
          >
            <Rtl text={copy.kicker} fontSize={30} color={NAVY} weight={800} gap={9} />
          </div>
          <div style={{ display: "flex", marginTop: 22 }}>
            <Rtl text={copy.title} fontSize={titleSize(copy.title)} color={YELLOW} weight={800} gap={22} />
          </div>
          <div style={{ display: "flex", marginTop: 22 }}>
            <Rtl text={copy.description} fontSize={36} color="#ffffff" weight={500} gap={11} />
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Heebo", data: regular, weight: 500, style: "normal" },
        { name: "Heebo", data: bold, weight: 800, style: "normal" },
      ],
    },
  );
}
