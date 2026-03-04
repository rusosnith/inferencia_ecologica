import { WebR } from 'https://webr.r-wasm.org/latest/webr.mjs';

// ---- State Management ----
const state = {
    webRReady: false,
    originData: null,
    targetData: null,
    originHeaders: [],
    targetHeaders: [],
    results: null // Will construct transfer matrix and absolute flows
};

const webR = new WebR();

// ---- DOM Elements ----
const webrStatus = document.getElementById('webr-status');
const stepMapping = document.getElementById('step-mapping');
const stepResults = document.getElementById('step-results');
const btnRun = document.getElementById('btn-run');

// Upload Elements
const dropOrigin = document.getElementById('drop-origin');
const fileOrigin = document.getElementById('file-origin');
const statusOrigin = document.getElementById('status-origin');

const dropTarget = document.getElementById('drop-target');
const fileTarget = document.getElementById('file-target');
const statusTarget = document.getElementById('status-target');

// Mapping Elements
const mapId = document.getElementById('map-id');
const mapElectorate = document.getElementById('map-electorate');
const partiesOriginContainer = document.getElementById('parties-origin');
const partiesTargetContainer = document.getElementById('parties-target');

// ---- Initialization ----
async function initWebR() {
    try {
        webrStatus.className = 'status-badge loading';
        webrStatus.innerText = 'Instalando WebAssembly R y eiPack...';
        
        await webR.init();
        await webR.installPackages(['eiPack', 'data.table']);
        
        state.webRReady = true;
        webrStatus.className = 'status-badge ready';
        webrStatus.innerText = '✅ Motor R Listo (eiPack instalado)';
        
        checkReadyToRun();
    } catch (err) {
        webrStatus.className = 'status-badge error';
        webrStatus.innerText = '❌ Error cargando R: ' + err.message;
        console.error(err);
    }
}

// ---- File Upload Handling ----
function setupDropZone(dropZone, fileInput, statusEl, isOrigin) {
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0], statusEl, isOrigin);
        }
    });
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFile(e.target.files[0], statusEl, isOrigin);
        }
    });
}

function handleFile(file, statusEl, isOrigin) {
    if (file.type !== "text/csv" && !file.name.endsWith('.csv')) {
        statusEl.innerText = "❌ Por favor sube un archivo CSV.";
        statusEl.className = "file-status error";
        return;
    }

    Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: function(results) {
            if (results.errors.length) {
                console.warn("CSV Errors:", results.errors);
            }
            const data = results.data;
            const headers = results.meta.fields;
            
            if(isOrigin) {
                state.originData = data;
                state.originHeaders = headers;
                statusEl.innerText = `✅ Origen: ${file.name} (${data.length} filas)`;
            } else {
                state.targetData = data;
                state.targetHeaders = headers;
                statusEl.innerText = `✅ Destino: ${file.name} (${data.length} filas)`;
            }
            statusEl.className = "file-status success";
            
            updateMappingUI();
        }
    });
}

