//----------------- OTP / Magic Link Verification -----------------
async function verifyOTP(event) {
  event.preventDefault();
  lockCreateOrgUI();

  try {
    window.organizationName = document.getElementById("organizationName").value.trim();
    window.organizationCode = document.getElementById("organizationCode").value.trim();
    window.Username = document.getElementById("name").value.trim();
    window.email = document.getElementById("email").value.trim();
    window.level = document.getElementById("level").value;

    // Basic email check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(window.email)) {
      alert("Invalid email address");
      unlockCreateOrgUI();
      return;
    }

    if (!window.organizationName || !window.organizationCode || !window.Username || !window.email || !window.level) {
      alert("All fields are required");
      unlockCreateOrgUI();
      return;
    }

    // ✅ All validations passed — send OTP / magic link
    await sendOTPToEmail(window.email);

  } catch (err) {
    unlockCreateOrgUI();
    alert("Something went wrong: " + err.message);
  }
}

//----------------- Lock/Unlock UI -----------------
function lockCreateOrgUI() {
  showCircleLoader();
  const form = document.querySelector("form");
  form.querySelectorAll("input, select").forEach(el => el.disabled = true);
  form.querySelectorAll("label").forEach(label => label.classList.add("opacity-60", "cursor-not-allowed"));
  const btn = document.getElementById("otpButton");
  btn.disabled = true;
  btn.classList.add("opacity-70", "cursor-not-allowed");
}

function unlockCreateOrgUI() {
  hideCircleLoader();
  const form = document.querySelector("form");
  form.querySelectorAll("input, select").forEach(el => el.disabled = false);
  form.querySelectorAll("label").forEach(label => label.classList.remove("opacity-60", "cursor-not-allowed"));
  const btn = document.getElementById("otpButton");
  btn.disabled = false;
  btn.classList.remove("opacity-70", "cursor-not-allowed");
}

//----------------- Show / Hide Loader -----------------
function showCircleLoader() {
  document.getElementById("otpBtnText").classList.add("hidden");
  document.getElementById("circleLoaderOTP").classList.remove("hidden");
}

function hideCircleLoader() {
  document.getElementById("otpBtnText").classList.remove("hidden");
  document.getElementById("circleLoaderOTP").classList.add("hidden");
}

//----------------- Send Magic Link / OTP -----------------
async function sendOTPToEmail(email) {
  try {
    const { error } = await window.supabaseClient.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin + "/createOrganization.html?type=magiclink"
      }
    });

    if (error) throw error;
    alert("OTP link sent to email. Check inbox/spam.");

  } catch (err) {
    alert("Failed to send OTP: " + err.message);
    unlockCreateOrgUI();
  }
}

//----------------- After Magic Link / Email Confirmation -----------------
(async () => {
  const { data: { session } } = await window.supabaseClient.auth.getSession();
  const urlParams = new URLSearchParams(window.location.search);
  const type = urlParams.get('type');

  if (session && type === "magiclink") {
    document.getElementById("password").classList.remove("hidden");
    await storeData(session);
  }
})();

//----------------- Call Edge Function -----------------
async function storeData(session) {
  try {
    const levelValue = document.getElementById("level").value;
    let role = levelValue === "Organization Admin" ? "ORG_ADMIN" : "DEPT_ADMIN";

    const accessToken = session.access_token;
    console.log("DEBUG: Org Name:", document.getElementById("organizationName")?.value);
console.log("DEBUG: Org Code:", document.getElementById("organizationCode")?.value);
console.log("DEBUG: Admin Name:", document.getElementById("name")?.value);


    const response = await fetch("https://pbcnboxtlrymczzpppyl.supabase.co/functions/v1/create-organisation", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        org_name: document.getElementById("organizationName").value.trim(),
        org_code: document.getElementById("organizationCode").value.trim(),
        admin_name: document.getElementById("name").value.trim()
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to create organization");
    }

    console.log("✅ Organization created with ID:", data.organization_id);
    alert("Organization and admin created successfully!");

  } catch (err) {
    console.error("Edge Function Error:", err);
    alert("Failed to store data: " + err.message);
  } finally {
    unlockCreateOrgUI();
  }
}

//----------------- Google Sign-In Integration -----------------
async function loginWithGoogle() {
  try {
    const { data, error } = await window.supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/createOrganization.html?type=magiclink"
      }
    });

    if (error) throw error;

    // After redirect & confirmation, store data will be called automatically
  } catch (err) {
    alert(err.message);
    console.error(err);
  }
}
