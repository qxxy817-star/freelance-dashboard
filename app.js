const DIRECTIONS = ["自媒体", "模特", "网店"];
const STATUSES = ["进行中", "计划中", "已完成", "暂停"];
const ENERGIES = ["低", "中", "高"];
const STORAGE_KEY = "freelance-dashboard-projects-v1";
const CAPACITY_KEY = "freelance-dashboard-weekly-capacity-v1";

const demoProjects = [
  { id: crypto.randomUUID(), name: "小红书账号起号", direction: "自媒体", status: "进行中", plannedHours: 10, actualHours: 7.5, expense: 299, income: 0, energy: "高", deadline: "2026-07-18", nextAction: "完成 5 条选题脚本并拍摄 2 条" },
  { id: crypto.randomUUID(), name: "夏季穿搭试拍", direction: "模特", status: "进行中", plannedHours: 6, actualHours: 4, expense: 180, income: 900, energy: "中", deadline: "2026-07-15", nextAction: "确认摄影棚时间和服装清单" },
  { id: crypto.randomUUID(), name: "手作饰品上新", direction: "网店", status: "计划中", plannedHours: 12, actualHours: 3, expense: 520, income: 260, energy: "中", deadline: "2026-07-25", nextAction: "拍摄主图并写 10 个商品标题" },
];

let projects = loadProjects();
let editingId = null;

const $ = (id) => document.getElementById(id);
const money = (value) => `¥${Number(value || 0).toLocaleString("zh-CN", { maximumFractionDigits: 0 })}`;
const hours = (value) => `${Number(value || 0).toFixed(1).replace(".0", "")} 小时`;

function loadProjects() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return demoProjects;
  try { return JSON.parse(saved); } catch { return demoProjects; }
}

function saveProjects() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function fillSelect(id, options) {
  $(id).innerHTML = options.map((item) => `<option value="${item}">${item}</option>`).join("");
}

