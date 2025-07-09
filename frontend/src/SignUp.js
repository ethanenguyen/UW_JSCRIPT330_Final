import React, { useState } from "react";
import config from "./config";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate(); // Initialize navigation

  const handleSignup = async (e) => {
    e.preventDefault();
    try {

      const response = await axios.post(
        `http://localhost:${config.backend_port}/auth/signup`,
        { email, password });
      if (response.status === 200) {
         const username = email.split("@")[0]; // Extract username from email
            setMessage("Registration successful!");
            setTimeout(() => navigate(`/chatbot?user=${username}`), 2000); 
      }
    } catch (error) {
      if (error.response.status === 400) setMessage("Invalid input!");
      if (error.response.status === 409) setMessage("User already exists!");
    }
  };

  return (
    <div>
      <h2>Sign Up</h2>
      <form onSubmit={handleSignup}>
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
        <button type="submit">Sign Up</button>
      </form>
      <p>{message}</p>
    </div>
  );
};

export default Signup;