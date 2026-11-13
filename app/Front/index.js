// URL del backend: local en desarrollo, Render en producción
const API_URL = ["localhost", "127.0.0.1"].includes(location.hostname)
    ? "http://127.0.0.1:8000"
    : "https://keplerx-api.onrender.com";

const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Definición de los pasos y campos ---------- */
// req: obligatorio. Los demás son opcionales y valen 0 si quedan vacíos.
const STEPS = [
    {
        name: "Sistema",
        title: "Describe el sistema",
        intro: "Datos básicos de la estrella y de los planetas que la acompañan.",
        fields: [
            { name: "sy_pnum", label: "Planetas en el sistema", hint: "Cuántos planetas se conocen alrededor de esta estrella.", unit: "", req: true, int: true, min: 1 },
            { name: "st_rad", label: "Radio de la estrella", hint: "Comparado con el Sol (el Sol vale 1).", unit: "R☉", req: true, min: 0 },
            { name: "sy_dist", label: "Distancia a la Tierra", hint: "1 parsec son unos 3,26 años luz.", unit: "pc", req: true, min: 0 }
        ],
        more: [
            { name: "distpos", label: "Incertidumbre de la distancia", hint: "Margen de error positivo.", unit: "pc" }
        ]
    },
    {
        name: "Órbita",
        title: "Indica la órbita",
        intro: "El tiempo que tarda el planeta en completar una vuelta alrededor de su estrella.",
        fields: [
            { name: "pl_orbper", label: "Periodo orbital", hint: "La Tierra tarda 365 días.", unit: "días", req: true, min: 0 }
        ],
        more: [
            { name: "pl_orbperlim", label: "Límite del periodo", hint: "0 si es un valor medido, 1 si es un límite, -1 si es un límite inferior.", unit: "" },
            { name: "orbpos", label: "Error positivo del periodo", hint: "Cuánto podría ser mayor.", unit: "días" },
            { name: "orbneg", label: "Error negativo del periodo", hint: "Cuánto podría ser menor (número negativo).", unit: "días" }
        ]
    },
    {
        name: "Planeta",
        title: "Mide el planeta",
        intro: "Su tamaño. Si escribes el radio en radios terrestres, calculamos el de Júpiter por ti.",
        fields: [
            { name: "pl_rade", label: "Radio en radios terrestres", hint: "La Tierra vale 1.", unit: "R⊕", req: true, min: 0 },
            { name: "pl_radj", label: "Radio en radios de Júpiter", hint: "Júpiter vale 1. Se rellena solo al escribir el anterior.", unit: "R♃", req: true, min: 0 }
        ],
        more: [
            { name: "pl_radelim", label: "Límite del radio terrestre", hint: "0 si es un valor medido.", unit: "" },
            { name: "pl_radjlim", label: "Límite del radio de Júpiter", hint: "0 si es un valor medido.", unit: "" },
            { name: "radepos", label: "Error positivo (R⊕)", hint: "", unit: "R⊕" },
            { name: "radneg", label: "Error negativo (R⊕)", hint: "Número negativo.", unit: "R⊕" },
            { name: "radjpos", label: "Error positivo (R♃)", hint: "", unit: "R♃" },
            { name: "radpos", label: "Error positivo general", hint: "", unit: "" }
        ]
    },
    {
        name: "Brillo",
        title: "Añade el brillo de la estrella",
        intro: "Magnitud aparente: un número menor significa una estrella más brillante.",
        fields: [
            { name: "sy_vmag", label: "Magnitud visible (V)", hint: "Lo que vería un ojo humano.", unit: "mag", req: true },
            { name: "sy_kmag", label: "Magnitud infrarroja (K)", hint: "Medida en infrarrojo cercano.", unit: "mag", req: true },
            { name: "sy_gaiamag", label: "Magnitud Gaia", hint: "Medida por el telescopio espacial Gaia.", unit: "mag", req: true }
        ],
        more: [
            { name: "vmagpos", label: "Error positivo V", hint: "", unit: "mag" },
            { name: "vmagneg", label: "Error negativo V", hint: "Número negativo.", unit: "mag" },
            { name: "kmagpos", label: "Error positivo K", hint: "", unit: "mag" },
            { name: "kmagneg", label: "Error negativo K", hint: "Número negativo.", unit: "mag" },
            { name: "gaiamagpos", label: "Error positivo Gaia", hint: "", unit: "mag" },
            { name: "gaiamagneg", label: "Error negativo Gaia", hint: "Número negativo.", unit: "mag" }
        ]
    }
];

