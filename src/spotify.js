const clientId = "97e3e4ad6970461387f0e30af6da7e93";
const params = new URLSearchParams(window.location.search);
const code = params.get("code");

const replaceAccents = (s) => {
  let r = s.toLowerCase();
  r = r.split("-")[0].trim();
  r = r.split("/")[0].trim();
  r = r.replace(new RegExp("ao vivo", "g"), "");
  r = r.replace(new RegExp("pout pourri:", "g"), "");
  r = r.replace(new RegExp("[àáâã]", "g"), "a");
  r = r.replace(new RegExp("ç", "g"), "c");
  r = r.replace(new RegExp("[èéê&]", "g"), "e");
  r = r.replace(new RegExp("[ìíî]", "g"), "i");
  r = r.replace(new RegExp("[òóôõ]", "g"), "o");
  r = r.replace(new RegExp("[ùúûü]", "g"), "u");
  r = r.replace(new RegExp("[()+,.?!]", "g"), "");
  r = r.replace(new RegExp("grupo", "g"), "");
  r = r.replace(new RegExp("exaltasamba", "g"), "exaltasamba musicas");
  
  r = r.replace(new RegExp("\\s\\s", "g"), "");
  r = r.trim();

  r = r.replace(new RegExp("\\s", "g"), "-");
  return r;
};

if (!code) {
  redirectToAuthCodeFlow(clientId);
} else {
  const accessToken = await getAccessToken(clientId, code);
  const playlists = [
    "37i9dQZF1DXchBFvKSUooB",
    "37i9dQZF1DWWWv7yywepel",
    "37i9dQZF1DXcIuKvbG2Dm8",
    "37i9dQZF1DXb1oSegSL8id",
    "37i9dQZF1DZ06evO42FdPq",
    "37i9dQZF1DWX4CmhTadwuL",
  ];

  let allSongs = [];

  for await (const playlist of playlists) {
    const { items } = await fetchSongs(accessToken, playlist);
    console.log({ items });
    allSongs = [...allSongs, ...items];
  }

  const songList = allSongs.reduce((acc, { track }) => {
    const artist = replaceAccents(track.artists[0].name);
    const song = replaceAccents(track.name);
    const currentSong = acc[artist];
    const data = {
      artist,
      ...currentSong,
      songs: [
        ...(currentSong && currentSong.songs.length ? currentSong.songs : []),
        song,
      ],
    };

    return {
      ...acc,
      [artist]: data,
    };
  }, {});

  console.log({ songList });

  const base64 = btoa(
    unescape(encodeURIComponent(JSON.stringify(Object.values(songList))))
  );

  try {
    const data = `data:application/octet-stream;charset=utf-16le;base64,${base64}`;
    const el = document.createElement("a");
    el.setAttribute("href", data);
    el.innerHTML = "download";
    document.body.appendChild(el);
  } catch (error) {
    console.log(playlist, error);
  }

  console.log({ allSongs });
}

async function redirectToAuthCodeFlow(clientId) {
  const verifier = generateCodeVerifier(128);
  const challenge = await generateCodeChallenge(verifier);

  localStorage.setItem("verifier", verifier);

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("response_type", "code");
  params.append("redirect_uri", "http://localhost:8080");
  params.append("scope", "user-read-private user-read-email");
  params.append("code_challenge_method", "S256");
  params.append("code_challenge", challenge);

  document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

function generateCodeVerifier(length) {
  let text = "";
  let possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function generateCodeChallenge(codeVerifier) {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);

  return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function getAccessToken(clientId, code) {
  const verifier = localStorage.getItem("verifier");

  console.log({ clientId, code, verifier });

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("grant_type", "authorization_code");
  params.append("code", code);
  params.append("redirect_uri", "http://localhost:8080");
  params.append("code_verifier", verifier);

  let result;
  try {
    result = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
  } catch (error) {
    console.log(error);
    throw new Error(error);
  }

  const { access_token } = await result.json();
  return access_token;
}

async function fetchProfile(token) {
  const result = await fetch("https://api.spotify.com/v1/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  return await result.json();
}

async function fetchSongs(token, playlist_id) {
  console.log(playlist_id);
  const result = await fetch(
    `https://api.spotify.com/v1/playlists/${playlist_id}/tracks?fields=items(track(name, artists(name)))`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return await result.json();
}
