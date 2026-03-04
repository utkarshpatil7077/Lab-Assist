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
        location.replace("adminDashboard.html") ;
    }
}