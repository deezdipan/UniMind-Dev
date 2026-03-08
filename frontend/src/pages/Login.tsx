import React from "react";
import { useAuth0 } from "@auth0/auth0-react";

const Login: React.FC = () => {
  const { loginWithRedirect } = useAuth0();

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-sage-50 via-lavender-50 to-gold-50 flex flex-col items-center justify-center p-6">
      
      <div className="bg-white/70 backdrop-blur-md shadow-xl rounded-3xl p-10 max-w-md w-full text-center border border-sage-200">
        <div className="text-5xl mb-4">🧠</div>

        <h1 className="text-4xl font-bold text-sage-800 mb-4">
          Welcome to UniMind
        </h1>

        <p className="text-sage-600 mb-8 text-lg leading-relaxed">
          Your AI-powered mental wellness companion.
          <br />
          You're not alone — we're here to support you 💜
        </p>

        <button
          onClick={() => loginWithRedirect()}
          className="px-6 py-3 bg-lavender-500 text-white text-lg rounded-xl shadow-md hover:bg-lavender-600 active:scale-95 transition-all duration-150"
        >
          Log In / Sign Up
        </button>
      </div>

      <p className="mt-6 text-sm text-sage-600">
        Designed with care for college students ✨
      </p>
    </div>
  );
};

export default Login;
