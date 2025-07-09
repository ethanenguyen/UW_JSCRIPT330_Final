// import React from "react";
import { Link } from "react-router-dom";


const LandingPage = () => {
  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Welcome to RAG Chatbot</h1>
      <p>Your AI-powered chatbot assistant.</p>

      <Link to="/signup">
        <button>Sign Up</button>
      </Link>
      
      <Link to="/login">
        <button>Login</button>
      </Link>
    </div>
  );
};

export default LandingPage;