window.addEventListener("DOMContentLoaded", loadTechDashboard);
let labsData = [];
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
    // console.log(sessionStorage.getItem("organizationID"));
    // console.log(sessionStorage.getItem("departmentID"));
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

async function loadTechDashboard() {
  try {
    const { data } = await supabaseClient.auth.getSession();
    const token = data.session?.access_token;
    const userMeta = data.session.user.user_metadata;

const name = userMeta.full_name || userMeta.email;

document.getElementById("userName").innerText = name;

    const res = await fetch("https://pbcnboxtlrymczzpppyl.supabase.co/functions/v1/get-lab-architecture", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({
        role: "TECHNICIAN"
      })
    });

    const result = await res.json();

    if (!result.success) {
      console.error(result.error);
      return;
    }

    const labs = result.data.labs || [];
    labsData = result.data.labs || [] ;
    console.log("Lab Info : ",labs);

    renderTechDashboard(labs);

  } catch (err) {
    console.error(err);
  }
}

function renderTechDashboard(labs) {

  const table = document.getElementById("techLabsTable");
  const empty = document.getElementById("techEmpty");

  table.innerHTML = "";

  if (!labs.length) {
    empty.classList.remove("hidden");
  } else {
    empty.classList.add("hidden");
  }

  let activeLabs = 0;
  let maintenanceLabs = 0;

  labs.slice(0,5).forEach(l => {
    const devices = l.devices ? l.devices.length : 0;

    if (l.is_active) activeLabs++;
    if (l.is_under_maintenance) maintenanceLabs++;

    const row = `
      <tr>
        <td class="px-6 py-4 font-medium">${l.lab_name}</td>
        <td class="px-6 py-4">${l.lab_code || "-"}</td>
        <td class="px-6 py-4">${devices}</td>
        <td class="px-6 py-4 text-center">${getStatus(l)}</td>
      </tr>
    `;
    table.innerHTML += row;
  });

  // Stats
  document.getElementById("stat_labs").innerText = labs.length;
  document.getElementById("stat_activeLabs").innerText = activeLabs;
  document.getElementById("stat_maintenance").innerText = maintenanceLabs;
}

function getStatus(lab) {
  if (lab.is_under_maintenance) {
    return `<span class="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-600">Maintenance</span>`;
  }
  if (lab.is_active) {
    return `<span class="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-600">Active</span>`;
  }
  return `<span class="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-600">Inactive</span>`;
}

async function loadAssignedDevices(labs) {
  try {
    // 🔥 Flatten devices
    let devices = [];
    labs.forEach(l => {
      l.devices?.forEach(d => {
        devices.push({
          ...d,
          lab_name: l.lab_name
        });
      });
    });

    renderDevices(devices);

  } catch (err) {
    console.error(err);
  }
}
function renderDevices(devices) {

  const table = document.getElementById("devicesTable");
  const empty = document.getElementById("devicesEmpty");

  table.innerHTML = "";

  if (!devices.length) {
    empty.classList.remove("hidden");
  } else {
    empty.classList.add("hidden");
  }

  let active = 0;
  let inactive = 0;

  devices.slice(0,5).forEach(d => {
    if (d.is_active) active++;
    else inactive++;

    const row = `
      <tr>
        <td class="px-6 py-4 font-medium">${d.device_name}</td>
        <td class="px-6 py-4">${d.device_code || "-"}</td>
        <td class="px-6 py-4">${d.device_type || "-"}</td>
        <td class="px-6 py-4">${d.lab_name}</td>
        <td class="px-6 py-4 text-center">${getDeviceStatus(d)}</td>
      </tr>
    `;
    table.innerHTML += row;
  });

  // Stats
  document.getElementById("stat_devices").innerText = devices.length;
  document.getElementById("stat_activeDevices").innerText = active;
  document.getElementById("stat_inactiveDevices").innerText = inactive;
}

function getDeviceStatus(d) {
  if (d.is_active) {
    return `<span class="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-600">Active</span>`;
  }
  return `<span class="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-600">Inactive</span>`;
}

function gotoAssignedInfo(){
    loadAssignedDevices(labsData);
}

function viewAllDevices(){
    window.location.href = "viewTechnicianAllDevices.html" ;
}

async function loadRequests() {
  const { data } = await supabaseClient.auth.getSession();
  const token = data.session?.access_token;

  const res = await fetch("https://pbcnboxtlrymczzpppyl.supabase.co/functions/v1/get-complaints", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify({ role: "TECHNICIAN" })
  });

  const result = await res.json();
//   console.log("loadRequest() is running");
console.log(result);

  if (!result.success) {
    console.error(result.error);
    return;
  }

  allRequests = result.data;

  updateCards(allRequests);
  renderTable(allRequests);
}

