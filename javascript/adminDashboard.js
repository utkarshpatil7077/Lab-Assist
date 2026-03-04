window.addEventListener("DOMContentLoaded", loadDashboard);

async function loadDashboard() {
    const {data : {session}} = await supabaseClient.auth.getSession() ;
    if(!session){
        alert("Login first") ;
        console.log(session) ;
    }
    console.log(session);
    document.getElementById("userName").textContent = session.user.user_metadata.full_name;
    window.profile = await getCurrentUserProfile();
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