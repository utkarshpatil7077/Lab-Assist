window.addEventListener("DOMContentLoaded", loadDashboard);

async function loadDashboard() {
    const {data : {session}} = await supabaseClient.auth.getSession() ;
    if(!session){
        alert("Login first") ;
        console.log(session) ;
    }
    console.log(session);
    const userMeta = session.user.user_metadata;

const name = userMeta.full_name || userMeta.email;

document.getElementById("userName").innerText = name;
    window.profile = session.user.user_metadata.email ;
    console.log("Email : " + window.profile);
    const orgID = sessionStorage.getItem("organizationID");
  const deptID = sessionStorage.getItem("departmentID");

  console.log(orgID);
  console.log(deptID);
  const { data } = await supabaseClient.auth.getSession();
  const token = data.session?.access_token;
  try {
    const response = await fetch("https://pbcnboxtlrymczzpppyl.supabase.co/functions/v1/get-complaints", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({ role: "ADMIN" })
    });

console.log("Token:", token);
    console.log("Token:", localStorage.getItem("token"));
    const result = await response.json();

    if (!result.success) throw new Error(result.error);
    console.log(result);

    const complaints = result.data;
    const stats = result.stats || {};
    console.log(stats);
    let l = stats.assigned + stats.ongoing + stats.on_hold + stats.queued;
    console.log(l);
    console.log(stats.assigned);

    // 🔹 Update Cards
    document.getElementById("activeComplaints").innerText = complaints.length;

    // Unique labs count
    const labs = new Set(complaints.map(c => c.labs?.lab_name));
    getUserRole();

    // 🔹 Load Table
    loadTable(complaints);
    updateSystemHealth(result.data);

    renderOverviewChart(complaints);
    loadUsers();
    renderReports(complaints);

    // loadDashboardLabs();
    updateComplaintUI(complaints);
    loadDepartments();
    loadDevices();

  } catch (err) {
    console.error("Dashboard Error:", err);
  }
}
function updateSystemHealth(complaints) {
  const total = complaints.length || 1;

  const resolved = complaints.filter(c => c.status === "RESOLVED").length;
  const pending = complaints.filter(c => c.status !== "RESOLVED").length;
  const high = complaints.filter(c => c.priority === "HIGH").length;

  const resolutionRate = (resolved / total) * 100;
  const pendingRate = (pending / total) * 100;
  const highRate = (high / total) * 100;

  // ✅ Resolution
  document.getElementById("serverBar").style.width = resolutionRate + "%";
  document.getElementById("serverPercent").innerText =
    Math.round(resolutionRate) + "%";

  // ✅ Pending
  document.getElementById("storageBar").style.width = pendingRate + "%";
  document.getElementById("storagePercent").innerText =
    Math.round(pendingRate) + "%";

  // ✅ High Priority
  document.getElementById("memoryBar").style.width = highRate + "%";
  document.getElementById("memoryPercent").innerText =
    Math.round(highRate) + "%";
}
function gotoComplaints(){
  window.location.href = "complaints.html";
}
function loadTable(complaints) {
  const table = document.getElementById("activityTable");
  table.innerHTML = "";

  complaints.slice(0, 5).forEach(c => {
    const initials = c.students?.name
      ? c.students.name.split(" ").map(n => n[0]).join("")
      : "NA";

    const row = `
      <tr class="hover:bg-slate-50/50 transition-colors">
        <td class="px-6 py-4">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold">
              ${initials}
            </div>
            <div>
              <p class="text-sm font-bold">${c.students?.name || "Unknown"}</p>
              <p class="text-xs text-slate-500">${c.labs?.lab_name || "-"}</p>
            </div>
          </div>
        </td>

        <td class="px-6 py-4 text-sm text-slate-600">
          ${c.title}
        </td>

        <td class="px-6 py-4">${getStatColor(c.status)}</td>

        <td class="px-6 py-4 text-right text-xs text-slate-400">
          ${formatTime(c.created_at)}
        </td>
      </tr>
    `;

    table.innerHTML += row;
  });
}
function getStatColor(status) {
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
function formatTime(date) {
  const diff = Math.floor((new Date() - new Date(date)) / 60000);

  if (diff < 1) return "Just now";
  if (diff < 60) return diff + " mins ago";
  
  const hours = Math.floor(diff / 60);
  if (hours < 24) return hours + " hours ago";

  const days = Math.floor(hours / 24);
  return days + " days ago";
}
function prepareOverviewData(complaints) {
  const totalComplaints = complaints.length;

  const labs = new Set(complaints.map(c => c.labs?.lab_name));
  const totalLabs = labs.size;

  const users = new Set(complaints.map(c => c.students?.id));
  const totalUsers = users.size;

  return {
    users: totalUsers,
    labs: totalLabs,
    complaints: totalComplaints
  };
}
let overviewChart;

function renderOverviewChart(complaints) {
  const stats = prepareOverviewData(complaints);

  const ctx = document.getElementById("overviewChart");

  // Prevent duplicate charts
  if (overviewChart) {
    overviewChart.destroy();
  }

  overviewChart = new Chart(ctx, {
    type: "doughnut",   // 🔥 you can change to "pie" or "bar"
    data: {
      labels: ["Users", "Labs", "Complaints"],
      datasets: [{
        data: [stats.users, stats.labs, stats.complaints],
        backgroundColor: [
          "#3b82f6",   // blue
          "#6366f1",   // indigo
          "#ef4444"    // red
        ]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom"
        }
      }
    }
  });
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

async function openUserModal() {
  const userData = JSON.parse(localStorage.getItem("userData") || "{}");
  const level = userData.level;

  const roleSelect = document.getElementById("inviteRole");
  const deptContainer = document.getElementById("departmentSelectContainer");
  const deptSelect = document.getElementById("departmentSelect");

  const { data: { session } } = await supabaseClient.auth.getSession();

  // Clear previous options
  roleSelect.innerHTML = "";
  deptSelect.innerHTML = "";

  if (level === "ORG_ADMIN") {
    // ORG_ADMIN can only invite DEPT_ADMIN
    roleSelect.innerHTML = '<option value="ADMIN_DEP">DEPT_ADMIN</option>';
    deptContainer.classList.remove("hidden");

    // Fetch departments from your existing function
    fetch("https://pbcnboxtlrymczzpppyl.supabase.co/functions/v1/get-lab-architecture", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ role: "ADMIN" }) // your function expects a role
    })
      .then(res => res.json())
      .then(res => {
        if (!res.success) throw new Error(res.error || "Failed to fetch departments");

        res.data.departments.forEach(d => {
          const opt = document.createElement("option");
          opt.value = d.id;
          opt.textContent = d.name;
          deptSelect.appendChild(opt);
        });
      })
      .catch(err => {
        console.error("Dept fetch error:", err);
        deptSelect.innerHTML = '<option value="">No departments found</option>';
      });

  } else if (level === "DEPARTMENT_ADMIN") {
    // DEPT_ADMIN can invite STUDENT or TECHNICIAN only
    roleSelect.innerHTML = `
      <option value="STUDENT">STUDENT</option>
      <option value="TECHNICIAN">TECHNICIAN</option>
    `;
    deptContainer.classList.add("hidden"); // department is fixed to their own
  }

  document.getElementById("userModal").classList.remove("hidden");
}

