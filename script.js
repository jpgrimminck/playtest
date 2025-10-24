// Control del spinner al hacer clic en la versión
document.getElementById('version-btn').addEventListener('click', function() {
  const spinner = document.getElementById('spinner');
  spinner.style.display = 'block';

  setTimeout(() => {
    window.location.reload(true);
  }, 1000);
});

/* --------------------------------------------------------------------------
   VARIABLES Y CONSTANTES GLOBALES
-------------------------------------------------------------------------- */
let totalCovers = 0;                 // Total de carátulas (se cargará dinámicamente)
const coversConGuitarra = [9, 10, 62];    // Índices que poseen audio sin guitarra

// Variables de carpetas
const folders = {
  1: 'songs',   // Audios
  2: 'covers'   // Miniaturas
};

// Metadatos de canciones (se cargará dinámicamente desde covers.json)
let metadatos = {};

/* --------------------------------------------------------------------------
   CARGAR METADATOS DESDE covers.json
-------------------------------------------------------------------------- */
async function cargarMetadatos() {
  try {
    const response = await fetch('json/covers.json');
    const data = await response.json();
    totalCovers = data.totalCovers;
    metadatos = data.covers.reduce((acc, cover) => {
      acc[cover.id] = { nombre: cover.nombre, artista: cover.artista };
      return acc;
    }, {});

    generarMiniaturas(); // Primero genera todas las miniaturas
    
    // Después de generar las miniaturas, intentar posicionar la miniatura si viene songId de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const songIdFromUrl = urlParams.get('song');
    if (songIdFromUrl) {
      console.log(`ID de la canción desde la URL (procesando en cargarMetadatos): ${songIdFromUrl}`);
      posicionarMiniatura(songIdFromUrl); // Llamar a posicionarMiniatura AQUÍ
    }
  } catch (error) {
    console.error('Error al cargar los metadatos:', error);
  }
}

/* --------------------------------------------------------------------------
   GENERAR MINIATURAS DINÁMICAMENTE
-------------------------------------------------------------------------- */
function generarMiniaturas() {
  for (let i = totalCovers; i >= 1; i--) {
    const btn = document.createElement('button');
    btn.className = 'miniatura';
    btn.setAttribute('data-label', i);
    btn.style.backgroundImage = `url('${folders[2]}/cover${i}.jpeg')`;
    btn.onclick = () => selectAudio(`${i}.mp3`, `cover${i}.jpeg`, metadatos[i]);
    miniaturasContainer.appendChild(btn);
  }
}

/* --------------------------------------------------------------------------
   ELEMENTOS DEL DOM
-------------------------------------------------------------------------- */
const miniaturasContainer = document.getElementById('miniaturasContainer');
const nombreCancionEl     = document.getElementById('nombreCancion');
const artistaEl           = document.getElementById('artista');
const audio               = document.getElementById('audio');
const audioAlt            = document.getElementById('audioAlt');
const guitarraBtn         = document.getElementById('guitarraBtn');
const playPauseBtn        = document.getElementById('playPause');
const icon                = document.getElementById('icon');
const cover               = document.getElementById('cover');
const seekBar             = document.getElementById('seekBar');

/* Estado de audio actual */
let currentAudio = audio;
let isAlt        = false;             // ¿Estamos usando audio alternativo?
const endedState = { value: false };  // ¿La pista terminó?

