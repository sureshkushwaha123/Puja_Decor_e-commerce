import React from "react";
import { assets } from "../assets/assets";
import { Link } from "react-router-dom";

const MainBanner = () => {
  return (
    <section className="relative w-full overflow-hidden rounded-2xl bg-white shadow-sm mt-26 sm:mt-30">

  {/* Background */}
  <img
    src={assets.main_banner_bg1}
    alt="banner"
    className="hidden md:block w-full h-full object-cover"
  />
  <img
    src={assets.main_banner_bg_sm}
    alt="banner"
    className="md:hidden w-full h-full object-cover"
  />

  {/* Overlay */}
  <div className="absolute inset-0 bg-gradient-to-r from-[#FFF8F2]/95 via-[#FFF8F2]/85 to-transparent"></div>

  {/* Content */}
  <div className="absolute inset-0 flex flex-col justify-center items-center md:items-start px-5 sm:px-10 md:px-14 lg:px-20">

    <h1 className="font-semibold text-[#2B1B1B] tracking-tight
      text-[1.9rem] sm:text-[2.6rem] md:text-[3.1rem] lg:text-[3.6rem]
      leading-[1.15] max-w-full sm:max-w-[85%] md:max-w-[680px]
      text-center md:text-left">
      From <span className="text-primary font-bold">cozy cushions</span> to{" "}
      <span className="text-primary font-bold">festive lights</span>
      <br className="hidden sm:block" />
      find pieces that make your home{" "}
      <span className="italic text-primary-dull">uniquely yours</span>.
    </h1>

    <div className="flex flex-col sm:flex-row items-center md:items-start gap-4 sm:gap-6 mt-8">
      <Link to="/products" className="px-9 py-3 bg-primary hover:bg-primary-dull rounded-full text-white shadow-lg">
        Shop Now →
      </Link>
    </div>

  </div>
</section>

  );
};

export default MainBanner;
