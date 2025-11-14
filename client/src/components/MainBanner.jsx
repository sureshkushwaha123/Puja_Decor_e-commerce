import React from "react";
import { assets } from "../assets/assets";
import { Link } from "react-router-dom";

const MainBanner = () => {
  return (
    <section className="relative w-full overflow-hidden rounded-2xl bg-white shadow-sm mt-26 sm:mt-30">

      {/* Background Images */}
      <img
        src={assets.main_banner_bg}
        alt="banner"
        className="hidden md:block w-full object-cover object-center"
      />
      <img
        src={assets.main_banner_bg_sm}
        alt="banner"
        className="md:hidden w-full object-cover object-center"
      />

      {/* Content */}
      <div
        className="
          absolute inset-0 flex flex-col items-center md:items-start justify-end 
          px-5 sm:px-10 md:px-14 lg:px-20 
          py-16 sm:py-16 lg:py-20
        "
      >
        <h1
          className="
            animate-fadeUp 
            font-semibold text-gray-800 tracking-tight
            text-[1.7rem] sm:text-[2.3rem] md:text-[2.8rem] lg:text-[3.2rem] xl:text-[3.6rem]
            leading-[1.2] sm:leading-[1.25] md:leading-[1.2]
            max-w-[95%] sm:max-w-[80%] md:max-w-[650px] lg:max-w-[750px]
            text-center md:text-left
          "
        >
          From{" "}
          <span className="text-primary font-bold">cozy cushions</span> to{" "}
          <span className="text-primary font-bold">festive lights</span> — find
          pieces that make your home{" "}
          <span className="italic text-primary-dull">uniquely yours</span>.
        </h1>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mt-6 md:mt-8 font-medium">
          <Link
            to="/products"
            className="
              group flex items-center gap-2 
              px-7 sm:px-9 md:px-10 py-2.5 sm:py-3 
              bg-primary hover:bg-primary-dull 
              transition-all duration-200 rounded-full 
              text-white text-base sm:text-lg shadow-md
            "
          >
            Shop Now
            <img
              className="transition-transform duration-200 group-hover:translate-x-1"
              src={assets.white_arrow_icon}
              alt="arrow"
            />
          </Link>

          {/* Hidden in mobile view */}
          <Link
            to="/products"
            className="
              hidden sm:flex items-center gap-2 
              px-7 sm:px-9 md:px-10 py-2.5 sm:py-3 
              text-gray-700 hover:text-primary transition-all 
              text-base sm:text-lg
            "
          >
            Explore Deals
            <img
              className="transition-transform duration-200 group-hover:translate-x-1"
              src={assets.black_arrow_icon}
              alt="arrow"
            />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default MainBanner;
