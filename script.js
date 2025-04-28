document.addEventListener('DOMContentLoaded', () => {
    let currentWeek = 1;
    let currentTrainingIndex = 0;
    let schemaData = null;
    let completedExercises = {}; // Object to store completion status: { "week1_training0": [true, false, true...] }

    // DOM Elements
    const weekIndicator = document.getElementById('current-week');
    const trainingNaamEl = document.getElementById('training-naam');
    const oefeningenLijstEl = document.getElementById('oefeningen-lijst');
    const nextTrainingBtn = document.getElementById('next-training-btn');
    const prevTrainingBtn = document.getElementById('prev-training-btn');
    const warmingUpContainer = document.getElementById('warming-up-container');
    const warmingUpDuurEl = document.getElementById('warming-up-duur');
    const warmingUpLijstEl = document.getElementById('warming-up-lijst');
    const coolingDownContainer = document.getElementById('cooling-down-container');
    const coolingDownDuurEl = document.getElementById('cooling-down-duur');
    const coolingDownLijstEl = document.getElementById('cooling-down-lijst');

    // --- Local Storage Functions ---
    function loadState() {
        const savedWeek = localStorage.getItem('currentWeek');
        const savedTrainingIndex = localStorage.getItem('currentTrainingIndex');
        const savedCompleted = localStorage.getItem('completedExercises');

        currentWeek = savedWeek ? parseInt(savedWeek, 10) : 1;
        currentTrainingIndex = savedTrainingIndex ? parseInt(savedTrainingIndex, 10) : 0;
        completedExercises = savedCompleted ? JSON.parse(savedCompleted) : {};

        console.log('Loaded state:', { currentWeek, currentTrainingIndex, completedExercises });
    }

    function saveState() {
        localStorage.setItem('currentWeek', currentWeek.toString());
        localStorage.setItem('currentTrainingIndex', currentTrainingIndex.toString());
        localStorage.setItem('completedExercises', JSON.stringify(completedExercises));
        console.log('Saved state:', { currentWeek, currentTrainingIndex, completedExercises });
    }

    function getCompletionKey() {
        return `week${currentWeek}_training${currentTrainingIndex}`;
    }

    function saveCompletionStatus(index, isCompleted) {
        const key = getCompletionKey();
        if (!completedExercises[key]) {
             // Initialize with false for all exercises if not present
            const numExercises = schemaData.blokken[0].trainingen[currentTrainingIndex].hoofdset.oefeningen.length;
            completedExercises[key] = Array(numExercises).fill(false);
        }
        // Only attempt to set if index is valid
        if (index >= 0 && index < completedExercises[key].length) {
            completedExercises[key][index] = isCompleted;
        } else {
             console.warn(`Attempted to save completion for invalid index ${index} for key ${key}`);
        }
        saveState();
    }

    function getCompletionStatus(index) {
        const key = getCompletionKey();
        return completedExercises[key] ? completedExercises[key][index] : false;
    }
    // --- End Local Storage Functions ---

    // --- Data Loading and Display ---
    async function loadSchemaData() {
        try {
            const response = await fetch('data.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            schemaData = await response.json();
            loadState(); // Load saved state AFTER schema is loaded
            displayTraining();
        } catch (error) {
            console.error("Fout bij het laden van schema data:", error);
            trainingNaamEl.textContent = 'Fout bij laden schema.';
        }
    }

    function displayTraining() {
        if (!schemaData || !schemaData.blokken || schemaData.blokken.length === 0) {
            console.error("Schema data is niet correct geladen of leeg.");
            return;
        }

        // TODO: Select correct block based on currentWeek
        const currentBlok = schemaData.blokken[0]; 
        if (currentWeek > parseInt(currentBlok.weken.split('-')[1])) {
             trainingNaamEl.textContent = 'Schema voltooid!';
             oefeningenLijstEl.innerHTML = '';
             warmingUpContainer.style.display = 'none';
             coolingDownContainer.style.display = 'none';
             nextTrainingBtn.style.display = 'none';
             console.log("Reached end of schema block 1");
             return;
        }

        // Ensure currentTrainingIndex is valid for the current block
        if (currentTrainingIndex >= currentBlok.trainingen.length) {
            currentTrainingIndex = 0; // Reset if index is out of bounds
            console.warn("Training index out of bounds, resetting to 0");
        }
        const currentTraining = currentBlok.trainingen[currentTrainingIndex];

        weekIndicator.textContent = currentWeek;
        trainingNaamEl.textContent = `${currentTraining.naam} - ${currentTraining.focus}`;
        oefeningenLijstEl.innerHTML = ''; // Clear previous exercises

        // Display Warm-up
        warmingUpDuurEl.textContent = currentTraining.warmingUp.duur;
        warmingUpLijstEl.innerHTML = '';
        currentTraining.warmingUp.onderdelen.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            warmingUpLijstEl.appendChild(li);
        });
        warmingUpContainer.style.display = 'block';

        // Display Main Exercises
        const completionStatus = completedExercises[getCompletionKey()] || [];
        currentTraining.hoofdset.oefeningen.forEach((oefening, index) => {
            const oefeningDiv = document.createElement('div');
            oefeningDiv.classList.add('oefening');
            oefeningDiv.dataset.oefeningIndex = index;

            const detailsDiv = document.createElement('div');
            detailsDiv.classList.add('oefening-details');

            const titel = document.createElement('h3');
            titel.textContent = oefening.naam;
            detailsDiv.appendChild(titel);

            const setsReps = document.createElement('p');
            setsReps.innerHTML = `<strong>Sets/Reps:</strong> ${oefening.sets} x ${oefening.reps}`;
            detailsDiv.appendChild(setsReps);

            // Calculate and display current week's weight/duration
            const currentTarget = calculateProgress(oefening.start, oefening.progressie, currentWeek);
            const start = document.createElement('p');
            start.innerHTML = `<strong>Start:</strong> ${oefening.start}`;
            detailsDiv.appendChild(start);

            const dezeWeek = document.createElement('p');
            dezeWeek.innerHTML = `<strong>Deze week:</strong> <span class="current-target">${currentTarget || '-'}</span>`;
            detailsDiv.appendChild(dezeWeek);

            const progressie = document.createElement('p');
            progressie.innerHTML = `<strong>Progressie:</strong> ${oefening.progressie}`;
            detailsDiv.appendChild(progressie);

            const rust = document.createElement('p');
            rust.innerHTML = `<strong>Rust:</strong> ${oefening.rust}`;
            detailsDiv.appendChild(rust);

            if (oefening.focus) {
                const focus = document.createElement('p');
                focus.innerHTML = `<strong>Focus:</strong> ${oefening.focus}`;
                detailsDiv.appendChild(focus);
            }

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `oefening-${index}`;
            checkbox.checked = completionStatus[index] || false; // Set initial state from loaded data
            checkbox.addEventListener('change', handleCheckboxChange);

            oefeningDiv.appendChild(detailsDiv);
            oefeningDiv.appendChild(checkbox);

            // Apply completed style if loaded state is true
            if (checkbox.checked) {
                oefeningDiv.classList.add('completed');
            }

            oefeningenLijstEl.appendChild(oefeningDiv);
        });

        // Display Cooling-down
        coolingDownDuurEl.textContent = currentTraining.coolingDown.duur;
        coolingDownLijstEl.innerHTML = '';
        currentTraining.coolingDown.onderdelen.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            coolingDownLijstEl.appendChild(li);
        });
        coolingDownContainer.style.display = 'block';

        nextTrainingBtn.style.display = 'block'; // Ensure button is visible
        updateNavigationButtons(); // Update button states
        checkAllCompleted(false); // Check completion state without animation on load
    }
    // --- End Data Loading and Display ---

    // --- Event Handlers ---
    function handleCheckboxChange(event) {
        const checkbox = event.target;
        const oefeningDiv = checkbox.closest('.oefening');
        const index = parseInt(oefeningDiv.dataset.oefeningIndex, 10);

        if (checkbox.checked) {
            oefeningDiv.classList.add('completed');
        } else {
            oefeningDiv.classList.remove('completed');
        }
        
        saveCompletionStatus(index, checkbox.checked); 
        checkAllCompleted(true); // Check completion state with animation possibility
    }

    function handleNextTrainingClick() {
        advanceToNextTraining();
    }

    function handlePreviousTrainingClick() {
        regressToPreviousTraining();
    }
    // --- End Event Handlers ---

    // --- Logic Functions ---
    function checkAllCompleted(triggerAnimation) {
        const checkboxes = oefeningenLijstEl.querySelectorAll('input[type="checkbox"]');
        if (checkboxes.length === 0) return; // No exercises to check

        const allChecked = Array.from(checkboxes).every(cb => cb.checked);

        if (allChecked && triggerAnimation) {
            console.log("Alle oefeningen voltooid!");
            playCompletionAnimation();
        }
    }

    function playCompletionAnimation() {
        if (typeof confetti === 'function') { // Check if library is loaded
             confetti({
                 particleCount: 150,
                 spread: 90,
                 origin: { y: 0.6 }
             });
        } else {
             console.warn("Confetti library not loaded.")
        }
    }

    function updateNavigationButtons() {
        if (!schemaData) return;

        // Disable prev button if on week 1, training A
        prevTrainingBtn.disabled = (currentWeek <= 1 && currentTrainingIndex === 0);

        // Disable next button if it's the last training of the last block (basic check for now)
        // TODO: Make this check more robust when multiple blocks are added
        const lastBlok = schemaData.blokken[schemaData.blokken.length - 1];
        const [lastBlokStart, lastBlokEnd] = lastBlok.weken.split('-').map(Number);
        const lastTrainingIndexInLastBlok = lastBlok.trainingen.length - 1;
        nextTrainingBtn.disabled = (currentWeek >= lastBlokEnd && currentTrainingIndex === lastTrainingIndexInLastBlok);
    }

    function advanceToNextTraining() {
        // Find current block based on week (simple approach for now)
        const currentBlok = schemaData.blokken.find(blok => {
            const [startWeek, endWeek] = blok.weken.split('-').map(Number);
            return currentWeek >= startWeek && currentWeek <= endWeek;
        }) || schemaData.blokken[0]; // Fallback to first block

        const numTrainingenInBlok = currentBlok.trainingen.length;

        currentTrainingIndex++;
        if (currentTrainingIndex >= numTrainingenInBlok) {
            currentTrainingIndex = 0;
            currentWeek++;
             // TODO: Add logic to handle moving to the next block if weeks match
        }

        saveState(); // Save the new week/training index
        displayTraining(); // Display the new training
    }

    function regressToPreviousTraining() {
        if (currentWeek <= 1 && currentTrainingIndex === 0) {
            console.log("Already at the first training.");
            return; // Cannot go back further
        }

        currentTrainingIndex--;

        if (currentTrainingIndex < 0) {
            currentWeek--;
            // Find the new current block (which is the previous block)
             const previousBlok = schemaData.blokken.find(blok => {
                const [startWeek, endWeek] = blok.weken.split('-').map(Number);
                return currentWeek >= startWeek && currentWeek <= endWeek;
            }) || schemaData.blokken[0]; // Fallback might need adjustment for multi-block
            // Set to the last training of the previous week/block
            currentTrainingIndex = previousBlok.trainingen.length - 1; 
        }

        saveState();
        displayTraining();
    }

    function calculateProgress(startStr, progressStr, week) {
        // Basic parser for progress strings like "+2.5kg per week", "+1kg per 2 weken", "+5 sec per week"
        // Returns the calculated target for the current week as a string
        // Limitations: Assumes simple formats, doesn't handle complex RMs or ranges well yet.

        if (week <= 1) return startStr; // No progress in week 1

        const weeksElapsed = week - 1;
        let baseValue = 0;
        let unit = '';

        // Extract base value and unit from start string (e.g., "50kg", "37.5 kg", "30 sec")
        const startMatch = startStr.match(/([\d.]+)\s*(\w+)/);
        if (startMatch) {
            baseValue = parseFloat(startMatch[1]);
            unit = startMatch[2];
        } else {
            // Handle cases like bodyweight - return start string as is
            return startStr; 
        }

        // Parse progress string
        const progressMatch = progressStr.match(/[+-]?([\d.]+)\s*(\w+)\s*(?:per|elke)\s*(\d*)\s*(week|weken)/i);
        if (progressMatch) {
            const increment = parseFloat(progressMatch[1]);
            const incrementUnit = progressMatch[2];
            const frequency = progressMatch[3] ? parseInt(progressMatch[3], 10) : 1; // Default to 1 week
            const period = progressMatch[4];

            if (unit.toLowerCase() === incrementUnit.toLowerCase()) {
                const incrementsToApply = Math.floor(weeksElapsed / frequency);
                const currentValue = baseValue + (incrementsToApply * increment);
                
                // Basic formatting (e.g., keep one decimal for kg if needed)
                let formattedValue = currentValue.toString();
                if (unit.toLowerCase() === 'kg' && !Number.isInteger(currentValue)) {
                    formattedValue = currentValue.toFixed(1);
                }
                return `${formattedValue}${unit}`;
            }
        }

        return startStr; // Return start string if progress can't be calculated
    }
    // --- End Logic Functions ---

    // Initial Load
    nextTrainingBtn.addEventListener('click', handleNextTrainingClick);
    prevTrainingBtn.addEventListener('click', handlePreviousTrainingClick);
    loadSchemaData();
}); 