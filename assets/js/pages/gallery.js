/* 图片墙
   ⚠ 这个文件只负责瀑布流和大图查看的显示逻辑，不含照片本身。
     加删照片去 data.js 的 GALLERY（图片本体放进 assets/img/）。
 */
(() => {
  const { lightbox } = App.init("gallery.html");

  const grid = document.getElementById("galleryGrid");
  document.getElementById("shotNum").textContent = GALLERY.length;

  grid.innerHTML = [
    ...GALLERY.map(
      (g, i) => `
      <figure class="shot reveal" data-i="${i}">
        <img src="${App.esc(g.src)}" alt="${App.esc(g.title)}" loading="lazy">
        <figcaption class="shot-cap">${App.esc(g.title)}<small>${App.esc(
        [g.place, g.date].filter(Boolean).join(" · ")
      )}</small></figcaption>
      </figure>`
    ),
    `<figure class="shot placeholder reveal">
       <div style="text-align:center;color:var(--wood-500);font-family:var(--font-serif)">
         <div style="font-size:26px">光影待续</div>
         <div style="font-size:12px;opacity:.7;letter-spacing:.18em">TO BE CONTINUED</div>
       </div>
     </figure>`,
  ].join("");

  grid.addEventListener("click", (e) => {
    const f = e.target.closest(".shot[data-i]");
    if (f) lightbox.open(GALLERY, Number(f.dataset.i));
  });

  document.getElementById("shuffle").onclick = () =>
    lightbox.open(GALLERY, Math.floor(Math.random() * GALLERY.length));

  App.reveal();
})();
