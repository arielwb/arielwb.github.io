window.addEventListener("load", () => {
  renderTabList(tabList);

  const searchInput = document.getElementById("search");

  console.log(tabList);
  searchInput.addEventListener("input", () => {
    const filtered = tabList.reduce((acc, tab) => {
      if (tab.artist.includes(searchInput.value)) {
        acc.push(tab);

        return acc;
      }

      const songs = tab.songs.filter((s) => s.includes(searchInput.value));

      if (songs.length) {
        acc.push({
          ...tab,
          songs,
        });
        return acc;
      }

      return acc;
    }, []);
    renderTabList(filtered);
  });
});

const renderTabList = (data) => {
  const tabs = data
    .map(
      (tab) => `<li>
      <div class="artist">${tab.artist.split("-").join(" ")}</div>
      <ul class="artist-songs">
      ${tab.songs
        .map(
          (song) =>
            `<li class="artist-song"><a href="./tabs/${
              tab.artist
            }/${song}.html">${song.split("-").join(" ")}</a></li>`
        )
        .join("")}
        </ul>
    </li>`
    )
    .join("");
  document.getElementById("tabList").innerHTML = tabs;
};
