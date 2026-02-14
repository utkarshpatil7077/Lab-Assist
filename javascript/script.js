function verifyOTP(event) {
  event.preventDefault();

  lockCreateOrgUI();
  //showCircleLoader();

  try{
    document.getElementById("password").classList.remove("hidden");

    window.organizationName = document.getElementById("organizationName").value.trim();
    window.organizationCode = document.getElementById("organizationCode").value.trim();
    window.Username = document.getElementById("name").value.trim();
    window.email = document.getElementById("email").value.trim();
    window.level = document.getElementById("level").value;

    // Basic email check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      organizationName === "" ||
      organizationCode === "" ||
      Username === "" ||
      email === "" ||
      level === ""
    ) {
      alert("All fields are required");
      return;
    }

    // ✅ All validations passed
    sendOTPToEmail(email);
    console.log("verifyOTP completed !");
  }catch (err) {
     unlockCreateOrgUI();
     showCircleLoader();
     alert("Something went wrong");
  }
}

function lockCreateOrgUI() {
  const form = document.querySelector("form");
  const inputs = form.querySelectorAll("input, select");
  const labels = form.querySelectorAll("label");
  const btn = document.getElementById("otpButton");

  form.setAttribute("aria-busy", "true");

  // Lock inputs + select
  inputs.forEach(el => {
    el.readOnly = true;
    el.disabled = true;
    el.classList.add("readonly");
  });

  // Grey out labels too
  labels.forEach(label => {
    label.classList.add("opacity-60", "cursor-not-allowed");
  });
}

function unlockCreateOrgUI() {
  const form = document.querySelector("form");
  const inputs = form.querySelectorAll("input, select");
  const labels = form.querySelectorAll("label");
  const btn = document.getElementById("otpButton");

  form.setAttribute("aria-busy", "false");

  inputs.forEach(el => {
    el.readOnly = false;
    el.disabled = false;
    el.classList.remove("readonly");
  });

  labels.forEach(label => {
    label.classList.remove("opacity-60", "cursor-not-allowed");
  });

  btn.disabled = false;
  btn.classList.remove("opacity-70", "cursor-not-allowed");
  document.getElementById("otpBtnText").classList.remove("hidden");
  document.getElementById("otpSpinner").classList.add("hidden");

  document.getElementById("topLoader").classList.add("hidden");
  document.getElementById("lockOverlay").classList.add("hidden");
  document.body.style.pointerEvents = "auto";
}

function showCircleLoader() {
  const btn = document.getElementById("otpButton");
  const text = document.getElementById("otpBtnText");
  const loader = document.getElementById("circleLoaderOTP");

  if (btn.disabled) return; // Prevent double click

  btn.disabled = true;
  btn.setAttribute("aria-busy", "true");

  btn.classList.add("opacity-70", "cursor-not-allowed");
  text.classList.add("hidden");
  loader.classList.remove("hidden");
}

function hideCircleLoader() {
  const btn = document.getElementById("otpButton");
  const text = document.getElementById("otpBtnText");
  const loader = document.getElementById("circleLoaderOTP");

  btn.disabled = false;
  btn.setAttribute("aria-busy", "false");

  btn.classList.remove("opacity-70", "cursor-not-allowed");
  text.classList.remove("hidden");
  loader.classList.add("hidden");
}




async function sendOTPToEmail(email) {
    console.log("Send to sendOTPToEmail function");
    
    const { data, error } = await window.supabaseClient.auth.signInWithOtp({
      email,
      options: {
      emailRedirectTo: "http://localhost:5500/createOrganization.html"
    }
  });
  console.log("Link Send")

  if (error) {
    alert("Failed to send OTP: " + error.message);
  } else {
    alert("OTP link sent to email. Check inbox/spam.");
  }
}

(async () => {
  const { data: { session } } = await window.supabaseClient.auth.getSession();

  if (!session) return;

  const user = session.user;

  const { error } = await window.supabaseClient
    .from("admins")
    .upsert({
      id: user.id,
      email: user.email,
      full_name: document.getElementById("name")?.value || null,
      role: document.getElementById("level")?.value || "org_admin",
      organization_name: document.getElementById("organizationName")?.value || null
    });

  if (error) {
    console.error("DB Error:", error.message);
    alert("❌ Failed to save user data");
  } else {
    console.log("✅ User saved in users table");
  }
})();



//---------------------Admin Dashboard--------------------------------
  function showTab(tabId) {
    // Hide all tabs
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.add('hidden');
    });

    // Show selected tab
    const activeTab = document.getElementById(tabId);
    if (activeTab) {
      activeTab.classList.remove('hidden');
    }
  }

  function setActive(element) {
    // Remove active class from all sidebar links
    document.querySelectorAll('.sidebar-link').forEach(link => {
      link.classList.remove('sidebar-link-active');
    });

    // Add active class to clicked link
    element.classList.add('sidebar-link-active');
  }

  // Load dashboard by default on page load
  window.onload = function () {
    showTab('dashboard');
  };

  //------------------------------------Google Sign in---------------------------
async function loginWithGoogle(){
  const { data, error } = await window.supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/createOrganization.html"
      }
    });

    if (error) {
      alert(error.message);
      console.error(error);
    }
}