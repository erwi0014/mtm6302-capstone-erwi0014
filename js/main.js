// Game state variables
const state = {
  currentScore: 0,
  bestScore: parseInt(localStorage.getItem('bestScore') || 0),
  currentQuestionNumber: 1,
  selectedCategory: parseInt(localStorage.getItem('selectedCategory') || ''), // Default: General Knowledge
  selectedDifficulty: localStorage.getItem('selectedDifficulty') || '',
  correctAnswer: null, // Store current correct answer
  questionQueue: [] // Queue to store pre-fetched questions
};

// Variables to store selected category hue and difficulty luminance
let selectedCategoryHue = 0; // Default hue
let selectedDifficultyLum = 50; // Default luminance

// DOM element references
const elements = {
  scoreNumber: document.getElementById('scoreNumber'),
  questionNumber: document.getElementById('questionNumber'),
  bestNumber: document.getElementById('bestNumber'),
  questionHolder: document.getElementById('questionHolder'),
  answersHolder: document.querySelector('#answersHolder .list-group'),
  categorySelector: document.getElementById('category-select'),
  difficultySelector: document.getElementById('difficulty-select'),
  nextButton: document.querySelector('.btn-outline-success'),
  speechBubble: document.getElementById('speech-bubble'),
  tauntContainer: document.getElementById('taunt-container'),
  bestScoreNumber: document.getElementById('bestScoreNumber'), 
  navButton: document.querySelector('.navbar-toggler')
};

// Initialize the game
async function initGame() {
  await populateSelectors();
  updateScoreDisplay();
  initTaunts();
  fetchTriviaQuestion();
  
  // Set best score on page load
  if (elements.bestScoreNumber) {
    elements.bestScoreNumber.textContent = state.bestScore.toString().padStart(2, '0');
  }
}

// Initialize taunt features
function initTaunts() {
  if (elements.speechBubble) {
    elements.speechBubble.textContent = getBeginningTaunt();
  }
}

