// Zet de donkere modus voordat React laadt, anders flitst het scherm eerst wit.
// Zelfde sleutel en zelfde keuze als src/contexts/ThemeContext.jsx:
// alleen een opgeslagen keuze, anders licht.
(function () {
  var stored = null;
  try {
    stored = localStorage.getItem("leviaan_theme");
  } catch (error) {
    stored = null;
  }
  if (stored !== "dark") return;
  document.documentElement.classList.add("dark");
  document.documentElement.style.colorScheme = "dark";
  var themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.setAttribute("content", "#0b1f3a");
  var colorScheme = document.querySelector('meta[name="color-scheme"]');
  if (colorScheme) colorScheme.setAttribute("content", "dark");
})();
