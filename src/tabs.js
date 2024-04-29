const checkbox = document.getElementById("cols");

const removeCols = () => {
  const pre = document.querySelectorAll("pre");
  if (!checkbox.checked) {
    pre.forEach((el) => el.removeAttribute("class"));
  } else {
    pre.forEach((el, index) => el.setAttribute("class", "col" + (index + 1)));
  }
  localStorage.setItem("cols", checkbox.checked);
};

const colsSetting = localStorage.getItem("cols");

if (!colsSetting) {
  removeCols();
} else {
  checkbox.checked = true;
}

checkbox.addEventListener("change", removeCols);