function closeUserModal() {
  const modal = document.getElementById("userModal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

// Open Lab Modal
let currentAdmin = {}; // fetched after login

// Open Modal & Load Technicians
async function openLabModal() {
  document.getElementById("labModal").classList.remove("hidden");
  await loadTechnicians();
}

// Close Modal
function closeLabModal() {
  document.getElementById("labModal").classList.add("hidden");
  document.getElementById("createLabForm").reset();
}

// Load Technicians into Dropdown
async function loadTechnicians() {
  const select = document.getElementById("technicianSelect");
  select.innerHTML = `<option value="">Select Technician</option>`; // reset
  const { data } = await supabaseClient.auth.getSession();
    const token = data.session?.access_token;

  try {
    const res = await fetch("https://pbcnboxtlrymczzpppyl.supabase.co/functions/v1/get-students-technicians", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ organization_id: window.pro.profile.organization_id})
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    data.technicians.forEach(tech => {
      const option = document.createElement("option");
      option.value = tech.id;
      option.textContent = tech.name || tech.email;
      select.appendChild(option);
    });
  } catch (err) {
    console.error("Failed to load technicians:", err);
    alert("Could not fetch technicians.");
  }
}

// Create Lab & Assign Technician
async function createLab(event) {
  event.preventDefault();

  const labName = document.getElementById("labName").value.trim();
  const labCode = document.getElementById("labCode").value.trim();
  const labType = document.getElementById("labType").value;
  const technicianID = document.getElementById("technicianSelect").value;
  const { data } = await supabaseClient.auth.getSession();
    const token = data.session?.access_token;

  if (!labName || !labCode || !labType || !technicianID) {
    alert("Please fill all required fields.");
    return;
  }

  try {
    // 1. Create Lab
    const labRes = await fetch("https://pbcnboxtlrymczzpppyl.supabase.co/functions/v1/create-lab", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        lab_name: labName,
        lab_code: labCode,
        lab_type: labType,
        target_department_id: currentAdmin.department_id
      })
    });
    const labData = await labRes.json();
    if (!labData.success) throw new Error(labData.error);

    // 2. Assign Technician
    const techRes = await fetch("https://pbcnboxtlrymczzpppyl.supabase.co/functions/v1/assign-technician-to-lab", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        lab_id: labData.lab_id,
        technician_id: technicianID
      })
    });
    const techData = await techRes.json();
    if (!techData.success) throw new Error(techData.error);

    alert("Lab created and technician assigned successfully!");
    closeLabModal();
    // Optionally, refresh the lab table or list
  } catch (err) {
    console.error("Error creating lab:", err);
    alert("Failed to create lab: " + err.message);
  }
}

