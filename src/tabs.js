const wrapTabs = () => {
  const col1 = document.getElementsByClassName("col1")[0];
  const col2 = document.getElementsByClassName("col2")[0];

  const container = document.createElement("div");
  container.classList.add("tab-container");
  container.appendChild(col1);
  container.appendChild(col2);

  const sibling = document.getElementById("cifra_tom");
  sibling.insertAdjacentElement("afterend", container);
};

const checkbox = document.getElementById("cols");

const updateCols = () => {
  const container = document.getElementsByClassName("tab-container")[0];
  if (!checkbox.checked) {
    container.classList.add("one-col");
  } else {
    container.classList.remove("one-col");
  }
  localStorage.setItem("cols", checkbox.checked);
};

const colsSetting = localStorage.getItem("cols");

checkbox.checked = !!colsSetting;
wrapTabs();
updateCols();

document.getElementsByTagName('a')[0].removeAttribute('href')

checkbox.addEventListener("change", updateCols);
