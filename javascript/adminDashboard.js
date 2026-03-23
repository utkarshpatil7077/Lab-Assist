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

    // 🔹 Load Table
    loadTable(complaints);
    updateSystemHealth(result.data);

    renderOverviewChart(complaints);
    loadUsers();

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
    window.location.href = "/createOrganization.html";
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

// User Creation 
function openUserModal() {
  const modal = document.getElementById("userModal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
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

async function sendInvite() {

  const email = document.getElementById("inviteEmail").value;
  const role = document.getElementById("inviteRole").value;
  const empID = document.getElementById("inviteID").value;
  console.log("Role : "+role);

  const { data: { session } } = await supabaseClient.auth.getSession();

  const response = await fetch(
    "https://pbcnboxtlrymczzpppyl.supabase.co/functions/v1/send-invite",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${session.access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: email,
        role: role,
        org_id: sessionStorage.getItem("organizationID"),
        department_id: "d34f47d6-0671-4f9e-b66d-c357f85ccca0", //sessionStorage.getItem("departmentID"),
        roll_no_or_emp_no: empID
      })
    }
  );

  const result = await response.json();
  console.log(result);

  if (response.ok) {
    alert("Invite Sent Successfully");
  } else {
    alert("Error: " + result.error);
  }
  closeUserModal();
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