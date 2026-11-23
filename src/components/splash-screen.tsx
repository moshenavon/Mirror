import { SPLASH_ID, SPLASH_INIT_SCRIPT } from "@/lib/splash";

const NAVY = "#0A1A44";
const SKY = "#7CC8FF";
const STAR = "M128 20C128 95 70 128 5 128C70 128 128 161 128 236C128 161 186 128 251 128C186 128 128 95 128 20Z";

/**
 * Launch screen shown on the first full load of a session: the logo is revealed
 * by a circle growing from its centre (the "iris") while the star blooms, then a
 * ripple spreads out once the iris is fully open. Pure CSS (see globals.css), so
 * it plays from the first paint, before hydration.
 */
export function SplashScreen() {
  return (
    <>
      <div id={SPLASH_ID} className="splash" aria-hidden="true" suppressHydrationWarning>
        <div className="splash-mark">
          {[0, 1, 2].map((i) => (
            <span key={i} className="splash-ripple" style={{ "--i": i } as React.CSSProperties} />
          ))}
          <svg className="splash-logo" viewBox="0 0 256 256">
            <defs>
              <clipPath id="splash-iris">
                <circle className="splash-iris" cx="128" cy="128" r="182" />
              </clipPath>
              <clipPath id="splash-round">
                <rect width="256" height="256" rx="56" />
              </clipPath>
              <clipPath id="splash-left">
                <rect width="130" height="256" />
              </clipPath>
              <clipPath id="splash-right">
                <rect x="128" width="128" height="256" />
              </clipPath>
            </defs>
            <g clipPath="url(#splash-iris)">
              <g clipPath="url(#splash-round)">
                <rect width="130" height="256" fill={NAVY} />
                <rect x="128" width="128" height="256" fill={SKY} />
                <g clipPath="url(#splash-left)">
                  <path className="splash-star" d={STAR} fill={SKY} />
                </g>
                <g clipPath="url(#splash-right)">
                  <path className="splash-star" d={STAR} fill={NAVY} />
                </g>
              </g>
            </g>
          </svg>
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: SPLASH_INIT_SCRIPT }} />
    </>
  );
}
