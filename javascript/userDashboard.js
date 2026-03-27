window.addEventListener("DOMContentLoaded", loadDashboard);
async function loadDashboard() {
    const { data } = await supabaseClient.auth.getSession();
    console.log(data);
    const {data : {session}} = await supabaseClient.auth.getSession() ;
    if(!session){
        alert("Login first") ;
        console.log(session) ;
    }
    const token = data.session.access_token;
    const userMeta = session.user.user_metadata;
    const name = userMeta.full_name || userMeta.email;

document.getElementById("name").innerText = name;
    console.log()
  const res = await fetch("https://pbcnboxtlrymczzpppyl.supabase.co/functions/v1/get-complaints", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify({ role: "STUDENT" })
  });

  const result = await res.json();

  if (!result.success) {
    alert(result.error);
    return;
  }

  const complaints = result.data;
  console.log(result.data);
  console.log(result);

  updateCards(complaints);
  updateTable(complaints);
  loadLabsAndDevices();
  loadMyIssues(complaints);
  generateCharts(complaints);
  loadProfile(complaints);
}
function updateCards(complaints) {
  const total = complaints.length;
  console.log(total);

  const pending = complaints.filter(c => c.status !== "RESOLVED").length;

  // Set values
  document.getElementById("totalComplaints").innerText = total;
  document.getElementById("pendingComplaints").innerText = pending;
}
function updateTable(complaints) {
  const tbody = document.getElementById("tbody"); // ✅ FIXED
  tbody.innerHTML = "";

  if (!complaints || complaints.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center py-6 text-slate-400">
          No issues found
        </td>
      </tr>
    `;
    return;
  }

  complaints.slice(0, 3).forEach(c => {
    const row = `
      <tr>
        <td class="px-6 py-4">${c.labs?.lab_name || "N/A"}</td>
        <td class="px-6 py-4">${c.title || "-"}</td>
        <td class="px-6 py-4 text-center">
          ${getStatusBadge(c.status)}
        </td>
        <td class="px-6 py-4 text-right">
          ${new Date(c.created_at).toLocaleDateString()}
        </td>
      </tr>
    `;
    tbody.innerHTML += row;
  });
}
function getStatusBadge(status) {
  if (status === "PENDING") {
    return `<span class="px-3 py-1 text-[10px] font-bold rounded-full bg-yellow-100 text-yellow-600 px-2 py-1 rounded">Pending</span>`;
  }
  if (status === "IN_PROGRESS") {
    return `<span class="px-3 py-1 text-[10px] font-bold rounded-full bg-blue-100 text-blue-600 px-2 py-1 rounded">In Progress</span>`;
  }
  if (status === "RESOLVED") {
    return `<span class="px-3 py-1 text-[10px] font-bold rounded-full bg-green-100 text-green-600 px-2 py-1 rounded">Resolved</span>`;
  }
  if (status === "OPEN") {
    return `<span class="px-3 py-1 text-[10px] font-bold rounded-full bg-red-100 text-red-600 px-2 py-1 rounded">Open</span>`;
  }
  if (status === "ASSIGNED") {
    return `<span class="px-3 py-1 text-[10px] font-bold rounded-full bg-blue-100 text-blue-600 px-2 py-1 rounded">Assigned</span>`;
  }
  if (status === "CANCELLED") {
    return `<span class="px-3 py-1 text-[10px] font-bold rounded-full bg-red-100 text-red-600 px-2 py-1 rounded">Cancelled</span>`;
  }
  if (status === "ON_HOLD") {
    return `<span class="px-3 py-1 text-[10px] font-bold rounded-full bg-yellow-100 text-yellow-600 px-2 py-1 rounded">On Hold</span>`;
  }
  return status;
}

function gotoComplaints(){
  window.location.href = "studentComplaints.html" ;
}

// Set active sidebar link
function setActive(clickedLink) {
    // Remove active class from all sidebar links
    const links = document.querySelectorAll(".sidebar-link");
    
    links.forEach(link => {
        link.classList.remove("sidebar-link-active");
        link.classList.add("sidebar-link-inactive");
    });

    // Add active class to clicked link
    clickedLink.classList.remove("sidebar-link-inactive");
    clickedLink.classList.add("sidebar-link-active");
}


// Show selected tab content
function showTab(tabId) {
    // Hide all tab contents
    const tabs = document.querySelectorAll(".tab");
    
    tabs.forEach(tab => {
        tab.classList.add("hidden");
    });

    // Show selected tab
    const activeTab = document.getElementById(tabId);
    if (activeTab) {
        activeTab.classList.remove("hidden");
    }
}

async function submitComplaint() {
  try {
    const { data } = await supabaseClient.auth.getSession();
    const token = data.session.access_token;

    // 🔹 1. Get user profile (BEST WAY)
    const profileRes = await fetch("https://pbcnboxtlrymczzpppyl.supabase.co/functions/v1/get-user-profile", {
      method: "GET",
      headers: {
        "Authorization": "Bearer " + token
      }
    });

    const profileData = await profileRes.json();

    if (!profileData || profileData.role !== "STUDENT") {
      alert("Invalid user role");
      return;
    }

    const student = profileData.profile;
    window.profileStudent = profileData.profile;

    // 🔹 2. Build payload
    const payload = {
      student_id: student.id,
      organization_id: student.organization_id,
      lab_id: document.getElementById("lab").value,
      device_id: document.getElementById("device").value || null,
      title: document.getElementById("title").value,
      description: document.getElementById("description").value,
      priority: document.getElementById("priority").value,
      image_paths: []
    };

    // 🔹 3. Validation
    if (!payload.lab_id || !payload.title || !payload.description) {
      alert("Please fill required fields");
      return;
    }

    // 🔹 4. Call Report Issue API
    const res = await fetch("https://pbcnboxtlrymczzpppyl.supabase.co/functions/v1/raise-complaint", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify(payload)
    });

    const result = await res.json();

    // 🔹 5. Handle Response
    if (result.success) {
      alert("✅ Complaint submitted successfully!");

      // Reset form
      document.getElementById("title").value = "";
      document.getElementById("description").value = "";

    } else {
      alert("❌ " + result.error);
    }

  } catch (err) {
    console.error(err);
    alert("Something went wrong");
  }
}

async function loadLabsAndDevices() {
  try {
    const { data } = await supabaseClient.auth.getSession();
    const token = data.session.access_token;

    const res = await fetch("https://pbcnboxtlrymczzpppyl.supabase.co/functions/v1/get-lab-architecture", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({ role: "STUDENT" })
    });

    const result = await res.json();

    if (!result.success) {
      console.error(result.error);
      return;
    }

    const labs = result.data.labs;
    console.log("Labs : ");
    console.log(labs);
    const activeLabs = labs ? labs.length : 0;
    document.getElementById("activeLabs").innerHTML = activeLabs;

    populateLabDropdown(labs);

  } catch (err) {
    console.error(err);
  }
}

let allLabs = [];

function populateLabDropdown(labs) {
  allLabs = labs; // store globally

  const labSelect = document.getElementById("lab");
  labSelect.innerHTML = `<option value="">Select Lab</option>`;

  labs.forEach(lab => {
    labSelect.innerHTML += `
      <option value="${lab.id}">
        ${lab.lab_name}
      </option>
    `;
  });
}

function loadDevices() {
  const labId = document.getElementById("lab").value;
  const deviceSelect = document.getElementById("device");

  deviceSelect.innerHTML = `<option value="">Select Device</option>`;

  const selectedLab = allLabs.find(lab => lab.id === labId);

  if (!selectedLab || !selectedLab.devices) return;

  selectedLab.devices.forEach(device => {
    deviceSelect.innerHTML += `
      <option value="${device.id}">
        ${device.device_name}
      </option>
    `;
  });
}
function loadMyIssues(complaints){
  updateIssueCards(complaints);
  renderIssuesTable(complaints);
}

function updateIssueCards(complaints) {
  const total = complaints.length;

  const pending = complaints.filter(c => c.status !== "RESOLVED").length;
  const progress = complaints.filter(c => c.status === "IN_PROGRESS" || c.status === "ASSIGNED").length;
  const resolved = complaints.filter(c => c.status === "RESOLVED").length;

  document.getElementById("totalIssues").innerText = total;
  document.getElementById("pendingIssues").innerText = pending;
  document.getElementById("progressIssues").innerText = progress;
  document.getElementById("resolvedIssues").innerText = resolved;
}

function renderIssuesTable(complaints) {
  const table = document.getElementById("issuesTable");
  table.innerHTML = "";

  if (!complaints || complaints.length === 0) {
    table.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-6 text-slate-400">
          No issues found
        </td>
      </tr>
    `;
    return;
  }

  complaints.slice(0, 5).forEach(c => {
    table.innerHTML += `
      <tr class="border-b">
        <td class="px-6 py-4">${c.labs?.lab_name || "N/A"}</td>
        <td class="px-6 py-4">${c.title}</td>
        <td class="px-6 py-4">${getStatusBadge(c.status)}</td>
        <td class="px-6 py-4">${getPriorityBadge(c.priority)}</td>
        <td class="px-6 py-4">${new Date(c.created_at).toLocaleDateString()}</td>
      </tr>
    `;
  });
}
function getStatusBadge(status) {
  if (status === "PENDING") {
    return `<span class="px-3 py-1 text-[10px] font-bold rounded-full bg-yellow-100 text-yellow-600 px-2 py-1 rounded">Pending</span>`;
  }
  if (status === "IN_PROGRESS") {
    return `<span class="px-3 py-1 text-[10px] font-bold rounded-full bg-blue-100 text-blue-600 px-2 py-1 rounded">In Progress</span>`;
  }
  if (status === "RESOLVED") {
    return `<span class="px-3 py-1 text-[10px] font-bold rounded-full bg-green-100 text-green-600 px-2 py-1 rounded">Resolved</span>`;
  }
  if (status === "OPEN") {
    return `<span class="px-3 py-1 text-[10px] font-bold rounded-full bg-red-100 text-red-600 px-2 py-1 rounded">Open</span>`;
  }
  if (status === "ASSIGNED") {
    return `<span class="px-3 py-1 text-[10px] font-bold rounded-full bg-blue-100 text-blue-600 px-2 py-1 rounded">Assigned</span>`;
  }
  if (status === "CANCELLED") {
    return `<span class="px-3 py-1 text-[10px] font-bold rounded-full bg-red-100 text-red-600 px-2 py-1 rounded">Cancelled</span>`;
  }
  if (status === "ON_HOLD") {
    return `<span class="px-3 py-1 text-[10px] font-bold rounded-full bg-yellow-100 text-yellow-600 px-2 py-1 rounded">On Hold</span>`;
  }
  return status;
}

