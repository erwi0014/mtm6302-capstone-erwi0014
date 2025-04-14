# mtm6302-capstone-erwi0014
Capstone of Web Dev III
Joryn Erwin
041110477
I intend to complete a Quiz Site. 
    As discussed, I also intend to use a Trivia Quiz API that has the same functionality

## Part-II
I decided to change design directions in order to make a renaissance/classical style quiz. I will use a jewel-toned colour palette, and for icons I will use things like scrolls and paint palettes. 

## Part-III
I created this using a combination of the bootstrap CSS library, and custom CSS. 
*Note:* To make the demo feel complete, I used the bootstrap js library for opening and closing the settings pane, but of course I will remove that script when moving into part IV. 

The fonts were installed using Google Fonts. I found a resource for CSS speech bubbles online called [bubbly](https://projects.verou.me/bubbly/)

A couple more tweaks in the design have been made during this part of the project. Firstly, I realized I only needed one settings icon to change both the difficulty and category, so I changed that, and removed the category/difficulty display from the page. I also made a couple tweaks to how the image of Newton shows up so that I can keep it in the mobile version. 

## Part-IV
**Process:**
I approached this with a simple fetch to grab the question and options, adding them to an html template. This was still using a predefined category and difficulty though, so adding category and difficulties were needed. This was achieved through another api fetch for categories, and an array for easy, med, hard. 

Api issue: At first I was using an event listener for any change made to the category and difficulty selectors, but this caused a problem: The API can only be fetched once every 5sec, so changing category a couple times would make everything time out. To fix this, I added a start quiz button, and fetched 5 questions in a queue. I haven't experienced this issue again (for users to have a problem, they would have to switch categories rapidly and click start quiz each time). 

To keep things tidy, I have a single object called state, in which I define all the game states like correctAnswer, selectedCategory, selectedDifficulty, etc. I also did this with all the DOM elements using an object called elements. 

More game logic implimentations were made; checking the selected answer with the correct answer, tracking current score, adding best score and saving to localStorage. I also saved the category and difficulty preferences to localStorage. The game resets on wrong answer. 

Some extra features were implimented as well. I made each category display with a unique hue, and a unique lum for difficulty. Then I implimented the functionality of the newton character for taunting the user. He has a list of pre-quiz taunts, correct answer taunts, and incorrect answer taunts, which reveal which the right answer was. I also gave him some animations. 

**Finishing touches:**
Added an "Any Category", before the others (has a blank ID which makes the fetch url generate without a specified category). 
I also added all the exact navbar collapse functionality that bootstrap had, and commented out the bootstrap js

**Resources:**
- https://opentdb.com/
- copilot with GPT-4o