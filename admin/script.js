document.addEventListener('DOMContentLoaded', () => {
    // Referencias a elementos del DOM (sin cambios)
    const filterForm = document.getElementById('filter-form');
    const songsTbody = document.getElementById('songs-tbody');
    const artistaFilter = document.getElementById('artista-filter');
    const artistaUnicoFilter = document.getElementById('artista-unico-filter');
    const totalCancionesEl = document.getElementById('total-canciones');
    const cancionesPorArtistaEl = document.getElementById('canciones-por-artista');
    const artistasUnicosEl = document.getElementById('artistas-unicos');
    const distribucionTipoEl = document.getElementById('distribucion-tipo');
    const sinLetraEl = document.getElementById('sin-letra');
    const sinDrumsEl = document.getElementById('sin-drums');
    const sinSeccionesEl = document.getElementById('sin-secciones');
    const resetFiltersBtn = document.getElementById('reset-filters');

    let allSongsData = [];
    let currentAudio = null; // Para controlar el audio actual

    // --- 1. CARGA Y PROCESAMIENTO DE DATOS ---

    async function loadAllData() {
        try {
            // ---- MODIFICADO: Rutas ajustadas para salir de la carpeta 'admin' ----
            const [coversRes, lyricsRes, seccionesRes, drumsRes] = await Promise.all([
                fetch('../json/covers.json'),
                fetch('../json/lyrics.json'),
                fetch('../json/secciones.json'),
                fetch('../json/drums.json'),
            ]);

            const coversData = await coversRes.json();
            const lyricsData = await lyricsRes.json();
            const seccionesData = await seccionesRes.json();
            const drumsData = await drumsRes.json();
            
            // Unificar toda la información
            allSongsData = coversData.covers.map(song => processSong(song, lyricsData, seccionesData, drumsData));
            
            // Inicializar el dashboard
            populateFilters(allSongsData);
            displaySongs(allSongsData);
            updateStatistics(allSongsData);

        } catch (error) {
            console.error("Error al cargar los datos:", error);
            songsTbody.innerHTML = `<tr><td colspan="8">Error al cargar los datos. Revisa la consola y asegúrate de que los archivos JSON estén en la raíz del proyecto.</td></tr>`;
        }
    }

    function processSong(song, lyricsData, seccionesData, drumsData) {
        const id = song.id;
        const secciones = seccionesData[id] || [];
        const letra = lyricsData[id] || [];
        
        // Calcular duración
        const lastLyricTime = letra.length > 0 ? letra[letra.length - 1].tiempo : 0;
        const lastSeccionTime = secciones.length > 0 ? secciones[secciones.length - 1].inicio : 0;
        const durationInSeconds = Math.max(lastLyricTime, lastSeccionTime);

        const formatDuration = (sec) => {
            const minutes = Math.floor(sec / 60);
            const seconds = Math.floor(sec % 60).toString().padStart(2, '0');
            return `${minutes}:${seconds}`;
        };

        const getTipoCancion = (tipo) => {
            switch (tipo) {
                case 'y': return 'Youtube';
                case 'i': return 'Inéditas';
                case 'c': return 'Covers';
                default: return 'Desconocido';
            }
        };

        // NOTA: La existencia y cantidad de `docs` todavía es simulada.
        // Un backend podría escanear la carpeta `docs/${id}/` y devolver la cantidad de archivos.
        const tieneDocs = [29, 31, 43].includes(id); // Ejemplo: Simular que algunas canciones tienen docs

        return {
            idCover: id,
            nombreCancion: song.nombre,
            nombreArtista: song.artista,
            // ---- MODIFICADO: Ruta de la imagen ajustada ----
            imagenCover: `../covers/cover${id}.jpeg`,
            pesoCover: null,
            dimensionesCover: null,
            pesoAudio: null,
            duracionAudio: durationInSeconds,
            duracionFormateada: formatDuration(durationInSeconds),
            secciones: secciones,
            cantidadSecciones: secciones.length,
            tieneSecciones: secciones.length > 0,
            letra: letra.length > 0,
            drums: !!drumsData[id],
            docs: tieneDocs,
            cantidadDocs: tieneDocs ? 1 : 0, // Simulación simple
            tipoCancion: getTipoCancion(song.tipo)
        };
    }

    // --- 2. RENDERIZADO EN EL DOM ---

    function displaySongs(songs) {
        songsTbody.innerHTML = '';
        if (songs.length === 0) {
            songsTbody.innerHTML = `<tr><td colspan="11" style="text-align:center;">No se encontraron canciones con los filtros seleccionados.</td></tr>`;
            return;
        }

        // Ordenar canciones por ID de forma descendente (del más reciente al más antiguo)
        const sortedSongs = [...songs].sort((a, b) => b.idCover - a.idCover);

        sortedSongs.forEach(song => {
            const row = document.createElement('tr');
            // La imagen ahora se maneja principalmente por CSS para el layout responsive
            row.innerHTML = `
                <td data-label="Cover" class="cover-cell">
                    <div class="cover-toggle">
                        <img src="${song.imagenCover}" alt="${song.nombreCancion}" class="cover-img" onerror="this.src='https://via.placeholder.com/50'; this.onerror=null;">
                    </div>
                </td>
                <td data-label="ID"><span>${song.idCover}</span></td>
                <td data-label="Nombre"><span>${song.nombreCancion}</span></td>
                <td data-label="Artista"><span>${song.nombreArtista}</span></td>
                <td data-label="Tipo"><span>${song.tipoCancion}</span></td>
                <td data-label="Duración"><span>${song.duracionFormateada}</span></td>
                <td data-label="Play" class="play-cell">
                    <button class="play-btn" data-song-id="${song.idCover}">
                        <span class="play-icon">▶️</span>
                    </button>
                </td>
                <td data-label="Secciones"><span class="indicator ${song.tieneSecciones ? 'success' : 'error'}">${song.tieneSecciones ? '✔️' : '❌'}</span></td>
                <td data-label="Letra"><span class="indicator ${song.letra ? 'success' : 'error'}">${song.letra ? '✔️' : '❌'}</span></td>
                <td data-label="Drums"><span class="indicator ${song.drums ? 'success' : 'error'}">${song.drums ? '✔️' : '❌'}</span></td>
                <td data-label="Docs"><span class="indicator ${song.docs ? 'success' : 'error'}">${song.docs ? '✔️' : '❌'}</span></td>
            `;
            songsTbody.appendChild(row);
            
            // Añadir evento para toggle individual de la carátula
            const coverToggle = row.querySelector('.cover-toggle');
            coverToggle.addEventListener('click', function() {
                const coverImg = this.querySelector('.cover-img');
                coverImg.classList.toggle('cover-hidden');
            });
            
            // Permitir que al hacer clic en cualquier celda se muestre la carátula
            const allCells = row.querySelectorAll('td:not(.cover-cell):not(.play-cell)');
            const coverImg = row.querySelector('.cover-img');
            
            allCells.forEach(cell => {
                cell.addEventListener('click', function() {
                    if (coverImg.classList.contains('cover-hidden')) {
                        coverImg.classList.remove('cover-hidden');
                    }
                });
            });

            // Añadir evento para el botón de play
            const playBtn = row.querySelector('.play-btn');
            playBtn.addEventListener('click', function() {
                toggleAudio(song.idCover, this);
            });
        });
        
        // Reiniciar el estado de las carátulas según el estado actual del botón
        const toggleAllButton = document.getElementById('toggle-all-covers');
        if (toggleAllButton.textContent === 'Mostrar todas las carátulas') {
            document.querySelectorAll('.cover-img').forEach(img => {
                img.classList.add('cover-hidden');
            });
        }
    }
    
    // El resto de las funciones (populateFilters, updateStatistics, applyFilters) y
    // los event listeners no necesitan cambios, ya que operan sobre el objeto `allSongsData`
    // una vez que ha sido procesado.

    // --- 3. FUNCIONALIDAD DE REPRODUCCIÓN DE AUDIO ---

    function toggleAudio(songId, buttonElement) {
        const playIcon = buttonElement.querySelector('.play-icon');
        
        // Si hay un audio reproduciéndose y es diferente al actual
        if (currentAudio && currentAudio.songId !== songId) {
            stopCurrentAudio();
        }

        // Si no hay audio actual o es una canción diferente, reproducir
        if (!currentAudio || currentAudio.songId !== songId) {
            playAudio(songId, buttonElement);
        } else {
            // Si es la misma canción, pausar/reanudar
            if (currentAudio.audio.paused) {
                const playPromise = currentAudio.audio.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        playIcon.textContent = '⏸️';
                        buttonElement.classList.add('playing');
                    }).catch((error) => {
                        console.error(`Error al reanudar audio ${songId}:`, error);
                        playIcon.textContent = '❌';
                        buttonElement.classList.remove('playing');
                        setTimeout(() => {
                            playIcon.textContent = '▶️';
                        }, 2000);
                    });
                }
            } else {
                currentAudio.audio.pause();
                playIcon.textContent = '▶️';
                buttonElement.classList.remove('playing');
            }
        }
    }

    function playAudio(songId, buttonElement) {
        const playIcon = buttonElement.querySelector('.play-icon');
        const audioPath = `../songs/${songId}.mp3`;
        
        // Crear nuevo elemento de audio
        const audio = new Audio();
        
        // Actualizar el estado del botón a "cargando"
        playIcon.textContent = '⏳';
        buttonElement.disabled = true;

        // Timeout para evitar carga infinita (15 segundos)
        const loadTimeout = setTimeout(() => {
            console.error(`Timeout al cargar audio ${songId}`);
            playIcon.textContent = '❌';
            buttonElement.disabled = false;
            buttonElement.classList.remove('playing');
            setTimeout(() => {
                playIcon.textContent = '▶️';
            }, 2000);
        }, 15000);

        // Configurar eventos antes de cargar el audio
        audio.addEventListener('loadstart', function() {
            console.log(`Iniciando carga de audio ${songId}`);
        });

        audio.addEventListener('canplay', function() {
            console.log(`Audio ${songId} listo para reproducir`);
            clearTimeout(loadTimeout); // Cancelar timeout
            buttonElement.disabled = false;
            playIcon.textContent = '⏸️';
            buttonElement.classList.add('playing');
            
            // Intentar reproducir
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(function(error) {
                    console.error(`Error al reproducir audio ${songId}:`, error);
                    playIcon.textContent = '❌';
                    buttonElement.classList.remove('playing');
                    setTimeout(() => {
                        playIcon.textContent = '▶️';
                        buttonElement.disabled = false;
                    }, 2000);
                });
            }
        });

        audio.addEventListener('error', function(e) {
            console.error(`Error al cargar el audio ${songId}:`, e);
            clearTimeout(loadTimeout); // Cancelar timeout
            playIcon.textContent = '❌';
            buttonElement.disabled = false;
            buttonElement.classList.remove('playing');
            setTimeout(() => {
                playIcon.textContent = '▶️';
            }, 2000);
        });

        audio.addEventListener('ended', function() {
            playIcon.textContent = '▶️';
            buttonElement.classList.remove('playing');
            currentAudio = null;
        });

        audio.addEventListener('pause', function() {
            if (audio.currentTime === 0) return;
            playIcon.textContent = '▶️';
            buttonElement.classList.remove('playing');
        });

        audio.addEventListener('play', function() {
            playIcon.textContent = '⏸️';
            buttonElement.classList.add('playing');
        });

        // Configurar audio para móviles
        audio.preload = 'none'; // No precargar
        audio.crossOrigin = 'anonymous'; // Para evitar problemas de CORS
        
        // Establecer la fuente y cargar
        audio.src = audioPath;
        audio.load();

        currentAudio = {
            audio: audio,
            songId: songId,
            button: buttonElement
        };
    }

    function stopCurrentAudio() {
        if (currentAudio) {
            currentAudio.audio.pause();
            currentAudio.audio.currentTime = 0;
            const playIcon = currentAudio.button.querySelector('.play-icon');
            playIcon.textContent = '▶️';
            currentAudio.button.classList.remove('playing');
            currentAudio = null;
        }
    }

    function populateFilters(songs) {
        // Contar canciones por artista
        const cancionesPorArtista = songs.reduce((acc, song) => {
            acc[song.nombreArtista] = (acc[song.nombreArtista] || 0) + 1;
            return acc;
        }, {});

        // Separar artistas con múltiples canciones y artistas únicos
        const artistasMultiples = Object.keys(cancionesPorArtista)
            .filter(artista => cancionesPorArtista[artista] >= 2)
            .sort();
        
        const artistasUnicos = Object.keys(cancionesPorArtista)
            .filter(artista => cancionesPorArtista[artista] === 1)
            .sort();

        // Limpiar opciones existentes (excepto "Todos")
        artistaFilter.innerHTML = '<option value="all">Todos</option>';
        artistaUnicoFilter.innerHTML = '<option value="all">Todos</option>';

        // Poblar filtro de artistas (solo con 2+ canciones)
        artistasMultiples.forEach(artista => {
            const option = document.createElement('option');
            option.value = artista;
            option.textContent = artista;
            artistaFilter.appendChild(option);
        });

        // Poblar filtro de artistas únicos (solo con 1 canción)
        artistasUnicos.forEach(artista => {
            const option = document.createElement('option');
            option.value = artista;
            option.textContent = artista;
            artistaUnicoFilter.appendChild(option);
        });
    }

    function updateStatistics(songs) {
        totalCancionesEl.textContent = songs.length;
        sinLetraEl.textContent = `Sin Letra: ${songs.filter(s => !s.letra).length}`;
        sinDrumsEl.textContent = `Sin Drums: ${songs.filter(s => !s.drums).length}`;
        sinSeccionesEl.textContent = `Sin Secciones: ${songs.filter(s => !s.tieneSecciones).length}`;
        
        const porArtista = songs.reduce((acc, song) => {
            acc[song.nombreArtista] = (acc[song.nombreArtista] || 0) + 1;
            return acc;
        }, {});

        const entries = Object.entries(porArtista);
        const multiplesCanciones = entries.filter(([, count]) => count > 1);
        const unaCancion = entries.filter(([, count]) => count === 1);

        cancionesPorArtistaEl.innerHTML = multiplesCanciones
            .sort((a, b) => b[1] - a[1])
            .map(([artista, count]) => `<div>${artista}: <strong>${count}</strong></div>`)
            .join('') || '<div>No hay artistas con más de una canción.</div>';

        artistasUnicosEl.innerHTML = unaCancion
            .sort((a, b) => a[0].localeCompare(b[0])) // Ordenar alfabéticamente
            .map(([artista]) => `<div>${artista}</div>`)
            .join('') || '<div>No hay artistas con una única canción.</div>';

        const porTipo = songs.reduce((acc, song) => {
            acc[song.tipoCancion] = (acc[song.tipoCancion] || 0) + 1;
            return acc;
        }, {});
        distribucionTipoEl.innerHTML = Object.entries(porTipo)
            .map(([tipo, count]) => `<div>${tipo}: <strong>${count}</strong></div>`)
            .join('');
    }

    function applyFilters() {
        const formData = new FormData(filterForm);
        const filters = {
            artista: formData.get('artista'),
            artistaUnico: formData.get('artistaUnico'),
            tipo: formData.get('tipo'),
            duracion: parseInt(formData.get('duracion'), 10),
            conLetra: document.getElementById('con-letra-filter').checked,
            conDrums: document.getElementById('con-drums-filter').checked,
            conSecciones: document.getElementById('con-secciones-filter').checked,
            sinSecciones: document.getElementById('sin-secciones-filter').checked,
        };

        const filteredSongs = allSongsData.filter(song => {
            if (filters.artista !== 'all' && song.nombreArtista !== filters.artista) return false;
            if (filters.artistaUnico !== 'all' && song.nombreArtista !== filters.artistaUnico) return false;
            if (filters.tipo !== 'all' && song.tipoCancion !== filters.tipo) return false;
            if (!isNaN(filters.duracion) && song.duracionAudio >= filters.duracion) return false;
            if (filters.conLetra && !song.letra) return false;
            if (filters.conDrums && !song.drums) return false;
            if (filters.conSecciones && !song.tieneSecciones) return false;
            if (filters.sinSecciones && song.tieneSecciones) return false;
            return true;
        });

        displaySongs(filteredSongs);
        updateStatistics(filteredSongs);
    }
    
    filterForm.addEventListener('change', applyFilters);
    filterForm.addEventListener('submit', (e) => e.preventDefault());
    
    resetFiltersBtn.addEventListener('click', () => {
        filterForm.reset();
        displaySongs(allSongsData);
        updateStatistics(allSongsData);
    });

    // Gestionar el botón para ocultar/mostrar todas las carátulas
    document.getElementById('toggle-all-covers').addEventListener('click', function() {
        const allCovers = document.querySelectorAll('.cover-img');
        const isHiding = this.textContent === 'Ocultar todas las carátulas';
        
        allCovers.forEach(img => {
            if (isHiding) {
                img.classList.add('cover-hidden');
            } else {
                img.classList.remove('cover-hidden');
            }
        });
        
        this.textContent = isHiding ? 'Mostrar todas las carátulas' : 'Ocultar todas las carátulas';
    });

    loadAllData();
});