// ---- Mapping UI Logic ----
function updateMappingUI() {
    if (state.originData && state.targetData) {
        stepMapping.classList.remove('disabled');
        
        const mapIdOrigin = document.getElementById('map-id-origin');
        const mapIdTarget = document.getElementById('map-id-target');
        const mapPopOrigin = document.getElementById('map-pop-origin');
        const mapPopTarget = document.getElementById('map-pop-target');

        populateSelect(mapIdOrigin, state.originHeaders, "circuitoId");
        populateSelect(mapIdTarget, state.targetHeaders, "circuitoId");
        populateSelect(mapPopOrigin, state.originHeaders, "cantidadElectores");
        populateSelect(mapPopTarget, state.targetHeaders, "cantidadElectores");
        
        mapIdOrigin.disabled = false; mapIdTarget.disabled = false;
        mapPopOrigin.disabled = false; mapPopTarget.disabled = false;

        const dataFormat = document.getElementById('data-format').value;
        const wideCols = document.querySelectorAll('.mapping-wide');
        const stackedCols = document.querySelectorAll('.mapping-stacked');

        if (dataFormat === 'wide') {
            wideCols.forEach(el => el.style.display = 'block');
            stackedCols.forEach(el => el.style.display = 'none');
            
            // Populate parties checkboxes (exclude selected ID and Electorate if possible)
            populateCheckboxes(partiesOriginContainer, state.originHeaders, "origin");
            populateCheckboxes(partiesTargetContainer, state.targetHeaders, "target");
        } else {
            wideCols.forEach(el => el.style.display = 'none');
            stackedCols.forEach(el => el.style.display = 'block');

            const mapPartyNameOrig = document.getElementById('map-party-name-origin');
            const mapPartyNameTarg = document.getElementById('map-party-name-target');
            const mapPartyVotesOrig = document.getElementById('map-party-votes-origin');
            const mapPartyVotesTarg = document.getElementById('map-party-votes-target');
            
            populateSelect(mapPartyNameOrig, state.originHeaders, "agrupacion");
            populateSelect(mapPartyNameTarg, state.targetHeaders, "agrupacion");
            populateSelect(mapPartyVotesOrig, state.originHeaders, "votos");
            populateSelect(mapPartyVotesTarg, state.targetHeaders, "votos");
            
            mapPartyNameOrig.disabled = false; mapPartyNameTarg.disabled = false;
            mapPartyVotesOrig.disabled = false; mapPartyVotesTarg.disabled = false;
        }
        
        checkReadyToRun();
    }
}

document.getElementById('data-format').addEventListener('change', updateMappingUI);
document.getElementById('map-party-name-origin')?.addEventListener('change', checkReadyToRun);
document.getElementById('map-party-name-target')?.addEventListener('change', checkReadyToRun);
document.getElementById('map-party-votes-origin')?.addEventListener('change', checkReadyToRun);
document.getElementById('map-party-votes-target')?.addEventListener('change', checkReadyToRun);
document.getElementById('map-id-origin')?.addEventListener('change', checkReadyToRun);
document.getElementById('map-id-target')?.addEventListener('change', checkReadyToRun);
document.getElementById('map-pop-origin')?.addEventListener('change', checkReadyToRun);
document.getElementById('map-pop-target')?.addEventListener('change', checkReadyToRun);

function populateSelect(selectEl, options, likelyName) {
    selectEl.innerHTML = '';
    let foundLikely = false;
    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.text = opt;
        if (opt.toLowerCase().includes(likelyName.toLowerCase()) && !foundLikely) {
            option.selected = true;
            foundLikely = true;
        }
        selectEl.appendChild(option);
    });
}

function populateCheckboxes(container, headers, prefix) {
    container.innerHTML = '';
    // Filter out obvious administrative columns for convenience
    const excluded = ['secprov', 'seccionId', 'name', 'circuitoId', 'mesasTotalizadas', 'cantidadElectores'];
    
    headers.forEach(h => {
        const isExcluded = excluded.some(ex => h.toLowerCase().includes(ex.toLowerCase()));
        
        const label = document.createElement('label');
        label.className = 'checkbox-label';
        
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = h;
        input.id = `chk-${prefix}-${h}`;
        input.checked = !isExcluded;
        input.addEventListener('change', checkReadyToRun);
        
        label.appendChild(input);
        label.appendChild(document.createTextNode(h));
        container.appendChild(label);
    });
}

function getSelectedParties(containerId) {
    const container = document.getElementById(containerId);
    const checked = Array.from(container.querySelectorAll('input[type="checkbox"]:checked'));
    return checked.map(chk => chk.value);
}

