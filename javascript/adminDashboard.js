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
