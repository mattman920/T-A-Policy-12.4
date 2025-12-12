
// Antigravity: Load Test Utility
// Adds 15 employees (2s interval) and ~65 events (1s interval) concurrently.
// Uses Persona Logic: Good (50%), Moderate (25%), Bad (25%).

export const runLoadTest = async (addEmployee, addViolation, onProgress) => {
    console.log("Starting Realistic Load Test with Personas...");

    const createdEmployees = []; // { id, name, persona }
    const TOTAL_EMPLOYEES = 15;
    const TOTAL_BAD_VIOLATIONS = 50;
    const TOTAL_GOOD_ADJUSTMENTS = 15;
    const TOTAL_EVENTS = TOTAL_BAD_VIOLATIONS + TOTAL_GOOD_ADJUSTMENTS; // 65

    const TOTAL_STEPS = TOTAL_EMPLOYEES + TOTAL_EVENTS;
    let completedSteps = 0;

    const reportProgress = (msg) => {
        completedSteps++;
        const percent = Math.min(Math.round((completedSteps / TOTAL_STEPS) * 100), 100);
        if (onProgress) onProgress(percent, msg);
    };

    // --- PERSONA CONFIG ---
    // Good: 50% pop, 1x Bad Weight, 10x Good Weight
    // Mod:  25% pop, 5x Bad Weight, 5x Good Weight
    // Bad:  25% pop, 20x Bad Weight, 1x Good Weight
    const ASSIGN_PERSONA = () => {
        const r = Math.random();
        if (r < 0.50) return { type: 'GOOD', weightBad: 1, weightGood: 10 };
        if (r < 0.75) return { type: 'MODERATE', weightBad: 5, weightGood: 5 };
        return { type: 'BAD', weightBad: 20, weightGood: 1 };
    };

    const getRandomEmployee = (category) => {
        if (createdEmployees.length === 0) return null;

        // Calculate total weight
        let totalWeight = 0;
        const pool = createdEmployees.map(emp => {
            const w = category === 'bad' ? emp.persona.weightBad : emp.persona.weightGood;
            totalWeight += w;
            return { id: emp.id, weight: w };
        });

        if (totalWeight <= 0) return createdEmployees[Math.floor(Math.random() * createdEmployees.length)].id;

        // Weighted Random
        let random = Math.random() * totalWeight;
        for (const p of pool) {
            if (random < p.weight) return p.id;
            random -= p.weight;
        }
        return pool[pool.length - 1].id;
    };

    // --- EVENT POOL SETUP ---
    const TARDY_TYPES = [
        'Tardy (1-5 min)',
        'Tardy (6-11 min)',
        'Tardy (12-29 min)',
        'Tardy (30+ min)'
    ];
    const POSITIVE_TYPES = ['Early Arrival', 'Shift Pickup'];

    let eventPool = [];

    // Add 50 Bad
    for (let i = 0; i < TOTAL_BAD_VIOLATIONS; i++) {
        if (Math.random() > 0.4) {
            const type = TARDY_TYPES[Math.floor(Math.random() * TARDY_TYPES.length)];
            eventPool.push({ type, category: 'bad' });
        } else {
            eventPool.push({ type: 'Call Out', category: 'bad' });
        }
    }

    // Add 15 Good
    for (let i = 0; i < TOTAL_GOOD_ADJUSTMENTS; i++) {
        const type = POSITIVE_TYPES[Math.floor(Math.random() * POSITIVE_TYPES.length)];
        eventPool.push({ type, category: 'good' });
    }

    // Shuffle pool
    eventPool = eventPool.sort(() => Math.random() - 0.5);


    // --- PROCESS A: CREATE EMPLOYEES ---
    const createEmployeesPromise = (async () => {
        for (let i = 1; i <= TOTAL_EMPLOYEES; i++) {
            const persona = ASSIGN_PERSONA();
            // Optional: Mark name with persona? No, keeps it realistic.
            const name = `Test Employee ${Math.floor(Math.random() * 10000)}`;

            try {
                // Wait 2 seconds
                await new Promise(resolve => setTimeout(resolve, 2000));

                const result = await addEmployee(name, new Date().toISOString().split('T')[0]);
                if (result && result.id) {
                    createdEmployees.push({ id: result.id, name, persona });
                    reportProgress(`Added ${persona.type} Employee: ${name}`);
                    // console.log(`[LoadTest] Added ${persona.type} Employee ${i}/${TOTAL_EMPLOYEES}`);
                } else {
                    console.warn(`[LoadTest] Add Employee ${i} returned no ID.`);
                    reportProgress(`Failed to add Employee ${i}`);
                }
            } catch (e) {
                console.error(`[LoadTest] Failed to add employee ${i}:`, e);
                reportProgress(`Error adding employee ${i}`);
            }
        }
    })();

    // --- PROCESS B: CREATE EVENTS ---
    const createEventsPromise = (async () => {
        for (let i = 0; i < TOTAL_EVENTS; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000));

            while (createdEmployees.length === 0) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            const event = eventPool[i];
            const randomEmpId = getRandomEmployee(event.category);

            let pointsDeducted = 0;
            if (event.type === 'Tardy (1-5 min)') pointsDeducted = 3;
            else if (event.type === 'Tardy (6-11 min)') pointsDeducted = 5;
            else if (event.type === 'Tardy (12-29 min)') pointsDeducted = 15;
            else if (event.type === 'Tardy (30+ min)') pointsDeducted = 15;
            else if (event.type === 'Call Out') pointsDeducted = 24;
            else pointsDeducted = 0;

            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 90)); // Last 90 days
            const dateStr = date.toISOString().split('T')[0];

            if (randomEmpId) {
                try {
                    await addViolation(randomEmpId, event.type, dateStr, pointsDeducted);
                    reportProgress(`Logged: ${event.type}`);
                } catch (e) {
                    console.error(`[LoadTest] Failed to add event ${i}:`, e);
                    reportProgress(`Error logging event`);
                }
            }
        }
    })();

    await Promise.all([createEmployeesPromise, createEventsPromise]);
    console.log("[LoadTest] Complete.");
    if (onProgress) onProgress(100, "Generation Complete!");
    return true;
};