async function sendToMailOTP(email) {
    console.log("Email : " + email);
  const response = await fetch(
    "https://pbcnboxtlrymczzpppyl.supabase.co/functions/v1/handle-otp",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email,
        action: "SEND"
    }),
    }
  );
  console.log("Function otp Call") ;
  const data = await response.json();
  console.log(data);

  if (data.success) {
    alert("OTP sent successfully!");
    console.log("OTP send Successfully!") ;
    //unlockCreateOrgUI("loadingOTP" ,"otpBtn");
    document.getElementById("otpInput").classList.remove("hidden");
  } else {
    alert(data.error);
    console.log(error) ;
    return data.error ;
  }
}

async function verifyOTP(email, otpInput) {
  console.log("At verify Email : "+email) ;
  const response = await fetch(
    "https://pbcnboxtlrymczzpppyl.supabase.co/functions/v1/handle-otp",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email,
        otp_input: otpInput,
        action: "VERIFY"
      }),
    }
  );

  const data = await response.json();
  console.log(data);
  console.log("OTP : "+otpInput) ;
  console.log("Typeof : "+ typeof(otpInput)) ;

  if (data.success) {
    alert("OTP Verified ✅");
    document.getElementById("footer").classList.remove("hidden") ;
    hideCircleLoader("loadingSubmit" ,"otpSubmmit") ;
  } else {
    alert(data.error);
    hideCircleLoader("loadingSubmit" ,"otpSubmmit");
  }
}

function send(){
  const lab_name = document.getElementById("labName").value.trim();
  const lab_code = document.getElementById("labCode").value.trim();
  const lab_type = document.getElementById("labType").value;
  const technician_id = document.getElementById("technicianID").value.trim();
  const name = document.getElementById("technicianName").value.trim();

  if(!lab_name || !lab_code || !lab_type || !technician_id || !name){
    alert("All fields required") ;
  }
  try {
    sendToMailOTP(technician_id) ;
  }
  catch(err){
    alert(err);
  }
}

function verify(){
  const otp = document.getElementById("otp").value.trim();
  const technician_id = document.getElementById("technicianID").value;
  if(!otp){
    alert("Please enter OTP");
  }
  else{
    try {
      verifyOTP(technician_id,otp) ;
    }
    catch(err){
      alert(err);
    }
  }
}

