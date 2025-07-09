import React, { useState } from "react";
import config from "./config";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
    const navigate = useNavigate(); // Initialize navigation

  const handleLogin = async (e) => {
    e.preventDefault();
    // Add your login API call here.
    try {
          const response = await axios.post(
            `http://localhost:${config.backend_port}/auth/login`,
            { email, password });
          if (response.status === 200) {
            const token = response.data.token;
            localStorage.setItem("authToken", token); // Store token securely

            const username = email.split("@")[0]; // Extract username from email
            setMessage("Login successful!");
            setTimeout(() => navigate(`/chatbot?user=${username}&token=${token}`), 2000);
          }

        } catch (error) {
        if (error.response && error.response.status === 400) {
            setMessage("Invalid input!");
        } else if (error.response && error.response.status === 401) {
            setMessage("User does not exist or bad password");
        } else {
          setMessage("Can not login.  Try later!");
        }
      }
    console.log("Login with:", email);
  };

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Login</button>
      </form>
      <p style={{ color: message.includes("successful") ? "green" : "red" }}>{message}</p>
    </div>
  );
};

export default Login;