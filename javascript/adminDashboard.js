window.addEventListener("DOMContentLoaded", loadDashboard);

async function loadDashboard() {
    const {data : {session}} = await supabaseClient.auth.getSession() ;
    if(!session){
        alert("Login first") ;
        console.log(session) ;
    }
    console.log(session);
    document.getElementById("userName").textContent = session.user.user_metadata.full_name;
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
    document.getElementById("totalLabs").innerText = labs.size;
    getUserRole();

    // 🔹 Load Table
    loadTable(complaints);
    updateSystemHealth(result.data);

    loadNotifications(complaints);

    renderOverviewChart(complaints);
    loadUsers();

    loadDashboardLabs();
    updateComplaintUI(complaints);
    loadDepartments();

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

        <td class="px-6 py-4 text-center">
          <span class="px-3 py-1 text-[10px] font-bold rounded-full ${getStatusColor(c.status)} uppercase">
            ${c.status}
          </span>
        </td>

        <td class="px-6 py-4 text-right text-xs text-slate-400">
          ${formatTime(c.created_at)}
        </td>
      </tr>
    `;

    table.innerHTML += row;
  });
}
function getStatusColor(status) {
  switch (status) {
    case "RESOLVED":
      return "bg-emerald-100 text-emerald-700";
    case "IN_PROGRESS":
      return "bg-blue-100 text-blue-700";
    case "ON_HOLD":
      return "bg-amber-100 text-amber-700";
    case "ASSIGNED":
      return "bg-purple-100 text-purple-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
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
function openLabModal() {
  const modal = document.getElementById("labModal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  loadTechnicians();
}

// Close Lab Modal
function closeLabModal() {
  const modal = document.getElementById("labModal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

async function createLab() {
  document.getElementById("createLabForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const lab_name = document.getElementById("labName").value.trim();
  const lab_code = document.getElementById("labCode").value.trim();
  const lab_type = document.getElementById("labType").value;
  const technician_id = document.getElementById("technicianID").value.trim();
  const name = document.getElementById("technicianName").value.trim();

  // const { data, error } = await window.supabaseClient.auth.signUp({
  //     email: technician_id,
  //     password: password,
  //     options: {
  //       data: {
  //         full_name: name
  //       },
  //     }
  //   });

  if (!lab_name || !lab_code) {
    alert("Please fill all required fields");
    return;
  }

  const { data: sessionData } = await supabaseClient.auth.getSession();
  const token = sessionData.session.access_token;

  const response = await fetch("https://pbcnboxtlrymczzpppyl.supabase.co/functions/v1/quick-processor", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      lab_name,
      lab_code,
      lab_type,
      technician_id,
      organization_id: CURRENT_ORG_ID,
      department_id: CURRENT_DEPT_ID
    })
  });

  const result = await response.json();

  if (!response.ok) {
    alert("Error: " + result.error);
    return;
  }

  alert("Lab Created Successfully!");
  closeLabModal();
  location.reload(); // refresh table
});
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

  users.forEach(user => {
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

    console.log("Full Response:", dataRes);

    // ✅ Validate response
    if (!dataRes.role) {
      throw new Error("Invalid response: role missing");
    }

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
    const { data } = await supabaseClient.auth.getSession();
    const token = data.session?.access_token;

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
          "Authorization": `Bearer ${token}` // ✅ CORRECT (with space)
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
        <td class="p-3">${c.issue || "No Issue"}</td>
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



function toggleNotifications() {
  const box = document.getElementById("notificationBox");
  box.classList.toggle("hidden");
}

function loadNotifications(complaints) {
  const list = document.getElementById("notificationList");

  // 🔥 Filter only important statuses
  const filtered = complaints.filter(c =>
    ["OPEN", "PENDING", "IN_PROGRESS"].includes(c.status)
  );

  if (filtered.length === 0) {
    list.innerHTML = `
      <p class="p-4 text-slate-400 text-center">
        No important notifications
      </p>
    `;
    document.getElementById("notifCount").innerText = 0;
    return;
  }

  document.getElementById("notifCount").innerText = filtered.length;

  // 🔥 Render
  list.innerHTML = filtered.slice(0, 5).map(c => {
    const statusClass = getNotificationComplaintStatusColor(c.status);

    return `
      <div class="p-3 border-b hover:bg-slate-50 cursor-pointer">

        <!-- 🔹 TOP ROW (Issue + Status side by side) -->
        <div class="flex justify-between items-center">
          <p class="font-medium text-sm">
            ${c.issue || "New Issue"}
          </p>

          <span class="text-xs px-2 py-1 rounded-full font-semibold ${statusClass}">
            ${c.status}
          </span>
        </div>

        <!-- 🔹 Lab Name BELOW -->
        <p class="text-xs text-slate-500 mt-1">
          ${c.labs?.lab_name || "-"}
        </p>

      </div>
    `;
  }).join("");
}
function getNotificationComplaintStatusColor(status) {
  switch (status) {
    case "MAINTENANCE":
    case "IN_PROGRESS":
    case "PENDING":
      return "bg-amber-100 text-amber-700";

    case "HIGH":
    case "OPEN":
      return "bg-red-100 text-red-700";

    case "RESOLVED":
    case "ACTIVE":
      return "bg-emerald-100 text-emerald-700";

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
