import React from "react";
import { Clock, Quote } from "lucide-react";
import { color, delay, easeIn, motion } from "framer-motion";
import { Link } from "react-router-dom";
import "@fontsource/sora";
import {
  LucideBatteryMedium,
  WifiIcon,
  Volume1,
  Bluetooth,
  Search,
  Headphones,
  Smile,
  Hand,
  AppWindowIcon,
  DollarSign,
} from "lucide-react";
import { useEffect, useState } from "react";

function LandingPage() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, []);

  const hour = time.getHours().toString().padStart(2, "0");
  const minutes = time.getMinutes().toString().padStart(2, "0");
  // day of month (getDate) — getDay returns weekday index (0-6)
  const formatedDay = time.getDate().toString().padStart(2, "0");
  const formatedMonth = time.toLocaleDateString("en-US", {
    month: "long",
  });
  const formatedWeekDay = time.toLocaleDateString("en-US", {
    weekday: "long",
  });

  return (
    <>
      <motion.div
        animate={{ opacity: [1, 0, 0, 0, 0, 1, 0, 1, 1] }}
        transition={{ duration: 1, delay: 1.5 }}
        className="landing-page-container"
      >
        <div className="lp-columns">
          <motion.div
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 2.5 }}
            className="top-icons-par"
          >
            <Headphones size={15} className="top-icons-mob"></Headphones>
            <Bluetooth size={15} className="top-icons-mob"></Bluetooth>
            <Volume1 size={15} className="top-icons-mob"></Volume1>
            <WifiIcon size={15} className="top-icons-mob"></WifiIcon>
            <LucideBatteryMedium
              size={18}
              className="top-icons-mob"
            ></LucideBatteryMedium>
          </motion.div>
          {hour &&
            minutes &&
            formatedDay &&
            formatedMonth &&
            formatedWeekDay && (
              <div>
                <div className="day-container">
                  <motion.div
                    initial={{ opacity: 0, x: -100, scale: 0.8 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{
                      duration: 0.7,
                      type: easeIn,
                      delay: 5,
                    }}
                    className="clock-container"
                  >
                    <motion.div
                      initial={{ opacity: 0, x: -50, scale: 0.8 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      transition={{
                        duration: 0.7,
                        type: easeIn,
                        delay: 5.5,
                      }}
                    >
                      {hour} : {minutes}
                    </motion.div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      duration: 0.7,
                      type: easeIn,
                      delay: 4,
                    }}
                    className="formatted-month"
                  >
                    {formatedMonth}
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      transform: "rotate(-90deg)",
                    }}
                    transition={{
                      duration: 0.7,
                      type: easeIn,
                      delay: 4,
                    }}
                    className="formatted-week-day"
                  >
                    {formatedWeekDay}
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      duration: 0.7,
                      type: easeIn,
                      delay: 3,
                    }}
                    className="formated-day"
                  >
                    {formatedDay}
                  </motion.div>
                </div>
              </div>
            )}
        </div>
        <div className="lp-columns">
          <motion.div
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, type: easeIn }}
            className="lp-texts"
          >
            <p>
              {"...and We don't stop till it's done. See you at the Top.  "}
              <Quote className="quote-icon"></Quote>
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, type: easeIn }}
            className="lp-texts"
          >
            <p>
              Hi There !! <Hand size={17}></Hand> ,
              {"Welcome to Mi Dairy glad to see you here "}
              <Smile size={17}> </Smile>. Click the app icon to proceed...
            </p>
          </motion.div>
        </div>

        <div className="lp-columns">
          <div className="lp-col-3-rows">
            <Link to={"/MiD/Home"}>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.7, type: easeIn, delay: 1.5 }}
                className="app-icon"
              >
                <AppWindowIcon></AppWindowIcon>
                <span className="app-name">
                  M <span className="app-name-i">i</span> D
                </span>
              </motion.div>
            </Link>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 2.5 }}
            className="lp-col-3-rows"
          ></motion.div>
        </div>
      </motion.div>
    </>
  );
}

export default LandingPage;