function updateCards(data) {

  const pending = data.filter(c => c.status === "PENDING" || c.status === "OPEN").length;
  const progress = data.filter(c => c.status === "IN_PROGRESS").length;
  const critical = data.filter(c => c.priority === "HIGH").length;

  document.getElementById("pendingCount").innerText = pending;
  document.getElementById("progressCount").innerText = progress;
  document.getElementById("criticalCount").innerText = critical;
}

function renderTable(data) {
  const table = document.getElementById("requestTable");
  table.innerHTML = "";

  // 🔥 Sort by latest first
  const sorted = data.sort((a, b) =>
    new Date(b.created_at) - new Date(a.created_at)
  );

  sorted.slice(0, 5).forEach(c => {
    table.innerHTML += `
      <tr onclick="openComplaintModal(${JSON.stringify(c).replace(/"/g, '&quot;')})"
      class="table-row border-b cursor-pointer hover:bg-slate-50">
        <td class="px-6 py-4">${c.title}</td>
        <td class="px-6 py-4">${c.labs?.lab_name || "-"}</td>
        <td class="px-6 py-4">${getPriorityBadge(c.priority)}</td>
        <td class="px-6 py-4">${getStatusBadge(c.status)}</td>
        <td class="px-6 py-4 text-right">
          ${new Date(c.created_at).toLocaleDateString()}
        </td>
      </tr>
    `;
  });
}

function getStatusBadge(status) {
  if (status === "PENDING" || status === "OPEN") {
    return `<span class="bg-yellow-100 text-yellow-600 px-2 py-1 rounded text-xs">Pending</span>`;
  }
  if (status === "IN_PROGRESS") {
    return `<span class="bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs">In Progress</span>`;
  }
  if (status === "RESOLVED") {
    return `<span class="bg-green-100 text-green-600 px-2 py-1 rounded text-xs">Resolved</span>`;
  }
  return status;
}

function getPriorityBadge(priority) {
  if (priority === "HIGH") {
    return `<span class="bg-red-100 text-red-600 px-2 py-1 rounded text-xs">HIGH</span>`;
  }
  if (priority === "MEDIUM") {
    return `<span class="bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs">MEDIUM</span>`;
  }
  return `<span class="bg-green-100 text-green-600 px-2 py-1 rounded text-xs">LOW</span>`;
}

function gotoAllRequests() {
  window.location.href = "viewTechnicianAllRequests.html";
}

let selectedComplaint = null;

// 🔹 Open Modal
function openComplaintModal(c) {
  selectedComplaint = c;

  document.getElementById("modalTitle").innerText = c.title;
  document.getElementById("modalLab").innerText = c.labs?.lab_name || "-";
  document.getElementById("modalStatus").innerText = c.status;

  document.getElementById("complaintModal").classList.remove("hidden");
}

// 🔹 Close Modal
function closeModal() {
  document.getElementById("complaintModal").classList.add("hidden");
}

async function uploadImage(file) {
  if (!file) return null;

  const filePath = `complaints/${Date.now()}_${file.name}`;

  const { data, error } = await supabaseClient.storage
    .from("complaints")
    .upload(filePath, file);

  if (error) {
    console.error(error);
    return null;
  }

  return filePath;
}

async function submitUpdate() {
  const status = document.getElementById("modalStatusSelect").value;
  const reason = document.getElementById("modalReason").value;
  const file = document.getElementById("modalImage").files[0];

  try {
    const { data } = await supabaseClient.auth.getSession();
    const token = data.session.access_token;

    let imagePath = null;

    // 🔥 Upload if exists
    if (file) {
      imagePath = await uploadImage(file);
    }

    const res = await fetch(
      "https://pbcnboxtlrymczzpppyl.supabase.co/functions/v1/update-complaint-status",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        body: JSON.stringify({
          complaint_id: selectedComplaint.id,
          new_status: status,
          reason: reason,
          after_image_path: imagePath
        })
      }
    );

    const result = await res.json();

    if (!res.ok) {
      alert(result.error);
      return;
    }

    alert("Updated Successfully ✅");

    closeModal();
    loadRequests(); // refresh table

  } catch (err) {
    console.error(err);
  }
}

let allHistory = [];

async function loadMaintenanceHistory() {
  try {
    const { data } = await supabaseClient.auth.getSession();
    const token = data.session?.access_token;

    const res = await fetch("https://pbcnboxtlrymczzpppyl.supabase.co/functions/v1/get-complaints", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({ role: "TECHNICIAN" })
    });

    const result = await res.json();
    console.log(result);

    if (!result.success) return;

    // 🔥 Only history (Resolved + Closed)
    const history = result.data.filter(c =>
      ["RESOLVED", "CLOSED"].includes(c.status)
    );

    allHistory = history;

    updateHistoryStats(history);
    renderHistoryTable(history);

  } catch (err) {
    console.error(err);
  }
}

