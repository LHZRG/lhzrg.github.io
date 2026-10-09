/* 关于页
   ⚠ 这个文件只负责显示逻辑，内容都来自 data.js：
       个人介绍 → SITE.bio / SITE.chips
       能力条   → SKILLS
       时间轴   → TIMELINE
       联系方式 → SITE.socials
 */
(() => {
  App.init("about.html");

  /* 个人介绍 */
  document.getElementById("profile").innerHTML = `
    <div class="profile-avatar">
      <img src="${App.esc(SITE.avatar)}" alt="${App.esc(SITE.author)}">
      <div class="profile-badge">${App.esc(SITE.latin)}</div>
    </div>
    <div>
      <h3 class="profile-name">${App.esc(SITE.author)}</h3>
      <div class="profile-role">${App.esc(SITE.role)}</div>
      ${SITE.bio.map((t) => `<p class="profile-bio">${App.esc(t)}</p>`).join("")}
      <div class="chips">${SITE.chips.map((c) => `<span class="chip">${App.esc(c)}</span>`).join("")}</div>
    </div>`;

  /* 技能条 */
  document.getElementById("skillList").innerHTML = SKILLS.map(
    (s) => `
    <div class="skill">
      <span>${App.esc(s.name)}</span>
      <span class="skill-bar"><i data-v="${s.value}"></i></span>
      <b>${s.value}</b>
    </div>`
  ).join("");
  setTimeout(() => {
    App.$$(".skill-bar i").forEach((el) => (el.style.width = el.dataset.v + "%"));
  }, 300);

  /* 时间轴 */
  document.getElementById("timeline").innerHTML = TIMELINE.map(
    (t) => `
    <div class="tl-item">
      <div class="tl-date">${App.esc(t.date)}</div>
      <div class="tl-title">${App.esc(t.title)}</div>
      <p class="tl-desc">${App.esc(t.desc)}</p>
    </div>`
  ).join("");

  /* 联系方式 */
  document.getElementById("contactRow").innerHTML = SITE.socials
    .map(
      (s) =>
        `<a class="btn ghost" style="padding:9px 18px;font-size:14px" href="${App.esc(
          s.url
        )}" ${s.url.startsWith("http") ? 'target="_blank" rel="noopener"' : ""}>${App.esc(
          s.icon
        )} ${App.esc(s.label)}</a>`
    )
    .join("");

  App.reveal();
})();
