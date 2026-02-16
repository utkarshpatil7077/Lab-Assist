function sendOTP(){
    const name = document.getElementById("AdminName").value.trim() ;
    const email = document.getElementById("email").value.trim();
    document.getElementById("otpBtn").disabled = true ;

    if(!email || !name){
        alert("Please fill valid informstion");
        return ;
    }
    else {
        lockCreateOrgUI("loadingOTP" ,"otpBtn");
        console.log("At First Email : " + email) ;
        try{
            sendToMailOTP(email) ;
        }catch(err){
            alert(err.message) ;
            unlockCreateOrgUI("loadingOTP" ,"otpBtn");
        }
        document.getElementById("otpInput").required = true;
    }
}

function showCircleLoader(loadingBar , button) {
  document.getElementById(loadingBar).classList.remove("hidden");
  //document.getElementById(button).classList.add("hidden");
}

function hideCircleLoader(loadingBar , button) {
  document.getElementById(loadingBar).classList.add("hidden");
  //document.getElementById(button).classList.remove("hidden");
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
    unlockCreateOrgUI("loadingOTP" ,"otpBtn");
    console.log
    document.getElementById("otpHidden").classList.remove("hidden");
  } else {
    alert(data.error);
    console.log(error) ;
    return data.error ;
  }
}

function verifySendOTP(){
    const otp = document.getElementById("otpInput").value.trim();
    showCircleLoader("loadingSubmit" ,"otpSubmmit") ;
    if(!otp){
        alert("Please enter OTP");
    }
    else{
        try{
            verifyOTP(email , otp) ;
        }
        catch(err){
            alert(err.message) ;
        }
    }
}

async function verifyOTP(email, otpInput) {
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
    document.getElementById("password").classList.remove("hidden") ;
    showCircleLoader("loadingSubmit" ,"otpSubmmit") ;
  } else {
    console.log("Error : "+data.error) ;
    document.getElementById("password").classList.remove("hidden") ;
    showCircleLoader("loadingSubmit" ,"otpSubmmit") ;
    alert(data.error);
  }
}
//----------------- Lock/Unlock UI -----------------
function lockCreateOrgUI(loadingBar , btn) {
  showCircleLoader(loadingBar,btn);
  const form = document.querySelector("form");
  form.querySelectorAll("input").forEach(el => el.disabled = true);
  form.querySelectorAll("label").forEach(label => label.classList.add("opacity-60", "cursor-not-allowed"));
  const button = document.getElementById(btn);
  //button.disabled = true;
  button.classList.add("opacity-70", "cursor-not-allowed");
}

function unlockCreateOrgUI(loadingBar , btn) {
  hideCircleLoader(loadingBar , btn);
  const form = document.querySelector("form");
  form.querySelectorAll("input").forEach(el => el.disabled = false);
  form.querySelectorAll("label").forEach(label => label.classList.remove("opacity-60", "cursor-not-allowed"));
  const button = document.getElementById(btn);
  //button.disabled = false;
  button.classList.remove("opacity-70", "cursor-not-allowed");
}

function redirect(){
  
}