// Populate category and difficulty selectors
async function populateSelectors() {
  try {
    // Fetch categories from API
    const response = await fetch('https://opentdb.com/api_category.php');
    const { trivia_categories: categories } = await response.json();

    // Generate a gradient of hues for categories
    const hueStep = 360 / (categories.length + 1); // Include "Any" in the gradient calculation

    // Add "Any" category manually
    const allCategories = [
      { id: '', name: 'Any Category', color: `hsl(0, 50%, 50%)` }, // Assign the first color in the gradient
      ...categories.map((cat, index) => ({
        id: cat.id,
        name: cat.name,
        color: `hsl(${Math.round((index + 1) * hueStep)}, 50%, 50%)`, // Shift hues for other categories
      })),
    ];

    // Populate category dropdown
    elements.categorySelector.innerHTML = allCategories
      .map(
        (cat) =>
          `<option value="${cat.id}" style="border-color: ${cat.color};">${cat.name}</option>`
      )
      .join('');
    elements.categorySelector.value = state.selectedCategory;

    // Populate difficulty dropdown
    updateDifficultyColors();

    // Add event listeners for category and difficulty changes
    elements.categorySelector.addEventListener('change', (e) => {
      state.selectedCategory = parseInt(e.target.value);
      localStorage.setItem('selectedCategory', state.selectedCategory);

      // Update the selected category hue
      const selectedIndex = categories.findIndex((cat) => cat.id === state.selectedCategory);
      selectedCategoryHue = Math.round(selectedIndex * hueStep);

      // Update difficulty colors based on the new category hue
      updateDifficultyColors();
    });

    elements.difficultySelector.addEventListener('change', (e) => {
      state.selectedDifficulty = e.target.value;
      localStorage.setItem('selectedDifficulty', state.selectedDifficulty);

      // Update the selected difficulty luminance
      selectedDifficultyLum = getDifficultyLuminance(state.selectedDifficulty);

      // Update the CSS variable immediately
      const combinedColor = `hsl(${selectedCategoryHue}, 50%, ${selectedDifficultyLum}%)`;
      document.documentElement.style.setProperty('--combined-color', combinedColor);
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    showError('Failed to load categories. Please try again later.');
  }
}

// Function to update difficulty dropdown colors based on selected category hue
function updateDifficultyColors() {
  const difficulties = ['easy', 'medium', 'hard'];
  const luminanceValues = [70, 50, 30]; // Easy: Light, Medium: Mid, Hard: Dark

  elements.difficultySelector.innerHTML = difficulties
    .map((diff, index) => {
      const lum = luminanceValues[index];
      return `<option value="${diff}" style="border-color: hsl(${selectedCategoryHue}, 50%, ${lum}%);  !important">${diff.charAt(0).toUpperCase() + diff.slice(1)}</option>`;
    })
    .join('');
  elements.difficultySelector.value = state.selectedDifficulty;

  // Update the selected difficulty luminance
  selectedDifficultyLum = getDifficultyLuminance(state.selectedDifficulty);

  // Save the combined color as a CSS variable
  const combinedColor = `hsl(${selectedCategoryHue}, 50%, ${selectedDifficultyLum}%)`;
  document.documentElement.style.setProperty('--combined-color', combinedColor);
}

// Helper function to get luminance for a difficulty
function getDifficultyLuminance(difficulty) {
  switch (difficulty) {
    case 'easy':
      return 70;
    case 'medium':
      return 50;
    case 'hard':
      return 30;
    default:
      return 50; // Default to medium luminance
  }
}

// Event handlers for selector changes
function handleCategoryChange(e) {
  state.selectedCategory = parseInt(e.target.value);
  localStorage.setItem('selectedCategory', state.selectedCategory);
  fetchTriviaQuestion();
  updateDifficultyColors(); // Update difficulty colors based on new category
}

function handleDifficultyChange(e) {
  state.selectedDifficulty = e.target.value;
  localStorage.setItem('selectedDifficulty', state.selectedDifficulty);
  
  // Update the selected difficulty luminance
  selectedDifficultyLum = getDifficultyLuminance(state.selectedDifficulty);
  
  // Update the CSS variable immediately
  const combinedColor = `hsl(${selectedCategoryHue}, 50%, ${selectedDifficultyLum}%)`;
  document.documentElement.style.setProperty('--combined-color', combinedColor);
  
  fetchTriviaQuestion();
}

// Helper function to generate the API URL
function generateApiUrl() {
  const baseUrl = 'https://opentdb.com/api.php?amount=1';

  if (state.selectedCategory && state.selectedDifficulty) {
    return `${baseUrl}&category=${state.selectedCategory}&difficulty=${state.selectedDifficulty}`;
  } else if (state.selectedCategory) {
    return `${baseUrl}&category=${state.selectedCategory}`;
  } else if (state.selectedDifficulty) {
    return `${baseUrl}&difficulty=${state.selectedDifficulty}`;
  } else {
    return baseUrl;
  }
}

console.log('Generated API URL:', generateApiUrl()); // Debugging line to check the API URL

// Fetch a new trivia question
async function fetchTriviaQuestion() {
  try {
    // If the queue is empty, fetch 5 new questions
    if (state.questionQueue.length === 0) {
      const apiUrl = `${generateApiUrl()}&amount=5`; // Fetch 5 questions at once
      console.log('Fetching new questions:', apiUrl); // Debugging line

      const response = await fetch(apiUrl);
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        state.questionQueue = data.results; // Store the fetched questions in the queue
      } else {
        showError('No questions available for the selected category and difficulty.');
        return;
      }
    }

    // Get the next question from the queue
    const nextQuestion = state.questionQueue.shift();
    displayQuestion(nextQuestion); // Display the question
  } catch (error) {
    console.error('Error fetching trivia question:', error);
    showError('Failed to load question. Please check your connection.');
  }
}

// Display question and answers
function displayQuestion(questionData) {
  const question = decodeHtml(questionData.question);
  const correctAnswer = decodeHtml(questionData.correct_answer);
  const incorrectAnswers = questionData.incorrect_answers.map(decodeHtml);
  
  // Store correct answer in state for later use
  state.correctAnswer = correctAnswer; 
  
  // Display question
  if (elements.questionHolder && elements.questionHolder.querySelector('p')) {
    elements.questionHolder.querySelector('p').innerHTML = question;
  }
  
  // Prepare and shuffle all answers
  const allAnswers = shuffleArray([correctAnswer, ...incorrectAnswers]);
  
  // Display answers
  if (elements.answersHolder) {
    elements.answersHolder.innerHTML = allAnswers
      .map((answer, index) => `
        <li class="list-group-item bg-challenge-color text-light">
          <div class="form-check">
            <input class="form-check-input" type="radio" name="flexRadioDefault" id="radio${index + 1}" value="${answer}">
            <label class="form-check-label" for="radio${index + 1}">
              ${answer}
            </label>
          </div>
        </li>
      `)
      .join('');
  }
  
  // Set up the next button
  if (elements.nextButton) {
    elements.nextButton.onclick = () => {
      checkAnswer(state.correctAnswer); // Pass the correct answer to the checkAnswer function
    };
  }
  
  // Show a beginning taunt for the first question
  if (elements.speechBubble && state.currentQuestionNumber === 1) {
    elements.speechBubble.textContent = getBeginningTaunt();
  }
}

// Check the selected answer
function checkAnswer(correctAnswer) {
  const selectedOption = document.querySelector('input[name="flexRadioDefault"]:checked');

  if (!selectedOption) {
    if (elements.speechBubble) {
      elements.speechBubble.textContent = 'Please select an answer!';
    } else {
      alert('Please select an answer!');
    }
    return;
  }

  if (selectedOption.value === correctAnswer) {
    // Correct answer
    state.currentScore++;
    state.currentQuestionNumber++;
    updateScoreDisplay();

    if (elements.speechBubble) {
      elements.speechBubble.textContent = getCorrectAnswerTaunt();
    }

    // Fetch the next question
    if (state.questionQueue.length > 0) {
      const nextQuestion = state.questionQueue.shift();
      displayQuestion(nextQuestion);
    } else {
      fetchTriviaQuestion(); // Fetch new questions if the queue is empty
    }
  } else {
    // Incorrect answer
    handleIncorrectAnswer(correctAnswer);
  }
}

// Handle incorrect answer
function handleIncorrectAnswer(correctAnswer) {
  if (state.currentScore > state.bestScore) {
    state.bestScore = state.currentScore;
    localStorage.setItem('bestScore', state.bestScore);
    if (elements.bestScoreNumber) {
      elements.bestScoreNumber.textContent = state.bestScore.toString().padStart(2, '0');
    }
  }

  if (elements.speechBubble) {
    elements.speechBubble.textContent = getIncorrectAnswerTaunt(correctAnswer, state.currentScore);
  }

  if (elements.tauntContainer) {
    elements.tauntContainer.classList.add('error-anim');

    setTimeout(() => {
      elements.tauntContainer.classList.remove('error-anim');

      // Reset game after animation
      state.currentScore = 0;
      state.currentQuestionNumber = 1;
      updateScoreDisplay();
      fetchTriviaQuestion();
    }, 2000); // Wait 2 seconds before resetting
  } else {
    // Fallback if tauntContainer doesn't exist
    alert(`Game Over! Your final score is ${state.currentScore}. The correct answer was: ${correctAnswer}`);

    // Immediate reset
    state.currentScore = 0;
    state.currentQuestionNumber = 1;
    updateScoreDisplay();
    fetchTriviaQuestion();
  }
}

// Update score display
function updateScoreDisplay() {
  if (elements.scoreNumber) {
    elements.scoreNumber.textContent = state.currentScore.toString().padStart(2, '0');
  }
  if (elements.questionNumber) {
    elements.questionNumber.textContent = `Question ${state.currentQuestionNumber.toString().padStart(2, '0')}`;
  }
  if (elements.bestNumber) {
    elements.bestNumber.textContent = state.bestScore.toString().padStart(2, '0');
  }
}

// Function to get a random taunt for correct answers
function getCorrectAnswerTaunt() {
  const correctTaunts = [
    "Okay, you got that one, but there's NO chance you'll get this next one!",
    "Lucky guess! The next one will stump you for sure.",
    "Hmph! Even a broken clock is right twice a day.",
    "Don't get cocky! The next question is IMPOSSIBLE.",
    "Alright smarty-pants, let's see how you handle this next brain-buster!",
    "Fine, you got that one. But my grandmother could answer the next one and she doesn't even have internet!",
    "Oh wow, you actually got it right. I'm genuinely surprised.",
    "That was the easiest question in the database. Now for the REAL challenge!",
    "Well well well... enjoy that small victory while it lasts.",
    "I see you've been studying. Too bad it won't help you with what's coming next!"
  ];
  
  return getRandomItem(correctTaunts);
}

// Function to get a random taunt for incorrect answers that includes the correct answer
function getIncorrectAnswerTaunt(correctAnswer, score) {
  const incorrectTaunts = [
    `WRONG! The answer was "${correctAnswer}". That's game over after only ${score} points? Pathetic!`,
    `HA! I knew you wouldn't know that "${correctAnswer}" was the right answer! Game over at ${score} points!`,
    `Oops! "${correctAnswer}" was what you SHOULD have picked. Game over with ${score} measly points!`,
    `And that's why you'll never beat my high score! The answer was "${correctAnswer}". ${score} points... really?`,
    `GAME OVER! The correct answer was "${correctAnswer}". ${score} points? My pet goldfish could do better!`,
    `That's a big fat NOPE! "${correctAnswer}" was correct. Game over with just ${score} points!`,
    `Better luck next time! The answer was "${correctAnswer}". ${score} points isn't even worth recording.`,
    `You actually thought that was right? The answer was "${correctAnswer}"! Game over after ${score} points!`,
    `I'm not even surprised you missed that. The answer was "${correctAnswer}". Game over at ${score} points.`,
    `WRONG! "${correctAnswer}" was correct. ${score} points? Even my grandmother could beat that!`
  ];
  
  return getRandomItem(incorrectTaunts);
}

// Function to get a random beginning taunt
function getBeginningTaunt() {
  const beginningTaunts = [
    "Hah, you'll never beat my high score!",
    "Might as well log off now before your feelings are hurt.",
    "I hope you're ready to be embarrassed by some trivia!",
    "Let's see if you know anything at all...",
    "Try not to cry when you see how hard these questions are!",
    "I've seen toddlers with more trivia knowledge than you.",
    "Are you sure you want to do this? It's going to be humiliating.",
    "I bet you won't even get past question three!",
    "Let's see how that tiny brain of yours handles THESE questions!",
    "This ought to be good... and by good I mean hilariously bad."
  ];
  
  return getRandomItem(beginningTaunts);
}

// Helper function to decode HTML entities
function decodeHtml(html) {
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
}

// Helper function to shuffle array (Fisher-Yates algorithm)
function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Helper function to get a random item from an array
function getRandomItem(array) {
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
}

// Show error messages
function showError(message) {
  if (elements.questionHolder && elements.questionHolder.querySelector('p')) {
    elements.questionHolder.querySelector('p').innerHTML = message;
  }
  if (elements.answersHolder) {
    elements.answersHolder.innerHTML = '';
  }
  if (elements.speechBubble) {
    elements.speechBubble.textContent = "Something went wrong! But I still don't think you could beat me anyway.";
  }
}

    // Get all stylish dropdown elements
    const stylishDropdowns = document.querySelectorAll('.stylish');
    
    stylishDropdowns.forEach(dropdown => {
      const input = dropdown.querySelector('input');
      const select = dropdown.querySelector('select');
      
      // Toggle dropdown when input is clicked
      input.addEventListener('click', () => {
        // Hide all other dropdowns first
        document.querySelectorAll('.stylish select').forEach(s => {
          if (s !== select) s.style.display = 'none';
        });
        
        // Toggle this dropdown
        select.style.display = select.style.display === 'block' ? 'none' : 'block';
      });
      
      // Handle option selection
      select.addEventListener('click', (e) => {
        if (e.target.tagName === 'OPTION') {
          input.value = e.target.textContent;
          select.style.display = 'none';
          
          // You can access the value with e.target.value if needed
          console.log('Selected value:', e.target.value);
        }
      });
      
      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target)) {
          select.style.display = 'none';
        }
      });
    });

