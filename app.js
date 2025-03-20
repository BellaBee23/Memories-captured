// App state
const state = {
    recordings: [],
    isRecording: false,
    currentMood: 'happy',
    theme: 'pastel',
    mediaRecorder: null,
    stream: null,
    recordedChunks: [],
    prompts: [
        "What made you smile today?",
        "Share a small win you had today!",
        "What's something you're looking forward to?",
        "What's a challenge you overcame recently?",
        "Describe your day in three words",
        "Share something new you learned today",
        "What's making you feel grateful right now?"
    ]
};

// DOM Elements
const videoElement = document.getElementById('videoElement');
const recordingIndicator = document.getElementById('recordingIndicator');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const promptText = document.getElementById('promptText');
const streakCount = document.getElementById('streakCount');
const emptyCollection = document.getElementById('emptyCollection');
const videoGrid = document.getElementById('videoGrid');
const moodButtons = document.querySelectorAll('.mood-btn');
const themeButtons = document.querySelectorAll('.theme-btn');

// Set random prompt
promptText.textContent = getRandomPrompt();

// Load saved recordings from localStorage
loadRecordings();

// Calculate and display streak
updateStreak();

// Event Listeners
startBtn.addEventListener('click', startRecording);
stopBtn.addEventListener('click', stopRecording);

// Mood selection
moodButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        moodButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.currentMood = btn.dataset.mood;
    });
});

// Theme selection
themeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        themeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.theme = btn.dataset.theme;
        
        // Update theme classes on body
        document.body.classList.remove('theme-pastel', 'theme-sunset', 'theme-forest');
        if (state.theme !== 'pastel') {
            document.body.classList.add(`theme-${state.theme}`);
        }
    });
});

// Functions
async function startRecording() {
    try {
        state.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        videoElement.srcObject = state.stream;
        
        state.mediaRecorder = new MediaRecorder(state.stream);
        state.recordedChunks = [];
        
        state.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                state.recordedChunks.push(e.data);
            }
        };
        
        state.mediaRecorder.onstop = saveRecording;
        
        state.mediaRecorder.start();
        state.isRecording = true;
        
        // Update UI
        recordingIndicator.classList.add('active');
        startBtn.style.display = 'none';
        stopBtn.style.display = 'flex';
    } catch (err) {
        console.error("Error accessing camera:", err);
        alert("Could not access your camera. Please check permissions.");
    }
}

function stopRecording() {
    if (state.mediaRecorder && state.isRecording) {
        state.mediaRecorder.stop();
        state.stream.getTracks().forEach(track => track.stop());
        state.isRecording = false;
        
        // Update UI
        recordingIndicator.classList.remove('active');
        startBtn.style.display = 'flex';
        stopBtn.style.display = 'none';
    }
}

function saveRecording() {
    const blob = new Blob(state.recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString();
    
    const newRecording = {
        id: timestamp,
        url: url,
        blob: blob, // Store the blob for localStorage
        mood: state.currentMood,
        date: new Date().toLocaleDateString(),
        prompt: promptText.textContent
    };
    
    state.recordings.unshift(newRecording); // Add to beginning of array
    
    // Save to localStorage
    saveToLocalStorage();
    
    // Update UI
    updateCollectionUI();
    
    // Update streak
    updateStreak();
    
    // Set new prompt
    promptText.textContent = getRandomPrompt();
}

function deleteRecording(id) {
    state.recordings = state.recordings.filter(recording => recording.id !== id);
    saveToLocalStorage();
    updateCollectionUI();
}

function updateCollectionUI() {
    if (state.recordings.length === 0) {
        emptyCollection.style.display = 'block';
        videoGrid.style.display = 'none';
        return;
    }
    
    emptyCollection.style.display = 'none';
    videoGrid.style.display = 'grid';
    
    videoGrid.innerHTML = '';
    
    state.recordings.forEach(recording => {
        const card = document.createElement('div');
        card.className = 'video-card';
        
        // Convert emoji code to actual emoji
        const moodEmoji = getMoodEmoji(recording.mood);
        
        card.innerHTML = `
            <div class="video-actions">
                <button class="delete-btn" data-id="${recording.id}">🗑️</button>
            </div>
            <video class="video-preview" src="${recording.url}" controls></video>
            <div class="video-info">
                <div class="video-meta">
                    <span class="video-date">${recording.date}</span>
                    <span class="video-mood">${moodEmoji}</span>
                </div>
                <div class="video-prompt">
                    <span style="font-weight: bold">Prompt:</span> ${recording.prompt}
                </div>
            </div>
        `;
        
        videoGrid.appendChild(card);
        
        // Add delete event listener
        const deleteBtn = card.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => deleteRecording(recording.id));
    });
}

function getRandomPrompt() {
    return state.prompts[Math.floor(Math.random() * state.prompts.length)];
}

function getMoodEmoji(mood) {
    const emojis = {
        happy: '😊',
        sad: '😢',
        excited: '🤩',
        calm: '😌',
        tired: '😴',
        anxious: '😰'
    };
    return emojis[mood] || '😊';
}

function calculateStreak() {
    if (state.recordings.length === 0) return 0;
    
    let streak = 1;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    // Check if there's a recording from today
    const hasRecordingToday = state.recordings.some(recording => {
        const recordDate = new Date(recording.date);
        return recordDate.toDateString() === currentDate.toDateString();
    });
    
    if (!hasRecordingToday) {
        currentDate.setDate(currentDate.getDate() - 1);
    }
    
    let prevDate = new Date(currentDate);
    prevDate.setDate(prevDate.getDate() - 1);
    
    while (true) {
        const hasRecording = state.recordings.some(recording => {
            const recordDate = new Date(recording.date);
            return recordDate.toDateString() === prevDate.toDateString();
        });
        
        if (hasRecording) {
            streak++;
            prevDate.setDate(prevDate.getDate() - 1);
        } else {
            break;
        }
    }
    
    return streak;
}

function updateStreak() {
    streakCount.textContent = calculateStreak();
}

// LocalStorage functions
function saveToLocalStorage() {
    try {
        // Convert blobs to base64 strings for storage
        const recordingsToSave = state.recordings.map(recording => {
            // Create a new object without the blob
            const { blob, ...recordingWithoutBlob } = recording;
            return recordingWithoutBlob;
        });
        
        localStorage.setItem('memoryBubbleRecordings', JSON.stringify(recordingsToSave));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

function loadRecordings() {
    try {
        const savedRecordings = localStorage.getItem('memoryBubbleRecordings');
        if (savedRecordings) {
            state.recordings = JSON.parse(savedRecordings);
            updateCollectionUI();
        }
    } catch (error) {
        console.error('Error loading from localStorage:', error);
    }
}