function renderHistoryTable(data) {
  const table = document.getElementById("historyTable");
  table.innerHTML = "";

  // Latest first
  data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  data.forEach(c => {
    table.innerHTML += `
      <tr onclick="openComplaintModal('${c.id}')"
          class="cursor-pointer hover:bg-slate-50 transition">

        <td class="px-6 py-4">${c.title}</td>

        <td class="px-6 py-4">
          ${c.labs?.lab_name || "-"}
        </td>

        <td class="px-6 py-4">
          ${c.technicians?.name || "-"}
        </td>

        <td class="px-6 py-4 text-center">
          ${getStatusBadge(c.status)}
        </td>

        <td class="px-6 py-4 text-right">
          ${c.resolved_at 
            ? new Date(c.resolved_at).toLocaleDateString()
            : "-"
          }
        </td>

      </tr>
    `;
  });
}

function renderHistoryTable(data) {
  const table = document.getElementById("historyTable");
  table.innerHTML = "";

  // Latest first
  data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  data.forEach(c => {
    table.innerHTML += `
      <tr onclick="openComplaintModal('${c.id}')"
          class="cursor-pointer hover:bg-slate-50 transition">

        <td class="px-6 py-4">${c.title}</td>

        <td class="px-6 py-4">
          ${c.labs?.lab_name || "-"}
        </td>

        <td class="px-6 py-4">
          ${c.technicians?.name || "-"}
        </td>

        <td class="px-6 py-4 text-center">
          ${getStatusBadge(c.status)}
        </td>

        <td class="px-6 py-4 text-right">
          ${c.resolved_at 
            ? new Date(c.resolved_at).toLocaleDateString()
            : "-"
          }
        </td>

      </tr>
    `;
  });
}

function updateHistoryStats(data) {
  document.getElementById("totalHistory").innerText = data.length;

  const resolved = data.filter(c => c.status === "RESOLVED");
  const closed = data.filter(c => c.status === "CLOSED");

  document.getElementById("resolvedCount").innerText = resolved.length;
  document.getElementById("closedCount").innerText = closed.length;
}

function gotoAllHistory(){
    window.location.href = "viewTechnicianAllHistory.html" ;
}

async function loadProfile() {
  try {
    // Get session & token
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return console.error("No active session");

    const token = session.access_token;

    // Call your profile edge function
    const res = await fetch("https://pbcnboxtlrymczzpppyl.supabase.co/functions/v1/get-user-profile", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch profile");

    populateProfileTab(data);

  } catch (err) {
    console.error("Error loading profile:", err);
  }
}

function populateProfileTab(profileData) {
  const role = profileData.role;
  const profile = profileData.profile;

  if (role === "TECHNICIAN") {
    document.getElementById("t_name").innerText = profile.name;
    document.getElementById("t_email").innerText = profileData.email;
    document.getElementById("t_level").innerText = profile.level || "Intermediate";
    document.getElementById("t_department").innerText = profile.department_name || "N/A";
    
    // Map labs assigned to technician
    const labs = profile.technician_lab_mapping?.map(l => l.lab_name).join(", ") || "None";
    document.getElementById("t_labs").innerText = labs;

    // Avatar initials
    const initials = profile.name.split(" ").map(n => n[0]).join("");
    document.getElementById("tech_avatar").innerText = initials.toUpperCase();

    // Insights example (you can compute these dynamically later)
    document.getElementById("t_insight1").innerText = `Assigned Labs: ${labs}`;
    document.getElementById("t_insight2").innerText = "Complaints resolved: --";
    document.getElementById("t_insight3").innerText = "Pending tasks: --";
  }

  if (role === "ADMIN") {
    document.getElementById("a_name").innerText = profile.name;
    document.getElementById("a_email").innerText = profileData.email;
    document.getElementById("a_level").innerText = profile.admin_level;
    document.getElementById("a_department").innerText = profile.department_name || "N/A";
    document.getElementById("a_org").innerText = profile.organization_name || "N/A";

    // Avatar initials
    const initials = profile.name.split(" ").map(n => n[0]).join("");
    document.getElementById("admin_avatar").innerText = initials.toUpperCase();

    // Insights example
    document.getElementById("a_insight1").innerText = "Total users managed: --";
    document.getElementById("a_insight2").innerText = "Complaints overseen: --";
    document.getElementById("a_insight3").innerText = "System access granted: --";
  }

  // You can similarly add logic for STUDENT role if needed
}

async function logoutUser() {
  const { error } = await window.supabaseClient.auth.signOut();

  if (error) {
    console.error("Logout failed:", error.message);
    alert("Failed to log out. Try again.");
  } else {
    console.log("✅ User logged out successfully!");
    // Optionally redirect to login page
    window.location.href = "./index.html";
  }
}