function getPriorityBadge(priority) {

  if (priority === "MEDIUM") {
    return `<span class="px-3 py-1 text-[10px] font-bold rounded-full bg-blue-100 text-blue-600 px-2 py-1 rounded">MEDIUM</span>`;
  }
  if (priority === "LOW") {
    return `<span class="px-3 py-1 text-[10px] font-bold rounded-full bg-green-100 text-green-600 px-2 py-1 rounded">LOW</span>`;
  }
  if (priority === "HIGH") {
    return `<span class="px-3 py-1 text-[10px] font-bold rounded-full bg-red-100 text-red-600 px-2 py-1 rounded">HIGH</span>`;
  }
}

function generateCharts(complaints) {

  let statusCount = { PENDING: 0, IN_PROGRESS: 0, RESOLVED: 0 };
  let priorityCount = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  let timeline = {};

  complaints.forEach(c => {

    // Status
    statusCount[c.status] = (statusCount[c.status] || 0) + 1;

    // Priority
    priorityCount[c.priority] = (priorityCount[c.priority] || 0) + 1;

    // Timeline (date-wise)
    let date = new Date(c.created_at).toLocaleDateString();
    timeline[date] = (timeline[date] || 0) + 1;
  });

  Chart.getChart("statusChart")?.destroy();
Chart.getChart("priorityChart")?.destroy();
Chart.getChart("timelineChart")?.destroy();

  renderStatusChart(statusCount);
  renderPriorityChart(priorityCount);
  renderTimelineChart(timeline);
}
function renderStatusChart(data) {
  new Chart(document.getElementById("statusChart"), {
    type: "pie",
    data: {
      labels: Object.keys(data),
      datasets: [{
        data: Object.values(data),
        backgroundColor: ["#facc15", "#3b82f6", "#22c55e","#ef4444","#f97316","#0ea5e9"]
      }]
    }
  });
}
function renderPriorityChart(data) {
  new Chart(document.getElementById("priorityChart"), {
    type: "bar",
    data: {
      labels: Object.keys(data),
      datasets: [{
        label: "Complaints",
        data: Object.values(data),
        backgroundColor: ["#ef4444", "#f97316", "#94a3b8"]
      }]
    }
  });
}
function renderTimelineChart(data) {
  new Chart(document.getElementById("timelineChart"), {
    type: "line",
    data: {
      labels: Object.keys(data),
      datasets: [{
        label: "Complaints",
        data: Object.values(data),
        borderColor: "#2563eb",
        fill: false,
        tension: 0.3
      }]
    }
  });
}

