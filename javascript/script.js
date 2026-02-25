async function createOrganization() {

  const orgName = document.getElementById("organizationName").value;
  const orgCode = document.getElementById("organizationCode").value;

  if(!orgName || !orgCode){
    alert("Please fill required fields") ;
    return ;
  }

  // 1️⃣ Get session
  const { data: { session } } = await supabaseClient.auth.getSession();
  console.log(session) ;

  const adminName = session.user.user_metadata.full_name;

  if (!session) {
    alert("Please login first");
    return;
  }

  // 2️⃣ Call Edge Function
  const response = await fetch(
    "https://pbcnboxtlrymczzpppyl.supabase.co/functions/v1/create-organisation",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        org_name: orgName,
        org_code: orgCode,
        admin_name: adminName
      })
    }
  );

  const result = await response.json();

  if (!response.ok) {
    alert(result.error);
    return;
  }

  alert("Organization created successfully!");

  // 3️⃣ Redirect to dashboard
  window.location.href = "./adminDashboard.html";
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