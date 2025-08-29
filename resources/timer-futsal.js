let events = [];
let timerInterval;
let secondsElapsed = 0;

const startButton = document.getElementById('startButton');
const finishButton = document.getElementById('finishButton');
const timerDisplay = document.getElementById('timer');
const highlightButton = document.getElementById('highlightButton');
const scoreAButton = document.getElementById('teamAGoalButton');
const scoreBButton = document.getElementById('teamBGoalButton');
const decreaseAButton = document.getElementById('decreaseTeamA');
const decreaseBButton = document.getElementById('decreaseTeamB');
const finalResultText = document.getElementById("finalResultText");
const generateTeams = document.getElementById("generateTeams");

// Helper function to format time
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Editable Team Name
function makeNameEditable(teamId, editButtonId) {
    const teamNameElement = document.getElementById(teamId);
    const editButton = document.getElementById(editButtonId);

    editButton.addEventListener('click', () => {
        const currentName = teamNameElement.textContent;
        const inputField = document.createElement('input');
        inputField.type = 'text';
        inputField.value = currentName;
        inputField.className = 'form-control text-center';
        inputField.style.fontSize = '1.5rem';

        teamNameElement.replaceWith(inputField);
        inputField.focus();

        const saveName = () => {
            const newName = inputField.value.trim() || currentName;
            teamNameElement.textContent = newName;
            inputField.replaceWith(teamNameElement);
        };

        inputField.addEventListener('blur', saveName);
        inputField.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') saveName();
        });
    });
}

//makeNameEditable('teamAName', 'editTeamA');
//makeNameEditable('teamBName', 'editTeamB');

// Helper function to get the current result from the single score display span
function getResult() {
    return document.querySelector('#scoreDisplay span').textContent;
}

// Helper function to filter out null values from an object
function removeNullsFromObject(obj) {
    return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== null));
}

// Start Timer
startButton.addEventListener('click', () => {
    if (events.length > 0) {
        if (!confirm("Starting a new match will clear the current events. Proceed?")) {
            return;
        }
        const eventLogA = document.getElementById('eventLogA');
        while (eventLogA.firstChild) {
            eventLogA.removeChild(eventLogA.firstChild);
        }
        const eventLogB = document.getElementById('eventLogB');
        while (eventLogB.firstChild) {
            eventLogB.removeChild(eventLogB.firstChild);
        }
        const eventLogHighlight = document.getElementById('eventLogHighlight');
        while (eventLogHighlight.firstChild) {
            eventLogHighlight.removeChild(eventLogHighlight.firstChild);
        }

        // Update the displayed score
        const scoreDisplay = document.querySelector('#scoreDisplay span');
        scoreDisplay.textContent = `0-0`;
        events = [];
    }
    scoreAButton.classList.remove('hidden');
    scoreBButton.classList.remove('hidden');
    highlightButton.classList.remove('hidden');
    decreaseAButton.classList.remove('hidden');
    decreaseBButton.classList.remove('hidden');
    finishButton.classList.remove('hidden')

    startButton.classList.add('hidden')
    generateTeams.classList.add('hidden')
    finalResultText.classList.add('hidden')

    events.push(
        removeNullsFromObject({
            dateTime: new Date().toISOString(),
            eventName: 'start',
            team: null,
            result: getResult(),
        })
    );
    let startTime = Date.now();
    function updateTimer() {
        const currentTime = Date.now();
        secondsElapsed = Math.floor((currentTime - startTime) / 1000);
        timerDisplay.textContent = formatTime(secondsElapsed);

    }
    timerInterval = setInterval(updateTimer, 1000); // <== FIX

});

