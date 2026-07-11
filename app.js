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