async function loadProfile(complaints) {
  try {
    const { data } = await supabaseClient.auth.getSession();
    const token = data.session.access_token;

    // Fetch Profile
    const profileRes = await fetch("https://pbcnboxtlrymczzpppyl.supabase.co/functions/v1/get-user-profile", {
      headers: { "Authorization": "Bearer " + token }
    });

    const profileData = await profileRes.json();

    const profile = profileData.profile;

    document.getElementById("p_name").innerText = profile.name;
    document.getElementById("p_email").innerText = profileData.email;
    document.getElementById("p_roll").innerText = profile.roll_number;
    document.getElementById("p_department").innerText = profile.department_name?.name || "-";
    document.getElementById("p_org").innerText = profile.organization_name?.name || "-";

    document.getElementById("avatar").innerText = profile.name.charAt(0).toUpperCase();

    // Fetch Complaints
    // const compRes = await fetch("https://pbcnboxtlrymczzpppyl.supabase.co/functions/v1/get-complaints", {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //     "Authorization": "Bearer " + token
    //   },
    //   body: JSON.stringify({ role: "STUDENT" })
    // });

    // const compData = await compRes.json();

    generateProfileStats(complaints);

  } catch (err) {
    console.error(err);
  }
}

function generateProfileStats(complaints) {

  let total = complaints.length;
  let resolved = complaints.filter(c => c.status === "RESOLVED").length;
  let pending = complaints.filter(c => c.status === "PENDING").length;
  let high = complaints.filter(c => c.priority === "HIGH").length;

  document.getElementById("stat_total").innerText = total;
  document.getElementById("stat_resolved").innerText = resolved;
  document.getElementById("stat_pending").innerText = pending;
  document.getElementById("stat_high").innerText = high;

  // 🔥 Smart Insights
  document.getElementById("insight1").innerText =
    total === 0 ? "You haven't raised any complaints yet."
    : `You have raised ${total} complaints.`;

  document.getElementById("insight2").innerText =
    resolved > pending ? "Good! Most of your issues are resolved."
    : "You have pending issues that need attention.";

  document.getElementById("insight3").innerText =
    high > 0 ? `${high} high priority issues require urgent action.`
    : "No high priority issues.";
}

async function logoutUser() {
  const { error } = await window.supabaseClient.auth.signOut();

  if (error) {
    console.error("Logout failed:", error.message);
    alert("Failed to log out. Try again.");
  } else {
    console.log("✅ User logged out successfully!");
    // Optionally redirect to login page
    window.location.href = "/index.html";
  }
}