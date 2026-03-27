async function redirectPage(){
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    if (!username || !password){
        alert("Please enter username and password")
    }
    else{
      console.log(username) ;
      console.log(password) ;
        const {data , error} = await supabaseClient.auth.signInWithPassword({
            email: username,
            password: password
        });
        if (error) {
            alert("Login Failed: " + error.message);
            return;
        }

        alert("Login Successful!");
        loadRole() ;
    }
}

async function loadRole() {

    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
        console.error(error);
        alert("Failed to get session");
        return;
    }

    const session = data.session;

    if (!session) {
        alert("User session not found. Please login again.");
        return;
    }

    const response = await fetch(
        "https://pbcnboxtlrymczzpppyl.supabase.co/functions/v1/get-user-profile",
        {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${session.access_token}`,
                "Content-Type": "application/json"
            }
        }
    );

    const result = await response.json();

    console.log(result);

    sessionStorage.setItem("organizationID", result.profile.organization_id);
    sessionStorage.setItem("departmentID", result.profile.department_id);
    console.log(sessionStorage);

    if (result.role === "ADMIN") {
        location.replace("adminDashboard.html");
    }

    if (result.role === "TECHNICIAN") {
        location.replace("technicianDashboard.html");
    }

    if (result.role === "STUDENT") {
        location.replace("userDashboard.html");
    }
}