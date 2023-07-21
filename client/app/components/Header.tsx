"use client";
import Link from "next/link";
import Image from "next/image";
import { MdLightMode } from "react-icons/md";
import { FaMoon } from "react-icons/fa";
import { useEffect, useState } from "react";
import { setLocalTheme, getTheme } from "../utils/theme";

const Header = () => {
  const [theme, setTheme] = useState<"dark" | "light" | undefined>(undefined);

  useEffect(() => {
    const initialTheme = getTheme();
    setTheme(initialTheme);
  }, []);

  const toggleLight = () => {
    setTheme(prevTheme => (prevTheme === "dark" ? "light" : "dark"));
  };

  useEffect(() => {
    if (theme !== undefined) {
      setLocalTheme(theme);
    }
  }, [theme]);

  return (
    <div className="sticky top-0 z-50 dark:text-blue-500 ">
      <nav className="navbar navbar-expand-lg shadow-md py-2 relative flex items-center w-full justify-between bg-white dark:bg-[#212936]">
        <div className="px-6 w-full flex flex-wrap item-center justify-between ">
          <div className="grow flex justify-between items-center p-2">
            <Link
              className="flex justify-start items-center space-x-3"
              href="/"
            >
              <Image
                src="/logo.svg"
                alt="logo"
                width={30}
                height={30}
                className="cursor-pointer"
              />
              <span className="invisible md:visible text-blue-500 ">DAO</span>
            </Link>
            <div className="flex justify-center items-center space-x-3">
              {theme === "dark" ? (
                <MdLightMode
                  className="cursor-pointer text-blue-500"
                  size={30}
                  onClick={toggleLight}
                />
              ) : (
                <FaMoon
                  className="cursor-pointer text-blue-500"
                  size={30}
                  onClick={toggleLight}
                />
              )}

              <button className="px-4 py-2.5 bg-blue-600 font-medium text-sm leading-tight uppercase rounded-full text-white shadow-md shadow-gray-400 active:bg-blue-800 dark:shadow-transparent hover:bg-blue-700 transition duration-150 ease-in-out dark:text-blue-500 dark:border dark:border-blue-500 dark:bg-transparent">
                Connect Wallet
              </button>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Header;
