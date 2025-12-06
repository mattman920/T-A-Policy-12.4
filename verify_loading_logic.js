
const verifyLoadingLogic = () => {
    console.log('Starting verification of loading logic...');

    let minTimePassed = false;
    let dataReady = false;
    let loading = true;

    const startTime = Date.now();
    const duration = 15000; // 15 seconds

    // Simulate data becoming ready at different times
    // Scenario 1: Data ready BEFORE 15s (e.g., at 2s)
    setTimeout(() => {
        console.log('Data ready (simulated at 2s)');
        dataReady = true;
        checkCompletion();
    }, 2000);

    const checkCompletion = () => {
        if (minTimePassed && dataReady) {
            const elapsed = Date.now() - startTime;
            console.log(`Loading complete! Elapsed time: ${elapsed}ms`);
            loading = false;

            if (elapsed < 15000) {
                console.error('FAIL: Loading finished too early!');
                process.exit(1);
            } else {
                console.log('PASS: Loading waited for at least 15 seconds.');
                process.exit(0);
            }
        } else {
            console.log(`Check completion: minTimePassed=${minTimePassed}, dataReady=${dataReady}`);
        }
    };

    // Simulate the interval timer
    const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;

        if (elapsed >= duration) {
            if (!minTimePassed) {
                console.log('15 seconds passed. Setting minTimePassed = true');
                minTimePassed = true;
                checkCompletion();
            }
            clearInterval(interval);
        }
    }, 100);
};

verifyLoadingLogic();