function sendInvite() {
  const userData = JSON.parse(localStorage.getItem("userData") || "{}");
  const level = userData.level;

  const email = document.getElementById("inviteEmail").value;
  const empId = document.getElementById("inviteID").value;
  const role = document.getElementById("inviteRole").value;
  console.log("Role : " , role);

  let department_id = null;
  if (level === "ORG_ADMIN") {
    department_id = document.getElementById("departmentSelect").value;
    console.log(department_id);
  } else if (level === "DEPARTMENT_ADMIN") {
    department_id = userData.profile.department_id;
  }

  const payload = {
    email,
    role,
    department_id,
    org_id: userData.profile.organization_id,
    roll_no_or_emp_no: empId
  };

  fetch("https://pbcnboxtlrymczzpppyl.supabase.co/functions/v1/send-invite", { // replace with your invite function URL
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${userData.token}`
    },
    body: JSON.stringify(payload)
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert("Invite sent successfully!");
        closeUserModal();
      } else {
        alert("Error: " + (data.error || "Unknown error"));
      }
    })
    .catch(err => alert("Error sending invite: " + err.message));
}
async function loadUsers() {
  try {
    const { data } = await supabaseClient.auth.getSession();
    const token = data.session?.access_token;
    const orgID = sessionStorage.getItem("organizationID");

    const response = await fetch("https://pbcnboxtlrymczzpppyl.supabase.co/functions/v1/get-students-technicians", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        organization_id: orgID
      })
    });

    const result = await response.json();

    if (!result.success) throw new Error(result.error);

    const students = result.students || [];
    const technicians = result.technicians || [];
    updateUserStats(students, technicians);

    // 🔥 Combine both
    const users = [
      ...students.map(s => ({ ...s, role: "STUDENT" })),
      ...technicians.map(t => ({ ...t, role: "TECHNICIAN" }))
    ];

    renderUsers(users);

  } catch (err) {
    console.error("User Load Error:", err);
  }
}
function renderUsers(users) {
  const table = document.getElementById("usersTable");
  table.innerHTML = "";

  if (users.length === 0) {
    table.innerHTML = `
      <tr>
        <td colspan="4" class="text-center py-4 text-slate-400">
          No users found
        </td>
      </tr>
    `;
    return;
  }

  users.slice(0.5).forEach(user => {
    const name = user.name || "Unknown";
    const email = user.email || "N/A";
    const role = user.role;

    const status = user.status || "Active"; // adjust if you have field

    const row = `
      <tr class="hover:bg-slate-50/50 transition-colors">
        
        <td class="px-6 py-4 text-sm font-bold text-[var(--text-primary)]">
          ${name}
        </td>

        <td class="px-6 py-4 text-sm text-slate-600">
          ${email}
        </td>

        <td class="px-6 py-4 text-center">
          <span class="px-3 py-1 text-[10px] font-bold rounded-full ${getRoleColor(role)} uppercase">
            ${role}
          </span>
        </td>

        <td class="px-6 py-4 text-right">
          <span class="px-3 py-1 text-[10px] font-bold rounded-full ${getStatusColor(status)} uppercase">
            ${status}
          </span>
        </td>

      </tr>
    `;

    table.innerHTML += row;
  });
}
function getRoleColor(role) {
  switch (role) {
    case "ADMIN":
      return "bg-blue-100 text-blue-700";
    case "TECHNICIAN":
      return "bg-purple-100 text-purple-700";
    case "STUDENT":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}
function getStatusColor(status) {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-100 text-emerald-700";
    case "PENDING":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}
function updateUserStats(students, technicians) {

  // Example logic (adjust based on your DB)
  const user = [
      ...students.map(s => ({ ...s, role: "STUDENT" })),
      ...technicians.map(t => ({ ...t, role: "TECHNICIAN" }))
    ];
  const totalUsers = user.length;
  const activeUsers = user.filter(u => u.is_active === true).length;
  const pendingUsers = user.filter(u => u.is_active === false).length;

  // Update UI
  document.getElementById("totalUsers").innerText = totalUsers;
  document.getElementById("tUsers").innerHTML = totalUsers;
  document.getElementById("activeUsers").innerText = activeUsers;
  document.getElementById("pendingUsers").innerText = pendingUsers;
}
async function getUserRole() {
  try {
    // ✅ Correct way to get session
    const { data } = await supabaseClient.auth.getSession();
    const token = data.session?.access_token;

    // 🔥 Check token
    if (!token) {
      throw new Error("No access token found (User not logged in)");
    }

    console.log("Token:", token); // debug

    const response = await fetch(
      "https://pbcnboxtlrymczzpppyl.supabase.co/functions/v1/get-user-profile",
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      }
    );

    // 🔥 IMPORTANT: check response status
    if (!response.ok) {
      const errorText = await response.text(); // raw error
      console.error("API Error Response:", errorText);
      throw new Error(`API Error: ${response.status}`);
    }

    const dataRes = await response.json();
    window.pro = dataRes ;

    console.log("User Info:", dataRes);

    // ✅ Validate response
    if (!dataRes.role) {
      throw new Error("Invalid response: role missing");
    }
    toggleAddUserButton(dataRes);
    renderLabsDashboard(dataRes.level);

    // ✅ Store data safely
    localStorage.setItem("userData", JSON.stringify(dataRes));
    // 🔥 Use it
    handleRole(dataRes);

    return dataRes;

  } catch (err) {
    console.error("getUserRole Error:", err.message);
    return null;
  }
}
// Call this after fetching admin info
function toggleAddUserButton(dataRes) {
  console.log("DataRes : ",dataRes);
  const btn = document.getElementById("createLabBtn");
  const deptTab = document.getElementById("departmentsTab");
  if (dataRes.level === "ORG_ADMIN") {
    btn.style.display = "none"; // Show button
    deptTab.style.display = "block";
  } else {
    btn.style.display = "inline-block"; // Hide button for DEPARTMENT_ADMIN
    deptTab.style.display = "none";
  }
}
function handleRole(data) {
  const role = data.role;
  const level = data.level;
  const profile = data.profile;
  const email = data.email;

  // ✅ Store everything in localStorage
  localStorage.setItem("role", role);
  localStorage.setItem("level", level || "");
  localStorage.setItem("email", email);
  localStorage.setItem("profile", JSON.stringify(profile));
  console.log("Local Storage");
  console.log(localStorage.getItem("level"));

  console.log("User data stored locally ✅");

  // 🔥 Role-based handling
  if (role === "ADMIN") {
    if (level === "ORG_ADMIN") {
      console.log("Full Organization Access");
    } else {
      console.log("Department Admin Access");
    }
  } 
  else if (role === "TECHNICIAN") {
    console.log("Technician Panel");
  } 
  else if (role === "STUDENT") {
    console.log("Student View");
  }
}
async function loadDashboardLabs() {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();

    // 🔥 Check token
    if (!token) {
      throw new Error("No access token found (User not logged in)");
    }

    const orgID = sessionStorage.getItem("organizationID");

    const res = await fetch(
      "https://pbcnboxtlrymczzpppyl.supabase.co/functions/v1/get-dashboard-labs",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}` // ✅ CORRECT (with space)
        },
        body: JSON.stringify({
          organization_id: orgID
        })
      }
    );

    const result = await res.json();

    console.log("API Result:", result); // ✅ Debug

    if (!result.success) throw new Error(result.error);

    const labs = result.labs || [];

    updateLabStats(labs);
    renderLabs(labs);

  } catch (err) {
    console.error("Error:", err.message);
  }
}
function updateLabStats(labs) {
  const total = labs.length;

  const active = labs.filter(l => l.status === "ACTIVE").length;
  const maintenance = labs.filter(l => l.status === "MAINTENANCE").length;

  document.getElementById("totalLabs").innerText = total;
  document.getElementById("activeLabs").innerText = active;
  document.getElementById("maintenanceLabs").innerText = maintenance;
}
function getLabStatusColor(status) {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-100 text-emerald-700";
    case "MAINTENANCE":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}