function checkReadyToRun() {
    const dataFormat = document.getElementById('data-format').value;
    let isReady = false;

    if (state.webRReady && state.originData && state.targetData) {
        if (dataFormat === 'wide') {
            const originParties = getSelectedParties('parties-origin');
            const targetParties = getSelectedParties('parties-target');
            isReady = originParties.length > 0 && targetParties.length > 0;
        } else {
            const partyNameColOrig = document.getElementById('map-party-name-origin').value;
            const partyVotesColOrig = document.getElementById('map-party-votes-origin').value;
            const partyNameColTarg = document.getElementById('map-party-name-target').value;
            const partyVotesColTarg = document.getElementById('map-party-votes-target').value;
            isReady = partyNameColOrig && partyVotesColOrig && partyNameColTarg && partyVotesColTarg;
        }
    }
    
    btnRun.disabled = !isReady;
}

// Data parser logic (Stack to Wide internally) forcing exactly Top 6 + OTROS
function pivotStackedToWide(rawData, idCol, popCol, partyNameCol, partyVotesCol) {
    // 1. Calculate global votes per party to determine Top 6
    const globalVotes = new Map();
    
    rawData.forEach(row => {
        const party = row[partyNameCol];
        const votes = Number(row[partyVotesCol]) || 0;
        if (party && votes > 0) {
            globalVotes.set(party, (globalVotes.get(party) || 0) + votes);
        }
    });
    
    // Sort parties by volume descending
    const sortedParties = Array.from(globalVotes.entries()).sort((a, b) => b[1] - a[1]);
    
    // Take Top 6, the rest goes to OTROS
    const top6 = sortedParties.slice(0, 6).map(p => p[0]);
    
    const partyMapping = new Map();
    const OTROS_LABEL = "OTROS";
    
    sortedParties.forEach(([party, _votes]) => {
        if (top6.includes(party)) {
            partyMapping.set(party, party);
        } else {
            partyMapping.set(party, OTROS_LABEL);
        }
    });

    const wideData = new Map();
    const partiesFound = new Set();
    
    rawData.forEach(row => {
        const id = String(row[idCol]);
        if (!wideData.has(id)) {
            const newRow = {};
            newRow[idCol] = id;
            newRow[popCol] = row[popCol];
            wideData.set(id, newRow);
        }
        
        const rawParty = row[partyNameCol];
        const votes = Number(row[partyVotesCol]) || 0;
        
        if (rawParty) {
            const mappedParty = partyMapping.get(rawParty);
            if (mappedParty) {
                partiesFound.add(mappedParty);
                wideData.get(id)[mappedParty] = (wideData.get(id)[mappedParty] || 0) + votes;
            }
        }
    });
    
    return {
        data: Array.from(wideData.values()),
        parties: Array.from(partiesFound)
    };
}