function getWeekRange(date = new Date()) {
  const start = new Date(date);
  const day = start.getDay() || 7;
  start.setDate(start.getDate() - day + 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return [start, end];
}

function isInCurrentMonth(dateText) {
  const date = new Date(`${dateText}T00:00:00`);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function isInCurrentWeek(dateText) {
  const date = new Date(`${dateText}T00:00:00`);
  const [start, end] = getWeekRange();
  return date >= start && date <= end;
}

function renderDashboard() {
  const weeklyCapacity = Number($("weeklyCapacity").value || 0);
  const weekProjects = projects.filter((project) => isInCurrentWeek(project.deadline));
  const totalPlannedWeek = weekProjects.reduce((sum, project) => sum + Number(project.plannedHours), 0);

  $("directionTimeCards").innerHTML = DIRECTIONS.map((direction) => {
    const time = weekProjects.filter((p) => p.direction === direction).reduce((sum, p) => sum + Number(p.plannedHours), 0);
    const percent = weeklyCapacity ? Math.min((time / weeklyCapacity) * 100, 100) : 0;
    return `<div class="mini-card"><span>${direction}</span><strong>${hours(time)}</strong><div class="progress"><span style="width:${percent}%"></span></div></div>`;
  }).join("");

  const overCapacity = totalPlannedWeek > weeklyCapacity;
  $("weekPlanBadge").textContent = overCapacity ? "已超出" : "可执行";
  $("weekPlanBadge").classList.toggle("warn", overCapacity);
  $("weekPlanText").textContent = `本周计划 ${hours(totalPlannedWeek)}，可用 ${hours(weeklyCapacity)}，${overCapacity ? "建议删减或顺延部分任务。" : "目前没有超出可用时间。"}`;

  const monthProjects = projects.filter((project) => isInCurrentMonth(project.deadline));
  const monthIncome = monthProjects.reduce((sum, project) => sum + Number(project.income), 0);
  const monthExpense = monthProjects.reduce((sum, project) => sum + Number(project.expense), 0);
  const monthNet = monthIncome - monthExpense;
  $("monthIncome").textContent = money(monthIncome);
  $("monthExpense").textContent = money(monthExpense);
  $("monthNet").textContent = money(monthNet);
  $("monthNet").className = monthNet >= 0 ? "positive" : "negative";

  const active = projects.filter((project) => project.status === "进行中").sort((a, b) => a.deadline.localeCompare(b.deadline));
  $("activeProjects").innerHTML = active.length ? active.map((project) => `<div class="active-item"><b>${project.name}</b><span>${project.direction} · 截止 ${project.deadline} · ${project.nextAction}</span></div>`).join("") : "<p class='helper'>暂无进行中的项目。</p>";

  $("roiCards").innerHTML = DIRECTIONS.map((direction) => {
    const list = projects.filter((p) => p.direction === direction);
    const income = list.reduce((sum, p) => sum + Number(p.income), 0);
    const expense = list.reduce((sum, p) => sum + Number(p.expense), 0);
    const time = list.reduce((sum, p) => sum + Number(p.actualHours), 0);
    const net = income - expense;
    return `<div class="mini-card"><span>${direction}</span><strong class="${net >= 0 ? "positive" : "negative"}">${money(net)}</strong><p class="helper">收入 ${money(income)} / 投入 ${money(expense)} / 实际 ${hours(time)}</p></div>`;
  }).join("");

  renderWeeklyReview(weekProjects, totalPlannedWeek, weeklyCapacity);
}

function renderWeeklyReview(weekProjects, totalPlannedWeek, weeklyCapacity) {
  const completed = weekProjects.filter((project) => project.status === "已完成").length;
  const actualTime = weekProjects.reduce((sum, project) => sum + Number(project.actualHours), 0);
  const net = weekProjects.reduce((sum, project) => sum + Number(project.income) - Number(project.expense), 0);
  const usage = weeklyCapacity ? Math.round((totalPlannedWeek / weeklyCapacity) * 100) : 0;
  const bestDirection = DIRECTIONS.map((direction) => {
    const list = weekProjects.filter((project) => project.direction === direction);
    return { direction, net: list.reduce((sum, project) => sum + Number(project.income) - Number(project.expense), 0) };
  }).sort((a, b) => b.net - a.net)[0];
  const urgentProject = weekProjects
    .filter((project) => project.status !== "已完成")
    .sort((a, b) => a.deadline.localeCompare(b.deadline))[0];

  $("reviewBadge").textContent = weekProjects.length ? `${weekProjects.length} 个本周项目` : "暂无本周项目";
  $("weeklyReviewCards").innerHTML = [
    ["完成数", `${completed}/${weekProjects.length}`, `本周计划内项目完成 ${completed} 个`],
    ["实际投入", hours(actualTime), `计划 ${hours(totalPlannedWeek)} · 占用 ${usage}%`],
    ["本周净收入", money(net), bestDirection ? `${bestDirection.direction} 当前贡献最高` : "等待新增项目"],
  ].map(([label, value, helper]) => `<div class="mini-card"><span>${label}</span><strong class="${label === "本周净收入" ? (net >= 0 ? "positive" : "negative") : ""}">${value}</strong><p class="helper">${helper}</p></div>`).join("");

  $("weeklyReviewNotes").innerHTML = [
    ["继续做", bestDirection && bestDirection.net > 0 ? `优先放大「${bestDirection.direction}」中已验证有回款的动作。` : "保留能带来曝光、作品或现金流的最小行动。"],
    ["要调整", usage > 100 ? "本周排期已超载，至少顺延一个低收益任务。" : "当前排期可控，可把空余时间留给高杠杆任务。"],
    ["下周起手", urgentProject ? `先推进「${urgentProject.name}」：${urgentProject.nextAction}` : "选择一个方向设置明确截止日期和下一步行动。"],
  ].map(([title, text]) => `<div class="review-note"><b>${title}</b><span>${text}</span></div>`).join("");
}

function renderProjects() {
  $("projectRows").innerHTML = projects.map((project) => `<tr><td><b>${project.name}</b></td><td><span class="pill">${project.direction}</span></td><td>${project.status}</td><td>预计 ${hours(project.plannedHours)}<br>实际 ${hours(project.actualHours)}</td><td>投 ${money(project.expense)}<br>收 ${money(project.income)}</td><td>${project.energy}</td><td>${project.deadline}</td><td>${project.nextAction}</td><td><div class="actions"><button class="edit" onclick="editProject('${project.id}')">编辑</button><button class="delete" onclick="deleteProject('${project.id}')">删除</button></div></td></tr>`).join("");
}

function render() { renderDashboard(); renderProjects(); }

function readForm() {
  return { id: editingId || crypto.randomUUID(), name: $("name").value.trim(), direction: $("direction").value, status: $("status").value, plannedHours: Number($("plannedHours").value), actualHours: Number($("actualHours").value), expense: Number($("expense").value), income: Number($("income").value), energy: $("energy").value, deadline: $("deadline").value, nextAction: $("nextAction").value.trim() };
}

function resetForm() {
  editingId = null;
  $("projectForm").reset();
  $("formTitle").textContent = "新增项目";
  $("cancelEdit").classList.add("hidden");
}

window.editProject = (id) => {
  const project = projects.find((item) => item.id === id);
  if (!project) return;
  editingId = id;
  Object.entries(project).forEach(([key, value]) => { if ($(key)) $(key).value = value; });
  $("formTitle").textContent = "编辑项目";
  $("cancelEdit").classList.remove("hidden");
  $("projectForm").scrollIntoView({ behavior: "smooth" });
};

window.deleteProject = (id) => {
  if (!confirm("确定删除这个项目吗？")) return;
  projects = projects.filter((project) => project.id !== id);
  saveProjects();
  render();
};

fillSelect("direction", DIRECTIONS);
fillSelect("status", STATUSES);
fillSelect("energy", ENERGIES);
$("weeklyCapacity").value = localStorage.getItem(CAPACITY_KEY) || 30;
$("weeklyCapacity").addEventListener("input", () => { localStorage.setItem(CAPACITY_KEY, $("weeklyCapacity").value); renderDashboard(); });
$("projectForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const project = readForm();
  projects = editingId ? projects.map((item) => item.id === editingId ? project : item) : [project, ...projects];
  saveProjects();
  resetForm();
  render();
});
$("cancelEdit").addEventListener("click", resetForm);
$("resetDemo").addEventListener("click", () => { projects = demoProjects.map((project) => ({ ...project, id: crypto.randomUUID() })); saveProjects(); resetForm(); render(); });
render();

const TIME_STORAGE_KEY = "freelance-dashboard-time-v1";
const MONTH_PLAN_KEY = "freelance-dashboard-month-plans-v1";
const TASK_TYPES = ["创作", "客户", "运营", "学习", "行政", "恢复"];
const DAY_STATES = ["专注", "正常", "疲惫", "焦虑", "被打断", "承诺过量"];

const demoMonthPlans = [
  { id: crypto.randomUUID(), month: "2026-07", direction: "自媒体", goal: "完成 12 条短视频并沉淀 3 个可复用选题模板", action: "每天完成 1 个选题拆解或 30 分钟拍摄" },
  { id: crypto.randomUUID(), month: "2026-07", direction: "网店", goal: "完成手作饰品上新并验证 2 个高转化标题", action: "每天优化 1 个商品页或联系 2 位种草达人" },
];

const demoDailyReviews = [
  { id: crypto.randomUUID(), date: "2026-07-08", state: "专注", completed: 2, tasks: [
    { name: "拆 3 个小红书爆款选题", type: "创作", estimate: 1.5, actual: 2 },
    { name: "确认夏季穿搭试拍清单", type: "客户", estimate: 1, actual: 1 },
    { name: "优化 2 个商品标题", type: "运营", estimate: 1, actual: 1.5 },
  ], deep: 3, switch: 1, anxiety: .5, note: "创作任务比预期慢，但专注时间足够。" },
  { id: crypto.randomUUID(), date: "2026-07-09", state: "承诺过量", completed: 1, tasks: [
    { name: "拍摄 2 条短视频", type: "创作", estimate: 2, actual: 3.5 },
    { name: "回复合作询盘", type: "客户", estimate: .5, actual: 1.5 },
    { name: "整理发货问题", type: "行政", estimate: .5, actual: 1 },
  ], deep: 2, switch: 2, anxiety: 1.5, note: "临时答应太多回复和杂事，导致拍摄被切碎。" },
];

let monthPlans = loadJson(MONTH_PLAN_KEY, demoMonthPlans);
let dailyReviews = loadJson(TIME_STORAGE_KEY, demoDailyReviews);

function loadJson(key, fallback) {
  const saved = localStorage.getItem(key);
  if (!saved) return fallback;
  try { return JSON.parse(saved); } catch { return fallback; }
}

function saveTimeData() {
  localStorage.setItem(MONTH_PLAN_KEY, JSON.stringify(monthPlans));
  localStorage.setItem(TIME_STORAGE_KEY, JSON.stringify(dailyReviews));
}

function formatPercent(value) {
  return `${Math.round(value || 0)}%`;
}

function setCurrentDateInputs() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  if ($("planMonth")) $("planMonth").value = `${yyyy}-${mm}`;
  if ($("reviewDate")) $("reviewDate").value = `${yyyy}-${mm}-${dd}`;
}