// Finish Match
finishButton.addEventListener('click', () => {
    if (!confirm("Are you sure you want to finish the match?")) {
        return;
    }

    clearInterval(timerInterval);

    events.push(
        removeNullsFromObject({
            dateTime: new Date().toISOString(),
            eventName: 'finish',
            team: null,
            result: getResult(),
        })
    );

    // Convert events to a JSON string
    const jsonStr = JSON.stringify(events, null, 2); // Pretty-print JSON
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    // Create a temporary download link
    const a = document.createElement("a");
    a.href = url;
    a.download = `match_events_${new Date().toISOString().replace(/[:.]/g, "-")}.json`; // Filename with timestamp
    document.body.appendChild(a);
    a.click(); // Trigger download
    document.body.removeChild(a);

    // Release memory
    URL.revokeObjectURL(url);

    alert('Match events saved as JSON file!');

    scoreAButton.classList.add('hidden');
    scoreBButton.classList.add('hidden');
    highlightButton.classList.add('hidden');
    finishButton.classList.add('hidden')
    decreaseAButton.classList.add('hidden');
    decreaseBButton.classList.add('hidden');

    startButton.classList.remove('hidden')
    finalResultText.classList.remove('hidden')
});

// Register Highlight
highlightButton.addEventListener('click', () => {
    events.push(
        removeNullsFromObject({
            dateTime: new Date().toISOString(),
            eventName: 'highlight',
            team: null,
            result: getResult(),
        })
    );
    console.log('Highlight event added:', events);
    addEventToLog(null, formatTime(secondsElapsed));

});

function addTeamGoal(team) {
    // Extract current goals
    const scoreDisplay = document.querySelector('#scoreDisplay span');
    let [teamAGoals, teamBGoals] = scoreDisplay.textContent.split('-').map(Number);

    // Increment the goals based on the team
    if (team === 'A') {
        teamAGoals++;
    } else {
        teamBGoals++;
    }

    // Update the displayed score
    scoreDisplay.textContent = `${teamAGoals}-${teamBGoals}`;

    // Add the goal event with elapsed time
    const elapsedTime = formatTime(secondsElapsed);
    events.push(
        removeNullsFromObject({
            dateTime: new Date().toISOString(),
            eventName: 'goal',
            team: team,
            result: getResult(),
            elapsedTime: elapsedTime,
        })
    );
    console.log(`Goal for Team ${team}:`, events);

    // Add the event to the event log
    addEventToLog(team, elapsedTime);
}

scoreAButton.addEventListener('click', () => addTeamGoal('A'));
scoreBButton.addEventListener('click', () => addTeamGoal('B'));
decreaseAButton.addEventListener('click', () => decreaseTeamGoal('A'));
decreaseBButton.addEventListener('click', () => decreaseTeamGoal('B'));

// Function to add an event to the log
function addEventToLog(team, elapsedTime) {
    let eventDiv;
    const result = getResult();

    if (team === 'A') {
        // Add event to Team A's log
        eventDiv = document.createElement('div');
        eventDiv.style.marginBottom = '8px'; // Add spacing
        eventDiv.innerHTML = `<i class="fas fa-futbol"></i> ${elapsedTime} (${result})`;

        const eventLogA = document.getElementById('eventLogA');
        eventLogA.appendChild(eventDiv);
    } else if (team === 'B') {
        // Add event to Team B's log
        eventDiv = document.createElement('div');
        eventDiv.style.marginBottom = '8px'; // Add spacing
        eventDiv.innerHTML = `<i class="fas fa-futbol"></i> ${elapsedTime} (${result})`;
        const eventLogB = document.getElementById('eventLogB');
        eventLogB.appendChild(eventDiv);
    } else if ( team == null) {
        console.log('highlight');
        // Add event to Team B's log
        eventDiv = document.createElement('div');
        eventDiv.style.marginBottom = '8px'; // Add spacing
        eventDiv.innerHTML = `<i class="fas fa-star"></i> ${elapsedTime}`;

        const eventLogHighlight = document.getElementById('eventLogHighlight');
        eventLogHighlight.appendChild(eventDiv);
    }
}

