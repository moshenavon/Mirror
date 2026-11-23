export const SPLASH_ID = "splash";

export const SPLASH_SESSION_KEY = "splash-shown";

/**
 * Runs inline right after the splash markup, before first paint. The splash
 * plays once per browser session: later full loads (refresh, new link in the
 * same tab) and visitors who prefer reduced motion never see it. Once its
 * fade-out ends it is hidden so it leaves the accessibility and layout trees.
 */
export const SPLASH_INIT_SCRIPT = `(function(){var s=document.getElementById("${SPLASH_ID}");if(!s)return;try{if(sessionStorage.getItem("${SPLASH_SESSION_KEY}")||matchMedia("(prefers-reduced-motion: reduce)").matches){s.hidden=true;return}sessionStorage.setItem("${SPLASH_SESSION_KEY}","1")}catch(e){s.hidden=true;return}s.addEventListener("animationend",function(e){if(e.target===s)s.hidden=true})})()`;
