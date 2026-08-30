# Canvas source

Working files for the YAHALA Executive Portal design canvas.

`Main.dc.html` is `../index.html` adapted to run as a
canvas artboard:

- the merchant seed from `../assets/data.js` is inlined at the top of the
  `data-dc-script` block (it has to exist before `Component`'s constructor
  calls `initState()`);
- `logo_mark.png` and `bg_navy.jpg` are referenced by bare filename and travel
  with the canvas as files (downsampled copies live here);
- merchant logos and newsletter covers are inlined as data URIs, because their
  `src` is built at runtime in JS and so is never rewritten by the canvas.

Edit `Main.dc.html` / `canvas.json` here, then re-seed and republish.
