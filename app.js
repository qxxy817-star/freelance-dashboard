const DIRECTIONS = ["自媒体", "模特", "网店", "生活"];
const CORE_DIRECTIONS = ["自媒体", "模特", "网店"];
const STATUSES = ["未开始", "进行中", "已完成", "延期", "放弃"];
const REASONS = ["遗漏前置步骤", "启动困难", "决策太久", "中途被打断", "反复修改", "精力不足", "临时情况", "预计基本准确"];
const STORAGE_KEY = "cyber-bear-workbench-v1";

const $ = (id) => document.getElementById(id);
const uid = () => crypto.randomUUID();
const todayISO = () => new Date().toISOString().slice(0, 10);
const minutesToHours = (minutes) => Number(minutes || 0) / 60;
const fmtHours = (value) => `${Number(value || 0).toFixed(1).replace(".0", "")}小时`;
const fmtMinutes = (value) => value >= 60 ? `${Math.floor(value / 60)}小时${value % 60 ? `${value % 60}分钟` : ""}` : `${value || 0}分钟`;
const currentMonth = () => todayISO().slice(0, 7);

const demoState = {
  dailyCapacity: 6,
  notDoing: "不继续调整工作台视觉\n不临时开新选题\n不同时推进三个方向",
  todayTasks: [
    { id: uid(), name: "剪完超级转转 Vlog", direction: "自媒体", estimate: 4.5, actual: 2.5, standard: "导出第一版成片", status: "进行中", useLibrary: true },
    { id: uid(), name: "Pose 练习 30 组", direction: "模特", estimate: 1, actual: 0, standard: "完成 30 组并选出 6 张参考", status: "未开始", useLibrary: false },
    { id: uid(), name: "优化 3 个商品标题", direction: "网店", estimate: 1, actual: 1, standard: "完成发布并记录点击数据", status: "已完成", useLibrary: false },
  ],
  review: {},
  timeRecords: [
    { id: uid(), date: "2026-07-02", name: "日常化妆", estimate: 35, actual: 37, interrupted: "否", reason: "预计基本准确", suggestion: 40 },
    { id: uid(), date: "2026-07-04", name: "日常化妆", estimate: 30, actual: 52, interrupted: "是", reason: "决策太久", suggestion: 50 },
    { id: uid(), date: "2026-07-06", name: "剪 Vlog", estimate: 240, actual: 260, interrupted: "否", reason: "反复修改", suggestion: 270 },
    { id: uid(), date: "2026-07-08", name: "Pose 练习", estimate: 60, actual: 72, interrupted: "否", reason: "预计基本准确", suggestion: 75 },
    { id: uid(), date: "2026-07-09", name: "回复工作消息", estimate: 30, actual: 55, interrupted: "是", reason: "中途被打断", suggestion: 60 },
  ],
  completed: [
    { id: uid(), date: "2026-07-08", name: "搭建自由职业总控台", direction: "网店", estimate: 2, actual: 4 },
    { id: uid(), date: "2026-07-09", name: "完成探店脚本", direction: "自媒体", estimate: 1.5, actual: 2 },
    { id: uid(), date: "2026-07-10", name: "Pose练习30组", direction: "模特", estimate: 1, actual: 1.2 },
  ],
  career: {
    自媒体: { goals: ["发布4条内容", "完成1条个人表达作品", "测试1种采访形式"], projects: [{ name: "超级转转探店 Vlog", status: "进行中", next: "完成粗剪并导出第一版成片" }, { name: "女朋友采访", status: "准备中", next: "列出采访的10个核心问题" }] },
    模特: { goals: ["完成3次Pose训练", "整理一组新作品集"], projects: [{ name: "夏季穿搭试拍", status: "待反馈", next: "筛选15张候选照片给摄影师" }] },
    网店: { goals: ["完成饰品上新", "测试2个高转化标题"], projects: [{ name: "手作饰品上新", status: "进行中", next: "拍摄主图并写10个商品标题" }] },
  },
};