// ---- Run Inference ----
btnRun.onclick = async () => {
    btnRun.disabled = true;
    const oldText = btnRun.innerText;
    btnRun.innerText = "Preparando datos...";
    webrStatus.className = 'status-badge loading';
    webrStatus.innerText = 'Transfiriendo datos a WebAssembly...';
    
    let timerInterval;
    let startTime = Date.now();
    
    const updateTimer = () => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        webrStatus.innerText = `Ejecutando Inferencia... (${mins}:${secs < 10 ? '0' : ''}${secs})`;
    };
    
    try {
        const idColOrig = document.getElementById('map-id-origin').value;
        const idColTarg = document.getElementById('map-id-target').value;
        const popColOrig = document.getElementById('map-pop-origin').value;
        const popColTarg = document.getElementById('map-pop-target').value;
        const dataFormat = document.getElementById('data-format').value;
        
        let srcParties = [];
        let tgtParties = [];
        
        let originProcData = state.originData;
        let targetProcData = state.targetData;

        if (dataFormat === 'wide') {
            srcParties = getSelectedParties('parties-origin');
            tgtParties = getSelectedParties('parties-target');
        } else {
            const partyNameColOrig = document.getElementById('map-party-name-origin').value;
            const partyVotesColOrig = document.getElementById('map-party-votes-origin').value;
            
            const origPivoted = pivotStackedToWide(state.originData, idColOrig, popColOrig, partyNameColOrig, partyVotesColOrig);
            originProcData = origPivoted.data;
            srcParties = origPivoted.parties;
            
            const partyNameColTarg = document.getElementById('map-party-name-target').value;
            const partyVotesColTarg = document.getElementById('map-party-votes-target').value;

            const tgtPivoted = pivotStackedToWide(state.targetData, idColTarg, popColTarg, partyNameColTarg, partyVotesColTarg);
            targetProcData = tgtPivoted.data;
            tgtParties = tgtPivoted.parties;
        }

        // Prepare data matrices for R
        // R expects essentially a single dataset merged by ID
        btnRun.innerText = "Mergiendo datos locales...";
        
        // Create a lookup for target data
        const tgtLookup = new Map();
        targetProcData.forEach(row => {
            if(row[idColTarg] !== undefined) {
               tgtLookup.set(String(row[idColTarg]), row);
            }
        });
        
        // Filter and merge strictly on ID
        const mergedData = [];
        const SRC_REST = "Ausentes / Blancos / Nulos";
        const TGT_REST = "Ausentes / Blancos / Nulos";
        
        let totalSrcVotes = {};
        srcParties.forEach(p => totalSrcVotes[p] = 0);
        totalSrcVotes[SRC_REST] = 0;

        originProcData.forEach(srcRow => {
            const id = String(srcRow[idColOrig]);
            const popSrc = Number(srcRow[popColOrig]) || 0;
            const tgtRow = tgtLookup.get(id);
            
            if (tgtRow && popSrc > 0) {
                const popTgt = Number(tgtRow[popColTarg]) || 0;
                
                // Stability filter (15% tolerance)
                if (popTgt <= 1.15 * popSrc && popTgt >= 0.85 * popSrc) {
                    const row = { n: popSrc };
                    
                    let xPos = 0;
                    srcParties.forEach((p) => {
                        const votes = Number(srcRow[p]) || 0;
                        xPos += votes;
                        totalSrcVotes[p] += votes;
                    });
                    const xRest = Math.max(0, popSrc - xPos);
                    totalSrcVotes[SRC_REST] += xRest;
                    
                    let tPos = 0;
                    tgtParties.forEach((p) => {
                         tPos += Number(tgtRow[p]) || 0;
                    });
                    const tRest = Math.max(0, popSrc - tPos); // Relative to popSrc for consistent EI bounds
                    
                    // Skip mathematically impossible circuits (more votes than registered voters)
                    if (xPos <= popSrc && tPos <= popSrc) {
                        srcParties.forEach((p, i) => {
                            row[`x${i+1}`] = (Number(srcRow[p]) || 0) / popSrc;
                        });
                        row[`x_rest`] = xRest / popSrc;
                        
                        tgtParties.forEach((p, j) => {
                            row[`t${j+1}`] = (Number(tgtRow[p]) || 0) / popSrc;
                        });
                        row[`t_rest`] = tRest / popSrc;
                        
                        // Force absolute 1.0 row margins by putting float errors into the residual category
                        let cX = 0, cT = 0;
                        srcParties.forEach((p, i) => cX += row[`x${i+1}`]);
                        row[`x_rest`] = Math.max(0, 1.0 - cX);
                        
                        tgtParties.forEach((p, j) => cT += row[`t${j+1}`]);
                        row[`t_rest`] = Math.max(0, 1.0 - cT);
                        
                        mergedData.push(row);
                    }
                }
            }
        });
        
        console.log(`Merged and filtered data: ${mergedData.length} records.`);
        if (mergedData.length === 0) throw new Error("No hay circuitos válidos tras el merge (verifica la columna de ID y Padrón).");

        // Send to WebR
        btnRun.innerText = "Calculando...";
        startTime = Date.now();
        timerInterval = setInterval(updateTimer, 1000);
        updateTimer();
        
        // Convert array of objects to columnar format for R dataframe construction
        const columnarData = {};
        Object.keys(mergedData[0]).forEach(k => columnarData[k] = []);
        mergedData.forEach(r => Object.keys(r).forEach(k => columnarData[k].push(r[k])));
        
        // Bind objects to R session using evalRVoid
        await webR.objs.globalEnv.bind('js_data', columnarData);
        await webR.evalRVoid(`
            df <- as.data.frame(js_data)
        `);
        
        // Construct formula
        const tCols = tgtParties.map((_, i) => `t${i+1}`);
        tCols.push('t_rest');
        
        const xCols = srcParties.map((_, i) => `x${i+1}`);
        xCols.push('x_rest');
        
        const formulaStr = `cbind(${tCols.join(',')}) ~ cbind(${xCols.join(',')})`;
        
        // Determine MCMC settings
        const preset = document.getElementById('mcmc-preset') ? document.getElementById('mcmc-preset').value : 'fast';
        let burnin = 10;
        let sample = 50;
        let thin = 1;
        
        if (preset === 'medium') {
            burnin = 1000;
            sample = 100;
            thin = 10;
        } else if (preset === 'accurate') {
            burnin = 5000;
            sample = 150;
            thin = 50;
        }
        
        // Run inference in R
        // Note: Using fast MCMC parameters for interactivity.
        // WebAssembly R is slower than native, so we keep samples extremely low for proof-of-concept.
        const rCode = `
            library(eiPack)
            f <- as.formula("${formulaStr}")
            
            # Running with dynamic MCMC parameters selected by the user
            res <- ei.MD.bayes(f, data = df, total = "n", 
                             burnin = ${burnin}, sample = ${sample}, thin = ${thin}, verbose=TRUE)
            
            # Calculate circuit-level averages
            beta_means <- apply(res$draws$Beta, 2, mean)
            nms <- names(beta_means)
            
            x_cols <- c("${xCols.join('","')}")
            t_cols <- c("${tCols.join('","')}")
            
            # Create explicitly ordered Matrix
            res_mat <- matrix(0, nrow=length(x_cols), ncol=length(t_cols))
            
            for (i in seq_along(nms)) {
                nm <- nms[i]
                if (grepl("^beta\\\\.", nm)) {
                    # Splitting: beta . x_column . t_column
                    parts <- strsplit(nm, "\\\\.")[[1]]
                    if (length(parts) >= 3) {
                         x_name <- parts[2]
                         t_name <- parts[3]
                         
                         idx_x <- match(x_name, x_cols)
                         idx_t <- match(t_name, t_cols)
                         
                         if (!is.na(idx_x) && !is.na(idx_t)) {
                             res_mat[idx_x, idx_t] <- beta_means[i]
                         }
                    }
                }
            }
            
            # Flatten Row-Major (transpose first) to safely rebuild in JS
            as.vector(t(res_mat))
        `;
        
        const result = await webR.evalR(rCode);
        const matrixFlat = await result.toJs(); 
        const values = matrixFlat.values;
        
        const fullSrcParties = [...srcParties, SRC_REST];
        const fullTgtParties = [...tgtParties, TGT_REST];
        
        const numRows = fullSrcParties.length;
        const numCols = fullTgtParties.length;
        
        // Reshape into transfer matrix cleanly
        let transferMatrix = [];
        try {
            for (let r = 0; r < numRows; r++) {
                const rowArr = [];
                for (let c = 0; c < numCols; c++) {
                    const val = values[r * numCols + c] || 0;
                    rowArr.push(val);
                }
                transferMatrix.push(rowArr);
            }
        } catch (e) {
            console.error("Matrix reshape error:", e, values);
            throw new Error("Error procesando la matriz Bayesiana devuelta por R.");
        }
        
        // Prepare graph data
        const graphData = [];
        const absoluteFlows = [];
        
        let validSrcVotes = 0;
        let validTgtVotes = 0;
        
        for (let r = 0; r < numRows; r++) {
            const srcParty = fullSrcParties[r] + " (Orig)";
            const srcTotal = totalSrcVotes[fullSrcParties[r]];
            
            for (let c = 0; c < numCols; c++) {
                const tgtParty = fullTgtParties[c] + " (Dest)";
                const prob = transferMatrix[r][c];
                const estVotes = Math.round(srcTotal * prob);
                
                // Exclude the completely meaningless "Ausentes (Orig) -> Ausentes (Dest)" self-loop 
                // to avoid crushing the scale of political flows in the Sankey visualization
                if (fullSrcParties[r] === SRC_REST && fullTgtParties[c] === TGT_REST) {
                    continue;
                }
                
                if (estVotes > 0) {
                    graphData.push({ source: srcParty, target: tgtParty, value: estVotes });
                    absoluteFlows.push({ Origen: fullSrcParties[r], Destino: fullTgtParties[c], Probabilidad: prob, Votos_Estimados: estVotes });
                }
            }
        }
        
        state.results = {
            graphData,
            absoluteFlows
        };
        
        webrStatus.className = 'status-badge ready';
        webrStatus.innerText = '✅ Inferencia Completada';
        
        // Count valid active votes per election (excluding Ausentes itself) for D3 baseline
        let activeSrcVotes = 0;
        let activeTgtVotes = 0;
        srcParties.forEach(p => activeSrcVotes += totalSrcVotes[p]);
        tgtParties.forEach(p => {
             // We can estimate the total valid target votes that actually participated
             // by summing all estimated flows that arrived at target parties (excluding TGT_REST)
             graphData.forEach(link => {
                  if (link.target === p + " (Dest)") {
                      activeTgtVotes += link.value;
                  }
             });
        });
        
        // Unlock results UI & Draw
        stepResults.classList.remove('disabled');
        drawSankey(graphData, activeSrcVotes, activeTgtVotes);
        setupDownloads();
        
    } catch(err) {
        webrStatus.className = 'status-badge error';
        webrStatus.innerText = '❌ Error: ' + err.message;
        console.error(err);
    } finally {
        if(timerInterval) clearInterval(timerInterval);
        btnRun.innerText = oldText;
        btnRun.disabled = false;
    }
}

