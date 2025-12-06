import React from "react";
import LandingPage from "./pages/LandingPage";
import { Route, Routes, useLocation } from "react-router-dom";
import Home from "./MiD/Home";
import CreateAccount from "./MiD/CreateAccount";
import ForgotPassword from "./MiD/ForgotPassword";
import Welcome from "./MiD/Welcome";
import AboutMiD from "./MiD/AboutMiD";
import MyDiary from "./MiD/MyDiary";
import SessionTimeoutModal from "./components/SessionTimeoutModal";
import { useRestoreLastPage } from "./hooks/usePageRestoration";

function App() {
  useRestoreLastPage();

  return (
    <>
      <SessionTimeoutModal />
      <Routes>
        <Route path="/" element={<LandingPage />}></Route>
        <Route path="/MiD/Home" element={<Home />}></Route>
        <Route path="/MiD/CreateAccount" element={<CreateAccount />}></Route>
        <Route path="/MiD/ForgotPassword" element={<ForgotPassword />}></Route>
        <Route path="/MiD/Welcome" element={<Welcome />}></Route>
        <Route path="/MiD/AboutMiD" element={<AboutMiD />}></Route>
        <Route path="/MiD/MyDiary" element={<MyDiary />}></Route>
      </Routes>
    </>
  );
}

export default App;