// Handle the "Start Quiz" button click
function handleStartQuiz() {
  // Clear the question queue
  state.questionQueue = [];

  // Reset the game state
  state.currentScore = 0;
  state.currentQuestionNumber = 1;
  updateScoreDisplay();

  // Fetch a new set of questions
  fetchTriviaQuestion();
}

// Add event listener to the "Start Quiz" button
document.getElementById('start-quiz-button').addEventListener('click', handleStartQuiz);

// Initialize the game on page load
document.addEventListener('DOMContentLoaded', initGame);

// Add event listener for the navbar toggle button
elements.navButton.addEventListener('click', () => {
  const navbar = document.getElementById('navbarSupportedContent');

  // Check if the navbar is currently collapsed
  const isCollapsed = navbar.classList.contains('collapse');

  if (isCollapsed) {
    // Start expanding
    navbar.classList.remove('collapse');
    navbar.classList.add('collapsing');
    navbar.style.height = '0px'; // Start height at 0

    elements.navButton.classList.remove('collapsed');
    elements.navButton.setAttribute('aria-expanded', 'true');

    // Simulate the expanding transition
    setTimeout(() => {
      navbar.style.height = '134px'; // Set height during the transition
    }, 10); // Small delay to ensure the height change is applied

    // After 1 second, complete the expand
    setTimeout(() => {
      navbar.classList.remove('collapsing');
      navbar.classList.add('show');
      navbar.style.height = ''; // Remove inline height
    }, 1000);
  } else {
    // Start collapsing
    navbar.classList.remove('show');
    navbar.classList.add('collapsing');
    navbar.style.height = '134px'; // Start height at full

    elements.navButton.classList.add('collapsed');
    elements.navButton.setAttribute('aria-expanded', 'false');

    // Simulate the collapsing transition
    setTimeout(() => {
      navbar.style.height = '0px'; // Set height during the transition
    }, 10); // Small delay to ensure the height change is applied

    // After 1 second, complete the collapse
    setTimeout(() => {
      navbar.classList.remove('collapsing');
      navbar.classList.add('collapse');
      navbar.style.height = ''; // Remove inline height
    }, 1000);
  }
});