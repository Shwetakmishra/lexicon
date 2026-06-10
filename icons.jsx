/* ============================================================
   icons.jsx — inline Tabler SVG icons (no webfont dependency)
   Paths sourced from @tabler/icons 3.31.0 (MIT).
   Exposes Icon + ICON_PATHS on window. Load BEFORE components.
   ============================================================ */
const ICON_PATHS = {
  "books": '<path stroke="none" d="M0 0h24v24H0z" fill="none"/> <path d="M5 4m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z" /> <path d="M9 4m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z" /> <path d="M5 8h4" /> <path d="M9 16h4" /> <path d="M13.803 4.56l2.184 -.53c.562 -.135 1.133 .19 1.282 .732l3.695 13.418a1.02 1.02 0 0 1 -.634 1.219l-.133 .041l-2.184 .53c-.562 .135 -1.133 -.19 -1.282 -.732l-3.695 -13.418a1.02 1.02 0 0 1 .634 -1.219l.133 -.041z" /> <path d="M14 9l4 -1" /> <path d="M16 16l3.923 -.98" />',
  "cards": '<path stroke="none" d="M0 0h24v24H0z" fill="none"/> <path d="M3.604 7.197l7.138 -3.109a.96 .96 0 0 1 1.27 .527l4.924 11.902a1 1 0 0 1 -.514 1.304l-7.137 3.109a.96 .96 0 0 1 -1.271 -.527l-4.924 -11.903a1 1 0 0 1 .514 -1.304z" /> <path d="M15 4h1a1 1 0 0 1 1 1v3.5" /> <path d="M20 6c.264 .112 .52 .217 .768 .315a1 1 0 0 1 .53 1.311l-2.298 5.374" />',
  "calendar-due": '<path stroke="none" d="M0 0h24v24H0z" fill="none"/> <path d="M4 5m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z" /> <path d="M16 3v4" /> <path d="M8 3v4" /> <path d="M4 11h16" /> <path d="M12 16m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />',
  "chart-arcs": '<path stroke="none" d="M0 0h24v24H0z" fill="none"/> <path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /> <path d="M16.924 11.132a5 5 0 1 0 -4.056 5.792" /> <path d="M3 12a9 9 0 1 0 9 -9" />',
  "flame": '<path stroke="none" d="M0 0h24v24H0z" fill="none"/> <path d="M12 10.941c2.333 -3.308 .167 -7.823 -1 -8.941c0 3.395 -2.235 5.299 -3.667 6.706c-1.43 1.408 -2.333 3.621 -2.333 5.588c0 3.704 3.134 6.706 7 6.706s7 -3.002 7 -6.706c0 -1.712 -1.232 -4.403 -2.333 -5.588c-2.084 3.353 -3.257 3.353 -4.667 2.235" />',
  "star": '<path stroke="none" d="M0 0h24v24H0z" fill="none"/> <path d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z" />',
  "star-filled": '<path stroke="none" d="M0 0h24v24H0z" fill="none"/> <path d="M8.243 7.34l-6.38 .925l-.113 .023a1 1 0 0 0 -.44 1.684l4.622 4.499l-1.09 6.355l-.013 .11a1 1 0 0 0 1.464 .944l5.706 -3l5.693 3l.1 .046a1 1 0 0 0 1.352 -1.1l-1.091 -6.355l4.624 -4.5l.078 -.085a1 1 0 0 0 -.633 -1.62l-6.38 -.926l-2.852 -5.78a1 1 0 0 0 -1.794 0l-2.853 5.78z" />',
  "chevron-down": '<path stroke="none" d="M0 0h24v24H0z" fill="none"/> <path d="M6 9l6 6l6 -6" />',
  "chevron-left": '<path stroke="none" d="M0 0h24v24H0z" fill="none"/> <path d="M15 6l-6 6l6 6" />',
  "chevron-right": '<path stroke="none" d="M0 0h24v24H0z" fill="none"/> <path d="M9 6l6 6l-6 6" />',
  "search": '<path stroke="none" d="M0 0h24v24H0z" fill="none"/> <path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" /> <path d="M21 21l-6 -6" />',
  "plus": '<path stroke="none" d="M0 0h24v24H0z" fill="none"/> <path d="M12 5l0 14" /> <path d="M5 12l14 0" />',
  "x": '<path stroke="none" d="M0 0h24v24H0z" fill="none"/> <path d="M18 6l-12 12" /> <path d="M6 6l12 12" />',
  "trash": '<path stroke="none" d="M0 0h24v24H0z" fill="none"/> <path d="M4 7l16 0" /> <path d="M10 11l0 6" /> <path d="M14 11l0 6" /> <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" /> <path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" />',
  "bulb": '<path stroke="none" d="M0 0h24v24H0z" fill="none"/> <path d="M3 12h1m8 -9v1m8 8h1m-15.4 -6.4l.7 .7m12.1 -.7l-.7 .7" /> <path d="M9 16a5 5 0 1 1 6 0a3.5 3.5 0 0 0 -1 3a2 2 0 0 1 -4 0a3.5 3.5 0 0 0 -1 -3" /> <path d="M9.7 17l4.6 0" />',
  "calendar-plus": '<path stroke="none" d="M0 0h24v24H0z" fill="none"/> <path d="M12.5 21h-6.5a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v5" /> <path d="M16 3v4" /> <path d="M8 3v4" /> <path d="M4 11h16" /> <path d="M16 19h6" /> <path d="M19 16v6" />',
  "sparkles": '<path stroke="none" d="M0 0h24v24H0z" fill="none"/> <path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6z" />',
  "alert-triangle": '<path stroke="none" d="M0 0h24v24H0z" fill="none"/> <path d="M12 9v4" /> <path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0z" /> <path d="M12 16h.01" />',
  "refresh": '<path stroke="none" d="M0 0h24v24H0z" fill="none"/> <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" /> <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />',
  "rotate-2": '<path stroke="none" d="M0 0h24v24H0z" fill="none"/> <path d="M15 4.55a8 8 0 0 0 -6 14.9m0 -4.45v5h-5" /> <path d="M18.37 7.16l0 .01" /> <path d="M13 19.94l0 .01" /> <path d="M16.84 18.37l0 .01" /> <path d="M19.37 15.1l0 .01" /> <path d="M19.94 11l0 .01" />',
  "arrow-left": '<path stroke="none" d="M0 0h24v24H0z" fill="none"/> <path d="M5 12l14 0" /> <path d="M5 12l6 6" /> <path d="M5 12l6 -6" />',
  "arrow-right": '<path stroke="none" d="M0 0h24v24H0z" fill="none"/> <path d="M5 12l14 0" /> <path d="M13 18l6 -6" /> <path d="M13 6l6 6" />',
  "check": '<path stroke="none" d="M0 0h24v24H0z" fill="none"/> <path d="M5 12l5 5l10 -10" />',
  "checks": '<path stroke="none" d="M0 0h24v24H0z" fill="none"/> <path d="M7 12l5 5l10 -10" /> <path d="M2 12l5 5m5 -5l5 -5" />',
  "circles": '<path stroke="none" d="M0 0h24v24H0z" fill="none"/> <path d="M12 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" /> <path d="M6.5 17m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" /> <path d="M17.5 17m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" />',
  "search-off": '<path stroke="none" d="M0 0h24v24H0z" fill="none"/> <path d="M5.039 5.062a7 7 0 0 0 9.91 9.89m1.584 -2.434a7 7 0 0 0 -9.038 -9.057" /> <path d="M3 3l18 18" />',
  "filter-off": '<path stroke="none" d="M0 0h24v24H0z" fill="none"/> <path d="M8 4h12v2.172a2 2 0 0 1 -.586 1.414l-3.914 3.914m-.5 3.5v4l-6 2v-8.5l-4.48 -4.928a2 2 0 0 1 -.52 -1.345v-2.227" /> <path d="M3 3l18 18" />',
  "book": '<path stroke="none" d="M0 0h24v24H0z" fill="none"/> <path d="M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0" /> <path d="M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0" /> <path d="M3 6l0 13" /> <path d="M12 6l0 13" /> <path d="M21 6l0 13" />',
};

function Icon({ name, className = "", style }) {
  const inner = ICON_PATHS[name] || "";
  const filled = name && name.endsWith("-filled");
  return (
    <svg
      className={`ti ${className}`}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}

Object.assign(window, { Icon, ICON_PATHS });
