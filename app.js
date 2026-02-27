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
        
        // Find common headers for ID and Electorate
        const commonHeaders = state.originHeaders.filter(h => state.targetHeaders.includes(h));
        
        populateSelect(mapId, commonHeaders, "circuitoId");
        populateSelect(mapElectorate, commonHeaders, "cantidadElectores");
        
        mapId.disabled = false;
        mapElectorate.disabled = false;
        
        // Populate parties checkboxes (exclude selected ID and Electorate if possible)
        populateCheckboxes(partiesOriginContainer, state.originHeaders, "origin");
        populateCheckboxes(partiesTargetContainer, state.targetHeaders, "target");
        
        checkReadyToRun();
    }
}

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
    const originParties = getSelectedParties('parties-origin');
    const targetParties = getSelectedParties('parties-target');
    
    if (state.webRReady && state.originData && state.targetData && originParties.length > 0 && targetParties.length > 0) {
        btnRun.disabled = false;
    } else {
        btnRun.disabled = true;
    }
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
        const idCol = mapId.value;
        const popCol = mapElectorate.value;
        const srcParties = getSelectedParties('parties-origin');
        const tgtParties = getSelectedParties('parties-target');

        // Prepare data matrices for R
        // R expects essentially a single dataset merged by ID
        btnRun.innerText = "Mergiendo datos locales...";
        
        // Create a lookup for target data
        const tgtLookup = new Map();
        state.targetData.forEach(row => {
            if(row[idCol] !== undefined) {
               tgtLookup.set(String(row[idCol]), row);
            }
        });
        
        // Filter and merge strictly on ID
        const mergedData = [];
        let totalSrcVotes = {};
        srcParties.forEach(p => totalSrcVotes[p] = 0);

        state.originData.forEach(srcRow => {
            const id = String(srcRow[idCol]);
            const popSrc = Number(srcRow[popCol]) || 0;
            const tgtRow = tgtLookup.get(id);
            
            if (tgtRow && popSrc > 0) {
                const popTgt = Number(tgtRow[popCol]) || 0;
                
                // Stability filter (15% tolerance)
                if (popTgt <= 1.15 * popSrc && popTgt >= 0.85 * popSrc) {
                    const row = { n: popSrc };
                    
                    // X proportions (source)
                    let xSum = 0;
                    srcParties.forEach((p, i) => {
                        const votes = Number(srcRow[p]) || 0;
                        const prop = votes / popSrc;
                        row[`x${i+1}`] = prop;
                        xSum += prop;
                        totalSrcVotes[p] += votes;
                    });
                    
                    // Normalize X to sum exactly to 1 (fix eiPack error)
                    if (xSum > 0 && Math.abs(xSum - 1.0) > 1e-8) {
                        srcParties.forEach((p, i) => {
                            row[`x${i+1}`] = row[`x${i+1}`] / xSum;
                        });
                    }
                    
                    // T proportions (target, relative to SRC population per simplified methodology)
                    let tSum = 0;
                    tgtParties.forEach((p, j) => {
                         const votes = Number(tgtRow[p]) || 0;
                         const prop = votes / popSrc;
                         row[`t${j+1}`] = prop;
                         tSum += prop;
                    });
                    
                    // Normalize T to sum exactly to 1 (fix eiPack error)
                    if (tSum > 0 && Math.abs(tSum - 1.0) > 1e-8) {
                        tgtParties.forEach((p, j) => {
                             row[`t${j+1}`] = row[`t${j+1}`] / tSum;
                        });
                    }
                    
                    mergedData.push(row);
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
        const xCols = srcParties.map((_, i) => `x${i+1}`);
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
            
            # WebR needs a flat numeric vector
            beta_means
        `;
        
        const result = await webR.evalR(rCode);
        const matrixFlat = await result.toJs(); 
        const values = matrixFlat.values;
        
        // The Beta matrix from ei.MD.bayes has (num_circuits * num_src * num_tgt) parameters.
        // We've already averaged them in R, so `values` is an array of size (num_src * num_tgt)
        // However, R is column-major.
        const numRows = srcParties.length;
        const numCols = tgtParties.length;
        
        // Reshape into transfer matrix
        let transferMatrix;
        
        try {
            // Attempt 1: Direct reshape assuming the R apply logic returned a flat array 
            // of length (numRows * numCols)
            if (values.length === numRows * numCols) {
                // R arrays are column-major
                transferMatrix = [];
                for (let r = 0; r < numRows; r++) {
                    const rowArr = [];
                    for (let c = 0; c < numCols; c++) {
                        rowArr.push(values[c * numRows + r]);
                    }
                    transferMatrix.push(rowArr);
                }
            } else if (values.length > numRows * numCols) {
                // If it came back as a large array (params per circuit), we do the averaging in JS
                // This handles the case where the R script returns the full Beta matrix
                const circuits_used = values.length / (numRows * numCols);
                transferMatrix = Array(numRows).fill().map(() => Array(numCols).fill(0));
                
                for(let i=0; i<values.length; i++) {
                     // R indexing logic (column major, nested)
                     const param_idx = i % (numRows * numCols);
                     const col = Math.floor(param_idx / numRows);
                     const row = param_idx % numRows;
                     transferMatrix[row][col] += values[i] / circuits_used;
                }
            } else {
                 throw new Error(`Unexpected return length from R: ${values.length}`);
            }
        } catch (e) {
            console.error("Matrix reshape error:", e, values);
            throw new Error("Error procesando la matriz Bayesiana devuelta por R.");
        }
        
        // Prepare graph data
        const graphData = [];
        const absoluteFlows = [];
        
        for (let r = 0; r < numRows; r++) {
            const srcParty = srcParties[r] + " (Orig)";
            const srcTotal = totalSrcVotes[srcParties[r]];
            
            for (let c = 0; c < numCols; c++) {
                const tgtParty = tgtParties[c] + " (Dest)";
                const prob = transferMatrix[r][c];
                const estVotes = Math.round(srcTotal * prob);
                
                if (estVotes > 0) {
                    graphData.push({ source: srcParty, target: tgtParty, value: estVotes });
                    absoluteFlows.push({ Origen: srcParties[r], Destino: tgtParties[c], Probabilidad: prob, Votos_Estimados: estVotes });
                }
            }
        }
        
        state.results = {
            graphData,
            absoluteFlows
        };
        
        webrStatus.className = 'status-badge ready';
        webrStatus.innerText = '✅ Inferencia Completada';
        
        // Unlock results UI & Draw
        stepResults.classList.remove('disabled');
        drawSankey(graphData);
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
function drawSankey(data) {
    const container = document.getElementById('sankey-container');
    container.innerHTML = ''; // clear previous
    
    const width = container.clientWidth;
    const height = 600;

    // Calcular el total para porcentajes
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
        .text((d) => `${d.name}\n${((d.value / total) * 100).toFixed(1)}% (${d.value.toLocaleString()})`);

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
        .text((d) => `${d.source.name} → ${d.target.name}\n${((d.value / total) * 100).toFixed(1)}% (${d.value.toLocaleString()})`);

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
        .text((d) => ` ${((d.value / total) * 100).toFixed(1)}%`);

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