const PRESETS = {
    jupiter: {
        sy_pnum: 1, st_rad: 1.1, sy_dist: 150, distpos: 1,
        pl_orbper: 3.5, pl_orbperlim: 0, orbpos: 0.001, orbneg: -0.001,
        pl_rade: 13, pl_radj: 1.16, pl_radelim: 0, pl_radjlim: 0, radepos: 0.5, radneg: -0.5, radjpos: 0.05, radpos: 0.5,
        sy_vmag: 11, sy_kmag: 9.5, sy_gaiamag: 11, vmagpos: 0.02, vmagneg: -0.02, kmagpos: 0.02, kmagneg: -0.02, gaiamagpos: 0, gaiamagneg: 0
    },
    supertierra: {
        sy_pnum: 3, st_rad: 0.7, sy_dist: 40, distpos: 0.2,
        pl_orbper: 12.4, pl_orbperlim: 0, orbpos: 0.002, orbneg: -0.002,
        pl_rade: 1.8, pl_radj: 0.16, pl_radelim: 0, pl_radjlim: 0, radepos: 0.1, radneg: -0.1, radjpos: 0.01, radpos: 0.1,
        sy_vmag: 12.5, sy_kmag: 9.8, sy_gaiamag: 12.2, vmagpos: 0.02, vmagneg: -0.02, kmagpos: 0.02, kmagneg: -0.02, gaiamagpos: 0, gaiamagneg: 0
    }
};

const VERDICTS = {
    "CONFIRMED": {
        tone: "tone-ok", title: "Exoplaneta confirmado",
        explain: "Las mediciones se parecen a las de planetas que los astrónomos ya verificaron.",
        next: "Es el resultado más sólido que da el modelo."
    },
    "CANDIDATE": {
        tone: "tone-maybe", title: "Candidato a exoplaneta",
        explain: "La señal tiene rasgos de planeta, pero aún necesita más observaciones para confirmarse.",
        next: "Muchos planetas confirmados empezaron así."
    },
    "FALSE POSITIVE": {
        tone: "tone-bad", title: "Falso positivo",
        explain: "Lo más probable es que la señal no venga de un planeta, sino de otra cosa, como una estrella doble.",
        next: "Revisa si los datos están bien escritos y prueba de nuevo."
    },
    "REFUTED": {
        tone: "tone-gone", title: "Refutado",
        explain: "Este candidato se parece a casos que los astrónomos analizaron y descartaron como planeta.",
        next: "Puedes probar con otro objeto."
    }
};

/* ---------- Estado ---------- */
let current = 0;
const values = {};          // valores guardados entre pasos
const touched = new Set();  // campos que la persona editó a mano

const $ = (id) => document.getElementById(id);
const stepBody = $("stepBody"), stepperEl = $("stepper"), formError = $("formError");
const backBtn = $("backBtn"), nextBtn = $("nextBtn"), submitBtn = $("submitBtn");
const form = $("exoplanetForm"), loading = $("loading"), resultEl = $("result");

/* ---------- Render ---------- */
function fieldHTML(f, optional) {
    const v = values[f.name] ?? "";
    return `
      <div class="field" data-field="${f.name}">
        <label for="${f.name}">${f.label}${f.req ? "" : ""}</label>
        ${f.hint ? `<span class="hint" id="${f.name}-hint">${f.hint}</span>` : ""}
        <div class="input-wrap">
          <input type="number" step="any" id="${f.name}" name="${f.name}" value="${v}"
                 inputmode="decimal" ${f.hint ? `aria-describedby="${f.name}-hint ${f.name}-msg"` : `aria-describedby="${f.name}-msg"`}
                 ${f.req ? "required" : 'placeholder="0"'}>
          ${f.unit ? `<span class="unit">${f.unit}</span>` : ""}
        </div>
        <span class="msg" id="${f.name}-msg"></span>
      </div>`;
}

function renderStepper() {
    stepperEl.innerHTML = STEPS.map((s, i) => `
      <li class="${i === current ? "active" : i < current ? "done" : ""}">
        <button type="button" data-go="${i}" ${i === current ? 'aria-current="step"' : ""}>
          <span class="dot">${i < current ? "✓" : i + 1}</span><span>${s.name}</span>
        </button>
      </li>`).join("");
}

function renderStep() {
    const s = STEPS[current];
    stepBody.innerHTML = `
      <h3 class="step-title">${s.title}</h3>
      <p class="step-intro">${s.intro}</p>
      <div class="fields">${s.fields.map((f) => fieldHTML(f)).join("")}</div>
      ${s.more && s.more.length ? `
      <details class="more" ${s.more.some((f) => values[f.name] !== undefined && values[f.name] !== "") ? "open" : ""}>
        <summary>Datos de incertidumbre (opcional)</summary>
        <p class="sub">Si no los conoces, déjalos vacíos.</p>
        <div class="fields">${s.more.map((f) => fieldHTML(f, true)).join("")}</div>
      </details>` : ""}`;
    formError.hidden = true;
    backBtn.hidden = current === 0;
    const last = current === STEPS.length - 1;
    nextBtn.hidden = last;
    submitBtn.hidden = !last;
    renderStepper();
}

