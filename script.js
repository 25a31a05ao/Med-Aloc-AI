document.addEventListener("DOMContentLoaded", () => {
    // --- Global Configuration & Entities ---
    const TOTAL_RESOURCES = {
        ICU: 5,
        GeneralBed: 15,
        EmergencyDoc: 2,
        Specialist: 4,
        GeneralDoc: 8
    };

    let resources = {};
    let patients = [];
    let patientIdCounter = 1;
    let resourceChart = null;

    // UI Nodes Cached
    const logConsole = document.getElementById("logConsole");
    const patientsBody = document.getElementById("patientsBody");
    const triageForm = document.getElementById("triageForm");
    const themeToggle = document.getElementById("themeToggle");
    const btnAllocate = document.getElementById("btnAllocate");
    const btnReset = document.getElementById("btnReset");
    const btnGenerateRandom = document.getElementById("btnGenerateRandom");
    const chkAutoAllocate = document.getElementById("chkAutoAllocate");
    const chkSimulateTreatment = document.getElementById("chkSimulateTreatment");


    // --- Boot & Theme ---
    const init = () => {
        initTheme();
        resetSystem();
        initChart();
        // Fire recurring loops
        setInterval(treatmentLoop, 4000); 
        setInterval(() => { if(chkAutoAllocate.checked) autoProcessQueue(); }, 1500);
    };

    const initTheme = () => {
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.body.setAttribute('data-theme', 'dark');
            themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
        }
        themeToggle.addEventListener("click", () => {
            const isDark = document.body.getAttribute('data-theme') === 'dark';
            document.body.setAttribute('data-theme', isDark ? '' : 'dark');
            themeToggle.innerHTML = isDark ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
            updateChartTheme(); // Redraw chart grids
        });
    };

    const resetSystem = () => {
        resources = {
            ICU: { total: TOTAL_RESOURCES.ICU, used: 0 },
            GeneralBed: { total: TOTAL_RESOURCES.GeneralBed, used: 0 },
            EmergencyDoc: { total: TOTAL_RESOURCES.EmergencyDoc, used: 0 },
            Specialist: { total: TOTAL_RESOURCES.Specialist, used: 0 },
            GeneralDoc: { total: TOTAL_RESOURCES.GeneralDoc, used: 0 }
        };
        patients = [];
        log("System reset initialized. All wards cleared.", "System");
        updateDashboards();
    };

    // --- Artificial Intelligence Allocation Brain ---

    // Internal Priority Weights
    const getPriority = (cond) => {
        if(cond === 'Critical') return 300;
        if(cond === 'Serious') return 200;
        return 100;
    };

    const autoProcessQueue = () => {
        let hasChanges = false;
        
        // Find waiting patients
        let waitingQueue = patients.filter(p => p.status === 'Waiting');
        if(waitingQueue.length === 0) return;

        // Sort algorithm: (Priority Descending) -> (Id/WaitTime Ascending)
        waitingQueue.sort((a, b) => {
            if(getPriority(b.condition) !== getPriority(a.condition)) {
                return getPriority(b.condition) - getPriority(a.condition);
            }
            return a.id - b.id; 
        });

        waitingQueue.forEach(p => {
            let allocated = false;

            if (p.condition === "Critical") {
                // Rule: Requires ICU + EmergencyDoc. Top Priority.
                if (resources.ICU.used < resources.ICU.total && resources.EmergencyDoc.used < resources.EmergencyDoc.total) {
                    executeAllocation(p, 'ICU', 'EmergencyDoc', "Immediate Action Required");
                    allocated = true;
                }
            } 
            else if (p.condition === "Serious") {
                // Rule: Requires GeneralBed + Specialist.
                if (resources.GeneralBed.used < resources.GeneralBed.total && resources.Specialist.used < resources.Specialist.total) {
                    executeAllocation(p, 'GeneralBed', 'Specialist', "Scheduled < 30 Mins");
                    allocated = true;
                }
            } 
            else if (p.condition === "Normal") {
                // Rule: Requires GeneralBed + GeneralDoc
                if (resources.GeneralBed.used < resources.GeneralBed.total && resources.GeneralDoc.used < resources.GeneralDoc.total) {
                    // Create simulated future appointment delayed time
                    let base = new Date();
                    base.setMinutes(base.getMinutes() + 45 + Math.floor(Math.random() * 120)); // +45 to 165 minutes
                    let apptTime = base.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    
                    executeAllocation(p, 'GeneralBed', 'GeneralDoc', apptTime);
                    allocated = true;
                }
            }

            if(!allocated) {
                if(p.lastWarnTog !== true) {
                    // Prevent spamming the console
                    log(`Shortage Alert: [${p.name}] deferred -> Lacking required beds/doctors.`, "Warning");
                    p.lastWarnTog = true; 
                }
            }
        });

        if (hasChanges || waitingQueue.length > 0) updateDashboards();
    };

    const executeAllocation = (patient, bedType, docType, timeStr) => {
        patient.status = 'Admitted';
        patient.assignedBed = bedType;
        patient.assignedDoctor = docType;
        patient.appointmentTime = timeStr;
        
        resources[bedType].used++;
        resources[docType].used++;

        log(`Allocated [${patient.name}]: Assigned to ${bedType} with ${docType}.`, "Allocation");
    };

    // Artificial PDF Bill Generator
    const generateBill = (p) => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Base Styling
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(14, 165, 233); // Primary Color
        doc.text("MedAlloc AI Hospital", 105, 20, null, null, "center");
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text("Official Medical Bill & Discharge Summary", 105, 28, null, null, "center");
        
        doc.line(20, 35, 190, 35);
        
        // Patient details
        doc.setTextColor(40);
        doc.setFontSize(11);
        doc.text(`Patient Name: ${p.name}`, 20, 45);
        doc.text(`Age: ${p.age}`, 20, 52);
        doc.text(`Condition (Triage): ${p.condition}`, 20, 59);
        doc.text(`Date of Issue: ${new Date().toLocaleDateString()}`, 130, 45);
        doc.text(`Time: ${new Date().toLocaleTimeString()}`, 130, 52);
        doc.text(`Bill ID: #MAI-${Math.floor(Math.random() * 900000) + 100000}`, 130, 59);

        // Simulation parameters for billing
        const stayDays = Math.floor(Math.random() * 5) + 1; // 1 to 5 days stay
        
        let bedRate = 0;
        let docRate = 0;
        
        if (p.assignedBed === 'ICU') bedRate = 1200;
        else if (p.assignedBed === 'GeneralBed') bedRate = 300;
        
        if (p.assignedDoctor === 'EmergencyDoc') docRate = 800;
        else if (p.assignedDoctor === 'Specialist') docRate = 600;
        else if (p.assignedDoctor === 'GeneralDoc') docRate = 250;

        const baseFee = 150; // Registration / Triage
        
        const bedTotal = bedRate * stayDays;
        const medicineFee = Math.floor(Math.random() * 400) + 100;
        const totalAmount = baseFee + bedTotal + docRate + medicineFee;

        // Table
        doc.autoTable({
            startY: 70,
            headStyles: { fillColor: [14, 165, 233] },
            bodyStyles: { textColor: 50 },
            head: [['Description', 'Rate ($)', 'Qty (Days/Units)', 'Total ($)']],
            body: [
                ['Registration & Triage', baseFee, 1, baseFee],
                [`Ward Type: ${p.assignedBed}`, bedRate, stayDays, bedTotal],
                [`Attending: ${p.assignedDoctor}`, docRate, 1, docRate],
                ['Medications & Supplies', medicineFee, '-', medicineFee]
            ],
            footStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: 'bold' },
            foot: [['', '', 'Grand Total:', `$${totalAmount}`]]
        });

        // Footer
        const finalY = doc.lastAutoTable.finalY || 130;
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text("Thank you for choosing MedAlloc AI Hospital.", 105, finalY + 20, null, null, "center");
        doc.text("This is an automatically generated electronic bill, signatures are not required.", 105, finalY + 26, null, null, "center");
        
        // Save PDF natively
        doc.save(`MedAlloc_Bill_${p.name.replace(/ /g, "_")}.pdf`);
        log(`Generated automated PDF Bill for [${p.name}].`, "System");
    };

    // Removes a patient and frees their resources
    const dischargePatient = (id) => {
        const idx = patients.findIndex(p => p.id === id);
        if (idx === -1) return;
        const p = patients[idx];
        
        if (p.status === 'Admitted') {
            resources[p.assignedBed].used--;
            resources[p.assignedDoctor].used--;
            log(`Discharged [${p.name}]. Freed ${p.assignedBed} and unbound ${p.assignedDoctor}.`, "Release");
            generateBill(p);
        } else {
            log(`Removed [${p.name}] directly from the waiting room.`, "System");
        }
        
        patients.splice(idx, 1);
        updateDashboards();
        
        // Immediately try to allocate whoever is waiting now that resources freed
        if(chkAutoAllocate.checked) autoProcessQueue();
    };

    // Treatment lifecycle (randomly discharges patients slowly over time)
    const treatmentLoop = () => {
        if (!chkSimulateTreatment.checked) return;
        
        let admittedPatients = patients.filter(p => p.status === 'Admitted');
        
        if (admittedPatients.length > 0) {
            // Randomly select one and discharge them roughly 30% of the time
            if (Math.random() < 0.3) {
                const p = admittedPatients[Math.floor(Math.random() * admittedPatients.length)];
                dischargePatient(p.id);
            }
        }
    };


    // --- View Rendering ---
    const updateDashboards = () => {
        // 1. Update Top Resource Metrics
        for(let key in resources) {
            const elCount = document.getElementById(`count${key}`);
            const elFill = document.getElementById(`fill${key}`);
            if(elCount && elFill) {
                let res = resources[key];
                elCount.textContent = `${res.used}/${res.total}`;
                
                let perc = (res.used / res.total) * 100;
                elFill.style.width = `${perc}%`;
                
                // Traffic light indicator rules
                if (perc < 50) elFill.style.background = "var(--info)";
                else if (perc < 85) elFill.style.background = "var(--secondary)";
                else elFill.style.background = "var(--danger)";
            }
        }
        
        // 2. Repopulate HTML Table
        patientsBody.innerHTML = '';
        
        // Sort Table Logic: Critical Waiting at Top. Followed by Admitted sorted by priority.
        let viewList = [...patients].sort((a,b) => {
            if(a.status !== b.status) return a.status === 'Waiting' ? -1 : 1;
            return getPriority(b.condition) - getPriority(a.condition);
        });

        viewList.forEach(p => {
            const tr = document.createElement("tr");
            
            // Format Icon map for conditions
            let cBadgeTxt = p.condition;
            if(p.condition === 'Critical') cBadgeTxt = '<i class="fa-solid fa-triangle-exclamation"></i> Critical';
            if(p.condition === 'Serious') cBadgeTxt = '<i class="fa-solid fa-bell"></i> Serious';
            if(p.condition === 'Normal') cBadgeTxt = '<i class="fa-solid fa-stethoscope"></i> Normal';

            tr.innerHTML = `
                <td>
                    <strong>${p.name}</strong> <br>
                    <span style="font-size:0.8rem; opacity:0.7;">Age: ${p.age}</span>
                </td>
                <td><span class="badge cond-${p.condition.toLowerCase()}">${cBadgeTxt}</span></td>
                <td><span class="badge status-${p.status.toLowerCase()}">${p.status}</span></td>
                <td><span style="font-weight:600;">${p.assignedBed ? p.assignedBed.replace('Bed','') : '—'}</span></td>
                <td>${p.assignedDoctor || '—'}</td>
                <td style="font-size:0.85rem">${p.appointmentTime || '—'}</td>
                <td>
                    <button class="btn-small" onclick="window.cmdDischarge(${p.id})">
                         ${p.status === 'Admitted' ? '<i class="fa-solid fa-check"></i> Complete' : '<i class="fa-solid fa-xmark"></i> Omit'}
                    </button>
                </td>
            `;
            patientsBody.appendChild(tr);
        });

        // 3. Update Chart.js Data
        updateChartData();
    };

    const log = (msg, type) => {
        const time = new Date().toLocaleTimeString('en-US', { hour12: false });
        const div = document.createElement("div");
        div.className = `log-entry`;
        div.innerHTML = `<span class="log-time">[${time}]</span> <span class="log-type-${type}">${msg}</span>`;
        logConsole.appendChild(div);
        
        // Anchored bottom scroll
        logConsole.scrollTop = logConsole.scrollHeight; 
    };

    // Inject to window object for inline onclick triggers from DOM bindings
    window.cmdDischarge = dischargePatient;

    // --- User Actions & Listeners ---
    triageForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = document.getElementById("patientName").value;
        const age = document.getElementById("patientAge").value;
        const condition = document.getElementById("patientCondition").value;

        addPatient(name, age, condition);
        triageForm.reset();
    });

    const addPatient = (name, age, condition) => {
        const p = {
            id: patientIdCounter++,
            name: name,
            age: age,
            condition: condition,
            status: 'Waiting',
            assignedBed: null,
            assignedDoctor: null,
            appointmentTime: null,
            lastWarnTog: false
        };
        patients.push(p);
        log(`Triage Input received: [${name}], Age ${age}, Priority: ${condition}`, "System");
        updateDashboards();
        
        if(chkAutoAllocate.checked) autoProcessQueue();
    };

    btnGenerateRandom.addEventListener("click", () => {
        const f = ["Alan", "Bea", "Carlos", "Diana", "Eli", "Fiona", "George", "Hannah", "Ian"];
        const l = ["Smith", "Jones", "Chen", "Patel", "Miller", "Davis"];
        const priorities = ["Normal", "Normal", "Normal", "Serious", "Serious", "Critical"]; 
        
        let genName = f[Math.floor(Math.random() * f.length)] + " " + l[Math.floor(Math.random() * l.length)];
        let genAge = Math.floor(Math.random() * 80) + 10;
        let genCond = priorities[Math.floor(Math.random() * priorities.length)];
        
        addPatient(genName, genAge, genCond);
    });

    btnAllocate.addEventListener("click", () => {
        log("Manual stepping triggered...", "System");
        autoProcessQueue();
    });

    btnReset.addEventListener("click", resetSystem);

    chkAutoAllocate.addEventListener('change', (e) => {
        log(`System AI changed: Auto-Allocate is now ${e.target.checked ? "ON" : "OFF"}.`, "System");
    });

    // --- Real-time Graphics Engine (Chart.js) ---
    const initChart = () => {
        const ctx = document.getElementById('resourceChart').getContext('2d');
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        
        Chart.defaults.color = isDark ? '#cbd5e1' : '#475569';
        Chart.defaults.font.family = 'Inter';

        resourceChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['ICU', 'Gen Bed', 'ER Doc', 'Specialist', 'Gen Doc'],
                datasets: [{
                    label: 'Capacity Used (%)',
                    data: [0, 0, 0, 0, 0],
                    backgroundColor: [
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(139, 92, 246, 0.8)',
                        'rgba(14, 165, 233, 0.8)'
                    ],
                    borderWidth: 0,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { 
                        beginAtZero: true, 
                        max: 100,
                        grid: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }
                    },
                    x: {
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.9)' }
                },
                animation: { duration: 400 }
            }
        });
    };

    const updateChartData = () => {
        if(!resourceChart) return;
        
        const mapKeys = ['ICU', 'GeneralBed', 'EmergencyDoc', 'Specialist', 'GeneralDoc'];
        const values = mapKeys.map(k => (resources[k].used / resources[k].total) * 100);
        
        resourceChart.data.datasets[0].data = values;
        resourceChart.update();
    };

    const updateChartTheme = () => {
        if(!resourceChart) return;
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        Chart.defaults.color = isDark ? '#cbd5e1' : '#475569';
        resourceChart.options.scales.y.grid.color = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
        resourceChart.update();
    };

    // Ignition Boot
    init();
});
