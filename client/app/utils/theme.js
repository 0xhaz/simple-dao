export const setLocalTheme = theme => {
  localStorage.setItem("theme", theme);
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(theme);
};

export const getTheme = () => {
  const storedTheme = localStorage.getItem("theme");
  if (storedTheme === "dark" || storedTheme === "light") {
    return storedTheme;
  }

  return "light";
};