let state = loadState();
function loadState() { try { return { ...structuredClone(demoState), ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") }; } catch { return structuredClone(demoState); } }
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

function initNavigation() {
  const show = (page) => {
    document.querySelectorAll("[data-page]").forEach((el) => el.classList.toggle("active", el.dataset.page === page));
    document.querySelectorAll("[data-page-link]").forEach((el) => el.classList.toggle("active", el.dataset.pageLink === page));
  };
  document.querySelectorAll("[data-page-link]").forEach((link) => link.addEventListener("click", (event) => { event.preventDefault(); history.replaceState(null, "", link.hash); show(link.dataset.pageLink); }));
  show(location.hash?.replace("#", "") || "today");
}

function renderToday() {
  const date = new Date();
  $("todayDateText").textContent = date.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" });
  $("dailyCapacity").value = state.dailyCapacity;
  $("notDoing").value = state.notDoing;
  const planned = state.todayTasks.reduce((sum, t) => sum + Number(t.estimate || 0), 0);
  const actual = state.todayTasks.reduce((sum, t) => sum + Number(t.actual || 0), 0);
  const overload = Math.max(planned - Number(state.dailyCapacity || 0), 0);
  $("plannedTotal").textContent = fmtHours(planned);
  $("overloadText").textContent = fmtHours(overload);
  $("overloadBadge").textContent = overload > 0 ? `超载 ${fmtHours(overload)}` : "可执行";
  $("overloadBadge").classList.toggle("warn", overload > 0);
  $("todayTasks").innerHTML = state.todayTasks.map((task, index) => taskTemplate(task, index)).join("");
  Object.entries(state.review || {}).forEach(([key, value]) => { if ($(key)) $(key).value = value; });
  renderOverview(planned, actual);
}

function taskTemplate(task, index) {
  const library = summarizeTask(task.name);
  return `<article class="task-card"><h3>今日第${index + 1}件事</h3><label>任务名称<input data-task="${index}" data-field="name" value="${task.name}"></label><label>所属方向<select data-task="${index}" data-field="direction">${DIRECTIONS.map((d) => `<option ${task.direction === d ? "selected" : ""}>${d}</option>`).join("")}</select></label><div class="inline"><label>预计时间<input type="number" step="0.25" min="0" data-task="${index}" data-field="estimate" value="${task.estimate}"></label><label>实际时间<input type="number" step="0.25" min="0" data-task="${index}" data-field="actual" value="${task.actual}"></label></div><label>完成标准<input data-task="${index}" data-field="standard" value="${task.standard}"></label><label>状态<select data-task="${index}" data-field="status">${STATUSES.map((s) => `<option ${task.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></label><label class="check"><input type="checkbox" data-task="${index}" data-field="useLibrary" ${task.useLibrary ? "checked" : ""}> 采用时间库历史建议</label><p class="library-hint">${library ? `根据过去${library.count}次记录，建议预留 ${fmtMinutes(library.regular)}。` : "暂无历史记录，可手动填写后沉淀到时间库。"}</p><button type="button" class="primary complete" data-complete="${index}">完成并记入本月</button></article>`;
}

function summarizeTask(name) {
  const key = name.replace(/\s/g, "").slice(0, 4);
  const records = state.timeRecords.filter((r) => r.name.replace(/\s/g, "").includes(key) || key.includes(r.name.replace(/\s/g, "").slice(0, 4)));
  if (!records.length) return null;
  const times = records.map((r) => Number(r.actual)).sort((a, b) => a - b);
  const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  return { count: times.length, regular: Math.ceil(avg / 5) * 5 };
}

function renderOverview(planned = 0, actual = 0) {
  const completedToday = state.todayTasks.filter((t) => t.status === "已完成").length;
  const monthDone = state.completed.filter((t) => t.date.startsWith(currentMonth()));
  $("todayCompleted").textContent = `${completedToday} / 3`;
  $("todayOverview").textContent = `今日预计 ${fmtHours(planned)} · 今日实际 ${fmtHours(actual)} · ${planned > state.dailyCapacity ? "当前超载" : "未超载"}`;
  $("monthCompleted").textContent = `${monthDone.length} 件`;
  $("monthOverview").textContent = CORE_DIRECTIONS.map((d) => `${d} ${monthDone.filter((t) => t.direction === d).length}`).join(" · ");
  const bias = monthDone.reduce((sum, t) => sum + (Number(t.actual) - Number(t.estimate)), 0);
  const estimated = monthDone.reduce((sum, t) => sum + Number(t.estimate), 0) || 1;
  $("accuracyOverview").textContent = `${Math.round((bias / estimated) * 100)}%`;
  $("accuracyHint").textContent = `本月平均${bias >= 0 ? "低估" : "高估"}时间 ${Math.abs(Math.round((bias / estimated) * 100))}%`;
}

function renderTimeLibrary() {
  $("recordReason").innerHTML = REASONS.map((r) => `<option>${r}</option>`).join("");
  const groups = state.timeRecords.reduce((acc, record) => { (acc[record.name] ||= []).push(record); return acc; }, {});
  $("timeLibrary").innerHTML = Object.entries(groups).map(([name, records]) => {
    const times = records.map((r) => Number(r.actual)).sort((a, b) => a - b);
    const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    const mid = times[Math.floor(times.length / 2)];
    const regular = Math.ceil(avg / 5) * 5;
    return `<article class="library-card"><h3>${name}</h3><ul><li>已记录：${records.length}次</li><li>最近一次：${fmtMinutes(records.at(-1).actual)}</li><li>最快：${fmtMinutes(times[0])}</li><li>最慢：${fmtMinutes(times.at(-1))}</li><li>平均：${fmtMinutes(avg)}</li><li>中位数：${fmtMinutes(mid)}</li><li>常规建议：${fmtMinutes(regular)}</li><li>宽松建议：${fmtMinutes(regular + 10)}</li></ul></article>`;
  }).join("");
  const parts = [["化妆",45],["选衣服",20],["收拾",15],["去程",40],["拍摄",120],["回程",40],["卸妆恢复",45]];
  $("shootBreakdown").innerHTML = `${parts.map(([n,m]) => `<div><span>${n}</span><strong>${fmtMinutes(m)}</strong></div>`).join("")}<p class="total">现场时间 2小时，完整占用时间 ${fmtMinutes(parts.reduce((s,p)=>s+p[1],0))}。</p>`;
}

function renderMonthly() {
  $("monthFilter").innerHTML = ["全部", ...DIRECTIONS].map((d) => `<option>${d}</option>`).join("");
  const filter = $("monthFilter").value || "全部";
  const monthItems = state.completed.filter((t) => t.date.startsWith(currentMonth()) && (filter === "全部" || t.direction === filter));
  const totalEstimate = monthItems.reduce((s, t) => s + Number(t.estimate), 0);
  const totalActual = monthItems.reduce((s, t) => s + Number(t.actual), 0);
  $("monthlyStats").innerHTML = [["完成事项", `${monthItems.length}件`], ["预计总时间", fmtHours(totalEstimate)], ["实际总时间", fmtHours(totalActual)], ["平均偏差", `${Math.round(((totalActual - totalEstimate) / (totalEstimate || 1)) * 100)}%`]].map(([a,b]) => `<div class="stat"><span>${a}</span><strong>${b}</strong></div>`).join("");
  $("monthlyRows").innerHTML = monthItems.map((t) => `<tr><td>${t.date}</td><td><b>${t.name}</b></td><td><span class="pill">${t.direction}</span></td><td>${fmtHours(t.estimate)}</td><td>${fmtHours(t.actual)}</td></tr>`).join("");
  const days = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  $("monthCalendar").innerHTML = Array.from({ length: days }, (_, i) => { const day = String(i + 1).padStart(2, "0"); const count = state.completed.filter((t) => t.date === `${currentMonth()}-${day}`).length; return `<div class="day ${count ? "done" : ""}"><b>${i + 1}</b><span>${count ? `完成${count}件` : ""}</span></div>`; }).join("");
  $("monthReview").innerHTML = ["本月真正推进了什么？", "哪个方向投入过多？", "哪个方向长期被忽略？", "下个月继续什么？", "下个月暂停什么？"].map((q) => `<div class="review-note"><b>${q}</b><span>根据完成记录，在月底手动填写判断。</span></div>`).join("");
}

function renderCareer() {
  $("careerBoards").innerHTML = CORE_DIRECTIONS.map((direction) => {
    const board = state.career[direction];
    const done = state.completed.filter((t) => t.direction === direction && t.date.startsWith(currentMonth()));
    const hours = done.reduce((s, t) => s + Number(t.actual), 0);
    return `<article class="card career-card"><h2>${direction}｜7月进展</h2><h3>本月目标</h3><ul>${board.goals.map((g) => `<li>${g}</li>`).join("")}</ul><h3>当前项目</h3>${board.projects.map((p) => `<div class="project-line"><b>${p.name}</b><span>${p.status}</span><p>下一步：${p.next}</p></div>`).join("")}<h3>本月完成记录</h3><p class="helper">已完成任务：${done.length}项 · 实际投入：${fmtHours(hours)} · 下一个关键节点：${board.projects[0]?.next || "等待设置"}</p></article>`;
  }).join("");
}

function bindEvents() {
  $("dailyCapacity").addEventListener("input", (e) => { state.dailyCapacity = Number(e.target.value); saveState(); renderToday(); });
  $("notDoing").addEventListener("input", (e) => { state.notDoing = e.target.value; saveState(); });
  document.body.addEventListener("change", (e) => {
    const i = e.target.dataset.task; if (i === undefined) return;
    const field = e.target.dataset.field;
    state.todayTasks[i][field] = e.target.type === "checkbox" ? e.target.checked : (e.target.type === "number" ? Number(e.target.value) : e.target.value);
    saveState();
    renderAll();
  });
  document.body.addEventListener("click", (e) => {
    const i = e.target.dataset.complete; if (i === undefined) return;
    const task = state.todayTasks[i]; task.status = "已完成";
    state.completed = [{ id: uid(), date: todayISO(), name: task.name, direction: task.direction, estimate: task.estimate, actual: task.actual || task.estimate }, ...state.completed]; saveState(); renderAll();
  });
  $("saveReview").addEventListener("click", () => { state.review = Object.fromEntries(["reviewDone","reviewOvertime","reviewReason","reviewBlocker","reviewEffective","reviewPraise","reviewTomorrow"].map((id) => [id, $(id).value])); saveState(); alert("今日复盘已保存。"); });
  $("timeRecordForm").addEventListener("submit", (e) => { e.preventDefault(); state.timeRecords.push({ id: uid(), date: todayISO(), name: $("recordName").value, estimate: Number($("recordEstimate").value), actual: Number($("recordActual").value), interrupted: $("recordInterrupted").value, reason: $("recordReason").value, suggestion: Number($("recordSuggestion").value || $("recordActual").value) }); saveState(); e.target.reset(); renderAll(); });
  $("resetDemo").addEventListener("click", () => { localStorage.removeItem(STORAGE_KEY); state = structuredClone(demoState); renderAll(); });
  $("monthFilter").addEventListener("change", renderMonthly);
}

function renderAll() { renderToday(); renderTimeLibrary(); renderMonthly(); renderCareer(); }
initNavigation(); bindEvents(); renderAll();