function decreaseTeamGoal(team) {
    // Extract team goals and opponent goals
    let scoreDisplay = document.querySelector('#scoreDisplay span');
    let [teamAGoals, teamBGoals] = scoreDisplay.textContent.split('-').map(Number);

    // Determine the current and opponent goals based on the team
    let currentGoals = team === 'A' ? teamAGoals : teamBGoals;

    if (currentGoals > 0) {
        currentGoals--;
        // Update score based on team
        scoreDisplay.textContent = team === 'A'
            ? `${currentGoals}-${teamBGoals}`
            : `${teamAGoals}-${currentGoals}`;

        // Manage event log updates
        const eventLog = document.getElementById(team === 'A' ? 'eventLogA' : 'eventLogB');
        let node = eventLog.lastChild; // Start with the last child

        while (node) {
            const icon = node.querySelector('i'); // Find the <i> element in the current node

            if (icon && icon.style.color !== 'red') {
                // If the <i> element exists and is not red, change its color to red
                icon.style.color = 'red';
                break; // Stop the loop when a valid icon is found and changed
            }

            // Move to the previous sibling if the current one is already red or invalid
            node = node.previousElementSibling;
        }

        // Remove the last goal event for the relevant team
        for (let i = events.length - 1; i >= 0; i--) {
            if (events[i].eventName === 'goal' && events[i].team === team) {
                events.splice(i, 1);
                break;
            }
        }

        console.log(`Updated events after decreasing Team ${team} goal:`, events);
    }
}

// timer-futsal.js

// Function to format the current date
function getFormattedDate() {
    const options = { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' };
    const today = new Date();
    return today.toLocaleDateString('en-US', options).toUpperCase();
}

// Display the date on page load
document.addEventListener('DOMContentLoaded', () => {
    const dateDisplay = document.getElementById('dateDisplay');
    if (dateDisplay) {
        dateDisplay.textContent = getFormattedDate();
    }
});

document.addEventListener("DOMContentLoaded", function () {
    const vestIcon = document.querySelector(".fa-vest");
    const shirtIcon = document.querySelector(".fa-shirt");

    vestIcon.addEventListener("click", () => fetchTeamPlayers());
    shirtIcon.addEventListener("click", () => fetchTeamPlayers());
    //vestIcon.addEventListener("click", () => fetchTeamPlayers("Coletes"));
    //shirtIcon.addEventListener("click", () => fetchTeamPlayers("Outros"));
});

function fetchTeamPlayers() {
    fetch("/api/teams")
        .then(response => response.json())
        .then(data => {
            displayTeamPlayers(data[0], data[1]);

        })
        .catch(error => console.error("Error fetching team data:", error));
}

function displayTeamPlayers(teamColetes, teamOutros) {
    const teamAModalLabel = document.getElementById("teamAModalLabel");
    const teamBModalLabel = document.getElementById("teamBModalLabel");

    const teamColetesPlayersList = document.getElementById("teamColetesPlayersList");
    const teamOutrosPlayersList = document.getElementById("teamOutrosPlayersList");

    // Set the modal title
    teamAModalLabel.textContent = `${teamColetes.teamName}`;
    teamBModalLabel.textContent = `${teamOutros.teamName}`;

    // Clear existing list
    teamColetesPlayersList.innerHTML = "";
    teamOutrosPlayersList.innerHTML = "";
    // Convert comma-separated player names into a list
    teamColetes.players.split(",").forEach(player => {
        const listItem = document.createElement("li");
        listItem.textContent = player.trim();
        listItem.classList.add("list-group-item");
        teamColetesPlayersList.appendChild(listItem);
    });
    teamOutros.players.split(",").forEach(player => {
        const listItem = document.createElement("li");
        listItem.textContent = player.trim();
        listItem.classList.add("list-group-item");
        teamOutrosPlayersList.appendChild(listItem);
    });

    // Show the modal
    const teamModal = new bootstrap.Modal(document.getElementById("teamModal"));
    teamModal.show();
}

