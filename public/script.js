document.getElementById("loginForm").addEventListener("submit", async function (e) {
  e.preventDefault(); // stop the page from refreshing

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  // Send to server using fetch
  const response = await fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const data = await response.json();
  alert(data.message); // show success or error
});
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  console.log("Someone is trying to log in with:", username, password);
});