function renderLabs(labs) {
  const table = document.getElementById("labTable");
  table.innerHTML = "";

  if (!labs || labs.length === 0) {
    table.innerHTML = `
      <tr>
        <td colspan="4" class="text-center py-4 text-slate-400">
          No labs found
        </td>
      </tr>
    `;
    return;
  }

  labs.forEach(lab => {
    const statusClass = getLabStatusColor(lab.status);

    const row = `
      <tr class="border-b hover:bg-slate-50">
        <td class="px-6 py-4">${lab.code}</td>
        <td class="px-6 py-4">${lab.name}</td>
        <td class="px-6 py-4 text-center">${lab.type}</td>
        <td class="px-6 py-4 text-right">
          <span class="px-3 py-1 rounded-full text-xs font-semibold ${statusClass}">
            ${lab.status}
          </span>
        </td>
      </tr>
    `;

    table.innerHTML += row;
  });
}
function updateComplaintUI(complaints) {
  // ✅ Counts
  const open = complaints.filter(c => c.status !== "RESOLVED").length;
  const resolved = complaints.filter(c => c.status === "RESOLVED").length;
  const high = complaints.filter(c => c.priority === "HIGH").length;

  document.getElementById("openCount").innerText = open;
  document.getElementById("resolvedCount").innerText = resolved;
  document.getElementById("highCount").innerText = high;

  // ✅ Table
  const table = document.getElementById("complaintTable");
  table.innerHTML = "";

  if (!complaints || complaints.length === 0) {
    table.innerHTML = `
      <tr>
        <td colspan="3" class="text-center py-4 text-slate-400">
          No complaints found
        </td>
      </tr>
    `;
    return;
  }

  // 🔥 Show latest 5 complaints
  const recent = complaints.slice(0, 10);

  recent.forEach(c => {
    const statusClass = getLabStatusColor(c.status);

    const row = `
      <tr class="border-b hover:bg-slate-50">
        <td class="p-3">${c.title || "No Issue"}</td>
        <td class="p-3">${c.labs?.lab_name || "-"}</td>
        <td class="p-3 text-center">
          <span class="px-2 py-1 rounded-full text-xs font-semibold ${statusClass}">
            ${c.status}
          </span>
        </td>
      </tr>
    `;

    table.innerHTML += row;
  });
}
function getLabStatusColor(status) {
  switch (status) {
    case "ACTIVE":
    case "RESOLVED":
      return "bg-emerald-100 text-emerald-700";

    case "MAINTENANCE":
    case "IN_PROGRESS":
    case "PENDING":
      return "bg-amber-100 text-amber-700";

    case "HIGH":
    case "OPEN":
      return "bg-red-100 text-red-700";

    default:
      return "bg-gray-100 text-gray-700";
  }
}

// Open / Close Modal
function openDepartmentModal() {
  document.getElementById("departmentModal").classList.remove("hidden");
}
function closeDepartmentModal() {
  document.getElementById("departmentModal").classList.add("hidden");
}