function taskBiasByType() {
  return TASK_TYPES.map((type) => {
    const tasks = dailyReviews.flatMap((review) => review.tasks).filter((task) => task.type === type);
    const estimated = tasks.reduce((sum, task) => sum + Number(task.estimate), 0);
    const actual = tasks.reduce((sum, task) => sum + Number(task.actual), 0);
    return { type, tasks: tasks.length, estimated, actual, bias: actual - estimated };
  }).filter((item) => item.tasks > 0).sort((a, b) => b.bias - a.bias);
}

function renderTimeDashboard() {
  const days = dailyReviews.length || 1;
  const avgCompleted = dailyReviews.reduce((sum, review) => sum + Number(review.completed), 0) / days;
  const highCommitDays = dailyReviews.filter((review) => review.state === "承诺过量" || review.state === "焦虑" || review.tasks.reduce((sum, task) => sum + Number(task.estimate), 0) > 5).length;
  const bias = taskBiasByType()[0];
  const deep = dailyReviews.reduce((sum, review) => sum + Number(review.deep), 0);
  const switching = dailyReviews.reduce((sum, review) => sum + Number(review.switch), 0);
  const anxiety = dailyReviews.reduce((sum, review) => sum + Number(review.anxiety), 0);
  const flowTotal = deep + switching + anxiety || 1;
  const deepPercent = (deep / flowTotal) * 100;

  $("realCapacity").textContent = `${avgCompleted.toFixed(1).replace(".0", "")} 件/天`;
  $("realCapacityHint").textContent = `基于 ${dailyReviews.length} 天复盘；如果每天承诺 3 件，实际平均完成 ${avgCompleted.toFixed(1)} 件。`;
  $("underestimatedType").textContent = bias ? bias.type : "等待数据";
  $("underestimatedHint").textContent = bias ? `累计低估 ${hours(Math.max(bias.bias, 0))}，实际/预计 ${hours(bias.actual)} / ${hours(bias.estimated)}。` : "录入任务类型与预计/实际耗时后计算。";
  $("timeFlow").textContent = `推进 ${formatPercent(deepPercent)}`;
  $("timeFlowHint").textContent = `切换 ${formatPercent((switching / flowTotal) * 100)} · 焦虑 ${formatPercent((anxiety / flowTotal) * 100)}`;

  renderMonthPlans();
  renderDailyReviews();
  renderTimeInsights(avgCompleted, highCommitDays, bias, deep, switching, anxiety);
}

