// Game state variables
const state = {
  currentScore: 0,
  bestScore: parseInt(localStorage.getItem('bestScore') || 0),
  currentQuestionNumber: 1,
  selectedCategory: parseInt(localStorage.getItem('selectedCategory') || 9), // Default: General Knowledge
  selectedDifficulty: localStorage.getItem('selectedDifficulty') || 'easy',
  correctAnswer: null // Store current correct answer
};

// DOM element references
const elements = {
  scoreNumber: document.getElementById('scoreNumber'),
  questionNumber: document.getElementById('questionNumber'),
  bestNumber: document.getElementById('bestNumber'),
  questionHolder: document.getElementById('questionHolder'),
  answersHolder: document.querySelector('#answersHolder .list-group'),
  categorySelector: document.getElementById('category'),
  difficultySelector: document.getElementById('difficulty'),
  nextButton: document.querySelector('.btn-outline-success'),
  speechBubble: document.getElementById('speech-bubble'),
  tauntContainer: document.getElementById('taunt-container'),
  bestScoreNumber: document.getElementById('bestScoreNumber')
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
    
    // Populate category dropdown
    elements.categorySelector.innerHTML = categories
      .map(cat => `<option value="${cat.id}">${cat.name}</option>`)
      .join('');
    elements.categorySelector.value = state.selectedCategory;
    
    // Populate difficulty dropdown
    elements.difficultySelector.innerHTML = ['easy', 'medium', 'hard']
      .map(diff => `<option value="${diff}">${diff.charAt(0).toUpperCase() + diff.slice(1)}</option>`)
      .join('');
    elements.difficultySelector.value = state.selectedDifficulty;
    
    // Add event listeners
    elements.categorySelector.addEventListener('change', handleCategoryChange);
    elements.difficultySelector.addEventListener('change', handleDifficultyChange);
  } catch (error) {
    console.error('Error fetching categories:', error);
    showError('Failed to load categories. Please try again later.');
  }
}

// Event handlers for selector changes
function handleCategoryChange(e) {
  state.selectedCategory = parseInt(e.target.value);
  localStorage.setItem('selectedCategory', state.selectedCategory);
  fetchTriviaQuestion();
}

function handleDifficultyChange(e) {
  state.selectedDifficulty = e.target.value;
  localStorage.setItem('selectedDifficulty', state.selectedDifficulty);
  fetchTriviaQuestion();
}

// Fetch a new trivia question
async function fetchTriviaQuestion() {
  try {
    const apiUrl = `https://opentdb.com/api.php?amount=1&category=${state.selectedCategory}&difficulty=${state.selectedDifficulty}&type=multiple`;
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      displayQuestion(data.results[0]);
    } else {
      showError('Out of API requests for the selected category and difficulty.');
    }
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
    elements.nextButton.onclick = () => checkAnswer(correctAnswer);
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

    if (elements.tauntContainer) {
      elements.tauntContainer.classList.add('correct-anim');
    
      setTimeout(() => {
        elements.tauntContainer.classList.remove('correct-anim');
    
        // Reset game after animation
        state.currentScore = 0;
        state.currentQuestionNumber = 1;
        updateScoreDisplay();
        fetchTriviaQuestion();
      }, 1000); // Wait 1 second before resetting
    }
    fetchTriviaQuestion();
  } else {
    // Incorrect answer
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
      }, 1000); // Wait 1 second before resetting
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

// Initialize the game on page load
document.addEventListener('DOMContentLoaded', initGame);