/* --------------------------------------------------------------------------
   FUNCIONES PRINCIPALES
-------------------------------------------------------------------------- */
function selectAudio (filename, coverImage, metadata) {
  if (currentAudio && !currentAudio.paused) currentAudio.pause();

  audio.src = `${folders[1]}/${filename}`;
  cover.style.backgroundImage = `url('${folders[2]}/${coverImage}')`;

  nombreCancionEl.textContent = metadata.nombre;
  artistaEl.textContent       = metadata.artista;

  localStorage.setItem('selectedAudio',   `${folders[1]}/${filename}`);
  localStorage.setItem('selectedCover',   `${folders[2]}/${coverImage}`);
  localStorage.setItem('selectedNombre',  metadata.nombre);
  localStorage.setItem('selectedArtista', metadata.artista);

  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title:  metadata.nombre,
      artist: metadata.artista,
      artwork:[{ src: `${folders[2]}/${coverImage}`, sizes:'512x512', type:'image/jpeg' }]
    });
    navigator.mediaSession.setActionHandler('play',  () => { togglePlay(); });
    navigator.mediaSession.setActionHandler('pause', () => { currentAudio.pause(); setIcon('play'); });
  }

  const coverIndex = parseInt(filename.match(/(\d+)\.mp3/)[1], 10);
  if (coversConGuitarra.includes(coverIndex)) {
    guitarraBtn.style.display = 'flex';
    guitarraBtn.disabled      = true;
    guitarraBtn.style.filter  = 'grayscale(100%)';
    guitarraBtn.style.opacity = '0.6';
    guitarraBtn.classList.remove('active');

    audioAlt.src = `${folders[1]}/` + filename.replace('.mp3','_sg.mp3');
    audioAlt.preload = 'auto';
    audioAlt.load();
    audioAlt.addEventListener('canplaythrough', () => {
      guitarraBtn.disabled     = false;
      guitarraBtn.style.filter = 'none';
      guitarraBtn.style.opacity= '1';
    }, {once:true});
  } else {
    guitarraBtn.style.display = 'none';
  }

  currentAudio = audio;
  currentAudio.load();
  seekBar.value = 0;
  seekBar.max   = 1;
  endedState.value = false;
  setIcon('play');
}

function togglePlay() {
  if (!currentAudio.src) return;

  // Si terminó, al tocar debemos reiniciar y reproducir
  if (endedState.value) {
    currentAudio.currentTime = 0;
    seekBar.value = 0;
    endedState.value = false;
  } else {
    // Sincroniza con el slider antes de reproducir
    currentAudio.currentTime = parseFloat(seekBar.value);
  }

  if (currentAudio.paused) {
    const playPromise = currentAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => console.error("Error playing audio:", error));
    }
  } else {
    currentAudio.pause();
    setIcon('play');
  }
}

function setIcon (state) {
  if (state === 'play') {
    icon.className = 'icon play-icon';
    icon.innerHTML = '';
  } else if (state === 'pause') {
    icon.className = 'pause-icon';
    icon.innerHTML = '<div></div><div></div>';
  } else if (state === 'replay') {
    icon.className = 'replay-icon';
    icon.innerHTML = '↻';
  } else {
    // fallback
    icon.className = 'icon play-icon';
    icon.innerHTML = '';
  }
}

[audio, audioAlt].forEach(aud => {
  aud.addEventListener('timeupdate', e => {
    if (!isNaN(e.target.duration)) {
      seekBar.max   = Math.floor(e.target.duration);
      seekBar.value = Math.floor(e.target.currentTime);
    }
  });
  aud.addEventListener('ended', () => {
    endedState.value = true;
    setIcon('replay');
  });
  aud.addEventListener('playing', () => {
    endedState.value = false;
    setIcon('pause');
  });
});

seekBar.addEventListener('input', () => {
  if (endedState.value) {
    // Si el usuario mueve el slider después de terminar, volvemos a estado listo para play
    endedState.value = false;
    if (currentAudio.paused) setIcon('play');
  }
  currentAudio.currentTime = seekBar.value;
});

playPauseBtn.addEventListener('click', togglePlay);

guitarraBtn.addEventListener('click', () => {
  const savedAudio = localStorage.getItem('selectedAudio');
  const coverIndex = parseInt(savedAudio.match(/(\d+)\.mp3/)[1], 10);
  if (!coversConGuitarra.includes(coverIndex)) return;

  const time    = currentAudio.currentTime;
  const playing = !currentAudio.paused;

  guitarraBtn.classList.toggle('active');
  isAlt = guitarraBtn.classList.contains('active');
  localStorage.setItem('isAlt', isAlt.toString());

  currentAudio.pause();
  currentAudio = isAlt ? audioAlt : audio;
  currentAudio.currentTime = time;
  if (playing) currentAudio.play();
});

