function verifyOTP(event) {
  event.preventDefault();

  const SUPABASE_URL = "https://pbcnboxtlrymczzpppyl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBiY25ib3h0bHJ5bWN6enBwcHlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MDI0MDYsImV4cCI6MjA4MzE3ODQwNn0._zp4DOtpCvI4fqpRk-UUM3pQFVV42HfcLJ_N06f5qVc";

window.supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

  let organizationName = document.getElementById("organizationName").value.trim();
  let organizationCode = document.getElementById("organizationCode").value.trim();
  let name = document.getElementById("name").value.trim();
  let email = document.getElementById("email").value.trim();
  let level = document.getElementById("level").value; // select

  // Basic email check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (
    organizationName === "" ||
    organizationCode === "" ||
    name === "" ||
    email === "" ||
    level === ""
  ) {
    alert("All fields are required");
    return;
  }

  // ✅ All validations passed
  sendOTPToEmail(email);
  console.log("verifyOTP completed !");
}

async function sendOTPToEmail(email) {
    console.log("Send to sendOTPToEmail function");
    
    const { data, error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: {
      emailRedirectTo: "http://localhost:5500/verify.html"
    }
  });
  console.log("Link Send")

  if (error) {
    alert("Failed to send OTP: " + error.message);
  } else {
    alert("OTP link sent to email. Check inbox/spam.");
  }
}


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