// ---- D3.js Visualization (Flow-o-Matic style) ----
function drawSankey(data, activeSrcVotes, activeTgtVotes) {
    const container = document.getElementById('sankey-container');
    container.innerHTML = ''; // clear previous
    
    const width = container.clientWidth;
    const height = 600;

    // Calcular el total global solo como fallback
    const total = d3.sum(data, (d) => d.value);

    // Data formatting for D3 Sankey
    const keys = Array.from(new Set(data.flatMap(d => [d.source, d.target])));
    const nodesData = keys.map(id => ({ id, name: id }));
    const linksData = data.map(d => ({ source: d.source, target: d.target, value: d.value }));

    const svg = d3.select('#sankey-container').append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', [0, 0, width, height])
        .style("background", "#fff")
        .style("width", "100%")
        .style("height", "auto");

    const { nodes, links } = d3.sankey()
        .nodeId(d => d.id || d.name)
        .nodeWidth(20)
        .nodePadding(10)
        .extent([
            [1, 40], // Margen superior para título
            [width - 1, height - 40] // Margen inferior para fuente
        ])({
        nodes: nodesData,
        links: linksData
    });

    // Título
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 25)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .style("font-weight", "bold")
        .style("fill", "#333")
        .text("Traspaso de votos en PBA: Inferencia ecológica");

    // Escala de colores por nodo aproximando la configuración original
    const getBaseName = (name) => name.replace(" (Orig)", "").replace(" (Dest)", "");
    const color = (nodeId) => {
        const base = getBaseName(nodeId);
        if (base.includes("EN_BLANCO")) return "silver";
        if (base.includes("UxP") || base.includes("FP")) return "#0096FF";
        if (base.includes("LLA")) return "purple";
        if (base.includes("JxC")) return "orange";
        if (base.includes("NO_VOTANTES")) return "Salmon";
        if (base.includes("OTROS")) return "gray";
        return d3.schemeCategory10[keys.indexOf(nodeId) % 10];
    };

    // Defs para los gradientes de links
    const defs = svg.append("defs");
    links.forEach((link, i) => {
        const gradient = defs
            .append("linearGradient")
            .attr("id", `gradient-${i}`)
            .attr("gradientUnits", "userSpaceOnUse")
            .attr("x1", link.source.x1)
            .attr("x2", link.target.x0);
        gradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", color(link.source.id || link.source.name));
        gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", color(link.target.id || link.target.name));
    });

    // Nodos
    svg.append("g")
        .selectAll("rect")
        .data(nodes)
        .join("rect")
        .attr("x", (d) => d.x0)
        .attr("y", (d) => d.y0)
        .attr("height", (d) => d.y1 - d.y0)
        .attr("width", (d) => d.x1 - d.x0)
        .attr("fill", (d) => color(d.id || d.name))
        .append("title")
        .text((d) => {
            const isOrig = d.name.includes("(Orig)");
            const isAus = d.name.includes("Ausentes");
            const den = isOrig ? activeSrcVotes : activeTgtVotes;
            const pct = isAus ? "N/A" : ((d.value / den) * 100).toFixed(1) + "%";
            return `${d.name}\n${pct} de válidos (${d.value.toLocaleString()} votos globales)`;
        });

    // Links con gradientes
    // Exact observable implementation:
    // This allows the blend modes and stroke colors to properly render without bugs.
    svg.append("g")
        .attr("fill", "none")
        .attr("stroke-opacity", 0.5)
        .selectAll("path")
        .data(links)
        .join("path")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke", (d, i) => `url(#gradient-${i})`)
        .attr("stroke-width", (d) => Math.max(1, d.width))
        .style("mix-blend-mode", "multiply")
        .append("title")
        .text((d) => {
            const isTargetAus = d.target.name.includes("Ausentes");
            const pct = isTargetAus ? "N/A" : ((d.value / activeSrcVotes) * 100).toFixed(1) + "%";
            return `${d.source.name} → ${d.target.name}\n${pct} (${d.value.toLocaleString()})`;
        });

    // Labels con porcentajes
    svg.append("g")
        .style("font", "10px sans-serif")
        .style("fill", "#1e293b")
        .selectAll("text")
        .data(nodes)
        .join("text")
        .attr("x", (d) => (d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6))
        .attr("y", (d) => (d.y1 + d.y0) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", (d) => (d.x0 < width / 2 ? "start" : "end"))
        .text((d) => getBaseName(d.name)) // Cleaner text without (Orig) / (Dest)
        .append("tspan")
        .attr("fill-opacity", 0.7)
        .text((d) => {
            const isOrig = d.name.includes("(Orig)");
            const isAus = d.name.includes("Ausentes");
            const den = isOrig ? activeSrcVotes : activeTgtVotes;
            if (isAus) {
                 // Provide absolute volume for Ausentes rather than confusing the valid % denominator
                 return ` (${d.value.toLocaleString()})`;
            }
            return ` ${((d.value / den) * 100).toFixed(1)}%`;
        });

    // Fuente
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height - 5)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "#666")
        .text("Fuente: Inferenciómetro WebR (Generado dinámicamente)");
}

// Download handlers
function setupDownloads() {
    if(!state.results) return;
    
    document.getElementById('btn-dl-matrix').onclick = () => {
        // Just probability matrix is within absoluteFlows
        const csv = Papa.unparse(state.results.absoluteFlows);
        downloadBlob(csv, 'inferencia_resultados.csv', 'text/csv');
    };
    
    document.getElementById('btn-dl-flows').onclick = () => {
        // Graph data formatted
        const csv = Papa.unparse(state.results.graphData);
        downloadBlob(csv, 'nodos_aristas_d3.csv', 'text/csv');
    };
}

function downloadBlob(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}


// Start WebR
initWebR();
setupDropZone(dropOrigin, fileOrigin, statusOrigin, true);
setupDropZone(dropTarget, fileTarget, statusTarget, false);