function renderMonthPlans() {
  const currentMonth = $("planMonth")?.value || new Date().toISOString().slice(0, 7);
  const actionText = dailyReviews.flatMap((review) => review.tasks.map((task) => task.name)).join(" ");
  $("monthPlanList").innerHTML = monthPlans.length ? monthPlans.map((plan) => {
    const landed = actionText.includes(plan.action.slice(0, 4)) || dailyReviews.some((review) => review.date.startsWith(plan.month));
    return `<div class="active-item"><b>${plan.month} · ${plan.direction}</b><span>${plan.goal}</span><span>每日行动：${plan.action}</span><span class="pill">${landed ? "已有每日记录" : "还未落到复盘"}</span></div>`;
  }).join("") : `<p class="helper">暂无月度计划。先保存 ${currentMonth} 的目标。</p>`;
}

function renderTimeInsights(avgCompleted, highCommitDays, bias, deep, switching, anxiety) {
  const total = deep + switching + anxiety || 1;
  const switchPercent = (switching / total) * 100;
  const anxietyPercent = (anxiety / total) * 100;
  $("timeInsights").innerHTML = [
    ["真实产能", avgCompleted < 2.4 ? `你的实际完成能力约 ${avgCompleted.toFixed(1)} 件/天，明天最好只承诺 2 件硬任务。` : "当前可以维持每日 3 件重点，但仍要给切换留缓冲。"],
    ["承诺过量", highCommitDays ? `${highCommitDays} 天出现焦虑、承诺过量或估时超过 5 小时；这些状态下需要主动删任务。` : "暂未看到明显承诺过量，可以继续保持小步快跑。"],
    ["低估类型", bias ? `「${bias.type}」最容易被低估，下次同类任务建议把预计时间乘以 ${Math.max(1.2, bias.actual / Math.max(bias.estimated, .1)).toFixed(1)}。` : "继续记录任务类型，系统会找出低估最高的类别。"],
    ["时间结构", switchPercent + anxietyPercent > 45 ? `切换和焦虑占 ${formatPercent(switchPercent + anxietyPercent)}，需要减少并行项目或安排固定回复窗口。` : "推进时间占比较高，适合把月目标继续拆成日行动。"],
  ].map(([title, text]) => `<div class="review-note"><b>${title}</b><span>${text}</span></div>`).join("");
}