// Create Department Function
async function createDepartment() {
  const name = document.getElementById("departmentName").value.trim();
  const code = document.getElementById("departmentCode").value.trim();
  const description = document.getElementById("departmentDescription").value.trim();

  if (!name || !code) {
    alert("Department name and code are required.");
    return;
  }

  // Get current session for authorization
  const { data: { session } } = await supabaseClient.auth.getSession();

  try {
    const response = await fetch("https://pbcnboxtlrymczzpppyl.supabase.co/functions/v1/create-department", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${session.access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: name,
        department_code: code,
        description: description
      })
    });

    const result = await response.json();
    if (response.ok) {
      alert(result.message || "Department created successfully!");
      closeDepartmentModal();
      // Optionally refresh department table / stats
      loadDepartments();
    } else {
      alert("Error: " + result.error);
    }

  } catch (error) {
    console.error("Create Department Error:", error);
    alert("Failed to create department.");
  }
}

async function loadDepartments() {
  try {
    const userData = JSON.parse(localStorage.getItem("userData") || "{}");
    const role = userData.level;
    // Get current session for authorization
  const { data: { session } } = await supabaseClient.auth.getSession();

    if (!role) throw new Error("User role not found in localStorage");

    const res = await fetch("https://pbcnboxtlrymczzpppyl.supabase.co/functions/v1/get-lab-architecture", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}` // replace with actual token
      },
      body: JSON.stringify({ role : role })
    });

    const dataRes = await res.json();

    if (!dataRes.success) throw new Error(dataRes.error);

    const departments = dataRes.data.departments || [];

    // Update stats cards
    updateDepartmentStats(departments);

    // Render departments table
    renderDepartmentTable(departments);

  } catch (err) {
    console.error("Error loading departments:", err.message);
  }
}
function updateDepartmentStats(departments) {
  const total = departments.length;

  // Active = departments with at least one lab active
  const active = departments.filter(d =>
    (d.labs || []).some(lab => lab.is_active)
  ).length;

  const inactive = total - active;

  document.getElementById("totalDepartments").innerText = total;
  document.getElementById("activeDepartments").innerText = active;
  document.getElementById("inactiveDepartments").innerText = inactive;
}
function renderDepartmentTable(departments) {
  const tbody = document.getElementById("departmentTable");
  tbody.innerHTML = ""; // Clear table

  departments.forEach(dept => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td class="px-6 py-4">${dept.name || "-"}</td>
      <td class="px-6 py-4">${dept.code || "-"}</td>
      <td class="px-6 py-4">${dept.description || "-"}</td>
      <td class="px-6 py-4 text-right">
        ${!dept.head ? '<span class="text-red-500 font-semibold">No Head Assigned</span>' : dept.head.name}
      </td>
    `;

    tbody.appendChild(row);
  });
}

async function fetchLabsData(role) {
  try {
    const { data } = await supabaseClient.auth.getSession();
    const token = data.session?.access_token;
    const res = await fetch("https://pbcnboxtlrymczzpppyl.supabase.co/functions/v1/get-lab-architecture", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ role : role})
    });

    const result = await res.json();
    if (!result.success) throw new Error(result.error);

    return result.data;
  } catch (err) {
    console.error("Error fetching labs:", err);
    return null;
  }
}