function saveStep() {
    stepBody.querySelectorAll("input").forEach((inp) => { values[inp.name] = inp.value; });
}

/* ---------- Validación ---------- */
function validateStep(index) {
    const s = STEPS[index];
    let firstBad = null;
    const root = index === current ? stepBody : null;
    s.fields.forEach((f) => {
        if (!f.req) return;
        let raw = root ? root.querySelector(`#${f.name}`).value : values[f.name];
        let msg = "";
        if (raw === "" || raw === undefined) msg = "Escribe un valor para continuar.";
        else if (isNaN(Number(raw))) msg = "Escribe un número, por ejemplo 1.5.";
        else if (f.int && !Number.isInteger(Number(raw))) msg = "Usa un número entero.";
        else if (f.min !== undefined && Number(raw) < f.min) msg = `El valor debe ser ${f.min} o mayor.`;
        if (root) {
            const wrap = root.querySelector(`[data-field="${f.name}"]`);
            wrap.classList.toggle("invalid", !!msg);
            wrap.querySelector(".msg").textContent = msg;
        }
        if (msg && !firstBad) firstBad = f.name;
    });
    return firstBad;
}

/* ---------- Navegación ---------- */
function goTo(i) {
    saveStep();
    current = i;
    renderStep();
}

nextBtn.addEventListener("click", () => {
    const bad = validateStep(current);
    if (bad) { stepBody.querySelector(`#${bad}`).focus(); return; }
    goTo(current + 1);
});
backBtn.addEventListener("click", () => goTo(current - 1));

stepperEl.addEventListener("click", (e) => {
    const b = e.target.closest("[data-go]");
    if (!b) return;
    const target = Number(b.dataset.go);
    if (target === current) return;
    if (target > current) {
        const bad = validateStep(current);
        if (bad) { stepBody.querySelector(`#${bad}`).focus(); return; }
    }
    goTo(target);
});

// Auto-conversión Tierra → Júpiter y marcar campos tocados
stepBody.addEventListener("input", (e) => {
    const inp = e.target;
    if (!inp.name) return;
    inp.closest(".field").classList.remove("invalid");
    if (inp.name === "pl_radj") touched.add("pl_radj");
    if (inp.name === "pl_rade" && !touched.has("pl_radj")) {
        const rj = stepBody.querySelector("#pl_radj");
        const n = Number(inp.value);
        if (rj) rj.value = inp.value !== "" && !isNaN(n) ? (n / 11.209).toFixed(3) : "";
    }
});

/* ---------- Ejemplos ---------- */
document.querySelectorAll("[data-preset]").forEach((b) => {
    b.addEventListener("click", () => {
        Object.assign(values, PRESETS[b.dataset.preset]);
        touched.add("pl_radj");
        showForm();
        current = 0;
        renderStep();
        $("panel").scrollIntoView({ behavior: REDUCED_MOTION ? "auto" : "smooth", block: "start" });
    });
});

/* ---------- Envío ---------- */
function showForm() {
    form.hidden = false; loading.hidden = true; resultEl.hidden = true;
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const bad = validateStep(current);
    if (bad) { stepBody.querySelector(`#${bad}`).focus(); return; }
    saveStep();

    // Revisar los pasos anteriores por si algo quedó vacío
    for (let i = 0; i < STEPS.length; i++) {
        if (i !== current && validateStep(i)) {
            formError.textContent = `Falta información en el paso "${STEPS[i].name}". Vuelve a ese paso para completarla.`;
            formError.hidden = false;
            return;
        }
    }

    // Convertir a número: los campos opcionales vacíos valen 0
    const data = {};
    STEPS.forEach((s) => [...s.fields, ...(s.more || [])].forEach((f) => {
        const n = parseFloat(values[f.name]);
        data[f.name] = isNaN(n) ? 0 : (f.int ? Math.round(n) : n);
    }));

    form.hidden = true; resultEl.hidden = true; loading.hidden = false;
    try {
        const res = await fetch(`${API_URL}/predict`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(`El servidor respondió con el código ${res.status}.`);
        const { prediction } = await res.json();
        showResult(prediction);
    } catch (err) {
        console.error("Error al llamar a la API:", err);
        showError(err);
    }
});