window.addEventListener('DOMContentLoaded', () => {
  cargarMetadatos(); // Esto ahora también se encargará del posicionamiento inicial de la miniatura

  const savedAudio   = localStorage.getItem('selectedAudio')   || `${folders[1]}/1.mp3`;
  const savedCover   = localStorage.getItem('selectedCover')   || `${folders[2]}/cover1.jpeg`;
  const savedNombre  = localStorage.getItem('selectedNombre')  || '';
  const savedArtista = localStorage.getItem('selectedArtista') || '';
  const savedIsAlt   = localStorage.getItem('isAlt') === 'true';

  cover.style.backgroundImage = `url('${savedCover}')`;
  nombreCancionEl.textContent = savedNombre;
  artistaEl.textContent       = savedArtista;
  audio.src = savedAudio;

  const coverIndex = parseInt(savedAudio.match(/(\d+)\.mp3/)[1], 10);
  guitarraBtn.style.display = coversConGuitarra.includes(coverIndex) ? 'flex' : 'none';

  if (coversConGuitarra.includes(coverIndex) && savedIsAlt) {
    isAlt        = true;
    guitarraBtn.classList.add('active');
    currentAudio = audioAlt;
  } else {
    isAlt        = false;
    currentAudio = audio;
  }

  if (coversConGuitarra.includes(coverIndex)) {
    audioAlt.src = savedAudio.replace('.mp3', '_sg.mp3'); 
    audioAlt.preload = 'auto';
    audioAlt.load();
  }

  audio.addEventListener('loadedmetadata', () => {
    seekBar.max = currentAudio.duration;
    seekBar.value = 0;
    endedState.value = false;
    setIcon('play');
  });

  audio.addEventListener('timeupdate', () => {
    if (!isNaN(currentAudio.duration)) {
      seekBar.value = currentAudio.currentTime;
    }
  });

  /* Mostrar el botón de detalles */
  const detailsArrow = document.getElementById('detailsArrow');
  detailsArrow.classList.add('show');

  /* Manejar clic en el botón de detalles */
  detailsArrow.addEventListener('click', () => {
    const currentSongId = currentAudio.src.split('/').pop().replace('.mp3', '').replace('_sg', '');
    const currentTime = currentAudio.currentTime;
    const currentCover = `${folders[2]}/cover${currentSongId}.jpeg`;

    const params = new URLSearchParams({
      song: currentSongId,
      cover: currentCover,
      title: nombreCancionEl.textContent,
      audio: `${folders[1]}/${currentSongId}.mp3`,
      time: currentTime
    });

    window.location.href = `html/details.html?${params.toString()}`;
  });

  window.addEventListener('beforeunload', () => {
    localStorage.setItem('audioCurrentTime', currentAudio.currentTime.toString());
  });
});

// Función para posicionar la miniatura en la tercera posición
function posicionarMiniatura(songId) {
  const miniaturasContainer = document.getElementById('miniaturasContainer'); 
  if (!miniaturasContainer) {
    console.error("miniaturasContainer no encontrado");
    return;
  }
  const miniaturas = Array.from(miniaturasContainer.children);

  if (miniaturas.length === 0) {
    console.warn("No hay miniaturas en el contenedor para posicionar.");
    return;
  }

  const targetFileName = `cover${songId}.jpeg`; 

  const targetMiniatura = miniaturas.find((miniatura) => {
    const backgroundImage = miniatura.style.backgroundImage;
    
    console.log("Comparando valores:");
    console.log("backgroundImage:", backgroundImage);
    console.log("targetFileName:", targetFileName);

    const fileNameMatch = backgroundImage.match(/cover\d+\.jpeg/); 
    return fileNameMatch && fileNameMatch[0] === targetFileName;
  });

  if (targetMiniatura) {
    const miniaturaHeight = targetMiniatura.offsetHeight;
    const targetScrollTop = targetMiniatura.offsetTop - miniaturaHeight * 2; 
    
    // Aplicar el scrollTop con un pequeño retraso para asegurar que el DOM esté listo
    setTimeout(() => {
      miniaturasContainer.scrollTop = Math.max(0, targetScrollTop);
      console.log(`Miniatura con archivo ${targetFileName} posicionada en la tercera posición. ScrollTop aplicado: ${miniaturasContainer.scrollTop}`);
    }, 50); 

  } else {
    console.log(`No se encontró la miniatura con archivo ${targetFileName}.`);
  }
}

//aliya test
