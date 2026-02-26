async function redirectPage(){
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    if (!username || !password){
        alert("Please enter username and password")
    }
    else{
        const {data , error} = await supabaseClient.auth.signInWithPassword({
            email: username,
            password: password
        });
        if (error) {
            alert("Login Failed: " + error.message);
            return;
        }

        alert("Login Successful!");
        checkUserRole();
    }
}

async function checkUserRole() {
  const { data: { user } } = await supabaseClient.auth.getUser();

  if (!user) {
    alert("User not found!");
    return;
  }

  const { data, error } = await supabaseClient
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error) {
    alert("Error fetching role");
    return;
  }

  if (data.role === "admin") {
    window.location.href = "adminDashboard.html";
  } else if (data.role === "technician") {
    window.location.href = "technicianDashboard.html";
  } else {
    window.location.href = "studentDashboard.html";
  }
}