function showResult(prediction) {
    const v = VERDICTS[prediction] || {
        tone: "tone-maybe", title: String(prediction),
        explain: "El modelo devolvió una clase que esta página no reconoce.", next: ""
    };
    loading.hidden = true; resultEl.hidden = false;
    resultEl.className = `result ${v.tone}`;
    resultEl.innerHTML = `
      <span class="badge" aria-hidden="true"></span>
      <p class="kicker">Resultado del análisis</p>
      <h3>${v.title}</h3>
      <p class="explain">${v.explain}</p>
      ${v.next ? `<p class="next">${v.next}</p>` : ""}
      <div class="actions">
        <button class="btn" type="button" id="againBtn">Analizar otro planeta</button>
        <button class="btn btn-ghost" type="button" id="editBtn">Editar los datos</button>
      </div>`;
    $("againBtn").onclick = () => { Object.keys(values).forEach((k) => delete values[k]); touched.clear(); current = 0; showForm(); renderStep(); };
    $("editBtn").onclick = () => { current = 0; showForm(); renderStep(); };
    $("panel").scrollIntoView({ behavior: REDUCED_MOTION ? "auto" : "smooth", block: "nearest" });
}

function showError(err) {
    loading.hidden = true; resultEl.hidden = false;
    resultEl.className = "result error tone-bad";
    resultEl.innerHTML = `
      <span class="badge" aria-hidden="true"></span>
      <h3>No pudimos conectar</h3>
      <p class="explain">No hay respuesta del servidor de predicción en <b>${API_URL}</b>. ${err.message && err.message.startsWith("El servidor") ? err.message : ""}</p>
      <p class="next">Comprueba que el backend esté encendido y vuelve a intentarlo. Tus datos siguen guardados.</p>
      <div class="actions"><button class="btn" type="button" id="retryBtn">Volver a los datos</button></div>`;
    $("retryBtn").onclick = () => { showForm(); renderStep(); };
}

/* ---------- Campo de estrellas ---------- */
(function stars() {
    const c = $("stars"), ctx = c.getContext("2d");
    let w, h, list = [];
    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        w = c.width = innerWidth * dpr; h = c.height = innerHeight * dpr;
        list = Array.from({ length: Math.round((innerWidth * innerHeight) / 5500) }, () => ({
            x: Math.random() * w, y: Math.random() * h,
            r: (Math.random() * 1.2 + 0.3) * dpr, p: Math.random() * 6.28, s: Math.random() * 0.02 + 0.005
        }));
        draw(0);
    }
    function draw(t) {
        ctx.clearRect(0, 0, w, h);
        for (const s of list) {
            const a = REDUCED_MOTION ? 0.7 : 0.45 + 0.4 * Math.sin(s.p + t * s.s);
            ctx.fillStyle = `rgba(220,230,255,${a})`;
            ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.28); ctx.fill();
        }
        if (!REDUCED_MOTION) setTimeout(() => requestAnimationFrame((n) => draw(n / 16)), 66);
    }
    addEventListener("resize", resize);
    resize();
})();

/* ---------- Animación explicativa: órbita + curva de luz ---------- */
(function transit() {
    const back = $("planetBack"), front = $("planetFront");
    const full = $("curveFull"), trace = $("curveTrace"), marker = $("marker"), status = $("status");
    if (!back) return;
    const CX = 400, CY = 130, A = 270, TILT = 30, STAR_R = 56, P_R = 14;
    const X0 = 40, X1 = 760, BASE = 320, DEPTH = 30;
    // t va de 0 a 1 (una vuelta). En t = 0.5 el planeta está justo delante de la estrella.
    const angle = (t) => 2 * Math.PI * t - Math.PI / 2;
    const state = (t) => {
        const th = angle(t), x = CX + A * Math.cos(th), z = Math.sin(th);
        const cover = z > 0 ? Math.max(0, Math.min(1, (STAR_R + P_R - Math.abs(x - CX)) / (2 * P_R))) : 0;
        return { x, y: CY + TILT * z, z, cover };
    };
    const curveY = (t) => BASE + DEPTH * state(t).cover;
    const pts = [];
    for (let i = 0; i <= 240; i++) { const t = i / 240; pts.push([X0 + t * (X1 - X0), curveY(t)]); }
    const toPath = (arr) => arr.map((p, k) => `${k ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("");
    full.setAttribute("d", toPath(pts));

    function draw(t) {
        const s = state(t), inFront = s.z > 0;
        const el = inFront ? front : back, other = inFront ? back : front;
        el.setAttribute("cx", s.x); el.setAttribute("cy", s.y); el.style.display = "";
        other.style.display = "none";
        const px = X0 + t * (X1 - X0), py = curveY(t);
        marker.setAttribute("cx", px); marker.setAttribute("cy", py);
        const live = pts.filter((p) => p[0] <= px); live.push([px, py]);
        trace.setAttribute("d", toPath(live));
        const dip = s.cover > 0.05;
        status.classList.toggle("dip", dip);
    }
    if (REDUCED_MOTION) { draw(0.5); return; }
    const DURATION = 11000;
    requestAnimationFrame(function frame(now) {
        draw((now % DURATION) / DURATION);
        requestAnimationFrame(frame);
    });
})();

renderStep();