function populateStats(data, role) {
  let activeLabs = 0;
  let maintenanceDue = 0;

  let labsList = [];

  if (role === "ORG_ADMIN") {
    data.departments.forEach(dept => {
      if (dept.labs) labsList.push(...dept.labs);
    });
  } else if (role === "DEPARTMENT_ADMIN" || role === "STUDENT") {
    labsList = data.labs || [];
  } else if (role === "TECHNICIAN") {
    labsList = data.labs || [];
  }

  const totalLabs = labsList.length;
  console.log("Total Labs : ",totalLabs);
  activeLabs = labsList.filter(l => l.is_active && !l.is_under_maintenance).length;
  maintenanceDue = labsList.filter(l => l.is_under_maintenance).length;

  const totalEl = document.getElementById("totalLabsTab");
const activeEl = document.getElementById("activeLabs");
const maintenanceEl = document.getElementById("maintenanceLabs");

if (!totalEl || !activeEl || !maintenanceEl) {
  console.error("Stats elements not found in DOM");
  return;
}

totalEl.innerText = totalLabs;
activeEl.innerText = activeLabs;
maintenanceEl.innerText = maintenanceDue;
document.getElementById("totalLabs").innerText = totalLabs;
}
function populateLabsTable(data, role) {
  const tbody = document.getElementById("labTable");
  tbody.innerHTML = "";

  let labsList = [];

  if (role === "ORG_ADMIN") {
    data.departments.forEach(dept => {
      if (dept.labs) labsList.push(...dept.labs);
    });
  } else if (role === "DEPARTMENT_ADMIN" || role === "STUDENT") {
    labsList = data.labs || [];
  } else if (role === "TECHNICIAN") {
    labsList = data.labs || [];
  }

  labsList.slice(0, 3).forEach(lab => {
    const status = lab.is_active
      ? lab.is_under_maintenance ? "Maintenance" : "Active"
      : "Inactive";

    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="px-6 py-4 text-sm font-bold">${lab.lab_code}</td>
      <td class="px-6 py-4 text-sm text-slate-600">${lab.lab_name}</td>
      <td class="px-6 py-4 text-sm text-slate-600">${lab.lab_type}</td>
      <td class="px-6 py-4 text-right">${getStatusBadge(status)}</td>
    `;
    tbody.appendChild(row);
  });
}
function getStatusBadge(status) {
  if (status === "Active") {
    return `<span class="px-3 py-1 text-[10px] font-bold rounded-full bg-green-100 text-green-600 px-2 py-1 rounded">ACTIVE</span>`;
  }
  if (status === "Inactive") {
    return `<span class="px-3 py-1 text-[10px] font-bold rounded-full bg-red-100 text-red-600 px-2 py-1 rounded">INACTIVE</span>`;
  }
  return status;
}
async function renderLabsDashboard(role) {
  const data = await fetchLabsData(role);
  if (!data) return;

  populateStats(data, role);
  populateLabsTable(data, role);
}

function renderReports(complaints) {
  renderStatusChart(complaints);
  renderPriorityChart(complaints);
  renderTimelineChart(complaints);
}
let statusChart;

function renderStatusChart(complaints) {
  const statusCount = {};

  complaints.forEach(c => {
    statusCount[c.status] = (statusCount[c.status] || 0) + 1;
  });

  const ctx = document.getElementById("statusChart");

  if (statusChart) statusChart.destroy();

  statusChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(statusCount),
      datasets: [{
        data: Object.values(statusCount),
        backgroundColor: [
          "#3b82f6", // blue
          "#6366f1", // indigo
          "#ef4444", // red
          "#10b981", // green
          "#f59e0b"  // yellow
        ]
      }]
    }
  });
}
let priorityChart;

function renderPriorityChart(complaints) {
  const priorityCount = {};

  complaints.forEach(c => {
    priorityCount[c.priority] = (priorityCount[c.priority] || 0) + 1;
  });

  const ctx = document.getElementById("priorityChart");

  if (priorityChart) priorityChart.destroy();

  priorityChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(priorityCount),
      datasets: [{
        label: "Complaints",
        data: Object.values(priorityCount),
        backgroundColor: [
          "#ef4444", // HIGH → red
          "#f59e0b", // MEDIUM → yellow
          "#10b981"  // LOW → green
        ]
      }]
    }
  });
}
let timelineChart;

function renderTimelineChart(complaints) {
  const dateCount = {};

  complaints.forEach(c => {
    const date = new Date(c.created_at).toLocaleDateString();
    dateCount[date] = (dateCount[date] || 0) + 1;
  });

  const ctx = document.getElementById("timelineChart");

  if (timelineChart) timelineChart.destroy();

  timelineChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: Object.keys(dateCount),
      datasets: [{
        label: "Complaints Over Time",
        data: Object.values(dateCount),
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.2)",
        fill: true,
        tension: 0.4
      }]
    }
  });
}
const colorMap = {
  OPEN: "#ef4444",
  IN_PROGRESS: "#3b82f6",
  RESOLVED: "#10b981"
};

async function loadAdminProfile() {
  const { data } = await supabaseClient.auth.getSession();
    const token = data.session?.access_token;

  const res = await fetch("https://pbcnboxtlrymczzpppyl.supabase.co/functions/v1/get-user-profile", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const response = await res.json();

  if (response.role !== "ADMIN") return;

  const profile = response.profile;

  // Name + Email
  document.getElementById("a_name").innerText = profile.name || "Admin";
  document.getElementById("a_email").innerText = data.email;

  // Avatar Initial
  document.getElementById("admin_avatar").innerText =
    (profile.name?.charAt(0) || "A").toUpperCase();

  // Info
  document.getElementById("a_level").innerText = profile.admin_level;
  document.getElementById("a_department").innerText = profile.department_name?.name || "-";
  document.getElementById("a_org").innerText = profile.organization_name?.name || "-";

  // Insights (dynamic)
  document.getElementById("a_insight1").innerText =
    `You are a Level ${profile.admin_level} administrator.`;

  document.getElementById("a_insight2").innerText =
    `Managing department: ${profile.department_name?.name || "N/A"}`;

  document.getElementById("a_insight3").innerText =
    `Organization: ${profile.organization_name?.name || "N/A"}`;
}
function gotoViewAdminAllUsers(){
  window.location.href = "viewAdminAllUsers.html" ;
}
function gotoViewAllLabsInfo(){
  window.location.href = "viewADminAllLabs.html" ;
}

let allDevices = [];

async function loadDevices(role = "ADMIN") {
  try {
    const { data } = await supabaseClient.auth.getSession();
    const token = data.session?.access_token;

    const res = await fetch("https://pbcnboxtlrymczzpppyl.supabase.co/functions/v1/get-lab-architecture", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({ role : role})
    });

    const result = await res.json();

    if (!result.success) {
      console.error(result.error);
      return;
    }

    // 🔥 Flatten labs → devices
    let devices = [];

    if (result.data.departments) {
      result.data.departments.forEach(dep => {
        dep.labs.forEach(lab => {
          lab.devices.forEach(d => {
            devices.push({
              ...d,
              lab_name: lab.lab_name
            });
          });
        });
      });
    } else if (result.data.labs) {
      result.data.labs.forEach(lab => {
        lab.devices.forEach(d => {
          devices.push({
            ...d,
            lab_name: lab.lab_name
          });
        });
      });
    }

    allDevices = devices;

    renderDevices(devices);
    updateDeviceStats(devices);

  } catch (err) {
    console.error(err);
  }
}

function renderDevices(devices) {
  const table = document.getElementById("deviceTable");
  table.innerHTML = "";

  devices.forEach(d => {
    table.innerHTML += `
      <tr class="border-b">
        <td class="px-6 py-3">${d.device_code}</td>
        <td class="px-6 py-3">${d.device_name}</td>
        <td class="px-6 py-3">${d.device_type}</td>
        <td class="px-6 py-3">${d.lab_name}</td>
        <td class="px-6 py-3 text-right">
          ${d.is_active 
            ? '<span class="px-3 py-1 text-[10px] font-bold rounded-full bg-green-100 text-green-600 px-2 py-1 rounded">ACTIVE</span>' 
            : '<span class="px-3 py-1 text-[10px] font-bold rounded-full bg-red-100 text-red-600 px-2 py-1 rounded">INACTIVE</span>'}
        </td>
      </tr>
    `;
  });
}

function updateDeviceStats(devices) {
  document.getElementById("totalDevices").innerText = devices.length;

  const active = devices.filter(d => d.is_active).length;
  document.getElementById("activeDevices").innerText = active;

  const maintenance = devices.filter(d => !d.is_active).length;
  document.getElementById("maintenanceDevices").innerText = maintenance;
}


let labsList = [];

async function loadLabsDropdown() {
  try {
    const { data } = await supabaseClient.auth.getSession();
    const token = data.session?.access_token;

    const res = await fetch("https://pbcnboxtlrymczzpppyl.supabase.co/functions/v1/get-lab-architecture", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({
        role: "ADMIN" // or dynamic role
      })
    });

    const result = await res.json();

    if (!result.success) {
      console.error(result.error);
      return;
    }

    // 🔥 Handle both ORG_ADMIN & DEPT_ADMIN formats
    let labs = [];

    if (result.data.departments) {
      result.data.departments.forEach(d => {
        d.labs?.forEach(l => labs.push(l));
      });
    } else if (result.data.labs) {
      labs = result.data.labs;
    }

    labsList = labs;

    const select = document.getElementById("lab_select");
    select.innerHTML = `<option value="">Select Lab</option>`;

    labs.forEach(l => {
      const option = document.createElement("option");
      option.value = l.id;
      option.textContent = `${l.lab_name} (${l.lab_code || ""})`;
      select.appendChild(option);
    });

  } catch (err) {
    console.error(err);
  }
}

async function submitDevice() {
  try {
    const labId = document.getElementById("lab_select").value;
    const name = document.getElementById("device_name").value;
    const code = document.getElementById("device_code").value;
    const type = document.getElementById("device_type").value;
    const other = document.getElementById("device_type_other").value;

    if (!labId || !name || !code || !type) {
      alert("Please fill all fields");
      return;
    }

    const { data } = await supabaseClient.auth.getSession();
    const token = data.session?.access_token;

    const res = await fetch("https://pbcnboxtlrymczzpppyl.supabase.co/functions/v1/create-device", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({
        lab_id: labId,
        device_name: name,
        device_code: code,
        device_type: type,
        device_type_other: type === "OTHER" ? other : null
      })
    });

    const result = await res.json();

    if (!result.success) {
      alert(result.error);
      return;
    }

    alert("✅ Device Added Successfully");

    closeDeviceModal();
    loadLabs(); // refresh UI

  } catch (err) {
    console.error(err);
  }
}

function openDeviceModal() {
  document.getElementById("deviceModal").classList.remove("hidden");
  document.getElementById("deviceModal").classList.add("flex");
  loadLabsDropdown();
}

function closeDeviceModal() {
  document.getElementById("deviceModal").classList.add("hidden");
}

function viewAllDevices(){
    window.location.href = "viewAdminAllDevices.html" ;
}