function renderDailyReviews() {
  $("dailyReviewRows").innerHTML = dailyReviews.slice().sort((a, b) => b.date.localeCompare(a.date)).map((review) => {
    const estimated = review.tasks.reduce((sum, task) => sum + Number(task.estimate), 0);
    const actual = review.tasks.reduce((sum, task) => sum + Number(task.actual), 0);
    const total = review.deep + review.switch + review.anxiety || 1;
    return `<tr><td><b>${review.date}</b></td><td>${review.state}</td><td><div class="task-list">${review.tasks.map((task) => `<span>${task.name}<br><small>${task.type} · 预计 ${hours(task.estimate)} / 实际 ${hours(task.actual)}</small></span>`).join("")}</div></td><td>${review.completed}/3</td><td class="${actual > estimated ? "negative" : "positive"}">${actual > estimated ? "+" : ""}${hours(actual - estimated)}</td><td>${flowBars(review, total)}</td><td>${review.note}</td><td><div class="actions"><button class="delete" onclick="deleteDailyReview('${review.id}')">删除</button></div></td></tr>`;
  }).join("");
}

function flowBars(review, total) {
  return `<div class="flow-bars">${[["deep", "推进", review.deep], ["switch", "切换", review.switch], ["anxiety", "焦虑", review.anxiety]].map(([cls, label, value]) => `<div class="flow-line ${cls}"><span>${label}</span><div class="progress"><span style="width:${(value / total) * 100}%"></span></div><span>${hours(value).replace(" 小时", "h")}</span></div>`).join("")}</div>`;
}

function readDailyReviewForm() {
  return {
    id: crypto.randomUUID(),
    date: $("reviewDate").value,
    state: $("dayState").value,
    completed: Number($("completedTasks").value),
    tasks: [1, 2, 3].map((index) => ({
      name: $(`task${index}`).value.trim(),
      type: $(`taskType${index}`).value,
      estimate: Number($(`estimate${index}`).value),
      actual: Number($(`actual${index}`).value),
    })),
    deep: Number($("deepHours").value),
    switch: Number($("switchHours").value),
    anxiety: Number($("anxietyHours").value),
    note: $("reviewNote").value.trim(),
  };
}

window.deleteDailyReview = (id) => {
  if (!confirm("确定删除这条每日复盘吗？")) return;
  dailyReviews = dailyReviews.filter((review) => review.id !== id);
  saveTimeData();
  renderTimeDashboard();
};

function initNavigation() {
  const links = document.querySelectorAll("[data-page-link]");
  const pages = document.querySelectorAll("[data-page]");
  const showPage = (page) => {
    pages.forEach((item) => item.classList.toggle("active", item.dataset.page === page));
    links.forEach((item) => item.classList.toggle("active", item.dataset.pageLink === page));
  };
  links.forEach((link) => link.addEventListener("click", (event) => {
    event.preventDefault();
    const page = link.dataset.pageLink;
    history.replaceState(null, "", `#${page}`);
    showPage(page);
  }));
  showPage(location.hash === "#time" ? "time" : "dashboard");
}

function initTimeManagement() {
  fillSelect("planDirection", DIRECTIONS);
  fillSelect("dayState", DAY_STATES);
  [1, 2, 3].forEach((index) => fillSelect(`taskType${index}`, TASK_TYPES));
  setCurrentDateInputs();
  $("completedTasks").value = 2;
  ["estimate1", "estimate2", "estimate3", "actual1", "actual2", "actual3", "deepHours", "switchHours", "anxietyHours"].forEach((id) => { $(id).value = id.includes("switch") || id.includes("anxiety") ? 0.5 : 1; });
  $("monthPlanForm").addEventListener("submit", (event) => {
    event.preventDefault();
    monthPlans = [{ id: crypto.randomUUID(), month: $("planMonth").value, direction: $("planDirection").value, goal: $("monthGoal").value.trim(), action: $("dailyAction").value.trim() }, ...monthPlans];
    saveTimeData();
    $("monthPlanForm").reset();
    setCurrentDateInputs();
    renderTimeDashboard();
  });
  $("dailyReviewForm").addEventListener("submit", (event) => {
    event.preventDefault();
    dailyReviews = [readDailyReviewForm(), ...dailyReviews.filter((review) => review.date !== $("reviewDate").value)];
    saveTimeData();
    $("dailyReviewForm").reset();
    setCurrentDateInputs();
    $("completedTasks").value = 2;
    renderTimeDashboard();
  });
  $("resetTimeDemo").addEventListener("click", () => {
    monthPlans = demoMonthPlans.map((plan) => ({ ...plan, id: crypto.randomUUID() }));
    dailyReviews = demoDailyReviews.map((review) => ({ ...review, id: crypto.randomUUID() }));
    saveTimeData();
    renderTimeDashboard();
  });
  renderTimeDashboard();
}

initNavigation();
initTimeManagement();
